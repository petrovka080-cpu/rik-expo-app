# WAVE_02_CACHE_PERSISTENT_ENABLEMENT_RETRY_WITH_DIAGNOSTICS

final_status: GREEN_CACHE_PRODUCTION_ONE_ROUTE_PERSISTENT_ENABLED

- route: marketplace.catalog.search
- runtime_commit_short: 439bf230d255
- runtime_commit_matches_head: true
- cache_runtime_source: process_env
- route_allowlist_source: process_env
- read_through_v1_env_raw_present: true
- read_through_v1_env_value_class: truthy
- read_through_v1_enabled: true
- route_count: 1
- route_name: marketplace.catalog.search
- percent: 1
- mode: read_through
- retained: true
- first_call_miss_read_through_cache_write: true
- second_call_hit: true
- utf8_pass: true
- unapproved_route_provider_fallback: true
- cache_error_delta: 0
