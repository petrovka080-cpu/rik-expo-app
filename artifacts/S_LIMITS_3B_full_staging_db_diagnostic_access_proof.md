# S-LIMITS-3B Full Staging DB Diagnostic Access

Status: `GREEN_FULL_STAGING_DB_METADATA_RECORDED_S_LOAD_11_NOT_APPROVED`.

## Scope
- Used `STAGING_SUPABASE_DB_URL` from gitignored `.env.staging.local` for staging-only DB diagnostics.
- Confirmed the DB URL exists, the host is the Session Pooler, and the project ref matches staging without printing the value.
- Used an ephemeral `pg` driver in a temp workspace outside the repo because `psql` was unavailable.
- Did not modify `package.json` or lockfiles.

## Preflight
- HEAD == origin/main at start: YES (`e04a450fb3bbca685e021407bc43b363c599a67a`)
- worktree clean at start: YES
- `.env.staging.local` gitignored: YES
- staging project ref confirmed: YES
- production project selected: NO
- `PROD_*` / `PRODUCTION_*` env accepted or used: NO

## DB Diagnostic Result
- connection status: connected
- host resolved: YES
- SSL used: YES
- read-only transaction used: YES
- client query timeout: 10000 ms
- business tables queried: NO
- business rows dumped: NO
- raw payloads printed: NO

## Metadata
- `statement_timeout`: `2min` / `120000 ms`
- `max_connections`: `120`
- `idle_in_transaction_session_timeout`: `0 ms`
- `lock_timeout`: `0 ms`
- `current_database`: `postgres`
- `server_version`: `17.6`
- `shared_buffers`: `1GB`
- `work_mem`: `7MB`
- `effective_cache_size`: `3GB`
- `max_worker_processes`: `6`
- `max_parallel_workers`: `2`
- `max_parallel_workers_per_gather`: `1`

## Migration History
- `supabase_migrations.schema_migrations` count: `161`
- latest versions:
  - `20260430143000`
  - `20260430124500`
  - `20260430122500`
  - `20260430120500`
  - `20260430114500`
- Fix-6 migration `20260430143000` is present in latest five.

## Connection Summary
- `pg_stat_database` available: YES
- current database backends: `8`
- `pg_stat_activity` state counts available: YES
- state counts: active `1`, idle `5`, null `2`
- `pg_class` relkind counts available: YES

## S-LOAD-11 Decision
- `s_load_11_can_be_reconsidered=true`
- `s_load_11_allowed_now=false`

The DB metadata blocker is now cleared after the Medium compute upgrade. S-LOAD-11 is still not allowed in this wave because live 1K approval is `NOT_APPROVED_YET`, API status is still warning, spend cap remains enabled, and the operator has not accepted the load window risk.

Command to use only in a future explicit approval wave:

```powershell
$env:STAGING_SUPABASE_LIMITS_CONFIRMED='true'; $env:STAGING_LOAD_OPERATOR_APPROVED='true'; npx tsx scripts/load/staging-load-test.ts --profile bounded-1k --allow-live
```

## Remaining Human Actions
- Explicitly approve the live S-LOAD-11 run window.
- Accept or clear the current Supabase API warning/error state before the run.
- Accept spend-cap and included-usage risk for the intended load window, or adjust billing controls.
- Optionally recheck post-Medium Supabase pooler UI limits for backend pool size and max client connections; DB `max_connections` is now confirmed as `120`.

## Gates
- JSON artifact parse: PASS
- `git diff --check`: PASS
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS
- `npm test`: PASS
- `npm run release:verify -- --json`: PASS

## Safety
- production touched: NO
- production accessed: NO
- business table row queries: NO
- row dumps / exports: NO
- migrations / destructive SQL / writes: NO
- live 1K load: NO
- 50K load: NO
- BFF deploy: NO
- Redis/Queue/idempotency/rate/observability enablement: NO
- env values / connection string / password / secrets printed: NO
- `.env.staging.local` committed: NO
