#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE=(docker compose -f "$SCRIPT_DIR/docker-compose.yml" --profile verification)

query() {
  "${COMPOSE[@]}" exec -T trino trino --execute "$1"
}

ready=false
for _ in {1..30}; do
  catalogs="$(query 'SHOW CATALOGS' 2>/dev/null)"
  if [[ "$catalogs" == *'"polaris"'* ]]; then
    ready=true
    break
  fi
  sleep 2
done
if [[ "$ready" != true ]]; then
  echo "[dwlle] Trino did not finish loading the Polaris catalog" >&2
  exit 1
fi

echo "[dwlle] Creating the demo namespace if needed"
query 'CREATE SCHEMA IF NOT EXISTS polaris.demo'

echo "[dwlle] Running the PostgreSQL to Iceberg batch job"
"${COMPOSE[@]}" run --rm seatunnel \
  /opt/seatunnel/bin/seatunnel.sh -m local -c /seatunnel/jdbc-iceberg.conf

actual="$(query 'SELECT id, event_type, user_id FROM polaris.demo.events')"
expected='"1","page_view","101"'
if [[ "$actual" != "$expected" ]]; then
  echo "[dwlle] Unexpected Trino result: $actual" >&2
  exit 1
fi

echo "[dwlle] Verified Trino result: $actual"
