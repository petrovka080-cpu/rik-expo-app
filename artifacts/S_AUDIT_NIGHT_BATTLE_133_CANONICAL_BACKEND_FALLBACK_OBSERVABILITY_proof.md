# S Audit Night Battle 133: Canonical Backend Fallback Observability

## Selected Files
- `src/lib/api/canonicalPdfBackendInvoker.ts`
- `tests/observability/canonicalBackendInvokeFallback.contract.test.ts`

## Reason Selected
- `artifacts/A1_R7_errors.md` marked canonical backend auth/body fallback as P1: session lookup failure could fall back to the anon key, and native response body parse/read failure could collapse to `null`, with only dev-console diagnostics.
- The safe scope was to preserve runtime behavior but make the fallback observable and redacted.

## Before
- `resolve_access_token_failed`, `read_json_response_failed`, `read_text_response_failed`, and related diagnostics only reached `console.warn` in dev.
- Production triage could not distinguish session access failure from later backend authorization failure.

## After
- Canonical backend diagnostics record `platform.observability` events under `surface: "canonical_pdf_backend"`.
- Fallback diagnostics use `fallbackUsed: true`, carry `errorStage`, `errorClass`, redacted `errorMessage`, `functionName`, and `platform`.
- Existing fallback semantics are preserved: native session lookup failure can still use the anon key; parse/read failures still flow into the existing transport error path.
- New observability contract proves the access token is redacted from the stored event.

## Scope Correction
- An initial full Jest run caught that adding tests to `src/lib/api/canonicalPdfBackendInvoker.test.ts` violated historical pagination/load scope contracts.
- I moved the new tests into `tests/observability/canonicalBackendInvokeFallback.contract.test.ts` and did not weaken any existing scanner or contract.

## Gates
- focused tests: PASS
  - `npx jest src/lib/api/canonicalPdfBackendInvoker.test.ts tests/strict-null/canonicalPdfBackendInvoker.phase8.test.ts tests/observability/canonicalBackendInvokeFallback.contract.test.ts --runInBand`
- typecheck: PASS
  - `npx tsc --noEmit --pretty false`
- lint: PASS
  - `npx expo lint`
- full Jest runInBand: PASS
  - `npm test -- --runInBand`
  - 666 test suites passed, 1 skipped; 3941 tests passed, 1 skipped
- architecture scanner: PASS
  - `npx tsx scripts/architecture_anti_regression_suite.ts --json`
  - service bypass findings 0, service bypass files 0, transport controlled findings 175, unclassified current findings 0, production raw loop findings 0
- git diff --check: PASS
- release verify post-push: PENDING until push

## Safety
- No production calls, DB writes, migrations, remote env writes, deploy, OTA, live load tests, Supabase project changes, spend cap changes, Realtime capacity work, force push, tags, secrets printed, empty-catch additions, TypeScript ignore suppressions, or unsafe any-casts.
- Supabase Realtime status: `WAITING_FOR_SUPABASE_SUPPORT_RESPONSE`
