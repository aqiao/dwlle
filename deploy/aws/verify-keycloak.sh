#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_NAME="${1:-dev-global}"
: "${AWS_PROFILE:?Set AWS_PROFILE before verifying}"
AWS_REGION="${AWS_REGION:-$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["region"])' "$ROOT_DIR/infra/config/$ENV_NAME.json")}"
export AWS_REGION
LOCAL_OIDC_PORT="${LOCAL_OIDC_PORT:-18080}"
LOCAL_API_PORT="${LOCAL_API_PORT:-18081}"
if [[ "$LOCAL_API_PORT" == "$LOCAL_OIDC_PORT" ]]; then
  echo "[dwlle] LOCAL_API_PORT must differ from LOCAL_OIDC_PORT" >&2
  exit 2
fi
ISSUER="http://127.0.0.1:$LOCAL_OIDC_PORT/realms/dwlle"
WORK_DIR="$ROOT_DIR/artifacts/keycloak-verify"
DATABASE_PATH="$WORK_DIR/api.db"
REMOTE_FORWARD_COMMAND_ID=""
LOCAL_FORWARD_PID=""
API_PID=""
mkdir -p "$WORK_DIR"

cleanup() {
  if [[ -n "$API_PID" ]]; then
    kill "$API_PID" >/dev/null 2>&1 || true
    wait "$API_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "$LOCAL_FORWARD_PID" ]]; then
    kill "$LOCAL_FORWARD_PID" >/dev/null 2>&1 || true
    wait "$LOCAL_FORWARD_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "$REMOTE_FORWARD_COMMAND_ID" ]]; then
    aws ssm cancel-command --command-id "$REMOTE_FORWARD_COMMAND_ID" >/dev/null 2>&1 || true
  fi
  rm -f "$DATABASE_PATH" "$WORK_DIR/api.log" "$WORK_DIR/me.json" \
    "$WORK_DIR/workspace.json" "$WORK_DIR/discovery.json" "$WORK_DIR/jwks.json" \
    "$WORK_DIR/forward.log" "$WORK_DIR/cookies.txt" "$WORK_DIR/login.html" \
    "$WORK_DIR/login-headers.txt"
}
trap cleanup EXIT

outputs="$(aws cloudformation describe-stacks \
  --stack-name "Dwlle-$ENV_NAME-DataPlane" \
  --query 'Stacks[0].Outputs' --output json)"
while IFS='|' read -r key value; do
  case "$key" in
    ClusterName) CLUSTER_NAME="$value" ;;
    BastionInstanceId) BASTION_INSTANCE_ID="$value" ;;
    KeycloakAlphaUserSecretArn) KEYCLOAK_ALPHA_USER_SECRET_ARN="$value" ;;
  esac
done < <(OUTPUTS="$outputs" python3 -c 'import json,os; [print("|".join([x["OutputKey"],x["OutputValue"]])) for x in json.loads(os.environ["OUTPUTS"])]')
: "${CLUSTER_NAME:?}" "${BASTION_INSTANCE_ID:?}" "${KEYCLOAK_ALPHA_USER_SECRET_ARN:?}"

remote_base="aws eks update-kubeconfig --name $CLUSTER_NAME --region $AWS_REGION && export KUBECONFIG=/root/.kube/config && cluster_arn=\$(aws eks describe-cluster --name $CLUSTER_NAME --region $AWS_REGION --query cluster.arn --output text) && kubectl config use-context \$cluster_arn"
remote_command="$remote_base && kubectl port-forward service/keycloak -n dwlle $LOCAL_OIDC_PORT:8080 --address 127.0.0.1"
parameters="$(COMMAND="$remote_command" python3 -c 'import json,os; print(json.dumps({"commands":[os.environ["COMMAND"]],"executionTimeout":["600"]}))')"
REMOTE_FORWARD_COMMAND_ID="$(aws ssm send-command \
  --instance-ids "$BASTION_INSTANCE_ID" \
  --document-name AWS-RunShellScript \
  --comment 'Forward the private Keycloak service for OIDC verification' \
  --parameters "$parameters" --query 'Command.CommandId' --output text)"

echo "[dwlle] Starting the local SSM port forwarding session"
(
  exec aws ssm start-session \
    --target "$BASTION_INSTANCE_ID" \
    --document-name AWS-StartPortForwardingSession \
    --parameters "{\"portNumber\":[\"$LOCAL_OIDC_PORT\"],\"localPortNumber\":[\"$LOCAL_OIDC_PORT\"]}"
) >"$WORK_DIR/forward.log" 2>&1 &
LOCAL_FORWARD_PID=$!

for _ in {1..30}; do
  if curl --silent --fail "$ISSUER/.well-known/openid-configuration" >"$WORK_DIR/discovery.json"; then
    break
  fi
  sleep 2
done
python3 -c 'import json,sys; data=json.load(open(sys.argv[1])); assert data["issuer"] == sys.argv[2]' "$WORK_DIR/discovery.json" "$ISSUER"
echo "[dwlle] Verified the Keycloak OIDC discovery document"

alpha_json="$(aws secretsmanager get-secret-value \
  --secret-id "$KEYCLOAK_ALPHA_USER_SECRET_ARN" --query SecretString --output text)"
IFS='|' read -r alpha_user alpha_password <<< "$(SECRET_JSON="$alpha_json" python3 -c 'import json,os; d=json.loads(os.environ["SECRET_JSON"]); print("|".join([d["username"],d["password"]]))')"
code_verifier="$(python3 -c 'import secrets; print(secrets.token_urlsafe(64))')"
code_challenge="$(VERIFIER="$code_verifier" python3 -c 'import base64,hashlib,os; print(base64.urlsafe_b64encode(hashlib.sha256(os.environ["VERIFIER"].encode()).digest()).decode().rstrip("="))')"
oidc_state="$(python3 -c 'import secrets; print(secrets.token_urlsafe(24))')"
oidc_nonce="$(python3 -c 'import secrets; print(secrets.token_urlsafe(24))')"
redirect_uri="http://127.0.0.1:5173"
curl --silent --show-error --fail-with-body --cookie-jar "$WORK_DIR/cookies.txt" \
  --get "$ISSUER/protocol/openid-connect/auth" \
  --data-urlencode client_id=dwlle-web \
  --data-urlencode "redirect_uri=$redirect_uri" \
  --data-urlencode response_type=code \
  --data-urlencode 'scope=openid profile email' \
  --data-urlencode "state=$oidc_state" \
  --data-urlencode "nonce=$oidc_nonce" \
  --data-urlencode "code_challenge=$code_challenge" \
  --data-urlencode code_challenge_method=S256 \
  --output "$WORK_DIR/login.html"
form_action="$(LOGIN_HTML="$WORK_DIR/login.html" python3 -c 'import html,re,os; content=open(os.environ["LOGIN_HTML"]).read(); print(html.unescape(re.search(r"<form[^>]+action=\"([^\"]+)\"", content).group(1)))')"
curl --silent --show-error --cookie "$WORK_DIR/cookies.txt" \
  --data-urlencode "username=$alpha_user" \
  --data-urlencode "password=$alpha_password" \
  --dump-header "$WORK_DIR/login-headers.txt" --output /dev/null "$form_action"
authorization_code="$(HEADERS="$WORK_DIR/login-headers.txt" STATE="$oidc_state" python3 -c 'import os,urllib.parse; lines=open(os.environ["HEADERS"]).read().splitlines(); location=next(line.split(":",1)[1].strip() for line in lines if line.lower().startswith("location:")); parameters=urllib.parse.parse_qs(urllib.parse.urlparse(location).query); assert parameters["state"][0] == os.environ["STATE"]; print(parameters["code"][0])')"
token_response="$(curl --silent --show-error --fail-with-body \
  -d grant_type=authorization_code -d client_id=dwlle-web \
  -d "code=$authorization_code" -d "code_verifier=$code_verifier" \
  -d "redirect_uri=$redirect_uri" "$ISSUER/protocol/openid-connect/token")"
NONCE="$oidc_nonce" RESPONSE="$token_response" python3 -c 'import base64,json,os; token=json.loads(os.environ["RESPONSE"])["id_token"]; part=token.split(".")[1]; part += "=" * (-len(part) % 4); assert json.loads(base64.urlsafe_b64decode(part))["nonce"] == os.environ["NONCE"]'
access_token="$(RESPONSE="$token_response" python3 -c 'import json,os; print(json.loads(os.environ["RESPONSE"])["access_token"])')"
subject="$(TOKEN="$access_token" python3 -c 'import base64,json,os; part=os.environ["TOKEN"].split(".")[1]; part += "=" * (-len(part) % 4); print(json.loads(base64.urlsafe_b64decode(part))["sub"])')"
unset alpha_json alpha_password token_response code_verifier authorization_code
TOKEN="$access_token" python3 -c 'import base64,json,os; part=os.environ["TOKEN"].split(".")[1]; part += "=" * (-len(part) % 4); claims=json.loads(base64.urlsafe_b64decode(part)); print({key: claims.get(key) for key in ("iss", "aud", "azp", "iat", "exp")})'
curl --silent --fail "$ISSUER/protocol/openid-connect/certs" >"$WORK_DIR/jwks.json"
JWKS="$WORK_DIR/jwks.json" TOKEN="$access_token" python3 -c 'import base64,json,os; header=json.loads(base64.urlsafe_b64decode(os.environ["TOKEN"].split(".")[0] + "==")); keys=json.load(open(os.environ["JWKS"]))["keys"]; print({"tokenHeader": header, "availableKids": [key.get("kid") for key in keys], "algorithms": [key.get("alg") for key in keys]}); assert header["kid"] in {key["kid"] for key in keys}'

echo "[dwlle] Provisioning the local Tenant Admin for API verification"
(
  cd "$ROOT_DIR/services/api"
  DWLLE_DATABASE_URL="sqlite:///$DATABASE_PATH" uv run python scripts/provision_admin.py \
    --issuer "$ISSUER" --subject "$subject" --tenant-id tenant-a \
    --email alpha-admin@example.com --name 'Alpha Admin'
)
(
  cd "$ROOT_DIR/services/api"
  exec env DWLLE_DATABASE_URL="sqlite:///$DATABASE_PATH" \
    DWLLE_OIDC_ISSUER="$ISSUER" DWLLE_OIDC_AUDIENCE=dwlle-api \
    .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port "$LOCAL_API_PORT"
) >"$WORK_DIR/api.log" 2>&1 &
API_PID=$!
for _ in {1..30}; do
  if curl --silent --fail "http://127.0.0.1:$LOCAL_API_PORT/health" >/dev/null; then
    break
  fi
  sleep 1
done

me_status="$(curl --silent -o "$WORK_DIR/me.json" -w '%{http_code}' \
  -H "Authorization: Bearer $access_token" "http://127.0.0.1:$LOCAL_API_PORT/api/v1/auth/me")"
if [[ "$me_status" != "200" ]]; then
  echo "[dwlle] /auth/me returned $me_status" >&2
  python3 -c 'import json,sys; print(json.load(open(sys.argv[1])))' "$WORK_DIR/me.json" >&2
  tail -20 "$WORK_DIR/api.log" >&2
  exit 1
fi
python3 -c 'import json,sys; data=json.load(open(sys.argv[1])); assert data["subject"] == sys.argv[2]; assert data["tenants"][0]["role"] == "Admin"' "$WORK_DIR/me.json" "$subject"
workspace_status="$(curl --silent -o "$WORK_DIR/workspace.json" -w '%{http_code}' \
  -H "Authorization: Bearer $access_token" -H 'Content-Type: application/json' \
  -d '{"tenant_id":"tenant-a","workspace_key":"keycloak-e2e","name":"Keycloak E2E"}' \
  "http://127.0.0.1:$LOCAL_API_PORT/api/v1/workspaces")"
invalid_status="$(curl --silent -o /dev/null -w '%{http_code}' \
  -H 'Authorization: Bearer invalid' "http://127.0.0.1:$LOCAL_API_PORT/api/v1/workspaces")"
if [[ "$me_status" != "200" || "$workspace_status" != "201" || "$invalid_status" != "401" ]]; then
  echo "[dwlle] Unexpected verification statuses: me=$me_status workspace=$workspace_status invalid=$invalid_status" >&2
  exit 1
fi
echo "[dwlle] Real Keycloak JWT verification passed: /auth/me=200 workspace=201 invalid-token=401"
