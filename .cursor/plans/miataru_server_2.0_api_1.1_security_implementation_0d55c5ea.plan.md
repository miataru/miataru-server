---
name: Miataru Server 2.0 API 1.1 Security Implementation
overview: Implement security and privacy enhancements for miataru-server v2.0 and API v1.1, including DeviceKey authentication and allowed devices access control, while maintaining full backward compatibility with existing v1.0 clients.
todos:
  - id: phase1-errors
    content: "Phase 1.1: Add ForbiddenError and UnauthorizedError to lib/errors.js"
    status: completed
  - id: phase1-devicekey-utils
    content: "Phase 1.2: Create lib/utils/deviceKey.js with storage and validation utilities"
    status: completed
  - id: phase1-allowed-devices-utils
    content: "Phase 1.3: Create lib/utils/allowedDevices.js with storage and access check utilities"
    status: completed
  - id: phase2-request-location
    content: "Phase 2.1: Extend RequestLocation model with optional DeviceKey field"
    status: completed
  - id: phase2-request-visitor-history
    content: "Phase 2.2: Extend RequestVisitorHistory model with optional DeviceKey field"
    status: completed
  - id: phase2-request-set-device-key
    content: "Phase 2.3: Create RequestSetDeviceKey model with validation"
    status: completed
  - id: phase2-request-set-allowed-devices
    content: "Phase 2.4: Create RequestSetAllowedDeviceList model with validation"
    status: completed
  - id: phase3-input-parser
    content: "Phase 3: Extend inputParser.js to handle new endpoints and DeviceKey fields"
    status: completed
  - id: phase4-set-device-key
    content: "Phase 4.1: Implement setDeviceKey endpoint in location.js"
    status: completed
  - id: phase4-set-allowed-devices
    content: "Phase 4.2: Implement setAllowedDeviceList endpoint in location.js"
    status: completed
  - id: phase4-update-location
    content: "Phase 4.3: Modify updateLocation to validate DeviceKey"
    status: completed
  - id: phase4-get-visitor-history
    content: "Phase 4.4: Modify getVisitorHistory to validate DeviceKey"
    status: completed
  - id: phase4-get-location
    content: "Phase 4.5: Modify getLocation to check allowed devices list"
    status: completed
  - id: phase4-get-location-history
    content: "Phase 4.6: Modify getLocationHistory to check allowed devices list"
    status: completed
  - id: phase4-get-location-geojson
    content: "Phase 4.7: Modify getLocationGeoJSON functions to check DeviceKey"
    status: completed
  - id: phase5-routes
    content: "Phase 5: Register new routes in lib/routes/location/index.js"
    status: completed
  - id: phase6-swagger
    content: "Phase 6: Create/update swagger.yaml with API 1.1 definitions"
    status: completed
  - id: phase7-unit-tests
    content: "Phase 7.1: Write unit tests for all new models and utilities"
    status: completed
  - id: phase7-integration-tests
    content: "Phase 7.2: Write integration tests for all new and modified endpoints"
    status: completed
  - id: phase7-backward-compat-tests
    content: "Phase 7.3: Add backward compatibility tests to existing test suite"
    status: completed
  - id: phase8-api-docs
    content: "Phase 8.1: Create API_1.1_SECURITY.md documentation"
    status: completed
  - id: phase8-client-adoption
    content: "Phase 8.2: Create CLIENT_ADOPTION_API_1.1.md guide for iOS client"
    status: completed
  - id: phase8-readme
    content: "Phase 8.3: Update README.md with version 2.0 information"
    status: completed
  - id: phase9-compatibility
    content: "Phase 9: Perform compatibility assessment and document breaking changes"
    status: completed
isProject: false
---

# Miataru Server 2.0 & API 1.1 Security Implementation Plan

## Overview

This plan implements security and privacy enhancements for miataru-server version 2.0 and miataru API version 1.1. The implementation adds DeviceKey authentication and allowed devices access control while maintaining full backward compatibility with existing v1.0 clients.

## Architecture Overview

### Data Storage in Redis

New Redis keys will be introduced:

- **DeviceKey storage**: `miad:$deviceid:key` - stores the DeviceKey (256 char unicode string)
- **Allowed devices list**: `miad:$deviceid:allowed` - stores the allowed devices list as a hash
- **Allowed devices flag**: `miad:$deviceid:allowed:enabled` - quick flag to check if allowed devices list exists

### Key Components

1. **New Endpoints**:

   - `/v1/setDeviceKey` - Set/change device key
   - `/v1/setAllowedDeviceList` - Manage allowed devices list

2. **Modified Endpoints**:

   - `/v1/UpdateLocation` - Add DeviceKey validation
   - `/v1/GetVisitorHistory` - Add DeviceKey validation
   - `/v1/GetLocation` - Add allowed devices check
   - `/v1/GetLocationHistory` - Add allowed devices check
   - `/v1/GetLocationGeoJSON` - Add DeviceKey check

3. **New Models**:

   - `RequestSetDeviceKey` - Parse setDeviceKey requests
   - `RequestSetAllowedDeviceList` - Parse setAllowedDeviceList requests
   - `RequestLocation` - Extend with optional DeviceKey field
   - `RequestVisitorHistory` - Extend with optional DeviceKey field

4. **New Error Types**:

   - `ForbiddenError` (403) - For DeviceKey mismatches
   - `UnauthorizedError` (401) - For GetLocationGeoJSON when DeviceKey is set

## Implementation Details

### Phase 1: Core Infrastructure

#### 1.1 Error Handling

**File**: `lib/errors.js`

- Add `ForbiddenError` class (403 status code)
- Add `UnauthorizedError` class (401 status code)
- Export new error types

#### 1.2 DeviceKey Storage Utilities

**File**: `lib/utils/deviceKey.js` (new file)

- `getDeviceKey(deviceId, callback)` - Retrieve device key from Redis
- `setDeviceKey(deviceId, deviceKey, callback)` - Store device key in Redis
- `validateDeviceKey(deviceId, providedKey, callback)` - Validate provided key against stored key
- Redis key pattern: `miad:$deviceid:key`

#### 1.3 Allowed Devices Storage Utilities

**File**: `lib/utils/allowedDevices.js` (new file)

- `getAllowedDevices(deviceId, callback)` - Retrieve allowed devices list from Redis
- `setAllowedDevices(deviceId, allowedDevices, callback)` - Store/update allowed devices list
- `isAllowedDeviceEnabled(deviceId, callback)` - Check if allowed devices list is enabled
- `checkAccess(deviceId, requestingDeviceId, accessType, callback)` - Check if requesting device has access
- Redis storage pattern:
  - Hash: `miad:$deviceid:allowed` with fields `$allowedDeviceId:currentLocation` and `$allowedDeviceId:history`
  - Flag: `miad:$deviceid:allowed:enabled` (set to "1" when list exists)

### Phase 2: Request Models

#### 2.1 Extend RequestLocation Model

**File**: `lib/models/RequestLocation.js`

- Add optional `DeviceKey` field (can be null/empty/undefined)
- Add getter method `deviceKey()` that returns the DeviceKey or null
- Ensure backward compatibility - DeviceKey is optional and doesn't break existing validation

#### 2.2 Extend RequestVisitorHistory Model

**File**: `lib/models/RequestVisitorHistory.js`

- Add optional `DeviceKey` field (can be null/empty/undefined)
- Add getter method `deviceKey()` that returns the DeviceKey or null
- Ensure backward compatibility

#### 2.3 Create RequestSetDeviceKey Model

**File**: `lib/models/RequestSetDeviceKey.js` (new file)

- Validate required fields: `DeviceID`, `CurrentDeviceKey` (optional), `NewDeviceKey`
- Validate NewDeviceKey length (max 256 characters unicode)
- Handle null/empty CurrentDeviceKey for first-time setup

#### 2.4 Create RequestSetAllowedDeviceList Model

**File**: `lib/models/RequestSetAllowedDeviceList.js` (new file)

- Validate required fields: `DeviceID`, `DeviceKey`, `allowedDevices` (array, max 256 elements)
- Validate allowedDevice structure: `DeviceID`, `hasCurrentLocationAccess`, `hasHistoryAccess`
- Validate boolean fields for access control

### Phase 3: Input Parsing

#### 3.1 Extend Input Parser

**File**: `lib/routes/location/v1/inputParser.js`

- Add parsing for `/v1/setDeviceKey` endpoint
- Add parsing for `/v1/setAllowedDeviceList` endpoint
- Extend `parseUpdateLocation` to extract DeviceKey from MiataruLocation array elements
- Extend `parseGetVisitorHistory` to extract DeviceKey from request body

### Phase 4: Endpoint Implementations

#### 4.1 setDeviceKey Endpoint

**File**: `lib/routes/location/v1/location.js`

- New function: `setDeviceKey(req, res, next)`
- Validate CurrentDeviceKey if device already has a key set
- If CurrentDeviceKey matches or no key exists, set NewDeviceKey
- Return success response or 403 Forbidden if CurrentDeviceKey doesn't match
- Store in Redis: `miad:$deviceid:key`

#### 4.2 setAllowedDeviceList Endpoint

**File**: `lib/routes/location/v1/location.js`

- New function: `setAllowedDeviceList(req, res, next)`
- Validate DeviceKey first (must match stored key)
- Replace entire allowed devices list (client maintains full list)
- Store as Redis hash: `miad:$deviceid:allowed`
- Set flag: `miad:$deviceid:allowed:enabled` = "1"
- Return success or 403 Forbidden if DeviceKey doesn't match

#### 4.3 Modify updateLocation Function

**File**: `lib/routes/location/v1/location.js`

- Before updating location, check if DeviceKey is set for the device
- If DeviceKey is set, validate provided DeviceKey matches stored key
- If keys don't match, return 403 Forbidden
- If no DeviceKey is set, proceed normally (backward compatible)
- DeviceKey parameter is optional in MiataruLocation array elements

#### 4.4 Modify getVisitorHistory Function

**File**: `lib/routes/location/v1/location.js`

- Before returning visitor history, check if DeviceKey is set for the device
- If DeviceKey is set, validate provided DeviceKey matches stored key
- If keys don't match, return 403 Forbidden
- If no DeviceKey is set, proceed normally (backward compatible)

#### 4.5 Modify getLocation Function

**File**: `lib/routes/location/v1/location.js`

- For each requested DeviceID, check if allowed devices list is enabled
- If enabled, check if RequestMiataruDeviceID has `hasCurrentLocationAccess` permission
- If no permission, omit location data (return as if device doesn't exist)
- If not enabled, return location data (default behavior - backward compatible)

#### 4.6 Modify getLocationHistory Function

**File**: `lib/routes/location/v1/location.js`

- For each requested DeviceID, check if allowed devices list is enabled
- If enabled, check if RequestMiataruDeviceID has `hasHistoryAccess` permission
- If no permission, omit location history (return as if history doesn't exist)
- If not enabled, default is to NOT return location history (privacy-first)

#### 4.7 Modify getLocationGeoJSON Function

**File**: `lib/routes/location/v1/location.js`

- Check if DeviceKey is set for any requested device
- If DeviceKey is set, return 401 Unauthorized
- If no DeviceKey is set, proceed normally (backward compatible)

#### 4.8 Modify getLocationGeoJSONGET Function

**File**: `lib/routes/location/v1/location.js`

- Check if DeviceKey is set for the requested device
- If DeviceKey is set, return 401 Unauthorized
- If no DeviceKey is set, proceed normally (backward compatible)

### Phase 5: Route Registration

#### 5.1 Register New Routes

**File**: `lib/routes/location/index.js`

- Add POST `/v1/setDeviceKey` route
- Add POST `/v1/setAllowedDeviceList` route
- Add POST `/setDeviceKey` route (legacy compatibility)
- Add POST `/setAllowedDeviceList` route (legacy compatibility)
- Add method restrictions (only POST allowed)

### Phase 6: Swagger Documentation

#### 6.1 Update Swagger Specification

**File**: `swagger.yaml` (new file in root or `docs/swagger.yaml`)

- Update version to "1.1.0"
- Add `/v1/setDeviceKey` endpoint definition
- Add `/v1/setAllowedDeviceList` endpoint definition
- Extend `MiataruLocation` definition with optional `DeviceKey` field
- Extend `MiataruGetVisitorHistoryRequest` with optional `DeviceKey` field
- Add new definitions:
  - `MiataruSetDeviceKeyRequest`
  - `MiataruSetDeviceKeyResponse`
  - `MiataruSetAllowedDeviceListRequest`
  - `MiataruAllowedDevice`
  - `MiataruSetAllowedDeviceListResponse`
- Document error responses (403 Forbidden, 401 Unauthorized)
- Document backward compatibility notes

### Phase 7: Testing

#### 7.1 Unit Tests

**File**: `tests/unit/deviceKey.tests.js` (new file)

- Test DeviceKey storage utilities
- Test key validation logic
- Test edge cases (null, empty, unicode strings, 256 char limit)

**File**: `tests/unit/allowedDevices.tests.js` (new file)

- Test allowed devices storage utilities
- Test access check logic
- Test list management (add, update, delete)

**File**: `tests/unit/requestSetDeviceKey.tests.js` (new file)

- Test RequestSetDeviceKey model validation
- Test required fields
- Test key length validation

**File**: `tests/unit/requestSetAllowedDeviceList.tests.js` (new file)

- Test RequestSetAllowedDeviceList model validation
- Test allowedDevice structure validation
- Test array size limits

**File**: `tests/unit/requestLocation.tests.js` (modify existing)

- Test DeviceKey field in RequestLocation
- Test backward compatibility (missing DeviceKey)
- Test optional DeviceKey handling

#### 7.2 Integration Tests

**File**: `tests/integration/deviceKey.tests.js` (new file)

- Test setDeviceKey endpoint (first-time setup, key change, invalid key)
- Test updateLocation with DeviceKey (valid, invalid, missing)
- Test getVisitorHistory with DeviceKey (valid, invalid, missing)
- Test backward compatibility (no DeviceKey set)

**File**: `tests/integration/allowedDevices.tests.js` (new file)

- Test setAllowedDeviceList endpoint (valid, invalid DeviceKey)
- Test GetLocation with allowed devices (with/without access, not in list)
- Test GetLocationHistory with allowed devices (with/without access, not in list)
- Test GetLocationGeoJSON with DeviceKey set (should return 401)
- Test backward compatibility (no allowed devices list)

**File**: `tests/integration/backwardCompatibility.tests.js` (modify existing)

- Add tests for v1.0 clients with new security features disabled
- Test that old clients continue to work
- Test graceful degradation when privacy features are enabled

**File**: `tests/integration/security.tests.js` (new file)

- Test unauthorized access attempts
- Test DeviceKey brute force protection (rate limiting considerations)
- Test allowed devices edge cases (empty list, max 256 devices)
- Test concurrent access scenarios

#### 7.3 Test Utilities

**File**: `tests/testFiles/calls.js` (modify existing)

- Add helper functions for DeviceKey requests
- Add helper functions for allowed devices requests
- Add helper functions for requests with DeviceKey parameter

### Phase 8: Documentation

#### 8.1 API Documentation

**File**: `docs/API_1.1_SECURITY.md` (new file)

- Document DeviceKey concept and usage
- Document allowed devices list concept
- Document migration path from v1.0 to v1.1
- Document backward compatibility guarantees
- Document breaking changes (GetLocationGeoJSON behavior)

#### 8.2 Client Adoption Guide

**File**: `docs/CLIENT_ADOPTION_API_1.1.md` (new file)

- Step-by-step guide for iOS client updates
- Code examples for setting DeviceKey
- Code examples for managing allowed devices
- Migration checklist
- Testing recommendations
- Rollout strategy recommendations

#### 8.3 README Updates

**File**: `README.md` (modify existing)

- Update version to 2.0.0
- Add section on security features
- Update API documentation links
- Add migration notes

### Phase 9: Compatibility Assessment

#### 9.1 Backward Compatibility Verification

- Document all v1.0 endpoints that remain unchanged
- Document endpoints with new optional parameters
- Document endpoints with changed behavior (GetLocationGeoJSON)
- Create compatibility matrix

#### 9.2 Breaking Changes Documentation

- GetLocationGeoJSON: Returns 401 when DeviceKey is set (breaking for clients using this endpoint with DeviceKey-enabled devices)
- GetLocationHistory: Default behavior changes when allowed devices list is enabled (privacy-first)

## Implementation Order

1. **Phase 1**: Core Infrastructure (errors, utilities)
2. **Phase 2**: Request Models
3. **Phase 3**: Input Parsing
4. **Phase 4**: Endpoint Implementations (implement and test incrementally)
5. **Phase 5**: Route Registration
6. **Phase 6**: Swagger Documentation
7. **Phase 7**: Testing (parallel with implementation)
8. **Phase 8**: Documentation
9. **Phase 9**: Compatibility Assessment

## Testing Strategy

### Test-Driven Development Approach

1. **Write tests first** for each new feature
2. **Run tests** to verify they fail (red)
3. **Implement feature** to make tests pass (green)
4. **Refactor** while keeping tests green
5. **Add edge case tests** as implementation progresses

### Test Coverage Goals

- Unit tests: 90%+ coverage for new code
- Integration tests: All endpoints covered
- Backward compatibility: All v1.0 scenarios verified
- Security: All unauthorized access scenarios tested

### Test Categories

1. **Happy Path Tests**: Normal operation with new features
2. **Backward Compatibility Tests**: Old clients still work
3. **Security Tests**: Unauthorized access is blocked
4. **Edge Case Tests**: Null values, empty strings, max limits
5. **Error Handling Tests**: Invalid input, missing fields
6. **Concurrency Tests**: Multiple simultaneous requests

## Redis Key Naming Convention

Following existing pattern: `miad:$deviceid:$suffix`

- DeviceKey: `miad:$deviceid:key`
- Allowed devices hash: `miad:$deviceid:allowed`
- Allowed devices flag: `miad:$deviceid:allowed:enabled`

## Error Response Format

All errors follow existing pattern:

```json
{
  "error": "Error message description"
}
```

New error codes:

- 401 Unauthorized: DeviceKey required but not provided or invalid
- 403 Forbidden: DeviceKey mismatch or access denied

## Compatibility Guarantees

1. **v1.0 clients continue to work** without modification
2. **Optional parameters** (DeviceKey) can be omitted
3. **Default behavior** remains unchanged when security features are not enabled
4. **Existing endpoints** maintain same response format
5. **Breaking change**: GetLocationGeoJSON returns 401 when DeviceKey is set (documented)

## Risk Assessment

### High Risk Areas

1. **GetLocationGeoJSON breaking change** - May affect existing clients
2. **GetLocationHistory default behavior** - Privacy-first may confuse some clients
3. **DeviceKey validation** - Must be secure but not break existing flows

### Mitigation Strategies

1. Clear documentation of breaking changes
2. Comprehensive backward compatibility tests
3. Gradual rollout recommendation
4. Client adoption guide with migration steps

## Performance Considerations

1. **Redis lookups**: Additional lookups for DeviceKey and allowed devices checks
2. **Optimization**: Use Redis hash for allowed devices for O(1) lookups
3. **Caching**: Consider caching DeviceKey lookups (with invalidation on updates)
4. **Flag optimization**: Use simple flag key for quick "is enabled" checks

## Security Considerations

1. **DeviceKey storage**: Store securely in Redis (not logged)
2. **Key comparison**: Use constant-time comparison to prevent timing attacks
3. **Rate limiting**: Existing rate limiting should cover new endpoints
4. **Input validation**: Strict validation of DeviceKey length and format
5. **Access control**: Proper validation of allowed devices permissions

## Deployment Checklist

- [ ] All tests passing
- [ ] Swagger documentation updated
- [ ] Client adoption guide complete
- [ ] Backward compatibility verified
- [ ] Breaking changes documented
- [ ] Performance tested
- [ ] Security reviewed
- [ ] Documentation reviewed
- [ ] Version bumped to 2.0.0
- [ ] API version documented as 1.1