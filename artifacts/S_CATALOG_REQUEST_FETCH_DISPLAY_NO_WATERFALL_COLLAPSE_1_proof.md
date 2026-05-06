# S-CATALOG-REQUEST-FETCH-DISPLAY-NO-WATERFALL-COLLAPSE-1 Proof

Final status target:
GREEN_CATALOG_REQUEST_FETCH_DISPLAY_NO_WATERFALL_COLLAPSED_RELEASE_INTEGRATED

## Inventory

Flow: `src/lib/catalog/catalog.request.service.ts::fetchRequestDisplayNo`

Purpose: resolve a request display label from a request id.

Expected response shape: `Promise<string | null>`.

Before this wave the service owned the compatibility waterfall directly:

1. `requests` header lookup by id.
2. `request_display_no` RPC.
3. `request_display` RPC.
4. `request_label` RPC.
5. `request_display` view lookup by id.
6. `vi_requests_display` view lookup by id.
7. `v_requests_display` view lookup by id.
8. `requests` table lookup by id.

All attempts were already bounded single-row or scalar reads. The risk was service-owned sequential fallback orchestration, not unbounded rows.

## Safe Collapse

Implemented one permanent typed transport contract:

- `loadCatalogRequestDisplayNoViaFallbacks`
- `CatalogRequestDisplayNoLookupResult`
- `CatalogRequestDisplayNoLookupWarning`

`fetchRequestDisplayNo` now performs one bounded transport contract call and returns the same `string | null` shape.

The transport contract preserves the legacy compatibility sequence internally. Underlying DB/RPC attempts were not removed because removing legacy fallbacks or parallelizing them would change fallback surface or warning timing without a proven BFF or DB contract.

## Compatibility

Response shape is unchanged.

Fallback source order is unchanged.

Ordering and filtering are unchanged.

No BFF response envelope was introduced. Legacy warning behavior is carried through typed transport warnings and consumed by the service.

No direct Supabase calls were added to the service.

No raw payload, raw DB row, or business row logging was added.

## Tests

Targeted:

- `npx jest tests/catalog/catalog.request.transport.test.ts --runInBand` PASS

Covered:

- direct request display lookup success
- RPC fallback order
- legacy worst-case 8-step compatibility sequence
- service collapse into one bounded transport contract
- no direct Supabase call sites in service
- no raw logging at transport boundary

## Safety

No production DB writes.

No migrations.

No deploy or redeploy.

No Render env writes.

No temporary hooks, scripts, or endpoints.

No business endpoint calls.
