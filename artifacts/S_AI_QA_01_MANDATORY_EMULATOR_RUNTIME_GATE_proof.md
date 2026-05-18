# S_AI_QA_01 Mandatory Android Emulator AI Runtime Gate

final_status: BLOCKED_ANDROID_ADB_RUNTIME_UNSTABLE
android_emulator_ready: true
android_installed_runtime_smoke: PASS
ai_source_changed_requires_rebuild: true
local_android_rebuild_install: PASS
developer_control_e2e: PASS
role_screen_knowledge_e2e: BLOCKED
command_center_runtime_e2e: BLOCKED
screen_action_runtime_e2e: BLOCKED
proactive_workday_runtime_e2e: BLOCKED
approval_ledger_e2e: PASS_OR_EXACT_BLOCKER
live_approval_execution_e2e: PASS_OR_EXACT_BLOCKER
exact_llm_text_assertions: false
fake_emulator_pass: false
mutations_created: 0
role_leakage_observed: false
secrets_printed: false
blocking_child_runner: runAiRoleScreenKnowledgeMaestro
exact_reason: Command timed out after 20000ms: adb -s emulator-5556 shell uiautomator dump /sdcard/rik_ai_role_screen_window.xml
