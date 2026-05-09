# S_AUDIT_NIGHT_BATTLE_133_UNSAFE_CAST_DOMAIN_BATCH_A_REQUESTS_BUYER_WAREHOUSE Proof

## Scope

- Reduced selected unsafe casts in requests, buyer, and warehouse domain flows.
- Kept validation and row/payload mapping in service code.
- Kept provider IO in transport/provider-owned boundaries.
- Did not change production traffic, DB state, migrations, remote env, deploy, OTA, Supabase project settings, spend caps, or Realtime capacity.

## Fresh Scan

Preflight:

- `git fetch origin`: PASS
- `git status --short`: clean
- `git status -sb`: `## main...origin/main`
- `HEAD == origin/main`: `6d65d9bbc47003536488dd164687df52d5a3c698`
- ahead/behind: `0/0`

Selected findings before:

- `src/lib/api/requestCanonical.read.ts`: 3 `as unknown as PagedQuery<UnknownRow>` casts.
- `src/lib/api/buyer.ts`: 1 `client as unknown as BuyerInboxScopeRpcTransport` and 6 `as unknown as PagedQuery<...>` casts.
- `src/screens/warehouse/warehouse.stockReports.service.ts`: 3 `as unknown as PagedQuery<UnknownRow>` casts.
- `src/lib/api/_core.ts`: 1 `return [] as unknown as T` fallback cast.

Selected findings after:

- `git grep -n -E "as any|unknown as|@ts-ignore|@ts-expect-error" -- src/lib/api/requestCanonical.read.ts src/lib/api/buyer.ts src/screens/warehouse/warehouse.stockReports.service.ts src/screens/buyer/buyer.repo.read.transport.ts src/lib/api/_core.ts src/lib/api/_core.transport.ts`: PASS, 0 findings.

## Changes

- Added shared `createGuardedPagedQuery` / row guard primitive in `src/lib/api/_core.ts`.
- Reused the shared guard from buyer read transport to preserve existing imports.
- Replaced request canonical row PagedQuery casts with guarded adapters.
- Replaced buyer proposal/status/fallback PagedQuery casts with guarded adapters.
- Moved buyer legacy scope RPC through existing `_core.transport` runner without adding provider call sites.
- Replaced warehouse stock name-map source PagedQuery casts with guarded adapters.
- Added tests for happy path, malformed row, missing optional field, null values, provider error preservation, and buyer malformed fallback row.

## Gates

- focused tests: PASS
  - 10 suites passed, 49 tests passed
- typecheck: PASS
  - `npx tsc --noEmit --pretty false`
- lint: PASS
  - `npx expo lint`
- full Jest runInBand: PASS
  - `npm test -- --runInBand`
  - 667 suites passed, 1 skipped, 3958 tests passed, 1 skipped
- architecture scanner: PASS
  - `npx tsx scripts/architecture_anti_regression_suite.ts --json`
  - serviceBypassFindings: 0
  - serviceBypassFiles: 0
  - transportControlledFindings: 175
  - unclassifiedCurrentFindings: 0
  - production raw loop unapproved findings: 0
- git diff --check: PASS
- release verify post-push: PENDING

## Negative Confirmations

No production calls, DB writes, migrations, env writes, deploy, OTA, live load tests, cache/rate-limit production enablement without versioned safe flag, Supabase project changes, spend cap changes, Realtime capacity work, force push, tags, secrets printed, catch {}, @ts-ignore, or as any.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE
