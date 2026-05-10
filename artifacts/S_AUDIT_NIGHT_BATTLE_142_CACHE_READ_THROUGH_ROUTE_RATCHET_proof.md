# S_AUDIT_NIGHT_BATTLE_142_CACHE_READ_THROUGH_ROUTE_RATCHET

## Scope

This wave locks read-through v1 serving to the single approved route:

- `marketplace.catalog.search`

No production cache was enabled, and no remote env was changed.

## Fresh Scan

Command run:

- `rg -n "read_through|readThroughV1|CACHE_READ_THROUGH|marketplace.catalog.search|payloadClass|cache_read_through" src/shared/scale scripts/server tests/scale tests/architecture scripts/architecture_anti_regression_suite.ts`

The scan confirmed that wave 141 had introduced a versioned flag, but the route ratchet needed to be explicit in code.

## Before

- Read-through v1 required `SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED`.
- Serving was still effectively limited by the current single `public_catalog` policy.
- A future public catalog policy could broaden serving unless code and tests caught it.

## After

- Added `CACHE_READ_THROUGH_V1_ALLOWED_ROUTES`.
- Added `isCacheReadThroughV1RouteAllowed`.
- BFF read-through serving now requires:
  - `read_through` mode;
  - v1 flag enabled;
  - route present in the v1 allowed-route constant;
  - public catalog payload class;
  - runtime route allowlist;
  - deterministic safe key;
  - percent selection;
  - available cache adapter.
- Architecture scanner now checks for the explicit v1 route ratchet.

## Focused Tests

PASS:

`npm test -- --runInBand tests/scale/cacheReadThroughCanaryCodepath.test.ts tests/architecture/architectureAntiRegressionSuite.test.ts tests/scale/cacheMarketplaceShadowCanaryContract.test.ts`

Result:

- 3 suites passed.
- 23 tests passed.

## Gates

- focused tests: PASS
- typecheck: PASS
- lint: PASS
- full Jest runInBand: PASS
- architecture scanner: PASS
- git diff check: PASS
- release verify post-push: PENDING

Full Jest result:

- 676 suites passed, 1 skipped, 677 total.
- 4012 tests passed, 1 skipped, 4013 total.

Architecture scanner result:

- service bypass findings: 0.
- service bypass files: 0.
- transport-controlled findings: 175.
- unclassified direct Supabase findings: 0.
- cache canary route scoped: `marketplace.catalog.search`.
- read-through v1 allowed route: `marketplace.catalog.search`.

## Negative Confirmations

No production calls, DB writes, migrations, env writes, deploy, OTA, live load tests, production cache enablement, Supabase project changes, spend cap changes, Realtime capacity work, force push, tags, secrets printed, empty catch blocks, ts-ignore comments, as-any casts, scanner weakening, test deletion, or business-semantic refactor.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE.
