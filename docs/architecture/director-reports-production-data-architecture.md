# Director Reports Production Data Architecture

Date: 2026-03-09  
Scope: `Director -> Отчеты -> Материалы/Работы` (`src/lib/api/director_reports.ts`, `src/screens/director/*`)

## Current problems
- raw runtime assembly: YES
- separate heavy paths for materials/works: YES (shared code exists, but runtime branches and staged fetches still rebuild data from raw sources)
- object filter triggers expensive recompute: YES (even after optimizations, filter switch can traverse heavy row paths)
- client-side aggregation too heavy: YES (multiple row passes and enrichment/fallback chains)

## Current raw sources
- `warehouse_issues`: head events, status/date/object/work context
- `warehouse_issue_items`: issue line rows (position-level facts)
- `request_items`: mapping `request_item_id -> request_id`
- `requests`: object/system/level fallback context
- `ref_systems`, `ref_levels`, `ref_object_types`, `objects`: enrichment dictionaries
- `v_rik_names_ru`, `catalog_name_overrides`, `v_wh_balance_ledger_ui`: material naming/enrichment
- `proposal_items`, `purchase_items`: price sources
- RPCs:
  - `wh_report_issued_summary_fast`
  - `wh_report_issued_materials_fast`
  - `wh_report_issued_by_object_fast`
  - `acc_report_issues_v2`
  - `acc_report_issue_lines`

## UI metrics that must be supported
### Materials
- total docs
- total positions
- share/volume without request
- top materials with qty/docs/free breakdown
- object scope (all/object-specific)

### Works
- work discipline key (work type name)
- positions count
- requested positions count
- free positions count
- per-work and per-level grouping
- cost overlays (issue cost, purchase base, ratio, unpriced share)

## Architectural diagnosis
Current path still relies on late runtime reconstruction:
- fetch raw rows
- join/fallback by request context
- optional name/level enrichment
- client grouping/reaggregation
- separate price stage

This is acceptable for recovery/fallback, but not as primary production model for large datasets.

## Proposed canonical report source
Type: **Hybrid**
- `Canonical Aggregate Table` (or materialized aggregate) for director report facts
- `RPC facade` for stable payload contracts and dimension filtering
- legacy raw assembly retained temporarily as rollout fallback

Why this option:
- runtime reads pre-aggregated facts (fast first paint)
- consistent formulas in one backend layer
- cheap object/mode filtering
- allows progressive migration without UI contract break

## Proposed canonical schema / payload
Recommended canonical fact (grain): **daily x company x object x mode grouping key**

### Canonical table/view: `director_report_fact_daily`
- `company_id`
- `day_date`
- `object_id` (nullable)
- `object_name`
- `mode` (`materials` | `works`)
- `group_key` (e.g. `rik_code` for materials, `work_code/name` for works)
- `group_name`
- `level_key` (nullable for works)
- `level_name` (nullable)
- `positions_total`
- `positions_req`
- `positions_free`
- `qty_total`
- `docs_total`
- `issue_cost_total` (nullable if no price)
- `purchase_cost_total` (nullable/derived by policy)
- `unpriced_positions`
- `updated_at`

### RPC contract (example)
- `rpc director_report_fetch(p_company_id, p_from, p_to, p_object_id, p_mode, p_include_costs)`
- returns:
  - `summary`
  - `groups` (materials rows or works rows)
  - optional `levels` for works
  - optional `cost_overlay`

This allows:
- first render with `p_include_costs=false`
- async ratio card refresh with `p_include_costs=true`
- no heavy raw join chain on client

## Query dimensions
- `company_id` (mandatory partition)
- `object_id` (nullable: all objects if null)
- `period_from`, `period_to`
- `mode` (`materials`/`works`)
- grouping key (`rik_code` or work key)

## Expected runtime behavior
- initial open: fetch aggregate payload (fast, no raw assembly)
- materials/works switch: cheap mode query on same canonical layer
- object switch: cheap dimension filter (no raw rebuild)
- period switch: bounded aggregate scan (indexed by company/date/object/mode)

## Rollout plan
### Phase 1 — Foundation
- Create canonical aggregate source in DB (`director_report_fact_daily` or equivalent view/materialized layer)
- Implement RPC facade returning UI-ready payloads
- Keep existing UI unchanged

### Phase 2 — Read path migration
- Switch `fetchDirectorWarehouseReport` / `fetchDirectorWarehouseReportDiscipline` to canonical RPC
- Preserve current API response shape for UI compatibility
- Keep legacy runtime assembly as fallback behind guarded branch/feature flag

### Phase 3 — Cleanup
- Remove legacy heavy runtime assembly from hot path
- Retain minimal emergency fallback only if required by ops policy
- Consolidate formulas in canonical backend layer and drop duplicated client transforms

## Risks
- DB migration complexity and initial backfill
- ensuring formula parity across old/new paths
- handling historical edge rows with missing request context

## Mitigations
- parity snapshots (old vs new payload compare for fixed periods/objects)
- staged rollout by company/feature flag
- strict monitoring of first render and error rates

## Success criteria
- first meaningful render target: <= 2s on representative dataset
- materials/works switch does not trigger heavy raw reconstruction
- object filter is cheap and stable
- one canonical formula source for report metrics
- legacy raw path removed from primary runtime flow

## Implementation plan (next execution task)
1. Add DB design doc + migration DDL draft for canonical aggregate layer.
2. Implement RPC facade with old-shape payload compatibility.
3. Wire director screen API to new RPC under feature flag.
4. Run parity + performance audit (`before/after` + row counts + timings).
5. Remove old heavy path from default execution.

