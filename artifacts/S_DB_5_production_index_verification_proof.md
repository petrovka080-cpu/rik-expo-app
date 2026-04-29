# S-DB-5 Production Index Verification Proof

Owner goal: 10K/50K+ readiness.
This wave verifies production index presence read-only.
Production writes: NO.
DDL executed: NO.
Service-role used: NO.
Production data rows dumped: NO.
Play Market / Android submit: DEFERRED_BY_OWNER, not touched.
OTA/EAS triggered: NO.

## Status

Status: `PARTIAL_ENV_MISSING`.

Production read-only env is not configured in the current process environment:

- `PROD_SUPABASE_URL`: MISSING
- `PROD_SUPABASE_READONLY_KEY`: MISSING
- `PROD_DATABASE_READONLY_URL`: MISSING

No live production metadata verification was run. This is intentionally not reported as GREEN.

## Sources Inspected

- `supabase/migrations/20260428154000_s_db_2_query_plan_indexes.sql`
- `tests/db/sDb2QueryPlanIndexesMigration.test.ts`
- Existing production monitoring env conventions in `docs/operations/production_monitoring_runbook.md`
- Existing production dashboard artifacts that also record missing production read-only env

The S-DB-2 migration contains 10 additive index definitions. The owner summary groups the market listing path as one query area, but the migration implements two separate indexes for company and user listing slices.

## Expected Indexes

1. `requests(submitted_at, display_no, id)` via `idx_requests_submitted_display_id_sdb2`
2. `request_items(request_id, row_no, position_order, id)` via `idx_request_items_request_row_position_id_sdb2`
3. `request_items(request_id, status, id)` via `idx_request_items_request_status_sdb2`
4. `proposals(submitted_at, id)` partial predicate `submitted_at IS NOT NULL AND sent_to_accountant_at IS NULL` via `idx_proposals_director_pending_submitted_sdb2`
5. `proposals(request_id, supplier, updated_at, id)` via `idx_proposals_request_supplier_updated_sdb2`
6. `proposal_items(proposal_id, id)` via `idx_proposal_items_proposal_id_id_sdb2`
7. `market_listings(company_id, status, created_at, id)` via `idx_market_listings_company_status_created_sdb2`
8. `market_listings(user_id, status, created_at, id)` via `idx_market_listings_user_status_created_sdb2`
9. `work_progress_log(progress_id, created_at, id)` via `idx_work_progress_log_progress_created_sdb2`
10. `wh_ledger(direction, moved_at, id)` via `idx_wh_ledger_direction_moved_at_sdb2`

## Verification Method

Created `scripts/db/verifyProductionIndexes.mjs`.

Safety properties:

- Uses explicit process env only.
- Does not read `.env` files.
- Rejects non-production targets.
- Does not use service-role-like env.
- Supports `--dry-run`.
- Supports fixture-based verification for tests.
- Uses metadata-only tables for DB URL verification: `pg_class`, `pg_index`, `pg_attribute`, `pg_namespace`.
- Does not query production application data rows.
- Does not generate or execute DDL.

## Dry-Run Result

Command:

```bash
node scripts/db/verifyProductionIndexes.mjs --target production --dry-run --json
```

Result:

- status: `env_missing`
- expected indexes: 10
- indexes verified: 0
- production touched: NO
- production metadata read: NO
- production data rows read: NO
- production writes: NO
- DDL executed: NO
- secrets printed: NO

## Live Metadata Verification

Not run, because production read-only env is missing.

Required env for a future GREEN verification:

- Either `PROD_DATABASE_READONLY_URL`
- Or a safe production metadata exposure backed by `PROD_SUPABASE_URL` and `PROD_SUPABASE_READONLY_KEY`

If only Supabase REST read-only credentials exist and pg metadata is not exposed, the script records `insufficient_readonly_access` instead of attempting a service-role workaround.

## Tests

Targeted DB tests:

```bash
npm test -- --runInBand verifyProductionIndexes
```

Result: PASS, 9 tests.

Covered:

- missing env returns `env_missing`
- unknown target rejected
- service-role-like env is not used
- secrets are redacted
- dry-run does not connect
- index matcher works by table, columns, and predicate
- missing index is reported
- partial index predicate is represented
- no mutation/DDL command is generated

## Gates

Pre-edit gate:

- `npm run release:verify -- --json`: PASS

Post-change gates are recorded in final status after commit.

## Safety Confirmations

- Business logic changed: NO
- App behavior changed: NO
- SQL/RPC implementation changed: NO
- RLS/storage changed: NO
- Migration created: NO
- DDL executed: NO
- Production touched: NO
- Production writes: NO
- Staging touched: NO
- Service-role used: NO
- Secrets printed: NO
- Secrets committed: NO
- OTA/EAS triggered: NO
- Play Market / Android submit touched: NO

## Next Recommended Wave

- `S-EMU-SMOKE-1` if no production/staging read-only env is available.
- `S-LOAD-3` if staging env exists and load has not been run.
- Re-run S-DB-5 as `GREEN_VERIFIED` only after explicit production read-only metadata env is provided.
