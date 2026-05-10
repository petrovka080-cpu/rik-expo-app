# S_CACHE_01_COLD_MISS_DETERMINISTIC_PROOF

## Status

Selected status: `GREEN_CACHE_COLD_MISS_DETERMINISTIC_PROOF_READY`

This wave does not enable production cache.

## Proof Strategy

The deterministic cold-miss proof is implemented in:

- `tests/scale/cacheColdMissDeterministicProof.test.ts`

The test uses an isolated Redis URL adapter fixture plus a nonce-bearing marketplace query. Before the first BFF request, it computes the safe cache key and proves the isolated adapter returns `null` for that key. It then sends two identical `marketplace.catalog.search` requests through the existing staging BFF read-through path.

Observed proof:

- Known-empty proof key before first request: yes
- First request: `cacheHit=false`, one miss, one read-through, one provider call
- Second request: `cacheHit=true`, cached response served, provider call count remains one
- UTF-8 query and cached payload round trip: yes
- Monitor metrics redacted: yes
- Route scope unchanged: only `marketplace.catalog.search`
- Cache defaults remain disabled: yes
- Invalidation execution remains disabled: yes
- Rollback safe: isolated cache tag invalidation removes the proof entry and a post-rollback read returns `null`

## Before / After

Before this wave, `artifacts/BLOCKED_CACHE_COLD_MISS_PROOF_REQUIRED_matrix.json` recorded that no artifact proved a deterministic known-empty key followed by miss/read-through then hit.

After this wave:

- `observedDecisionCount=2`
- `shadowReadAttemptedCount=2`
- `missCount=1`
- `hitCount=1`
- `readThroughCount=1`
- `providerCalls=1`
- `rollbackDeletedEntries=1`

## Scope

Selected files:

- `tests/scale/cacheColdMissDeterministicProof.test.ts`
- `artifacts/S_CACHE_01_COLD_MISS_DETERMINISTIC_PROOF_matrix.json`
- `artifacts/S_CACHE_01_COLD_MISS_DETERMINISTIC_PROOF_proof.md`

Reason selected:

- The cache read-through behavior already exists behind disabled/default-off gates.
- The missing blocker was deterministic proof, so this wave adds a narrow contract and proof artifacts rather than broad cache config or production enablement.

## Negative Confirmations

No production cache enablement, no broad cache config change, no production mutation, no rate-limit change, no load test, no DB write, no Supabase project change, no secrets printed, no OTA/EAS/TestFlight/native build, no route expansion, no force push, and no tags.

Supabase Realtime status remains `WAITING_FOR_SUPABASE_SUPPORT_RESPONSE`.
