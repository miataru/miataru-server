# Rate Limiting Strategy Review Plan

## Recommendation
Evaluate and harden rate limiting strategy for write-heavy endpoints.

## Current State
- HTTP concurrency limiter per IP exists.
- Redis concurrency limiter exists but is global, not per endpoint.
- No per-route or per-device rate limits.

## Threats Addressed
- Denial of Service via high request concurrency.
- Abuse of write endpoints to overwrite location data.

## Proposed Specification
### Requirements
1. **Per-endpoint rate limits**
   - Stricter limits for `/UpdateLocation` and `/DeleteLocation`.
2. **Per-device rate limits**
   - Throttle updates per device ID to prevent flooding.
3. **Configurable thresholds**
   - Allow tuning per environment.
4. **Clear rejection responses**
   - `429 Too Many Requests` with retry guidance.

### Configuration
- Add `rateLimiting.routes` with endpoint-specific limits.
- Add `rateLimiting.device` for device-level throttling.

## Implementation Plan
1. **Implement route-aware limiter**
   - Introduce a middleware that keys by `ip + endpoint`.
2. **Device-level limiter**
   - Apply rate limits using device IDs for write endpoints.
3. **Redis-backed limiter (optional)**
   - Use Redis to share rate limit state across instances.
4. **Tests**
   - Add tests for per-endpoint and per-device limits.
5. **Documentation**
   - Provide recommended defaults and tuning guidance.

## Open Questions
- Should rate limits be enforced globally or per tenant?
- Do we require burst allowances for clients sending batched updates?
