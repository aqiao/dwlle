set -eu

realm=${1:-"POLARIS"}
TOKEN=${2:-""}
BASEDIR=$(dirname "$0")

if [ -z "$TOKEN" ]; then
  . "$BASEDIR/obtain-token.sh"
fi

STORAGE_TYPE="S3"
if [ -z "${STORAGE_LOCATION}" ]; then
  echo "[dwlle] STORAGE_LOCATION is required" >&2
  exit 1
fi

if [ -z "${STORAGE_CONFIG_INFO}" ]; then
  STORAGE_CONFIG_INFO="{\"storageType\": \"$STORAGE_TYPE\", \"allowedLocations\": [\"$STORAGE_LOCATION\"]}"
fi

if curl --fail --silent \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Polaris-Realm: $realm" \
  http://polaris:8181/api/management/v1/catalogs/quickstart_catalog >/dev/null; then
  echo "[dwlle] Catalog quickstart_catalog already exists"
  exit 0
fi

echo "[dwlle] Creating quickstart_catalog in realm $realm"
PAYLOAD='{
  "catalog": {
    "name": "quickstart_catalog",
    "type": "INTERNAL",
    "readOnly": false,
    "properties": {
      "default-base-location": "'$STORAGE_LOCATION'"
    },
    "storageConfigInfo": '$STORAGE_CONFIG_INFO'
  }
}'

curl --fail-with-body \
  -s \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -H "Polaris-Realm: $realm" \
  http://polaris:8181/api/management/v1/catalogs \
  -d "$PAYLOAD"
