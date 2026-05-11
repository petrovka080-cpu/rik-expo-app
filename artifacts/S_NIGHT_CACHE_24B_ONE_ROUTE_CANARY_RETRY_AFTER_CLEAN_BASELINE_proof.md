# S_NIGHT_CACHE_24B_ONE_ROUTE_CANARY_RETRY_AFTER_CLEAN_BASELINE

final_status: GREEN_CACHE_ONE_ROUTE_CANARY_PASS_AND_ROLLED_BACK

## Summary
- route: marketplace.catalog.search
- read-through v1 enabled: true
- route count: 1
- percent: 1
- runtime scoped to one route: true
- baseline cacheHit: false
- first miss/read-through: true
- second hit: true
- UTF-8 input: true
- metrics redacted: true
- response contract unchanged: true
- rollback succeeded: true
- canary retained: false
- health/ready after rollback: 200/200

## Notes
- Existing runner did not include a separate unapproved-route probe field; route scope was enforced through runtime allowlist count=1 and cache canary route-only env writes.
- Env/config values are redacted; no raw keys, tokens, Redis keys, URLs, payloads, or business rows are printed.
