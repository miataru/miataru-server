# Practical API 1.1 Examples (Server 2.1)

This document provides copy-paste examples aligned with the current server behavior in `miataru-server` 2.1 / API 1.1.

## 1. Mandatory `RequestMiataruDeviceID` Migration

### 1.1 `GetLocation` (old request, now invalid)

```bash
curl -s -X POST http://localhost:8090/v1/GetLocation \
  -H "Content-Type: application/json" \
  -d '{
    "MiataruGetLocation": [{"Device": "target-device-123"}]
  }'
```

Expected result:

```json
{
  "error": "Bad Request: RequestMiataruDeviceID is required"
}
```

### 1.2 `GetLocation` (migrated request)

```bash
curl -s -X POST http://localhost:8090/v1/GetLocation \
  -H "Content-Type: application/json" \
  -d '{
    "MiataruGetLocation": [{"Device": "target-device-123"}],
    "MiataruConfig": {
      "RequestMiataruDeviceID": "requesting-device-456"
    }
  }'
```

### 1.3 `GetLocationHistory` (migrated request)

```bash
curl -s -X POST http://localhost:8090/v1/GetLocationHistory \
  -H "Content-Type: application/json" \
  -d '{
    "MiataruGetLocationHistory": {
      "Device": "target-device-123",
      "Amount": "10"
    },
    "MiataruConfig": {
      "RequestMiataruDeviceID": "requesting-device-456"
    }
  }'
```

## 2. `strictDeviceKeyCheck` Behavior

`strictDeviceKeyCheck` only affects `GetLocation` requester validation.

### 2.1 Strict mode ON (default)

If requesting device `requesting-device-456` has a configured DeviceKey, `MiataruConfig.RequestMiataruDeviceKey` must match.

```bash
curl -s -X POST http://localhost:8090/v1/GetLocation \
  -H "Content-Type: application/json" \
  -d '{
    "MiataruGetLocation": [{"Device": "target-device-123"}],
    "MiataruConfig": {
      "RequestMiataruDeviceID": "requesting-device-456",
      "RequestMiataruDeviceKey": "wrong-key"
    }
  }'
```

Expected result:

```json
{
  "error": "Forbidden: RequestMiataruDeviceKey does not match (strictDeviceKeyCheck is enabled)"
}
```

### 2.2 Strict mode OFF

Set in config:

```javascript
strictDeviceKeyCheck: false
```

With strict mode off, `RequestMiataruDeviceKey` is ignored for `GetLocation` requester validation.

## 3. `setAllowedDeviceList` Real Runtime Behavior

### 3.1 Device has configured key

If target `DeviceID` already has a DeviceKey, `DeviceKey` in payload must match.

```bash
curl -s -X POST http://localhost:8090/v1/setAllowedDeviceList \
  -H "Content-Type: application/json" \
  -d '{
    "MiataruSetAllowedDeviceList": {
      "DeviceID": "target-device-123",
      "DeviceKey": "wrong-key",
      "allowedDevices": [
        {
          "DeviceID": "requesting-device-456",
          "hasCurrentLocationAccess": true,
          "hasHistoryAccess": false
        }
      ]
    }
  }'
```

Expected result:

```json
{
  "error": "Forbidden: DeviceKey does not match"
}
```

### 3.2 Device has no configured key yet

Current server behavior accepts the request for backward compatibility (payload `DeviceKey` is still required by schema/parser).

## 4. GeoJSON 401 Fallback Pattern

If target device has a configured DeviceKey, both GeoJSON endpoints return 401:

- `POST /v1/GetLocationGeoJSON`
- `GET /v1/GetLocationGeoJSON/:id`

Expected error body:

```json
{
  "error": "Unauthorized: GetLocationGeoJSON is not available when DeviceKey is set"
}
```

### 4.1 Fallback to `GetLocation`

```bash
curl -s -X POST http://localhost:8090/v1/GetLocation \
  -H "Content-Type: application/json" \
  -d '{
    "MiataruGetLocation": [{"Device": "target-device-123"}],
    "MiataruConfig": {
      "RequestMiataruDeviceID": "requesting-device-456",
      "RequestMiataruDeviceKey": "optional-requester-key"
    }
  }'
```

### 4.2 Client-side conversion to GeoJSON

```javascript
function toGeoJSON(miataruLocation) {
  if (!miataruLocation) return {};
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [
        parseFloat(miataruLocation.Longitude),
        parseFloat(miataruLocation.Latitude)
      ]
    },
    properties: {
      name: miataruLocation.Device,
      timestamp: miataruLocation.Timestamp,
      horizontalAccuracy: miataruLocation.HorizontalAccuracy,
      speed: miataruLocation.Speed,
      batteryLevel: miataruLocation.BatteryLevel,
      altitude: miataruLocation.Altitude
    }
  };
}
```

## 5. Device Slogan End-to-End Example

`getDeviceSlogan` requires requester authentication (`RequestDeviceID` + `RequestDeviceKey`) where requester key must already be configured.

### 5.1 Configure target device key

```bash
curl -s -X POST http://localhost:8090/v1/setDeviceKey \
  -H "Content-Type: application/json" \
  -d '{
    "MiataruSetDeviceKey": {
      "DeviceID": "target-device-123",
      "CurrentDeviceKey": null,
      "NewDeviceKey": "target-key"
    }
  }'
```

### 5.2 Configure requester device key

```bash
curl -s -X POST http://localhost:8090/v1/setDeviceKey \
  -H "Content-Type: application/json" \
  -d '{
    "MiataruSetDeviceKey": {
      "DeviceID": "requesting-device-456",
      "CurrentDeviceKey": null,
      "NewDeviceKey": "requester-key"
    }
  }'
```

### 5.3 Set slogan on target

```bash
curl -s -X POST http://localhost:8090/v1/setDeviceSlogan \
  -H "Content-Type: application/json" \
  -d '{
    "MiataruSetDeviceSlogan": {
      "DeviceID": "target-device-123",
      "DeviceKey": "target-key",
      "Slogan": "hello miataru"
    }
  }'
```

### 5.4 Read slogan as authenticated requester

```bash
curl -s -X POST http://localhost:8090/v1/getDeviceSlogan \
  -H "Content-Type: application/json" \
  -d '{
    "MiataruGetDeviceSlogan": {
      "DeviceID": "target-device-123",
      "RequestDeviceID": "requesting-device-456",
      "RequestDeviceKey": "requester-key"
    }
  }'
```

Expected success:

```json
{
  "MiataruDeviceSlogan": {
    "DeviceID": "target-device-123",
    "Slogan": "hello miataru"
  }
}
```
