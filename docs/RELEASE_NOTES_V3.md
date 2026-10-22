# Release Notes — Version 3.0.0

Released 2026-10-22. **miataru-server 3.0.0 | miataru API 1.1**

## Overview

Version 3.0 raises the runtime baseline to Node.js 26, updates npm dependencies, and enables the configured Redis credentials. This is a server major release because older Node.js runtimes are no longer supported and operator configuration may need adjustment. It does not introduce a new API protocol version.

## Changes

- Server, Statistics UI, and WebSocket-to-MQTT bridge require Node.js >= 26.0.0. Docker images use `node:26-alpine`, CI targets Node.js 26, and `.nvmrc` selects version 26.
- Express 5 route syntax and empty-body request handling preserve the existing API routes and validation behavior.
- Redis npm client 6 uses RESP2 replies, the legacy callback facade for hash commands and transactions, and promise-aware wrappers for rate-limited commands.
- `database.userName` and `database.password` are passed to the Redis client. These previously ignored settings now take effect.
- Statistics UI Compose uses `redis:8.10.1-alpine`, requires `STATS_REDIS_PASSWORD`, and publishes its cache only on `127.0.0.1:6380`. `PROD_REDIS_URL` can include credentials for both the normal client and MONITOR connection.
- Dependencies and test tools are updated, including Mocha 12 and Chai 6. All three npm projects have lockfiles; Docker and CI use `npm ci`.

## API and storage compatibility

The protocol remains API 1.1, including `/v1/` and legacy endpoints, DeviceKeys, allowed-device lists, slogans, security status, and location WebSockets. Existing requester-ID and requester-key validation rules continue to apply.

Redis key names and stored Miataru values are unchanged. Keep `redisMiataruNamespace` and the selected Redis database consistent when migrating. Redis-server upgrades and persistence-file restoration are separate deployment operations; neither happens automatically when updating the Node.js application.

## Validation

The release code passed 431 tests in a Node.js 26.12.1 Alpine container. Separate live checks against Redis 8.10.1 covered authenticated connections, DeviceKeys, allowed-device hashes, location/history reads, visitor transactions, deletion, and WebSocket snapshots and updates.

This validation used a fresh Redis dataset. Loading an existing Redis 2.8 RDB snapshot into Redis 8.10.1 has not been validated. Production WebSockets retain their TLS requirement; the HTTP smoke test simulated a TLS-terminating reverse proxy for the WebSocket upgrade.

## Upgrade references

- [3.0 migration guide](MIGRATION_V3.md)
- [Main README](../README.md)
- [Changelog](../CHANGELOG.md)
- [Statistics UI setup](../dev/statistics-ui/README.md)
- [WebSocket-to-MQTT bridge](../dev/websocket-mqtt-bridge/README.md)

The helper projects retain independent package version numbers. This release does not automatically upgrade running deployments.
