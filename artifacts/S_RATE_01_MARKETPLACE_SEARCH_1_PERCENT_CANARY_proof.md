# S_RATE_01_MARKETPLACE_SEARCH_1_PERCENT_CANARY Proof

final_status: GREEN_RATE_LIMIT_1_PERCENT_MARKETPLACE_CANARY_PASS

## Summary
- route: marketplace.catalog.search
- route_allowlist_count: 1
- route_scoped_enforcement: true
- canary_route_class: marketplace.catalog.search
- canary_percent: 1
- selected_subject_proof: selected_redacted
- non_selected_subject_proof: non_selected_redacted
- selected_request_status_class: 2xx
- non_selected_request_status_class: 2xx
- private_smoke_green: true
- health_ready_stable: true
- rollback_triggered: false
- rollback_succeeded: false
- canary_retained: true

## Safety
- raw keys, URLs, tokens, env values, payloads, DB rows, business rows: not printed
- DB writes, migrations, cache changes, BFF traffic percent changes, global enforcement: not performed
