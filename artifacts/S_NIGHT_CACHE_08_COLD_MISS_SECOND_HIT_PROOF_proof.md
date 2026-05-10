# S_NIGHT_CACHE_08_COLD_MISS_SECOND_HIT_PROOF

final_status: GREEN_CACHE_COLD_MISS_SECOND_HIT_PROOF
generated_at: 2026-05-11T00:08:20.3104392+06:00

## Scope

- Route: `marketplace.catalog.search`
- Proof test: `tests/scale/cacheColdMissDeterministicProof.test.ts`
- Metrics artifact: `artifacts/S_NIGHT_CACHE_08_COLD_MISS_SECOND_HIT_PROOF_metrics.json`
- Production cache enablement: NO
- Runtime production config touch: NO

## Deterministic Proof

- Unique namespace/key: yes, redacted in artifacts.
- First request: cold miss, provider fallback, cache write.
- Second identical request: cache hit, provider call count remains one.
- UTF-8 query/payload path: safe.
- Metrics: hit/miss/read-through counts only; raw key, namespace, nonce, UTF-8 query, Redis URL/token/secret are not emitted.
- Non-marketplace route proof: `request.proposal.list` makes two provider calls, records two skipped cache decisions, and performs zero cache commands.

## Observed Metrics

- `observedDecisionCount=2`
- `shadowReadAttemptedCount=2`
- `missCount=1`
- `hitCount=1`
- `readThroughCount=1`
- `providerCalls=1`
- `cacheWriteCount=1`
- `nonMarketplaceProviderCalls=2`
- `nonMarketplaceCacheCommands=0`

## Verification

Focused proof PASS:

```powershell
npx jest tests/scale/cacheColdMissDeterministicProof.test.ts tests/architecture/architectureAntiRegressionSuite.test.ts --runInBand
```

Result: 2 suites passed, 21 tests passed.

Required pre-push gates:

- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS (env names only, no values)
- `npm test -- --runInBand`: PASS (695 suites passed, 1 skipped; 4086 tests passed, 1 skipped)
- `npx tsx scripts/architecture_anti_regression_suite.ts --json`: PASS
- `git diff --check`: PASS
- artifact JSON parse: PASS

Post-push release verify is run after push.

## Negative Confirmations

No broad cache, no multi-route cache, no global TTL change, no Redis URL/token/key payload printed, no production-wide enablement, no production mutation, no DB write, no migration, no Supabase project change, no spend cap change, no rate-limit change, no load test, no OTA/EAS/TestFlight/native build, no force push, and no tags.

Supabase Realtime status remains `WAITING_FOR_SUPABASE_SUPPORT_RESPONSE`.
