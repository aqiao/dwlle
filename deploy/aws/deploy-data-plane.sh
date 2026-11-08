#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_NAME="${1:-dev-global}"
: "${AWS_PROFILE:?Set AWS_PROFILE before deploying}"
AWS_REGION="${AWS_REGION:-$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["region"])' "$ROOT_DIR/infra/config/$ENV_NAME.json")}"
export AWS_REGION

"$ROOT_DIR/scripts/stage-artifacts" --verify-only
"$ROOT_DIR/scripts/stage-images" --verify-only

outputs="$(aws cloudformation describe-stacks \
  --stack-name "Dwlle-$ENV_NAME-DataPlane" \
  --query 'Stacks[0].Outputs' --output json)"
while IFS='|' read -r key value; do
  case "$key" in
    ArtifactsBucketName) ARTIFACTS_BUCKET="$value" ;;
    DataBucketName) DATA_BUCKET="$value" ;;
    RepositoryName) REPOSITORY_NAME="$value" ;;
    ClusterName) CLUSTER_NAME="$value" ;;
    BastionInstanceId) BASTION_INSTANCE_ID="$value" ;;
    DatabaseSecretArn) DATABASE_SECRET_ARN="$value" ;;
    KeycloakAdminSecretArn) KEYCLOAK_ADMIN_SECRET_ARN="$value" ;;
    KeycloakAlphaUserSecretArn) KEYCLOAK_ALPHA_USER_SECRET_ARN="$value" ;;
    StorageRoleArn) STORAGE_ROLE_ARN="$value" ;;
  esac
done < <(OUTPUTS="$outputs" python3 -c 'import json,os; [print("|".join([x["OutputKey"],x["OutputValue"]])) for x in json.loads(os.environ["OUTPUTS"])]')
: "${ARTIFACTS_BUCKET:?}" "${DATA_BUCKET:?}" "${REPOSITORY_NAME:?}"
: "${CLUSTER_NAME:?}" "${BASTION_INSTANCE_ID:?}" "${DATABASE_SECRET_ARN:?}"
: "${KEYCLOAK_ADMIN_SECRET_ARN:?}" "${KEYCLOAK_ALPHA_USER_SECRET_ARN:?}"
: "${STORAGE_ROLE_ARN:?}"

REPOSITORY_URI="$(aws ecr describe-repositories \
  --repository-names "$REPOSITORY_NAME" \
  --query 'repositories[0].repositoryUri' --output text)"
aws ecr get-login-password | docker login --username AWS --password-stdin "$REPOSITORY_URI"

echo "[dwlle] Loading verified deployment images"
while IFS='|' read -r reference digest filename; do
  docker load -i "$ROOT_DIR/artifacts/$filename" >/dev/null
  docker tag "$reference@$digest" "$reference"
done < <(MANIFEST="$ROOT_DIR/versions.json" python3 -c 'import json,os; data=json.load(open(os.environ["MANIFEST"])); [print("|".join([item["reference"], item["digest"], item["filename"]])) for item in data["images"]]')

echo "[dwlle] Building deployment images from verified artifacts"
docker compose -f "$ROOT_DIR/deploy/local/docker-compose.yml" --profile verification build \
  seatunnel dolphinscheduler

push_image() {
  local source="$1"
  local tag="$2"
  echo "[dwlle] Pushing $source as $tag"
  docker tag "$source" "$REPOSITORY_URI:$tag"
  docker push "$REPOSITORY_URI:$tag"
}
push_image dwlle/dolphinscheduler:3.4.3 ds-3.4.3
push_image dwlle/seatunnel:3.0.0 seatunnel-3.0.0
push_image trinodb/trino:484 trino-484
push_image apache/polaris:1.8.0 polaris-1.8.0
push_image quay.io/keycloak/keycloak:26.8.1 keycloak-26.8.1
push_image alpine/curl:8.23.0 curl-8.23.0

image_digest() {
  aws ecr describe-images \
    --repository-name "$REPOSITORY_NAME" \
    --image-ids "imageTag=$1" \
    --query 'imageDetails[0].imageDigest' --output text
}
DS_IMAGE_DIGEST="$(image_digest ds-3.4.3)"
SEATUNNEL_IMAGE_DIGEST="$(image_digest seatunnel-3.0.0)"
TRINO_IMAGE_DIGEST="$(image_digest trino-484)"
POLARIS_IMAGE_DIGEST="$(image_digest polaris-1.8.0)"
KEYCLOAK_IMAGE_DIGEST="$(image_digest keycloak-26.8.1)"
CURL_IMAGE_DIGEST="$(image_digest curl-8.23.0)"

echo "[dwlle] Uploading manifests and scripts"
aws s3 cp "$ROOT_DIR/artifacts/kubectl-v1.36.0-arm64" \
  "s3://$ARTIFACTS_BUCKET/kubectl/v1.36.0/arm64/kubectl"
aws s3 cp "$ROOT_DIR/deploy/aws/" "s3://$ARTIFACTS_BUCKET/deployment/" --recursive

export ARTIFACTS_BUCKET DATA_BUCKET REPOSITORY_URI CLUSTER_NAME DATABASE_SECRET_ARN STORAGE_ROLE_ARN
export KEYCLOAK_ADMIN_SECRET_ARN KEYCLOAK_ALPHA_USER_SECRET_ARN
export DS_IMAGE_DIGEST SEATUNNEL_IMAGE_DIGEST TRINO_IMAGE_DIGEST POLARIS_IMAGE_DIGEST KEYCLOAK_IMAGE_DIGEST CURL_IMAGE_DIGEST
commands="$(python3 -c 'import json,os; env=os.environ; names=["ARTIFACTS_BUCKET","DATA_BUCKET","REPOSITORY_URI","CLUSTER_NAME","AWS_REGION","DATABASE_SECRET_ARN","KEYCLOAK_ADMIN_SECRET_ARN","KEYCLOAK_ALPHA_USER_SECRET_ARN","STORAGE_ROLE_ARN","DS_IMAGE_DIGEST","SEATUNNEL_IMAGE_DIGEST","TRINO_IMAGE_DIGEST","POLARIS_IMAGE_DIGEST","KEYCLOAK_IMAGE_DIGEST","CURL_IMAGE_DIGEST"]; assignments=" ".join("{}={}".format(name,env[name]) for name in names); command=" && ".join(["aws s3 cp s3://{}/deployment/remote-data-plane.sh /tmp/dwlle-remote.sh".format(env["ARTIFACTS_BUCKET"]), "chmod 0755 /tmp/dwlle-remote.sh", assignments+" bash /tmp/dwlle-remote.sh"]); print(json.dumps({"commands":[command],"executionTimeout":["3600"]}))')"
echo "[dwlle] Starting private deployment through SSM"
command_id="$(aws ssm send-command \
  --instance-ids "$BASTION_INSTANCE_ID" \
  --document-name AWS-RunShellScript \
  --comment 'Deploy the dwlle data plane' \
  --parameters "$commands" \
  --query 'Command.CommandId' --output text)"
echo "[dwlle] SSM command: $command_id"
status="InProgress"
for _ in {1..240}; do
  status="$(aws ssm get-command-invocation \
    --command-id "$command_id" --instance-id "$BASTION_INSTANCE_ID" \
    --query 'Status' --output text)"
  case "$status" in
    Success|Failed|Cancelled|TimedOut) break ;;
    Pending|Queued|Delayed|InProgress) sleep 15 ;;
    *)
      echo "[dwlle] Unexpected SSM status: $status" >&2
      exit 1
      ;;
  esac
done
aws ssm get-command-invocation \
  --command-id "$command_id" --instance-id "$BASTION_INSTANCE_ID" \
  --query '{Status:Status,Stdout:StandardOutputContent,Stderr:StandardErrorContent}' \
  --output json
if [[ "$status" != "Success" ]]; then
  echo "[dwlle] Remote deployment failed with status $status" >&2
  exit 1
fi
echo "[dwlle] AWS data plane deployment completed"
