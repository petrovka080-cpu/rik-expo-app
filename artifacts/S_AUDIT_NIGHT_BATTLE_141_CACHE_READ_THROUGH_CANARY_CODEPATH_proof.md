# S_AUDIT_NIGHT_BATTLE_141_CACHE_READ_THROUGH_CANARY_CODEPATH

## Scope

This wave adds a safe read-through cache serving path for one low-risk candidate from wave 138:

- Candidate: `marketplace.catalog.search`
- Payload class: `public_catalog`
- Feature flag: `SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED`
- Default: off

No production cache was enabled. No remote env was changed.

## Fresh Scan

Commands run:

- `rg -n "cache" src scripts tests artifacts docs`
- `rg -n "canary" src scripts tests artifacts docs`
- `rg -n "ttl|TTL" src scripts tests artifacts docs`
- `rg -n "SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED|readThroughV1Enabled|cache_read_through_v1_flag_disabled" src/shared/scale scripts/server tests/scale tests/architecture scripts/architecture_anti_regression_suite.ts`

The scan confirmed the wave 138 top candidate and the existing cache shadow/read-through scaffold.

## Before

- `read_through` mode could serve the eligible public catalog route when cache shadow production config was supplied.
- There was no separate local versioned flag for serving read-through responses.
- Existing cache policy defaults and BFF route defaults were still disabled.

## After

- Added `SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED`.
- The flag defaults off.
- `read_through` mode now requires the v1 flag before cache can serve a response.
- Flag-off behavior stays on the provider path and issues no cache adapter commands.
- Flag-on behavior for `marketplace.catalog.search`:
  - first read uses provider and stores a TTL-bounded envelope;
  - second identical read can return the cached envelope;
  - TTL expiry returns to provider and refreshes the cache.

## Safety Proof

- Deterministic key remains owned by `buildSafeCacheKey`.
- TTL remains controlled by the `marketplace.catalog.search` cache policy: `120000` ms.
- Scope remains bounded by company, query, category, page, page size, filters, and locale key parts.
- Role/user scope is not required for this public catalog payload class.
- Provider error envelope matches the no-cache baseline.
- Cache read/write errors do not break provider fallback.
- Tenant, finance, and stock payload classes remain excluded from serving cache.

## Focused Tests

PASS:

`npm test -- --runInBand tests/scale/cacheReadThroughCanaryCodepath.test.ts tests/scale/cacheMarketplaceShadowCanaryContract.test.ts tests/scale/cacheStaleDataContracts.test.ts tests/scale/bffStagingServerBoundary.test.ts tests/scale/cacheIntegrationBoundary.test.ts tests/scale/providerRuntimeConfig.test.ts tests/architecture/architectureAntiRegressionSuite.test.ts`

Result:

- 7 suites passed.
- 83 tests passed.

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
- 4011 tests passed, 1 skipped, 4012 total.

Architecture scanner result:

- service bypass findings: 0.
- service bypass files: 0.
- transport-controlled findings: 175.
- unclassified direct Supabase findings: 0.
- cache canary route scoped: `marketplace.catalog.search`.

## Negative Confirmations

No production calls, DB writes, migrations, env writes, deploy, OTA, live load tests, production cache enablement, Supabase project changes, spend cap changes, Realtime capacity work, force push, tags, secrets printed, empty catch blocks, ts-ignore comments, as-any casts, scanner weakening, test deletion, or business-semantic refactor.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE.
