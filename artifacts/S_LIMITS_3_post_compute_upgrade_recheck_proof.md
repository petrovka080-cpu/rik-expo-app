# S-LIMITS-3 Post Compute Upgrade Recheck

Status: `PARTIAL_POST_COMPUTE_UPGRADE_RECHECK_DB_METADATA_UNAVAILABLE`.

## Scope
- Human-confirmed post-upgrade Supabase dashboard evidence was recorded.
- No live 1K load run, no 50K load run, no production access, no BFF deploy, and no provider enablement.
- No env values, secrets, connection strings, raw payloads, raw rows, payment details, invoices, cards, addresses, or personal billing data were recorded.

## Preflight
- HEAD == origin/main at start: YES (`023c60c57e4eb5258c72ab6fb6007c8c0717deb2`)
- worktree clean at start: YES
- `.env.staging.local` gitignored: YES
- production project selected: NO

## Post-Upgrade Evidence
- compute upgrade completed: YES
- old compute: Micro
- new/current compute: Medium
- memory: 4 GB
- CPU: 2-core ARM CPU
- hourly price visible: 0.0822 USD/hour
- Auth version: 2.189.0
- PostgREST version: 13.0.5
- Postgres version: 17.6.1.054
- latest Postgres version available: 17.6.1.111
- Postgres version upgrade available: YES
- Postgres version upgrade performed: NO
- baseline IO bandwidth: 347 Mbps
- maximum IO bandwidth burst: 2085 Mbps
- daily burst time limit: 30 mins
- disk used: 2.19 GB of 8 GB
- disk IO status: normal
- CPU/memory status after upgrade: normal
- spend cap: enabled

## Reachability
- `auth/v1/health` with staging apikey: HTTP 200
- REST root without business-table query: HTTP 401
- conclusion: staging auth/gateway is reachable and dashboard health is normal, but PostgREST/DB metadata is not proven by this safe probe.

## DB Metadata Checks
Requested checks:
- `show statement_timeout;`
- `show max_connections;`
- `show idle_in_transaction_session_timeout;`
- `show lock_timeout;`
- `select current_database();`
- `select current_setting('server_version', true);`

Result: not checked safely. There was no direct staging database URL, no `psql` binary, no Supabase CLI/access token, and no existing metadata RPC/view. Running these checks through REST would require SQL/RPC changes, which are forbidden in this wave.

No business tables were queried. No rows were dumped.

## S-LOAD-11 Decision
- `s_load_11_can_be_reconsidered=false`
- `s_load_11_allowed_now=false`

Medium compute improves the capacity posture, but S-LOAD-11 remains blocked because:
- operator approval is still `NOT_APPROVED_YET`
- DB metadata checks did not succeed
- `statement_timeout` is unknown
- `max_connections` is unknown
- post-Medium pool/client limits still need recheck
- API warning/error state has not been explicitly accepted for the run
- API/Auth/Realtime/platform limits remain unknown
- spend cap remains enabled
- `STAGING_BFF_BASE_URL` remains missing

Exact command to use only after a future approval wave flips the gates:

```powershell
$env:STAGING_SUPABASE_LIMITS_CONFIRMED='true'; $env:STAGING_LOAD_OPERATOR_APPROVED='true'; npx tsx scripts/load/staging-load-test.ts --profile bounded-1k --allow-live
```

## Gates
- JSON artifact parse: PASS
- targeted post-compute upgrade recheck test: PASS
- `git diff --check`: PASS
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS
- `npm test`: PASS
- `npm run release:verify -- --json`: PASS

## Safety
- production touched: NO
- production accessed: NO
- live 1K load run: NO
- 50K load run: NO
- BFF deployed: NO
- Redis/Queue/idempotency/rate/observability enabled: NO
- SQL/RPC/RLS/storage changed: NO
- business tables queried: NO
- secrets/env values/raw payloads printed: NO
- fake confirmation: NO

