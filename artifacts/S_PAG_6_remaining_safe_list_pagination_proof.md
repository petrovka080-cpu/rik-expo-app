# S-PAG-6 Remaining Safe List Pagination Proof

Status: GREEN.

Owner goal: 10K/50K+ readiness.

Mode: production-safe repo-only pagination work. No production or staging access was used. No ENV was required. Play Market / Android submit, OTA, EAS build, EAS submit, and EAS update were not touched.

## Baseline And Result

- Baseline local broad recount: 97 unbounded selects / 38 files.
- Post-wave local broad recount: 95 unbounded selects / 37 files.
- Target: 5-8 safe list/search call-sites.
- Fixed: 8 safe list/search/dictionary/field call-sites.
- Target met: yes.

The recount command is intentionally broad and text-based. It is used as a local drift signal, not as a full semantic audit.

## Fixed Call-Sites

1. `src/screens/profile/profile.services.ts` / `loadProfileScreenData` / `market_listings`
   - Before: profile listing preview used `.limit(20)` after `created_at` ordering.
   - After: `order("created_at", desc) + order("id", desc) + range(0, 19)`.
   - Safety: profile preview remains a 20-row window; only the pagination shape and tie-breaker changed.

2. `src/screens/profile/profile.services.ts` / `loadCompanyMembershipRows` / `company_members`
   - Before: profile access snapshot read all memberships in one unbounded response.
   - After: page-through-all with `order("company_id", asc) + range(page.from, page.to)`.
   - Safety: complete membership semantics are preserved.

3. `src/screens/profile/profile.services.ts` / `searchCatalogItems` / `catalog_items`
   - Before: autocomplete used `.limit(15)` with no stable order.
   - After: `order("name_human_ru", asc) + order("rik_code", asc) + range(0, 14)`.
   - Safety: autocomplete remains a 15-row UI search window.

4. `src/screens/office/officeAccess.services.ts` / `loadCompanyInvites` / `company_invites`
   - Before: invite list used `.limit(30)` after `created_at` ordering.
   - After: `order("created_at", desc) + order("id", desc) + range(0, 29)`.
   - Safety: invite list remains a 30-row UI window.

5. `src/components/map/useMapListingsQuery.ts` / `fetchMapListings` / `market_listings_map`
   - Before: map listing fetch used `.limit(2000)` with no stable order.
   - After: `order("id", asc) + range(0, 1999)`.
   - Safety: broad map payload remains capped at the existing 2000-row window.

6. `src/screens/warehouse/warehouse.dicts.repo.ts` / `fetchWarehouseDictRows`
   - Before: warehouse dictionary rows used `.limit(1000)`.
   - After: page-through-all with a stable id-like order column and `range(page.from, page.to)`.
   - Safety: dictionary completeness is preserved.

7. `src/screens/warehouse/warehouse.dicts.repo.ts` / `fetchWarehouseRefRows`
   - Before: warehouse reference rows used `.limit(2000)`.
   - After: page-through-all with stable requested order plus `code` tie-breaker and `range(page.from, page.to)`.
   - Safety: reference option completeness is preserved.

8. `src/components/foreman/useCalcFields.ts` / `fetchCalcFieldRows`
   - Before: calculator field rows were read as one ordered response.
   - After: page-through-all with `order("sort_order", asc) + order("basis_key", asc) + range(page.from, page.to)`.
   - Safety: field completeness and existing UI filtering are preserved.

## Queries Intentionally Not Touched

- PDF/report/export/document-builder reads: `src/lib/api/pdf_proposal.ts`, `src/lib/pdf/pdf.builder.ts`.
- Detail full reads: contractor detail bundles, buyer proposal detail/accounting reads, warehouse incoming line detail reads.
- Integrity guards: `src/lib/api/integrity.guards.ts`.
- Queue internals: `src/lib/infra/jobQueue.ts`.
- Financial calculations: accountant/payment/proposal calculation paths.
- Warehouse stock math/report aggregation: `src/screens/warehouse/warehouse.api.repo.ts`, `src/screens/warehouse/warehouse.stockReports.service.ts`.
- Seed/test fixture reads: warehouse seed/setup paths.

## Commands Run

- `git status --short`
- `git rev-parse HEAD`
- `git rev-parse origin/main`
- `git diff --check`
- `git diff --name-only`
- `git diff --stat`
- `npm run release:verify -- --json` (first attempt timed out at the command timeout, rerun completed successfully)
- `Get-Content -Raw` for S-PAG-3A/3B/4/5/5A/5B proof artifacts
- focused `rg` discovery for `.select`, pagination, list/search/load terms
- local broad recount before edits
- local broad recount after edits
- `git diff --check`
- `npx tsc --noEmit --pretty false`
- `npm test -- --runInBand topListPaginationBatch6`
- `npm test -- --runInBand pagination`
- `npx expo lint`
- `npm test -- --runInBand`
- `npm test`
- `npm run release:verify -- --json` (pre-commit: internal gates passed; release readiness blocked only by intentionally dirty worktree)

## Gates

- Precheck HEAD == origin/main: PASS (`658ef7cdff8da523819a79f3a2df9fcc545e564c`)
- Precheck worktree clean before edits: PASS
- Precheck `git diff --check`: PASS
- Precheck `npm run release:verify -- --json`: PASS on rerun
- `git diff --check`: PASS
- `npx tsc --noEmit --pretty false`: PASS
- `npm test -- --runInBand topListPaginationBatch6`: PASS, 1 suite / 4 tests
- `npm test -- --runInBand pagination`: PASS, 13 suites / 44 tests
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS, 495 passed / 1 skipped suites, 3123 passed / 1 skipped tests
- `npm test`: PASS, 495 passed / 1 skipped suites, 3123 passed / 1 skipped tests
- `npm run release:verify -- --json`: PRE-COMMIT PARTIAL, internal gates PASS; readiness blocked only because the repository was dirty before commit. Post-commit rerun pending.

## Safety Confirmations

- Business logic changed: NO.
- App behavior changed: NO; existing windows remain windows and completeness-required option/field reads now page through all rows.
- SQL/RPC changed: NO.
- RLS/storage changed: NO.
- Package/native config changed: NO.
- Production touched: NO.
- Staging touched: NO.
- Production writes: NO.
- Secrets printed: NO.
- Secrets committed: NO.
- Raw logs committed: NO.
- OTA published: NO.
- EAS build triggered: NO.
- EAS submit triggered: NO.
- EAS update triggered: NO.
- Play Market touched: NO.

## Next Recommended Wave

If gates pass: S-RPC-4.
