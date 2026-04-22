# RPC Scale Verification 10k Phase 1 Notes

## Scope
- Wave: `RPC_SCALE_VERIFICATION_10K_PHASE_1`
- Mode: read-only / proof-first
- Exact scope: one hot Buyer/Warehouse RPC path, one current baseline, no SQL or runtime remediation
- Intentionally excluded: index changes, view/function rewrites, payload contract changes, UI changes, business-logic changes

## Shortlist
- Candidate A - `buyer_summary_inbox_scope_v1`
  - Domain: buyer
  - Entry / owner path: `src/screens/buyer/buyer.fetchers.ts`
  - Why not chosen: safe canonical path, but the current live dataset returns `0` rows across all collected tiers, so it is a weak near-term baseline for 10k-style bottleneck proof.
- Candidate B - `list_buyer_inbox`
  - Domain: buyer
  - Entry / owner path: `src/lib/api/buyer.ts`
  - Why not chosen: measurable and heavy, but it is a legacy contrast path rather than the primary production owner path we should harden next.
- Candidate C - `wh_report_issued_materials_fast`
  - Domain: warehouse
  - Entry / owner path: `src/screens/warehouse/warehouse.api.repo.ts`
  - Why not chosen: clearly heavy, but it is a report-shaped, non-paginated surface with wider date-range variability, so the next hardening slice would be broader than a queue-window path.
- Candidate D - `warehouse_issue_queue_scope_v4`
  - Domain: warehouse
  - Entry / owner path: `src/screens/warehouse/warehouse.requests.read.canonical.ts`
  - Why chosen: highest current risk ranking, clear production owner, narrow measurement slice, and strong evidence of fixed pre-pagination cost even when the returned payload collapses to zero rows.

## Chosen Path
- RPC path: `warehouse_issue_queue_scope_v4`
- Runtime owner: `src/screens/warehouse/warehouse.requests.read.canonical.ts`
- SQL owner: `supabase/migrations/20260417051000_r3_c_warehouse_issue_queue_cpu_elimination.sql`

## Why This Slice Was Chosen
- It is the top-ranked Warehouse/Buyer path in the fresh read-only inventory: `score=182`, `risk=urgent`, `recommendation=optimize_next`.
- It powers the canonical Warehouse issue queue, so any future hardening stays aligned with the real production owner flow.
- The current live baseline already shows a strong bottleneck signature:
  - `page_0_limit_100`: `median=862ms`, `payload=73340 bytes`, `rows=100`
  - `deep_page_limit_100`: `median=855ms`, `payload=446 bytes`, `rows=0`
- That flat latency with a near-empty deep page strongly suggests fixed upstream work before pagination rather than simple payload growth.

## Current Live Data Reality
- Honest near-10k live verification was not available in the current environment.
- Current live row counts at collection time:
  - `requests=264`
  - `request_items=1608`
  - `proposals=117`
  - `proposal_items=205`
  - `purchases=109`
- Conclusion: this wave can classify the bottleneck honestly, but it cannot claim a real 10k live benchmark. Any next hardening wave should either use a larger seeded dataset or stay scoped to the fixed-cost bottleneck already visible here.

## Bottleneck Hypothesis To Carry Forward
- Candidate bottleneck type: fixed pre-pagination compute / aggregation / sort-before-slice
- Evidence:
  - Deep page returns `0` rows and `446` bytes but still costs `~855-837ms`
  - The current SQL shape reads `public.requests`, `public.v_wh_issue_req_heads_ui`, `public.v_wh_issue_req_items_ui`, `public.request_items`, and `public.v_warehouse_stock`
  - Pagination happens only after `visible_queue_rows` are merged and `sorted_rows` are ordered

## Intentionally Out Of Scope
- No SQL migration
- No RPC rewrite
- No `EXPLAIN` spoofing when the environment does not support it
- No second hot path
- No optimization without a proof baseline
