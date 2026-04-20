# A4.SECURITY_SIGNED_URL_REDACTION Proof

## Clean Base

- `HEAD == origin/main == a3ec5a61e3fed47c895d0dc37161b4a75699f6cc` before this naming-compliance artifact pass.
- `git status --short` was empty before adding these exact-named artifacts.
- `git diff --stat` was empty before adding these exact-named artifacts.

## Trace / Grep Proof

Command:

```bash
rg -n "signedUrl|openToken|access_token|X-Amz|signature|token=" app/pdf-viewer.tsx src/lib/documents/attachmentOpener.ts src/lib/api/directorProductionReportPdfBackend.service.ts src/lib/api/canonicalPdfBackendInvoker.ts src/lib/pdfRunner.ts src/lib/documents/pdfDocumentActions.ts src/lib/observability src/lib/logError.ts src/lib/logger.ts src/lib/pdf/pdfCrashBreadcrumbs.ts
```

Result summary:

- Remaining `signedUrl` and `openToken` references are runtime values, typed return fields, test fixtures, or redacted diagnostics.
- Confirmed diagnostic output sites call `redactSensitiveText`, `redactSensitiveRecord`, or store normalized secret presence instead of raw secrets.
- Product URL values are not replaced before real PDF open/handoff.

## Redacted Output Examples

- `https://storage.example.test/file.pdf?token=secret` becomes `https://storage.example.test/file.pdf?token=[redacted]`.
- `/pdf-viewer?sessionId=s1&openToken=secret` becomes `/pdf-viewer?sessionId=s1&openToken=[redacted]`.
- `{ signedUrl: "https://x.test/file.pdf?token=secret" }` becomes `{ signedUrl: "[redacted]" }`.
- `Bearer eyJ...` becomes `Bearer [redacted]`.

## Focused Tests

All focused tests passed during the A4 implementation:

```bash
npm test -- src/lib/security/redaction.test.ts --runInBand
npm test -- src/lib/observability/platformObservability.redaction.test.ts --runInBand
npm test -- src/lib/logError.redaction.test.ts --runInBand
npm test -- src/lib/logger.test.ts --runInBand
npm test -- src/lib/pdf/pdfCrashBreadcrumbs.test.ts --runInBand
npm test -- src/lib/api/canonicalPdfBackendInvoker.test.ts --runInBand
npm test -- src/lib/documents/pdfDocumentActions.test.ts --runInBand
npm test -- src/lib/documents/attachmentOpener.test.ts --runInBand
npm test -- tests/routes/pdf-viewer.lifecycle.test.tsx --runInBand
npm test -- src/lib/api/directorRolePdfBackends.test.ts --runInBand
```

## Full Gates

All release gates passed for commit `a3ec5a61e3fed47c895d0dc37161b4a75699f6cc`:

```bash
npx tsc --noEmit --pretty false
npx expo lint
npm test -- --runInBand
npm test
git diff --check
```

Results:

- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS, 372 passed / 1 skipped suites, 2370 passed / 1 skipped tests
- `npm test`: PASS, 372 passed / 1 skipped suites, 2370 passed / 1 skipped tests
- `git diff --check`: PASS

## Runtime Behavior Confirmation

- Real signed URLs are still returned from backend invokers and used by viewer/open paths.
- Redaction is applied only to diagnostic copies.
- No PDF formula, template, route, network transport, or viewer behavior was changed for redaction.

## Release

- Commit: `a3ec5a61e3fed47c895d0dc37161b4a75699f6cc`
- Pushed to `main`.
- OTA development: `d9ecaeae-ecd0-4fe6-923b-9e1f9fbfcfc2`
- OTA preview: `005aecfe-83c3-4c91-a11d-70bdc39fc6f4`
- OTA production: `eba89846-ebdb-4fd9-b0cf-682a1dd0ede3`
