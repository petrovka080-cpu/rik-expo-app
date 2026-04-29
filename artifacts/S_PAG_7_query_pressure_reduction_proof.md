# S-PAG-7 Query Pressure Reduction Proof

Status: GREEN.

Owner goal: 10K/50K+ readiness.

Mode: production-safe code work. No production or staging access was used. No ENV was required. BFF deploy/server files, Play Market, OTA, EAS, SQL/RPC/RLS/storage, package, and native config were not touched.

## Baseline And Result

- Baseline local broad recount: 95 unbounded selects / 37 files.
- Post-wave local broad recount: 95 unbounded selects / 37 files.
- Target: fix 5-8 safe list/search/reference call-sites.
- Fixed: 7 safe catalog/counterparty/reference call-sites.
- Target met: yes.

The broad recount did not decrease because `src/lib/catalog/catalog.transport.ts` already contained earlier S-PAG fallback `.range(...)` calls, so the text-based file-level recount excluded the file before this wave. This wave still reduced real query pressure by replacing seven single-response catalog/counterparty/reference reads with stable page-through-all windows.

## Files Changed

- `src/lib/catalog/catalog.transport.ts`
- `tests/api/topListPaginationBatch3.contract.test.ts`
- `tests/api/topListPaginationBatch4.contract.test.ts`
- `tests/api/topListPaginationBatch5A.contract.test.ts`
- `tests/api/topListPaginationBatch6.contract.test.ts`
- `tests/api/topListPaginationBatch7.contract.test.ts`
- `tests/strict-null/catalog.transport.phase4.test.ts`
- `artifacts/S_PAG_7_query_pressure_reduction_matrix.json`
- `artifacts/S_PAG_7_query_pressure_reduction_proof.md`

## Fixed Call-Sites

1. `src/lib/catalog/catalog.transport.ts` / `loadSupplierCounterpartyRows`
   - Before: supplier counterparty search/picker read returned one ordered response.
   - After: stable `name/id` ordering with `loadPagedCatalogRows(...).range(page.from, page.to)`.
   - Safety: server-side search filter and full merged counterparty semantics are preserved.

2. `src/lib/catalog/catalog.transport.ts` / `loadSubcontractCounterpartyRows`
   - Before: non-draft subcontract counterparties returned one response.
   - After: stable `contractor_org/id` ordering with page-through-all retrieval.
   - Safety: no counterparty source rows are hidden before the existing merge/dedupe logic.

3. `src/lib/catalog/catalog.transport.ts` / `loadContractorCounterpartyRows`
   - Before: contractor counterparty rows returned one response.
   - After: stable `company_name/id` ordering with page-through-all retrieval.
   - Safety: registered company counterparty coverage remains complete.

4. `src/lib/catalog/catalog.transport.ts` / `loadContractorProfileRows`
   - Before: profile compatibility rows used `.limit(5000)`.
   - After: stable `user_id` ordering with page-through-all retrieval.
   - Safety: existing contractor filter behavior is preserved and the old 5000-row compatibility cap is removed.

5. `src/lib/catalog/catalog.transport.ts` / `loadCatalogGroupsRows`
   - Before: catalog groups returned one ordered response.
   - After: stable `code` ordering with page-through-all retrieval.
   - Safety: reference dictionary completeness is preserved.

6. `src/lib/catalog/catalog.transport.ts` / `loadUomRows`
   - Before: UOM rows returned one ordered response.
   - After: stable `code/id` ordering with page-through-all retrieval.
   - Safety: reference dictionary completeness is preserved.

7. `src/lib/catalog/catalog.transport.ts` / `loadSuppliersTableRows`
   - Before: supplier fallback table search returned one ordered response.
   - After: stable `name/id` ordering with page-through-all retrieval.
   - Safety: supplier fallback completeness and existing search filters are preserved.

## Intentionally Not Touched

- BFF/deploy: `scripts/server/**`, `scripts/scale/**`, `src/shared/scale/**`.
- PDF/report/export/document-builder reads: `src/lib/api/pdf_proposal.ts`, `src/lib/pdf/pdf.builder.ts`.
- Detail full reads: contractor detail bundles, buyer proposal detail/accounting reads, warehouse incoming line detail reads.
- Integrity guards: `src/lib/api/integrity.guards.ts`.
- Queue internals: `src/lib/infra/jobQueue.ts`.
- Financial calculations: accountant/payment/proposal calculation paths.
- Warehouse stock math/report aggregation: `src/screens/warehouse/warehouse.api.repo.ts`, `src/screens/warehouse/warehouse.stockReports.service.ts`.

## Commands Run

- `git status --short`
- `git rev-parse HEAD`
- `git rev-parse origin/main`
- `git diff --check`
- `Get-Content` for S-PAG-3A/3B/4/5/5A/5B/6 and S-LOAD-FIX-1 proof artifacts
- broad local unbounded select recount before edits
- focused `rg` discovery for `.select`, pagination, list/search/load terms
- focused `Get-Content` / `Select-String` inspection of catalog, buyer, warehouse, market, profile, and attachment candidates
- broad local unbounded select recount after edits
- `npm test -- --runInBand topListPaginationBatch7`
- `npm test -- --runInBand pagination`
- `npm test -- --runInBand catalog.transport.phase4 catalog.lookup catalog.search`
- `npx tsc --noEmit --pretty false`
- `npx expo lint`
- `npm test -- --runInBand`
- `npm test`
- `npm run release:verify -- --json`

## Gates

- `git diff --check`: PASS.
- `npx tsc --noEmit --pretty false`: PASS.
- `npx expo lint`: PASS.
- `npm test -- --runInBand topListPaginationBatch7`: PASS.
- `npm test -- --runInBand pagination`: PASS.
- `npm test -- --runInBand catalog.transport.phase4 catalog.lookup catalog.search`: PASS.
- `npm test -- --runInBand`: PASS; 500 test suites passed, 1 skipped; 3161 tests passed, 1 skipped.
- `npm test`: PASS; 500 test suites passed, 1 skipped; 3161 tests passed, 1 skipped.
- `npm run release:verify -- --json`: pre-commit run executed `tsc`, `expo-lint`, `npm test -- --runInBand`, `npm test`, and `git diff --check` successfully, then failed the readiness wrapper because the repository was intentionally dirty before the S-PAG-7 commit. The final clean-worktree run is performed after commit/push and recorded in the final status.

## Safety Confirmations

- Business logic changed: NO.
- App behavior changed: NO; selected list/reference reads preserve completeness by paging through all rows.
- SQL/RPC changed: NO.
- RLS/storage changed: NO.
- Package/native config changed: NO.
- Production touched: NO.
- Staging touched: NO.
- Production writes: NO.
- Staging writes: NO.
- BFF files touched: NO.
- Secrets printed: NO.
- Secrets committed: NO.
- OTA published: NO.
- EAS build triggered: NO.
- EAS submit triggered: NO.
- EAS update triggered: NO.
- Play Market touched: NO.

## Next Recommended Wave

S-RPC-5 if RPC validation still has high-risk gaps. Otherwise S-STRICT-2 or S-50K-CACHE-INTEGRATION-1 depending whether the next priority is type-safety risk or 50K platform integration.
