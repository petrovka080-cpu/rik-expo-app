# RPC Scale Hardening 10k Phase 1 Notes

## Scope
- Wave: `RPC_SCALE_HARDENING_10K_PHASE_1`
- Mode: one exact SQL hardening slice
- Exact path: `warehouse_issue_queue_scope_v4`
- Runtime owner: `src/screens/warehouse/warehouse.requests.read.canonical.ts`
- SQL owner: `supabase/migrations/20260422170000_r4_a_warehouse_issue_queue_fallback_scope_pushdown.sql`
- Intentionally excluded: second RPC path, broad Buyer/Warehouse SQL rewrite, index spree, payload-shape changes, business-logic changes, UI changes

## Hardening Shortlist
- Candidate A - `list_buyer_inbox`
  - Status: confirmed and safe enough for a future narrow wave
  - Why not chosen now: it is not the primary production owner path surfaced by the previous verification wave, so it is lower value than the current Warehouse queue bottleneck.
- Candidate B - `warehouse_issue_queue_scope_v4` broad pre-pagination rewrite
  - Status: too wide
  - Why not chosen: pushing pagination or sorting deeper across the whole queue pipeline would touch more than one bottleneck at once and would raise result-order and total-count semantics risk.
- Candidate C - `wh_report_issued_materials_fast`
  - Status: blocked by cross-domain report coupling
  - Why not chosen: it is a report-shaped surface with a wider Warehouse/report blast radius than this wave allows.
- Candidate D - `warehouse_issue_queue_scope_v4` offset-irrelevant fallback-truth branch
  - Status: chosen
  - Why chosen: previous proof showed `missingUiTruthInHeadCount=0` and `missingUiTruthFallbackOnlyCount=89`, which means deep pages were still paying for fallback stock-allocation work that could not affect the returned rows.

## Chosen Bottleneck
- Type: `offset_irrelevant_fallback_truth_branch`
- Exact issue:
  - when `offset > 0`, the queue returns only `head_view` rows
  - requests that are missing UI truth but also absent from `head_view` are fallback-only rows
  - the old function still computed full fallback stock allocation for those rows before pagination
- Why this is safe to harden:
  - the chosen request subset can be reduced for the expensive fallback branch without changing which rows are returned for deep pages
  - aggregate meta semantics stay intact because `fallback_truth_request_count` is still computed from the full active fallback set

## Exact Hardening
- Added `fallback_truth_request_ids` to gate the expensive fallback path
- Kept `missing_ui_truth_requests_all` and `fallback_items_active_all` as the full source of truth for meta accounting
- Scoped these expensive steps to the reduced request subset:
  - `fallback_items_active`
  - `fallback_code_keys`
  - `stock_by_code`
  - `stock_by_code_uom`
  - `fallback_items_allocated`
  - `fallback_items_truth`
- Preserved:
  - `document_type='warehouse_issue_queue_scope'`
  - `version='v4'`
  - `payload_shape_version='v4'`
  - all row fields
  - `total`, `row_count`, `has_more`
  - `repaired_missing_ids_count`
  - `ui_truth_request_count`
  - `fallback_truth_request_count`

## Why This Helps Scale
- It removes fixed stock-allocation work for fallback-only requests that cannot contribute rows after the first page.
- It keeps the hardening inside one function and one request-subset boundary.
- It reduces the cost of the exact deep-page scenario that previously returned `0` rows with almost first-page latency.

## Out Of Scope
- No changes to `v_wh_issue_req_heads_ui`
- No changes to `v_wh_issue_req_items_ui`
- No changes to Warehouse stock semantics
- No new indexes
- No changes to queue ordering
- No changes to payload shape or business totals
