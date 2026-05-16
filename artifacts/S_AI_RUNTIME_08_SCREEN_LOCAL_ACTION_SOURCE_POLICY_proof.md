# S_AI_RUNTIME_08_SCREEN_LOCAL_ACTION_SOURCE_POLICY

final_status: GREEN_AI_SCREEN_LOCAL_ACTION_SOURCE_POLICY_READY

required_screen_count: 19
local_profile_count: 19
all_screen_local_profiles_have_action_map: true
foreman_subcontract_action_map_registered: true
no_orchestrator_runtime_intent_fallback: true
context_intents_from_action_registry_only: true
runtime_only_intents_blocked: true
runtime_only_intent_checked_count: 84
runtime_only_intent_allowed_count: 0
action_policy_source_explicit: true
no_db_writes: true
no_provider_calls: true
no_raw_rows: true
no_fake_green: true

Screen-local assistant action planning is sourced only from the audited screen-action registry.
Runtime-only intents remain useful for runtime cards, but they cannot synthesize local action plans.
