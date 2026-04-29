# S-PAG-5 Remaining Unbounded Selects Proof

Status: PARTIAL.

S-PAG-5 started from clean `main` at `4f4930c79434c31103005c2f7e927cf1dfaea4c3`, with `HEAD == origin/main`.

Read before editing:

- `artifacts/S_PAG_3A_top_list_pagination_matrix.json`
- `artifacts/S_PAG_3B_top_list_pagination_matrix.json`
- `artifacts/S_PAG_4_remaining_top_list_pagination_matrix.json`

S-PAG-3A, S-PAG-3B, and S-PAG-4 fixed call-sites were not reopened.

## Baseline And Count

Owner-provided fresh audit baseline before wave:

- unbounded selects: 111
- unbounded files: 42

The provided simple local count script reported 115 selects / 46 files before edits. This script is a broad text recount and includes additional local matches/false-positive non-query files. No `src` or `app` runtime query files were changed in S-PAG-5, so the canonical audit baseline remains unchanged after this classification-heavy partial:

- post-wave unbounded selects: 111
- post-wave unbounded files: 42
- local simple recount after wave: 115 selects / 46 files

## Exact Call-Sites Fixed

None.

No safe high-volume list/search call-site was available in the inspected priority set without risking hidden records, report/detail incompleteness, or behavior changes. This wave therefore records a PARTIAL classification proof and adds a contract test that the reviewed PDF/report/detail/seed/integrity/job-queue reads were not silently capped.

## Top Files Inspected And Classified

1. `src/screens/contractor/contractor.data.ts`
   - Classification: `INTENTIONAL_DETAIL_BY_PARENT`
   - Reason: request/subcontract/progress/log/material reads are scoped to one parent chain or derived ID set. Capping would break contractor detail and material completeness.

2. `src/screens/foreman/foreman.dicts.repo.ts`
   - Classification: `LOW_VOLUME_ADMIN`
   - Reason: reference dictionary/app option cache reads need complete option sets and are not high-volume user list/search windows.

3. `src/screens/buyer/buyer.repo.ts`
   - Classification: `INTENTIONAL_DETAIL_BY_PARENT`
   - Reason: proposal accounting/view/link reads are scoped to one proposal or derived IDs. Capping would hide proposal rows.

4. `src/screens/director/director.data.ts`
   - Classification: `NEEDS_SEPARATE_UI_WORK`
   - Reason: pending-row fallback loads a complete director list. Safe pagination requires explicit UI/load-more state before reducing rows.

5. `src/screens/warehouse/warehouse.api.repo.ts`
   - Classification: `INTENTIONAL_PDF_REPORT_EXPORT` and `INTENTIONAL_DETAIL_BY_PARENT`
   - Reason: incoming ledger report aggregation and incoming line detail reads must remain complete.

6. `src/lib/infra/jobQueue.ts`
   - Classification: `JOB_QUEUE_SEMANTICS_UNCLEAR`
   - Reason: the remaining `.select()` is insert-returning single-row enqueue; claim/retry semantics are RPC-owned.

7. `src/lib/api/integrity.guards.ts`
   - Classification: `INTEGRITY_GUARD_DO_NOT_TOUCH`
   - Reason: reads are chunked by caller-provided IDs and enforce FK/integrity behavior. Pagination could weaken validation.

8. `src/screens/warehouse/warehouse.seed.ts`
   - Classification: `SEED_OR_TEST_OR_FIXTURE`
   - Reason: incoming seed/setup fallback reads complete purchase/snapshot rows for one incoming document.

9. `src/lib/api/pdf_proposal.ts`
   - Classification: `INTENTIONAL_PDF_REPORT_EXPORT`
   - Reason: proposal PDF generation requires complete proposal, item, request, supplier, and app data.

10. `src/lib/pdf/pdf.builder.ts`
    - Classification: `INTENTIONAL_DOCUMENT_BUILDER`
    - Reason: request/report PDF builders require complete document model reads.

Additional local top-count file inspected:

- `src/screens/contractor/contractor.resolvers.ts`: `INTENTIONAL_DETAIL_BY_PARENT`, single-row resolver lookups via `maybeSingle`.

## Before/After Query Shape

No runtime query shape changed.

- Before: priority candidates were unbounded only where completeness is required, indirectly bounded by parent/ID chunks, or not a list/search UI.
- After: unchanged; no `.range()` or `.limit()` was added to PDF/report/export/detail/seed/integrity/job-queue reads.

## Intentional Non-Caps

PDF/report/export/document-builder reads capped: NO.
Detail full reads changed: NO.

Intentionally untouched PDF/report/export/document-builder reads:

- `src/lib/api/pdf_proposal.ts`
- `src/lib/pdf/pdf.builder.ts`
- `src/screens/warehouse/warehouse.api.repo.ts` / `fetchWarehouseIncomingLedgerRows`

Intentionally untouched detail-by-parent reads:

- `src/screens/contractor/contractor.data.ts`
- `src/screens/contractor/contractor.resolvers.ts`
- `src/screens/buyer/buyer.repo.ts`
- `src/screens/warehouse/warehouse.api.repo.ts` / `fetchWarehouseIncomingLineRows`

Seed/test/integrity/job-queue reads not touched:

- `src/screens/warehouse/warehouse.seed.ts`
- `src/lib/api/integrity.guards.ts`
- `src/lib/infra/jobQueue.ts`

Queries needing separate UI work:

- `src/screens/director/director.data.ts` / pending-row fallback
- `src/screens/director/director.repository.ts` / pending-row fallback, already recorded in S-PAG-4

## Files Changed

- `tests/api/topListPaginationBatch4.contract.test.ts`
- `artifacts/S_PAG_5_remaining_unbounded_selects_matrix.json`
- `artifacts/S_PAG_5_remaining_unbounded_selects_proof.md`

No `src/**`, `app/**`, SQL/RPC/RLS/storage, package, native, release, Play Market, or Android submit files were changed.

## Tests And Gates

Precheck:

- `git status --short`: clean
- `git rev-parse HEAD`: `4f4930c79434c31103005c2f7e927cf1dfaea4c3`
- `git rev-parse origin/main`: `4f4930c79434c31103005c2f7e927cf1dfaea4c3`
- `git diff --check`: PASS
- `npm run release:verify -- --json`: PASS after rerun with longer timeout

Targeted/new tests and full gates are run after artifact creation and recorded in final status.

## Safety Confirmations

Play Market / Android submit: DEFERRED_BY_OWNER, not touched.
PDF/report/export/document-builder reads capped: NO.
Detail full reads changed: NO.
Production touched: NO.
OTA/EAS triggered: NO.

- Business logic changed: NO
- App behavior changed: NO
- SQL/RPC changed: NO
- RLS/storage changed: NO
- Package/native config changed: NO
- Production writes: NO
- Secrets printed: NO
- Secrets committed: NO
- OTA published: NO
- EAS build triggered: NO
- EAS submit triggered: NO
- EAS update triggered: NO
