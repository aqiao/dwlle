#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_NAME="${1:-dev-global}"
: "${AWS_PROFILE:?Set AWS_PROFILE before deploying}"
AWS_REGION="${AWS_REGION:-$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["region"])' "$ROOT_DIR/infra/config/$ENV_NAME.json")}"
export AWS_REGION

"$ROOT_DIR/scripts/stage-artifacts"

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
    StorageRoleArn) STORAGE_ROLE_ARN="$value" ;;
  esac
done < <(OUTPUTS="$outputs" python3 -c 'import json,os; [print("|".join([x["OutputKey"],x["OutputValue"]])) for x in json.loads(os.environ["OUTPUTS"])]')
: "${ARTIFACTS_BUCKET:?}" "${DATA_BUCKET:?}" "${REPOSITORY_NAME:?}"
: "${CLUSTER_NAME:?}" "${BASTION_INSTANCE_ID:?}" "${DATABASE_SECRET_ARN:?}"
: "${STORAGE_ROLE_ARN:?}"

REPOSITORY_URI="$(aws ecr describe-repositories \
  --repository-names "$REPOSITORY_NAME" \
  --query 'repositories[0].repositoryUri' --output text)"
aws ecr get-login-password | docker login --username AWS --password-stdin "$REPOSITORY_URI"

echo "[dwlle] Building deployment images from verified artifacts"
docker compose -f "$ROOT_DIR/deploy/local/docker-compose.yml" --profile verification build \
  seatunnel dolphinscheduler
ensure_image() {
  if ! docker image inspect "$1" >/dev/null 2>&1; then
    docker pull "$1"
  fi
}
ensure_image trinodb/trino:484
ensure_image apache/polaris:1.8.0@sha256:347615e736cab2c9be0d8c464552ac930be4755302bb0aeb745216bbae99ba5b
ensure_image alpine/curl:8.23.0

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
push_image apache/polaris:1.8.0@sha256:347615e736cab2c9be0d8c464552ac930be4755302bb0aeb745216bbae99ba5b polaris-1.8.0
push_image alpine/curl:8.23.0 curl-8.23.0

echo "[dwlle] Uploading manifests and scripts"
aws s3 cp "$ROOT_DIR/artifacts/kubectl-v1.36.0-arm64" \
  "s3://$ARTIFACTS_BUCKET/kubectl/v1.36.0/arm64/kubectl"
aws s3 cp "$ROOT_DIR/deploy/aws/" "s3://$ARTIFACTS_BUCKET/deployment/" --recursive

export ARTIFACTS_BUCKET DATA_BUCKET REPOSITORY_URI CLUSTER_NAME DATABASE_SECRET_ARN STORAGE_ROLE_ARN
commands="$(python3 -c 'import json,os; env=os.environ; command=" && ".join(["aws s3 cp s3://{}/deployment/remote-data-plane.sh /tmp/dwlle-remote.sh".format(env["ARTIFACTS_BUCKET"]), "chmod 0755 /tmp/dwlle-remote.sh", "ARTIFACTS_BUCKET={ARTIFACTS_BUCKET} DATA_BUCKET={DATA_BUCKET} REPOSITORY_URI={REPOSITORY_URI} CLUSTER_NAME={CLUSTER_NAME} AWS_REGION={AWS_REGION} DATABASE_SECRET_ARN={DATABASE_SECRET_ARN} STORAGE_ROLE_ARN={STORAGE_ROLE_ARN} bash /tmp/dwlle-remote.sh".format_map(env)]); print(json.dumps({"commands":[command],"executionTimeout":["3600"]}))')"
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
