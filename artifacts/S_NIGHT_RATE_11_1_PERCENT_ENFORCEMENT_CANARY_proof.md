# S_NIGHT_RATE_11_1_PERCENT_ENFORCEMENT_CANARY Proof

final_status: GREEN_RATE_LIMIT_1PCT_ENFORCEMENT_CANARY

## Scope
- route: marketplace.catalog.search
- percent: 1
- route_allowlist_count: 1
- env_already_matching: true
- env_write_triggered: false
- deploy_triggered: false

## Verification
- selected_subject_proof: selected_redacted
- non_selected_subject_proof: non_selected_redacted
- selected_request_status_class: 2xx
- non_selected_request_status_class: 2xx
- wouldAllow: true
- wouldThrottle: true
- cleanup: true
- health_before_after: 200/200
- ready_before_after: 200/200

## Safety
- no broad rate-limit, no all-routes, no cache changes, no 5/10 percent expansion
- secrets, raw keys, env values, URLs, payloads, DB rows, business rows: not printed
