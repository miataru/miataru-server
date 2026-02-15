# TECHNICAL SPECIFICATION

## 1. Architectural Overview

### Logical architecture
- **HTTP API layer (Express)**: An Express app provides the HTTP interface, JSON parsing, error handling, and static responses for `/` and `/robots.txt`. (Evidence: server.js; lib/routes/homepage.js; tests/integration/smoke.tests.js; tests/integration/robots.tests.js)
- **Middleware layer**: CORS and HTTP rate limiting are applied as app-level middleware before routes. (Evidence: lib/middlewares/index.js; lib/middlewares/rateLimiter.js; tests/integration/cors.tests.js; tests/integration/httpRateLimiter.tests.js)
- **Route layer**: Location endpoints are exposed under both `/v1/*` and legacy paths, plus a GET GeoJSON variant. (Evidence: lib/routes/location/index.js; README.md)
- **Request parsing & validation**: Incoming payloads are converted into typed request objects (device, location, history, visitor history, and config). Invalid inputs throw `BadRequestError` and return 400. (Evidence: lib/routes/location/v1/inputParser.js; lib/models/RequestLocation.js; lib/models/RequestDevice.js; lib/models/RequestLocationHistory.js; tests/integration/updateLocation.tests.js)
- **Storage access layer**: Redis (real or fakeredis) stores last-known location, history list, and visitor list. A global concurrency limiter protects Redis calls. (Evidence: lib/db.js; config/default.js; tests/unit/redisRateLimiter.tests.js)
- **Response models**: Response objects format API output for location, history, GeoJSON, visitor history, update ACKs, and delete ACKs. (Evidence: lib/models/ResponseLocation*.js; lib/models/ResponseUpdateLocation.js; lib/models/ResponseDeleteLocation.js; tests/unit/responseLocationGeoJSON.tests.js)

### Runtime/deployment model
- **Node.js server**: The application runs as a Node.js process using Express and starts listening only when `server.js` is executed directly. (Evidence: server.js)
- **Config layering**: `config/default.js` is always loaded, with environment, user, external config, and CLI overrides merged in that order. (Evidence: lib/utils/configurationLoader.js; README.md)
- **Port binding**: Defaults are `0.0.0.0:8090` and can be overridden via config. (Evidence: config/default.js)

### Dependency boundaries
- **Core application boundary**: `server.js` wires together middleware, routes, configuration, logging, and error handling. (Evidence: server.js)
- **Routing boundary**: `/lib/routes` owns endpoint registration and delegates to location handlers. (Evidence: lib/routes/index.js; lib/routes/location/index.js)
- **Storage boundary**: `/lib/db.js` abstracts Redis/fakeredis and enforces concurrency limits. (Evidence: lib/db.js; tests/unit/db.redisCompatibility.tests.js)
- **Model boundary**: `/lib/models` define request validation and response serialization. (Evidence: lib/models/index.js; lib/models/RequestLocation.js; lib/models/ResponseLocationGeoJSON.js)

## 2. Component Specifications

### 2.1 server.js (HTTP application entrypoint)
- **Responsibility**: Build the Express app, install middleware/routes, capture raw request bodies for error logging, and provide centralized error handling. (Evidence: server.js)
- **Interfaces**: Exports the Express `app`; listens on configured port when run directly. (Evidence: server.js)
- **Key logic**:
  - JSON body parsing with `10mb` limit and raw-body capture. (Evidence: server.js)
  - 404/405 error routing with structured logging severity. (Evidence: server.js; tests/unit/serverErrorHandling.tests.js)
- **State & lifecycle**: Stateless per-request; process-level logger and configuration are loaded at startup. (Evidence: server.js; lib/logger.js; lib/configuration.js)
- **Failure modes**: JSON parse failures return 400 and include detailed logging context (raw body, content-length mismatches). (Evidence: server.js; tests/integration/getLocationHistoryParsingError.tests.js; .specstory/history/2026-01-19_20-26Z-miataru-getlocationhistory-json-error.md)

### 2.2 Configuration loader (`lib/utils/configurationLoader.js`)
- **Responsibility**: Load and merge configuration from default, environment, user, external file, and CLI args. (Evidence: lib/utils/configurationLoader.js; tests/unit/configLoader.tests.js)
- **Interfaces**: `load(baseDir, cliArgs)` returns merged config object. (Evidence: lib/utils/configurationLoader.js)
- **Key logic**:
  - Environment selection via `NODE_ENV` with fallback to `development`. (Evidence: lib/utils/configurationLoader.js)
  - Optional external config via `--externalconfig` CLI arg. (Evidence: lib/utils/configurationLoader.js; README.md)
- **Failure modes**: Throws when specified external config file is missing. (Evidence: lib/utils/configurationLoader.js; tests/unit/configLoader.tests.js)

### 2.3 Middleware: CORS (`lib/middlewares/index.js`)
- **Responsibility**: Enforce allowed origins and emit CORS headers for permitted requests. (Evidence: lib/middlewares/index.js; README.md)
- **Interfaces**: Express middleware installed via `middlewares.install(app)`. (Evidence: lib/middlewares/index.js)
- **Key logic**:
  - Allows requests with no Origin header. (Evidence: lib/middlewares/index.js; tests/integration/cors.tests.js)
  - Rejects disallowed origins by omitting CORS headers. (Evidence: tests/integration/cors.tests.js)
- **Failure modes**: No hard failure; disallowed origins proceed without CORS headers. (Evidence: tests/integration/cors.tests.js)

### 2.4 Middleware: HTTP rate limiter (`lib/middlewares/rateLimiter.js`)
- **Responsibility**: Enforce concurrent request limits per IP with queueing and timeouts. (Evidence: lib/middlewares/rateLimiter.js; README.md)
- **Interfaces**: Express middleware installed by `rateLimiter.install(app)`. (Evidence: lib/middlewares/rateLimiter.js)
- **Key logic**: Uses `ConcurrencyLimiter` per IP with configured `maxConcurrentPerIp`, `maxQueuePerIp`, and `queueTimeoutMs`. (Evidence: lib/middlewares/rateLimiter.js; lib/utils/concurrencyLimiter.js; tests/integration/httpRateLimiter.tests.js)
- **Failure modes**: Queue overflow returns configured status (default 429) with rejection/timeout message. (Evidence: lib/middlewares/rateLimiter.js; tests/integration/httpRateLimiter.tests.js)

### 2.5 Location routes (`lib/routes/location/index.js`)
- **Responsibility**: Register versioned and legacy endpoints for location CRUD and history. (Evidence: lib/routes/location/index.js; README.md)
- **Interfaces**: Express route registrations for Update/Get/History/GeoJSON/VisitorHistory/Delete; supports GET `/GetLocationGeoJSON/:id?`. (Evidence: lib/routes/location/index.js)
- **Key logic**:
  - Non-POST requests return 405 (except OPTIONS returns 204). (Evidence: lib/routes/location/index.js; tests/unit/serverErrorHandling.tests.js; tests/integration/cors.tests.js)
- **Failure modes**: Method-not-supported errors become 405 JSON error responses. (Evidence: lib/errors.js; server.js)

### 2.6 Input parser (`lib/routes/location/v1/inputParser.js`)
- **Responsibility**: Parse request bodies into validated request objects for each endpoint. (Evidence: lib/routes/location/v1/inputParser.js)
- **Interfaces**: Middleware `inputParser` populates `req.MIATARU` with `config`, `locations`, `devices`, or `request`. (Evidence: lib/routes/location/v1/inputParser.js)
- **Key logic**:
  - UpdateLocation accepts a single object or array for backward compatibility. (Evidence: lib/routes/location/v1/inputParser.js; tests/integration/backwardCompatibility.tests.js)
  - GetLocation/GetGeoJSON expect `MiataruGetLocation` array; otherwise defaults to `[{}]` (which triggers validation errors). (Evidence: lib/routes/location/v1/inputParser.js; tests/integration/updateLocation.tests.js)
- **Failure modes**: Invalid requests throw `BadRequestError` and return 400. (Evidence: lib/errors.js; tests/integration/updateLocation.tests.js)

### 2.7 Location handler (`lib/routes/location/v1/location.js`)
- **Responsibility**: Implement UpdateLocation, GetLocation, GetLocationHistory, GetLocationGeoJSON (POST/GET), GetVisitorHistory, DeleteLocation, and visitor history recording. (Evidence: lib/routes/location/v1/location.js)
- **Interfaces**: Exported handler functions called by route registrations. (Evidence: lib/routes/location/v1/index.js)
- **Key logic**:
  - **UpdateLocation**: If history enabled, pushes each location into `hist` list and trims; updates `last` on final entry. If history disabled, deletes history list and stores `last` with TTL. (Evidence: lib/routes/location/v1/location.js; config/default.js; tests/integration/api.tests.js)
  - **GetLocation**: Reads `last` per device and returns null when missing; records visitor history when the device exists (including when access is denied by the allowed devices list). (Evidence: lib/routes/location/v1/location.js; tests/integration/unknownDevice.tests.js; tests/integration/visitorHistoryFiltering.tests.js; tests/integration/allowedDevices.tests.js)
  - **GetLocationHistory**: Reads list length, fetches up to requested amount, skips invalid JSON entries, and optionally records visitor history. (Evidence: lib/routes/location/v1/location.js; tests/integration/getLocationHistoryConfig.tests.js)
  - **GetLocationGeoJSON**: Converts first location into GeoJSON Feature or returns `{}` if missing coordinates. (Evidence: lib/models/ResponseLocationGeoJSON.js; tests/unit/responseLocationGeoJSON.tests.js)
  - **GetVisitorHistory**: Filters out entries where visitor device equals target device. (Evidence: lib/routes/location/v1/location.js; tests/integration/visitorHistoryFiltering.tests.js)
  - **DeleteLocation**: Deletes `last`, `hist`, and `visit` keys in parallel and returns deleted key count. (Evidence: lib/routes/location/v1/location.js; docs/DELETE_LOCATION_API.md; tests/integration/deleteLocation.tests.js)
- **State & lifecycle**: Operates on Redis keys per device ID; location history and visitor history lists are trimmed to configured maxima. (Evidence: lib/routes/location/v1/location.js; config/default.js)
- **Failure modes**: Redis errors wrap as `InternalServerError`; malformed JSON data yields error responses. (Evidence: lib/routes/location/v1/location.js; lib/errors.js)

### 2.8 Storage adapter (`lib/db.js`)
- **Responsibility**: Provide Redis client (real or fakeredis) with legacy callbacks, concurrency limits, and error translation. (Evidence: lib/db.js; tests/unit/db.redisCompatibility.tests.js)
- **Interfaces**: Exposes Redis methods `get`, `set`, `setex`, `lpush`, `ltrim`, `lrange`, `llen`, `del`, etc. (Evidence: lib/db.js)
- **Key logic**:
  - When using real Redis, enable `legacyMode` and wrap modern Redis v4 API to expose callback-style methods. (Evidence: lib/db.js; tests/unit/db.redisCompatibility.tests.js)
  - Global Redis concurrency limiter wraps calls and emits `REDIS_QUEUE_FULL`/`REDIS_QUEUE_TIMEOUT` errors. (Evidence: lib/db.js; tests/unit/redisRateLimiter.tests.js)
- **Failure modes**: Redis connection errors are logged; queue overflow/timeouts reject calls. (Evidence: lib/db.js; tests/unit/redisRateLimiter.tests.js)

### 2.9 Models (requests/responses)
- **Responsibility**: Validate request payloads and format responses for each endpoint. (Evidence: lib/models/*.js; tests/unit/dataHolder.tests.js)
- **Interfaces**: Request objects expose getters; response objects expose `.data()` to serialize JSON. (Evidence: lib/models/RequestLocation.js; lib/models/ResponseLocation.js)
- **Failure modes**: Missing required fields throw `BadRequestError`. (Evidence: lib/models/RequestLocation.js; lib/models/RequestDevice.js; tests/unit/requestDevice.tests.js)

### 2.10 Utilities
- **Key builder**: Constructs Redis keys with configurable namespace. (Evidence: lib/utils/keyBuilder.js; config/default.js; tests/unit/stuff.tests.js)
- **Concurrency limiter**: Generic queueing limiter supporting timeouts and per-key concurrency. (Evidence: lib/utils/concurrencyLimiter.js; tests/unit/concurrencyLimiter.tests.js)
- **Logger**: Lightweight logger with `info`, `warn`, `error` levels and console transport. (Evidence: lib/utils/logger/Logger.js; lib/utils/logger/transports/Console.js)

## 3. Data Models

### 3.1 RequestLocation
- **Schema**: `{ Device, Timestamp, Longitude, Latitude, HorizontalAccuracy, Speed?, BatteryLevel?, Altitude? }`. (Evidence: lib/models/RequestLocation.js; README.md)
- **Invariants**: Required fields must be non-null; optional fields default to `-1` and are omitted in serialized data. (Evidence: lib/models/RequestLocation.js; tests/unit/dataHolder.tests.js)
- **Validation rules**: Missing required properties throw `BadRequestError`; `false` values are accepted for backward compatibility. (Evidence: lib/models/RequestLocation.js; tests/integration/newFields.tests.js)

### 3.2 RequestDevice
- **Schema**: `{ Device }`. (Evidence: lib/models/RequestDevice.js)
- **Invariants**: Device must be provided and non-empty string; `0` and `false` are accepted. (Evidence: lib/models/RequestDevice.js; tests/unit/requestDevice.tests.js)

### 3.3 RequestConfig (UpdateLocation)
- **Schema**: `{ EnableLocationHistory, LocationDataRetentionTime }`. (Evidence: lib/models/RequestConfig.js)
- **Invariants**: `EnableLocationHistory` must be a string when provided; `LocationDataRetentionTime` must be present. (Evidence: lib/models/RequestConfig.js; tests/unit/dataHolder.tests.js)
- **Validation rules**: `EnableLocationHistory` is coerced to boolean (`true` only when string equals `'true'`, case-insensitive). (Evidence: lib/models/RequestConfig.js; tests/unit/dataHolder.tests.js)

### 3.4 RequestConfigGetLocation (GetLocation/History)
- **Schema**: `{ RequestMiataruDeviceID, RequestMiataruDeviceKey? }`. (Evidence: lib/models/RequestConfigGetLocation.js)
- **Invariants**: Empty request device ID may be suppressed based on config; requests where visitor equals target device are suppressed. (Evidence: lib/models/RequestConfigGetLocation.js; tests/integration/visitorHistoryFiltering.tests.js)

### 3.5 RequestLocationHistory
- **Schema**: `{ Device, Amount }` with flexible input forms (object, array of key/value pairs, or `key=value` string). (Evidence: lib/models/RequestLocationHistory.js; tests/integration/backwardCompatibility.tests.js)
- **Invariants**: Both device and amount must be present; amount must be a positive number. (Evidence: lib/models/RequestLocationHistory.js)
- **Validation rules**: Normalizes key casing, ordering, and payload format before validation. (Evidence: lib/models/RequestLocationHistory.js; tests/integration/backwardCompatibility.tests.js)

### 3.6 RequestVisitorHistory
- **Schema**: `{ Device, Amount }`. (Evidence: lib/models/RequestVisitorHistory.js)
- **Invariants**: Both device and amount are required. (Evidence: lib/models/RequestVisitorHistory.js)

### 3.7 Response models
- **ResponseLocation**: `{ MiataruLocation: [location|null] }`. (Evidence: lib/models/ResponseLocation.js; tests/integration/unknownDevice.tests.js)
- **ResponseLocationHistory**: `{ MiataruServerConfig, MiataruLocation }`. (Evidence: lib/models/ResponseLocationHistory.js; tests/integration/api.tests.js)
- **ResponseLocationGeoJSON**: GeoJSON Feature for first location only; returns `{}` when invalid. (Evidence: lib/models/ResponseLocationGeoJSON.js; tests/unit/responseLocationGeoJSON.tests.js)
- **ResponseVisitorHistory**: `{ MiataruServerConfig, MiataruVisitors }`. (Evidence: lib/models/ResponseVisitorHistory.js; tests/integration/visitorHistoryFiltering.tests.js)
- **ResponseUpdateLocation**: ACK with fish-style verbose string. (Evidence: lib/models/ResponseUpdateLocation.js; tests/integration/updateLocation.tests.js)
- **ResponseDeleteLocation**: ACK with deleted key count. (Evidence: lib/models/ResponseDeleteLocation.js; tests/integration/deleteLocation.tests.js)

## 4. Core Workflows

### 4.1 UpdateLocation
- **Primary path**:
  1. Parse `MiataruConfig` and `MiataruLocation` (supports array or single object). (Evidence: lib/routes/location/v1/inputParser.js; tests/integration/backwardCompatibility.tests.js)
  2. Validate required location fields. (Evidence: lib/models/RequestLocation.js)
  3. If history enabled, `LPUSH` each location into `miad:{device}:hist`, `LTRIM` to `maximumNumberOfHistoryItems`, and `SET` `miad:{device}:last` for the final item. (Evidence: lib/routes/location/v1/location.js; config/default.js)
  4. If history disabled, `DEL` history list and `SETEX` `miad:{device}:last` with TTL = `LocationDataRetentionTime * 60`. (Evidence: lib/routes/location/v1/location.js)
  5. Return `ACK`. (Evidence: lib/models/ResponseUpdateLocation.js)
- **Alternate paths**: Single-object payloads are wrapped into arrays for backward compatibility. (Evidence: lib/routes/location/v1/inputParser.js)
- **Error paths**: Missing fields or malformed payloads return 400. (Evidence: lib/models/RequestLocation.js; tests/integration/updateLocation.tests.js)
- **Retry/recovery**: Client retries are safe; `SET`/`LPUSH` operations overwrite or append deterministically. (Evidence: lib/routes/location/v1/location.js)

### 4.2 GetLocation
- **Primary path**:
  1. Parse devices list and required `RequestMiataruDeviceID` (plus optional `RequestMiataruDeviceKey`). (Evidence: lib/routes/location/v1/inputParser.js; lib/models/RequestConfigGetLocation.js)
  2. If `strictDeviceKeyCheck` is enabled and requester has a configured DeviceKey, validate `RequestMiataruDeviceKey`; fail with 403 on mismatch. (Evidence: lib/routes/location/v1/location.js; config/default.js)
  3. For each device, `GET` `miad:{device}:last`. (Evidence: lib/routes/location/v1/location.js)
  4. Record visitor history if device exists (regardless of access control). (Evidence: lib/routes/location/v1/location.js; lib/models/RequestConfigGetLocation.js; tests/integration/allowedDevices.tests.js)
  5. Return `MiataruLocation` array with location objects or `null` for unknown devices. (Evidence: lib/models/ResponseLocation.js; tests/integration/unknownDevice.tests.js)
- **Alternate paths**: Legacy `/GetLocation` endpoint behaves like `/v1/GetLocation`. (Evidence: lib/routes/location/index.js; tests/integration/backwardCompatibility.tests.js)
- **Error paths**: Invalid device payloads return 400. (Evidence: lib/models/RequestDevice.js; tests/unit/requestDevice.tests.js)
- **Retry/recovery**: Safe to retry; no server-side mutations except visitor history logging. (Evidence: lib/routes/location/v1/location.js)

### 4.3 GetLocationHistory
- **Primary path**:
  1. Parse `Device`/`Amount` from flexible payload formats. (Evidence: lib/models/RequestLocationHistory.js; tests/integration/backwardCompatibility.tests.js)
  2. `LLEN` history list and `LRANGE` up to requested amount (newest first). (Evidence: lib/routes/location/v1/location.js; tests/integration/getLocationHistoryConfig.tests.js)
  3. Skip invalid JSON history entries and log a warning. (Evidence: lib/routes/location/v1/location.js; tests/integration/getLocationHistoryConfig.tests.js)
  4. Record visitor history if configured. (Evidence: lib/routes/location/v1/location.js)
  5. Return `MiataruServerConfig` with available/maximum counts and `MiataruLocation` list. (Evidence: lib/models/ResponseLocationHistory.js; tests/integration/api.tests.js)
- **Alternate paths**: Handles large requests (>1000) without JSON parsing errors. (Evidence: tests/integration/getLocationHistoryLarge.tests.js; tests/integration/getLocationHistoryParsingError.tests.js)
- **Error paths**: Missing device or amount returns 400. (Evidence: lib/models/RequestLocationHistory.js)
- **Retry/recovery**: Reads are idempotent; invalid list entries are ignored rather than failing. (Evidence: lib/routes/location/v1/location.js)

### 4.4 GetLocationGeoJSON (POST and GET)
- **Primary path**:
  1. Read `miad:{device}:last`. (Evidence: lib/routes/location/v1/location.js)
  2. When longitude/latitude are present, return GeoJSON Feature with properties including optional fields. (Evidence: lib/models/ResponseLocationGeoJSON.js; tests/unit/responseLocationGeoJSON.tests.js)
- **Alternate paths**: GET `/GetLocationGeoJSON/:id?` bypasses request body parsing and returns first location only. (Evidence: lib/routes/location/index.js; lib/routes/location/v1/location.js)
- **Error paths**: Unknown device returns `{}`. (Evidence: tests/integration/unknownDevice.tests.js)
- **Retry/recovery**: Safe to retry; read-only path. (Evidence: lib/routes/location/v1/location.js)

### 4.5 GetVisitorHistory
- **Primary path**:
  1. Parse `Device`/`Amount`. (Evidence: lib/routes/location/v1/inputParser.js; lib/models/RequestVisitorHistory.js)
  2. Fetch list entries and filter out visitors matching target device ID. (Evidence: lib/routes/location/v1/location.js; tests/integration/visitorHistoryFiltering.tests.js)
  3. Return `MiataruVisitors` and server config counts. (Evidence: lib/models/ResponseVisitorHistory.js)
- **Alternate paths**: Legacy `/GetVisitorHistory` behaves like `/v1/GetVisitorHistory`. (Evidence: lib/routes/location/index.js; tests/integration/unknownDevice.tests.js)
- **Error paths**: Missing device or amount returns 400. (Evidence: lib/models/RequestVisitorHistory.js)
- **Retry/recovery**: Read-only; safe to retry. (Evidence: lib/routes/location/v1/location.js)

### 4.6 Visitor history recording modes
- **Primary path**:
  - **Detailed ON**: Each access `LPUSH`es a new entry and `LTRIM`s to the maximum count. (Evidence: lib/routes/location/v1/location.js; tests/integration/recordDetailedVisitorHistory.tests.js)
  - **Detailed OFF**: Existing entries are deduplicated by DeviceID, updated, sorted by timestamp (newest first), and capped by unique device count. (Evidence: lib/routes/location/v1/location.js; tests/integration/recordDetailedVisitorHistory.tests.js)
- **Alternate paths**: Unknown visitor IDs are dropped when configured to disallow empty IDs. (Evidence: lib/models/RequestConfigGetLocation.js; config/default.js)
- **Error paths**: Malformed visitor history entries are skipped and logged. (Evidence: lib/routes/location/v1/location.js)
- **Retry/recovery**: Visitor logging is asynchronous (fire-and-forget); errors are logged but do not fail the main response. (Evidence: lib/routes/location/v1/location.js)

### 4.7 DeleteLocation
- **Primary path**:
  1. Parse device ID. (Evidence: lib/routes/location/v1/inputParser.js; lib/models/RequestDevice.js)
  2. Delete `last`, `hist`, and `visit` keys in parallel. (Evidence: lib/routes/location/v1/location.js)
  3. Return `ACK` with count of deleted keys. (Evidence: lib/models/ResponseDeleteLocation.js; docs/DELETE_LOCATION_API.md)
- **Alternate paths**: Legacy `/DeleteLocation` behaves like `/v1/DeleteLocation`. (Evidence: lib/routes/location/index.js; tests/integration/deleteLocation.tests.js)
- **Error paths**: Missing device yields 400; non-existent device returns ACK with `MiataruDeletedCount: 0`. (Evidence: tests/integration/deleteLocation.tests.js)
- **Retry/recovery**: Safe to retry; deletions are idempotent. (Evidence: lib/routes/location/v1/location.js)

### 4.8 Error handling and logging
- **Primary path**: Errors are logged with severity based on status; 404/405 are info, others warn/error. (Evidence: server.js; tests/unit/serverErrorHandling.tests.js)
- **Alternate paths**: JSON parse failures include raw body previews and content-length mismatch warnings. (Evidence: server.js; .specstory/history/2026-01-19_20-26Z-miataru-getlocationhistory-json-error.md)
- **Error paths**: Response payload is `{ error: <message> }`. (Evidence: server.js)

## 5. External Dependencies & Integrations
- **Redis / FakeRedis**: Real Redis for production or fakeredis for testing/development. (Evidence: lib/db.js; config/default.js)
- **Express & middleware**: Express, body-parser, cors, serve-favicon. (Evidence: server.js; package.json)
- **Async flow control**: `seq` library orchestrates Redis calls. (Evidence: lib/routes/location/v1/location.js; package.json)
- **CLI parsing**: `yargs` handles CLI config overrides. (Evidence: lib/configuration.js; package.json)
- **Logging & time**: `moment` timestamps logger output. (Evidence: lib/utils/logger/Logger.js; package.json)
- **Testing**: Mocha/Chai/Supertest validate unit and integration behaviors. (Evidence: package.json; README.md)

## 6. Configuration

### Parameters and defaults
- **Network**: `port=8090`, `listenip=0.0.0.0`. (Evidence: config/default.js)
- **Database**: `database.type` (`mock|real`), `host`, `port`, optional credentials. (Evidence: config/default.js)
- **Logging**: `logging.logLevel`. (Evidence: config/default.js; lib/logger.js)
- **Data limits**: `maximumNumberOfHistoryItems`, `maximumNumberOfLocationVistors`. (Evidence: config/default.js)
- **Visitor history**: `addEmptyVisitorDeviceIDtoVisitorHistory`, `recordDetailedVisitorHistory`. (Evidence: config/default.js; README.md; .specstory/history/2026-01-22_13-59Z-visitor-history-recording-configuration.md)
- **Redis namespace**: `redisMiataruNamespace` (default `miad`). (Evidence: config/default.js; lib/utils/keyBuilder.js)
- **CORS**: `cors.allowedOrigins` list. (Evidence: config/default.js; README.md)
- **Rate limiting**: `rateLimiting.http` and `rateLimiting.redis` subtrees with queueing and timeouts. (Evidence: config/default.js; README.md; tests/integration/httpRateLimiter.tests.js; tests/unit/redisRateLimiter.tests.js)

### Configuration layering
- **Files**: `default.js` always loaded; `{env}.js` overrides; `user.{user}.js` overrides in development; optional external config via `--externalconfig`. (Evidence: lib/utils/configurationLoader.js; README.md)
- **Environment variables**: `NODE_ENV` selects environment config; `USER/USERNAME` selects user config. (Evidence: lib/utils/configurationLoader.js)

### Defaults
- Default configuration uses fakeredis (`database.type=mock`) for non-production use. (Evidence: config/default.js)

## 7. Security & Privacy Design (if applicable)
- **No built-in authentication**: APIs accept any device ID; operators must secure deployment externally. (Evidence: docs/DELETE_LOCATION_API.md)
- **CORS origin control**: Only allow configured origins; requests without origin are allowed but not marked CORS-allowed. (Evidence: lib/middlewares/index.js; tests/integration/cors.tests.js)
- **Visitor history privacy**: Self-requests are filtered and empty visitor IDs can be excluded. (Evidence: lib/models/RequestConfigGetLocation.js; tests/integration/visitorHistoryFiltering.tests.js)
- **Logging of malformed payloads**: Raw request bodies are captured to aid diagnosing JSON parse failures. (Evidence: server.js; .specstory/history/2026-01-19_20-26Z-miataru-getlocationhistory-json-error.md)

## 8. Performance Considerations
- **HTTP concurrency limits**: Per-IP queueing bounds throughput and avoids overload. (Evidence: lib/middlewares/rateLimiter.js; tests/integration/httpRateLimiter.tests.js)
- **Redis concurrency limits**: Global limiter caps parallel Redis commands with queue/timeout semantics. (Evidence: lib/db.js; tests/unit/redisRateLimiter.tests.js)
- **History trimming**: Lists are trimmed to configured maxima to bound memory. (Evidence: lib/routes/location/v1/location.js; config/default.js)
- **Body parsing**: JSON payloads are capped at 10MB. (Evidence: server.js)

## 9. Implementation Notes & Gotchas
- **GeoJSON uses the first location only**: When multiple locations are returned, GeoJSON serialization only uses index 0. (Evidence: lib/models/ResponseLocationGeoJSON.js; tests/unit/responseLocationGeoJSON.tests.js)
- **GeoJSON requires coordinates**: Missing longitude/latitude yields `{}`. (Evidence: lib/models/ResponseLocationGeoJSON.js; tests/unit/responseLocationGeoJSON.tests.js)
- **GetLocation returns `null` for unknown devices**: The array preserves request order and includes `null` for missing data. (Evidence: lib/routes/location/v1/location.js; tests/integration/unknownDevice.tests.js)
- **History request parsing is tolerant**: Device/Amount can be provided in different orders, casing, or as key/value strings. (Evidence: lib/models/RequestLocationHistory.js; tests/integration/backwardCompatibility.tests.js)
- **Visitor history filtering**: Entries where visitor equals target device are filtered at read time and suppressed at write time. (Evidence: lib/models/RequestConfigGetLocation.js; lib/routes/location/v1/location.js; tests/integration/visitorHistoryFiltering.tests.js)
- **Retention behavior**: When history is disabled, only the latest location is stored with TTL derived from `LocationDataRetentionTime` (minutes * 60 seconds). (Evidence: lib/routes/location/v1/location.js)
- **Validation compatibility**: Required properties accept `false` values to preserve older client semantics. (Evidence: lib/models/RequestLocation.js; tests/integration/newFields.tests.js)

## 10. Traceability

- **FR-001 UpdateLocation** → UpdateLocation handler, RequestConfig, integration update tests. (Evidence: lib/routes/location/v1/location.js; lib/models/RequestConfig.js; tests/integration/updateLocation.tests.js; docs/PRD.md)
- **FR-002 GetLocation** → GetLocation handler and ResponseLocation. (Evidence: lib/routes/location/v1/location.js; lib/models/ResponseLocation.js; tests/integration/unknownDevice.tests.js; docs/PRD.md)
- **FR-003 GetLocationHistory** → RequestLocationHistory normalization and handler. (Evidence: lib/models/RequestLocationHistory.js; lib/routes/location/v1/location.js; tests/integration/getLocationHistoryConfig.tests.js; docs/PRD.md)
- **FR-004 GetLocationGeoJSON** → ResponseLocationGeoJSON and handler. (Evidence: lib/models/ResponseLocationGeoJSON.js; lib/routes/location/v1/location.js; tests/unit/responseLocationGeoJSON.tests.js; docs/PRD.md)
- **FR-005 GetVisitorHistory** → Visitor history handler and response. (Evidence: lib/routes/location/v1/location.js; lib/models/ResponseVisitorHistory.js; tests/integration/visitorHistoryFiltering.tests.js; docs/PRD.md)
- **FR-006 DeleteLocation** → DeleteLocation handler and response. (Evidence: lib/routes/location/v1/location.js; lib/models/ResponseDeleteLocation.js; tests/integration/deleteLocation.tests.js; docs/PRD.md)
- **FR-007 Visitor history recording modes** → recordDetailedVisitorHistory behavior and tests. (Evidence: lib/routes/location/v1/location.js; config/default.js; tests/integration/recordDetailedVisitorHistory.tests.js; docs/PRD.md)
- **FR-008 Backward compatibility** → legacy endpoints and payload parsing. (Evidence: lib/routes/location/index.js; lib/routes/location/v1/inputParser.js; tests/integration/backwardCompatibility.tests.js; docs/PRD.md)
- **FR-009 CORS** → CORS middleware and tests. (Evidence: lib/middlewares/index.js; tests/integration/cors.tests.js; docs/PRD.md)
- **FR-010 Rate limiting** → HTTP/Redis limiter implementation and tests. (Evidence: lib/middlewares/rateLimiter.js; lib/db.js; tests/integration/httpRateLimiter.tests.js; tests/unit/redisRateLimiter.tests.js; docs/PRD.md)

---

**Reconstruction Assumptions**
- `specification.md` is referenced in the task instructions but does not exist in the repository; requirements and behaviors are reconstructed from README, tests, source, `.specstory` history, and the PRD. (Evidence: docs/PRD.md)
- `LocationDataRetentionTime` is interpreted as minutes and converted to seconds by multiplying by 60; no explicit unit is documented beyond this conversion in code. (Evidence: lib/routes/location/v1/location.js)
