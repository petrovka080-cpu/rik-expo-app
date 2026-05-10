# S_CACHE_02_ONE_ROUTE_READ_THROUGH_CANARY Proof

final_status: BLOCKED_CACHE_CANARY_FAILED_ROLLED_BACK

## Summary
- route: marketplace.catalog.search
- route_count: 1
- canary_percent: 1
- first_request_miss_read_through: true
- second_request_hit: false
- response_contract_unchanged: true
- rollback_triggered: true
- rollback_succeeded: true

## Blocked Reason

`second_request_hit_false_after_route_scoped_read_through_enablement`

The live one-route canary reached scoped read-through mode and the first request proved a miss/read-through path, but the second request did not return with `serverTiming.cacheHit=true`. The runner rolled back the cache env to the redacted pre-canary snapshot and confirmed `/health=200` and `/ready=200` after rollback.

## Safety
- cache env snapshot values are redacted to presence/value class only.
- no DB writes, migrations, Supabase project changes, rate-limit changes, load tests, OTA/EAS/TestFlight/native builds, or production mutation routes were performed.
- raw cache keys, cache values, URLs, tokens, env values, request payloads, DB rows, and business rows were not printed.
