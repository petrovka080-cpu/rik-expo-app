# S-LOAD-FIX-4 Warehouse Issue Queue Latency Patch Proof

Status: GREEN_SOURCE_PATCH_READY

This is a repo-only source/index patch. It does not claim live load verification. The migration must be applied to staging in a separate wave. S-LOAD-7 is required for the bounded staging regression after apply.

## Baseline

S-LOAD-6 remained partial after the buyer RPC source patch was applied:

| Target | S-LOAD-6 Result | Finding |
| --- | --- | --- |
| `warehouse_issue_queue_page_25` | `optimize_next`, max 3382 ms, rows 25 | Rows bounded, latency still above threshold |
| `buyer_summary_inbox_page_25` | `watch`, max 914 ms, rows 25, meta 25 | Direct RPC row overrun resolved |
| `warehouse_stock_page_60` | `watch`, max 1426 ms, rows 60 | Watch-only; stock math excluded |
| `warehouse_incoming_queue_page_30` | `watch`, max 833 ms, rows 14 | Watch-only |
| `buyer_summary_buckets_fixed_scope` | `watch`, max 860 ms, rows 132 | Stable watch |

## Definitions Inspected

- `supabase/migrations/20260417051000_r3_c_warehouse_issue_queue_cpu_elimination.sql`
- `supabase/migrations/20260422170000_r4_a_warehouse_issue_queue_fallback_scope_pushdown.sql`
- `supabase/migrations/20260428154000_s_db_2_query_plan_indexes.sql`
- `supabase/migrations/20260430093000_s_load_fix_3_rpc_source_hotspot_patch.sql`
- `src/screens/warehouse/warehouse.requests.read.canonical.ts`
- `scripts/load/stagingLoadCore.ts`
- `artifacts/S_LOAD_6_post_rpc_source_patch_staging_regression_matrix.json`

## Source Patch

Migration:

- `supabase/migrations/20260430103000_s_load_fix_4_warehouse_issue_queue_latency_patch.sql`

Changes:

- Preserves public signature: `warehouse_issue_queue_scope_v4(integer, integer)`.
- Renames the previous source body to `warehouse_issue_queue_scope_v4_source_before_sloadfix4`.
- Recreates public `warehouse_issue_queue_scope_v4` as a bounded wrapper.
- Normalizes `p_offset` to `>= 0`.
- Normalizes `p_limit` to `1..100`, with null default `50`.
- Rebuilds JSON rows from the source payload with `ordinality <= normalized limit_value`.
- Preserves source row order by aggregating back with `order by ordinality`.
- Patches `meta.row_count` to the final bounded row count.

This keeps direct RPC callers inside the same safe page budget as the app client without changing the existing v4 source body, queue visibility rules, ordering, permissions, or returned JSON shape for valid bounded calls.

## Index Patch

The R4.A source joins fallback item truth using:

```sql
mur.request_id = ri.request_id::text
```

and reads `ri.id::text` in the same fallback item path. S-LOAD-FIX-3 added a normal `(request_id, id)` index. This wave adds the matching expression index:

```sql
idx_request_items_issue_queue_request_text_sloadfix4
on public.request_items ((request_id::text), (id::text))
include (rik_code, uom, status, name_human, qty)
```

That targets the current source query shape without changing warehouse stock math or fallback allocation semantics.

## Skipped Paths

- `warehouse_stock_scope_v2`: watch-only and stock math is excluded without a dedicated stock wave.
- `warehouse_incoming_queue_scope_v1`: watch-only one-sample latency target, not the remaining optimize_next bottleneck.
- `buyer_summary_buckets_scope_v1`: stable watch target, not changed in this wave.
- `buyer_summary_inbox_scope_v1`: S-LOAD-6 proved rows and meta are now within p_limit.
- Live staging apply: intentionally skipped; this wave is source-patch-ready only.

## Tests

- `tests/load/sLoadFix4WarehouseIssueQueueLatencyPatch.contract.test.ts`

Coverage:

- Public RPC signature preservation.
- Source wrapper privacy and grants.
- Direct RPC `p_offset`/`p_limit` clamp behavior.
- Final row cardinality cap using source payload ordinality.
- Source ordering preservation.
- Targeted fallback item `::text` join index.
- Proof helper has no raw payload, PII, or secret exposure.
- Proof artifacts and safety flags.

## Gate Status

- `git diff --check`: pending
- JSON artifact parse check: pending
- targeted warehouse issue queue tests: pending
- `npx tsc --noEmit --pretty false`: pending
- `npx expo lint`: pending
- `npm test -- --runInBand`: pending
- `npm test`: pending
- `npm run release:verify -- --json`: pending

## Safety

- Production touched: NO
- Staging touched: NO
- Load tests run: NO
- Migrations applied to live env: NO
- Writes: NO
- Service-role used: NO
- Repo SQL migration added: YES
- Live SQL/RPC/RLS/storage changed: NO
- Package/native config changed: NO
- Business logic changed: NO
- Finance/accounting calculations changed: NO
- Warehouse stock math changed: NO
- OTA/EAS/Play Market touched: NO
- Raw payload/PII/secrets logged: NO
- Secrets printed/committed: NO
