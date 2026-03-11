# Warehouse Expense Request Loader Fix v1

## Failing query location
- File: `src/screens/warehouse/warehouse.api.ts`
- Function: `apiFetchReqHeads(...)`
- Branch: page-0 fallback for approved requests missing from `v_wh_issue_req_heads_ui`

## Failing request payload (before)
- Endpoint: `/rest/v1/requests`
- Select payload included legacy-sensitive columns:
- `id, display_no, status, submitted_at, created_at, object_name, level_name, system_name, zone_name, object_type_code, level_code, system_code, zone_code, contractor_name, contractor_org, subcontractor_name, subcontractor_org, contractor_phone, subcontractor_phone, phone, phone_number, planned_volume, volume, qty_plan, note, comment`

## Exact bad field / relation
- Root cause class: schema drift in `requests` projection.
- Breaking candidates in active installation: `level_name`, `system_name`, `zone_name` (legacy header aliases not guaranteed on current surface).
- Result: PostgREST 400 on select parsing, followed by repeated retries from screen lifecycle.

## Minimal safe fix
- Added adaptive projection loader in `warehouse.api.ts`:
  - `REQUESTS_FALLBACK_SELECT_PLANS`
  - `tryLoadRequestsFallbackRows(...)`
- Behavior:
  - tries richer projection first,
  - falls back to reduced select plans when a column is missing,
  - caches last successful plan to avoid repeated 400 spam,
  - keeps existing business flow and fallback merge logic unchanged.

## Before / after behavior
- Before:
  - `Warehouse -> Расход` could stay in loading/partial blank state.
  - repeated 400 requests to `/rest/v1/requests?...select=...level_name...`.

- After:
  - loader degrades to valid projection automatically,
  - request list and recipients continue loading,
  - no repeated 400 spam from missing request columns,
  - issue flow remains unchanged.

## Verification steps
1. Open `Warehouse` tab -> `Расход`.
2. Confirm request heads load and screen leaves loading state.
3. Verify network logs do not show repeating 400 for `/rest/v1/requests`.
4. Select request, open lines, issue material, confirm stock refresh works.
5. Reload screen and verify no regression in pagination/merge behavior.
