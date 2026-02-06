# Input Schema Validation Plan

## Recommendation
Enforce strict schema validation with bounds checks for all input fields.

## Current State
- Models validate presence but not types, ranges, or size limits.
- Location data accepts arbitrary values for coordinates and metadata.

## Threats Addressed
- Tampering via malformed or extreme values.
- Data poisoning and downstream processing errors.
- Unexpected resource usage from oversized payload content.

## Proposed Specification
### Requirements
1. **Strict schema per endpoint**:
   - `UpdateLocation`: enforce numeric ranges for latitude/longitude, timestamp, accuracy, speed, battery, altitude.
   - `GetLocation`: require non-empty device IDs.
   - `GetLocationHistory`: require `amount` within allowed min/max.
   - `DeleteLocation`: require non-empty device IDs.
2. **Consistent error responses**:
   - `400 Bad Request` with specific validation error messages.
3. **Schema enforcement before persistence**:
   - Validate payloads prior to Redis writes.
4. **Bounds** (example defaults):
   - Latitude: `-90..90`
   - Longitude: `-180..180`
   - HorizontalAccuracy: `0..10000`
   - Speed: `0..1000`
   - BatteryLevel: `0..100`
   - Altitude: `-1000..100000`
   - Timestamp: must be integer and within configurable skew.
5. **Size limits**:
   - Maximum number of locations per request.

### Configuration
- Add `validation` block with numeric bounds and max list sizes.

## Implementation Plan
1. **Define schemas**
   - Create a validation helper module with explicit per-endpoint schemas.
2. **Integrate into request parsing**
   - Validate in `lib/routes/location/v1/inputParser.js` or route handlers.
3. **Update models**
   - Extend `RequestLocation`, `RequestDevice`, `RequestLocationHistory` with type/range checks.
4. **Tests**
   - Add unit tests for validation helpers.
   - Add integration tests for invalid values and boundary conditions.
5. **Documentation**
   - Update API docs with validation rules and expected errors.

## Open Questions
- Should we tolerate extra fields (strict vs. permissive)?
- Do we require timestamps in milliseconds or accept ISO 8601?
- Should we normalize numeric inputs or reject non-numeric strings?
