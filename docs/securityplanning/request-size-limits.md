# Request Size & Payload Limit Plan

## Recommendation
Introduce request size limits per endpoint (per-location array size and history request size).

## Current State
- Global body parser limit is set to 10MB.
- No per-endpoint limits on list sizes or history amounts.

## Threats Addressed
- Denial of Service via oversized payloads.
- Excessive memory usage during request parsing.
- Large Redis list operations for history requests.

## Proposed Specification
### Requirements
1. **Max locations per UpdateLocation**: configurable (e.g., 100).
2. **Max devices per GetLocation**: configurable (e.g., 100).
3. **Max history amount**: configurable (e.g., 1000).
4. **Enforce per-request payload size**: keep 10MB limit, add stricter endpoint limits.
5. **Explicit error messages**:
   - `413 Payload Too Large` for body size breaches.
   - `400 Bad Request` for list size/amount violations.

### Configuration
- Add `limits` config section:
  - `maxLocationsPerRequest`
  - `maxDevicesPerRequest`
  - `maxHistoryAmount`

## Implementation Plan
1. **Add validation to parsers**
   - Enforce size checks in `inputParser` before model instantiation.
2. **Update tests**
   - Add tests for max list sizes and max history amount.
3. **Operational checks**
   - Log when limits are exceeded for security monitoring.
4. **Documentation**
   - Update README/API docs with limits and tuning guidance.

## Open Questions
- Should limits be enforced per IP with dynamic throttling?
- Do legacy endpoints use the same limits?
