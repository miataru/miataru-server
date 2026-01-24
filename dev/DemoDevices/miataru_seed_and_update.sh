#!/usr/bin/env bash
# Offline Miataru seeder + updater (hardcoded city-center coordinates)
# English-only output and English-only device names.
# Retention time is expressed in MINUTES (Miataru API behavior).
# Requirements: bash, curl, date

if [ -z "${BASH_VERSION:-}" ]; then
  echo "This script must be run with bash." >&2
  exit 1
fi

set -euo pipefail

API_URL="${API_URL:-http://service.miataru.com/v1/UpdateLocation}"

# Miataru defaults
ENABLE_HISTORY="${ENABLE_HISTORY:-False}"

# IMPORTANT:
# LocationDataRetentionTime is interpreted by Miataru as MINUTES
RETENTION_MINUTES="${RETENTION_MINUTES:-30}"

H_ACC="${H_ACC:-50}"

# If set to 1, only print what would be sent (no POST)
DRY_RUN="${DRY_RUN:-0}"

js_timestamp_ms() {
  # JavaScript-style timestamp in ms since epoch (Date.now())
  local ts=""
  ts="$(date +%s%3N 2>/dev/null || true)"
  if [[ ! "$ts" =~ ^[0-9]{13}$ ]]; then
    ts="$(( $(date +%s) * 1000 ))"
  fi
  printf "%s" "$ts"
}

miataru_update_location() {
  local device_id="$1"
  local lon="$2"
  local lat="$3"
  local ts json

  ts="$(js_timestamp_ms)"

  json="$(cat <<EOF
{
  "MiataruConfig": {
    "EnableLocationHistory": "$ENABLE_HISTORY",
    "LocationDataRetentionTime": "$RETENTION_MINUTES"
  },
  "MiataruLocation": [
    {
      "Device": "$device_id",
      "Timestamp": "$ts",
      "Longitude": "$lon",
      "Latitude": "$lat",
      "HorizontalAccuracy": "$H_ACC"
    }
  ]
}
EOF
)"

  if [ "$DRY_RUN" = "1" ]; then
    echo "DRY_RUN: device=$device_id lon=$lon lat=$lat ts=$ts retention_minutes=$RETENTION_MINUTES"
    return 0
  fi

  echo "POST: device=$device_id lon=$lon lat=$lat ts=$ts retention_minutes=$RETENTION_MINUTES"
  curl -sS -X POST \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "$json" \
    "$API_URL" >/dev/null

  echo "OK:  device=$device_id"
}

# ------------------------------------------------------------------
# Offline hardcoded dataset
# Format: DeviceName_country|longitude|latitude
# Coordinates ≈ city centers
# ------------------------------------------------------------------
DATA='
Berlin_de|13.4050|52.5200
Munich_de|11.5755|48.1374
Paris_fr|2.3522|48.8566
Marseille_fr|5.3698|43.2965
London_gb|-0.1278|51.5074
Manchester_gb|-2.2426|53.4808
Rome_it|12.4964|41.9028
Milan_it|9.1900|45.4642
Madrid_es|-3.7038|40.4168
Barcelona_es|2.1686|41.3874
Amsterdam_nl|4.9041|52.3676
Rotterdam_nl|4.4777|51.9244
Stockholm_se|18.0686|59.3293
Gothenburg_se|11.9746|57.7089
Copenhagen_dk|12.5683|55.6761
Aarhus_dk|10.2039|56.1629
Helsinki_fi|24.9384|60.1699
Tampere_fi|23.7610|61.4978
Moscow_ru|37.6173|55.7558
Saint_Petersburg_ru|30.3351|59.9343
New_York_us|-74.0060|40.7128
Los_Angeles_us|-118.2437|34.0522
Chicago_us|-87.6298|41.8781
Sao_Paulo_br|-46.6333|-23.5505
Rio_de_Janeiro_br|-43.1729|-22.9068
Tokyo_jp|139.6503|35.6762
Osaka_jp|135.5023|34.6937
Seoul_kr|126.9780|37.5665
Busan_kr|129.0756|35.1796
Bangkok_th|100.5018|13.7563
Delhi_in|77.1025|28.7041
Sydney_au|151.2093|-33.8688
Melbourne_au|144.9631|-37.8136
'

echo "Starting offline Miataru updates"
echo "API_URL=$API_URL  DRY_RUN=$DRY_RUN  HISTORY=$ENABLE_HISTORY  RETENTION_MINUTES=$RETENTION_MINUTES  H_ACC=$H_ACC"
echo "Timestamp(ms) example: $(js_timestamp_ms)"

while IFS='|' read -r device lon lat; do
  [ -z "${device:-}" ] && continue
  miataru_update_location "$device" "$lon" "$lat"
done <<<"$(printf "%s" "$DATA" | sed '/^[[:space:]]*$/d')"

echo "Done."

