# Logging & Redaction Plan

## Recommendation
Harden logging to redact sensitive fields and avoid raw payload logging.

## Current State
- Raw request bodies are logged on JSON parse errors (up to 500 chars).
- Logs may contain location data and identifiers.

## Threats Addressed
- Information disclosure via log files.
- Accidental data retention of sensitive payloads.

## Proposed Specification
### Requirements
1. **Redact sensitive fields**: Device IDs, coordinates, tokens, visitor entries.
2. **Limit raw body logging**: Avoid logging raw body by default; use structured error context.
3. **Configurable debug mode**: Allow opt-in to verbose logging for controlled environments.
4. **Audit log structure**: Log action type, device ID hash, and principal instead of raw data.

### Configuration
- Add `logging` options:
  - `logRawBodiesOnError` (default false)
  - `redactFields` list
  - `hashSalt` for hashing identifiers

## Implementation Plan
1. **Implement redaction utility**
   - Create a helper that redacts or hashes sensitive fields in log context.
2. **Update error handler**
   - Remove raw body logging or make it conditional on config.
3. **Structured logging**
   - Log JSON objects for errors with redacted fields.
4. **Tests**
   - Add unit tests for redaction utility.
   - Ensure error logs do not include raw payloads by default.
5. **Documentation**
   - Document logging and redaction behavior in README/security docs.

## Open Questions
- What is the minimum logging required for debugging without exposing sensitive data?
- Should logs include request IDs or correlation IDs?
