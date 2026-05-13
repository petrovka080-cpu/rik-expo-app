import {
  AI_OPERATIONAL_CANONICAL_ARTIFACTS,
  AI_OPERATIONAL_STALE_BLOCKER_RULES,
  evaluateAiLiveOperationalTruthLedger,
  type AiOperationalArtifactRecord,
} from "../../scripts/e2e/aiLiveOperationalTruthLedger";

function artifact(path: string, data: Record<string, unknown>): AiOperationalArtifactRecord {
  return {
    path,
    status: typeof data.final_status === "string" ? data.final_status : String(data.status ?? ""),
    data,
  };
}

function greenCanonicalArtifacts(): AiOperationalArtifactRecord[] {
  return [
    artifact(AI_OPERATIONAL_CANONICAL_ARTIFACTS.s11_live_approval_to_execution, {
      final_status: "GREEN_AI_LIVE_APPROVAL_TO_EXECUTION_POINT_OF_NO_RETURN",
      ledger_rpc_visible: true,
      signature_aware_rpc_verify: true,
      pgrst202: false,
      pgrst203: false,
      old_stub_overloads: false,
      submit_for_approval_persisted_pending: true,
      approve_persists_approved: true,
      execute_approved_uses_central_gateway: true,
      get_status_reads_final_state: true,
      idempotency_replay_safe: true,
      audit_evidence_redacted: true,
      command_center_runtime_visible: true,
      approval_inbox_runtime_visible: true,
      android_runtime_smoke: "PASS",
      developer_control_e2e: "PASS",
      unsafe_domain_mutations_created: 0,
      fake_green_claimed: false,
      secrets_printed: false,
      raw_rows_printed: false,
      raw_prompt_printed: false,
      raw_provider_payload_printed: false,
      auth_admin_used: false,
      list_users_used: false,
      seed_used: false,
      service_role_used: false,
      model_provider_changed: false,
      gpt_enabled: false,
      gemini_removed: false,
    }),
    artifact(AI_OPERATIONAL_CANONICAL_ARTIFACTS.s9_live_approval_ledger, {
      final_status: "GREEN_AI_APPROVAL_LEDGER_LIVE_ACTION_E2E",
      ledger_rpc_visible: true,
      signature_aware_rpc_verify: true,
      pgrst202: false,
      pgrst203: false,
      old_stub_overloads: false,
      submit_for_approval_persisted_pending: true,
      approve_persists_approved: true,
      execute_approved_central_gateway: true,
      get_status_reads_executed: true,
      idempotency_replay_safe: true,
      unsafe_domain_mutations_created: 0,
      fake_green_claimed: false,
      secrets_printed: false,
      raw_rows_printed: false,
      raw_prompt_printed: false,
      raw_provider_payload_printed: false,
      auth_admin_used: false,
      list_users_used: false,
      seed_used: false,
      service_role_used: false,
    }),
    artifact(AI_OPERATIONAL_CANONICAL_ARTIFACTS.s10_screen_action_map, {
      final_status: "GREEN_AI_SCREEN_BUTTON_ACTION_INTELLIGENCE_MAP_READY",
      all_actions_have_role_scope: true,
      all_actions_have_risk_policy: true,
      all_actions_have_evidence_source: true,
      all_high_risk_actions_require_approval: true,
      unknown_tool_references: 0,
      forbidden_actions_executable: false,
      emulator_runtime_proof: "PASS",
      unsafe_domain_mutations_created: 0,
      fake_green_claimed: false,
      secrets_printed: false,
      model_provider_changed: false,
      gpt_enabled: false,
      gemini_removed: false,
    }),
    artifact(AI_OPERATIONAL_CANONICAL_ARTIFACTS.db_rpc_platform_closeout, {
      final_status: "GREEN_AI_ACTION_LEDGER_RPC_VISIBLE_AND_CALLABLE",
      postgrest_rpc_visible: true,
      postgrest_rpc_callable: true,
      all_6_rpc_signature_aware_probe_ok: true,
      pgrst202: false,
      pgrst203: false,
      old_stub_overloads: false,
      active_rpc_count: 6,
      fake_green_claimed: false,
      secrets_printed: false,
      raw_rows_printed: false,
    }),
    artifact(AI_OPERATIONAL_CANONICAL_ARTIFACTS.developer_control_targetability, {
      final_status: "GREEN_DEVELOPER_CONTROL_FULL_ACCESS_RUNTIME_TARGETABILITY",
      single_account_runtime_allowed: true,
      full_access_runtime_claimed: true,
      role_isolation_e2e_claimed: false,
      login_or_authenticated_shell_passed: true,
      command_center_targetable: true,
      approval_inbox_targetable: true,
      auth_admin_used: false,
      list_users_used: false,
      seed_used: false,
      service_role_used: false,
      fake_green_claimed: false,
      secrets_printed: false,
    }),
    artifact(AI_OPERATIONAL_CANONICAL_ARTIFACTS.command_center_task_stream, {
      final_status: "GREEN_COMMAND_CENTER_TASK_STREAM_RUNTIME_EXPOSED",
      task_stream_route_exposed: true,
      command_center_uses_runtime: true,
      mutation_count: 0,
    }),
  ];
}

describe("AI live operational truth ledger", () => {
  it("reports green only when canonical S11/S9/RPC/runtime proof supersedes stale blockers", () => {
    const staleBlockers = AI_OPERATIONAL_STALE_BLOCKER_RULES.map((rule) =>
      artifact(rule.path, { final_status: "BLOCKED_STALE_CANONICAL_SUPERSEDED" }),
    );
    const matrix = evaluateAiLiveOperationalTruthLedger([
      ...greenCanonicalArtifacts(),
      ...staleBlockers,
    ]);

    expect(matrix.final_status).toBe("GREEN_AI_LIVE_OPERATIONAL_TRUTH_LEDGER_READY");
    expect(matrix.canonical_live_lifecycle_green).toBe(true);
    expect(matrix.canonical_rpc_visibility_green).toBe(true);
    expect(matrix.stale_blockers_detected).toBe(AI_OPERATIONAL_STALE_BLOCKER_RULES.length);
    expect(matrix.unsuperseded_stale_blockers).toBe(0);
    expect(matrix.mutations_created).toBe(0);
    expect(matrix.db_writes).toBe(0);
    expect(matrix.external_live_fetch).toBe(false);
    expect(matrix.fake_green_claimed).toBe(false);
  });

  it("blocks when a canonical proof is missing", () => {
    const artifacts = greenCanonicalArtifacts().filter(
      (item) => item.path !== AI_OPERATIONAL_CANONICAL_ARTIFACTS.s11_live_approval_to_execution,
    );
    const matrix = evaluateAiLiveOperationalTruthLedger(artifacts);

    expect(matrix.final_status).toBe("BLOCKED_AI_LIVE_OPERATIONAL_CANONICAL_PROOF_MISSING");
    expect(matrix.exact_reason).toContain("s11_live_approval_to_execution");
    expect(matrix.fake_execution).toBe(false);
  });

  it("blocks when canonical proof carries a forbidden security flag", () => {
    const artifacts = greenCanonicalArtifacts();
    artifacts[0] = artifact(AI_OPERATIONAL_CANONICAL_ARTIFACTS.s11_live_approval_to_execution, {
      ...artifacts[0].data,
      secrets_printed: true,
    });
    const matrix = evaluateAiLiveOperationalTruthLedger(artifacts);

    expect(matrix.final_status).toBe("BLOCKED_AI_LIVE_OPERATIONAL_SECURITY_INVARIANT_FAILED");
    expect(matrix.exact_reason).toContain("secrets_printed");
  });

  it("blocks stale blockers if their superseding proof is not green", () => {
    const artifacts = greenCanonicalArtifacts();
    artifacts[3] = artifact(AI_OPERATIONAL_CANONICAL_ARTIFACTS.db_rpc_platform_closeout, {
      ...artifacts[3].data,
      postgrest_rpc_visible: false,
    });
    const matrix = evaluateAiLiveOperationalTruthLedger([
      ...artifacts,
      artifact("artifacts/S_DB_04B_POSTGREST_SCHEMA_CACHE_VISIBILITY_matrix.json", {
        final_status: "BLOCKED_POSTGREST_SCHEMA_CACHE_RELOAD_NOT_OBSERVED",
      }),
    ]);

    expect(matrix.final_status).toBe("BLOCKED_AI_LIVE_OPERATIONAL_CANONICAL_PROOF_NOT_GREEN");
    expect(matrix.unsuperseded_stale_blockers).toBe(1);
  });
});
