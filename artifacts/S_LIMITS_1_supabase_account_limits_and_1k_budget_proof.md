# S-LIMITS-1 Supabase Account Limits And 1K Budget Proof

Status: `BLOCKED_SUPABASE_LIMITS_NEED_HUMAN_CONFIRMATION`.

## Scope
- Production-safe proof wave only.
- No live 1K load run, no 50K load run, no production access, no BFF deploy, and no provider enablement.
- No env values, secrets, raw payloads, raw rows, or screenshots were printed.

## Preflight
- HEAD == origin/main at start: YES (`9ec8729a745c341374da58830e95ab0cfcc933d5`)
- worktree clean at start: YES
- `.env.staging.local` and `.env.local` gitignored: YES
- release verify run by this wave: YES
- source artifacts read: `S_LOAD_10_1k_concurrency_preflight_matrix.json`, `S_LOAD_10_1k_concurrency_preflight_proof.md`, `S_50K_READINESS_MASTER_MATRIX_1.json`, `S_READINESS_10K_PROOF_matrix.json`

## Safe Supabase Inspection
- staging project identity: confirmed from local redacted Supabase metadata
- production project selected: NO
- staging env presence checked without printing values: YES
- Supabase CLI/account API available locally: NO
- account tier/status confirmed: NO
- pooler limits confirmed: NO
- connection limits confirmed: NO
- API rate limits confirmed: NO
- account/project statement timeout confirmed: NO
- disk/IO warning status confirmed: NO
- backup/PITR status confirmed: NO

The local Supabase temp metadata was enough to confirm that this workspace is pointed at the staging project, but it is not enough to prove account tier, pooler mode, maximum connections, rate limits, disk/IO health, or backup/PITR state. This wave therefore does not fake account-limit readiness.

## 1K Operator Budget
- profile: `bounded-1k`
- max concurrency: 1000
- ramp steps: 25, 50, 100, 250, 500, 750, 1000
- ramp window / max test duration: 900000ms
- max total requests: 1000
- per-request timeout: 8000ms
- cooldown: 500ms
- abort on SQLSTATE 57014: YES
- abort on HTTP 429: YES
- abort on 5xx spike: YES
- abort on error rate >= 2%: YES
- abort/optimize on latency >= 1500ms: YES
- watch latency threshold: 800ms
- read-only bounded targets only: YES

## Decision
`S_LOAD_11_ALLOWED=false`.

Missing confirmations:
- Confirm the staging Supabase project tier/status and compute size from the Supabase dashboard or a secret-safe account export.
- Confirm pooler mode and maximum client/connection limits for the staging project.
- Confirm Postgres `max_connections`, reserved connections, and an operator-approved connection budget for `maxConcurrency=1000`.
- Confirm API/PostgREST request rate limits and expected 429 behavior for the staging project.
- Confirm the staging Postgres `statement_timeout` or equivalent project timeout policy.
- Confirm disk, IO, and database health warning status before a 1K run window.
- Confirm backup/PITR status for the staging project.
- Approve the bounded 1K operator budget and set `STAGING_SUPABASE_LIMITS_CONFIRMED=true` only after limits meet the budget.
- Set `STAGING_LOAD_OPERATOR_APPROVED=true` only for the approved S-LOAD-11 run window.

Exact command to run only after the matrix can honestly flip to allowed:

```powershell
$env:STAGING_SUPABASE_LIMITS_CONFIRMED='true'; $env:STAGING_LOAD_OPERATOR_APPROVED='true'; npx tsx scripts/load/staging-load-test.ts --profile bounded-1k --allow-live
```

## Gates
- JSON artifact parse: PASS
- targeted limits/budget test: PASS
- `git diff --check`: PASS
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS
- `npm test`: PASS
- `npm run release:verify -- --json`: PASS

## Safety
- production touched: NO
- production accessed: NO
- 1K load run: NO
- 50K load run: NO
- BFF deployed: NO
- Redis/Queue/idempotency/rate/observability enabled: NO
- migrations applied: NO
- SQL/RPC/RLS/storage changed: NO
- secrets/env values/raw payloads printed: NO

