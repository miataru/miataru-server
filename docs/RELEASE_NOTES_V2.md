# Release Notes - Version 2.3.0

**miataru-server 2.3.0** | **miataru API 1.1**

## Summary

Version 2.3.0 consolidates the API 1.1 security/privacy work and documents the current runtime baseline used by this repository. The server remains broadly backward compatible with API 1.0 clients after the required `RequestMiataruDeviceID` migration for `GetLocation` and `GetLocationHistory`.

## Highlights

- DeviceKey-protected writes, deletes, visitor-history reads, slogan writes, and authenticated status reads
- Allowed-devices lists for current-location and history access control
- `strictDeviceKeyCheck` enabled by default for requester validation on protected `GetLocation` / `GetLocationHistory` flows
- Optional device slogans returned from `GetLocation`
- Configurable visitor-history recording modes
- Built-in CORS and concurrency rate limiting
- Docker/runtime baseline aligned to Node.js 20

## Compatibility Notes

- Required migration: add `MiataruConfig.RequestMiataruDeviceID` to all `GetLocation` and `GetLocationHistory` requests
- `GetLocationGeoJSON` returns `401 Unauthorized` when the target device has a configured DeviceKey
- Legacy non-`/v1` endpoints remain available

## Primary References

- [`../README.md`](../README.md)
- [`API_1.1_SECURITY.md`](API_1.1_SECURITY.md)
- [`MIGRATION_REQUESTMIATARUDEVICEID.md`](MIGRATION_REQUESTMIATARUDEVICEID.md)
- [`COMPATIBILITY_ASSESSMENT.md`](COMPATIBILITY_ASSESSMENT.md)
- [`swagger.yaml`](swagger.yaml)
