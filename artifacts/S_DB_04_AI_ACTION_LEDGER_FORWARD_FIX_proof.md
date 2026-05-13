# S_DB_04_AI_ACTION_LEDGER_FORWARD_FIX_AND_RPC_VISIBILITY_CLOSEOUT

final_status: BLOCKED_POSTGREST_SCHEMA_CACHE_STALE
previous_blocker: BLOCKED_LEDGER_RPC_NOT_DEPLOYED
previous_blocker_closed: false

User-reported inspect facts:
- history_record_present: true
- table_exists: true
- functions_exist: true
- indexes_exist: false
- policies_exist: false
- postgrest_schema_cache_rpc_visible: false

Implemented:
- inspector now supports STATE_F_HISTORY_PRESENT_PARTIAL_OBJECTS
- forward-fix runner only applies in STATE_F
- forward-fix refuses missing history
- forward-fix refuses table+functions both missing
- idempotent SQL adds missing indexes, RLS policies, grants, and NOTIFY pgrst schema reload

current_agent_db_url_env: present
current_agent_forward_fix_status: BLOCKED_POSTGREST_SCHEMA_CACHE_STALE
forward_fix_applied: true
blind_reapply_used: false
history_repair_used: false
destructive_migration: false
unbounded_dml: false
raw_rows_printed: false
secrets_printed: false
android_runtime_smoke: PASS
emulator_e2e: BLOCKED_LEDGER_RPC_NOT_DEPLOYED

Verified after forward-fix:
- indexes_exist_after: true
- policies_exist_after: true
- direct_sql_functions_exist: true
- postgrest_schema_cache_rpc_visible_after: false

exact_reason: The bounded forward-fix applied successfully and verified indexes/policies/functions, but PostgREST schema cache still does not expose every ledger RPC. Android smoke passed; approval ledger E2E still confirms the RPC functions are not deployed in the PostgREST schema cache.
