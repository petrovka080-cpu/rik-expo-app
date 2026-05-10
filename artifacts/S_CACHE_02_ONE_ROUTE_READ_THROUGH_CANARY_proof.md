# S_CACHE_02_ONE_ROUTE_READ_THROUGH_CANARY Proof

final_status: BLOCKED_CACHE_CANARY_FAILED_ROLLED_BACK

## Summary
- route: marketplace.catalog.search
- route_count: 1
- canary_percent: 1
- first_request_miss_read_through: false
- second_request_hit: false
- cache_shadow_diagnostic_green: false
- first_miss_count_delta: not_run
- first_read_through_count_delta: not_run
- second_hit_count_delta: not_run
- response_contract_unchanged: false
- blocked_reason: runtime_not_scoped_to_one_route
- rollback_triggered: true
- rollback_succeeded: true

## Safety
- cache env snapshot values are redacted to presence/value class only.
- no DB writes, migrations, Supabase project changes, rate-limit changes, load tests, OTA/EAS/TestFlight/native builds, or production mutation routes were performed.
- raw cache keys, cache values, URLs, tokens, env values, request payloads, DB rows, and business rows were not printed.
