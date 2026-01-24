#!/usr/bin/env bash
# Offline Miataru seeder + updater (hardcoded city-center coordinates)
# English-only output and English-only device names.
# IMPORTANT: LocationDataRetentionTime is interpreted as MINUTES by Miataru.
# Requirements: bash, curl, date

if [ -z "${BASH_VERSION:-}" ]; then
  echo "This script must be run with bash." >&2
  exit 1
fi

set -euo pipefail

API_URL="${API_URL:-http://service.miataru.com/v1/UpdateLocation}"

# Miataru defaults
ENABLE_HISTORY="${ENABLE_HISTORY:-False}"

# IMPORTANT: MINUTES (not days)
RETENTION_MINUTES="${RETENTION_MINUTES:-30}"

H_ACC="${H_ACC:-50}"

# If set to 1, only print what would be sent (no POST)
DRY_RUN="${DRY_RUN:-0}"

js_timestamp_ms() {
  # JavaScript-style timestamp in ms since epoch (Date.now())
  # Validate strictly to avoid macOS date %N pitfalls.
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
# Format: DeviceID|Longitude|Latitude
# Decimal dot is required for JSON (Miataru expects standard numeric strings).
# ------------------------------------------------------------------
DATA='
# Europe
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

# North America
New_York_us|-74.0060|40.7128
Los_Angeles_us|-118.2437|34.0522
Chicago_us|-87.6298|41.8781
Toronto_ca|-79.3832|43.6532
Vancouver_ca|-123.1207|49.2827
Mexico_City_mx|-99.1332|19.4326
Guadalajara_mx|-103.3496|20.6597

# South America
Sao_Paulo_br|-46.6333|-23.5505
Rio_de_Janeiro_br|-43.1729|-22.9068
Buenos_Aires_ar|-58.3816|-34.6037
Cordoba_ar|-64.1888|-31.4201
Santiago_cl|-70.6693|-33.4489
Lima_pe|-77.0428|-12.0464

# Asia
Beijing_cn|116.4074|39.9042
Shanghai_cn|121.4737|31.2304
Hong_Kong_hk|114.1694|22.3193
Tokyo_jp|139.6503|35.6762
Osaka_jp|135.5023|34.6937
Seoul_kr|126.9780|37.5665
Busan_kr|129.0756|35.1796
Bangkok_th|100.5018|13.7563
Chiang_Mai_th|98.9817|18.7061
Delhi_in|77.1025|28.7041
Mumbai_in|72.8777|19.0760
Singapore_sg|103.8198|1.3521
Jakarta_id|106.8456|-6.2088
Manila_ph|120.9842|14.5995

# Middle East
Dubai_ae|55.2708|25.2048
Abu_Dhabi_ae|54.3773|24.4539
Tel_Aviv_il|34.7818|32.0853
Jerusalem_il|35.2137|31.7683
Riyadh_sa|46.6753|24.7136

# Africa
Cairo_eg|31.2357|30.0444
Alexandria_eg|29.9187|31.2001
Cape_Town_za|18.4241|-33.9249
Johannesburg_za|28.0473|-26.2041
Nairobi_ke|36.8219|-1.2921
Lagos_ng|3.3792|6.5244

# Oceania
Sydney_au|151.2093|-33.8688
Melbourne_au|144.9631|-37.8136
Brisbane_au|153.0251|-27.4698
Auckland_nz|174.7633|-36.8485
Wellington_nz|174.7762|-41.2865
'

echo "Starting offline Miataru updates (hardcoded coordinates)"
echo "API_URL=$API_URL  DRY_RUN=$DRY_RUN  HISTORY=$ENABLE_HISTORY  RETENTION_MINUTES=$RETENTION_MINUTES  H_ACC=$H_ACC"
echo "Timestamp(ms) example: $(js_timestamp_ms)"

while IFS='|' read -r device lon lat; do
  # Skip empty lines and comments
  [ -z "${device:-}" ] && continue
  case "$device" in \#*) continue ;; esac

  miataru_update_location "$device" "$lon" "$lat"
done <<<"$(printf "%s" "$DATA" | sed '/^[[:space:]]*$/d')"

echo "Done."

