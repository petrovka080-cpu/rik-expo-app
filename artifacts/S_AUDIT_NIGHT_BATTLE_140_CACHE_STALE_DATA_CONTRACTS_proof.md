# S_AUDIT_NIGHT_BATTLE_140_CACHE_STALE_DATA_CONTRACTS

## Scope

This wave closes the next cache risk after key/scope hardening: stale data. It does not enable production cache, does not change remote env, does not deploy, and does not route app traffic through cache.

Selected files:
- `tests/scale/cacheStaleDataContracts.test.ts`
- `artifacts/S_AUDIT_NIGHT_BATTLE_140_CACHE_STALE_DATA_CONTRACTS_matrix.json`
- `artifacts/S_AUDIT_NIGHT_BATTLE_140_CACHE_STALE_DATA_CONTRACTS_proof.md`

Read-only evidence files:
- `src/shared/scale/cachePolicies.ts`
- `src/shared/scale/cacheInvalidation.ts`
- `src/shared/scale/cacheAdapters.ts`
- `src/shared/scale/cacheShadowRuntime.ts`
- `scripts/server/stagingBffServerBoundary.ts`
- `tests/scale/cacheIntegrationBoundary.test.ts`
- `tests/scale/cacheMarketplaceShadowCanaryContract.test.ts`
- `tests/scale/cacheKeyScopeContracts.test.ts`

## Fresh Scan

Commands run:
- `npx tsx scripts/architecture_anti_regression_suite.ts --json`
- `rg -n "score|cache|rate-limit|canary|risk|TODO|FIXME|unsafe|while|bypass" artifacts docs scripts src tests`
- `rg -n "cache|ttl|stale|invalidate|canary|rateLimit|buildSafeCacheKey|cachePolicies|cachePolicy|shadow" src/shared/scale scripts/server tests/scale docs/operations`
- `rg -n "invalidateByTag|isCacheInvalidationExecutionEnabled|getInvalidationTagsForOperation|invalidationTags|staleWhileRevalidate|ttlMs" src/shared/scale scripts/server tests/scale docs/architecture docs/operations`

## Proof

The new contract test verifies:
- `marketplace.catalog.search` read-through uses `ttlMs` only.
- A second identical marketplace request hits cache before TTL expiry.
- After TTL expiry, the same request misses cache and calls the live fixture port again.
- `staleWhileRevalidateMs` is not used to extend the served cache lifetime.
- `request.proposal.list`, `warehouse.ledger.list`, `accountant.invoice.list`, and `director.pending.list` remain on live ports under `read_through` config because non-public payload classes are not read-through allowlisted.
- Non-public routes write zero cache entries in that mode.
- Stale-sensitive routes have mutation tag coverage:
  - `request.proposal.list` by `proposal.submit`
  - `director.pending.list` by `director.approval.apply`
  - `accountant.invoice.list` by `accountant.payment.apply`
  - `warehouse.ledger.list` by `warehouse.receive.apply`
- Invalidation execution remains disabled by default and even with `{ enabled: true }`.

## Gates

- Focused tests: PASS.
  - `npm test -- --runInBand tests/scale/cacheStaleDataContracts.test.ts tests/scale/cacheKeyScopeContracts.test.ts tests/scale/cacheMarketplaceShadowCanaryContract.test.ts tests/scale/cacheIntegrationBoundary.test.ts`
  - 4 suites, 34 tests passed.
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
  - production raw loops: 0.
- Full Jest runInBand: PASS.
  - `npm test -- --runInBand`
  - 674 passed, 1 skipped, 675 total suites.
  - 4001 passed, 1 skipped, 4002 total tests.
- `git diff --check`: PASS.
- Post-push release verify: pending after push.

## Negative Confirmations

No production cache enablement, production calls, DB writes, migrations, env writes, deploy, OTA, live load tests, cache/rate-limit production enablement, Supabase project changes, spend cap changes, Realtime capacity work, force push, tags, secrets printed, empty catch blocks, ts-ignore, as-any casts, scanner weakening, test deletion, or business-semantic refactor.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE.
