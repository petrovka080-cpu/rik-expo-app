# S_AI_QA_02 Emulator Gate Hardening And Artifact Isolation

final_status: BLOCKED_AI_EMULATOR_GATE_HARDENING_RUNTIME
core_release_artifact_overwritten: false
ai_gate_artifact_isolated: true
maestro_retry_policy: exponential_backoff
retry_only_transport_flakes: true
assertion_failure_retried: false
probe_latency_tracked: true
llm_response_smoke_blocking: false
single_emulator_parallel_maestro: false
multi_device_parallel_supported: true
device_count: 2
android_runtime_smoke: PASS
mandatory_matrix_runtime: BLOCKED_ANDROID_ADB_RUNTIME_UNSTABLE
fake_emulator_pass: false
fake_green_claimed: false
secrets_printed: false
blocking_child_runner: runAiRoleScreenKnowledgeMaestro
exact_reason: Command timed out after 20000ms: adb -s emulator-5556 shell uiautomator dump /sdcard/rik_ai_role_screen_window.xml
