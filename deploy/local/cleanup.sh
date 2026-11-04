#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[dwlle] Removing local data-plane containers and volumes"
docker compose -f "$SCRIPT_DIR/docker-compose.yml" --profile verification down -v --remove-orphans
echo "[dwlle] Local data plane removed"
