# Procurement / Reports Row Explosion Audit v1

## Scope
- Director reports data assembly (`src/lib/api/director_reports.ts`)
- Buyer proposal creation/input flow (`app/(tabs)/buyer.tsx`, `src/screens/buyer/*`, `src/lib/catalog_api.ts`)
- Warehouse expense request loaders (`src/screens/warehouse/warehouse.api.ts`)

## Suspected duplicate vectors
1. Multiplicative join chains in report fallback paths:
- `warehouse_issue_items -> warehouse_issues -> request_items -> requests -> proposal_items -> purchase_items`
- Risk: one business line appears multiple times across fallback enrichment stages.

2. Workflow + fact mixing in cost estimates:
- `proposal_items` used as pricing fallback when `purchase_items` is absent in Director report calculations.
- Risk: pre-approval/workflow rows can leak into final-like KPIs.

3. Re-entrant approve transitions:
- `director.proposal.ts` triggers `director_approve_min_auto` and then `ensure_purchase_and_incoming_strict`.
- If server-side idempotency is weak, retry/refresh can duplicate purchase/incoming facts.

4. Legacy request projections with schema drift:
- Warehouse fallback request loader selected legacy columns (`level_name`, `system_name`, `zone_name`) from `requests` directly.
- 400 failures caused repeated refetch cycles and operational noise.

## Exact queries / views / RPC at risk
- `src/lib/api/director_reports.ts`
- Table queries:
  - `from("warehouse_issue_items").select(...)` (joined + fallback paths)
  - `from("purchase_items").select(...)`
  - `from("proposal_items").select(...)`
  - `from("wh_ledger").select(...)`
- RPC usage:
  - `director_report_fetch_materials_v1`
  - `director_report_fetch_works_v1`
  - `director_report_fetch_summary_v1`
  - `wh_report_issued_*_fast`

- `src/screens/director/useDirectorScreenController.ts`
- View query:
  - `v_director_finance_spend_kinds_v3`

- `src/screens/warehouse/warehouse.api.ts`
- Request fallback loader query:
  - `from("requests").select("...")` during page-0 backfill

## Multiplicative join points
- Director discipline fallback where issue lines are enriched by request context and cost context.
- Risky when issue rows are re-read and enriched from multiple layers without a stable row identity.
- Implemented hardening: dedupe by `warehouse_issue_items.id` in both joined and fallback paths.

## Missing idempotency points
- Client-side cannot guarantee idempotency of:
  - `director_approve_min_auto`
  - `ensure_purchase_and_incoming_strict`
  - downstream purchase/incoming/ledger materialization
- Requires server-side uniqueness/UPSERT guarantees by canonical business key (`proposal_id`, `request_item_id`, transition stage).

## Double-count risk map
- High:
  - Director discipline cost fallback using `proposal_items` prices.
  - Any KPI assembled from both workflow (`proposal_*`) and fact (`purchase_*`, `wh_ledger`, `accounting_*`) in same metric.

- Medium:
  - Warehouse issue line enrichments where same line may be read from multiple fallback paths.

- Low:
  - Buyer inbox grouping itself (UI-level grouping only).

## Recommended canonical fix path
1. Director KPIs:
- Finance: `accounting_invoices` + `accounting_payments` only.
- Purchases: `purchases` + `purchase_items` only.
- Stock movement: `wh_ledger` + warehouse incoming/issue facts only.
- Services/works: `subcontracts` (+items) and approved purchase facts only.

2. Buyer proposal flow:
- Keep chain `request -> proposal -> director decision -> purchase -> warehouse/accounting facts`.
- Persist explicit type + entity bindings in proposal rows (`material/service/work` + supplier/contractor entity IDs).

3. Anti-duplication:
- Enforce server idempotency keys on approve transition.
- Prevent multi-write of purchase/incoming/ledger for same approved proposal item.

4. Warehouse loader:
- Keep adaptive request projection (column-plan fallback) to survive schema drift without repeated 400 loops.

## Safe rollout plan
1. Deploy client patch for adaptive warehouse request loader + issue-item dedupe guards.
2. Turn on debug logging for fallback usage and schema-plan downgrade events.
3. Run smoke on Director/Buyer/Warehouse screens with production-like data.
4. Validate no repeated 400 and no inflated row counts on discipline report.
5. Plan DB-level idempotency/typing migration as separate controlled release.
