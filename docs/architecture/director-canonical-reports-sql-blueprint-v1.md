# Director Canonical Reports SQL Blueprint v1

## Scope
- Role: `Director`
- Feature: `Reports -> Materials / Works / Summary`
- Goal: canonical server-side aggregate layer without changing current business semantics.

## Current Production Source Mapping (as-is)
- Main fact grain in runtime: `warehouse_issue_items` + `warehouse_issues` (`status = 'Подтверждено'`).
- Request linkage (when present): `request_items` (`request_item_id`) -> `requests` (`request_id`).
- Object scope in runtime: primarily `warehouse_issues.object_name`; optional id mapping via `requests.object_id` / `wh_report_issued_by_object_fast`.
- Work/discipline label in runtime:
  - first: `warehouse_issues.work_name`,
  - fallback: parsed free-note context,
  - fallback: `requests.system_code` resolved through `ref_systems`.
- Level label in runtime:
  - first: `requests.level_code` (+ `ref_levels` resolve),
  - fallback: parsed free-note context.
- Material name resolve in runtime:
  - `catalog_name_overrides` / `v_rik_names_ru` / catalog fallbacks.
- Cost semantics in current works path:
  - `issue_cost_total`: based on proposal-like prices (`proposal_items`, plus per-request-item override),
  - `purchase_cost_total`: currently kept `0` in works path to avoid heavy/invalid branches.

## Semantics That Must Stay Invariant
- `is_requested`: line has linked `request_item_id`.
- `is_free`: line has no linked `request_item_id` (current runtime equivalent of `is_without_request`).
- `requested_count` / `free_count`: position counts by `request_item_id` presence.
- Object filter:
  - `object_id` has priority when available,
  - else `object_name`,
  - else all objects in company/date scope.
- Works/materials must use one canonical source with filter variation, not separate architectures.

## Deliverables in SQL Draft
- `public.v_director_work_facts_base`
- `public.v_director_material_facts_base`
- `public.director_report_fetch_works_v1(...)`
- `public.director_report_fetch_materials_v1(...)`
- `public.director_report_fetch_summary_v1(...)`
- index blueprint for underlying hot predicates/joins.

## Important Legacy Notes
- `work_type_code` is not guaranteed on all historical rows; fallback to request/system/work label is required.
- `zone_*` may be sparse in legacy data; nullable in canonical view is intentional.
- `material_id` may be absent in issue rows where only RIK code exists; keep nullable and use code/name fallback.
- `purchase_cost_total` for works is intentionally conservative (`0` by default) until stable canonical purchase binding is approved.

## Integration Rules
- Keep existing frontend/runtime fallback chain during rollout.
- Introduce canonical RPC path as preferred, but do not remove fallback until capability confirmed in prod.
- Do not change formulas/meaning silently; any formula delta must be explicit and separately approved.

