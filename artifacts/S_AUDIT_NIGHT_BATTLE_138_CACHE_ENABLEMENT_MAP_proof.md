# S_AUDIT_NIGHT_BATTLE_138_CACHE_ENABLEMENT_MAP

## Scope

This wave is an enablement map only. It does not enable production cache, does not change remote env, does not deploy, and does not route app traffic through cache.

Selected files:
- `artifacts/S_AUDIT_NIGHT_BATTLE_138_CACHE_ENABLEMENT_MAP_matrix.json`
- `artifacts/S_AUDIT_NIGHT_BATTLE_138_CACHE_ENABLEMENT_MAP_proof.md`

Read-only evidence files:
- `src/shared/scale/cachePolicies.ts`
- `src/shared/scale/cacheShadowRuntime.ts`
- `src/shared/scale/cacheAdapters.ts`
- `src/shared/scale/cacheKeySafety.ts`
- `src/shared/scale/cacheInvalidation.ts`
- `src/shared/scale/cacheReadModels.ts`
- `src/shared/scale/providerRuntimeConfig.ts`
- `scripts/server/stagingBffServerBoundary.ts`
- `scripts/architecture_anti_regression_suite.ts`
- `tests/scale/cacheIntegrationBoundary.test.ts`
- `tests/scale/bffStagingServerBoundary.test.ts`
- `tests/scale/providerRuntimeConfig.test.ts`

## Fresh Scan

Commands run:
- `git grep -n "cache" src scripts tests`
- `git grep -n "canary" src scripts tests`
- `git grep -n "ttl" src scripts tests`
- `rg -n "cache.*score|score.*cache|5\\.0|5,0|read_through|shadow_readonly|SCALE_REDIS_CACHE" src scripts tests docs artifacts --glob '!artifacts/pdf-*'`
- `rg -n "CACHE_POLICY_REGISTRY|CACHE_READ_MODEL_CONTRACTS|cachePolicyRoute|payloadClass|read_through" src/shared/scale scripts/server tests/scale docs/architecture/50k_cache_integration.md docs/architecture/50k_cache_read_models.md`
- `rg -n "defaultEnabled: false|executionEnabledByDefault: false|cachePolicyDefaultEnabled: false|payload_class_not_allowlisted|public_catalog" src/shared/scale scripts/server tests/scale docs`

## Why The Score Stays At 5.0

No direct score calculator for cache/rate-limit was found in the scanned files, so the 5.0 explanation is inferred from the actual contracts and guardrails:

- Cache infra exists, but every `CACHE_POLICY_REGISTRY` entry is disabled by default.
- BFF read routes carry cache metadata, but `cachePolicyDefaultEnabled` is false.
- Cache read models are `contract_only`.
- Redis/cache provider access is gated behind explicit server-side env flags and required env.
- The architecture scanner only proves the cache/rate canary scope is narrow: `marketplace.catalog.search` at 1 percent for rate-limit canary.
- Real read-through serving is currently allowed only for `payloadClass === "public_catalog"`.
- Invalidation tags are mapped, but invalidation execution is disabled.
- No production cache/canary flag was enabled in this wave.

That is a prepared-but-not-enabled state, which explains why the readiness score does not move beyond the scaffold level.

## Enablement Map

Top safe candidate:
- `marketplace.catalog.search`
- Current code path can serve read-through if a future owner-approved server config enables it.
- Reason: `public_catalog`, deterministic request shape, low write frequency, bounded 120s TTL, PII-safe hashed key parts, existing route-scoped guardrail.

Next shadow-only candidates:
- `request.proposal.list`
- `director.pending.list`

Both are high-read BFF list routes with explicit role/company key parts and invalidation tags. They are not current read-through serving candidates because `tenant_business` payloads are intentionally skipped by the read-through gate. They need role-scope parity and invalidation proof first.

Not ready:
- `accountant.invoice.list`: finance-sensitive.
- `warehouse.ledger.list`: stock freshness sensitive.
- `warehouse.stock.page`: 5s TTL and no stale window; needs freshness proof.
- `warehouse.issue.queue`: hotspot policy only; DB/RPC proof still needed.
- `buyer.summary.inbox`: hotspot policy only; no staging read route currently attaches it.

## Canary Path

Safe future path for `marketplace.catalog.search`:
1. Synthetic canary only.
2. Shadow-readonly at 1 percent.
3. Read-through at 1 percent only after owner approval, monitor proof, rollback proof, and full gates.

This wave stopped before step 1 in production.

## Gates So Far

- Focused tests: PASS.
  - `npm test -- --runInBand tests/scale/cacheIntegrationBoundary.test.ts tests/scale/bffStagingServerBoundary.test.ts tests/architecture/architectureAntiRegressionSuite.test.ts tests/scale/providerRuntimeConfig.test.ts`
  - 4 suites, 71 tests passed.
- Architecture scanner: PASS.
  - `npx tsx scripts/architecture_anti_regression_suite.ts --json`
  - `cacheCanaryRouteScoped=true`
  - `cacheAllowedRoute=marketplace.catalog.search`
  - `rateLimitCanaryRoute=marketplace.catalog.search`
  - `rateLimitCanaryPercent=1`
  - service bypass findings: 0.
  - unclassified direct Supabase findings: 0.

Additional gates:
- Typecheck: PASS.
  - `npx tsc --noEmit --pretty false`
- Lint: PASS.
  - `npx expo lint`
- Full Jest runInBand: PASS.
  - `npm test -- --runInBand`
  - 671 passed, 1 skipped, 672 total suites.
  - 3987 passed, 1 skipped, 3988 total tests.
- `git diff --check`: PASS.
- Post-push release verify: pending after push.

## Negative Confirmations

No production cache enablement, production calls, DB writes, migrations, env writes, deploy, OTA, live load tests, cache/rate-limit production enablement, Supabase project changes, spend cap changes, Realtime capacity work, force push, tags, secrets printed, empty catch blocks, ts-ignore, as-any casts, scanner weakening, test deletion, or business-semantic refactor.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE.
