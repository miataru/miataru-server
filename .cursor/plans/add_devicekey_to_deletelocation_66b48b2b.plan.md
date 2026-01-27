---
name: Add DeviceKey to DeleteLocation
overview: Add DeviceKey authentication to DeleteLocation endpoint, update all documentation (README, API docs, swagger.yaml), add comprehensive tests, and scan for any other missing write operations that need DeviceKey protection.
todos:
  - id: update-request-model
    content: Update RequestDevice model to support optional DeviceKey parameter (lib/models/RequestDevice.js)
    status: completed
  - id: add-devicekey-validation
    content: Add DeviceKey validation logic to deleteLocation function (lib/routes/location/v1/location.js)
    status: completed
  - id: update-swagger
    content: Add DeleteLocation endpoint definition to swagger.yaml with DeviceKey support
    status: completed
  - id: update-delete-location-docs
    content: Update DELETE_LOCATION_API.md with DeviceKey authentication information
    status: completed
  - id: update-security-docs
    content: Update API_1.1_SECURITY.md to include DeleteLocation in DeviceKey section
    status: completed
  - id: update-readme
    content: Update README.md examples and security features section
    status: completed
  - id: update-whats-new
    content: Update WHATS_NEW_V2.md protected operations list
    status: completed
  - id: update-client-adoption
    content: Update CLIENT_ADOPTION_API_1.1.md with DeleteLocation examples
    status: completed
  - id: update-compatibility
    content: Update COMPATIBILITY_ASSESSMENT.md DeleteLocation entry
    status: completed
  - id: add-devicekey-tests
    content: Add comprehensive DeviceKey test suite to deleteLocation.tests.js
    status: completed
  - id: run-all-tests
    content: Run full test suite (unit + integration) to verify all changes
    status: completed
isProject: false
---

# Add DeviceKey Authentication to DeleteLocation

## Problem Analysis

DeleteLocation is a write operation that permanently deletes all location data (current location, history, and visitor history) but currently lacks DeviceKey authentication. This is a security gap since:

1. **DeleteLocation modifies server state** - It deletes data, making it a write operation
2. **Other write operations are protected** - UpdateLocation, SetAllowedDeviceList, and GetVisitorHistory all require DeviceKey when set
3. **DeleteLocation is missing from swagger.yaml** - The endpoint is not documented in the API specification
4. **Documentation is incomplete** - All docs state "No Authentication" for DeleteLocation

## Current State

- **Implementation**: `lib/routes/location/v1/location.js` - `deleteLocation()` function (lines 756-800) has no DeviceKey validation
- **Request Model**: `lib/models/RequestDevice.js` - Only has `device()` method, no `deviceKey()` support
- **Input Parser**: `lib/routes/location/v1/inputParser.js` - Uses `RequestDevice` model (line 109)
- **Documentation**: States "No Authentication" in `docs/DELETE_LOCATION_API.md` (line 157)
- **Swagger**: DeleteLocation endpoint is completely missing from `docs/swagger.yaml`
- **Tests**: `tests/integration/deleteLocation.tests.js` - No DeviceKey validation tests

## Implementation Plan

### Phase 1: Update Request Model

**File**: `lib/models/RequestDevice.js`

- Add `_deviceKey` property (optional, similar to RequestLocation and RequestVisitorHistory)
- Add `deviceKey()` method to retrieve the DeviceKey
- Update constructor to accept `DeviceKey` from data object
- Keep backward compatibility - DeviceKey is optional

**Pattern**: Follow the same pattern as `RequestLocation.js` (lines 14-15, 52-54) and `RequestVisitorHistory.js` (lines 8-9, 24-26)

### Phase 2: Update DeleteLocation Implementation

**File**: `lib/routes/location/v1/location.js`

- Add DeviceKey validation logic before deletion (similar to `updateLocation` function, lines 342-380)
- Use `deviceKeyUtils.getDeviceKey()` to check if DeviceKey is set
- If DeviceKey is set, require it in the request and validate using `deviceKeyUtils.validateDeviceKey()`
- Return 403 ForbiddenError if DeviceKey is missing when required or doesn't match
- Maintain backward compatibility - if no DeviceKey is set, proceed normally

**Pattern**: Follow the same validation pattern as `updateLocation()`:

```javascript
seq()
    .seq(function() {
        var done = this;
        var deviceId = locationRequest.device();
        var providedDeviceKey = locationRequest.deviceKey();
        
        deviceKeyUtils.getDeviceKey(deviceId, function(error, storedKey) {
            // Validate logic here
        });
    })
    .seq(function() {
        // Existing deletion logic
    })
```

### Phase 3: Update Swagger Documentation

**File**: `docs/swagger.yaml`

- Add `/DeleteLocation` endpoint definition (after `/GetVisitorHistory`, before `/setDeviceKey`)
- Include description mentioning DeviceKey requirement (API 1.1)
- Add DeviceKey parameter to `MiataruDeleteLocation` schema
- Add 403 response for DeviceKey mismatch
- Create `MiataruDeleteLocationRequest` definition
- Create `MiataruDeleteLocationResponse` definition (references ACK schema)

**Location**: Add after line 174 (after GetVisitorHistory), before line 175 (setDeviceKey)

### Phase 4: Update All Documentation

#### 4.1 DELETE_LOCATION_API.md

**File**: `docs/DELETE_LOCATION_API.md`

- Update "Security Considerations" section (line 155-160) - Remove "No Authentication" statement
- Add DeviceKey section explaining when it's required
- Update request format examples to show DeviceKey parameter
- Add DeviceKey to parameters table
- Update cURL and JavaScript examples to include DeviceKey
- Add error responses for 403 Forbidden (DeviceKey related)

#### 4.2 API_1.1_SECURITY.md

**File**: `docs/API_1.1_SECURITY.md`

- Add DeleteLocation to the list of endpoints requiring DeviceKey (line 72-73)
- Add "Using DeviceKey in DeleteLocation" section (after GetVisitorHistory section, around line 134)
- Include request/response examples with DeviceKey
- Update migration checklist to include DeleteLocation

#### 4.3 README.md

**File**: `README.md`

- Update "Security Features" section (line 64-66) to include DeleteLocation
- Update DeleteLocation example (line 151-152) to show DeviceKey when applicable
- Update "DeleteLocation API" section (line 161-195) to mention DeviceKey requirement

#### 4.4 WHATS_NEW_V2.md

**File**: `docs/WHATS_NEW_V2.md`

- Update "Protected Operations" section (line 39-43) to include DeleteLocation
- Add DeleteLocation to the list of operations requiring DeviceKey

#### 4.5 CLIENT_ADOPTION_API_1.1.md

**File**: `docs/CLIENT_ADOPTION_API_1.1.md`

- Add DeleteLocation example with DeviceKey authentication
- Include error handling for 403 responses

#### 4.6 COMPATIBILITY_ASSESSMENT.md

**File**: `docs/COMPATIBILITY_ASSESSMENT.md`

- Update DeleteLocation entry to mention DeviceKey requirement (if applicable)
- Note backward compatibility maintained when DeviceKey is not set

### Phase 5: Add Comprehensive Tests

**File**: `tests/integration/deleteLocation.tests.js`

Add new test suite: `describe('DeleteLocation with DeviceKey', function() { ... })`

Test cases:

1. **Backward compatibility**: DeleteLocation without DeviceKey when no key is set (should work)
2. **Valid DeviceKey**: DeleteLocation with correct DeviceKey when key is set (should succeed)
3. **Missing DeviceKey**: DeleteLocation without DeviceKey when key is set (should return 403)
4. **Invalid DeviceKey**: DeleteLocation with wrong DeviceKey when key is set (should return 403)
5. **Empty DeviceKey**: DeleteLocation with empty DeviceKey when key is set (should return 403)
6. **Complete workflow**: Set DeviceKey → UpdateLocation with DeviceKey → DeleteLocation with DeviceKey → Verify deletion

**Pattern**: Follow the same test structure as `tests/integration/deviceKey.tests.js` (lines 119-209 for UpdateLocation, 211-295 for GetVisitorHistory)

### Phase 6: Scan for Other Missing Operations

**Check all endpoints** in `lib/routes/location/v1/location.js`:

- ✅ UpdateLocation - Has DeviceKey
- ✅ GetVisitorHistory - Has DeviceKey  
- ✅ SetAllowedDeviceList - Has DeviceKey
- ✅ SetDeviceKey - Has its own auth (CurrentDeviceKey)
- ❌ DeleteLocation - Missing DeviceKey (to be fixed)
- ✅ GetLocation - Read operation, uses allowed devices list
- ✅ GetLocationHistory - Read operation, uses allowed devices list
- ✅ GetLocationGeoJSON - Read operation, blocked when DeviceKey is set

**Conclusion**: DeleteLocation is the only write operation missing DeviceKey protection.

### Phase 7: Update Test Files

**File**: `tests/integration/deleteLocation.tests.js`

- Update existing tests to ensure they still pass (backward compatibility)
- Ensure test cleanup doesn't break with DeviceKey requirement
- Update beforeEach to handle DeviceKey cleanup if needed

## Testing Strategy

1. **Unit Tests**: Verify RequestDevice model accepts DeviceKey parameter
2. **Integration Tests**: 

   - Test backward compatibility (no DeviceKey when none set)
   - Test DeviceKey validation (required when set, must match)
   - Test error responses (403 Forbidden)
   - Test complete workflows

3. **Run All Tests**: Execute full test suite to ensure no regressions

   - `npm test` (unit tests)
   - `npm run test:integration` (integration tests)

## Backward Compatibility

- **Critical**: DeleteLocation must work without DeviceKey when no DeviceKey is set for the device
- **Optional**: DeviceKey parameter is optional in the request (only required when DeviceKey is set)
- **Error Handling**: Clear error messages when DeviceKey is required but missing or invalid

## Files to Modify

1. `lib/models/RequestDevice.js` - Add DeviceKey support
2. `lib/routes/location/v1/location.js` - Add DeviceKey validation to deleteLocation()
3. `docs/swagger.yaml` - Add DeleteLocation endpoint definition
4. `docs/DELETE_LOCATION_API.md` - Update security and examples
5. `docs/API_1.1_SECURITY.md` - Add DeleteLocation to DeviceKey section
6. `README.md` - Update examples and security features
7. `docs/WHATS_NEW_V2.md` - Add DeleteLocation to protected operations
8. `docs/CLIENT_ADOPTION_API_1.1.md` - Add DeleteLocation examples
9. `docs/COMPATIBILITY_ASSESSMENT.md` - Update DeleteLocation entry
10. `tests/integration/deleteLocation.tests.js` - Add DeviceKey test suite

## Success Criteria

- ✅ DeleteLocation requires DeviceKey when DeviceKey is set for device
- ✅ DeleteLocation works without DeviceKey when no DeviceKey is set (backward compatible)
- ✅ All documentation updated with DeviceKey information
- ✅ Swagger.yaml includes DeleteLocation endpoint
- ✅ Comprehensive test coverage for DeviceKey scenarios
- ✅ All existing tests pass
- ✅ No other write operations missing DeviceKey protection