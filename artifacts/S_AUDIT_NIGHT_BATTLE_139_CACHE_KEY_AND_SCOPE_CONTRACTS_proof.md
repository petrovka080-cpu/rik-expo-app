# S_AUDIT_NIGHT_BATTLE_139_CACHE_KEY_AND_SCOPE_CONTRACTS

## Scope

This wave closes cache key/scope risk only. It does not enable production cache, does not change remote env, does not deploy, and does not route production traffic through cache.

Selected files:
- `src/shared/scale/cachePolicies.ts`
- `tests/scale/cacheKeyScopeContracts.test.ts`
- `artifacts/S_AUDIT_NIGHT_BATTLE_139_CACHE_KEY_AND_SCOPE_CONTRACTS_matrix.json`
- `artifacts/S_AUDIT_NIGHT_BATTLE_139_CACHE_KEY_AND_SCOPE_CONTRACTS_proof.md`

## Fresh Scan

Commands run:
- `rg -n "buildSafeCacheKey|cache key|CacheKey|filtersHash|queryHash|payloadClass" src scripts tests docs`
- `rg -n "request\\.proposal\\.list|director\\.pending\\.list|marketplace\\.catalog\\.search" src/shared/scale scripts/server tests/scale docs artifacts`
- `rg -n "locale|status|sort|role|userId|actor|requestId|projectId|objectId" src/shared/scale scripts/server tests/scale docs`
- `rg -n "as any|@ts-ignore|catch \{\}|unknown as" src/shared/scale/cachePolicies.ts tests/scale/cacheKeyScopeContracts.test.ts`

The scan confirmed the existing key builder is centralized in `src/shared/scale/cacheKeySafety.ts` and already hashes `*Hash` key parts from their raw base values, including `queryHash`, `filtersHash`, and the new `actorIdHash`.

## Before

- `marketplace.catalog.search` did not include `filtersHash` or `locale`, so future read-through serving could collapse sort, direction, scope, filter, or locale variants.
- `request.proposal.list` and `director.pending.list` included company and role, but not actor scope.
- `accountant.invoice.list` had the same actor-scope gap for finance-sensitive rows.

## After

Policy key parts now lock:
- `marketplace.catalog.search`: `companyId`, `queryHash`, `category`, `page`, `pageSize`, `filtersHash`, `locale`.
- `request.proposal.list`: `companyId`, `actorIdHash`, `role`, `page`, `pageSize`, `filtersHash`.
- `director.pending.list`: `companyId`, `actorIdHash`, `role`, `page`, `pageSize`, `filtersHash`.
- `accountant.invoice.list`: `companyId`, `actorIdHash`, `role`, `page`, `pageSize`, `filtersHash`.

Added `tests/scale/cacheKeyScopeContracts.test.ts` to prove:
- two users do not share sensitive cache keys;
- two roles do not share sensitive cache keys;
- request/project/object ids inside filters change the key;
- status, sort, direction, scope, pagination, query, category, and locale change the key where relevant;
- same semantic inputs keep stable keys;
- null and undefined normalize consistently;
- auth/session secret material is rejected;
- raw ids are not printed in keys.

## Gates So Far

Focused tests: PASS.
- `npm test -- --runInBand tests/scale/cacheKeyScopeContracts.test.ts tests/scale/cacheIntegrationBoundary.test.ts tests/scale/cacheMarketplaceShadowCanaryContract.test.ts`
- 3 suites, 31 tests passed.

Architecture scanner: PASS.
- `npx tsx scripts/architecture_anti_regression_suite.ts --json`
- service bypass findings: 0.
- service bypass files: 0.
- transport-controlled findings: 175.
- unclassified direct Supabase findings: 0.
- cache canary route scoped: true.
- cache allowed route: `marketplace.catalog.search`.
- production raw loops: 0.
- unsafe cast ratchet current total: 189, unchanged from baseline.

Additional gates:
- Typecheck: PASS.
  - `npx tsc --noEmit --pretty false`
- Lint: PASS.
  - `npx expo lint`
- Full Jest runInBand: PASS.
  - `npm test -- --runInBand`
  - 673 passed, 1 skipped, 674 total suites.
  - 3998 passed, 1 skipped, 3999 total tests.
- `git diff --check`: PASS.
- Post-push release verify: pending after push.

## Negative Confirmations

No production cache enablement, production calls, DB writes, migrations, env writes, deploy, OTA, live load tests, cache/rate-limit production enablement, Supabase project changes, spend cap changes, Realtime capacity work, force push, tags, secrets printed, empty catch blocks, ts-ignore, as-any casts, scanner weakening, test deletion, or business-semantic refactor.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE.
