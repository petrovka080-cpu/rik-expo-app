# C1 Concurrency Map

Status: GREEN local implementation artifact.

## Canonical Helper

- `src/lib/async/mapWithConcurrencyLimit.ts`
  - `mapWithConcurrencyLimit(items, limit, worker)` preserves result order and caps active workers.
  - `allSettledWithConcurrencyLimit(items, limit, worker)` preserves all-settled semantics and attempts every task.

## Caps Applied

1. Attachment signed URLs
   - File: `src/lib/api/proposalAttachments.service.ts`
   - Function: `mapRows`
   - Limit: 5
   - Before: one `createSignedUrl` per row via uncontrolled `Promise.all(rows.map(...))`.
   - After: signed URL work is processed through `mapWithConcurrencyLimit`.

2. Supplier attachment uploads
   - File: `src/screens/buyer/buyer.attachments.mutation.ts`
   - Function: `uploadSupplierProposalAttachmentsMutation`
   - Limit: 3
   - Before: upload promises were created immediately and awaited with `Promise.allSettled`.
   - After: upload jobs are executed with `allSettledWithConcurrencyLimit`; partial-success warning behavior is preserved.

3. Assistant catalog matching
   - File: `src/features/ai/assistantActions.ts`
   - Function: `createOrAppendForemanDraft`
   - Limit: 5
   - Before: every parsed assistant item called `rikQuickSearch` concurrently.
   - After: catalog matching uses `mapWithConcurrencyLimit` and keeps item order.

4. Foreman AI catalog resolver
   - File: `src/screens/foreman/foreman.ai.ts`
   - Function: `resolveCatalogItems`
   - Limit: 5
   - Before: every parsed AI item called `resolveForemanCatalogItem` concurrently.
   - After: resolver uses `mapWithConcurrencyLimit` and keeps item/result index mapping.

## Not Changed

- No SQL/RPC semantics changed.
- No submit/approve/PDF/finance business flow changed.
- Existing bounded small `Promise.all` calls were left alone when not dynamic fan-out risks.
