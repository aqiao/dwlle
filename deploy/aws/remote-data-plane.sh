#!/usr/bin/env bash
set -euo pipefail

: "${ARTIFACTS_BUCKET:?}" "${DATA_BUCKET:?}" "${REPOSITORY_URI:?}"
: "${CLUSTER_NAME:?}" "${AWS_REGION:?}" "${DATABASE_SECRET_ARN:?}"
: "${KEYCLOAK_ADMIN_SECRET_ARN:?}" "${KEYCLOAK_ALPHA_USER_SECRET_ARN:?}"
: "${STORAGE_ROLE_ARN:?}" "${DS_IMAGE_DIGEST:?}" "${SEATUNNEL_IMAGE_DIGEST:?}"
: "${TRINO_IMAGE_DIGEST:?}" "${POLARIS_IMAGE_DIGEST:?}" "${KEYCLOAK_IMAGE_DIGEST:?}"
: "${CURL_IMAGE_DIGEST:?}"

WORK_DIR=/tmp/dwlle-deployment
rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR"

echo "[dwlle] Downloading deployment inputs from the artifacts bucket"
aws s3 cp "s3://$ARTIFACTS_BUCKET/deployment/" "$WORK_DIR/" --recursive
aws s3 cp "s3://$ARTIFACTS_BUCKET/kubectl/v1.36.0/arm64/kubectl" /usr/local/bin/kubectl
chmod 0755 /usr/local/bin/kubectl

aws eks update-kubeconfig --name "$CLUSTER_NAME" --region "$AWS_REGION"
export KUBECONFIG=/root/.kube/config
cluster_arn="$(aws eks describe-cluster --name "$CLUSTER_NAME" --region "$AWS_REGION" --query 'cluster.arn' --output text)"
kubectl config use-context "$cluster_arn"

secret_json="$(aws secretsmanager get-secret-value \
  --secret-id "$DATABASE_SECRET_ARN" \
  --query SecretString --output text)"
IFS='|' read -r db_host db_user db_password <<< "$(SECRET_JSON="$secret_json" python3 -c 'import json,os; d=json.loads(os.environ["SECRET_JSON"]); print("|".join([d["host"],d["username"],d["password"]]))')"
kubectl create secret generic rds-dwlle \
  --namespace dwlle \
  --from-literal=host="$db_host" \
  --from-literal=username="$db_user" \
  --from-literal=password="$db_password" \
  --dry-run=client -o yaml | kubectl apply -f -
if ! command -v psql >/dev/null 2>&1; then
  echo "[dwlle] Installing the PostgreSQL client from the Amazon Linux repository"
  dnf install -y postgresql16
fi
PGPASSWORD="$db_password" psql -h "$db_host" -U "$db_user" -d dolphinscheduler \
  --set=ON_ERROR_STOP=1 -c 'CREATE SCHEMA IF NOT EXISTS keycloak'
if ! kubectl get secret polaris-auth -n dwlle >/dev/null 2>&1; then
  polaris_secret="$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
  kubectl create secret generic polaris-auth \
    --namespace dwlle \
    --from-literal=client-secret="$polaris_secret" \
    --dry-run=client -o yaml | kubectl apply -f -
fi
keycloak_admin_json="$(aws secretsmanager get-secret-value \
  --secret-id "$KEYCLOAK_ADMIN_SECRET_ARN" --query SecretString --output text)"
IFS='|' read -r keycloak_admin_user keycloak_admin_password <<< "$(SECRET_JSON="$keycloak_admin_json" python3 -c 'import json,os; d=json.loads(os.environ["SECRET_JSON"]); print("|".join([d["username"],d["password"]]))')"
kubectl create secret generic keycloak-admin \
  --namespace dwlle \
  --from-literal=username="$keycloak_admin_user" \
  --from-literal=password="$keycloak_admin_password" \
  --dry-run=client -o yaml | kubectl apply -f -
keycloak_alpha_json="$(aws secretsmanager get-secret-value \
  --secret-id "$KEYCLOAK_ALPHA_USER_SECRET_ARN" --query SecretString --output text)"
IFS='|' read -r keycloak_alpha_user keycloak_alpha_password <<< "$(SECRET_JSON="$keycloak_alpha_json" python3 -c 'import json,os; d=json.loads(os.environ["SECRET_JSON"]); print("|".join([d["username"],d["password"]]))')"
kubectl create secret generic keycloak-alpha-user \
  --namespace dwlle \
  --from-literal=username="$keycloak_alpha_user" \
  --from-literal=password="$keycloak_alpha_password" \
  --dry-run=client -o yaml | kubectl apply -f -
unset keycloak_admin_json keycloak_admin_password keycloak_alpha_json keycloak_alpha_password

RDS_SECRET_SHA256="$(SECRET_JSON="$secret_json" python3 -c 'import hashlib,os; print(hashlib.sha256(os.environ["SECRET_JSON"].encode()).hexdigest())')"
POLARIS_AUTH_SHA256="$(kubectl get secret polaris-auth -n dwlle -o json | python3 -c 'import hashlib,json,sys; data=json.load(sys.stdin)["data"]; print(hashlib.sha256(json.dumps(data,sort_keys=True).encode()).hexdigest())')"

for file in "$WORK_DIR"/manifests/*.yaml; do
  sed -i \
    -e "s|__REPOSITORY_URI__|$REPOSITORY_URI|g" \
    -e "s|__DATA_BUCKET__|$DATA_BUCKET|g" \
    -e "s|__REGION__|$AWS_REGION|g" \
    -e "s|__STORAGE_ROLE_ARN__|$STORAGE_ROLE_ARN|g" \
    "$file"
done
DS_CONFIG_SHA256="$(sha256sum "$WORK_DIR/manifests/dolphinscheduler.yaml" | cut -d ' ' -f1)"
POLARIS_CONFIG_SHA256="$(sha256sum "$WORK_DIR/manifests/polaris.yaml" | cut -d ' ' -f1)"
TRINO_CONFIG_SHA256="$(sha256sum "$WORK_DIR/manifests/trino.yaml" | cut -d ' ' -f1)"
KEYCLOAK_CONFIG_SHA256="$(sha256sum "$WORK_DIR/manifests/keycloak.yaml" | cut -d ' ' -f1)"

for file in "$WORK_DIR"/manifests/*.yaml; do
  sed -i \
    -e "s|__DS_IMAGE_DIGEST__|$DS_IMAGE_DIGEST|g" \
    -e "s|__SEATUNNEL_IMAGE_DIGEST__|$SEATUNNEL_IMAGE_DIGEST|g" \
    -e "s|__TRINO_IMAGE_DIGEST__|$TRINO_IMAGE_DIGEST|g" \
    -e "s|__POLARIS_IMAGE_DIGEST__|$POLARIS_IMAGE_DIGEST|g" \
    -e "s|__KEYCLOAK_IMAGE_DIGEST__|$KEYCLOAK_IMAGE_DIGEST|g" \
    -e "s|__CURL_IMAGE_DIGEST__|$CURL_IMAGE_DIGEST|g" \
    -e "s|__DS_CONFIG_SHA256__|$DS_CONFIG_SHA256|g" \
    -e "s|__POLARIS_CONFIG_SHA256__|$POLARIS_CONFIG_SHA256|g" \
    -e "s|__TRINO_CONFIG_SHA256__|$TRINO_CONFIG_SHA256|g" \
    -e "s|__KEYCLOAK_CONFIG_SHA256__|$KEYCLOAK_CONFIG_SHA256|g" \
    -e "s|__RDS_SECRET_SHA256__|$RDS_SECRET_SHA256|g" \
    -e "s|__POLARIS_AUTH_SHA256__|$POLARIS_AUTH_SHA256|g" \
    "$file"
done

echo "[dwlle] Deploying DolphinScheduler, Polaris, Trino, and Keycloak"
kubectl delete job polaris-setup -n dwlle --ignore-not-found
kubectl apply -f "$WORK_DIR/manifests/service-account.yaml"
kubectl apply -f "$WORK_DIR/manifests/dolphinscheduler.yaml"
kubectl apply -f "$WORK_DIR/manifests/polaris.yaml"
kubectl apply -f "$WORK_DIR/manifests/trino.yaml"
kubectl apply -f "$WORK_DIR/manifests/keycloak.yaml"
kubectl rollout status deployment/polaris -n dwlle --timeout=10m
kubectl rollout status deployment/dolphinscheduler -n dwlle --timeout=10m
kubectl rollout status deployment/trino -n dwlle --timeout=10m
kubectl rollout status deployment/keycloak -n dwlle --timeout=10m

echo "[dwlle] Configuring the Keycloak realm and dwlle-web client"
keycloak_pod="$(kubectl get pods -n dwlle -l app=keycloak -o jsonpath='{.items[0].metadata.name}')"
keycloak_admin_user="$(kubectl get secret keycloak-admin -n dwlle -o jsonpath='{.data.username}' | base64 --decode)"
keycloak_admin_password="$(kubectl get secret keycloak-admin -n dwlle -o jsonpath='{.data.password}' | base64 --decode)"
keycloak_alpha_user="$(kubectl get secret keycloak-alpha-user -n dwlle -o jsonpath='{.data.username}' | base64 --decode)"
keycloak_alpha_password="$(kubectl get secret keycloak-alpha-user -n dwlle -o jsonpath='{.data.password}' | base64 --decode)"
kcadm() {
  kubectl exec "$keycloak_pod" -n dwlle -- /opt/keycloak/bin/kcadm.sh "$@"
}
kcadm config credentials --server http://localhost:8080 --realm master \
  --user "$keycloak_admin_user" --password "$keycloak_admin_password"
if ! kcadm get realms/dwlle >/dev/null 2>&1; then
  kcadm create realms -s realm=dwlle -s enabled=true -s registrationAllowed=false \
    -s sslRequired=none -s accessTokenLifespan=3600
fi
client_uuid="$(kcadm get clients -r dwlle --query clientId=dwlle-web | CLIENT_ID=dwlle-web python3 -c 'import json,os,sys; print(next((item["id"] for item in json.load(sys.stdin) if item["clientId"] == os.environ["CLIENT_ID"]), ""))')"
if [[ -z "$client_uuid" ]]; then
  kcadm create clients -r dwlle -s clientId=dwlle-web -s enabled=true \
    -s publicClient=true -s standardFlowEnabled=true -s directAccessGrantsEnabled=false \
    -s 'redirectUris=["http://127.0.0.1:5173/*","http://localhost:5173/*"]' \
    -s 'webOrigins=["http://127.0.0.1:5173","http://localhost:5173"]' \
    -s 'attributes."pkce.code.challenge.method"=S256'
  client_uuid="$(kcadm get clients -r dwlle --query clientId=dwlle-web | CLIENT_ID=dwlle-web python3 -c 'import json,os,sys; print(next((item["id"] for item in json.load(sys.stdin) if item["clientId"] == os.environ["CLIENT_ID"]), ""))')"
fi
scope_uuid="$(kcadm get client-scopes -r dwlle | python3 -c 'import json,sys; print(next((item["id"] for item in json.load(sys.stdin) if item["name"] == "dwlle-api"), ""))')"
if [[ -z "$scope_uuid" ]]; then
  kcadm create client-scopes -r dwlle -s name=dwlle-api -s protocol=openid-connect
  scope_uuid="$(kcadm get client-scopes -r dwlle | python3 -c 'import json,sys; print(next((item["id"] for item in json.load(sys.stdin) if item["name"] == "dwlle-api"), ""))')"
fi
scope_mapper_id="$(kcadm get "client-scopes/$scope_uuid/protocol-mappers/models" -r dwlle | python3 -c 'import json,sys; print(next((item["id"] for item in json.load(sys.stdin) if item["name"] == "dwlle-api-audience"), ""))')"
if [[ -z "$scope_mapper_id" ]]; then
  kcadm create "client-scopes/$scope_uuid/protocol-mappers/models" -r dwlle \
    -s name=dwlle-api-audience -s protocol=openid-connect \
    -s protocolMapper=oidc-audience-mapper \
    -s 'config."included.client.audience"=' \
    -s 'config."included.custom.audience"=dwlle-api' \
    -s 'config."id.token.claim"=false' -s 'config."access.token.claim"=true'
fi
scope_attached="$(kcadm get "clients/$client_uuid/default-client-scopes" -r dwlle | SCOPE_ID="$scope_uuid" python3 -c 'import json,os,sys; print(any(item["id"] == os.environ["SCOPE_ID"] for item in json.load(sys.stdin)))')"
if [[ "$scope_attached" != "True" ]]; then
  kcadm update "clients/$client_uuid/default-client-scopes/$scope_uuid" -r dwlle
fi
mapper_id="$(kcadm get "clients/$client_uuid/protocol-mappers/models" -r dwlle | python3 -c 'import json,sys; print(next((item["id"] for item in json.load(sys.stdin) if item["name"] == "dwlle-api-audience"), ""))')"
if [[ -n "$mapper_id" ]]; then
  kcadm delete "clients/$client_uuid/protocol-mappers/models/$mapper_id" -r dwlle
fi
kcadm update "clients/$client_uuid" -r dwlle \
  -s fullScopeAllowed=false -s directAccessGrantsEnabled=false
alpha_user_uuid="$(kcadm get users -r dwlle -q "username=$keycloak_alpha_user" -q exact=true | python3 -c 'import json,sys; print(next((item["id"] for item in json.load(sys.stdin)), ""))')"
if [[ -z "$alpha_user_uuid" ]]; then
  kcadm create users -r dwlle -s "username=$keycloak_alpha_user" -s enabled=true \
    -s email=alpha-admin@example.com -s emailVerified=true \
    -s firstName=Alpha -s lastName=Admin
  alpha_user_uuid="$(kcadm get users -r dwlle -q "username=$keycloak_alpha_user" -q exact=true | python3 -c 'import json,sys; print(next((item["id"] for item in json.load(sys.stdin)), ""))')"
fi
kcadm set-password -r dwlle --userid "$alpha_user_uuid" --new-password "$keycloak_alpha_password"
echo "[dwlle] Keycloak realm dwlle and client dwlle-web are ready"

echo "[dwlle] Initializing the Iceberg catalog"
kubectl apply -f "$WORK_DIR/manifests/polaris.yaml"
kubectl wait --for=condition=complete job/polaris-setup -n dwlle --timeout=5m

echo "[dwlle] Creating the demo namespace if needed"
kubectl exec deployment/trino -n dwlle -- \
  trino --execute 'CREATE SCHEMA IF NOT EXISTS polaris.demo'

echo "[dwlle] Running the SeaTunnel batch job"
kubectl delete job seatunnel-jdbc-iceberg -n dwlle --ignore-not-found
kubectl apply -f "$WORK_DIR/manifests/seatunnel.yaml"
kubectl wait --for=condition=complete job/seatunnel-jdbc-iceberg -n dwlle --timeout=10m

actual="$(kubectl exec deployment/trino -n dwlle -- \
  trino --execute 'SELECT id, event_type, user_id FROM polaris.demo.events' 2>/dev/null)"
expected='"1","page_view","101"'
if [[ "$actual" != "$expected" ]]; then
  echo "[dwlle] Unexpected Trino result: $actual" >&2
  exit 1
fi

echo "[dwlle] Verified Trino result: $actual"
echo "[dwlle] Recent DolphinScheduler logs"
kubectl logs deployment/dolphinscheduler -n dwlle --tail=20
echo "[dwlle] Recent Polaris logs"
kubectl logs deployment/polaris -n dwlle --tail=20
echo "[dwlle] Recent Trino logs"
kubectl logs deployment/trino -n dwlle --tail=20
echo "[dwlle] Recent Keycloak logs"
kubectl logs deployment/keycloak -n dwlle --tail=20
