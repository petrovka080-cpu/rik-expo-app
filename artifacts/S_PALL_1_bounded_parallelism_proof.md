# S-PALL-1 Bounded Parallelism Proof

Status: GREEN.

Owner goal: 10K/50K+ readiness.

Unbounded parallelism reduced: YES.

Business logic changed: NO.

Order semantics preserved: YES.

Fail-fast semantics preserved where applicable: YES.

Production/staging touched: NO.

OTA/EAS triggered: NO.

Play Market / Android submit: DEFERRED_BY_OWNER, not touched.

## Scope

This was a production-safe scale hardening wave. It did not touch production or staging, did not publish OTA, did not run EAS build/submit/update, did not change package/native config, did not change SQL/RPC/RLS/storage, and did not add runtime dependencies.

The wave reused the existing dependency-free helper:

- `src/lib/async/mapWithConcurrencyLimit.ts`

The helper preserves result order, fails fast by default through `mapWithConcurrencyLimit`, and supports all-settled collection through `allSettledWithConcurrencyLimit`.

## Count Summary

Before this wave:

- `Promise.all`: 50
- async-map matches: 3

After this wave:

- `Promise.all`: 45
- async-map matches: 1

The remaining call-sites are mostly fixed tuples, already-bounded helper internals, report/PDF/document builder paths, or semantics-sensitive queue/refresh paths.

## Fixed Call-sites

1. `src/lib/api/requests.ts:addRequestItemsFromRikBatchDetailed`
   - Before: `Promise.allSettled` over request-item mutation pack.
   - After: `allSettledWithConcurrencyLimit(pack, 3, ...)`.
   - Why unsafe: each pack could issue multiple request item RPC/mutation operations concurrently.
   - Safety: chunk size remains 8, all-settled behavior remains, ordered results remain, first-error handling remains.

2. `src/screens/buyer/buyer.summary.service.ts:createBuyerSummaryService.load`
   - Before: `Promise.all(scopes.map(async ...))`.
   - After: `mapWithConcurrencyLimit(scopes, 2, ...)`.
   - Why unsafe: caller-selected dynamic scopes can trigger multiple buyer summary loaders at once.
   - Safety: result object shape, cache behavior, inflight join/rerun behavior, and fail-fast semantics are preserved.

3. `src/screens/foreman/hooks/useForemanDraftBoundary.ts:clearDraftCache`
   - Before: `Promise.all(Array.from(queueKeys).map(async ...))`.
   - After: `mapWithConcurrencyLimit(Array.from(queueKeys), 2, ...)`.
   - Why unsafe: dynamic queue cleanup keys could trigger multiple offline queue writes at once.
   - Safety: no queue items are dropped; fail-fast cleanup behavior is preserved.

4. `src/screens/foreman/foreman.helpers.ts:runPool`
   - Before: custom `Promise.all` runner over dynamic item pool.
   - After: `allSettledWithConcurrencyLimit(items, n, worker)`.
   - Why unsafe: duplicate custom parallel runner bypassed the shared tested helper.
   - Safety: caller limit is still normalized to `1..20`; result order and collected `{ ok, value/error }` shape are preserved.

5. `src/lib/api/director_reports.context.ts:forEachChunkParallel`
   - Before: custom `Promise.all` runner over dynamic report lookup chunks.
   - After: `mapWithConcurrencyLimit(parts, c, ...)`.
   - Why unsafe: director report lookup/read paths can generate many chunks at larger data volumes.
   - Safety: same chunk size, same caller-provided concurrency clamp, same fail-fast behavior, no report completeness change.

## Skipped / Intentionally Untouched

- `src/workers/queueWorker.ts`: `QUEUE_SEMANTICS_DO_NOT_TOUCH`; already uses `resolveQueueWorkerBatchConcurrency`, worker semantics need a separate queue-specific proof.
- AI assistant files: remaining dynamic work already uses `mapWithConcurrencyLimit`; fixed tuples left unchanged.
- PDF/report/document builder files: fixed lookup tuples left unchanged to avoid report/document completeness risk.
- Warehouse/accountant/director fixed tuples: left unchanged because they are fixed-size refresh/report tuples, not dynamic unbounded fanout.
- `src/screens/buyer/hooks/useBuyerProposalCaches.ts`: waits on existing inflight promises instead of starting new work; left unchanged.

## Tests Run

Targeted:

- `npm test -- --runInBand mapWithConcurrencyLimit boundedParallelismS_PALL_1`
- `npm test -- --runInBand buyer.summary foreman.draftLifecycle director_reports.transport.discipline.fanout director_reports.transport.production.fanout director_reports.naming.fanout`
- `npm test -- --runInBand requests foreman.helpers`
- `npm test -- --runInBand lifecycle.s3 boundedParallelismS_PALL_1 mapWithConcurrencyLimit`

Pre-artifact checks:

- `git diff --check`: PASS
- `npx tsc --noEmit --pretty false`: PASS

Full gates are run after this proof is committed and recorded in the final status.

## Safety Confirmations

- Business logic changed: NO.
- App behavior changed: NO.
- Order semantics preserved: YES.
- Fail-fast semantics preserved where applicable: YES.
- SQL/RPC implementation changed: NO.
- RLS/storage changed: NO.
- Warehouse stock math changed: NO.
- Accountant payment semantics changed: NO.
- Director approval semantics changed: NO.
- Queue semantics changed: NO.
- PDF/report/export completeness changed: NO.
- Package/native config changed: NO.
- Production/staging touched: NO.
- Production/staging writes: NO.
- Secrets printed: NO secret values intentionally printed.
- Secrets committed: NO.
- OTA published: NO.
- EAS build triggered: NO.
- EAS submit triggered: NO.
- EAS update triggered: NO.
- Play Market / Android submit touched: NO.

## Next Recommended Wave

Next recommended production-safe wave: `S-PARSE-2` for remaining raw parse/unsafe JSON cleanup, or a queue-specific bounded worker proof if queue pressure remains the highest local hotspot.
