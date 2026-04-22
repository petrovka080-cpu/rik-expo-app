# RPC Scale Verification 10k Phase 1 Proof

## Wave Status
- Wave: `RPC_SCALE_VERIFICATION_10K_PHASE_1`
- Status after proof collection: `GREEN`
- Diff type: proof-only artifacts
- Runtime semantics changed: `false`

## Probe Result
- Hot-path inventory source: `artifacts/WAREHOUSE_BUYER_rpc_scale_inventory.json`
- Fresh ranking source: `artifacts/WAREHOUSE_BUYER_rpc_scale_rankings.json`
- Chosen path: `warehouse_issue_queue_scope_v4`
- Shortlist outcome:
  - Candidate A - `buyer_summary_inbox_scope_v1`: safe, but weak current baseline because live rows are `0`
  - Candidate B - `list_buyer_inbox`: measurable, but legacy contrast path
  - Candidate C - `wh_report_issued_materials_fast`: heavy, but broader report-shaped hardening surface
  - Candidate D - `warehouse_issue_queue_scope_v4`: chosen

## Baseline Measurements

| Scenario | Row count | Payload bytes | Median ms | Max ms | Reading |
| --- | ---: | ---: | ---: | ---: | --- |
| `page_0_limit_25` | 25 | 18182 | 867 | 2014 | Typical first page already carries a high fixed cost |
| `page_0_limit_50` | 50 | 36010 | 863 | 3977 | Payload doubles, median stays flat, one cold spike reached 3977ms |
| `page_0_limit_100` | 100 | 73340 | 862 | 1031 | Heavy page size does not materially change the median |
| `deep_page_limit_100` | 0 | 446 | 855 | 864 | Near-empty deep page is still expensive |

## Supplemental Live Probes
- `warehouse_issue_queue_context_status_v1`
  - latency: `837ms`
  - `projection_version=r3_c_warehouse_issue_queue_context_v1`
  - `source_row_count=231`
  - `projected_row_count=231`
  - `current_context_row_count=231`
  - `last_rebuild_status=success`
  - `rebuilt_at=2026-04-17T03:50:36.274483+00:00`
- `warehouse_issue_queue_r3c_cpu_proof_v1`
  - latency: `488ms`
  - `build_source_exists=true`
  - `scope_has_substring=false`
  - `scope_has_regexp_match=false`
  - `scope_has_regexp_replace=false`
  - `scope_reads_context_projection=true`
- Direct RPC spot checks
  - `warehouse_issue_queue_scope_v4(0,100)` -> `887ms`, `total=122`, `row_count=100`, `ui_truth_request_count=79`, `repaired_missing_ids_count=89`, `fallback_truth_request_count=79`
  - `warehouse_issue_queue_scope_v4(300,100)` -> `837ms`, `total=43`, `row_count=0`, `ui_truth_request_count=79`, `repaired_missing_ids_count=89`, `fallback_truth_request_count=79`

## 10k Availability Proof
- Honest 10k live verification is not possible in the current environment.
- Live row counts at collection time:
  - `requests=264`
  - `request_items=1608`
  - `proposals=117`
  - `proposal_items=205`
  - `purchases=109`
- Therefore this wave proves the current bottleneck shape and current live ceiling only.
- It does not claim a fabricated 10k benchmark.

## Plan / Explain Proof
- Live `EXPLAIN` via PostgREST is not available in this environment.
- Exact environment error:
  - `None of these media types are available: application/vnd.pgrst.plan+text; for="application/json"; options=verbose`
- Because live `EXPLAIN` is blocked, plan classification is based on:
  - current live latency/payload evidence
  - static inspection of `supabase/migrations/20260417051000_r3_c_warehouse_issue_queue_cpu_elimination.sql`

## Static Plan Shape Summary
- `warehouse_issue_queue_scope_v4` builds `request_source` from `public.requests`
- It joins `public.warehouse_issue_queue_context_v1`
- It reads `public.v_wh_issue_req_heads_ui`
- It aggregates UI truth from `public.v_wh_issue_req_items_ui`
- It falls back to `public.request_items`
- It reads stock availability from `public.v_warehouse_stock`
- It merges rows into `visible_queue_rows`
- It applies `order by submitted_at desc nulls last, display_year desc, display_seq desc, request_id desc`
- Only after that does it apply `offset` and `limit`

## Bottleneck Classification
- Chosen path: `warehouse_issue_queue_scope_v4`
- Current risk classification: `urgent`
- Bottleneck type: fixed pre-pagination compute / aggregation / sort-before-slice
- Why this classification is justified:
  - deep page latency stays almost identical to the heavy first page
  - payload drops from `73340` bytes to `446` bytes without a meaningful latency drop
  - returned row count drops from `100` to `0` without a meaningful latency drop
- What this is not:
  - not a pure payload blow-up problem
  - not a simple first-page-only rendering artifact

## Next Action
- Recommended next wave: `RPC_SCALE_HARDENING_10K_PHASE_1`
- Exact target should stay narrow: `warehouse_issue_queue_scope_v4`
- Hardening focus should start with the pre-pagination work, not a broad Buyer/Warehouse SQL rewrite

## Gates
- `npx tsc --noEmit --pretty false` -> `PASS`
- `npx expo lint` -> `PASS`
- `npm test -- --runInBand` -> `PASS`
- `npm test` -> `PASS`
- `git diff --check` -> `PASS`

## Release Tail Decision
- Diff classification: proof-only / artifacts-only
- Commit / push: required if gates pass
- OTA: `skip`
- Why OTA is skipped: no runtime JS/TS/SQL behavior changed in this wave
