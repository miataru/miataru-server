# What's New in Version 2.3

This file is the short release-oriented companion to the main documentation. For full current details, prefer [`../README.md`](../README.md) and the docs listed in [`README.md`](README.md).

## miataru-server 2.3.0

Version 2.3.0 reflects the current API 1.1 implementation in this repository:

- `RequestMiataruDeviceID` is mandatory for `GetLocation` and `GetLocationHistory`
- `RequestMiataruDeviceKey` is supported for strict requester validation
- DeviceKey authentication protects write/delete and other sensitive flows
- Allowed-devices lists provide current-location and history ACLs
- Device slogans and device security status endpoints are available
- Visitor-history recording is configurable (`recordDetailedVisitorHistory`)
- HTTP and Redis concurrency limiters are available in configuration
- Docker and local runtime expectations are aligned to Node.js 20

## Operator Impact

- Existing API 1.0 clients usually continue to work after the requester-ID migration
- Operators can keep backward-compatible behavior by not enabling DeviceKeys / allowed-devices lists for legacy devices
- Browser clients should verify `cors.allowedOrigins`
- Production deployments should use `database.type: 'real'` with a real Redis instance

## Where To Read Next

- [`../README.md`](../README.md)
- [`API_1.1_SECURITY.md`](API_1.1_SECURITY.md)
- [`PRACTICAL_API_1.1_EXAMPLES.md`](PRACTICAL_API_1.1_EXAMPLES.md)
- [`TECHNICAL_SPECIFICATION.md`](TECHNICAL_SPECIFICATION.md)
