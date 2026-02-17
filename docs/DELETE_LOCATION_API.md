# DeleteLocation API Documentation

## Overview

The DeleteLocation API endpoint allows you to permanently delete all location data associated with a specific device. This includes:

- Current/last known location data
- Complete location history
- Visitor history data

## Endpoints

### Version 1 API
- **POST** `/v1/DeleteLocation`

### Default API (Legacy)
- **POST** `/DeleteLocation`

## Request Format

### Request Body Structure
```json
{
  "MiataruDeleteLocation": {
    "Device": "device-id-here",
    "DeviceKey": "your-device-key-here"
  }
}
```

**Note**: `DeviceKey` is optional and only required if a DeviceKey has been set for the device via `/v1/setDeviceKey`. See [DeviceKey Authentication](#devicekey-authentication-api-11) section below.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MiataruDeleteLocation` | Object | Yes | Container object for delete request |
| `Device` | String | Yes | Unique identifier of the device whose location data should be deleted |
| `DeviceKey` | String | Conditional | (API 1.1) DeviceKey for authentication. Required if DeviceKey has been set for this device via `/v1/setDeviceKey` |

## Response Format

### Success Response
```json
{
  "MiataruResponse": "ACK",
  "MiataruVerboseResponse": "Location data deleted for device: device-id-here",
  "MiataruDeletedCount": 3
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `MiataruResponse` | String | Always "ACK" for successful deletion |
| `MiataruVerboseResponse` | String | Human-readable message confirming deletion |
| `MiataruDeletedCount` | Number | Number of Redis keys that were deleted (0-3) |

### Error Response

**Bad Request (400):**
```json
{
  "error": "Bad Request: missing device"
}
```

**Forbidden (403) - DeviceKey Required:**
```json
{
  "error": "Forbidden: DeviceKey is required for this device"
}
```

**Forbidden (403) - DeviceKey Mismatch:**
```json
{
  "error": "Forbidden: DeviceKey does not match"
}
```

## Usage Examples

### cURL Examples

#### Delete location data for a specific device (no DeviceKey)
```bash
curl -H 'Content-Type: application/json' -X POST 'http://localhost:8080/v1/DeleteLocation' \
  -d '{"MiataruDeleteLocation":{"Device":"my-device-123"}}'
```

#### Delete location data with DeviceKey (API 1.1)
```bash
curl -H 'Content-Type: application/json' -X POST 'http://localhost:8080/v1/DeleteLocation' \
  -d '{"MiataruDeleteLocation":{"Device":"my-device-123","DeviceKey":"your-device-key-here"}}'
```

#### Delete location data using legacy endpoint
```bash
curl -H 'Content-Type: application/json' -X POST 'http://localhost:8080/DeleteLocation' \
  -d '{"MiataruDeleteLocation":{"Device":"my-device-123"}}'
```

### JavaScript Example
```javascript
const deleteLocationData = async (deviceId, deviceKey = null) => {
  const requestBody = {
    MiataruDeleteLocation: {
      Device: deviceId
    }
  };
  
  // Include DeviceKey if provided (required when DeviceKey is set for the device)
  if (deviceKey) {
    requestBody.MiataruDeleteLocation.DeviceKey = deviceKey;
  }
  
  const response = await fetch('http://localhost:8080/v1/DeleteLocation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('DeviceKey authentication failed');
    }
    throw new Error(`Delete failed: ${response.status}`);
  }
  
  const result = await response.json();
  console.log(`Deleted ${result.MiataruDeletedCount} data entries for device ${deviceId}`);
  return result;
};
```

## What Gets Deleted

The DeleteLocation operation removes the following Redis keys for the specified device:

1. **Last Known Location**: `miad:{device-id}:last`
   - Contains the most recent location data
   - May have TTL (time-to-live) if location history is disabled

2. **Location History**: `miad:{device-id}:hist`
   - Contains the complete location history as a Redis list
   - Only exists if location history is enabled

3. **Visitor History**: `miad:{device-id}:visit`
   - Contains visitor tracking data
   - Tracks who has accessed the device's location data

## Behavior Notes

### Non-Existent Devices
- Deleting data for a non-existent device returns success with `MiataruDeletedCount: 0`
- No error is thrown for missing devices

### Partial Deletions
- If only some data types exist (e.g., only current location but no history), only existing keys are deleted
- `MiataruDeletedCount` reflects the actual number of keys removed

### Atomic Operation
- All deletions are performed in parallel for efficiency
- The operation is atomic - either all deletions succeed or none do

## Error Handling

### Common Error Scenarios

1. **Missing Device Parameter**
   ```json
   {
     "error": "Bad Request: missing device"
   }
   ```

2. **Invalid Request Format**
   ```json
   {
     "error": "Bad Request: missing device"
   }
   ```

3. **Method Not Allowed**
   - Only POST requests are accepted
   - GET, PUT, DELETE, etc. return 405 Method Not Supported

4. **DeviceKey Required (403 Forbidden)**
   ```json
   {
     "error": "Forbidden: DeviceKey is required for this device"
   }
   ```

5. **DeviceKey Mismatch (403 Forbidden)**
   ```json
   {
     "error": "Forbidden: DeviceKey does not match"
   }
   ```

## DeviceKey Authentication (API 1.1)

DeleteLocation supports DeviceKey authentication to protect against unauthorized deletion of location data.

### When DeviceKey is Required

- **DeviceKey is set**: If a DeviceKey has been set for a device via `/v1/setDeviceKey`, the `DeviceKey` parameter must be provided in the request
- **DeviceKey is not set**: If no DeviceKey has been set, the request works without authentication (backward compatible with API 1.0)

### Using DeviceKey

Include the `DeviceKey` parameter in the `MiataruDeleteLocation` object:

```json
{
  "MiataruDeleteLocation": {
    "Device": "your-device-id",
    "DeviceKey": "your-secure-key-here"
  }
}
```

**Important**: The DeviceKey must match the key stored for the device. If the keys do not match or the DeviceKey is missing when required, a 403 Forbidden error is returned.

### Error Responses

- **403 Forbidden - DeviceKey Required**: Returned when DeviceKey is set for the device but not provided in the request
- **403 Forbidden - DeviceKey Mismatch**: Returned when the provided DeviceKey does not match the stored key

## Security Considerations

- **DeviceKey Authentication**: When a DeviceKey is set, it must be provided and validated before deletion (API 1.1)
- **Backward Compatibility**: Devices without DeviceKey set work exactly as before (no authentication required)
- **Device ID Validation**: Device IDs are not validated for format or ownership
- **Permanent Deletion**: Deleted data cannot be recovered
- **No Audit Trail**: Deletion operations are not logged

## Integration with Other APIs

### Typical Workflow
1. **UpdateLocation**: Store location data
2. **GetLocation**: Retrieve current location
3. **GetLocationHistory**: Retrieve location history
4. **DeleteLocation**: Remove all data when no longer needed

### Data Lifecycle
```
Create → Read → Update → Delete
   ↓       ↓       ↓       ↓
UpdateLocation → GetLocation → UpdateLocation → DeleteLocation
```

## Testing

The DeleteLocation API is thoroughly tested with:

- **Unit Tests**: Response model validation
- **Integration Tests**: Complete API workflow testing
- **Error Handling Tests**: Invalid request scenarios
- **Workflow Tests**: End-to-end location lifecycle testing

Run tests with:
```bash
npm test                    # Unit tests
npm run test:integration    # Integration tests
```

## Version Compatibility

- **v1 API**: `/v1/DeleteLocation` - Recommended for new implementations
- **Legacy API**: `/DeleteLocation` - Maintained for backward compatibility
- Both endpoints provide identical functionality
