#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE=(docker compose -f "$SCRIPT_DIR/docker-compose.yml")

for variable in \
  RUSTFS_ACCESS_KEY \
  RUSTFS_SECRET_KEY \
  POLARIS_CLIENT_SECRET \
  LOCAL_POSTGRES_JDBC_URL \
  LOCAL_POSTGRES_USER \
  DOLPHINSCHEDULER_JDBC_URL; do
  if [[ -z "${!variable:-}" ]]; then
    echo "[dwlle] Set $variable before starting the local data plane" >&2
    exit 1
  fi
done

if [[ -z "${LOCAL_POSTGRES_PASSWORD+x}" ]]; then
  echo "[dwlle] Export LOCAL_POSTGRES_PASSWORD, using an empty value only for passwordless local development" >&2
  exit 1
fi

echo "[dwlle] Verifying pinned artifacts"
"$ROOT_DIR/scripts/stage-artifacts"
echo "[dwlle] Building SeaTunnel from verified artifacts"
"${COMPOSE[@]}" --profile verification build seatunnel
echo "[dwlle] Starting the local data plane"
"${COMPOSE[@]}" --profile verification up -d --wait \
  rustfs polaris-setup trino dolphinscheduler
echo "[dwlle] RustFS, Polaris, Trino, and DolphinScheduler are healthy"
