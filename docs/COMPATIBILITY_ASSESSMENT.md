# Miataru API 1.1 Compatibility Assessment

## Executive Summary

Miataru Server 2.0 and API 1.1 maintain **broad backward compatibility** with API 1.0 clients. Most existing endpoints continue to work without modification, but GetLocation/GetLocationHistory now require `RequestMiataruDeviceID`, and GetLocationGeoJSON has a documented 401 change when DeviceKey is set.

## Backward Compatibility Guarantees

### 1. Most API 1.0 Endpoints Remain Unchanged

Most existing API 1.0 endpoints continue to work as before, with noted exceptions:

| Endpoint | API 1.0 Behavior | API 1.1 Behavior | Compatible? |
|----------|------------------|-------------------|-------------|
| `/v1/UpdateLocation` | Works as before | Works as before (DeviceKey optional) | ✅ Yes |
| `/v1/GetLocation` | Works as before | Requires `RequestMiataruDeviceID` (access control optional) | ⚠️ Requires update |
| `/v1/GetLocationHistory` | Works as before | Requires `RequestMiataruDeviceID` (access control optional) | ⚠️ Requires update |
| `/v1/GetVisitorHistory` | Works as before | Works as before (DeviceKey optional) | ✅ Yes |
| `/v1/DeleteLocation` | Works as before | Works as before | ✅ Yes |
| `/v1/GetLocationGeoJSON` | Works as before | **BREAKING CHANGE** (see below) | ⚠️ Conditional |

### 2. Optional Parameters

All new security parameters are **optional**, but GetLocation/GetLocationHistory require `RequestMiataruDeviceID`:

- **DeviceKey** in `MiataruLocation` - Can be omitted if no DeviceKey is set
- **DeviceKey** in `MiataruGetVisitorHistory` - Can be omitted if no DeviceKey is set
- **Allowed Devices List** - Only affects behavior when explicitly set
- **RequestMiataruDeviceID** - Required in `MiataruConfig` for GetLocation/GetLocationHistory

### 3. Default Behavior

When security features are **not enabled**, behavior is identical to API 1.0 once `RequestMiataruDeviceID` is provided:

- Devices without DeviceKey set work exactly as before
- Devices without allowed devices list work exactly as before
- All response formats remain unchanged
- All error codes remain unchanged (except new 401/403 for security features)

## Breaking Changes

### GetLocation / GetLocationHistory - RequestMiataruDeviceID Required

**Endpoints:** `/v1/GetLocation`, `/v1/GetLocationHistory` (and legacy equivalents)

**Change:** `MiataruConfig.RequestMiataruDeviceID` is mandatory. Requests without it (or with an empty value) return **400 Bad Request**.

**Impact:**
- **High** for clients omitting `RequestMiataruDeviceID`
- **None** for clients already providing it

**Workaround:** Include a non-empty `RequestMiataruDeviceID` in `MiataruConfig` for all GetLocation/GetLocationHistory requests.

### GetLocationGeoJSON - 401 Unauthorized

**Endpoint:** `/v1/GetLocationGeoJSON` (both POST and GET variants)

**Change:** When a DeviceKey has been set for a device, this endpoint returns **401 Unauthorized** instead of location data.

**Impact:** 
- **High** for clients using GetLocationGeoJSON with DeviceKey-enabled devices
- **None** for clients not using GetLocationGeoJSON
- **None** for clients using GetLocationGeoJSON with devices that don't have DeviceKey set

**Rationale:** Security measure to prevent unauthorized access to location data via the public GET endpoint when DeviceKey protection is enabled.

**Workaround:** Use the `/v1/GetLocation` POST endpoint instead, which respects the allowed devices list and provides the same location data.

**Migration Path:**
1. Check if DeviceKey is set for the device
2. If set, use `/v1/GetLocation` POST endpoint instead
3. Convert response to GeoJSON format if needed

**Affected Clients:**
- Clients using GET `/v1/GetLocationGeoJSON/:id` with DeviceKey-enabled devices
- Clients using POST `/v1/GetLocationGeoJSON` with DeviceKey-enabled devices

**Non-Affected Clients:**
- Clients not using GetLocationGeoJSON
- Clients using GetLocationGeoJSON with devices that don't have DeviceKey set
- Clients using GetLocation POST endpoint

## Compatibility Matrix

### UpdateLocation

| Scenario | API 1.0 Client | API 1.1 Client | Result |
|----------|----------------|----------------|--------|
| No DeviceKey set | Works | Works | ✅ Compatible |
| DeviceKey set, provided | N/A | Works | ✅ Compatible |
| DeviceKey set, missing | N/A | 403 Forbidden | ⚠️ Requires update |
| DeviceKey set, wrong | N/A | 403 Forbidden | ⚠️ Requires update |

### GetLocation

| Scenario | API 1.0 Client | API 1.1 Client | Result |
|----------|----------------|----------------|--------|
| No allowed devices list | Works (with RequestMiataruDeviceID) | Works | ✅ Compatible |
| Missing RequestMiataruDeviceID | Works | 400 Bad Request | ❌ Requires update |
| Allowed devices list, has access | N/A | Works | ✅ Compatible |
| Allowed devices list, no access | N/A | Returns null | ⚠️ Different behavior |

### GetLocationHistory

| Scenario | API 1.0 Client | API 1.1 Client | Result |
|----------|----------------|----------------|--------|
| No allowed devices list | Works (with RequestMiataruDeviceID) | Works | ✅ Compatible |
| Missing RequestMiataruDeviceID | Works | 400 Bad Request | ❌ Requires update |
| Allowed devices list, has access | N/A | Works | ✅ Compatible |
| Allowed devices list, no access | N/A | Returns empty | ⚠️ Different behavior |

### GetVisitorHistory

| Scenario | API 1.0 Client | API 1.1 Client | Result |
|----------|----------------|----------------|--------|
| No DeviceKey set | Works | Works | ✅ Compatible |
| DeviceKey set, provided | N/A | Works | ✅ Compatible |
| DeviceKey set, missing | N/A | 403 Forbidden | ⚠️ Requires update |
| DeviceKey set, wrong | N/A | 403 Forbidden | ⚠️ Requires update |

### GetLocationGeoJSON

| Scenario | API 1.0 Client | API 1.1 Client | Result |
|----------|----------------|----------------|--------|
| No DeviceKey set | Works | Works | ✅ Compatible |
| DeviceKey set | Works | 401 Unauthorized | ❌ **BREAKING** |

## Endpoint Status

### Unchanged Endpoints

These endpoints work exactly as in API 1.0:

- ✅ `/v1/UpdateLocation` - Same behavior (DeviceKey optional)
- ✅ `/v1/GetVisitorHistory` - Same behavior (DeviceKey optional)
- ✅ `/v1/DeleteLocation` - Unchanged

### New Endpoints

These endpoints are new in API 1.1:

- 🆕 `/v1/setDeviceKey` - Set or change device key
- 🆕 `/v1/setAllowedDeviceList` - Manage allowed devices list

### Modified Endpoints

These endpoints have modified behavior:

- ⚠️ `/v1/GetLocation` - Requires `RequestMiataruDeviceID` in `MiataruConfig`
- ⚠️ `/v1/GetLocationHistory` - Requires `RequestMiataruDeviceID` in `MiataruConfig`
- ⚠️ `/v1/GetLocationGeoJSON` - Returns 401 when DeviceKey is set

## Response Format Compatibility

All response formats remain unchanged:

- **UpdateLocation Response**: Same ACK format
- **GetLocation Response**: Same MiataruLocation array format
- **GetLocationHistory Response**: Same format with MiataruServerConfig
- **GetVisitorHistory Response**: Same format with MiataruVisitors
- **Error Responses**: Same format (new 401/403 codes added)

## Error Code Compatibility

### Existing Error Codes (Unchanged)

- **400 Bad Request** - Invalid input
- **404 Not Found** - Endpoint not found
- **405 Method Not Supported** - Wrong HTTP method
- **500 Internal Server Error** - Server error

### New Error Codes (API 1.1)

- **401 Unauthorized** - GetLocationGeoJSON called when DeviceKey is set
- **403 Forbidden** - DeviceKey mismatch or access denied

**Note:** New error codes only apply when security features are enabled. Existing clients not using security features will never encounter these codes.

## Data Format Compatibility

### Request Formats

All existing request formats continue to work:

```json
// API 1.0 format - still works
{
  "MiataruLocation": [{
    "Device": "device-id",
    "Timestamp": "1376735651302",
    "Longitude": "10.837502",
    "Latitude": "49.828925",
    "HorizontalAccuracy": "50.00"
  }]
}

// API 1.1 format - optional DeviceKey
{
  "MiataruLocation": [{
    "Device": "device-id",
    "DeviceKey": "optional-key",
    "Timestamp": "1376735651302",
    "Longitude": "10.837502",
    "Latitude": "49.828925",
    "HorizontalAccuracy": "50.00"
  }]
}
```

### Response Formats

All response formats remain unchanged. New security features don't modify response structures.

## Migration Recommendations

### For API 1.0 Clients

**No action required** if:
- You don't use GetLocationGeoJSON with DeviceKey-enabled devices
- You don't need DeviceKey protection
- You don't need allowed devices list

**Action required** if:
- You use GetLocationGeoJSON and want to enable DeviceKey protection
  - **Solution**: Switch to GetLocation POST endpoint
- You want to enable DeviceKey protection
  - **Solution**: Follow [iOS Client Adoption Guide](CLIENT_ADOPTION_API_1.1.md)
- You want to use allowed devices list
  - **Solution**: Follow [iOS Client Adoption Guide](CLIENT_ADOPTION_API_1.1.md)

### For New Clients

- Use API 1.1 features from the start
- Implement DeviceKey for write operations
- Use allowed devices list for location sharing
- Use GetLocation POST instead of GetLocationGeoJSON GET

## Testing Recommendations

### Compatibility Testing

1. **Test existing API 1.0 clients** against API 1.1 server
2. **Verify all endpoints** work without DeviceKey
3. **Test GetLocationGeoJSON** with and without DeviceKey
4. **Test error handling** for new 401/403 codes
5. **Test backward compatibility** scenarios

### Security Testing

1. **Test DeviceKey validation** with correct and incorrect keys
2. **Test allowed devices access control** with various permission combinations
3. **Test unauthorized access attempts** are properly blocked
4. **Test edge cases** (empty lists, max limits, etc.)

## Risk Assessment

### Low Risk

- ✅ Existing API 1.0 clients (no changes needed)
- ✅ Clients not using GetLocationGeoJSON
- ✅ Clients not enabling security features

### Medium Risk

- ⚠️ Clients using GetLocationGeoJSON (may need to switch to GetLocation POST)
- ⚠️ Clients planning to enable DeviceKey (requires code updates)

### High Risk

- ❌ Clients using GetLocationGeoJSON with DeviceKey-enabled devices (will break)

## Conclusion

Miataru Server 2.0 and API 1.1 provide **excellent backward compatibility** with API 1.0. The only breaking change affects a specific use case (GetLocationGeoJSON with DeviceKey), and a clear workaround exists.

**Recommendation:** Existing clients can continue using API 1.0 features without modification. New security features are opt-in and provide enhanced privacy and security when needed.

## Additional Resources

- [API 1.1 Security Documentation](API_1.1_SECURITY.md)
- [iOS Client Adoption Guide](CLIENT_ADOPTION_API_1.1.md)
- [Swagger 1.1 Specification](../docs/swagger.yaml)
