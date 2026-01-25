# INTENT & PROBLEM RECONSTRUCTION

## 1. One-Sentence Purpose (Final Form)
Provide a self-hostable Miataru server that lets clients store and retrieve device locations (current, history, GeoJSON) while keeping data ownership and operational control in the hands of the user. (Evidence: README.md L9-L43, L64-L88; lib/routes/location/index.js L4-L53)

## 2. Problem Statements
- **Primary problem**: Users want to track and share location data without relinquishing control to third-party providers, so the server must be self-hostable with a simple API and configurable data retention. (Evidence: README.md L9-L21, L45-L63; config/default.js L1-L67)
- **Secondary problems**:
  - Provide both current location and historical location retrieval via standardized endpoints. (Evidence: README.md L27-L43; lib/routes/location/index.js L9-L30; lib/routes/location/v1/location.js L179-L276, L290-L398)
  - Support visitor history tracking of who accessed a device’s location, with configurable recording behavior and safeguards. (Evidence: README.md L202-L295; config/default.js L34-L41; lib/routes/location/v1/location.js L30-L177, L224-L236, L366-L379; tests/integration/recordDetailedVisitorHistory.tests.js L51-L204; tests/integration/visitorHistoryFiltering.tests.js L44-L209)
  - Preserve backward compatibility with legacy clients and endpoints. (Evidence: README.md L25-L43, L408-L433; lib/routes/location/index.js L9-L30; tests/integration/backwardCompatibility.tests.js L7-L138)
  - Provide data deletion and lifecycle management for devices. (Evidence: README.md L90-L124; docs/DELETE_LOCATION_API.md L1-L129; lib/routes/location/v1/location.js L544-L595; tests/integration/deleteLocation.tests.js L7-L138)
  - Protect service stability under load via HTTP and Redis rate limiting. (Evidence: README.md L159-L200; config/default.js L51-L66; lib/middlewares/rateLimiter.js L9-L59; lib/db.js L15-L193; tests/integration/httpRateLimiter.tests.js L10-L110; tests/unit/redisRateLimiter.tests.js L9-L123)
- **Explicit non-goals**:
  - No built-in authentication or device ownership validation is provided. (Evidence: docs/DELETE_LOCATION_API.md L155-L160)
  - Not designed as a permanent, disk-backed archival store by default; the default posture emphasizes in-memory, time-bounded storage. (Evidence: README.md L19-L20; lib/routes/location/v1/location.js L320-L335; config/default.js L16-L25)

## 3. Target Users & Stakeholders
- **Self-hosting operators/developers** who want full control of location data and the ability to configure Redis, retention, and CORS settings. (Evidence: README.md L13-L21, L56-L63, L316-L338; config/default.js L13-L49)
- **Client application developers** integrating Miataru APIs (UpdateLocation, GetLocation, GetLocationHistory, GeoJSON, DeleteLocation). (Evidence: README.md L27-L88, L90-L124; lib/routes/location/index.js L9-L30)
- **End users** whose device location data is stored and retrieved, including those concerned about privacy and data control. (Evidence: README.md L9-L21)
- **Operations and QA** who rely on test coverage and configurable rate limits to validate behavior under load. (Evidence: README.md L434-L480; tests/integration/httpRateLimiter.tests.js L10-L110)

## 4. Operating Context & Assumptions
- **Runtime/deployment assumptions**:
  - Node.js server with Express and body parsing; server listens on configured port and IP. (Evidence: server.js L4-L36; config/default.js L7-L12)
  - Redis or FakeRedis is used as the backing datastore; default configuration uses FakeRedis for local/dev. (Evidence: config/default.js L13-L25; lib/db.js L1-L30)
  - Configuration is layered (default, environment, user, external), enabling production overrides. (Evidence: README.md L316-L338; lib/utils/configurationLoader.js L16-L65)
- **Data assumptions**:
  - Location updates must include device, timestamp, and coordinates plus accuracy; optional fields default to -1 and are omitted from responses when unset. (Evidence: README.md L340-L371; lib/models/RequestLocation.js L6-L70; tests/unit/requestLocationIntegration.tests.js L9-L201)
  - Location history requests require a device and a positive amount; invalid values are rejected. (Evidence: lib/models/RequestLocationHistory.js L136-L171)
  - Visitor history requests require device and amount. (Evidence: lib/models/RequestVisitorHistory.js L3-L20)
- **Human workflow assumptions**:
  - Operators configure via files in ./config or external config path; clients interact using HTTP POSTs or cURL. (Evidence: README.md L45-L88, L316-L338)
  - Documentation and tests are primary sources for integration behavior. (Evidence: README.md L434-L480; docs/DELETE_LOCATION_API.md L1-L196)

## 5. Design Drivers (Ranked)
1. **Data control and privacy through self-hosting**
   - **Description**: The system is designed to keep location ownership with the user by enabling self-hosted deployment.
   - **Why it mattered**: The stated motivation is to avoid third-party control over location data and allow full user control. (Evidence: README.md L9-L21)
   - **Evidence pointers**: README.md L9-L21; config/default.js L13-L25.

2. **Backward compatibility with legacy clients and endpoints**
   - **Description**: Maintain legacy endpoints and accept older request formats.
   - **Why it mattered**: Supports existing client ecosystems and minimizes migration friction. (Evidence: README.md L25-L43, L408-L433)
   - **Evidence pointers**: lib/routes/location/index.js L9-L30; tests/integration/backwardCompatibility.tests.js L7-L138.

3. **Operational resilience via rate limiting and error handling**
   - **Description**: Protect HTTP and Redis operations using concurrency limiting, and log/handle parsing errors with context.
   - **Why it mattered**: Prevents overload and aids diagnosis for malformed requests. (Evidence: README.md L159-L200; server.js L40-L103)
   - **Evidence pointers**: lib/middlewares/rateLimiter.js L9-L59; lib/db.js L15-L193; tests/integration/httpRateLimiter.tests.js L10-L110; tests/unit/redisRateLimiter.tests.js L9-L123.

4. **Configurable data retention and history visibility**
   - **Description**: Allow configuration of history storage, visitor history behavior, and retention policy.
   - **Why it mattered**: Balances storage efficiency, auditability, and privacy. (Evidence: README.md L202-L295; config/default.js L31-L41)
   - **Evidence pointers**: lib/routes/location/v1/location.js L30-L177, L224-L236, L297-L335; tests/integration/recordDetailedVisitorHistory.tests.js L51-L204.

5. **Interoperable location data formats and enriched fields**
   - **Description**: Support standard JSON response lists and GeoJSON responses, plus optional speed/battery/altitude fields.
   - **Why it mattered**: Enables integration with mapping tools and enhanced telemetry without breaking old clients. (Evidence: README.md L340-L433)
   - **Evidence pointers**: lib/models/ResponseLocationGeoJSON.js L9-L30; lib/models/RequestLocation.js L6-L70; tests/integration/newFields.tests.js L7-L242.

6. **Full data lifecycle management, including deletion**
   - **Description**: Provide a DeleteLocation endpoint to purge current, history, and visitor data.
   - **Why it mattered**: Allows users to control retention and comply with deletion requests. (Evidence: README.md L90-L124; docs/DELETE_LOCATION_API.md L1-L129)
   - **Evidence pointers**: lib/routes/location/v1/location.js L544-L595; tests/integration/deleteLocation.tests.js L7-L138.

## 6. Evolution Narrative
1. **Initial framing: self-hosted location control** — The project centers on user control of location data and self-hostability. (Evidence: README.md L9-L21)
2. **API surface formalized with versioned + legacy endpoints** — v1 and legacy paths are both supported. (Evidence: README.md L25-L43; lib/routes/location/index.js L9-L30)
3. **Location history and retention logic implemented** — History stored with Redis lists; last-known location stored separately; TTL applied when history disabled. (Evidence: lib/routes/location/v1/location.js L290-L335)
4. **Visitor history tracking added** — Visitor lists record access to devices and are capped by configuration. (Evidence: lib/routes/location/v1/location.js L30-L177, L224-L236; config/default.js L34-L41)
5. **Visitor history policy pivot requested** — A configuration option was requested to toggle detailed vs. summarized visitor history. (Evidence: .specstory/history/2026-01-22_13-59Z-visitor-history-recording-configuration.md L7-L16)
6. **Self-request exclusion requirement introduced** — Requests where RequestMiataruDeviceID equals the target device must not be recorded. (Evidence: .specstory/history/2026-01-19_19-52Z-visitor-history-self-request-exclusion.md L7-L13; lib/models/RequestConfigGetLocation.js L19-L36)
7. **Visitor history filtering implemented in response** — Visitor history responses filter out self-requests. (Evidence: lib/routes/location/v1/location.js L518-L535; tests/integration/visitorHistoryFiltering.tests.js L44-L209)
8. **Enhanced request parsing robustness after JSON parsing failures** — Logging and error handling were expanded in response to JSON parse failures on GetLocationHistory. (Evidence: .specstory/history/2026-01-19_20-26Z-miataru-getlocationhistory-json-error.md L7-L21; server.js L40-L103)
9. **DeleteLocation endpoint formalized** — API docs and tests specify deletion of current, history, and visitor data. (Evidence: README.md L90-L124; docs/DELETE_LOCATION_API.md L1-L129; tests/integration/deleteLocation.tests.js L7-L138)
10. **CORS middleware added and documented** — Configurable CORS handling for web clients and preflight requests. (Evidence: README.md L126-L158; lib/middlewares/index.js L1-L29; tests/integration/cors.tests.js L7-L182)
11. **Rate limiting introduced for HTTP and Redis operations** — Queueing and rejection behavior defined and tested. (Evidence: README.md L159-L200; lib/middlewares/rateLimiter.js L9-L59; lib/db.js L15-L193; tests/integration/httpRateLimiter.tests.js L10-L110)
12. **Docker build modernization** — Node version alignment for Docker build to reduce engine warnings. (Evidence: .specstory/history/2026-01-19_20-01Z-npm-engine-warnings-in-docker-build.md L9-L77)
13. **README documentation expanded for configuration** — Explicit documentation of visitor history config options added. (Evidence: .specstory/history/2026-01-23_09-41Z-readme-configuration-documentation.md L7-L119; README.md L202-L295)

## 7. Hidden or Implicit Requirements
- **Visitor history should not be recorded for empty or self-referential request IDs** to avoid polluting history with unknown or self requests. (Evidence: config/default.js L37-L38; lib/models/RequestConfigGetLocation.js L21-L36; tests/integration/visitorHistoryFiltering.tests.js L44-L209)
- **Location history list order is newest-first and capped**; the API expects clients to interpret list ordering accordingly. (Evidence: lib/routes/location/v1/location.js L303-L311; tests/integration/newFields.tests.js L218-L239)
- **Error logging should avoid over-reporting non-errors** (404/405 should not trigger error-level logging). (Evidence: server.js L65-L73; tests/unit/serverErrorHandling.tests.js L15-L52)
- **Redis key naming and namespacing must remain stable** to allow operational tooling and deletion. (Evidence: lib/utils/keyBuilder.js L1-L9; docs/DELETE_LOCATION_API.md L101-L115)
- **Backward compatibility requires tolerant parsing (e.g., single-object update requests)** to avoid breaking older clients. (Evidence: lib/routes/location/v1/inputParser.js L48-L56; tests/integration/backwardCompatibility.tests.js L12-L88)

## 8. Open Questions & Reconstruction Assumptions
- **Missing specification.md**: The request required scanning `specification.md`, but no such file exists in the repository; assumptions here are reconstructed from README, tests, and code. (Evidence: README.md L1-L433; lib/routes/location/v1/location.js L179-L595)
- **Missing docs/PROJECT_MAP_AND_EVIDENCE_INDEX.md**: The required evidence index document does not exist; this reconstruction uses source, tests, and .specstory history instead. (Evidence: repository tree; README.md L434-L480)
- **Authentication and authorization scope**: The DeleteLocation doc states no authentication and no device ownership validation, but it is unclear whether other endpoints are intended to remain unauthenticated long-term. (Evidence: docs/DELETE_LOCATION_API.md L155-L160)
- **Persistence model**: README says “everything is in-memory only,” yet Redis can be configured as a persistent store; actual persistence expectations in production remain ambiguous. (Evidence: README.md L19-L20; config/default.js L13-L25; lib/db.js L1-L30)
