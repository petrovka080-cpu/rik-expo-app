# S-FETCHALL-CATALOG-TRANSPORT-RIK-ITEMS-BOUNDED-1

Final status: `GREEN_CATALOG_TRANSPORT_RIK_ITEMS_BOUNDED_RELEASE_INTEGRATED`

## Scope

Changed only catalog transport bounded-read behavior and tests:

- `src/lib/catalog/catalog.transport.ts`
- `tests/catalog/catalog.transport.rikItemsBounded.test.ts`
- `tests/strict-null/catalog.transport.phase4.test.ts`

## Inventory

`catalog.transport.ts` has two `rik_items` fallback search paths:

- `loadCatalogSearchFallbackRows`: catalog fallback search preview.
- `loadRikQuickSearchFallbackRows`: quick RIK fallback search preview.

Both are search preview paths, not full dataset/report paths. No server-side aggregation contract is required for these paths.

The remaining catalog transport top-risk uncapped scoped child list was:

- `loadIncomingItemRows`: `wh_incoming_items_clean` child rows scoped by `incoming_id`.

## Implementation

- Added explicit `rik_items` preview defaults: page size `50`, max page size `100`, max rows `100`, one preview page.
- Kept existing `rik_items` filters and output shapes.
- Added deterministic `rik_items` ordering: `rik_code`, `name_human`, `id`.
- Routed `loadIncomingItemRows` through `loadPagedCatalogRows`, which uses `loadPagedRowsWithCeiling`.
- Incoming child rows now use page size `100`, max rows `5000`, and fail closed if the ceiling is exceeded.

No silent truncation was added. Ceiling overflow returns an error instead of partial success.

## Tests

Passed:

- `npx jest tests/catalog/catalog.transport.rikItemsBounded.test.ts tests/strict-null/catalog.transport.phase4.test.ts src/lib/catalog/catalog.search.service.test.ts --runInBand`
- `npm run verify:typecheck`
- `npm run lint`
- `git diff --check`
- artifact JSON parse
- post-push `release:verify -- --json`

## Safety

- No production DB writes.
- No migrations/apply/repair.
- No deploy/redeploy.
- No Render env writes.
- No BFF traffic changes.
- No business endpoint calls.
- No temporary hooks/scripts/endpoints.
- No raw payloads, raw DB rows, business rows, secrets, URLs, or env values printed intentionally.
