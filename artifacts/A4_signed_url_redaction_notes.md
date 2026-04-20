# A4.SECURITY_SIGNED_URL_REDACTION Notes

## Status

GREEN candidate after focused and serial gates.

## Risk Surface

- `recordPlatformObservability` persisted raw `errorMessage` / `extra` values. Any caller could store `signedUrl`, `remoteUrl`, `href`, `openToken`, `Authorization`, or token-bearing error text.
- `logError` persisted raw production `app_errors` payloads and printed raw dev diagnostics.
- PDF crash breadcrumbs persisted `uriTail`, `openToken`, `errorMessage`, and `extra` without token redaction.
- PDF document viewer / session / runner dev diagnostics printed token-bearing `href`, `uri`, `rawUri`, `finalUri`, and `signedUrl` values.
- Director PDF backend dev diagnostics printed raw `signedUrl`.
- Canonical PDF transport diagnostics could surface token-bearing transport details.

## Root Cause Class

Diagnostics had no shared security redaction boundary. Individual product flows preserved correct runtime URLs, but logs/observability/breadcrumbs could store those URLs as raw diagnostic data.

## Production-Safe Fix

- Added `src/lib/security/redaction.ts` as a reusable diagnostic-only redaction boundary.
- Redacts token-bearing query parameters, bearer/JWT-like values, and sensitive object keys recursively.
- Applied redaction only at diagnostic sinks:
  - platform observability storage
  - app error payload construction and dev logging
  - logger boundary
  - PDF crash breadcrumbs
  - PDF document session/action/viewer diagnostics
  - PDF runner / attachment opener diagnostics
  - Director PDF backend dev diagnostics
  - canonical PDF transport diagnostic details

## Deliberately Unchanged

- PDF generation formulas.
- PDF/report templates.
- signed URL values returned to product code.
- viewer route semantics and `openToken` runtime matching.
- backend transport protocol.
- cache, manifest, and artifact reuse semantics.

## Why This Is Not A Hack

The fix creates a permanent owner boundary for diagnostic redaction. Product paths still receive real URLs/tokens; only diagnostic copies are sanitized before persistence or console output.
