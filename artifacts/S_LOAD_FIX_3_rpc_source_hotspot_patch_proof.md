# S-LOAD-FIX-3 RPC Source Hotspot Patch Proof

Status: GREEN_SOURCE_PATCH_READY

This is a repo-only source patch. It does not claim live load verification. S-LOAD-6 is required after the migration is applied to staging.

## Baseline

S-LOAD-5 remained partial:

| Target | S-LOAD-5 Result | Finding |
| --- | --- | --- |
| `buyer_summary_inbox_page_25` | `optimize_next`, max 840 ms, rows 26 | Direct RPC still returned `26 > 25` |
| `warehouse_issue_queue_page_25` | `optimize_next`, max 3005 ms, rows 25 | Rows bounded, latency still above threshold |
| `buyer_summary_buckets_fixed_scope` | `watch`, max 848 ms | Improved but still watch |

## RPC Definitions Inspected

- `supabase/migrations/20260417053000_r3_e_buyer_inbox_search_cpu_hardening.sql`
- `supabase/migrations/20260422170000_r4_a_warehouse_issue_queue_fallback_scope_pushdown.sql`
- `supabase/migrations/20260428154000_s_db_2_query_plan_indexes.sql`
- `src/screens/buyer/buyer.fetchers.ts`
- `src/screens/warehouse/warehouse.requests.read.canonical.ts`
- `scripts/load/stagingLoadCore.ts`

## buyer_summary_inbox_scope_v1

Cause found: the source RPC bounded request groups, then expanded all rows inside those groups. A group with multiple request items could therefore produce more JSON rows than `p_limit`.

Patch:

- Preserves public signature: `buyer_summary_inbox_scope_v1(integer, integer, text, uuid)`.
- Renames the previous source body to `buyer_summary_inbox_scope_v1_source_before_sloadfix3`.
- Recreates public `buyer_summary_inbox_scope_v1` as a bounded wrapper.
- Normalizes `p_limit` to `1..100`, with null default `12`.
- Rebuilds JSON rows from the source payload with `ordinality <= normalized limit_groups`.
- Preserves source row order by aggregating back with `order by ordinality`.
- Patches `meta.returned_row_count` to the final bounded row count.

After this migration is applied, direct RPC output rows over `p_limit` are source-impossible for the public RPC wrapper.

## warehouse_issue_queue_scope_v4

The latest R4.A definition already applies `offset/limit` over sorted rows and the TypeScript client path fail-closes if `rows.length > p_limit`.

No calculation rewrite was made because changing queue visibility, stock availability, or total-count logic without live EXPLAIN/parity would risk business behavior. Instead, this wave adds migration-ready additive indexes:

- `idx_warehouse_issue_queue_context_order_sloadfix3`
- `idx_request_items_issue_queue_fallback_sloadfix3`

These target the current context-order joins and fallback item truth reads without changing returned shape, ordering, warehouse stock math, or permissions.

## Tests

- `tests/load/sLoadFix3RpcSourceHotspotPatch.contract.test.ts`

Coverage:

- Buyer RPC signature preservation.
- Buyer source wrapper and row cardinality clamp.
- Null/zero/negative/oversized `p_limit` clamp pattern.
- Ordering preservation through original JSON ordinality.
- Warehouse issue queue additive index-shape patch.
- Proof artifacts and safety flags.

Gate status before commit:

- `git diff --check`: PASS
- JSON artifact parse check: PASS
- targeted SQL/RPC/source-bound tests: PASS
- targeted buyer summary inbox tests: PASS
- targeted warehouse issue queue tests: PASS
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS
- `npm test`: PASS
- `npm run release:verify -- --json`: pending final post-commit check

## Safety

- Production touched: NO
- Staging touched: NO
- Load tests run: NO
- Migrations applied to live env: NO
- Writes: NO
- Service-role used: NO
- Package/native config changed: NO
- Business logic changed: NO
- Finance/accounting calculations changed: NO
- Warehouse stock math changed: NO
- OTA/EAS/Play Market touched: NO
- Raw payload/PII/secrets logged: NO
- Secrets printed/committed: NO
