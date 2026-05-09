# S_AUDIT_NIGHT_BATTLE_140_CACHE_DRY_RUN_METRICS

## Scope

This wave adds cache dry-run instrumentation only. It does not enable production cache, does not change remote env, does not deploy, and does not route app traffic through cached responses.

Selected files:
- `src/shared/scale/cacheShadowRuntime.ts`
- `scripts/server/stagingBffServerBoundary.ts`
- `tests/scale/cacheDryRunMetrics.test.ts`
- `artifacts/S_AUDIT_NIGHT_BATTLE_140_CACHE_DRY_RUN_METRICS_matrix.json`
- `artifacts/S_AUDIT_NIGHT_BATTLE_140_CACHE_DRY_RUN_METRICS_proof.md`

## Fresh Scan

Commands run:
- `rg -n "wouldCache|cacheHit|cache\\.hit|cache\\.miss|recordMetric|recordEvent|recordSpan|platformObservability|createCacheShadowMonitor|CacheShadowMonitor|serverTiming" src scripts tests docs`
- `rg -n "cacheShadow|invokeReadRouteWithCacheReadThrough|observeBffStagingCacheShadow|handleBffStagingServerRequest|BFF_STAGING_READ_ROUTES" scripts/server src/shared/scale tests/scale`
- `npx tsx scripts/architecture_anti_regression_suite.ts --json`
- Forbidden suppression scan over changed code/test files.

## Proof

Existing observability pattern:
- Scale observability contracts live in `src/shared/scale/scaleObservabilityEvents.ts`.
- Metric policy contracts live in `src/shared/scale/scaleMetricsPolicies.ts`.
- Cache shadow/dry-run aggregate monitoring already lives in `src/shared/scale/cacheShadowRuntime.ts`.
- BFF monitor envelopes are emitted by `scripts/server/stagingBffServerBoundary.ts`.

New dry-run fields:
- `dryRunDecisionCount`
- `wouldCacheRead`
- `wouldCacheHit`
- `wouldCacheMiss`
- `wouldCacheBypassReason`

The new contract test verifies:
- Dry-run emits `wouldCacheHit` when a marketplace key is already cached.
- Dry-run still returns the live provider row, not the cached row.
- Dry-run emits `wouldCacheMiss` when the cache is empty.
- A provider error is not masked by a dry-run cache hit.
- An unavailable cache adapter preserves live provider success and records a redacted bypass reason.
- Disabled dry-run records only minimal telemetry and preserves the live provider result.

## Gates

- Focused tests: PASS.
  - `npm test -- --runInBand tests/scale/cacheDryRunMetrics.test.ts tests/scale/cacheStaleDataContracts.test.ts tests/scale/cacheMarketplaceShadowCanaryContract.test.ts tests/scale/cacheIntegrationBoundary.test.ts tests/scale/scaleObservabilityBoundary.test.ts`
  - 5 suites, 46 tests passed.
- Typecheck: PASS.
  - `npx tsc --noEmit --pretty false`
- Lint: PASS.
  - `npx expo lint`
- Architecture scanner: PASS.
  - `npx tsx scripts/architecture_anti_regression_suite.ts --json`
  - service bypass findings: 0.
  - unclassified direct Supabase findings: 0.
  - cache canary route scoped: true.
  - cache allowed route: `marketplace.catalog.search`.
- Full Jest runInBand: PASS.
  - `npm test -- --runInBand`
  - 675 passed, 1 skipped, 676 total suites.
  - 4006 passed, 1 skipped, 4007 total tests.
- `git diff --check`: PASS.
- Post-push release verify: pending after push.

## Negative Confirmations

No production cache enablement, production calls, DB writes, migrations, env writes, deploy, OTA, live load tests, cache/rate-limit production enablement, Supabase project changes, spend cap changes, Realtime capacity work, force push, tags, secrets printed, empty catch blocks, ts-ignore, as-any casts, scanner weakening, test deletion, or business-semantic refactor.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE.
