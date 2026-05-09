# S_AUDIT_NIGHT_BATTLE_139_CACHE_MARKETPLACE_SHADOW_CANARY_CONTRACT

## Scope

This wave is a contract-only cache safety lock. It does not enable production cache, does not change remote env, does not deploy, and does not route production traffic through cache.

Selected files:
- `tests/scale/cacheMarketplaceShadowCanaryContract.test.ts`
- `artifacts/S_AUDIT_NIGHT_BATTLE_139_CACHE_MARKETPLACE_SHADOW_CANARY_CONTRACT_matrix.json`
- `artifacts/S_AUDIT_NIGHT_BATTLE_139_CACHE_MARKETPLACE_SHADOW_CANARY_CONTRACT_proof.md`

Read-only evidence files:
- `src/shared/scale/cachePolicies.ts`
- `src/shared/scale/cacheShadowRuntime.ts`
- `src/shared/scale/cacheKeySafety.ts`
- `src/shared/scale/cacheAdapters.ts`
- `src/shared/scale/bffShadowFixtures.ts`
- `scripts/server/stagingBffServerBoundary.ts`
- `tests/scale/cacheIntegrationBoundary.test.ts`
- `tests/scale/bffStagingServerBoundary.test.ts`
- `tests/architecture/architectureAntiRegressionSuite.test.ts`

## Fresh Scan

Commands run:
- `git grep -n "read_through" src scripts tests`
- `git grep -n "marketplace.catalog.search" src scripts tests docs`
- `git grep -n "payloadClass" src/shared/scale scripts/server tests/scale`
- `git grep -n "cache_read_through\|shadow_readonly\|cache.shadow_canary" src scripts tests`
- `rg -n "as any|@ts-ignore|catch \{\}|unknown as" tests/scale/cacheMarketplaceShadowCanaryContract.test.ts`

The scan confirmed the serving gate is in `scripts/server/stagingBffServerBoundary.ts`, where read-through rejects any cache policy whose payload class is not `public_catalog`. The only current `public_catalog` policy is `marketplace.catalog.search`.

## Before

Wave 138 produced the enablement map and picked `marketplace.catalog.search` as the only current read-through canary candidate. It did not add a dedicated regression test that proves the route cannot broaden.

## After

Added `tests/scale/cacheMarketplaceShadowCanaryContract.test.ts`.

The contract proves:
- `marketplace.catalog.search` is the only `public_catalog` cache policy.
- `marketplace.catalog.search` is the only BFF read route eligible for current read-through serving.
- Cache policies remain disabled by default.
- BFF read route cache metadata remains disabled by default.
- A deterministic 1 percent marketplace input is served from cache only on the second identical selected request.
- Tenant, finance, and stock read routes still call fixture read ports twice under read-through mode.
- Disabled production shadow flag leaves marketplace uncached and records disabled monitor decisions.
- Responses and monitor output do not expose raw cache keys, company scope, or raw query payload.

## Gates

Focused tests: PASS.
- `npm test -- --runInBand tests/scale/cacheMarketplaceShadowCanaryContract.test.ts tests/scale/cacheIntegrationBoundary.test.ts tests/scale/bffStagingServerBoundary.test.ts tests/architecture/architectureAntiRegressionSuite.test.ts`
- 4 suites, 69 tests passed.

Architecture scanner: PASS.
- `npx tsx scripts/architecture_anti_regression_suite.ts --json`
- service bypass findings: 0.
- service bypass files: 0.
- transport-controlled findings: 175.
- unclassified direct Supabase findings: 0.
- cache canary route scoped: true.
- cache allowed route: `marketplace.catalog.search`.
- rate-limit canary route: `marketplace.catalog.search`.
- rate-limit canary percent: 1.
- production raw loops: 0.
- unsafe cast ratchet current total: 189, unchanged from baseline.

Additional gates:
- Typecheck: PASS.
  - `npx tsc --noEmit --pretty false`
- Lint: PASS.
  - `npx expo lint`
- Full Jest runInBand: PASS.
  - `npm test -- --runInBand`
  - 672 passed, 1 skipped, 673 total suites.
  - 3991 passed, 1 skipped, 3992 total tests.
- `git diff --check`: PASS.
- Post-push release verify: pending after push.

## Negative Confirmations

No production cache enablement, production calls, DB writes, migrations, env writes, deploy, OTA, live load tests, cache/rate-limit production enablement, Supabase project changes, spend cap changes, Realtime capacity work, force push, tags, secrets printed, empty catch blocks, ts-ignore, as-any casts, scanner weakening, test deletion, or business-semantic refactor.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE.
