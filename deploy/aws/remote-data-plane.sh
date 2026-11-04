#!/usr/bin/env bash
set -euo pipefail

: "${ARTIFACTS_BUCKET:?}" "${DATA_BUCKET:?}" "${REPOSITORY_URI:?}"
: "${CLUSTER_NAME:?}" "${AWS_REGION:?}" "${DATABASE_SECRET_ARN:?}"
: "${STORAGE_ROLE_ARN:?}"

WORK_DIR=/tmp/dwlle-deployment
rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR"

echo "[dwlle] Downloading deployment inputs from the artifacts bucket"
aws s3 cp "s3://$ARTIFACTS_BUCKET/deployment/" "$WORK_DIR/" --recursive
aws s3 cp "s3://$ARTIFACTS_BUCKET/kubectl/v1.36.0/arm64/kubectl" /usr/local/bin/kubectl
chmod 0755 /usr/local/bin/kubectl

for file in "$WORK_DIR"/manifests/*.yaml; do
  sed -i \
    -e "s|__REPOSITORY_URI__|$REPOSITORY_URI|g" \
    -e "s|__DATA_BUCKET__|$DATA_BUCKET|g" \
    -e "s|__REGION__|$AWS_REGION|g" \
    -e "s|__STORAGE_ROLE_ARN__|$STORAGE_ROLE_ARN|g" \
    "$file"
done

aws eks update-kubeconfig --name "$CLUSTER_NAME" --region "$AWS_REGION"
export KUBECONFIG=/root/.kube/config
cluster_arn="$(aws eks describe-cluster --name "$CLUSTER_NAME" --region "$AWS_REGION" --query 'cluster.arn' --output text)"
kubectl config use-context "$cluster_arn"
kubectl apply -f "$WORK_DIR/manifests/namespace.yaml"

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
if ! kubectl get secret polaris-auth -n dwlle >/dev/null 2>&1; then
  polaris_secret="$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
  kubectl create secret generic polaris-auth \
    --namespace dwlle \
    --from-literal=client-secret="$polaris_secret" \
    --dry-run=client -o yaml | kubectl apply -f -
fi

echo "[dwlle] Deploying DolphinScheduler, Polaris, and Trino"
kubectl apply -f "$WORK_DIR/manifests/service-account.yaml"
kubectl apply -f "$WORK_DIR/manifests/dolphinscheduler.yaml"
kubectl apply -f "$WORK_DIR/manifests/polaris.yaml"
kubectl apply -f "$WORK_DIR/manifests/trino.yaml"
kubectl rollout status deployment/polaris -n dwlle --timeout=10m
kubectl rollout status deployment/dolphinscheduler -n dwlle --timeout=10m
kubectl rollout status deployment/trino -n dwlle --timeout=10m

echo "[dwlle] Initializing the Iceberg catalog"
kubectl delete job polaris-setup -n dwlle --ignore-not-found
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
