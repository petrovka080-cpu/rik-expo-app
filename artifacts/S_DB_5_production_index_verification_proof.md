# S-DB-5 Production Index Metadata Verification Proof

Owner goal: 10K/50K+ readiness.
Mode: production-safe read-only index metadata verification.
Status: `PARTIAL_INSUFFICIENT_ACCESS`.

Production writes: NO.
Production data rows read: NO.
DDL executed: NO.
Migration created: NO.
Service-role used: NO.
Secrets printed: NO.
OTA/EAS/Play Market touched: NO.

## Commands Run

```bash
git status --short
git rev-parse HEAD
git rev-parse origin/main
git diff --check
node -e "<redacted env presence check>"
rg "verifyProductionIndexes|S_DB_5|production index|PROD_DATABASE_READONLY_URL|PROD_SUPABASE_READONLY" scripts tests artifacts docs supabase
rg "20260428154000_s_db_2_query_plan_indexes" supabase scripts tests artifacts
node scripts/db/verifyProductionIndexes.mjs --target production --dry-run
node scripts/db/verifyProductionIndexes.mjs --target production --json
npm test -- --runInBand verifyProductionIndexes
```

No `eas build`, `eas submit`, `eas update`, `npm run release:ota`, staging load, DDL, migrations, production writes, or production data-row reads were run.

## Environment

- `PROD_DATABASE_READONLY_URL`: PRESENT, redacted
- `PROD_SUPABASE_URL`: PRESENT, redacted
- `PROD_SUPABASE_READONLY_KEY`: PRESENT, redacted
- Service-role env present: NO
- Service-role used: NO
- Secret values printed: NO

## Verification Method

- Source migration shape: `supabase/migrations/20260428154000_s_db_2_query_plan_indexes.sql`
- Verifier: `scripts/db/verifyProductionIndexes.mjs`
- Target: production
- Preferred credential path: `PROD_DATABASE_READONLY_URL`
- Metadata-only catalogs: `pg_class`, `pg_index`, `pg_attribute`, `pg_namespace`
- App table rows selected: NO
- Raw index metadata dumped: NO
- Connection string printed: NO

The verifier was tightened in this wave to resolve a local `psql.exe` from common Windows PostgreSQL install paths and to classify `psql` failures without printing raw stderr or credential material.

## Dry-Run Result

Command:

```bash
node scripts/db/verifyProductionIndexes.mjs --target production --dry-run
```

Result:

- status: `dry_run`
- production touched: NO
- production metadata read: NO
- production data rows read: NO
- production writes: NO
- DDL executed: NO
- secrets printed: NO

## Live Metadata Verification Result

Command:

```bash
node scripts/db/verifyProductionIndexes.mjs --target production --json
```

Result:

- status: `PARTIAL_INSUFFICIENT_ACCESS`
- expected indexes: 10
- verified indexes: 0
- missing indexes: 0
- insufficient access: YES
- failure class: `authentication_failed`
- metadata verification attempted: YES
- production metadata read: NO
- production data rows read: NO
- production writes: NO
- DDL executed: NO
- migration created: NO
- secrets printed: NO

No fake GREEN was recorded because the provided production metadata credential did not authenticate for the read-only metadata query.

## Expected Index Shapes

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

## Tests

```bash
npm test -- --runInBand verifyProductionIndexes
```

Result: PASS, 10 tests.

Covered:

- missing env returns `env_missing`
- unknown target is rejected
- service-role-like env is not used
- secrets are redacted
- dry-run does not connect
- failed DB metadata access does not leak connection secrets
- index matcher works by table, columns, and predicate
- missing index is reported
- partial index predicate is represented
- no mutation/DDL command is generated

## Gates

- `git diff --check`: PASS
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand verifyProductionIndexes`: PASS
- `npm test -- --runInBand`: PASS, 496 suites passed, 1 skipped; 3134 tests passed, 1 skipped
- `npm test`: PASS, 496 suites passed, 1 skipped; 3134 tests passed, 1 skipped
- `npm run release:verify -- --json`: pending post-commit/push release guard

## Safety

- Business logic changed: NO
- App behavior changed: NO
- SQL/RPC changed: NO
- RLS/storage changed: NO
- Package/native config changed: NO
- Production load generated: NO
- Production writes: NO
- Production data rows read: NO
- DDL executed: NO
- Migration created: NO
- Secrets committed: NO
- Secrets printed: NO
- OTA published: NO
- EAS build triggered: NO
- EAS submit triggered: NO
- EAS update triggered: NO
- Play Market touched: NO

## Readiness Impact

S-DB-5 remains partial. The expected S-DB-2 index shapes were not verified in production because the metadata credential did not authenticate for the read-only catalog query. This blocks claiming production index readiness for 10K/50K+.

## Next Recommended Wave

Provide a working read-only production metadata credential that can connect through `PROD_DATABASE_READONLY_URL` and read `pg_class`, `pg_index`, `pg_attribute`, and `pg_namespace`, then rerun S-DB-5. If S-DB-5 later becomes `GREEN_VERIFIED`, continue with `S-DASH-1B` or `S-RT-4B`.
