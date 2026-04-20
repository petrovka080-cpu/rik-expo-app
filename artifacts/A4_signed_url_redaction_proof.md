# A4.SECURITY_SIGNED_URL_REDACTION Proof

## Scope

Runtime URL/token values remain available to product code. A4 only redacts diagnostic copies before they reach logs, observability events, app error payloads, or PDF crash breadcrumbs.

## Focused Regression Tests

All focused tests passed:

- `npm test -- src/lib/security/redaction.test.ts --runInBand`
- `npm test -- src/lib/observability/platformObservability.redaction.test.ts --runInBand`
- `npm test -- src/lib/logError.redaction.test.ts --runInBand`
- `npm test -- src/lib/logger.test.ts --runInBand`
- `npm test -- src/lib/pdf/pdfCrashBreadcrumbs.test.ts --runInBand`
- `npm test -- src/lib/api/canonicalPdfBackendInvoker.test.ts --runInBand`
- `npm test -- src/lib/documents/pdfDocumentActions.test.ts --runInBand`
- `npm test -- tests/routes/pdf-viewer.lifecycle.test.tsx --runInBand`
- `npm test -- src/lib/pdf/pdfNativeHandoffPlan.test.ts --runInBand`
- `npm test -- tests/perf/performance-budget.test.ts --runInBand`

## Full Gates

- `npx tsc --noEmit --pretty false` PASS
- `npx expo lint` PASS
- `npm test -- --runInBand` PASS
  - Test Suites: 1 skipped, 372 passed, 372 of 373 total
  - Tests: 1 skipped, 2370 passed, 2371 total
- `npm test` PASS
  - Test Suites: 1 skipped, 372 passed, 372 of 373 total
  - Tests: 1 skipped, 2370 passed, 2371 total
- `git diff --check` PASS
  - Note: Git reports the existing line-ending normalization warning for `app/pdf-viewer.tsx`.

## Before / After

Before A4:

- Diagnostics could store raw `signedUrl`, `href`, `uri`, `openToken`, authorization headers, or token-bearing error text.
- Redaction was not owned by a shared security boundary.

After A4:

- Diagnostic sinks redact sensitive URL query params, bearer tokens, JWT-like values, and sensitive object keys.
- Product paths still receive the real runtime URLs/tokens.
- PDF viewer, document action/session, attachment opener, backend diagnostic, app error, logger, observability, and breadcrumb sinks use the shared redaction boundary.

## Production-Safe Result

- No PDF formulas changed.
- No template semantics changed.
- No viewer route semantics changed.
- No backend protocol changed.
- No ignore, suppression, artificial delay, or test weakening was introduced.
