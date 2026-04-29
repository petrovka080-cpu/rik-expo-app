# S-PII-1 Safe Logging Redaction Proof

Owner goal: 10K/50K+ readiness.

Raw payload logging reduced: YES.
PII/secrets logging risk reduced: YES.
Observability removed: NO.
Business logic changed: NO.
Production/staging touched: NO.
OTA/EAS triggered: NO.
Play Market / Android submit: DEFERRED_BY_OWNER, not touched.

## Scope

This wave hardens high-risk development diagnostics and shared redaction only. It does not remove incident signals, change runtime behavior, change SQL/RPC/RLS/storage, change package/native config, publish OTA, run EAS, or touch production/staging.

## Count Summary

Count source: non-test `src` and `app` files.

Before this wave:
- `console.warn`: 164
- `console.error`: 37
- `console.log`: 1
- `console.info`: 128
- `console.debug`: 0
- safe logging/redaction markers: 153

After this wave:
- `console.warn`: 153
- `console.error`: 36
- `console.log`: 1
- `console.info`: 111
- `console.debug`: 0
- safe logging/redaction markers: 182

Net result:
- raw console call-sites reduced by 29
- safe logging/redaction usage increased by 29

## Exact Call-Sites Fixed

1. `src/workers/queueWorker.ts` / `markCompactedDuplicatesCompleted`
   - Before: raw dev `console.warn` with `workerId`, kept job id, duplicate job id, raw error text.
   - After: `logger.warn("queue.worker", ...)` with `workerIdScope`, `keptJobIdScope`, `duplicateJobIdScope`, and redacted `errorMessage`.

2. `src/workers/queueWorker.ts` / `processOne`
   - Before: raw dev queue completion/job/failure diagnostics with raw `workerId`/`jobId`.
   - After: `logger.warn/error/info` with `queueWorkerScope()` and `queueJobScope()` summaries.
   - Preserved: job type, retry count, status, processing duration, failure class signal.

3. `src/workers/queueWorker.ts` / `processBatch` and `startQueueWorker`
   - Before: raw worker lifecycle and loop diagnostics with raw worker id and Supabase host.
   - After: `logger.info/warn` with `workerIdScope` and `supabaseHostScope`.
   - Preserved: enabled flags, batch size, concurrency, recovery counts, loop phase, claimed count.

4. `src/workers/processBuyerSubmitJob.ts` / `processBuyerSubmitJob`
   - Before: raw job id, request id, selected item ids, supplier keys, file names, group keys.
   - After: `logger.info/warn` with presence scopes and counts only.
   - Preserved: selected row count, bucket count, skipped supplier count, job processing duration, retry count.

5. `src/lib/api/requestDraftSync.service.ts` / `signalDirectorRequestSubmitted`
   - Before: raw request id and display number in broadcast/notification diagnostics.
   - After: `logger.info/warn` with `requestIdScope` and `displayNoScope`.
   - Preserved: source path, signal kind, broadcast/notification result, safe error message.

6. `src/lib/api/requestDraftSync.service.ts` / `syncRequestDraftViaRpc`
   - Before: raw request id and display number in draft-sync and submit diagnostics.
   - After: `logger.info` with redacted scopes.
   - Preserved: submit flag, request-created flag, line count, status, source branch, RPC version.

7. `src/screens/foreman/foreman.draftBoundary.helpers.ts` / `logDraftSyncTelemetry` and `runForemanDraftSyncCycle`
   - Before: raw request id in draft sync telemetry and warning diagnostics.
   - After: `logger.info/warn` with `requestIdScope` and `activeRequestIdScope`.
   - Preserved: phase, mutation kind, context, line counts, source path, submitted flag, error message.

8. `src/lib/security/redaction.ts`
   - Before: shared redaction covered token/signed-url style risks.
   - After: shared redaction also redacts email, phone-like strings, and obvious address PII in diagnostic text.

## Files Changed

- `src/lib/security/redaction.ts`
- `src/lib/security/redaction.test.ts`
- `src/lib/logger.test.ts`
- `src/workers/queueWorker.ts`
- `src/workers/processBuyerSubmitJob.ts`
- `src/lib/api/requestDraftSync.service.ts`
- `src/screens/foreman/foreman.draftBoundary.helpers.ts`
- `tests/security/sPii1LogRedaction.contract.test.ts`
- `artifacts/S_PII_1_safe_logging_matrix.json`
- `artifacts/S_PII_1_safe_logging_proof.md`

## Skipped Call-Sites

- `src/lib/catalog/catalog.request.service.ts`: large catalog logging cluster; requires a separate focused wave to avoid broad request-flow churn.
- `src/screens/warehouse/warehouse.seed.ts`: seed/setup diagnostics; not selected for runtime production-path hardening.
- `app/pdf-viewer.tsx`: already uses `redactPdfViewerConsolePayload` and `redactSensitiveText`.

## Tests Run

- `npm run release:verify -- --json` before editing: PASS
- `git diff --check`: PASS
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand logger redaction sPii1LogRedaction queueWorker processBuyerSubmitJob requestDraftSync foreman.draftBoundary.helpers`: PASS
- `npm test -- --runInBand`: PASS
- `npm test`: PASS
- `npm run release:verify -- --json` on dirty pre-commit tree: release technical gates PASS; readiness blocked only because release automation requires a clean repository state before publish/verify.

Final clean-tree `release:verify` is run after commit/push, with OTA still unpublished.

## Safety Confirmations

- Business logic changed: NO.
- App behavior changed: NO.
- Observability removed: NO.
- Operational signals preserved: YES.
- Raw payload logging reduced: YES.
- PII/secrets logging risk reduced: YES.
- SQL/RPC implementation changed: NO.
- RLS/storage changed: NO.
- Package/native config changed: NO.
- Production/staging touched: NO.
- Production/staging writes: NO.
- Secrets committed: NO.
- OTA/EAS triggered: NO.
- Play Market / Android submit: DEFERRED_BY_OWNER, not touched.
