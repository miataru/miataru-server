# Release Notes - Version 2.0.0

**miataru-server 2.0.0** | **miataru API 1.1.0**

## 🎉 Major Release: Security & Privacy Enhancements

Version 2.0 introduces enterprise-grade security features while maintaining **broad backward compatibility** with existing v1.0 clients. Security features remain opt-in, but GetLocation/GetLocationHistory now require `RequestMiataruDeviceID`.

## ✨ New Features

### DeviceKey Authentication
- Secure device-level authentication using cryptographic keys (up to 256 Unicode characters)
- Protects location updates, visitor history, and access control configuration
- New endpoint: `POST /v1/setDeviceKey` for key management

### Allowed Devices Access Control
- Fine-grained permissions for location sharing
- Separate controls for current location and history access
- Privacy-first design: location hidden from unauthorized devices
- New endpoint: `POST /v1/setAllowedDeviceList` for access management

## 🔄 Enhanced Endpoints

- **UpdateLocation**: Optional DeviceKey validation when enabled
- **GetLocation**: Requires `RequestMiataruDeviceID` and supports access control via allowed devices list
- **GetLocationHistory**: Requires `RequestMiataruDeviceID` and enforces granular permissions
- **GetVisitorHistory**: DeviceKey authentication support

## ⚠️ Breaking Changes

- **GetLocation / GetLocationHistory**: `MiataruConfig.RequestMiataruDeviceID` is now mandatory
  - *Migration*: Include a non-empty `RequestMiataruDeviceID` in all GetLocation/GetLocationHistory requests

- **GetLocationGeoJSON**: Returns `401 Unauthorized` when DeviceKey is set for requested devices
  - *Migration*: Use `GetLocation` and format as GeoJSON client-side, or disable DeviceKey if GeoJSON access is required

## 🔒 Security Improvements

- DeviceKey authentication prevents unauthorized location updates
- Fine-grained access control limits who can view location data
- Privacy-first defaults protect user data
- Constant-time key comparison prevents timing attacks

## ✅ Backward Compatibility

- Most v1.0 endpoints continue to work unchanged
- Optional parameters can be omitted (except `RequestMiataruDeviceID` for GetLocation/GetLocationHistory)
- Default behavior unchanged when security features are disabled
- Legacy endpoints (`/UpdateLocation`, `/GetLocation`, etc.) continue to work

## 📚 Documentation

- Complete migration guide: [CLIENT_ADOPTION_API_1.1.md](CLIENT_ADOPTION_API_1.1.md)
- Security documentation: [API_1.1_SECURITY.md](API_1.1_SECURITY.md)
- Full changelog: [WHATS_NEW_V2.md](WHATS_NEW_V2.md)

## 🚀 Upgrade Notes

**Action required for GetLocation/GetLocationHistory clients** - Update requests to include `RequestMiataruDeviceID`. Other endpoints remain backward compatible.

For clients adopting new security features, see the migration guide above.

---

*For detailed information, see [WHATS_NEW_V2.md](WHATS_NEW_V2.md)*
