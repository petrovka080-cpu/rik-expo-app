# C1 Replaced Promise.all

Status: GREEN local implementation artifact.

## Replacements

1. `src/lib/api/proposalAttachments.service.ts`
   - Replaced `Promise.all(rows.map(async row => ...))`.
   - New owner: `mapWithConcurrencyLimit(..., 5, ...)`.
   - Risk removed: attachment row count can no longer create unlimited signed URL calls.

2. `src/screens/buyer/buyer.attachments.mutation.ts`
   - Replaced immediate upload promise creation plus `Promise.allSettled(uploads)`.
   - New owner: upload job list plus `allSettledWithConcurrencyLimit(..., 3, ...)`.
   - Risk removed: 50 supplier files no longer start 50 storage uploads at once.

3. `src/features/ai/assistantActions.ts`
   - Replaced `Promise.all(items.map(...rikQuickSearch...))`.
   - New owner: `mapWithConcurrencyLimit(..., 5, ...)`.
   - Risk removed: one assistant action cannot fan out unbounded catalog search calls.

4. `src/screens/foreman/foreman.ai.ts`
   - Replaced `Promise.all(items.map(resolveForemanCatalogItem))`.
   - New owner: `mapWithConcurrencyLimit(..., 5, ...)`.
   - Risk removed: AI parsed item count is now backpressured.

## Explicitly Left Alone

- Fixed-size tuple `Promise.all` calls, such as loading two or three independent references.
- Existing chunked helpers with explicit concurrency, such as director report lookup helpers.
- Test-only concurrency assertions.

## Verification

Targeted grep over the modified critical files found no remaining uncontrolled patterns matching the replaced dynamic fan-out cases.
