# Authentication & Authorization Hardening Plan

## Recommendation
Add authentication and authorization (e.g., signed tokens or API keys) for all location endpoints.

## Current State
- All endpoints accept device IDs without any authentication or ownership verification.
- Device IDs act as bearer tokens, allowing anyone with the ID to read, write, or delete data.

## Threats Addressed
- Spoofing and tampering of device data.
- Unauthorized data access and deletion.
- Repudiation due to lack of audit trails and identity.

## Proposed Specification
### Requirements
1. **Auth Required for all write endpoints**: `/UpdateLocation`, `/DeleteLocation`, `/GetLocationHistory`.
2. **Auth Required for read endpoints**: `/GetLocation`, `/GetLocationGeoJSON`, `/GetVisitorHistory`.
3. **Device ownership enforced**: Auth token must map to one or more device IDs.
4. **Configurable auth strategy**:
   - API key per device or per tenant.
   - Optional HMAC signature for payload integrity.
5. **Revocation support**: Ability to rotate or revoke keys without downtime.
6. **Audit metadata**: Log device ID + auth principal for sensitive actions.

### API Contract Changes
- Require `Authorization: Bearer <token>` header for all `/v1/*` endpoints.
- For legacy endpoints, allow optional auth (configurable) with a deprecation plan.
- Error responses:
  - `401 Unauthorized` when missing/invalid token.
  - `403 Forbidden` when token lacks access to the requested device.

### Configuration
- Add `auth` configuration block with:
  - `enabled` (bool)
  - `provider` (`apiKey` or `hmac`)
  - `tokenHeader` (default `Authorization`)
  - `requireLegacyAuth` (bool)
  - `keyStore` (path/redis/inline list)

## Implementation Plan
1. **Design auth middleware**
   - Create `lib/middlewares/auth.js` that extracts and validates tokens.
   - Normalize into `req.auth = { principal, devices }`.
2. **Define key storage**
   - Start with config-based key map in `config/default.js`.
   - Optionally extend to Redis-based key storage.
3. **Enforce device ownership**
   - Update location routes to validate that `req.auth.devices` contains `Device`.
4. **Integrate with route registration**
   - Install auth middleware ahead of route handlers.
5. **Update tests**
   - Add unit tests for auth middleware.
   - Add integration tests for unauthorized/forbidden responses.
6. **Documentation**
   - Document new auth requirements in `README.md` and API docs.

## Open Questions
- Should we allow anonymous read access for public devices?
- How to handle multi-device tokens (e.g., fleet usage)?
- Should auth apply to the legacy endpoints by default or after a deprecation window?
