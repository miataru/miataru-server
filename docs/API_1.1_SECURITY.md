# Miataru API 1.1 Security Features

## Overview

API version 1.1 introduces security and privacy enhancements to the Miataru server while maintaining broad backward compatibility with API 1.0 clients (GetLocation/GetLocationHistory now require `RequestMiataruDeviceID`). These features include:

1. **RequestMiataruDeviceID (Mandatory)** - Required identifier for all GetLocation and GetLocationHistory requests
2. **DeviceKey Authentication** - Protects write operations and visitor history access
3. **Allowed Devices List** - Granular access control for location data sharing

## RequestMiataruDeviceID (Mandatory in API 1.1)

**BREAKING CHANGE:** Starting with API 1.1, `RequestMiataruDeviceID` is now **mandatory** for all `GetLocation` and `GetLocationHistory` requests. Requests without this field will return a 400 Bad Request error.

### Purpose

The `RequestMiataruDeviceID` identifies the device making the request. This is used for:
- Access control (allowed devices list)
- Visitor history tracking
- Security auditing

### Usage

Include `RequestMiataruDeviceID` in the `MiataruConfig` object:

**GetLocation:**
```json
{
  "MiataruConfig": {
    "RequestMiataruDeviceID": "your-client-identifier"
  },
  "MiataruGetLocation": [
    {
      "Device": "target-device-id"
    }
  ]
}
```

**GetLocationHistory:**
```json
{
  "MiataruConfig": {
    "RequestMiataruDeviceID": "your-client-identifier"
  },
  "MiataruGetLocationHistory": {
    "Device": "target-device-id",
    "Amount": "10"
  }
}
```

### Migration

**For existing clients:** Update all `GetLocation` and `GetLocationHistory` requests to include `RequestMiataruDeviceID` in the `MiataruConfig` object. The identifier can be:
- A unique device ID
- An application identifier
- A URL or domain name
- Any string that identifies the requesting client

**Error Response:**
```json
{
  "error": "Bad Request: RequestMiataruDeviceID is required"
}
```

## DeviceKey Concept

The DeviceKey is a 256-character unicode string that acts as a password for a device. Once set, it must be provided for:

- **UpdateLocation** - Writing location data to the server
- **DeleteLocation** - Deleting all location data for a device
- **GetVisitorHistory** - Accessing visitor history information

### Setting a DeviceKey

Use the `/v1/setDeviceKey` endpoint to set or change a device key:

**First-time setup (no existing key):**
```json
{
  "MiataruSetDeviceKey": {
    "DeviceID": "your-device-id",
    "CurrentDeviceKey": null,
    "NewDeviceKey": "your-secure-key-here"
  }
}
```

**Changing an existing key:**
```json
{
  "MiataruSetDeviceKey": {
    "DeviceID": "your-device-id",
    "CurrentDeviceKey": "old-key",
    "NewDeviceKey": "new-key"
  }
}
```

### Using DeviceKey in UpdateLocation

When a DeviceKey is set for a device, it must be included in each `MiataruLocation` element:

```json
{
  "MiataruLocation": [
    {
      "Device": "your-device-id",
      "DeviceKey": "your-secure-key-here",
      "Timestamp": "1376735651302",
      "Longitude": "10.837502",
      "Latitude": "49.828925",
      "HorizontalAccuracy": "50.00"
    }
  ]
}
```

**Important:** The DeviceKey parameter should be placed right under the Device parameter in the MiataruLocation array element.

### Using DeviceKey in DeleteLocation

When a DeviceKey is set for a device, it must be included in the request:

```json
{
  "MiataruDeleteLocation": {
    "Device": "your-device-id",
    "DeviceKey": "your-secure-key-here"
  }
}
```

**Important:** The DeviceKey parameter should be placed right under the Device parameter in the MiataruDeleteLocation object.

### Using DeviceKey in GetVisitorHistory

When a DeviceKey is set for a device, it must be included in the request:

```json
{
  "MiataruGetVisitorHistory": {
    "Device": "your-device-id",
    "Amount": "10",
    "DeviceKey": "your-secure-key-here"
  }
}
```

### Error Responses

- **403 Forbidden** - Returned when:
  - DeviceKey is required but not provided
  - DeviceKey does not match the stored key
  - CurrentDeviceKey does not match when changing an existing key

## Allowed Devices List

The allowed devices list controls which devices can access location and location history data for a specific device. This provides granular access control:

- **hasCurrentLocationAccess** - Permission to access current location via GetLocation
- **hasHistoryAccess** - Permission to access location history via GetLocationHistory

### Setting Allowed Devices List

Use the `/v1/setAllowedDeviceList` endpoint to set or update the allowed devices list:

```json
{
  "MiataruSetAllowedDeviceList": {
    "DeviceID": "your-device-id",
    "DeviceKey": "your-secure-key-here",
    "allowedDevices": [
      {
        "DeviceID": "friend-device-id",
        "hasCurrentLocationAccess": true,
        "hasHistoryAccess": false
      },
      {
        "DeviceID": "family-device-id",
        "hasCurrentLocationAccess": true,
        "hasHistoryAccess": true
      }
    ]
  }
}
```

**Important Notes:**
- The client is expected to maintain the full list on the client-side
- Always send the complete list to update (server replaces the entire list)
- Maximum 256 devices in the list
- Requires valid DeviceKey authentication

### Access Control Behavior

**GetLocation:**
- If allowed devices list is **not enabled**: Returns location data when `RequestMiataruDeviceID` is provided (backward compatible)
- If allowed devices list is **enabled**: Only devices with `hasCurrentLocationAccess: true` receive location data
- Devices without permission receive location as `null` (as if device doesn't exist)
- **Visitor history**: The requesting device is always recorded in the target device's visitor history when the target device exists, regardless of whether the allowed list grants access. The device owner can see all visitors (including those who did not receive location data) via GetVisitorHistory.

**GetLocationHistory:**
- If allowed devices list is **not enabled**: Returns location history when `RequestMiataruDeviceID` is provided (backward compatible)
- If allowed devices list is **enabled**: Only devices with `hasHistoryAccess: true` receive location history
- Devices without permission receive empty history (as if history doesn't exist)

## Backward Compatibility

### API 1.0 Clients

**REQUIRED UPDATE:** All clients must add `RequestMiataruDeviceID` to `GetLocation` and `GetLocationHistory` requests. This is the only breaking change.

After adding `RequestMiataruDeviceID`, all other features remain backward compatible:

- Devices without DeviceKey set work exactly as before
- Devices without allowed devices list work exactly as before
- All existing endpoints maintain the same response format
- Optional parameters (DeviceKey) can be omitted

### Migration Path

1. **Required Update**: Add `RequestMiataruDeviceID` to all GetLocation and GetLocationHistory requests
2. **Optional Migration**: Clients can opt-in to security features by setting DeviceKey
3. **Gradual Rollout**: Set DeviceKey for devices that need protection

## Breaking Changes

### RequestMiataruDeviceID is Mandatory

**BREAKING CHANGE:** `RequestMiataruDeviceID` is now mandatory for all `GetLocation` and `GetLocationHistory` requests. Requests without this field will return 400 Bad Request.

**Impact:** All clients must update their GetLocation and GetLocationHistory requests to include `RequestMiataruDeviceID` in the `MiataruConfig` object.

**Migration:** See the [RequestMiataruDeviceID section](#requestmiatarudeviceid-mandatory-in-api-11) above for details.

### GetLocationGeoJSON

**BREAKING CHANGE:** If a DeviceKey has been set for a device, the `/v1/GetLocationGeoJSON` endpoint (both POST and GET variants) will return **401 Unauthorized**.

This is a security measure to prevent unauthorized access to location data via the public GET endpoint when DeviceKey protection is enabled.

**Workaround:** Use the `/v1/GetLocation` POST endpoint instead, which respects the allowed devices list.

## Security Best Practices

1. **DeviceKey Selection:**
   - Use a strong, randomly generated key (256 characters recommended)
   - Store the key securely on the client device
   - Never log or expose the DeviceKey

2. **Allowed Devices Management:**
   - Regularly review and update the allowed devices list
   - Remove access for devices that no longer need it
   - Use granular permissions (separate currentLocation and history access)

3. **Error Handling:**
   - Handle 403 Forbidden errors gracefully
   - Prompt user to re-enter DeviceKey if validation fails
   - Don't expose DeviceKey in error messages or logs

## Error Codes

- **400 Bad Request** - Invalid input (missing required fields, invalid format)
  - Missing or empty `RequestMiataruDeviceID` in GetLocation or GetLocationHistory
  - Invalid request structure
- **401 Unauthorized** - GetLocationGeoJSON called when DeviceKey is set
- **403 Forbidden** - DeviceKey mismatch or access denied
- **500 Internal Server Error** - Server-side error

## Examples

### Complete Workflow

1. **Set DeviceKey (first time):**
```bash
curl -X POST http://localhost:3000/v1/setDeviceKey \
  -H "Content-Type: application/json" \
  -d '{
    "MiataruSetDeviceKey": {
      "DeviceID": "device-123",
      "CurrentDeviceKey": null,
      "NewDeviceKey": "my-secure-key-256-chars..."
    }
  }'
```

2. **Update Location with DeviceKey:**
```bash
curl -X POST http://localhost:3000/v1/UpdateLocation \
  -H "Content-Type: application/json" \
  -d '{
    "MiataruLocation": [{
      "Device": "device-123",
      "DeviceKey": "my-secure-key-256-chars...",
      "Timestamp": "1376735651302",
      "Longitude": "10.837502",
      "Latitude": "49.828925",
      "HorizontalAccuracy": "50.00"
    }]
  }'
```

3. **Set Allowed Devices:**
```bash
curl -X POST http://localhost:3000/v1/setAllowedDeviceList \
  -H "Content-Type: application/json" \
  -d '{
    "MiataruSetAllowedDeviceList": {
      "DeviceID": "device-123",
      "DeviceKey": "my-secure-key-256-chars...",
      "allowedDevices": [{
        "DeviceID": "friend-device-456",
        "hasCurrentLocationAccess": true,
        "hasHistoryAccess": false
      }]
    }
  }'
```

4. **Get Location (with access control):**
```bash
curl -X POST http://localhost:3000/v1/GetLocation \
  -H "Content-Type: application/json" \
  -d '{
    "MiataruGetLocation": [{"Device": "device-123"}],
    "MiataruConfig": {
      "RequestMiataruDeviceID": "friend-device-456"
    }
  }'
```

## Migration Checklist

- [ ] Review existing clients and identify which need DeviceKey protection
- [ ] Generate secure DeviceKeys for devices that need protection
- [ ] Update client code to include DeviceKey in UpdateLocation requests
- [ ] Update client code to include DeviceKey in DeleteLocation requests
- [ ] Update client code to include DeviceKey in GetVisitorHistory requests
- [ ] Test DeviceKey validation and error handling
- [ ] Set up allowed devices lists for devices that need sharing
- [ ] Test access control with allowed devices list
- [ ] Update error handling for 403 Forbidden responses
- [ ] Document DeviceKey storage and management in client app
- [ ] Test backward compatibility with existing clients
