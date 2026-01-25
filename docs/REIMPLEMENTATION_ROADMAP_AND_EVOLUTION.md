# REIMPLEMENTATION ROADMAP & EVOLUTION GUIDE

## 1. Reimplementation Strategy

### Behavioral compatibility contract
- Treat the PRD as the contract: all functional and non-functional requirements in `docs/PRD.md` must be satisfied before declaring parity. (Evidence: docs/PRD.md)
- Preserve endpoint shapes, payload structures, response formats, and error semantics described in the technical specification. (Evidence: docs/TECHNICAL_SPECIFICATION.md)
- Maintain the design intent and decision rationale captured in the decision log when evaluating deviations. (Evidence: docs/DECISION_LOG.md)

### Guiding principles
- **Compatibility-first**: Legacy and v1 endpoints remain equivalent until a deliberate deprecation plan is approved. (Evidence: docs/PRD.md; docs/DECISION_LOG.md)
- **Config-driven behavior**: Storage, retention, visitor history modes, rate limits, and CORS must be configurable as documented. (Evidence: docs/PRD.md; docs/TECHNICAL_SPECIFICATION.md)
- **Observability and safety**: Preserve error logging and operational guardrails (rate limiting, validation) to avoid regressions. (Evidence: docs/TECHNICAL_SPECIFICATION.md; docs/DECISION_LOG.md)
- **Documented divergence**: Any intentional behavior change must be captured as a new ADR and reflected in requirements updates. (Evidence: docs/DECISION_LOG.md)

## 2. Step-by-Step Build Plan

### Phase 0: Foundation and scaffolding
- **Goal**: Establish baseline repository structure, configuration loading, and basic HTTP app skeleton.
- **Components to implement**:
  - Configuration loader with layered overrides.
  - Logger and minimal Express app with error handler.
- **Dependencies**: None.
- **Validation checkpoints**:
  - Configuration layering behavior matches specification.
  - Error handler returns structured JSON errors.
- **Exit criteria**:
  - App boots with default config and exposes `/` and `/robots.txt` with expected responses.
- **Common failure modes**:
  - Missing or mis-merged config values causing runtime errors.
  - Error handler logging at incorrect severity.
- **Evidence**: docs/TECHNICAL_SPECIFICATION.md; docs/PRD.md.

### Phase 1: Core request parsing and models
- **Goal**: Implement request parsing and model validation for all API endpoints.
- **Components to implement**:
  - Request models: RequestLocation, RequestDevice, RequestConfig, RequestConfigGetLocation, RequestLocationHistory, RequestVisitorHistory.
  - Input parser that maps routes to request objects.
- **Dependencies**: Phase 0 configuration and error handling.
- **Validation checkpoints**:
  - Invalid payloads produce 400 errors with expected messages.
  - Backward compatibility behaviors (single-object updates, tolerant history parsing) are preserved.
- **Exit criteria**:
  - Unit tests for request model validation recreated and passing.
- **Common failure modes**:
  - Rejecting legacy payloads.
  - Failing to normalize history requests with reordered fields.
- **Evidence**: docs/TECHNICAL_SPECIFICATION.md; docs/PRD.md.

### Phase 2: Data storage and Redis integration
- **Goal**: Implement Redis/fakeredis storage, namespaced keys, and history/visitor data structures.
- **Components to implement**:
  - Storage adapter with Redis legacy compatibility and concurrency limiter integration.
  - Key builder with configurable namespace.
- **Dependencies**: Phases 0–1.
- **Validation checkpoints**:
  - Redis operations work with callback and promise styles.
  - Concurrency limiter errors map to expected codes.
- **Exit criteria**:
  - Unit tests for Redis compatibility and rate limiting recreated and passing.
- **Common failure modes**:
  - Incorrect key namespaces leading to missing data.
  - Unbounded queues or deadlocks in concurrency limiter.
- **Evidence**: docs/TECHNICAL_SPECIFICATION.md; docs/PRD.md.

### Phase 3: Core location endpoints
- **Goal**: Implement UpdateLocation, GetLocation, GetLocationHistory, and DeleteLocation behavior.
- **Components to implement**:
  - UpdateLocation storage logic (history on/off and TTL behavior).
  - GetLocation (null entries for unknown devices, visitor history recording).
  - GetLocationHistory (amount limiting, invalid entry skipping).
  - DeleteLocation (last/history/visitor deletion).
- **Dependencies**: Phases 0–2.
- **Validation checkpoints**:
  - Integration workflows for update/get/history/delete behave as documented.
  - History list order is newest-first and capped.
- **Exit criteria**:
  - Integration tests for update/get/history/delete recreated and passing.
- **Common failure modes**:
  - Missing TTL conversion when history disabled.
  - History list order reversal or incorrect list length reporting.
- **Evidence**: docs/PRD.md; docs/TECHNICAL_SPECIFICATION.md.

### Phase 4: GeoJSON and visitor history endpoints
- **Goal**: Implement GeoJSON responses and visitor history retrieval semantics.
- **Components to implement**:
  - GetLocationGeoJSON (POST and GET), returning empty objects when missing coordinates.
  - GetVisitorHistory with filtering of self-requests.
- **Dependencies**: Phases 0–3.
- **Validation checkpoints**:
  - GeoJSON response properties align with location data.
  - Visitor history excludes self-requests and respects limit.
- **Exit criteria**:
  - Unit/integration tests for GeoJSON and visitor history passing.
- **Common failure modes**:
  - Returning arrays instead of a single GeoJSON Feature.
  - Incorrect filtering leading to self-entries in visitor history.
- **Evidence**: docs/PRD.md; docs/TECHNICAL_SPECIFICATION.md.

### Phase 5: Operational middleware (CORS and rate limiting)
- **Goal**: Implement CORS controls and HTTP concurrency limiting.
- **Components to implement**:
  - CORS middleware with allowed origins and no-origin behavior.
  - HTTP rate limiter per IP with queueing and timeout messages.
- **Dependencies**: Phase 0 app and configuration.
- **Validation checkpoints**:
  - CORS preflight behavior and headers match documentation.
  - Rate limiter rejects overflow with configured status and message.
- **Exit criteria**:
  - CORS and rate limiter integration tests passing.
- **Common failure modes**:
  - Blocking no-origin requests used by mobile/curl.
  - Incorrect release of limiter slots causing deadlocks.
- **Evidence**: docs/PRD.md; docs/TECHNICAL_SPECIFICATION.md; docs/DECISION_LOG.md.

### Phase 6: Compatibility hardening and observability
- **Goal**: Preserve legacy behaviors, logging, and error diagnostics.
- **Components to implement**:
  - Backward compatibility for legacy endpoints and payloads.
  - Raw body capture and parse error logging.
- **Dependencies**: Phases 0–5.
- **Validation checkpoints**:
  - Legacy tests and JSON parsing error tests passing.
  - Error logging severity matches expectations.
- **Exit criteria**:
  - Backward compatibility and parsing error reproduction tests pass.
- **Common failure modes**:
  - Silent changes in error response formats.
  - Logging sensitive payloads without redaction policy.
- **Evidence**: docs/PRD.md; docs/TECHNICAL_SPECIFICATION.md; docs/DECISION_LOG.md.

## 3. Test Strategy
- **Which tests to recreate first**:
  - Request model unit tests (validation and compatibility) to lock input behavior early.
  - Core integration tests for UpdateLocation/GetLocation/GetLocationHistory/DeleteLocation.
  - Backward compatibility tests for legacy endpoints.
- **Gaps to fill**:
  - Explicit tests for configuration layering across env/user/external paths if missing.
  - Additional performance-oriented tests around rate limiter queue saturation and Redis throttling.
- **Regression prevention**:
  - Use PRD requirement IDs as test suite prefixes to ensure coverage mapping.
  - Add golden-response fixtures for response payloads and error semantics.
  - Keep parity checks against documented behaviors in `docs/TECHNICAL_SPECIFICATION.md`.
- **Evidence**: docs/PRD.md; docs/TECHNICAL_SPECIFICATION.md; docs/DECISION_LOG.md.

## 4. Migration / Compatibility Notes (if applicable)
- Preserve the dual API surface (`/v1/*` and legacy paths) until a deprecation ADR is added and accepted.
- Maintain acceptance of legacy payload formats (single-object UpdateLocation, flexible history request parsing).
- Ensure clients without new fields (Speed/BatteryLevel/Altitude) continue to work without error.
- **Evidence**: docs/PRD.md; docs/TECHNICAL_SPECIFICATION.md; docs/DECISION_LOG.md.

## 5. Extension Points
- **Safe extension areas**:
  - Additional response fields (e.g., new telemetry) if optional and backward compatible.
  - Additional config options under `rateLimiting` or CORS with defaults that preserve current behavior.
  - New API versions while keeping legacy endpoints intact.
- **Recommended abstractions**:
  - Request/response model interfaces to isolate validation and serialization logic.
  - Storage adapters with explicit interfaces to swap Redis implementations.
  - Middleware registry to add operational controls without modifying core routes.
- **Evidence**: docs/TECHNICAL_SPECIFICATION.md; docs/DECISION_LOG.md.

## 6. Risk Map
- **Danger zones**:
  - Visitor history modes (detailed vs. summary) can alter storage semantics and audit expectations.
  - Backward compatibility for legacy endpoints; breaking changes will strand existing clients.
- **Performance traps**:
  - Large history retrievals can stress Redis and JSON parsing; ensure bounded list sizes and robust parsing.
  - Rate limiter queue timeouts can produce unexpected client failures if misconfigured.
- **Security pitfalls**:
  - No authentication or authorization built in; deployments must handle access control externally.
  - Logging raw bodies may expose sensitive data; consider redaction policy.
- **Evidence**: docs/PRD.md; docs/TECHNICAL_SPECIFICATION.md; docs/DECISION_LOG.md.

## 7. Technical Debt Ledger
- **Known compromises**:
  - Reliance on Redis as a primary store without built-in persistence guarantees in default config.
  - GeoJSON endpoint only returns the first location even when multiple devices are requested.
  - Lack of built-in authentication/authorization.
- **Payoff recommendations**:
  - Add ADR-backed authentication roadmap if deployment environment requires it.
  - Consider explicit pagination or filtering for large history retrievals.
  - Define data retention units explicitly in documentation and config schemas.
- **Evidence**: docs/PRD.md; docs/TECHNICAL_SPECIFICATION.md; docs/DECISION_LOG.md.
