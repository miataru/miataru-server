# Changelog

This changelog is based on Git history and the version numbers defined in `package.json`.

## [Unreleased]

### Added
- `GetLocation` response extended to include `DeviceSlogan` (`0c34009`).

### Fixed
- Corrected Swagger schema indentation for slogan fields (`8e03018`).

## [2.2.0] - 2026-03-11

### Added
- New device security status API endpoint with request/response models, routing, tests, and documentation (`9331f19`).
- Device slogan APIs (`SetDeviceSlogan`/`GetDeviceSlogan`) with authentication, tests, and documentation (`2433613`).
- Development tool for GPX export (`f749620`).

### Changed
- Strict requester `DeviceKey` validation for `GetLocationHistory` requests (`29d31a8`).
- Broader API/Swagger documentation audit and updates (`1305bbb`, `e4bb875`).

### Fixed
- Web client: clear error state when `GetLocation` returns `null` (`c22f663`).
- Web client: handled `403` responses for authenticated location requests (`76fecf0`).
- Dependency fix in statistics UI (Dependabot alert #10) (`2a35b53`).

## [2.1.0] - 2026-02-15

### Added
- Version 2 release line introduced (`c653f8e`, `55316d6`).
- `DeleteLocation` with `DeviceKey` authentication (`6fded66`).
- Statistics UI for Redis monitoring with live updates and visual enhancements (`b707965` and follow-up changes through `6958955`).
- Visitor recording added even when access is denied by allowed-device lists (`abc8094`).

### Changed
- Strict requester `DeviceKey` checks for `GetLocation` (`bbc7d1c`).
- Expanded API/Swagger documentation for security and compatibility behavior.

### Fixed
- Security/deprecation fix for `glob` override (`e426296`).

## [2.0.0] - 2026-01-25

### Added
- Modernized to Node.js 18 and Express 4 (`2545f28`).
- New `DeleteLocation` API endpoint with tests and documentation (`a04ea41`).
- Configurable CORS middleware (`9ca3e27`).
- Added options for detailed visitor history (`ab5e97b`).

### Changed
- Improved request validation and backward compatibility for multiple payload formats (`5478e8a`, `307ef91`, `acce779`).
- Updated Docker/build environment (Node 18 Alpine, reduced npm deprecation warnings) (`66e34d3`, `c36dba1`).

### Fixed
- Fixed Redis v4 compatibility and recursion issues in the compatibility layer (`e3633fc`, `d951487`).
- Improved robustness for unknown-device and location-history edge cases (`4fda17a`, `66dae6e`, `5ddf853`).
- Replaced vulnerable `optimist` dependency with `yargs` (`55c0e00`).

## [1.1.0] - 2025-09-03

### Added
- Support for `Speed`, `BatteryLevel`, and `Altitude` fields (`8ab82ea`).
- Visitor history and `/GetVisitorHistory` endpoint in the 1.1.x development line (`a2d66cc`).

### Changed
- Added/updated Dockerfile and operational documentation (`bd64789`).
- Multiple dependency updates (including `momentjs`) (`4f812df`, `76327e0`).

## [1.0.3] - 2015-03-07
- Stability fix for GeoJSON generation and `/GetLocationGeoJSON/$deviceid` (`63995cc`).

## [1.0.2] - 2015-03-07
- Added `/GetLocationGeoJSON` method for Leaflet Realtime (`4bef682`).

## [1.0.1] - 2013-11-12
- Maintenance release (`bd3cce3`).

## [1.0.0] - 2013-11-12
- First 1.x release (`b0c7dbc`).

## [0.1.0] - 2013-09-12
- First 0.1 release (`346545f`).

## [0.0.10] - 2013-09-01
- 0.0.10 release (`ca3165a`).

## [0.0.9] - 2013-08-30
- 0.0.9 release (`b87df0c`).

## [0.0.8] - 2013-08-30
- 0.0.8 release (`5cf8ef1`).

## [0.0.7] - 2013-08-29
- 0.0.7 release (`c787f1c`).

## [0.0.6] - 2013-08-29
- 0.0.6 release (`b1b789d`).

## [0.0.5] - 2013-08-29
- 0.0.5 release (`10dac57`).

## [0.0.4] - 2013-08-29
- 0.0.4 release (`063ccdd`).

## [0.0.3] - 2013-08-28
- 0.0.3 release (`a9bc5e5`).

## [0.0.2] - 2013-08-28
- 0.0.2 release (`33d5769`).

## [0.0.1] - 2013-08-20
- Initial project setup with an Express template (`ee704be`).

## Notes
- Git tags `1.2` (commit `4692bb5`) and `1.3` (commit `4d60364`) exist, but `package.json` still shows version `1.1.0` at those points.
- This changelog therefore prioritizes the version source maintained in code (`package.json`).
