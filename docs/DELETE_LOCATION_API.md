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
    "Device": "device-id-here"
  }
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MiataruDeleteLocation` | Object | Yes | Container object for delete request |
| `Device` | String | Yes | Unique identifier of the device whose location data should be deleted |

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
```json
{
  "error": "BadRequestError",
  "message": "missing device"
}
```

## Usage Examples

### cURL Examples

#### Delete location data for a specific device
```bash
curl -H 'Content-Type: application/json' -X POST 'http://localhost:8080/v1/DeleteLocation' \
  -d '{"MiataruDeleteLocation":{"Device":"my-device-123"}}'
```

#### Delete location data using legacy endpoint
```bash
curl -H 'Content-Type: application/json' -X POST 'http://localhost:8080/DeleteLocation' \
  -d '{"MiataruDeleteLocation":{"Device":"my-device-123"}}'
```

### JavaScript Example
```javascript
const deleteLocationData = async (deviceId) => {
  const response = await fetch('http://localhost:8080/v1/DeleteLocation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      MiataruDeleteLocation: {
        Device: deviceId
      }
    })
  });
  
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
     "error": "BadRequestError",
     "message": "missing device"
   }
   ```

2. **Invalid Request Format**
   ```json
   {
     "error": "BadRequestError",
     "message": "Invalid request format"
   }
   ```

3. **Method Not Allowed**
   - Only POST requests are accepted
   - GET, PUT, DELETE, etc. return 405 Method Not Supported

## Security Considerations

- **No Authentication**: The current implementation does not include authentication
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
