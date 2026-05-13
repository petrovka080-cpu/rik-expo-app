export type AiLiveOperationalTruthStatus =
  | "GREEN_AI_LIVE_OPERATIONAL_TRUTH_LEDGER_READY"
  | "BLOCKED_AI_LIVE_OPERATIONAL_CANONICAL_PROOF_MISSING"
  | "BLOCKED_AI_LIVE_OPERATIONAL_CANONICAL_PROOF_NOT_GREEN"
  | "BLOCKED_AI_LIVE_OPERATIONAL_STALE_BLOCKER_UNSUPERSEDED"
  | "BLOCKED_AI_LIVE_OPERATIONAL_SECURITY_INVARIANT_FAILED";

export type AiOperationalArtifactRecord = {
  path: string;
  status: string;
  data: Record<string, unknown>;
};

export type AiCanonicalProofKey =
  | "s11_live_approval_to_execution"
  | "s9_live_approval_ledger"
  | "s10_screen_action_map"
  | "db_rpc_platform_closeout"
  | "developer_control_targetability"
  | "command_center_task_stream";

export type AiStaleBlockerRule = {
  path: string;
  supersededBy: AiCanonicalProofKey[];
  reason: string;
};

export type AiStaleBlockerResolution = {
  path: string;
  status: string;
  superseded: boolean;
  supersededBy: AiCanonicalProofKey[];
  reason: string;
};

export type AiLiveOperationalTruthMatrix = {
  final_status: AiLiveOperationalTruthStatus;
  canonical_live_lifecycle_green: boolean;
  canonical_screen_action_map_green: boolean;
  canonical_rpc_visibility_green: boolean;
  canonical_developer_control_green: boolean;
  canonical_command_center_green: boolean;
  ledger_rpc_visible: boolean;
  signature_aware_rpc_verify: boolean;
  pgrst202: boolean;
  pgrst203: boolean;
  old_stub_overloads: boolean;
  submit_for_approval_persisted_pending: boolean;
  approve_persists_approved: boolean;
  execute_approved_uses_central_gateway: boolean;
  final_status_readable: boolean;
  idempotency_replay_safe: boolean;
  audit_evidence_redacted: boolean;
  command_center_runtime_visible: boolean;
  approval_inbox_runtime_visible: boolean;
  android_runtime_smoke: "PASS" | "BLOCKED";
  developer_control_e2e: "PASS" | "BLOCKED";
  stale_blockers_detected: number;
  superseded_stale_blockers: number;
  unsuperseded_stale_blockers: number;
  stale_blocker_resolutions: AiStaleBlockerResolution[];
  mutations_created: 0;
  db_writes: 0;
  unsafe_domain_mutations_created: 0;
  external_live_fetch: false;
  model_provider_changed: false;
  gpt_enabled: false;
  gemini_removed: false;
  auth_admin_used: false;
  list_users_used: false;
  seed_used: false;
  service_role_used: false;
  fake_approval: false;
  fake_status: false;
  fake_execution: false;
  fake_green_claimed: false;
  secrets_printed: false;
  raw_rows_printed: false;
  raw_prompt_printed: false;
  raw_provider_payload_printed: false;
  exact_reason: string | null;
};

export const AI_OPERATIONAL_CANONICAL_ARTIFACTS: Record<AiCanonicalProofKey, string> = Object.freeze({
  s11_live_approval_to_execution: "artifacts/S_AI_MAGIC_11_LIVE_APPROVAL_TO_EXECUTION_matrix.json",
  s9_live_approval_ledger: "artifacts/S_AI_MAGIC_09_APPROVAL_LEDGER_LIVE_ACTION_E2E_matrix.json",
  s10_screen_action_map: "artifacts/S_AI_MAGIC_10_SCREEN_BUTTON_ACTION_INTELLIGENCE_MAP_matrix.json",
  db_rpc_platform_closeout: "artifacts/S_DB_04C_POSTGREST_RPC_EXPOSURE_PLATFORM_CLOSEOUT_matrix.json",
  developer_control_targetability: "artifacts/S_E2E_CORE_05_DEVELOPER_CONTROL_TARGETABILITY_CLOSEOUT_matrix.json",
  command_center_task_stream: "artifacts/S_AI_PRODUCT_02_COMMAND_CENTER_TASK_STREAM_RUNTIME_matrix.json",
});

export const AI_OPERATIONAL_STALE_BLOCKER_RULES: readonly AiStaleBlockerRule[] = Object.freeze([
  {
    path: "artifacts/S_DB_02_AI_ACTION_LEDGER_RPC_DEPLOY_matrix.json",
    supersededBy: ["db_rpc_platform_closeout", "s11_live_approval_to_execution"],
    reason: "RPC deploy blockers are superseded only by callable signature-aware RPC proof plus S11 live lifecycle.",
  },
  {
    path: "artifacts/S_DB_03_AI_ACTION_LEDGER_HISTORY_RECONCILE_matrix.json",
    supersededBy: ["db_rpc_platform_closeout", "s11_live_approval_to_execution"],
    reason: "Migration history blockers are superseded by current RPC visibility and live persisted lifecycle proof.",
  },
  {
    path: "artifacts/S_DB_04_AI_ACTION_LEDGER_FORWARD_FIX_matrix.json",
    supersededBy: ["db_rpc_platform_closeout", "s11_live_approval_to_execution"],
    reason: "Forward-fix blockers are superseded by old-overload absence and current callable RPC proof.",
  },
  {
    path: "artifacts/S_DB_04B_POSTGREST_SCHEMA_CACHE_VISIBILITY_matrix.json",
    supersededBy: ["db_rpc_platform_closeout", "s11_live_approval_to_execution"],
    reason: "PostgREST cache blockers are superseded by PGRST202/PGRST203 false and all six RPC visible.",
  },
  {
    path: "artifacts/S_DB_04D_SUPABASE_MANAGED_POSTGREST_RECOVERY_matrix.json",
    supersededBy: ["db_rpc_platform_closeout", "s11_live_approval_to_execution"],
    reason: "Managed cache incident escalation is superseded by later callable platform closeout and live lifecycle.",
  },
  {
    path: "artifacts/S_E2E_CORE_04_DEVELOPER_CONTROL_FULL_ACCESS_MODE_matrix.json",
    supersededBy: ["developer_control_targetability", "s11_live_approval_to_execution"],
    reason: "Developer/control targetability blockers are superseded by core 05 and S11 emulator proof.",
  },
  {
    path: "artifacts/S_AI_APPROVAL_09_LEDGER_MIGRATION_APPLY_PACKAGE_matrix.json",
    supersededBy: ["db_rpc_platform_closeout", "s9_live_approval_ledger", "s11_live_approval_to_execution"],
    reason: "Migration package blockers are superseded by canonical RPC visibility plus live persisted ledger writes.",
  },
  {
    path: "artifacts/S_AI_EXEC_01_APPROVED_PROCUREMENT_EXECUTION_E2E_matrix.json",
    supersededBy: ["s9_live_approval_ledger", "s11_live_approval_to_execution"],
    reason: "Approved procurement execution blockers are superseded by central gateway execution and idempotency proof.",
  },
  {
    path: "artifacts/S_AI_MAGIC_06_PERSISTENT_APPROVAL_ACTION_LEDGER_matrix.json",
    supersededBy: ["s9_live_approval_ledger", "s11_live_approval_to_execution"],
    reason: "Persistent approval ledger blockers are superseded by live persisted pending/approved/executed lifecycle.",
  },
  {
    path: "artifacts/S_AI_MAGIC_06B_ACTION_LEDGER_BACKEND_READINESS_matrix.json",
    supersededBy: ["db_rpc_platform_closeout", "s9_live_approval_ledger", "s11_live_approval_to_execution"],
    reason: "Backend readiness blockers are superseded by callable ledger RPCs and S11 lifecycle proof.",
  },
  {
    path: "artifacts/S_AI_MAGIC_07_APPROVAL_INBOX_EXECUTION_GATE_matrix.json",
    supersededBy: ["developer_control_targetability", "s11_live_approval_to_execution"],
    reason: "Approval inbox blockers are superseded by core 05 runtime targetability and S11 approval inbox proof.",
  },
  {
    path: "artifacts/S_AI_MAGIC_08_APPROVAL_LEDGER_BACKEND_MOUNT_matrix.json",
    supersededBy: ["db_rpc_platform_closeout", "s9_live_approval_ledger", "s11_live_approval_to_execution"],
    reason: "Backend mount blockers are superseded by current RPC mount and live lifecycle execution proof.",
  },
  {
    path: "artifacts/S_AI_MAGIC_08_APPROVED_PROCUREMENT_EXECUTOR_matrix.json",
    supersededBy: ["s9_live_approval_ledger", "s11_live_approval_to_execution"],
    reason: "Approved executor blockers are superseded by S9/S11 central gateway execution proof.",
  },
  {
    path: "artifacts/S_AI_MAGIC_03_EXTERNAL_INTEL_GATEWAY_matrix.json",
    supersededBy: ["s10_screen_action_map", "s11_live_approval_to_execution"],
    reason: "Old Android build blockers in the AI magic chain are superseded by current emulator-backed S10/S11 proof.",
  },
  {
    path: "artifacts/S_AI_MAGIC_04_PROCUREMENT_COPILOT_RUNTIME_CHAIN_matrix.json",
    supersededBy: ["s10_screen_action_map", "s11_live_approval_to_execution"],
    reason: "Old procurement copilot Android blockers are superseded by current internal-first S11 runtime proof.",
  },
  {
    path: "artifacts/S_AI_MAGIC_05_CROSS_SCREEN_COPILOT_RUNTIME_MATRIX_matrix.json",
    supersededBy: ["developer_control_targetability", "s10_screen_action_map", "s11_live_approval_to_execution"],
    reason: "Old cross-screen Android blockers are superseded by current developer/control and S11 runtime proof.",
  },
  {
    path: "artifacts/S_AI_PRODUCT_01_DAILY_COMMAND_CENTER_matrix.json",
    supersededBy: ["command_center_task_stream", "developer_control_targetability", "s11_live_approval_to_execution"],
    reason: "Old Command Center task stream blockers are superseded by product 02 runtime and S11 targetability proof.",
  },
] as const);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function statusOf(record: Record<string, unknown> | undefined): string {
  if (!record) return "";
  const finalStatus = record.final_status;
  if (typeof finalStatus === "string") return finalStatus;
  const status = record.status;
  return typeof status === "string" ? status : "";
}

function bool(record: Record<string, unknown> | undefined, key: string): boolean {
  return record?.[key] === true;
}

function falseFlag(record: Record<string, unknown> | undefined, key: string): boolean {
  return record?.[key] === false;
}

function numberValue(record: Record<string, unknown> | undefined, key: string): number {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function zeroIfPresent(record: Record<string, unknown> | undefined, key: string): boolean {
  if (!record || !(key in record)) return true;
  return numberValue(record, key) === 0;
}

function text(record: Record<string, unknown> | undefined, key: string): string {
  const value = record?.[key];
  return typeof value === "string" ? value : "";
}

function startsGreen(status: string): boolean {
  return status.startsWith("GREEN_");
}

function canonicalPath(key: AiCanonicalProofKey): string {
  return AI_OPERATIONAL_CANONICAL_ARTIFACTS[key];
}

function normalizeArtifacts(
  artifacts: readonly AiOperationalArtifactRecord[],
): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  for (const artifact of artifacts) {
    if (isRecord(artifact.data)) {
      map.set(artifact.path.replace(/\\/g, "/"), artifact.data);
    }
  }
  return map;
}

function canonicalRecord(
  records: Map<string, Record<string, unknown>>,
  key: AiCanonicalProofKey,
): Record<string, unknown> | undefined {
  return records.get(canonicalPath(key));
}

function evaluateCanonicalProofs(records: Map<string, Record<string, unknown>>): {
  missing: AiCanonicalProofKey[];
  failed: string[];
  securityFailed: string[];
  green: Record<AiCanonicalProofKey, boolean>;
} {
  const s11 = canonicalRecord(records, "s11_live_approval_to_execution");
  const s9 = canonicalRecord(records, "s9_live_approval_ledger");
  const s10 = canonicalRecord(records, "s10_screen_action_map");
  const db = canonicalRecord(records, "db_rpc_platform_closeout");
  const developer = canonicalRecord(records, "developer_control_targetability");
  const commandCenter = canonicalRecord(records, "command_center_task_stream");

  const requiredRecords: Record<AiCanonicalProofKey, Record<string, unknown> | undefined> = {
    s11_live_approval_to_execution: s11,
    s9_live_approval_ledger: s9,
    s10_screen_action_map: s10,
    db_rpc_platform_closeout: db,
    developer_control_targetability: developer,
    command_center_task_stream: commandCenter,
  };

  const missing = Object.entries(requiredRecords)
    .filter(([, record]) => !record)
    .map(([key]) => key as AiCanonicalProofKey);

  const green: Record<AiCanonicalProofKey, boolean> = {
    s11_live_approval_to_execution:
      statusOf(s11) === "GREEN_AI_LIVE_APPROVAL_TO_EXECUTION_POINT_OF_NO_RETURN" &&
      bool(s11, "ledger_rpc_visible") &&
      bool(s11, "signature_aware_rpc_verify") &&
      falseFlag(s11, "pgrst202") &&
      falseFlag(s11, "pgrst203") &&
      falseFlag(s11, "old_stub_overloads") &&
      bool(s11, "submit_for_approval_persisted_pending") &&
      bool(s11, "approve_persists_approved") &&
      bool(s11, "execute_approved_uses_central_gateway") &&
      bool(s11, "get_status_reads_final_state") &&
      bool(s11, "idempotency_replay_safe") &&
      bool(s11, "audit_evidence_redacted") &&
      bool(s11, "command_center_runtime_visible") &&
      bool(s11, "approval_inbox_runtime_visible") &&
      text(s11, "android_runtime_smoke") === "PASS" &&
      text(s11, "developer_control_e2e") === "PASS",
    s9_live_approval_ledger:
      statusOf(s9) === "GREEN_AI_APPROVAL_LEDGER_LIVE_ACTION_E2E" &&
      bool(s9, "ledger_rpc_visible") &&
      bool(s9, "signature_aware_rpc_verify") &&
      falseFlag(s9, "pgrst202") &&
      falseFlag(s9, "pgrst203") &&
      falseFlag(s9, "old_stub_overloads") &&
      bool(s9, "submit_for_approval_persisted_pending") &&
      bool(s9, "approve_persists_approved") &&
      bool(s9, "execute_approved_central_gateway") &&
      bool(s9, "get_status_reads_executed") &&
      bool(s9, "idempotency_replay_safe"),
    s10_screen_action_map:
      statusOf(s10) === "GREEN_AI_SCREEN_BUTTON_ACTION_INTELLIGENCE_MAP_READY" &&
      bool(s10, "all_actions_have_role_scope") &&
      bool(s10, "all_actions_have_risk_policy") &&
      bool(s10, "all_actions_have_evidence_source") &&
      bool(s10, "all_high_risk_actions_require_approval") &&
      numberValue(s10, "unknown_tool_references") === 0 &&
      falseFlag(s10, "forbidden_actions_executable") &&
      text(s10, "emulator_runtime_proof") === "PASS",
    db_rpc_platform_closeout:
      statusOf(db) === "GREEN_AI_ACTION_LEDGER_RPC_VISIBLE_AND_CALLABLE" &&
      bool(db, "postgrest_rpc_visible") &&
      bool(db, "postgrest_rpc_callable") &&
      bool(db, "all_6_rpc_signature_aware_probe_ok") &&
      falseFlag(db, "pgrst202") &&
      falseFlag(db, "pgrst203") &&
      falseFlag(db, "old_stub_overloads") &&
      numberValue(db, "active_rpc_count") === 6,
    developer_control_targetability:
      statusOf(developer) === "GREEN_DEVELOPER_CONTROL_FULL_ACCESS_RUNTIME_TARGETABILITY" &&
      bool(developer, "single_account_runtime_allowed") &&
      bool(developer, "full_access_runtime_claimed") &&
      falseFlag(developer, "role_isolation_e2e_claimed") &&
      bool(developer, "login_or_authenticated_shell_passed") &&
      bool(developer, "command_center_targetable") &&
      bool(developer, "approval_inbox_targetable"),
    command_center_task_stream:
      statusOf(commandCenter) === "GREEN_COMMAND_CENTER_TASK_STREAM_RUNTIME_EXPOSED" &&
      bool(commandCenter, "task_stream_route_exposed") &&
      bool(commandCenter, "command_center_uses_runtime") &&
      zeroIfPresent(commandCenter, "mutations_created") &&
      zeroIfPresent(commandCenter, "mutation_count"),
  };

  const failed = Object.entries(green)
    .filter(([key, passed]) => !passed && !missing.includes(key as AiCanonicalProofKey))
    .map(([key]) => key);

  const securityFailed: string[] = [];
  const securityRecords: [AiCanonicalProofKey, Record<string, unknown> | undefined][] = [
    ["s11_live_approval_to_execution", s11],
    ["s9_live_approval_ledger", s9],
    ["s10_screen_action_map", s10],
    ["db_rpc_platform_closeout", db],
    ["developer_control_targetability", developer],
  ];
  for (const [key, record] of securityRecords) {
    if (!record) continue;
    const forbiddenTrueFlags = [
      "fake_green_claimed",
      "fake_pass_claimed",
      "secrets_printed",
      "raw_rows_printed",
      "raw_prompt_printed",
      "raw_provider_payload_printed",
      "auth_admin_used",
      "list_users_used",
      "seed_used",
      "db_seed_used",
      "service_role_used",
      "model_provider_changed",
      "gpt_enabled",
      "gemini_removed",
    ];
    for (const flag of forbiddenTrueFlags) {
      if (record[flag] === true) securityFailed.push(`${key}.${flag}`);
    }
    if (numberValue(record, "unsafe_domain_mutations_created") > 0) {
      securityFailed.push(`${key}.unsafe_domain_mutations_created`);
    }
  }

  return { missing, failed, securityFailed, green };
}

function resolveStaleBlockers(
  records: Map<string, Record<string, unknown>>,
  green: Record<AiCanonicalProofKey, boolean>,
): AiStaleBlockerResolution[] {
  const resolutions: AiStaleBlockerResolution[] = [];
  for (const rule of AI_OPERATIONAL_STALE_BLOCKER_RULES) {
    const record = records.get(rule.path);
    const status = statusOf(record);
    if (!status || startsGreen(status)) continue;
    const superseded = rule.supersededBy.every((key) => green[key]);
    resolutions.push({
      path: rule.path,
      status,
      superseded,
      supersededBy: rule.supersededBy,
      reason: rule.reason,
    });
  }
  return resolutions;
}

function exactReason(parts: string[]): string | null {
  const filtered = parts.filter(Boolean);
  return filtered.length > 0 ? filtered.join("; ") : null;
}

export function evaluateAiLiveOperationalTruthLedger(
  artifacts: readonly AiOperationalArtifactRecord[],
): AiLiveOperationalTruthMatrix {
  const records = normalizeArtifacts(artifacts);
  const canonical = evaluateCanonicalProofs(records);
  const staleResolutions = resolveStaleBlockers(records, canonical.green);
  const unsuperseded = staleResolutions.filter((resolution) => !resolution.superseded);

  const s11 = canonicalRecord(records, "s11_live_approval_to_execution");
  const db = canonicalRecord(records, "db_rpc_platform_closeout");
  const canonicalMissing = canonical.missing.length > 0;
  const canonicalFailed = canonical.failed.length > 0;
  const securityFailed = canonical.securityFailed.length > 0;
  const staleFailed = unsuperseded.length > 0;

  let finalStatus: AiLiveOperationalTruthStatus = "GREEN_AI_LIVE_OPERATIONAL_TRUTH_LEDGER_READY";
  if (canonicalMissing) {
    finalStatus = "BLOCKED_AI_LIVE_OPERATIONAL_CANONICAL_PROOF_MISSING";
  } else if (securityFailed) {
    finalStatus = "BLOCKED_AI_LIVE_OPERATIONAL_SECURITY_INVARIANT_FAILED";
  } else if (canonicalFailed) {
    finalStatus = "BLOCKED_AI_LIVE_OPERATIONAL_CANONICAL_PROOF_NOT_GREEN";
  } else if (staleFailed) {
    finalStatus = "BLOCKED_AI_LIVE_OPERATIONAL_STALE_BLOCKER_UNSUPERSEDED";
  }

  return {
    final_status: finalStatus,
    canonical_live_lifecycle_green:
      canonical.green.s11_live_approval_to_execution &&
      canonical.green.s9_live_approval_ledger,
    canonical_screen_action_map_green: canonical.green.s10_screen_action_map,
    canonical_rpc_visibility_green: canonical.green.db_rpc_platform_closeout,
    canonical_developer_control_green: canonical.green.developer_control_targetability,
    canonical_command_center_green: canonical.green.command_center_task_stream,
    ledger_rpc_visible: bool(s11, "ledger_rpc_visible") && bool(db, "postgrest_rpc_visible"),
    signature_aware_rpc_verify: bool(s11, "signature_aware_rpc_verify") && bool(db, "all_6_rpc_signature_aware_probe_ok"),
    pgrst202: Boolean(s11?.pgrst202 ?? db?.pgrst202 ?? false),
    pgrst203: Boolean(s11?.pgrst203 ?? db?.pgrst203 ?? false),
    old_stub_overloads: Boolean(s11?.old_stub_overloads ?? db?.old_stub_overloads ?? false),
    submit_for_approval_persisted_pending: bool(s11, "submit_for_approval_persisted_pending"),
    approve_persists_approved: bool(s11, "approve_persists_approved"),
    execute_approved_uses_central_gateway: bool(s11, "execute_approved_uses_central_gateway"),
    final_status_readable: bool(s11, "get_status_reads_final_state"),
    idempotency_replay_safe: bool(s11, "idempotency_replay_safe"),
    audit_evidence_redacted: bool(s11, "audit_evidence_redacted"),
    command_center_runtime_visible: bool(s11, "command_center_runtime_visible"),
    approval_inbox_runtime_visible: bool(s11, "approval_inbox_runtime_visible"),
    android_runtime_smoke: text(s11, "android_runtime_smoke") === "PASS" ? "PASS" : "BLOCKED",
    developer_control_e2e: text(s11, "developer_control_e2e") === "PASS" ? "PASS" : "BLOCKED",
    stale_blockers_detected: staleResolutions.length,
    superseded_stale_blockers: staleResolutions.filter((resolution) => resolution.superseded).length,
    unsuperseded_stale_blockers: unsuperseded.length,
    stale_blocker_resolutions: staleResolutions,
    mutations_created: 0,
    db_writes: 0,
    unsafe_domain_mutations_created: 0,
    external_live_fetch: false,
    model_provider_changed: false,
    gpt_enabled: false,
    gemini_removed: false,
    auth_admin_used: false,
    list_users_used: false,
    seed_used: false,
    service_role_used: false,
    fake_approval: false,
    fake_status: false,
    fake_execution: false,
    fake_green_claimed: false,
    secrets_printed: false,
    raw_rows_printed: false,
    raw_prompt_printed: false,
    raw_provider_payload_printed: false,
    exact_reason: exactReason([
      canonicalMissing ? `Missing canonical proofs: ${canonical.missing.join(", ")}` : "",
      securityFailed ? `Security invariant failures: ${canonical.securityFailed.join(", ")}` : "",
      canonicalFailed ? `Canonical proofs not green: ${canonical.failed.join(", ")}` : "",
      staleFailed ? `Unsuperseded stale blockers: ${unsuperseded.map((item) => item.path).join(", ")}` : "",
    ]),
  };
}
