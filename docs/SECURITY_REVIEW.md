# Miataru Server Security Review

Date: 2025-09-15

## Scope

This review covers the Node.js Miataru server implementation in this repository, focusing on the HTTP API, middleware, request parsing, Redis persistence, and logging behavior. The goal is to identify threats, document findings, and outline tests that surface security-relevant behavior. The remediation work will be handled in a follow-up step.

## Architecture Overview

- **Entry point:** `server.js` initializes the Express app, body parsing, favicon, middleware, routes, and error handler.
- **Middleware:** CORS configuration and HTTP concurrency rate limiting are installed early.
- **Routes:** `/v1/*` and legacy endpoints in `lib/routes/location` handle location CRUD, history, and visitor history.
- **Persistence:** Redis (real or fakeredis) stores last-known location, history, and visitor history.
- **Logging:** Custom logger captures error context, including raw request bodies for JSON parse errors.

## Threat Model

### Assets

- **Location data:** Current location, historical locations, visitor history entries.
- **Device identifiers:** Device IDs used as lookup keys and access control tokens.
- **Service availability:** API responsiveness and Redis responsiveness.
- **Logs:** Raw request data and error context captured in server logs.

### Actors

- **Unauthenticated external clients:** Any party on the network can call the API.
- **Malicious/abusive clients:** Attackers who attempt to enumerate devices, exhaust resources, or inject malformed payloads.
- **Internal operators:** Administrators who configure and run the service.

### Trust Boundaries

- **Internet ↔ HTTP server:** Incoming requests cross a trust boundary into the app.
- **Application ↔ Redis:** Redis operations are assumed to be trusted but can be overwhelmed or misconfigured.
- **Application ↔ Logs:** Sensitive data may cross into logs, which are often less protected.

### Entry Points / Attack Surface

- All HTTP endpoints under `/v1/*` and legacy endpoints.
- CORS preflight/OPTIONS requests.
- Redis connection for location storage.

### STRIDE Summary

| Threat | Notes |
| --- | --- |
| **Spoofing** | No authentication or device ownership verification; device IDs are accepted as provided. |
| **Tampering** | Inputs accept arbitrary device IDs and location data without strong validation. |
| **Repudiation** | Limited audit logging; no authentication → difficult to attribute changes. |
| **Information Disclosure** | Device IDs act as bearer tokens; unauthenticated access can expose location data. Logs can include raw request bodies. |
| **Denial of Service** | Large payloads, high request concurrency, and expensive Redis operations can degrade availability. |
| **Elevation of Privilege** | Lack of auth means all callers have equivalent privileges (read/write/delete). |

## Findings

### High Risk

1. **Unauthenticated access to all location endpoints.**
   - All endpoints accept device IDs without authentication or authorization, enabling data exfiltration and deletion by any party that knows or guesses device IDs.
   - Impact: exposure of sensitive location data and unauthorized data deletion.

2. **Device IDs function as bearer tokens.**
   - The API treats the device ID as the only identifier, which allows enumeration and spoofing.
   - Impact: spoofed updates, unauthorized access, and deletion.

### Medium Risk

3. **Logging of raw request bodies on parse errors can leak sensitive data.**
   - When JSON parsing fails, the raw body is logged (up to 500 characters). This could capture secrets or sensitive location data.

4. **Limited input validation for location payloads.**
   - Required fields are checked for presence, but types, ranges, and size limits are not enforced.
   - Malicious or malformed payloads could poison stored data or cause downstream issues.

5. **Potential for resource exhaustion via oversized arrays or repeated updates.**
   - No explicit limits on the number of locations in a request, number of devices per request, or total history size per device beyond Redis list trimming.

6. **Visitor history operations can be expensive.**
   - In non-detailed visitor mode, the server loads and parses the full visitor list, sorts, and rewrites it. Attackers can trigger heavy operations by repeatedly requesting visitor history.

### Low Risk

7. **CORS allows credentialed requests for allowed origins but does not reject disallowed origins.**
   - Requests from disallowed origins are still processed; only CORS headers are omitted.
   - This can enable CSRF-like behavior for clients that do not rely on CORS enforcement.

8. **Potential configuration drift between dev/test/prod.**
   - The default configuration enables mock Redis and allows broad access; misconfiguration in production could unintentionally expose the service.

## Test Suite Additions

New tests have been added to capture security-relevant behavior and highlight where safeguards are expected:

- **Payload size enforcement:** Ensures large JSON payloads are rejected.
- **Invalid JSON handling:** Confirms malformed JSON returns a 400 error.
- **Input validation:** Verifies missing required fields are rejected.
- **CORS behavior:** Checks allowed origins receive CORS headers and disallowed origins do not.
- **Location history validation:** Ensures invalid amount values are rejected.

These tests are intended to serve as a baseline for security hardening work in a follow-up iteration.

## Recommended Next Steps (for follow-up)

- Add authentication and authorization (e.g., signed tokens or API keys).
- Enforce strict schema validation with bounds checks for all input fields.
- Introduce request size limits per endpoint (per-location array size, history request size).
- Harden logging to redact sensitive fields and avoid raw payload logging.
- Evaluate rate limiting strategy for write-heavy endpoints.
- Consider device ID entropy requirements and rotation mechanisms.

## Planning Artifacts

Each recommended action now has a dedicated specification and implementation plan in `docs/securityplanning/`:

- `authentication-authorization.md`
- `schema-validation.md`
- `request-size-limits.md`
- `logging-redaction.md`
- `rate-limiting-review.md`
- `device-id-entropy.md`
