# S-DB-1R Subcontract Pagination Proof

## Scope
Paginate all subcontract list queries to use `.range()` with `pageSize+1` probe for `hasMore`.

## Files Changed
- `subcontracts.shared.ts` — new Page types, normalizePageRequest, buildPageResult, collectAllPages, mergeSubcontractPages; all list functions now have `*Page` variants with `.range()`
- `subcontracts.shared.test.ts` — 4 new tests: page clamping, count path, item page loop, dedup merge
- `BuyerSubcontractTab.tsx` — load-more wiring with onEndReached, loadingMore indicator
- `DirectorSubcontractTab.tsx` — load-more + server-side count for pending badge + filter resets pagination
- `AccountantSubcontractTab.tsx` — load-more wiring

## Pagination Contract
- `SUBCONTRACT_DEFAULT_PAGE_SIZE = 50`
- `SUBCONTRACT_MAX_PAGE_SIZE = 100`
- pageSize clamped to [1, 100]
- offset defaults to 0
- `.range(from, toInclusive)` with `toInclusive = offset + pageSize` (fetches pageSize+1 for hasMore probe)
- `hasMore = rows.length > pageSize`
- `nextOffset = offset + pageSize` when hasMore
- Old callers (listForemanSubcontracts, listDirectorSubcontracts, listAccountantSubcontracts, listSubcontractItems) preserved via `collectAllPages()` wrapper

## Safety
- No business logic changed
- No validation changed
- No SQL/RPC changed
- No app.json/eas.json/package.json changed
- No Maestro YAML changed
- No PDF/export capped
- No financial totals changed

## Gates
- Targeted tests: PASS 12/12
- tsc: PASS
- lint: PASS
- Jest --runInBand: PASS 460/460, 2862/2862
- Jest parallel: PASS 460/460, 2862/2862
- Android build: PASS
- Android launch: PASS (no FATAL EXCEPTION)
- Maestro critical: 13/14 PASS (contractor-pdf-smoke: external viewer issue, not our scope)
- git diff --check: PASS
