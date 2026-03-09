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

## Output Contract (Corrected)
- `director_report_fetch_works_v1`:
  - returns `table(payload jsonb)`
  - payload shape must match runtime `DirectorDisciplinePayload`:
    - `summary`
    - `works[]`
    - nested `levels[]`
    - nested `materials[]`
- `director_report_fetch_materials_v1`:
  - returns `table(payload jsonb)`
  - payload shape must match runtime `DirectorReportPayload`:
    - `meta`
    - `kpi`
    - `rows[]`
    - `report_options`
- `director_report_fetch_summary_v1`:
  - returns `table(payload jsonb)` with:
    - `issue_cost_total`
    - `purchase_cost_total`
    - `unevaluated_ratio`
    - `base_ready`

## Unevaluated Ratio Semantics (Corrected)
- Do not use placeholder `count(issue_cost = 0) / count(*)`.
- Runtime-equivalent base:
  - denominator: issue positions where `qty > 0` and `rik_code/material_code` is present.
  - numerator: same positions with missing price-derived issue value (`issue_cost <= 0`).
- Formula:
  - `unevaluated_ratio = unpriced_positions / priced_base_positions`
  - if denominator is `0`, result is `0`.

## Grain Notes (Corrected)
- Runtime semantic grain:
  - works payload is nested: `work -> level -> materials`.
  - materials payload is flat grouped row list with KPI/meta/options.
- Canonical base grain:
  - `issue_item` fact row (`warehouse_issue_items` + `warehouse_issues`).
- Report aggregation grain:
  - Works RPC restores runtime nested semantic grain from flat facts.
  - Materials RPC restores runtime flat grouped rows from flat facts.

## Deterministic Join Strategy (Corrected)
- Reference joins by code must be pre-deduplicated (one row per code) before joining facts.
- Use dedicated one-row views/CTEs for:
  - `ref_systems`
  - `ref_levels`
  - `ref_zones`
  - name resolvers (`catalog_name_overrides` / `v_rik_names_ru` / catalog item names)
- Avoid joining raw multi-row reference sources directly to fact rows.

## Free/Unlinked Row Handling (Corrected)
- Company anchor must avoid silent loss of free/unlinked issue rows.
- Preferred resolution:
  - `coalesce(warehouse_issues.company_id, requests.company_id)`.
- If a row has neither company source:
  - row cannot be company-scoped safely and must be explicitly documented as excluded.
- Do not silently drop valid free issue rows by relying on `requests` only.

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
- `stock_qty` in material facts remains provisional placeholder until approved warehouse stock source is connected.

## Integration Rules
- Keep existing frontend/runtime fallback chain during rollout.
- Introduce canonical RPC path as preferred, but do not remove fallback until capability confirmed in prod.
- Do not change formulas/meaning silently; any formula delta must be explicit and separately approved.
