# Miataru Statistics UI

This Node.js app listens to Redis MONITOR output from a productive Miataru instance and stores cached statistics in a separate Redis namespace. It exposes a basic-auth protected dashboard with live device stats and a map of active devices.

## Features

- Live device activity tracking (current/24h/7d/30d/365d)
- Update volume stats (last hour + total)
- Unique device estimate per day (HyperLogLog)
- Leaflet map filtered by activity window
- WebSocket updates (with polling fallback)
- Separate Redis namespace for cached stats
- Optional bootstrap scan to seed stats from existing `:last` keys

## Running locally

```bash
cd dev/statistics-ui
npm install
PORT=3000 \
STATS_AUTH_USER=miataru \
STATS_AUTH_PASS=change-me \
PROD_REDIS_URL=redis://prod-host:6379 \
STATS_REDIS_URL=redis://127.0.0.1:6380 \
node server.js
```

Use `MOCK_DATA=true` to run the UI without Redis connections for preview work.

## Docker (app + local-only stats redis)

```bash
docker compose up --build
```

Then visit `http://localhost:3005` and authenticate with `STATS_AUTH_USER` / `STATS_AUTH_PASS`.

## Environment variables

- `PORT`: UI port (default `3000`)
- `STATS_AUTH_USER` / `STATS_AUTH_PASS`: Basic auth credentials
- `PROD_REDIS_URL`: Redis URL for the productive Miataru instance
- `PROD_REDIS_NAMESPACE`: Namespace prefix (default `miad`)
- `STATS_REDIS_URL`: Redis URL for the stats cache
- `STATS_REDIS_NAMESPACE`: Prefix for cached stats (default `miad:stats`)
- `MONITOR_ENABLED`: Enable Redis MONITOR (`true` by default)
- `BOOTSTRAP_SCAN_ENABLED`: Scan `:last` keys on startup (`false` by default)
- `BOOTSTRAP_SCAN_BATCH`: Batch size for scan (default `250`)
- `BOOTSTRAP_SCAN_INTERVAL_MS`: Optional rescan interval (0 = disabled)
- `MAP_MAX_DEVICES`: Cap number of markers returned (default `2000`)
- `ACTIVE_WINDOW_MINUTES`: Window for "Active now" (default `15`)
- `STATS_BROADCAST_INTERVAL_MS`: WebSocket stats broadcast cadence (default `5000`)
- `MAP_BROADCAST_INTERVAL_MS`: WebSocket map broadcast cadence (default `10000`)
- `MOCK_DATA`: Serve mock data without Redis connections
