#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./updateLocation.sh <deviceid> <longitude> <latitude> [api_url]
#
# Example:
#   ./updateLocation.sh deviceid -4.394531 41.079351
#   ./updateLocation.sh deviceid 13.4050 52.5200 "http://service.miataru.com/v1/UpdateLocation"

DEVICE_ID="${1:-}"
LON="${2:-}"
LAT="${3:-}"
API_URL="${4:-http://service.miataru.com/v1/UpdateLocation}"

if [[ -z "$DEVICE_ID" || -z "$LON" || -z "$LAT" ]]; then
  echo "Usage: $0 <deviceid> <longitude> <latitude> [api_url]" >&2
  exit 1
fi

# JavaScript timestamp (ms since epoch), like Date.now()
# Works on Linux (GNU date) and macOS (fallback).
if date +%s%3N >/dev/null 2>&1; then
  TS="$(date +%s%3N)"
else
  TS="$(( $(date +%s) * 1000 ))"
fi

# Build JSON safely (no escaping pain)
JSON="$(cat <<EOF
{
  "MiataruConfig": {
    "EnableLocationHistory": "False",
    "LocationDataRetentionTime": "30"
  },
  "MiataruLocation": [
    {
      "Device": "$DEVICE_ID",
      "Timestamp": "$TS",
      "Longitude": "$LON",
      "Latitude": "$LAT",
      "HorizontalAccuracy": "50"
    }
  ]
}
EOF
)"

curl -sS -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "$JSON" \
  "$API_URL"

