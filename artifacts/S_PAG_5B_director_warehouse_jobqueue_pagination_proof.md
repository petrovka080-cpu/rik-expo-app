# S-PAG-5B Director/Warehouse/Job Queue Query Hardening Proof

Owner goal: 10K/50K+ readiness.

Play Market / Android submit: DEFERRED_BY_OWNER, not touched.
PDF/report/export/document-builder reads capped: NO.
Detail full reads changed: NO.
Director approval semantics changed: NO.
Warehouse stock math changed: NO.
Job queue semantics changed: NO unless explicitly listed and test-covered.
Production touched: NO.
OTA/EAS triggered: NO.

## Baseline

- Mode: production-safe repo-only query hardening.
- S-PAG-5A prerequisite: committed and pushed at `2cb698f14925c3fb554ecaafa2bc24ad53b77ac5`.
- Pre-wave local recount: `108` unbounded selects across `45` files.
- Post-wave local recount: `101` unbounded selects across `42` files.
- Target: fix 5-8 safe list/search call-sites.
- Fixed: 7 safe list/search call-sites.

## Files Changed

- `src/screens/director/director.data.ts`
- `src/screens/director/director.repository.ts`
- `src/lib/api/suppliers.ts`
- `src/components/foreman/WorkTypePicker.tsx`
- `tests/api/topListPaginationBatch5B.contract.test.ts`
- `artifacts/S_PAG_5B_director_warehouse_jobqueue_pagination_matrix.json`
- `artifacts/S_PAG_5B_director_warehouse_jobqueue_pagination_proof.md`

## Fixed Call-Sites

1. `src/screens/director/director.data.ts` / `loadDirectorRowsFallback` / `requests`
   - Before: unbounded `requests.select("id, submitted_at, status").not("submitted_at", "is", null)`.
   - After: page-through-all windows with `.order("submitted_at", { ascending: false }).order("id", { ascending: false }).range(page.from, page.to)`.
   - Safety: preserves full fallback result and existing post-fetch sort/rank behavior.

2. `src/screens/director/director.data.ts` / `loadDirectorRowsFallback` / `request_items`
   - Before: unbounded `request_items` read by all fallback request ids and director pending statuses.
   - After: page-through-all windows with `.order("request_id", { ascending: true }).order("id", { ascending: true }).range(page.from, page.to)`.
   - Safety: preserves filters and returns all rows before existing normalization/sort.

3. `src/screens/director/director.repository.ts` / `loadDirectorRowsFallback` / `requests`
   - Before: unbounded `requests.select("id, submitted_at, status").not("submitted_at", "is", null)`.
   - After: page-through-all windows with stable `submitted_at/id` ordering and `.range(page.from, page.to)`.
   - Safety: repository fallback remains complete and still uses the primary RPC first.

4. `src/screens/director/director.repository.ts` / `loadDirectorRowsFallback` / `request_items`
   - Before: unbounded fallback `request_items` read by request ids and director pending statuses.
   - After: page-through-all windows with stable `request_id/id` ordering and `.range(page.from, page.to)`.
   - Safety: no approval queue rows are hidden; all pages are accumulated before normalization.

5. `src/lib/api/suppliers.ts` / `listSuppliers` / `suppliers`
   - Before: unbounded supplier list ordered by `name`, followed by local search filtering.
   - After: page-through-all windows with `.order("name", { ascending: true }).order("id", { ascending: true }).range(page.from, page.to)`.
   - Safety: local search filter and return shape are preserved.

6. `src/lib/api/suppliers.ts` / `listSupplierFiles` / `supplier_files`
   - Before: unbounded file list for one supplier ordered by `created_at desc`.
   - After: page-through-all windows with `.order("created_at", { ascending: false }).order("id", { ascending: false }).range(page.from, page.to)`.
   - Safety: supplier detail completeness is preserved because all pages are accumulated.

7. `src/components/foreman/WorkTypePicker.tsx` / `WorkTypePicker` / `v_work_types_picker`
   - Before: unbounded picker list ordered by `family_sort` and `work_name_ru`.
   - After: page-through-all windows with `.order("family_sort", { ascending: true }).order("work_name_ru", { ascending: true }).order("code", { ascending: true }).range(page.from, page.to)`.
   - Safety: local search, family grouping, and dedupe by code are preserved.

## Inspected And Intentionally Untouched

- `src/screens/warehouse/warehouse.api.repo.ts`
  - Classification: `WAREHOUSE_STOCK_SEMANTICS_DO_NOT_TOUCH`.
  - Reason: incoming ledger/report and incoming line detail reads require completeness and separate warehouse/report proof.

- `src/lib/infra/jobQueue.ts`
  - Classification: `JOB_QUEUE_SEMANTICS_UNCLEAR`.
  - Reason: remaining `.select()` is an insert-return `.single()`; queue claim/retry/dead-letter behavior is RPC-based and was not changed.

- `src/lib/api/integrity.guards.ts`
  - Classification: `INTEGRITY_GUARD_DO_NOT_TOUCH`.
  - Reason: integrity checks require complete relationship validation and already chunk id batches with `chunkIds(..., 150)`.

- `src/lib/store_supabase.ts`
  - Classification: `DIRECTOR_APPROVAL_SEMANTICS_DO_NOT_TOUCH`.
  - Reason: director inbox and request child reads need separate view-column and approval-flow proof.

- `src/screens/contractor/contractor.data.ts`
  - Classification: `INTENTIONAL_DETAIL_BY_PARENT`.
  - Reason: remaining reads load progress/detail bundles by parent ids.

- `src/screens/buyer/buyer.repo.ts`
  - Classification: `INTENTIONAL_DETAIL_BY_PARENT`.
  - Reason: remaining buyer reads are proposal/accounting/detail reads.

- `src/lib/api/pdf_proposal.ts`
  - Classification: `INTENTIONAL_PDF_REPORT_EXPORT`.
  - Reason: PDF/report completeness must not be capped.

- `src/lib/pdf/pdf.builder.ts`
  - Classification: `INTENTIONAL_DOCUMENT_BUILDER`.
  - Reason: document builder completeness must not be capped.

## Tests And Gates

Targeted tests run so far:

- `npx tsc --noEmit --pretty false`: PASS
- `npm test -- --runInBand topListPaginationBatch5B`: PASS
- `npm test -- --runInBand pagination`: PASS, 12 suites / 40 tests

Full gates:

- `git diff --check`: PASS
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS, 486 suites passed / 1 skipped, 3049 tests passed / 1 skipped
- `npm test`: PASS, 486 suites passed / 1 skipped, 3049 tests passed / 1 skipped
- `npm run release:verify -- --json`: PASS on clean post-commit verification

## Safety Confirmations

- Business logic changed: NO.
- App behavior changed: NO; list/detail completeness is preserved by page-through-all retrieval.
- SQL/RPC changed: NO.
- RLS/storage changed: NO.
- Package/native config changed: NO.
- Production touched: NO.
- Production writes: NO.
- Secrets printed: NO.
- Secrets committed: NO.
- OTA published: NO.
- EAS build triggered: NO.
- EAS submit triggered: NO.
- EAS update triggered: NO.
- Android submit touched: NO.
