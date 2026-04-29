# S-PAG-5A Proof

Owner goal: 10K/50K+ readiness.

Play Market / Android submit: DEFERRED_BY_OWNER, not touched.
PDF/report/export/document-builder reads capped: NO.
Detail full reads changed: NO.
Production touched: NO.
OTA/EAS triggered: NO.

## Baseline

- Audit baseline before pagination waves: 111 unbounded selects / 42 files.
- Local pre-wave count before S-PAG-5A edits: 115 unbounded selects / 46 files.
- Local post-wave count after S-PAG-5A edits: 108 unbounded selects / 45 files.
- Target: 5-8 true list/search call-sites.
- Fixed: 6 true list call-sites.

## Files Changed

- `src/screens/foreman/foreman.dicts.repo.ts`
- `tests/api/topListPaginationBatch5A.contract.test.ts`
- `artifacts/S_PAG_5A_contractor_foreman_buyer_pagination_matrix.json`
- `artifacts/S_PAG_5A_contractor_foreman_buyer_pagination_proof.md`

## Fixed Call-Sites

All changed reads are foreman UI option/dictionary list reads. They now use `loadPagedForemanRows`, which applies `range(page.from, page.to)` with default/max page size 100 and loops until a page returns fewer than 100 rows. This reduces one unbounded DB response per call-site without hiding records from the user.

| File | Function | Table | Before | After | Safety |
| --- | --- | --- | --- | --- | --- |
| `src/screens/foreman/foreman.dicts.repo.ts` | `fetchWithFallback` | `ref_object_types` | `select(...).order(name)` | `order(name).order(code).range(...)` page-through-all | Dropdown options remain complete |
| `src/screens/foreman/foreman.dicts.repo.ts` | `fetchWithFallback` | `ref_levels` | `select(...).order(sort)` | `order(sort).order(code).range(...)` page-through-all | Dropdown options remain complete |
| `src/screens/foreman/foreman.dicts.repo.ts` | `fetchWithFallback` | `ref_systems` | `select(...).order(name)` | `order(name).order(code).range(...)` page-through-all | Dropdown options remain complete |
| `src/screens/foreman/foreman.dicts.repo.ts` | `fetchWithFallback` | `ref_zones` | `select(...).order(name)` | `order(name).order(code).range(...)` page-through-all | Dropdown options remain complete |
| `src/screens/foreman/foreman.dicts.repo.ts` | `loadForemanAppOptions` | `rik_apps` | `select(...).order(app_code)` | `order(app_code).range(...)` page-through-all | App options remain complete |
| `src/screens/foreman/foreman.dicts.repo.ts` | `loadForemanAppOptions` fallback | `rik_item_apps` | `select(...).not(...).order(app_code)` | preserved filter + `order(app_code).range(...)` page-through-all | Fallback options remain complete |

Return shape is preserved:

- `DictsSnapshot` still returns the same option arrays.
- App options still map to `{ code, label }`.
- Existing `name_ru` fallback behavior is preserved.
- Existing cache TTL behavior is preserved.

## Top Files Inspected

- `contractor.data.ts`: not changed. Remaining reads are request/progress/log/material detail bundles. Classification: `INTENTIONAL_DETAIL_BY_PARENT`.
- `foreman.dicts.repo.ts`: changed. Six safe dictionary/app option list reads paginated by page-through-all helper. Remaining `user_profiles.full_name` read is a single `maybeSingle` profile lookup.
- `buyer.repo.ts`: not changed. Remaining reads are proposal/accounting/detail-by-parent reads; buyer list reads were already covered in S-PAG-3A/S-PAG-3B.
- `director.data.ts`: not changed. Existing bounded/direct-detail semantics include `.limit(1)` and director list paths already have pagination coverage elsewhere.
- `warehouse.api.repo.ts`: not changed. Incoming ledger/line reads are warehouse correctness/detail paths.
- `pdf_proposal.ts`: not changed. PDF/report completeness preserved.
- `pdf.builder.ts`: not changed. Document builder completeness preserved.
- `integrity.guards.ts`: not changed. Integrity guard chunking semantics preserved.
- `warehouse.seed.ts`: not changed. Seed/setup scope untouched.
- `jobQueue.ts`: not changed. Queue semantics untouched.

## Intentionally Untouched

- PDF/report/export/document-builder reads: `src/lib/api/pdf_proposal.ts`, `src/lib/pdf/pdf.builder.ts`.
- Detail-by-parent reads: `src/screens/contractor/contractor.data.ts`, `src/screens/buyer/buyer.repo.ts`, `src/screens/warehouse/warehouse.api.repo.ts`.
- Seed/test/fixture reads: `src/screens/warehouse/warehouse.seed.ts`.
- Integrity guard reads: `src/lib/api/integrity.guards.ts`.
- Job queue reads: `src/lib/infra/jobQueue.ts`.
- Needs separate UI work: none selected in this wave.
- Unknown/do-not-touch: director fallback/detail paths not selected for S-PAG-5A.

## Tests And Gates

- `npm test -- --runInBand topListPaginationBatch5A`: PASS.
- `npm test -- --runInBand topListPaginationBatch5A foreman buyer contractor director warehouse`: PASS, 201 suites / 1082 tests.
- `npx tsc --noEmit --pretty false`: PASS.
- `npx expo lint`: PASS.
- `git diff --check`: PASS.
- `npm test -- --runInBand`: PASS, 485 passed / 1 skipped suites, 3045 passed / 1 skipped tests.
- `npm test`: PASS, 485 passed / 1 skipped suites, 3045 passed / 1 skipped tests.
- `npm run release:verify -- --json`: PASS after commit.

## Safety

- Business logic changed: NO.
- App behavior changed: NO, option completeness is preserved by page-through-all reads.
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
- Play Market / Android submit touched: NO.
