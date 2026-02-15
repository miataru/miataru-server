# Migration Guide: RequestMiataruDeviceID is Now Mandatory

## Overview

Starting with API 1.1, `RequestMiataruDeviceID` is now **mandatory** for all `GetLocation` and `GetLocationHistory` requests. This change improves security, enables access control, and supports visitor history tracking.

`GetLocation` also supports optional `RequestMiataruDeviceKey` in `MiataruConfig`. With `strictDeviceKeyCheck: true` (default), this key is validated whenever the requesting device already has a DeviceKey configured.

For compatibility, the server parser also accepts `requestingDeviceID` and `requestingDeviceKey`.

## What Changed?

### Before (API 1.0)
```json
{
  "MiataruGetLocation": [
    {
      "Device": "target-device-id"
    }
  ]
}
```

### After (API 1.1 - Required)
```json
{
  "MiataruConfig": {
    "RequestMiataruDeviceID": "your-client-identifier",
    "RequestMiataruDeviceKey": "optional-requester-device-key"
  },
  "MiataruGetLocation": [
    {
      "Device": "target-device-id"
    }
  ]
}
```

## Impact

- **All clients** must update their `GetLocation` and `GetLocationHistory` requests
- Requests without `RequestMiataruDeviceID` will return **400 Bad Request**
- With `strictDeviceKeyCheck: true` (default), protected requester devices must include matching `RequestMiataruDeviceKey` in `GetLocation`
- Other endpoints (UpdateLocation, GetVisitorHistory, DeleteLocation) are **not affected**

## Error Response

If `RequestMiataruDeviceID` is missing or empty:

```json
{
  "error": "Bad Request: RequestMiataruDeviceID is required"
}
```

HTTP Status Code: **400 Bad Request**

## Migration Steps

### Step 1: Choose an Identifier

The `RequestMiataruDeviceID` can be any string that identifies your client. Common choices:

- **Device ID**: Unique identifier for the device making the request
- **Application ID**: Identifier for your application
- **User ID**: Identifier for the user
- **URL/Domain**: Website URL or domain name (for web clients)
- **Any unique string**: As long as it identifies the requesting client

**Examples:**
- `"my-ios-app-v1.0"`
- `"webclient"`
- `"https://myapp.com"`
- `"user-12345"`
- Device UUID: `"550e8400-e29b-41d4-a716-446655440000"`

### Step 2: Update GetLocation Requests

**JavaScript/TypeScript:**
```javascript
const response = await fetch('https://service.miataru.com/v1/GetLocation', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    "MiataruConfig": {
      "RequestMiataruDeviceID": "your-client-identifier",
      "RequestMiataruDeviceKey": "optional-requester-device-key"
    },
    "MiataruGetLocation": [
      {
        "Device": "target-device-id"
      }
    ]
  })
});
```

**Swift (iOS):**
```swift
struct GetLocationRequest: Codable {
    let MiataruConfig: MiataruConfig
    let MiataruGetLocation: [MiataruGetLocationDevice]
}

struct MiataruConfig: Codable {
    let RequestMiataruDeviceID: String
    let RequestMiataruDeviceKey: String?
}

let request = GetLocationRequest(
    MiataruConfig: MiataruConfig(
        RequestMiataruDeviceID: UIDevice.current.identifierForVendor?.uuidString ?? "unknown",
        RequestMiataruDeviceKey: nil
    ),
    MiataruGetLocation: [
        MiataruGetLocationDevice(Device: targetDeviceID)
    ]
)
```

**Python:**
```python
import requests

response = requests.post(
    'https://service.miataru.com/v1/GetLocation',
    json={
        "MiataruConfig": {
            "RequestMiataruDeviceID": "your-client-identifier",
            "RequestMiataruDeviceKey": "optional-requester-device-key"
        },
        "MiataruGetLocation": [
            {
                "Device": "target-device-id"
            }
        ]
    }
)
```

### Step 3: Update GetLocationHistory Requests

**JavaScript/TypeScript:**
```javascript
const response = await fetch('https://service.miataru.com/v1/GetLocationHistory', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    "MiataruConfig": {
      "RequestMiataruDeviceID": "your-client-identifier"
    },
    "MiataruGetLocationHistory": {
      "Device": "target-device-id",
      "Amount": "100"
    }
  })
});
```

**Swift (iOS):**
```swift
struct GetLocationHistoryRequest: Codable {
    let MiataruConfig: MiataruConfig
    let MiataruGetLocationHistory: MiataruGetLocationHistory
}

struct MiataruGetLocationHistory: Codable {
    let Device: String
    let Amount: String
}

let request = GetLocationHistoryRequest(
    MiataruConfig: MiataruConfig(
        RequestMiataruDeviceID: UIDevice.current.identifierForVendor?.uuidString ?? "unknown",
        RequestMiataruDeviceKey: nil
    ),
    MiataruGetLocationHistory: MiataruGetLocationHistory(
        Device: targetDeviceID,
        Amount: "100"
    )
)
```

## Web Client Update

The Miataru web client has been updated with a default `RequestMiataruDeviceID` of `"webclient"`. Users can change this value in the settings dialog.

## Testing

After updating your code:

1. **Test GetLocation**: Verify requests include `RequestMiataruDeviceID`
2. **Test GetLocationHistory**: Verify requests include `RequestMiataruDeviceID`
3. **Test strict requester validation**: If requester devices use DeviceKey, verify `RequestMiataruDeviceKey` handling for GetLocation
4. **Test Error Handling**: Verify 400 Bad Request is handled when `RequestMiataruDeviceID` is missing

## FAQ

### Q: What happens if I don't update my client?

A: All `GetLocation` and `GetLocationHistory` requests will return 400 Bad Request with the error message "RequestMiataruDeviceID is required".

### Q: Can I use the same RequestMiataruDeviceID for all requests?

A: Yes, you can use the same identifier for all requests from the same client. However, using unique identifiers per device/user provides better access control and visitor tracking.

### Q: Is RequestMiataruDeviceID case-sensitive?

A: Yes, the identifier is case-sensitive. Use consistent casing across all requests.

### Q: What's the maximum length?

A: There's no explicit maximum length, but keep it reasonable (under 256 characters is recommended).

### Q: Do I need to update UpdateLocation or GetVisitorHistory?

A: No, `RequestMiataruDeviceID` is only required for `GetLocation` and `GetLocationHistory`.

## Additional Resources

- [API 1.1 Security Documentation](API_1.1_SECURITY.md)
- [Client Adoption Guide](CLIENT_ADOPTION_API_1.1.md)
- [Compatibility Assessment](COMPATIBILITY_ASSESSMENT.md)
- [Swagger API Specification](../docs/swagger.yaml)

## Support

If you encounter issues during migration:

1. Check that `RequestMiataruDeviceID` is included in the `MiataruConfig` object
2. Verify the identifier is not empty or null
3. Check the error response for specific details
4. Review the [API 1.1 Security Documentation](API_1.1_SECURITY.md) for more information
