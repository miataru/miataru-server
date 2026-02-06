# Device ID Entropy & Rotation Plan

## Recommendation
Consider device ID entropy requirements and rotation mechanisms.

## Current State
- Device IDs are accepted as-is with no validation of length or entropy.
- Device IDs act as bearer tokens for access control.

## Threats Addressed
- Enumeration of predictable device IDs.
- Unauthorized access using guessed or reused identifiers.

## Proposed Specification
### Requirements
1. **Minimum entropy requirements**
   - Enforce minimum length and character set.
   - Optionally require UUIDv4 or cryptographic random tokens.
2. **Rotation support**
   - Allow clients to rotate device IDs without losing data access.
3. **Deprecation policy**
   - Allow old IDs to function during a grace period.
4. **Backward compatibility**
   - Provide a config toggle for strict vs. permissive validation.

### Configuration
- Add `deviceId` settings:
  - `minLength`
  - `allowedPattern`
  - `allowLegacyIds`
  - `rotationGracePeriodDays`

## Implementation Plan
1. **Define validation rules**
   - Enforce length and pattern checks in `RequestDevice` and `RequestLocation`.
2. **Rotation workflow**
   - Add new endpoint or extend `UpdateLocation` to accept `PreviousDevice` or `RotateDevice` payload.
3. **Migration support**
   - Record mapping of old → new IDs in Redis during rotation grace period.
4. **Tests**
   - Add tests for device ID validation and rotation scenarios.
5. **Documentation**
   - Document device ID requirements and rotation flow.

## Open Questions
- Should device ID validation be strict by default or opt-in?
- How long should rotation mappings be retained?
