# PROJECT REQUIREMENTS DOCUMENT (PRD)

## 1. Overview
- **Purpose**: Provide a self-hostable Miataru server that stores and serves device location data (current, history, GeoJSON) with configurable retention and visitor history tracking while maintaining backward compatibility with legacy clients. (Evidence: README.md L9-L43, L340-L433; lib/routes/location/index.js L9-L30)
- **Scope**:
  - HTTP API endpoints for UpdateLocation, GetLocation, GetLocationHistory, GetLocationGeoJSON (POST + GET variant), GetVisitorHistory, and DeleteLocation. (Evidence: README.md L27-L43; lib/routes/location/index.js L9-L30)
  - Configuration-driven behavior for retention, visitor history, CORS, and rate limiting. (Evidence: README.md L126-L200, L202-L295, L316-L338; config/default.js L7-L66)
  - Redis-backed storage for last known location, history lists, and visitor history lists. (Evidence: lib/routes/location/v1/location.js L11-L15, L290-L335; docs/DELETE_LOCATION_API.md L101-L115)
- **Out of Scope / Non-goals**:
  - Authentication/authorization and device ownership validation. (Evidence: docs/DELETE_LOCATION_API.md L155-L160)
  - Guaranteed disk-backed archival storage in default configuration; default is time-bounded/in-memory orientation. (Evidence: README.md L19-L20; config/default.js L13-L25; lib/routes/location/v1/location.js L320-L335)

## 2. Personas / Stakeholders (if applicable)
- **Self-hosting operators**: configure Redis, retention, CORS, and rate limits. (Evidence: README.md L316-L338; config/default.js L13-L66)
- **Client application developers**: integrate with Miataru API endpoints and formats. (Evidence: README.md L27-L88; tests/integration/api.tests.js; tests/integration/backwardCompatibility.tests.js L7-L138)
- **End users**: their location data is stored and retrieved; privacy-driven usage. (Evidence: README.md L9-L21)
- **Operations/QA**: rely on tests and observability for stability under load. (Evidence: README.md L434-L480; tests/integration/httpRateLimiter.tests.js L10-L110; tests/unit/redisRateLimiter.tests.js L9-L123)

## 3. Functional Requirements

### FR-001: Update location data (current + optional history)
- **Priority**: Must
- **Description**: The server shall accept UpdateLocation requests and store the last known location, optionally storing history when enabled.
- **Inputs / Triggers**: HTTP POST `/v1/UpdateLocation` or `/UpdateLocation` with `MiataruLocation` array and optional `MiataruConfig` containing `EnableLocationHistory` and `LocationDataRetentionTime`. (Evidence: README.md L27-L43, L64-L70; lib/routes/location/index.js L9-L23; lib/routes/location/v1/inputParser.js L48-L62)
- **Outputs / Effects**: Writes to Redis last location key; when history enabled, appends to history list and trims to configured max; when disabled, deletes history and sets TTL on last location. (Evidence: lib/routes/location/v1/location.js L290-L335; config/default.js L31-L33)
- **Acceptance Criteria**:
  - When `EnableLocationHistory` is true, history list grows and is trimmed to `maximumNumberOfHistoryItems`. (Evidence: lib/routes/location/v1/location.js L297-L311; config/default.js L31-L33)
  - When `EnableLocationHistory` is false, only last known location is stored with TTL derived from `LocationDataRetentionTime`. (Evidence: lib/routes/location/v1/location.js L320-L335; lib/models/RequestConfig.js L6-L34)
  - Returns `MiataruResponse: ACK` on success. (Evidence: lib/models/ResponseUpdateLocation.js L5-L9; tests/integration/newFields.tests.js L9-L29)
- **Evidence pointers**: README.md L64-L70; lib/routes/location/v1/location.js L290-L343; tests/integration/newFields.tests.js L9-L73.

### FR-002: Get current location data
- **Priority**: Must
- **Description**: The server shall return the last known location for each requested device.
- **Inputs / Triggers**: HTTP POST `/v1/GetLocation` or `/GetLocation` with `MiataruGetLocation` array; required `MiataruConfig.RequestMiataruDeviceID` for visitor tracking and access control. (Evidence: README.md L27-L43, L72-L76; lib/routes/location/index.js L10-L23; lib/routes/location/v1/inputParser.js L64-L75)
- **Outputs / Effects**: Returns `MiataruLocation` array with entries or null if missing; may record visitor history per config. (Evidence: lib/routes/location/v1/location.js L354-L398; lib/models/ResponseLocation.js L9-L13)
- **Acceptance Criteria**:
  - Returns `MiataruLocation` array matching requested device order. (Evidence: lib/models/ResponseLocation.js L9-L13)
  - If a device has no stored location, entry is `null`. (Evidence: lib/routes/location/v1/location.js L380-L388; tests/integration/deleteLocation.tests.js L125-L134)
  - If `RequestMiataruDeviceID` equals target device, visitor history is not recorded. (Evidence: lib/models/RequestConfigGetLocation.js L19-L36; tests/integration/visitorHistoryFiltering.tests.js L44-L99)
- **Evidence pointers**: lib/routes/location/v1/location.js L354-L398; tests/integration/backwardCompatibility.tests.js L39-L65.

### FR-003: Get location history
- **Priority**: Must
- **Description**: The server shall return the most recent location history entries up to the requested amount.
- **Inputs / Triggers**: HTTP POST `/v1/GetLocationHistory` or `/GetLocationHistory` with `MiataruGetLocationHistory.Device` and `.Amount`; required `MiataruConfig.RequestMiataruDeviceID`. (Evidence: README.md L32-L43; lib/routes/location/index.js L15-L29; lib/models/RequestLocationHistory.js L136-L171)
- **Outputs / Effects**: Returns `MiataruLocation` list with server config metadata; may record visitor history. (Evidence: lib/models/ResponseLocationHistory.js L7-L15; lib/routes/location/v1/location.js L186-L276)
- **Acceptance Criteria**:
  - Rejects missing/invalid device or amount with 400. (Evidence: lib/models/RequestLocationHistory.js L160-L162)
  - Returns up to `Amount` entries, newest first. (Evidence: lib/routes/location/v1/location.js L206-L219; tests/integration/newFields.tests.js L218-L239)
  - Skips invalid JSON entries and logs warning. (Evidence: lib/routes/location/v1/location.js L239-L263)
- **Evidence pointers**: lib/routes/location/v1/location.js L186-L276; tests/integration/getLocationHistoryConfig.tests.js; tests/integration/getLocationHistoryLarge.tests.js.

### FR-004: Get location as GeoJSON
- **Priority**: Should
- **Description**: The server shall return a GeoJSON Feature representation of the requested device’s current location.
- **Inputs / Triggers**: HTTP POST `/v1/GetLocationGeoJSON` or `/GetLocationGeoJSON` with `MiataruGetLocation` array; HTTP GET `/v1/GetLocationGeoJSON/:id?` or `/GetLocationGeoJSON/:id?` for a single device. (Evidence: README.md L29-L40; lib/routes/location/index.js L11-L26)
- **Outputs / Effects**: Returns GeoJSON Feature with geometry coordinates and properties (name, timestamp, accuracy, optional fields). (Evidence: lib/models/ResponseLocationGeoJSON.js L9-L29)
- **Acceptance Criteria**:
  - When coordinates are present, return a GeoJSON Feature with Point geometry. (Evidence: lib/models/ResponseLocationGeoJSON.js L9-L26)
  - Optional fields (speed, batteryLevel, altitude) are included when present. (Evidence: lib/models/ResponseLocationGeoJSON.js L18-L24; tests/unit/responseLocationGeoJSON.tests.js L7-L44)
- **Evidence pointers**: lib/routes/location/v1/location.js L408-L472; tests/integration/newFields.tests.js L125-L173.

### FR-005: Get visitor history
- **Priority**: Must
- **Description**: The server shall return visitor history for a device, with filtering of self-requests.
- **Inputs / Triggers**: HTTP POST `/v1/GetVisitorHistory` or `/GetVisitorHistory` with `MiataruGetVisitorHistory.Device` and `.Amount`. (Evidence: README.md L33-L43; lib/routes/location/index.js L16-L29; lib/models/RequestVisitorHistory.js L3-L20)
- **Outputs / Effects**: Returns `MiataruVisitors` list and server config counts; filters entries where visitor DeviceID equals target device. (Evidence: lib/models/ResponseVisitorHistory.js L7-L14; lib/routes/location/v1/location.js L518-L535)
- **Acceptance Criteria**:
  - Returns empty list for unknown device. (Evidence: tests/integration/unknownDevice.tests.js L166-L203)
  - Filters out visitor entries that match target device ID. (Evidence: lib/routes/location/v1/location.js L518-L525; tests/integration/visitorHistoryFiltering.tests.js L44-L99)
- **Evidence pointers**: lib/routes/location/v1/location.js L481-L535; tests/integration/unknownDevice.tests.js L166-L203.

### FR-006: Delete all location data for a device
- **Priority**: Must
- **Description**: The server shall delete last known location, location history, and visitor history for a device.
- **Inputs / Triggers**: HTTP POST `/v1/DeleteLocation` or `/DeleteLocation` with `MiataruDeleteLocation.Device`. (Evidence: README.md L90-L124; lib/routes/location/index.js L17-L30; lib/routes/location/v1/inputParser.js L98-L100)
- **Outputs / Effects**: Deletes up to three Redis keys and returns deleted count. (Evidence: lib/routes/location/v1/location.js L551-L595; lib/models/ResponseDeleteLocation.js L6-L11)
- **Acceptance Criteria**:
  - Returns ACK and `MiataruDeletedCount` reflecting deleted keys. (Evidence: tests/integration/deleteLocation.tests.js L27-L77)
  - Returns ACK with 0 for non-existent device data. (Evidence: tests/integration/deleteLocation.tests.js L61-L77)
- **Evidence pointers**: docs/DELETE_LOCATION_API.md L101-L129; tests/integration/deleteLocation.tests.js L7-L138.

### FR-007: Visitor history recording modes
- **Priority**: Should
- **Description**: Visitor history recording shall support two modes: detailed (record every access) and summary (one entry per device, updated on access).
- **Inputs / Triggers**: Configuration `recordDetailedVisitorHistory` and requests to GetLocation/GetLocationHistory. (Evidence: README.md L239-L255; config/default.js L40-L41; lib/routes/location/v1/location.js L30-L177)
- **Outputs / Effects**: In detailed mode, each access appends; in summary mode, list is deduplicated by DeviceID and updated. (Evidence: lib/routes/location/v1/location.js L37-L176)
- **Acceptance Criteria**:
  - Detailed mode produces multiple entries for the same visitor device across multiple accesses. (Evidence: tests/integration/recordDetailedVisitorHistory.tests.js L51-L130)
  - Summary mode keeps one entry per visitor device and updates timestamps. (Evidence: tests/integration/recordDetailedVisitorHistory.tests.js L199-L240)
- **Evidence pointers**: lib/routes/location/v1/location.js L37-L176; tests/integration/recordDetailedVisitorHistory.tests.js L51-L240.

### FR-008: Backward compatibility for legacy endpoints and payloads
- **Priority**: Must
- **Description**: The server shall support legacy endpoints and older request formats.
- **Inputs / Triggers**: Non-versioned endpoints and single-object UpdateLocation payloads. (Evidence: README.md L36-L43; lib/routes/location/index.js L22-L30; lib/routes/location/v1/inputParser.js L51-L56)
- **Outputs / Effects**: Requests succeed using legacy endpoints; missing new fields are tolerated. (Evidence: tests/integration/backwardCompatibility.tests.js L12-L88)
- **Acceptance Criteria**:
  - Legacy `/UpdateLocation` and `/GetLocation` work. (Evidence: tests/integration/backwardCompatibility.tests.js L94-L138)
  - Old-format updates without new fields are accepted. (Evidence: tests/integration/backwardCompatibility.tests.js L12-L37)
- **Evidence pointers**: lib/routes/location/index.js L22-L30; tests/integration/backwardCompatibility.tests.js L12-L138.

### FR-009: CORS enforcement and preflight handling
- **Priority**: Should
- **Description**: The server shall enforce CORS based on allowed origins and support preflight requests.
- **Inputs / Triggers**: Incoming requests with Origin headers and OPTIONS preflight. (Evidence: README.md L126-L158; lib/middlewares/index.js L8-L29)
- **Outputs / Effects**: CORS headers are emitted for allowed origins; disallowed origins receive no CORS headers; OPTIONS returns 204. (Evidence: tests/integration/cors.tests.js L9-L182)
- **Acceptance Criteria**:
  - Allowed origin receives `Access-Control-Allow-Origin` and `Access-Control-Allow-Credentials`. (Evidence: tests/integration/cors.tests.js L52-L85)
  - Disallowed origin receives no allow-origin header. (Evidence: tests/integration/cors.tests.js L87-L96)
- **Evidence pointers**: lib/middlewares/index.js L8-L29; tests/integration/cors.tests.js L9-L182.

### FR-010: HTTP and Redis rate limiting
- **Priority**: Should
- **Description**: The server shall limit concurrent HTTP requests per IP and Redis operations globally, with configurable queueing and timeout behavior.
- **Inputs / Triggers**: Configuration `rateLimiting.http` and `rateLimiting.redis`. (Evidence: README.md L159-L200; config/default.js L51-L66)
- **Outputs / Effects**: Requests are queued or rejected with 429; Redis ops queue or reject with specific errors. (Evidence: lib/middlewares/rateLimiter.js L9-L59; lib/db.js L15-L193)
- **Acceptance Criteria**:
  - Queue limit exceeded returns 429 with configured message. (Evidence: tests/integration/httpRateLimiter.tests.js L50-L74)
  - Redis queue full emits `REDIS_QUEUE_FULL` error code. (Evidence: tests/unit/redisRateLimiter.tests.js L21-L56)
- **Evidence pointers**: tests/integration/httpRateLimiter.tests.js L50-L110; tests/unit/redisRateLimiter.tests.js L21-L106.

## 4. Non-Functional Requirements
- **Performance**:
  - The server shall handle concurrent HTTP requests with bounded queueing per IP; queue overflow shall return 429. (Evidence: lib/middlewares/rateLimiter.js L17-L59; tests/integration/httpRateLimiter.tests.js L50-L110)
- **Reliability**:
  - Redis operations shall be guarded by a concurrency limiter; queue timeouts shall produce deterministic error codes. (Evidence: lib/db.js L15-L193; tests/unit/redisRateLimiter.tests.js L70-L106)
- **Security / Privacy**:
  - No authentication is provided; deployments must account for this externally. (Reconstruction Assumption; Evidence: docs/DELETE_LOCATION_API.md L155-L160)
  - Visitor history shall not include self-requests or optionally empty visitor IDs based on config. (Evidence: lib/models/RequestConfigGetLocation.js L19-L36; config/default.js L37-L38)
- **Maintainability**:
  - Configuration layering must support default, environment, user, and external overrides. (Evidence: lib/utils/configurationLoader.js L16-L65)
- **Testability**:
  - Each endpoint and major configuration behavior shall have automated tests (unit/integration). (Evidence: README.md L434-L480; tests/integration/*.tests.js; tests/unit/*.tests.js)
- **Observability**:
  - Error handling shall log detailed context for JSON parsing failures while suppressing error-level logging for 404/405. (Evidence: server.js L40-L103; tests/unit/serverErrorHandling.tests.js L15-L52)
  - Expanded logging for JSON parsing failures is required to diagnose GetLocationHistory payload errors observed in production. (Evidence: .specstory/history/2026-01-19_20-26Z-miataru-getlocationhistory-json-error.md L7-L21; server.js L40-L103)

## 5. Data Requirements
- **Sources**: Client-provided JSON payloads over HTTP (UpdateLocation, GetLocation, History, VisitorHistory, DeleteLocation). (Evidence: README.md L64-L124)
- **Storage expectations**:
  - Redis keys: `miad:{device}:last`, `miad:{device}:hist`, `miad:{device}:visit` (namespace configurable). (Evidence: lib/routes/location/v1/location.js L11-L15; lib/utils/keyBuilder.js L1-L9; docs/DELETE_LOCATION_API.md L101-L115)
- **Integrity rules**:
  - Required fields for location: Device, Timestamp, Longitude, Latitude, HorizontalAccuracy. (Evidence: README.md L340-L352; lib/models/RequestLocation.js L6-L70)
  - Optional fields default to -1 and are omitted from response when unset. (Evidence: lib/models/RequestLocation.js L11-L70; tests/unit/requestLocationIntegration.tests.js L115-L159)
  - History and visitor requests require device and amount. (Evidence: lib/models/RequestLocationHistory.js L160-L162; lib/models/RequestVisitorHistory.js L9-L11)
- **Retention**:
  - Location history is capped at `maximumNumberOfHistoryItems`. (Evidence: config/default.js L31-L33; lib/routes/location/v1/location.js L307-L311)
  - Last known location may have TTL when history is disabled. (Evidence: lib/routes/location/v1/location.js L320-L335)
  - Visitor history is capped by `maximumNumberOfLocationVistors`. (Evidence: config/default.js L34-L35; lib/routes/location/v1/location.js L45-L125)

## 6. Constraints
- **Technical**:
  - Node.js runtime with Express and Redis/FakeRedis; uses body-parser JSON with 10mb limit. (Evidence: server.js L4-L21; config/default.js L13-L25)
- **Architectural**:
  - REST-like HTTP endpoints with JSON payloads; v1 and legacy paths coexist. (Evidence: lib/routes/location/index.js L9-L30)
- **Operational**:
  - Rate limiting must be configurable and can be disabled. (Evidence: lib/middlewares/rateLimiter.js L10-L15; config/default.js L51-L66)
- **Organizational**:
  - Documentation and tests are primary artifacts for integration behavior. (Evidence: README.md L434-L480; docs/DELETE_LOCATION_API.md L1-L196)

## 7. Success Metrics & Acceptance
- **API correctness**: All endpoint integration tests pass (update, get, history, visitor, delete, CORS). (Evidence: tests/integration/*.tests.js)
- **Backward compatibility**: Legacy endpoints continue to function and old-format payloads succeed. (Evidence: tests/integration/backwardCompatibility.tests.js L12-L138)
- **Operational safeguards**: Rate limiter tests pass for queueing and rejection. (Evidence: tests/integration/httpRateLimiter.tests.js L50-L110; tests/unit/redisRateLimiter.tests.js L21-L106)
- **Data lifecycle**: DeleteLocation removes last/history/visitor keys and returns counts. (Evidence: tests/integration/deleteLocation.tests.js L80-L138)

## 8. Risks & Mitigations
- **Risk**: No authentication could expose location data.
  - **Mitigation**: Deploy behind authentication/authorization or restrict network access. (Reconstruction Assumption; Evidence: docs/DELETE_LOCATION_API.md L155-L160)
- **Risk**: In-memory/TTL defaults could lead to data loss if retention not configured.
  - **Mitigation**: Document and configure `EnableLocationHistory` and retention times explicitly. (Evidence: README.md L19-L20; lib/models/RequestConfig.js L6-L34)
- **Risk**: Visitor history may grow unbounded in detailed mode if limits misconfigured.
  - **Mitigation**: Enforce `maximumNumberOfLocationVistors` trimming. (Evidence: lib/routes/location/v1/location.js L45-L125)
- **Risk**: JSON parsing errors on large payloads.
  - **Mitigation**: Capture raw body and log context; enforce body size limit. (Evidence: server.js L16-L103)
- **Risk**: Visitor history semantics could diverge from operator expectations if recording mode is not clearly configured.
  - **Mitigation**: Document the `recordDetailedVisitorHistory` toggle and its default OFF mode. (Evidence: README.md L239-L259; .specstory/history/2026-01-22_13-59Z-visitor-history-recording-configuration.md L7-L16)

## 9. Traceability Appendix
- **FR-001** → tests/integration/newFields.tests.js; lib/routes/location/v1/location.js; lib/models/RequestConfig.js. (Evidence: tests/integration/newFields.tests.js L9-L73; lib/routes/location/v1/location.js L290-L343; lib/models/RequestConfig.js L6-L34)
- **FR-002** → tests/integration/backwardCompatibility.tests.js; lib/routes/location/v1/location.js. (Evidence: tests/integration/backwardCompatibility.tests.js L39-L65; lib/routes/location/v1/location.js L354-L398)
- **FR-003** → tests/integration/getLocationHistoryConfig.tests.js; tests/integration/getLocationHistoryLarge.tests.js; lib/models/RequestLocationHistory.js. (Evidence: lib/models/RequestLocationHistory.js L136-L171)
- **FR-004** → tests/unit/responseLocationGeoJSON.tests.js; tests/integration/newFields.tests.js; lib/models/ResponseLocationGeoJSON.js. (Evidence: tests/unit/responseLocationGeoJSON.tests.js L7-L44; lib/models/ResponseLocationGeoJSON.js L9-L30)
- **FR-005** → tests/integration/unknownDevice.tests.js; tests/integration/visitorHistoryFiltering.tests.js; lib/routes/location/v1/location.js. (Evidence: tests/integration/unknownDevice.tests.js L166-L203; tests/integration/visitorHistoryFiltering.tests.js L44-L99; lib/routes/location/v1/location.js L518-L535)
- **FR-006** → tests/integration/deleteLocation.tests.js; docs/DELETE_LOCATION_API.md; lib/routes/location/v1/location.js. (Evidence: tests/integration/deleteLocation.tests.js L7-L138; docs/DELETE_LOCATION_API.md L101-L129; lib/routes/location/v1/location.js L551-L595)
- **FR-007** → tests/integration/recordDetailedVisitorHistory.tests.js; config/default.js; lib/routes/location/v1/location.js. (Evidence: tests/integration/recordDetailedVisitorHistory.tests.js L51-L240; config/default.js L34-L41; lib/routes/location/v1/location.js L37-L176)
- **FR-008** → tests/integration/backwardCompatibility.tests.js; lib/routes/location/index.js; lib/routes/location/v1/inputParser.js. (Evidence: tests/integration/backwardCompatibility.tests.js L12-L138; lib/routes/location/index.js L22-L30; lib/routes/location/v1/inputParser.js L51-L56)
- **FR-009** → tests/integration/cors.tests.js; lib/middlewares/index.js. (Evidence: tests/integration/cors.tests.js L9-L182; lib/middlewares/index.js L8-L29)
- **FR-010** → tests/integration/httpRateLimiter.tests.js; tests/unit/redisRateLimiter.tests.js; lib/middlewares/rateLimiter.js; lib/db.js. (Evidence: tests/integration/httpRateLimiter.tests.js L50-L110; tests/unit/redisRateLimiter.tests.js L21-L106; lib/middlewares/rateLimiter.js L9-L59; lib/db.js L15-L193)

---

**Reconstruction Assumptions**
- `specification.md` and `docs/PROJECT_MAP_AND_EVIDENCE_INDEX.md` are referenced by instructions but are not present in the repository; requirements are derived from README, tests, source, and .specstory history. (Evidence: README.md L1-L433; docs/INTENT_AND_PROBLEM_RECONSTRUCTION.md L90-L94)
