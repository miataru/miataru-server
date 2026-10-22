# Upgrade to miataru-server 3.0

The server version changes to 3.0.0; the client protocol remains API 1.1. Review runtime, Redis credentials, and persistence settings before replacing an existing deployment.

## Node.js and dependencies

Use Node.js 26 or newer for the server and both Node.js tools under `dev/`. For nvm users:

```bash
nvm use
npm ci
npm run test:all
```

The lockfiles are committed. Install each helper project's dependencies with `npm ci` from its own directory. Docker builds use Node.js 26; rebuild the application image when upgrading.

The default server configuration uses FakeRedis in memory. Persistent deployments must use `database.type: 'real'` and a separately managed Redis server. The main Dockerfile packages only the Node.js application.

## Redis credentials

Version 3.0 begins honoring `database.userName` and `database.password`. Check existing configuration files: placeholder usernames such as `root` were previously ignored and can now cause authentication failures.

For a Redis ACL user, configure the actual username and password. For password-only `requirepass` authentication, use `userName: 'default'` or leave the username empty:

```javascript
module.exports = {
    database: {
        type: 'real',
        host: 'redis',
        port: 6379,
        userName: 'default',
        password: process.env.REDIS_PASSWORD
    }
};
```

This example is an external JavaScript configuration file. Supply it with `node server.js --externalconfig /path/to/config.js` and set `REDIS_PASSWORD` in the application environment. The default configuration does not automatically read this environment variable. Keep real credentials outside the repository.

Redis authentication does not change the contents of RDB snapshots. Redis 8 does not inherently require a password; configure authentication on the server and matching credentials on the client.

## Existing Redis data

The Redis npm client version (6.x) and Redis server version (8.x in the bundled Statistics UI) are independent. Application updates do not upgrade the external Redis server or transfer its files.

The [official Redis upgrade guide](https://redis.io/docs/latest/operate/oss_and_stack/install/upgrade/) documents Redis 7.x to Redis 8 upgrades. Very old installations such as Redis 2.8 need a separate restoration rehearsal; direct restoration of their snapshots into Redis 8.10.1 has not been tested for this release.

Before changing a production Redis version:

1. Record the running Redis version, data directory, `dbfilename`, persistence mode, database selection, and Miataru namespace.
2. Quiesce writes for the final migration snapshot. Create a fresh snapshot and wait for successful completion. Preserve an independent copy of the original RDB and, when applicable, the complete AOF directory and manifest.
3. Restore a copy into an isolated target Redis using a separate volume. Match the expected data path, filename, and permissions. Preserve the original files for rollback.
4. Check startup logs, key counts, representative stored values, remaining TTLs, and Miataru location/history, DeviceKey, and allowed-device operations. Expired keys may disappear during loading, so compare counts with expiration in mind.
5. Cut over only after the rehearsal succeeds and repeat with a final consistent snapshot. Preserve the old Redis version and backup for rollback; do not rely on an older Redis reading files rewritten by Redis 8.

Keep `redisMiataruNamespace` unchanged unless deliberately migrating the keys too. A fresh Docker volume will start with an empty database even if a snapshot exists elsewhere on the host.

### RDB and AOF require different restore procedures

Do not combine an RDB-only migration with an unprepared switch to AOF. When both persistence methods are enabled, Redis loads AOF at startup. Merely placing `dump.rdb` in a volume started with `appendonly yes` is not a safe RDB import procedure.

For an RDB-only source, load the snapshot into the isolated target with AOF disabled (`appendonly no`) first. Validate the restored data. If AOF is desired, enable it on the running, populated instance with `CONFIG SET appendonly yes`, wait for the initial rewrite to finish successfully, and persist the matching configuration before restarting. Follow the [Redis persistence documentation](https://redis.io/docs/latest/management/persistence/) for details. Existing AOF deployments require their complete persistence files rather than only `dump.rdb`.

The development Statistics UI cache is disposable and is configured with both RDB and AOF persistence disabled. Do not use that cache configuration for the primary Miataru database.

## Statistics UI

The bundled Compose Redis requires `STATS_REDIS_PASSWORD` for both Redis and the UI. Supply it in the shell environment or an untracked `.env` file before starting Compose. Store it securely if the deployment must be recreated with the same credentials.

`STATS_REDIS_PASSWORD` is a separate password field and does not need URL encoding. `PROD_REDIS_URL` accepts `redis://username:password@host:6379`; URL-encode credentials embedded in URLs. The production URL is also used by the ioredis MONITOR connection, whose Redis user needs permission for MONITOR.

The bundled cache is reachable on `127.0.0.1:6380`. With the included host networking, the dashboard listens on port 3000. See the [Statistics UI README](../dev/statistics-ui/README.md) for setup and environment variables.

## Client compatibility

Continue using API 1.1 request shapes and existing endpoint paths. Server 3.0 does not rename endpoints or change Redis storage formats. Clients that still use API 1.0 must observe the existing [requester-ID migration](MIGRATION_REQUESTMIATARUDEVICEID.md) and [API 1.1 authentication rules](API_1.1_SECURITY.md).
