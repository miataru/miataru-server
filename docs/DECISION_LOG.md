# DECISION LOG (ADR-STYLE)

## 1. Decision Summary Index
- **ADR-001**: Self-hosted Miataru server prioritizing user control and privacy — **Accepted**. Evidence: README.md; docs/INTENT_AND_PROBLEM_RECONSTRUCTION.md.
- **ADR-002**: Support both v1 and legacy endpoints for backward compatibility — **Accepted**. Evidence: README.md; lib/routes/location/index.js; tests/integration/backwardCompatibility.tests.js.
- **ADR-003**: Store last location and optional history in Redis using namespaced keys and capped lists — **Accepted**. Evidence: lib/routes/location/v1/location.js; config/default.js; lib/utils/keyBuilder.js; tests/integration/api.tests.js.
- **ADR-004**: Provide configurable retention: history on/off with TTL for last-known location — **Accepted**. Evidence: lib/routes/location/v1/location.js; lib/models/RequestConfig.js; tests/integration/updateLocation.tests.js.
- **ADR-005**: Introduce visitor history with self-request exclusion — **Accepted**. Evidence: .specstory/history/2026-01-19_19-52Z-visitor-history-self-request-exclusion.md; lib/models/RequestConfigGetLocation.js; tests/integration/visitorHistoryFiltering.tests.js.
- **ADR-006**: Add recordDetailedVisitorHistory toggle (OFF default, ON preserves prior behavior) — **Accepted**. Evidence: .specstory/history/2026-01-22_13-59Z-visitor-history-recording-configuration.md; config/default.js; tests/integration/recordDetailedVisitorHistory.tests.js.
- **ADR-007**: Add DeleteLocation endpoint to remove last/history/visitor data — **Accepted**. Evidence: README.md; docs/DELETE_LOCATION_API.md; tests/integration/deleteLocation.tests.js.
- **ADR-008**: Offer GeoJSON response endpoint, returning empty object when coordinates missing — **Accepted**. Evidence: README.md; lib/models/ResponseLocationGeoJSON.js; tests/unit/responseLocationGeoJSON.tests.js.
- **ADR-009**: Enforce CORS by allowed origins; allow no-origin requests — **Accepted**. Evidence: README.md; lib/middlewares/index.js; tests/integration/cors.tests.js.
- **ADR-010**: Add HTTP and Redis concurrency rate limiting with queueing — **Accepted**. Evidence: README.md; lib/middlewares/rateLimiter.js; lib/db.js; tests/integration/httpRateLimiter.tests.js; tests/unit/redisRateLimiter.tests.js.
- **ADR-011**: Expand JSON parse error logging with raw body capture — **Accepted**. Evidence: .specstory/history/2026-01-19_20-26Z-miataru-getlocationhistory-json-error.md; server.js; tests/integration/getLocationHistoryParsingError.tests.js.
- **ADR-012**: Modernize Docker build base to Node 18 — **Accepted**. Evidence: .specstory/history/2026-01-19_20-01Z-npm-engine-warnings-in-docker-build.md; Dockerfile; package.json.
- **ADR-013**: Reduce dependency warnings via upgraded Stylus and npm overrides — **Accepted**. Evidence: .specstory/history/2026-01-19_20-04Z-npm-warnings-in-docker-build.md; package.json.
- **ADR-014**: Keep Redis compatibility by bridging legacy callbacks and modern v4 API — **Accepted**. Evidence: lib/db.js; tests/unit/db.redisCompatibility.tests.js.

## 2. Full ADR Entries

### ADR-001: Self-hosted Miataru server prioritizing user control and privacy
- **Context**: The project is positioned as a self-hostable alternative to third-party location services, emphasizing control of location data. (Evidence: README.md; docs/INTENT_AND_PROBLEM_RECONSTRUCTION.md)
- **Decision**: Implement a self-hostable server with a simple HTTP API for location storage and retrieval. (Evidence: README.md; docs/PRD.md)
- **Alternatives considered**: Fully managed hosted service only.
- **Why alternatives were rejected**: Conflicts with stated need for user control and self-hosting. (Evidence: README.md; docs/INTENT_AND_PROBLEM_RECONSTRUCTION.md)
- **Consequences**:
  - **Positive**: Operators control data retention and deployment. (Evidence: README.md)
  - **Negative**: No centralized auth or hosted safeguards by default. (Evidence: docs/PRD.md)
- **Follow-ups**: Provide configuration documentation and deployment guidance. (Evidence: README.md)
- **Evidence pointers**: README.md; docs/INTENT_AND_PROBLEM_RECONSTRUCTION.md; docs/PRD.md.

### ADR-002: Support both v1 and legacy endpoints for backward compatibility
- **Context**: Existing clients rely on legacy paths; new versioned endpoints are recommended. (Evidence: README.md; tests/integration/backwardCompatibility.tests.js)
- **Decision**: Expose both `/v1/*` and legacy endpoints with identical behavior. (Evidence: lib/routes/location/index.js)
- **Alternatives considered**: Deprecate legacy endpoints; only support v1.
- **Why alternatives were rejected**: Would break legacy clients and violate compatibility goals. (Evidence: README.md; tests/integration/backwardCompatibility.tests.js)
- **Consequences**:
  - **Positive**: Legacy clients continue to work. (Evidence: tests/integration/backwardCompatibility.tests.js)
  - **Negative**: Larger surface area to maintain. (Evidence: lib/routes/location/index.js)
- **Follow-ups**: Keep tests validating legacy endpoints. (Evidence: tests/integration/backwardCompatibility.tests.js)
- **Evidence pointers**: README.md; lib/routes/location/index.js; tests/integration/backwardCompatibility.tests.js.

### ADR-003: Store last location and optional history in Redis using namespaced keys and capped lists
- **Context**: The service needs to store the last location and optionally a history while avoiding unbounded growth. (Evidence: README.md; docs/PRD.md)
- **Decision**: Use Redis keys `miad:{device}:last`, `miad:{device}:hist`, and `miad:{device}:visit` with configurable namespace and list trimming. (Evidence: lib/routes/location/v1/location.js; lib/utils/keyBuilder.js; config/default.js)
- **Alternatives considered**: Relational database or filesystem storage; unbounded lists.
- **Why alternatives were rejected**: Added operational complexity and unbounded growth risk. (Evidence: config/default.js; docs/TECHNICAL_SPECIFICATION.md)
- **Consequences**:
  - **Positive**: Simple key/value access and bounded memory usage. (Evidence: lib/routes/location/v1/location.js)
  - **Negative**: Redis dependency required for production persistence. (Evidence: lib/db.js)
- **Follow-ups**: Document key naming and deletion. (Evidence: docs/DELETE_LOCATION_API.md)
- **Evidence pointers**: lib/routes/location/v1/location.js; config/default.js; lib/utils/keyBuilder.js; docs/DELETE_LOCATION_API.md.

### ADR-004: Configurable retention with TTL for last-known location when history is disabled
- **Context**: Default behavior emphasizes short-lived storage; operators can enable history. (Evidence: README.md; docs/PRD.md)
- **Decision**: When history disabled, delete history list and store only last location with TTL derived from `LocationDataRetentionTime`. (Evidence: lib/routes/location/v1/location.js; lib/models/RequestConfig.js)
- **Alternatives considered**: Always store history; always store indefinitely.
- **Why alternatives were rejected**: Conflicts with storage-minimization default. (Evidence: README.md)
- **Consequences**:
  - **Positive**: Bounded retention by default. (Evidence: lib/routes/location/v1/location.js)
  - **Negative**: Historical queries return empty when history disabled. (Evidence: tests/integration/api.tests.js)
- **Follow-ups**: Ensure tests cover history on/off behavior. (Evidence: tests/integration/api.tests.js)
- **Evidence pointers**: lib/routes/location/v1/location.js; lib/models/RequestConfig.js; tests/integration/api.tests.js.

### ADR-005: Visitor history with self-request exclusion
- **Context**: Requests include `RequestMiataruDeviceID` to track who accessed a target device; self-access should not be recorded. (Evidence: .specstory/history/2026-01-19_19-52Z-visitor-history-self-request-exclusion.md)
- **Decision**: Suppress visitor history entries when requester device ID equals target device ID. (Evidence: lib/models/RequestConfigGetLocation.js; tests/integration/visitorHistoryFiltering.tests.js)
- **Alternatives considered**: Record all accesses regardless of requester; filter only at read time.
- **Why alternatives were rejected**: Pollutes visitor history with self-requests and violates stated requirement. (Evidence: .specstory/history/2026-01-19_19-52Z-visitor-history-self-request-exclusion.md)
- **Consequences**:
  - **Positive**: Visitor history reflects external accesses only. (Evidence: tests/integration/visitorHistoryFiltering.tests.js)
  - **Negative**: Self-access auditing not available. (Evidence: lib/models/RequestConfigGetLocation.js)
- **Follow-ups**: Keep filtering in GetVisitorHistory responses. (Evidence: lib/routes/location/v1/location.js; tests/integration/visitorHistoryFiltering.tests.js)
- **Evidence pointers**: .specstory/history/2026-01-19_19-52Z-visitor-history-self-request-exclusion.md; lib/models/RequestConfigGetLocation.js; tests/integration/visitorHistoryFiltering.tests.js.

### ADR-006: recordDetailedVisitorHistory toggle (OFF default)
- **Context**: Default visitor logging recorded every access; operators requested a mode to keep only the latest per visitor device. (Evidence: .specstory/history/2026-01-22_13-59Z-visitor-history-recording-configuration.md)
- **Decision**: Add `recordDetailedVisitorHistory` config option, default OFF; ON preserves existing behavior. (Evidence: config/default.js; lib/routes/location/v1/location.js; tests/integration/recordDetailedVisitorHistory.tests.js)
- **Alternatives considered**: Always detailed logging; always deduplicate.
- **Why alternatives were rejected**: Conflicting operator needs (audit trail vs. storage efficiency). (Evidence: .specstory/history/2026-01-22_13-59Z-visitor-history-recording-configuration.md)
- **Consequences**:
  - **Positive**: Configurable balance between storage and auditability. (Evidence: README.md; tests/integration/recordDetailedVisitorHistory.tests.js)
  - **Negative**: More complex visitor history logic. (Evidence: lib/routes/location/v1/location.js)
- **Follow-ups**: Document configuration and default. (Evidence: README.md)
- **Evidence pointers**: .specstory/history/2026-01-22_13-59Z-visitor-history-recording-configuration.md; config/default.js; tests/integration/recordDetailedVisitorHistory.tests.js.

### ADR-007: DeleteLocation endpoint for full data removal
- **Context**: Operators need a way to remove all data for a device. (Evidence: README.md; docs/DELETE_LOCATION_API.md)
- **Decision**: Provide `/v1/DeleteLocation` and legacy `/DeleteLocation` to delete last, history, and visitor keys. (Evidence: lib/routes/location/v1/location.js; docs/DELETE_LOCATION_API.md)
- **Alternatives considered**: Require manual Redis operations; only delete last location.
- **Why alternatives were rejected**: Incomplete deletion and higher operational burden. (Evidence: docs/DELETE_LOCATION_API.md)
- **Consequences**:
  - **Positive**: API-level deletion for all data types. (Evidence: tests/integration/deleteLocation.tests.js)
  - **Negative**: No authentication is enforced. (Evidence: docs/DELETE_LOCATION_API.md)
- **Follow-ups**: Document deletion semantics and counts. (Evidence: docs/DELETE_LOCATION_API.md)
- **Evidence pointers**: docs/DELETE_LOCATION_API.md; lib/routes/location/v1/location.js; tests/integration/deleteLocation.tests.js.

### ADR-008: GeoJSON endpoint for location rendering
- **Context**: Clients need a GeoJSON representation for mapping tools. (Evidence: README.md; docs/PRD.md)
- **Decision**: Provide GeoJSON response with a single Feature; return `{}` when coordinates missing. (Evidence: lib/models/ResponseLocationGeoJSON.js; tests/unit/responseLocationGeoJSON.tests.js)
- **Alternatives considered**: Always return a list of features; error when missing coordinates.
- **Why alternatives were rejected**: Simpler integration and backward compatibility with existing clients. (Evidence: tests/unit/responseLocationGeoJSON.tests.js)
- **Consequences**:
  - **Positive**: Easy mapping integration. (Evidence: README.md)
  - **Negative**: Only first location returned even if multiple requested. (Evidence: lib/models/ResponseLocationGeoJSON.js)
- **Follow-ups**: Keep tests documenting first-location behavior. (Evidence: tests/unit/responseLocationGeoJSON.tests.js)
- **Evidence pointers**: lib/models/ResponseLocationGeoJSON.js; tests/unit/responseLocationGeoJSON.tests.js; README.md.

### ADR-009: Configurable CORS with allowed origins
- **Context**: Web clients require CORS; operators need control over allowed origins. (Evidence: README.md; tests/integration/cors.tests.js)
- **Decision**: Implement CORS middleware with allowed origins list and permit no-origin requests. (Evidence: lib/middlewares/index.js)
- **Alternatives considered**: Allow all origins; reject no-origin requests.
- **Why alternatives were rejected**: Security and compatibility needs. (Evidence: README.md; tests/integration/cors.tests.js)
- **Consequences**:
  - **Positive**: Controlled access for browsers. (Evidence: tests/integration/cors.tests.js)
  - **Negative**: Misconfiguration can block web clients. (Evidence: lib/middlewares/index.js)
- **Follow-ups**: Document CORS defaults and custom configuration. (Evidence: README.md)
- **Evidence pointers**: lib/middlewares/index.js; README.md; tests/integration/cors.tests.js.

### ADR-010: HTTP and Redis concurrency rate limiting
- **Context**: Service stability under load requires controlling concurrent work. (Evidence: README.md; docs/PRD.md)
- **Decision**: Apply HTTP per-IP concurrency limits and Redis global concurrency limits with queueing and timeouts. (Evidence: lib/middlewares/rateLimiter.js; lib/db.js; lib/utils/concurrencyLimiter.js)
- **Alternatives considered**: No limits; fixed global HTTP limit only.
- **Why alternatives were rejected**: Risk of overload and uneven client impact. (Evidence: README.md)
- **Consequences**:
  - **Positive**: Predictable backpressure and error codes. (Evidence: tests/integration/httpRateLimiter.tests.js; tests/unit/redisRateLimiter.tests.js)
  - **Negative**: Additional latency under load. (Evidence: lib/middlewares/rateLimiter.js)
- **Follow-ups**: Keep limits configurable and testable. (Evidence: config/default.js; tests/integration/httpRateLimiter.tests.js)
- **Evidence pointers**: lib/middlewares/rateLimiter.js; lib/db.js; tests/integration/httpRateLimiter.tests.js; tests/unit/redisRateLimiter.tests.js.

### ADR-011: Expanded JSON parse error logging with raw body capture
- **Context**: Production logs showed JSON parse errors for GetLocationHistory with large `Amount` values. (Evidence: .specstory/history/2026-01-19_20-26Z-miataru-getlocationhistory-json-error.md)
- **Decision**: Capture raw bodies and log diagnostic details on JSON parsing errors. (Evidence: server.js; tests/integration/getLocationHistoryParsingError.tests.js)
- **Alternatives considered**: Rely on default body-parser errors without raw body logging.
- **Why alternatives were rejected**: Insufficient diagnostic data. (Evidence: .specstory/history/2026-01-19_20-26Z-miataru-getlocationhistory-json-error.md)
- **Consequences**:
  - **Positive**: Faster diagnosis of malformed or truncated payloads. (Evidence: server.js)
  - **Negative**: Potentially logs portions of request bodies. (Evidence: server.js)
- **Follow-ups**: Ensure body size limits and redaction policies if needed. (Evidence: server.js)
- **Evidence pointers**: .specstory/history/2026-01-19_20-26Z-miataru-getlocationhistory-json-error.md; server.js; tests/integration/getLocationHistoryParsingError.tests.js.

### ADR-012: Docker base image moved to Node 18
- **Context**: Docker builds showed engine warnings due to old Node version. (Evidence: .specstory/history/2026-01-19_20-01Z-npm-engine-warnings-in-docker-build.md)
- **Decision**: Use `node:18-alpine` base image to satisfy engine requirements. (Evidence: Dockerfile; package.json)
- **Alternatives considered**: Keep `node:alpine` (latest but unpinned); use lower Node version.
- **Why alternatives were rejected**: Engine incompatibilities and warnings. (Evidence: .specstory/history/2026-01-19_20-01Z-npm-engine-warnings-in-docker-build.md)
- **Consequences**:
  - **Positive**: Aligns with `engines.node` >= 18. (Evidence: package.json)
  - **Negative**: Requires Node 18 runtime in Docker. (Evidence: Dockerfile)
- **Follow-ups**: Keep engine requirements documented. (Evidence: package.json)
- **Evidence pointers**: Dockerfile; package.json; .specstory/history/2026-01-19_20-01Z-npm-engine-warnings-in-docker-build.md.

### ADR-013: Reduce npm warning noise by upgrading Stylus and pinning glob
- **Context**: Docker build warnings from deprecated `glob` and `inflight` dependencies. (Evidence: .specstory/history/2026-01-19_20-04Z-npm-warnings-in-docker-build.md)
- **Decision**: Upgrade `stylus` and apply `glob` override to use v10+ and remove `inflight`. (Evidence: package.json)
- **Alternatives considered**: Accept warnings; replace stylus entirely.
- **Why alternatives were rejected**: Warnings signaled deprecated dependencies; replacement not necessary. (Evidence: .specstory/history/2026-01-19_20-04Z-npm-warnings-in-docker-build.md)
- **Consequences**:
  - **Positive**: Cleaner builds and fewer deprecated dependencies. (Evidence: package.json)
  - **Negative**: Potential for compatibility shifts in transitive deps. (Evidence: package.json)
- **Follow-ups**: Monitor dependency updates for compatibility. (Evidence: package.json)
- **Evidence pointers**: .specstory/history/2026-01-19_20-04Z-npm-warnings-in-docker-build.md; package.json.

### ADR-014: Redis compatibility layer with legacy callbacks and modern API
- **Context**: Redis v4 uses promise-based APIs; legacy code expects callbacks. (Evidence: lib/db.js; tests/unit/db.redisCompatibility.tests.js)
- **Decision**: Create Redis client in `legacyMode` and wrap modern methods to expose callback-style functions while keeping promise support. (Evidence: lib/db.js)
- **Alternatives considered**: Rewrite all Redis calls to promises; freeze on old Redis client.
- **Why alternatives were rejected**: High refactor cost; maintain compatibility. (Evidence: tests/unit/db.redisCompatibility.tests.js)
- **Consequences**:
  - **Positive**: Backward-compatible Redis access across environments. (Evidence: lib/db.js)
  - **Negative**: Additional wrapper complexity. (Evidence: lib/db.js)
- **Follow-ups**: Keep unit tests for legacy wrapper behavior. (Evidence: tests/unit/db.redisCompatibility.tests.js)
- **Evidence pointers**: lib/db.js; tests/unit/db.redisCompatibility.tests.js.

## 3. Reversal & Pivot Timeline
- **Visitor history recording behavior**: Always-detailed logging → configurable detailed/summary modes. Impact: storage efficiency vs. audit trail tradeoff, additional logic and tests. (Evidence: .specstory/history/2026-01-22_13-59Z-visitor-history-recording-configuration.md; config/default.js; tests/integration/recordDetailedVisitorHistory.tests.js)
- **Visitor history inclusion rules**: Record all visitors → exclude self-requests and optionally empty visitor IDs. Impact: cleaner visitor history and aligned with stated requirements. (Evidence: .specstory/history/2026-01-19_19-52Z-visitor-history-self-request-exclusion.md; lib/models/RequestConfigGetLocation.js; tests/integration/visitorHistoryFiltering.tests.js)
- **Error observability**: Minimal body-parser diagnostics → raw body capture and expanded JSON parse logging. Impact: improved debugging for payload errors. (Evidence: .specstory/history/2026-01-19_20-26Z-miataru-getlocationhistory-json-error.md; server.js)
- **Docker runtime**: Unpinned `node:alpine` → pinned `node:18-alpine`. Impact: reduced engine warnings and aligned runtime requirements. (Evidence: .specstory/history/2026-01-19_20-01Z-npm-engine-warnings-in-docker-build.md; Dockerfile; package.json)
- **Dependency hygiene**: Deprecated `glob/inflight` warnings → upgrades and overrides to newer `glob`. Impact: cleaner npm output; potential transitive changes. (Evidence: .specstory/history/2026-01-19_20-04Z-npm-warnings-in-docker-build.md; package.json)

---

**Reconstruction Assumptions**
- `specification.md` is referenced in the instructions but not present in the repository; decisions are reconstructed from README, tests, source, `.specstory` notes, and the existing docs. (Evidence: README.md; docs/INTENT_AND_PROBLEM_RECONSTRUCTION.md; docs/PRD.md; docs/TECHNICAL_SPECIFICATION.md)
