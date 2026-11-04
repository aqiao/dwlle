set -eu

realm=${1:-"POLARIS"}

TOKEN=$(curl \
  --fail-with-body \
  -s \
  http://polaris:8181/api/catalog/v1/oauth/tokens \
  --user "${CLIENT_ID}:${CLIENT_SECRET}" \
  -H "Polaris-Realm: $realm" \
  -d grant_type=client_credentials \
  -d scope=PRINCIPAL_ROLE:ALL | sed -n 's/.*"access_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')

if [ -z "${TOKEN}" ]; then
  echo "[dwlle] Failed to obtain access token" >&2
  exit 1
fi

export TOKEN
