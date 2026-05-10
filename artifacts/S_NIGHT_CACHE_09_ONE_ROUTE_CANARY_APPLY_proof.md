# S_NIGHT_CACHE_09_ONE_ROUTE_CANARY_APPLY

final_status: BLOCKED_CACHE_CANARY_FAILED_ROLLED_BACK
generated_at: 2026-05-11T00:26:04.8230422+06:00

## Prerequisite

- WAVE 08: `GREEN_CACHE_COLD_MISS_SECOND_HIT_PROOF`
- HEAD at start: `b69e092dbe3bf5f3b518cd1e7a32b82431da1ac5`
- HEAD == origin/main: yes
- ahead/behind at start: 0/0
- worktree at start: clean

## Apply Attempt

The approval-gated canary lifecycle was run for:

- route: `marketplace.catalog.search`
- route allowlist count: 1
- canary percent: 1
- env snapshot: captured and redacted
- health/ready before: 200/200
- baseline read: 2xx, `cacheHit=false`
- versioned read-through env keys written: 5
- deploy: triggered and reached live
- health/ready after deploy: 200/200

## Blocker

The canary was not allowed to continue into miss/hit route calls because readiness reported:

- runtime status: `configured`
- runtime mode: `read_through`
- runtime read-through v1 enabled: `false`
- runtime route allowlist count: 1

Blocked reason: `runtime_not_scoped_to_one_route`.

This is ambiguous after apply, so the lifecycle rolled back immediately.

## Rollback

- rollback required: true
- rollback triggered: true
- rollback succeeded: true
- rollback deploy status: live
- health/ready after rollback: 200/200
- canary retained: false

## Canary Requests

- miss path: not run, blocked before route probes
- hit path: not run, blocked before route probes
- unapproved route fallback path: not run, blocked before route probes
- UTF-8 input selection: prepared and safe
- counters: not accepted because runtime flag did not become true

## Source Evidence

The lifecycle wrote its redacted source artifact:

- `artifacts/S_CACHE_02_ONE_ROUTE_READ_THROUGH_CANARY_matrix.json`
- `artifacts/S_CACHE_02_ONE_ROUTE_READ_THROUGH_CANARY_proof.md`

## Gates

- focused tests: PASS (`3 suites passed, 22 tests passed`)
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS (env names only, no values)
- `npm test -- --runInBand`: PASS (`695 suites passed, 1 skipped; 4086 tests passed, 1 skipped`)
- architecture scanner: PASS
- `git diff --check`: PASS
- artifact JSON parse: PASS
- post-push release verify: pending until after push

## Negative Confirmations

No second route, no 5%/10% route expansion, no rate-limit change, no DB write, no migration, no Supabase project change, no spend cap change, no production mutation call, no load test, no secret/env value/URL/raw cache key/raw payload printed, no OTA/EAS/TestFlight/native build, no force push, and no tags.

Supabase Realtime status remains `WAITING_FOR_SUPABASE_SUPPORT_RESPONSE`.
