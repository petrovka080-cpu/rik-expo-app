# S_NIGHT_RATE_10_SHADOW_SMOKE_MARKETPLACE_SEARCH Proof

final_status: GREEN_RATE_LIMIT_SHADOW_SMOKE_MARKETPLACE_SEARCH

## Scope
- route: marketplace.catalog.search
- mode: observe_only
- enforcement_enabled_this_wave: false
- deploy_triggered: false
- cache_changes: false

## Deterministic Shadow Proof
- provider_status: configured_local_deterministic
- shadow_allow_decision: allowed
- shadow_throttle_decision: hard_limited
- selected_synthetic_subject: selected_synthetic_subject_redacted
- non_selected_subject: non_selected_synthetic_subject_redacted
- selected_response_blocked: false
- non_selected_response_blocked: false

## Metrics
- before_observed_decision_count: 0
- after_observed_decision_count: 5
- before_would_allow_count: 0
- after_would_allow_count: 3
- before_would_throttle_count: 0
- after_would_throttle_count: 2
- key_cardinality_redacted: 3
- aggregate_events_recorded: 5
- aggregate_metrics_recorded: 2
- redaction_safe: true

## Live Context
- production_env_mode_class: route_canary_enforcement
- production_private_smoke_status_class: 2xx
- production_health_before_after: 200/200
- production_ready_before_after: 200/200

## Safety
- raw subjects, keys, URLs, tokens, env values, payloads, DB rows, business rows: not printed
- no enforcement enablement, no all-routes rollout, no cache changes, no deploy, no DB writes
