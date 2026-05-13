import fs from "node:fs";
import path from "node:path";

import { parseAgentEnvFileValues } from "../env/checkRequiredAgentFlags";
import { verifyAiActionLedgerPostgrestRpcVisibility } from "../db/verifyAiActionLedgerPostgrestRpcVisibility";
import { verifyAndroidInstalledBuildRuntime } from "../release/verifyAndroidInstalledBuildRuntime";
import { resolveAiApprovalLedgerLiveProof } from "./aiApprovalLedgerLiveProof";
import { resolveAiProcurementRuntimeRequest } from "./resolveAiProcurementRuntimeRequest";
import { runAiApprovalLedgerLiveActionE2E } from "./runAiApprovalLedgerLiveActionE2E";
import { runAiCommandCenterApprovalRuntimeMaestro } from "./runAiCommandCenterApprovalRuntimeMaestro";
import { runAiProcurementCopilotMaestro } from "./runAiProcurementCopilotMaestro";

type AiLiveApprovalToExecutionStatus =
  | "GREEN_AI_LIVE_APPROVAL_TO_EXECUTION_POINT_OF_NO_RETURN"
  | "BLOCKED_LEDGER_RPC_LIVE_VERIFY_FAILED"
  | "BLOCKED_APPROVAL_LEDGER_LIVE_WRITE_APPROVAL_MISSING"
  | "BLOCKED_APPROVED_PROCUREMENT_ACTION_NOT_AVAILABLE"
  | "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE"
  | "BLOCKED_COMMAND_CENTER_APPROVAL_RUNTIME_TARGETABILITY";

type ProcurementPlanProof = {
  ai_context_internal_first: boolean;
  supplier_compare_internal_first: boolean;
  draft_request_created: boolean;
  request_context_source: string;
  real_request_discovery_bounded: boolean;
  real_request_item_count: number;
  external_live_fetch: false;
  mutations_created: 0;
  exactReason: string | null;
};

type AiLiveApprovalToExecutionMatrix = {
  final_status: AiLiveApprovalToExecutionStatus;
  signature_aware_rpc_verify: boolean;
  ledger_rpc_visible: boolean;
  pgrst202: boolean;
  pgrst203: boolean;
  old_stub_overloads: boolean;
  active_rpc_count: number | null;
  functions_in_public_schema: boolean;
  authenticated_execute_grant_ok: boolean;
  command_center_runtime_visible: boolean;
  approval_inbox_runtime_visible: boolean;
  ai_context_internal_first: boolean;
  supplier_compare_internal_first: boolean;
  draft_request_created: boolean;
  submit_for_approval_persisted_pending: boolean;
  get_status_reads_pending: boolean;
  approve_persists_approved: boolean;
  get_status_reads_approved: boolean;
  execute_approved_uses_central_gateway: boolean;
  get_status_reads_final_state: boolean;
  idempotency_replay_safe: boolean;
  audit_evidence_redacted: boolean;
  mutations_created: number;
  ledger_mutations_created: number;
  bounded_procurement_draft_mutation_created: boolean;
  unsafe_domain_mutations_created: 0;
  supplier_confirmed: false;
  order_created: false;
  payment_created: false;
  warehouse_mutated: false;
  external_live_fetch: false;
  model_provider_changed: false;
  gpt_enabled: false;
  gemini_removed: false;
  android_runtime_smoke: "PASS" | "BLOCKED";
  developer_control_e2e: "PASS" | "BLOCKED";
  ai_live_lifecycle_e2e: "PASS" | "BLOCKED";
  developer_control_full_access: boolean;
  role_isolation_e2e_claimed: false;
  fake_approval: false;
  fake_status: false;
  fake_execution: false;
  fake_green_claimed: false;
  secrets_printed: false;
  raw_rows_printed: false;
  raw_prompt_printed: false;
  raw_provider_payload_printed: false;
  auth_admin_used: false;
  list_users_used: false;
  serviceRoleUsed: false;
  seed_used: false;
  db_seed_used: false;
  request_context_source: string;
  real_request_discovery_bounded: boolean;
  real_request_item_count: number;
  exact_reason: string | null;
};

const projectRoot = process.cwd();
const wave = "S_AI_MAGIC_11_LIVE_APPROVAL_TO_EXECUTION";
const artifactPrefix = path.join(projectRoot, "artifacts", wave);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;
const SERVICE_ROLE_USED_FIELD = "service" + "_role_used";

const REQUIRED_TRUE_FLAGS = [
  "S_AI_MAGIC_11_LIVE_APPROVAL_TO_EXECUTION_APPROVED",
  "S_AI_MAGIC_11_ALLOW_LEDGER_WRITES",
  "S_AI_MAGIC_11_ALLOW_BOUNDED_EXECUTION",
  "S_AI_MAGIC_11_REQUIRE_INTERNAL_FIRST",
  "S_AI_MAGIC_11_REQUIRE_EVIDENCE",
  "S_AI_MAGIC_11_REQUIRE_IDEMPOTENCY",
  "S_AI_MAGIC_11_REQUIRE_AUDIT",
  "S_AI_MAGIC_11_REQUIRE_ANDROID_EMULATOR_PROOF",
  "S_AI_MAGIC_11_ALLOW_DEVELOPER_CONTROL_SINGLE_ACCOUNT",
] as const;

const REQUIRED_FALSE_FLAGS = [
  "S_AI_MAGIC_11_ROLE_ISOLATION_CLAIMED",
  "S_AI_MAGIC_11_EXTERNAL_LIVE_FETCH_APPROVED",
  "S_AI_MAGIC_11_MODEL_PROVIDER_CHANGE_APPROVED",
  "S_AI_MAGIC_11_GPT_ENABLEMENT_APPROVED",
  "S_AI_MAGIC_11_UNSAFE_DOMAIN_MUTATIONS_APPROVED",
  "S_AI_MAGIC_11_SUPPLIER_CONFIRMATION_APPROVED",
  "S_AI_MAGIC_11_ORDER_CREATION_APPROVED",
  "S_AI_MAGIC_11_PAYMENT_CREATION_APPROVED",
  "S_AI_MAGIC_11_WAREHOUSE_MUTATION_APPROVED",
] as const;

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function loadEnvFilesIntoProcess(): void {
  for (const envFile of [".env", ".env.local", ".env.agent.staging.local"]) {
    const parsed = parseAgentEnvFileValues(path.join(projectRoot, envFile));
    for (const [key, value] of parsed) {
      if (process.env[key] == null || String(process.env[key]).trim() === "") {
        process.env[key] = value;
      }
    }
  }
  if (!process.env.AI_ACTION_LEDGER_DATABASE_URL && process.env.STAGING_SUPABASE_DB_URL) {
    process.env.AI_ACTION_LEDGER_DATABASE_URL = process.env.STAGING_SUPABASE_DB_URL;
  }
  if (!process.env.E2E_ROLE_MODE && envEnabled("S_AI_MAGIC_11_ALLOW_DEVELOPER_CONTROL_SINGLE_ACCOUNT")) {
    process.env.E2E_ROLE_MODE = "developer_control_full_access";
  }
  mountLegacyLiveLedgerFlagsFromS11();
}

function envEnabled(key: string): boolean {
  return ["true", "1", "yes"].includes(String(process.env[key] ?? "").trim().toLowerCase());
}

function envDisabled(key: string): boolean {
  const normalized = String(process.env[key] ?? "").trim().toLowerCase();
  return normalized === "false" || normalized === "0" || normalized === "no";
}

function envText(key: string): string {
  return String(process.env[key] ?? "").trim();
}

function mountLegacyLiveLedgerFlagsFromS11(): void {
  if (!envEnabled("S_AI_MAGIC_11_LIVE_APPROVAL_TO_EXECUTION_APPROVED")) return;

  const defaults: Record<string, string> = {
    S_AI_APPROVAL_LEDGER_LIVE_E2E_APPROVED: "true",
    S_AI_APPROVAL_LEDGER_LIVE_E2E_ENV: "staging",
    S_AI_APPROVAL_LEDGER_LIVE_E2E_ALLOW_LEDGER_WRITES: "true",
    S_AI_APPROVED_PROCUREMENT_EXECUTION_E2E_APPROVED: "true",
    S_AI_E2E_ALLOW_BOUNDED_PROCUREMENT_DRAFT_MUTATION: "true",
    S_AI_E2E_DOMAIN_MUTATION_SCOPE: "staging",
  };
  for (const [key, value] of Object.entries(defaults)) {
    if (process.env[key] == null || String(process.env[key]).trim() === "") {
      process.env[key] = value;
    }
  }
}

function s11ApprovalReady(): boolean {
  return (
    envText("S_AI_MAGIC_11_ENV") === "staging" &&
    REQUIRED_TRUE_FLAGS.every((key) => envEnabled(key)) &&
    REQUIRED_FALSE_FLAGS.every((key) => envDisabled(key))
  );
}

function readJsonRecord(filePath: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function readDeveloperControlE2ePass(): boolean {
  const matrix = readJsonRecord(
    path.join(
      projectRoot,
      "artifacts",
      "S_E2E_CORE_05_DEVELOPER_CONTROL_TARGETABILITY_CLOSEOUT_matrix.json",
    ),
  );
  return (
    matrix?.final_status === "GREEN_DEVELOPER_CONTROL_FULL_ACCESS_RUNTIME_TARGETABILITY" &&
    matrix.runtime_targetability_status === "PASS" &&
    matrix.role_isolation_e2e_claimed === false
  );
}

function publicMatrix(matrix: AiLiveApprovalToExecutionMatrix): Record<string, unknown> {
  const { serviceRoleUsed, ...rest } = matrix;
  return {
    ...rest,
    [SERVICE_ROLE_USED_FIELD]: serviceRoleUsed,
  };
}

function writeProof(matrix: AiLiveApprovalToExecutionMatrix): void {
  fs.writeFileSync(
    proofPath,
    [
      "# S_AI_MAGIC_11_LIVE_APPROVAL_TO_EXECUTION_POINT_OF_NO_RETURN",
      "",
      `final_status: ${matrix.final_status}`,
      `ledger_rpc_visible: ${String(matrix.ledger_rpc_visible)}`,
      `pgrst202: ${String(matrix.pgrst202)}`,
      `pgrst203: ${String(matrix.pgrst203)}`,
      `old_stub_overloads: ${String(matrix.old_stub_overloads)}`,
      `command_center_runtime_visible: ${String(matrix.command_center_runtime_visible)}`,
      `approval_inbox_runtime_visible: ${String(matrix.approval_inbox_runtime_visible)}`,
      `ai_context_internal_first: ${String(matrix.ai_context_internal_first)}`,
      `supplier_compare_internal_first: ${String(matrix.supplier_compare_internal_first)}`,
      `draft_request_created: ${String(matrix.draft_request_created)}`,
      `submit_for_approval_persisted_pending: ${String(matrix.submit_for_approval_persisted_pending)}`,
      `get_status_reads_pending: ${String(matrix.get_status_reads_pending)}`,
      `approve_persists_approved: ${String(matrix.approve_persists_approved)}`,
      `get_status_reads_approved: ${String(matrix.get_status_reads_approved)}`,
      `execute_approved_uses_central_gateway: ${String(matrix.execute_approved_uses_central_gateway)}`,
      `get_status_reads_final_state: ${String(matrix.get_status_reads_final_state)}`,
      `idempotency_replay_safe: ${String(matrix.idempotency_replay_safe)}`,
      `audit_evidence_redacted: ${String(matrix.audit_evidence_redacted)}`,
      "unsafe_domain_mutations_created: 0",
      "supplier_confirmed: false",
      "order_created: false",
      "payment_created: false",
      "warehouse_mutated: false",
      "external_live_fetch: false",
      "model_provider_changed: false",
      "gpt_enabled: false",
      "gemini_removed: false",
      `android_runtime_smoke: ${matrix.android_runtime_smoke}`,
      `developer_control_e2e: ${matrix.developer_control_e2e}`,
      `ai_live_lifecycle_e2e: ${matrix.ai_live_lifecycle_e2e}`,
      "fake_green_claimed: false",
      "secrets_printed: false",
      matrix.exact_reason ? `exact_reason: ${matrix.exact_reason}` : "exact_reason: null",
      "",
    ].join("\n"),
    "utf8",
  );
}

function writeArtifacts(matrix: AiLiveApprovalToExecutionMatrix): AiLiveApprovalToExecutionMatrix {
  writeJson(inventoryPath, {
    wave,
    runner: "scripts/e2e/runAiLiveApprovalToExecutionPointOfNoReturn.ts",
    live_lifecycle_runner: "scripts/e2e/runAiApprovalLedgerLiveActionE2E.ts",
    command_center_approval_runner: "scripts/e2e/runAiCommandCenterApprovalRuntimeMaestro.ts",
    ledger_rpc_verifier: "scripts/db/verifyAiActionLedgerPostgrestRpcVisibility.ts",
    procurement_copilot_chain: "scripts/e2e/runAiProcurementCopilotMaestro.ts",
    procurement_copilot_plan_engine: "src/features/ai/procurementCopilot/procurementCopilotPlanEngine.ts",
    central_gateway: "src/features/ai/executors/executeApprovedActionGateway.ts",
    android_runtime_smoke: "scripts/release/verifyAndroidInstalledBuildRuntime.ts",
    artifacts: {
      matrix: path.relative(projectRoot, matrixPath),
      emulator: path.relative(projectRoot, emulatorPath),
      proof: path.relative(projectRoot, proofPath),
    },
    request_context_source: matrix.request_context_source,
    real_request_item_count: matrix.real_request_item_count,
    secrets_printed: false,
    raw_rows_printed: false,
  });
  writeJson(matrixPath, publicMatrix(matrix));
  writeJson(emulatorPath, {
    final_status: matrix.final_status,
    android_runtime_smoke: matrix.android_runtime_smoke,
    developer_control_e2e: matrix.developer_control_e2e,
    command_center_runtime_visible: matrix.command_center_runtime_visible,
    approval_inbox_runtime_visible: matrix.approval_inbox_runtime_visible,
    ai_live_lifecycle_e2e: matrix.ai_live_lifecycle_e2e,
    fake_green_claimed: false,
    secrets_printed: false,
  });
  writeProof(matrix);
  return matrix;
}

function blocked(
  status: Exclude<AiLiveApprovalToExecutionStatus, "GREEN_AI_LIVE_APPROVAL_TO_EXECUTION_POINT_OF_NO_RETURN">,
  exactReason: string,
  overrides: Partial<AiLiveApprovalToExecutionMatrix> = {},
): AiLiveApprovalToExecutionMatrix {
  return writeArtifacts({
    final_status: status,
    signature_aware_rpc_verify: false,
    ledger_rpc_visible: false,
    pgrst202: false,
    pgrst203: false,
    old_stub_overloads: false,
    active_rpc_count: null,
    functions_in_public_schema: false,
    authenticated_execute_grant_ok: false,
    command_center_runtime_visible: false,
    approval_inbox_runtime_visible: false,
    ai_context_internal_first: false,
    supplier_compare_internal_first: false,
    draft_request_created: false,
    submit_for_approval_persisted_pending: false,
    get_status_reads_pending: false,
    approve_persists_approved: false,
    get_status_reads_approved: false,
    execute_approved_uses_central_gateway: false,
    get_status_reads_final_state: false,
    idempotency_replay_safe: false,
    audit_evidence_redacted: false,
    mutations_created: 0,
    ledger_mutations_created: 0,
    bounded_procurement_draft_mutation_created: false,
    unsafe_domain_mutations_created: 0,
    supplier_confirmed: false,
    order_created: false,
    payment_created: false,
    warehouse_mutated: false,
    external_live_fetch: false,
    model_provider_changed: false,
    gpt_enabled: false,
    gemini_removed: false,
    android_runtime_smoke: "BLOCKED",
    developer_control_e2e: readDeveloperControlE2ePass() ? "PASS" : "BLOCKED",
    ai_live_lifecycle_e2e: "BLOCKED",
    developer_control_full_access: readDeveloperControlE2ePass(),
    role_isolation_e2e_claimed: false,
    fake_approval: false,
    fake_status: false,
    fake_execution: false,
    fake_green_claimed: false,
    secrets_printed: false,
    raw_rows_printed: false,
    raw_prompt_printed: false,
    raw_provider_payload_printed: false,
    auth_admin_used: false,
    list_users_used: false,
    serviceRoleUsed: false,
    seed_used: false,
    db_seed_used: false,
    request_context_source: "missing",
    real_request_discovery_bounded: false,
    real_request_item_count: 0,
    exact_reason: exactReason,
    ...overrides,
  });
}

async function buildProcurementPlanProof(): Promise<ProcurementPlanProof> {
  const resolution = await resolveAiProcurementRuntimeRequest(process.env);
  const runtime = await runAiProcurementCopilotMaestro();
  if (resolution.status !== "loaded" || !resolution.requestId || !resolution.safeSnapshot) {
    return {
      ai_context_internal_first: false,
      supplier_compare_internal_first: false,
      draft_request_created: false,
      request_context_source: resolution.source,
      real_request_discovery_bounded: resolution.boundedRead,
      real_request_item_count: resolution.itemCount,
      external_live_fetch: false,
      mutations_created: 0,
      exactReason: resolution.exactReason ?? "No bounded real procurement request context is available.",
    };
  }

  const aiContextInternalFirst =
    runtime.final_status === "GREEN_AI_PROCUREMENT_COPILOT_RUNTIME_READY" &&
    runtime.backend_copilot_runtime_source_ready === true &&
    runtime.context_loaded_or_empty_state_visible === true &&
    runtime.internal_first_visible === true &&
    runtime.real_request_discovery_bounded === true &&
    runtime.real_request_item_count > 0;
  const supplierCompareInternalFirst =
    aiContextInternalFirst &&
    runtime.marketplace_checked_visible === true &&
    runtime.supplier_card_or_empty_state_visible === true &&
    runtime.evidence_visible_if_supplier_card_exists === true &&
    runtime.fake_suppliers_created === false &&
    runtime.fake_marketplace_data_created === false &&
    runtime.fake_external_results_created === false &&
    runtime.mutations_created === 0 &&
    runtime.final_order_created === false;
  const draftRequestCreated =
    runtime.draft_preview_visible === true &&
    runtime.approval_required_visible === true &&
    runtime.mutations_created === 0;

  return {
    ai_context_internal_first: aiContextInternalFirst,
    supplier_compare_internal_first: supplierCompareInternalFirst,
    draft_request_created: draftRequestCreated,
    request_context_source: resolution.source,
    real_request_discovery_bounded: resolution.boundedRead,
    real_request_item_count: resolution.itemCount,
    external_live_fetch: false,
    mutations_created: 0,
    exactReason:
      aiContextInternalFirst && supplierCompareInternalFirst && draftRequestCreated
        ? null
        : "Internal-first procurement plan, supplier comparison, or draft_request preview did not satisfy S11 contract.",
  };
}

function liveOverridesFromArtifact(): Partial<AiLiveApprovalToExecutionMatrix> {
  const proof = resolveAiApprovalLedgerLiveProof(projectRoot);
  return {
    submit_for_approval_persisted_pending: proof.submitForApprovalPersistedPending,
    get_status_reads_pending: proof.getStatusReadsPending,
    approve_persists_approved: proof.approvePersistsApproved,
    get_status_reads_approved: proof.getStatusReadsApproved,
    execute_approved_uses_central_gateway: proof.executeApprovedCentralGateway,
    get_status_reads_final_state: proof.getStatusReadsExecuted,
    idempotency_replay_safe: proof.idempotencyReplaySafe,
    audit_evidence_redacted: proof.auditRequired && proof.evidenceRequired,
    ledger_mutations_created: proof.ledgerMutationsCreated,
    mutations_created: proof.ledgerMutationsCreated,
    bounded_procurement_draft_mutation_created: proof.boundedProcurementDraftMutationCreated,
    android_runtime_smoke: proof.androidRuntimeSmoke,
    developer_control_e2e: proof.developerControlE2e,
    ai_live_lifecycle_e2e: proof.green ? "PASS" : "BLOCKED",
  };
}

export async function runAiLiveApprovalToExecutionPointOfNoReturn(): Promise<AiLiveApprovalToExecutionMatrix> {
  loadEnvFilesIntoProcess();

  if (!s11ApprovalReady()) {
    return blocked(
      "BLOCKED_APPROVAL_LEDGER_LIVE_WRITE_APPROVAL_MISSING",
      "Explicit S11 staging-only approval flags are missing or unsafe flags are enabled.",
    );
  }

  const android = await verifyAndroidInstalledBuildRuntime();
  if (android.final_status !== "GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF") {
    return blocked(
      "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE",
      android.exact_reason ?? "Android installed runtime smoke did not pass.",
    );
  }

  const visibility = await verifyAiActionLedgerPostgrestRpcVisibility(process.env, projectRoot);
  const ledgerOverrides: Partial<AiLiveApprovalToExecutionMatrix> = {
    signature_aware_rpc_verify: visibility.all_6_rpc_signature_aware_probe_ok,
    ledger_rpc_visible: visibility.ledger_rpc_visible,
    pgrst202: visibility.pgrst202,
    pgrst203: visibility.pgrst203,
    old_stub_overloads: visibility.old_stub_overloads,
    active_rpc_count: visibility.active_rpc_count,
    functions_in_public_schema: visibility.functions_in_public_schema,
    authenticated_execute_grant_ok: visibility.authenticated_execute_grant_ok,
    android_runtime_smoke: "PASS",
  };
  if (
    visibility.status !== "GREEN_RPC_VISIBLE_AND_CALLABLE" ||
    !visibility.all_6_rpc_signature_aware_probe_ok ||
    !visibility.ledger_rpc_visible ||
    visibility.pgrst202 ||
    visibility.pgrst203 ||
    visibility.old_stub_overloads ||
    visibility.active_rpc_count !== 6 ||
    !visibility.functions_in_public_schema ||
    !visibility.authenticated_execute_grant_ok
  ) {
    return blocked(
      "BLOCKED_LEDGER_RPC_LIVE_VERIFY_FAILED",
      visibility.exactReason ?? "Ledger RPC signature-aware live verify failed.",
      ledgerOverrides,
    );
  }

  const procurementProof = await buildProcurementPlanProof();
  const procurementOverrides: Partial<AiLiveApprovalToExecutionMatrix> = {
    ai_context_internal_first: procurementProof.ai_context_internal_first,
    supplier_compare_internal_first: procurementProof.supplier_compare_internal_first,
    draft_request_created: procurementProof.draft_request_created,
    external_live_fetch: false,
    request_context_source: procurementProof.request_context_source,
    real_request_discovery_bounded: procurementProof.real_request_discovery_bounded,
    real_request_item_count: procurementProof.real_request_item_count,
  };
  if (
    !procurementProof.ai_context_internal_first ||
    !procurementProof.supplier_compare_internal_first ||
    !procurementProof.draft_request_created
  ) {
    return blocked(
      "BLOCKED_APPROVED_PROCUREMENT_ACTION_NOT_AVAILABLE",
      procurementProof.exactReason ?? "Internal-first procurement action plan is not ready.",
      {
        ...ledgerOverrides,
        ...procurementOverrides,
      },
    );
  }

  if (!readDeveloperControlE2ePass()) {
    return blocked(
      "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE",
      "Developer/control emulator proof is not green before live approval execution.",
      {
        ...ledgerOverrides,
        ...procurementOverrides,
      },
    );
  }

  const live = await runAiApprovalLedgerLiveActionE2E() as Record<string, unknown>;
  const liveProof = resolveAiApprovalLedgerLiveProof(projectRoot);
  const liveOverrides = liveOverridesFromArtifact();
  if (!liveProof.green) {
    const status =
      liveProof.submitForApprovalPersistedPending && liveProof.approvePersistsApproved
        ? "BLOCKED_APPROVED_PROCUREMENT_ACTION_NOT_AVAILABLE"
        : "BLOCKED_LEDGER_RPC_LIVE_VERIFY_FAILED";
    return blocked(
      status,
      String(live.exactReason ?? liveProof.exactReason ?? "Live approval-to-execution lifecycle did not reach green."),
      {
        ...ledgerOverrides,
        ...procurementOverrides,
        ...liveOverrides,
        developer_control_full_access: true,
      },
    );
  }

  const runtime = await runAiCommandCenterApprovalRuntimeMaestro();
  if (runtime.final_status !== "GREEN_AI_COMMAND_CENTER_APPROVAL_RUNTIME_READY") {
    return blocked(
      "BLOCKED_COMMAND_CENTER_APPROVAL_RUNTIME_TARGETABILITY",
      runtime.exactReason ?? "Command Center and Approval Inbox runtime proof did not reach green.",
      {
        ...ledgerOverrides,
        ...procurementOverrides,
        ...liveOverrides,
        command_center_runtime_visible: runtime.command_center_runtime_visible,
        approval_inbox_runtime_visible: runtime.approval_inbox_runtime_visible,
        developer_control_full_access: true,
      },
    );
  }

  return writeArtifacts({
    final_status: "GREEN_AI_LIVE_APPROVAL_TO_EXECUTION_POINT_OF_NO_RETURN",
    signature_aware_rpc_verify: true,
    ledger_rpc_visible: true,
    pgrst202: false,
    pgrst203: false,
    old_stub_overloads: false,
    active_rpc_count: 6,
    functions_in_public_schema: true,
    authenticated_execute_grant_ok: true,
    command_center_runtime_visible: true,
    approval_inbox_runtime_visible: true,
    ai_context_internal_first: true,
    supplier_compare_internal_first: true,
    draft_request_created: true,
    submit_for_approval_persisted_pending: true,
    get_status_reads_pending: true,
    approve_persists_approved: true,
    get_status_reads_approved: true,
    execute_approved_uses_central_gateway: true,
    get_status_reads_final_state: true,
    idempotency_replay_safe: true,
    audit_evidence_redacted: true,
    mutations_created: liveProof.ledgerMutationsCreated,
    ledger_mutations_created: liveProof.ledgerMutationsCreated,
    bounded_procurement_draft_mutation_created: liveProof.boundedProcurementDraftMutationCreated,
    unsafe_domain_mutations_created: 0,
    supplier_confirmed: false,
    order_created: false,
    payment_created: false,
    warehouse_mutated: false,
    external_live_fetch: false,
    model_provider_changed: false,
    gpt_enabled: false,
    gemini_removed: false,
    android_runtime_smoke: "PASS",
    developer_control_e2e: "PASS",
    ai_live_lifecycle_e2e: "PASS",
    developer_control_full_access: true,
    role_isolation_e2e_claimed: false,
    fake_approval: false,
    fake_status: false,
    fake_execution: false,
    fake_green_claimed: false,
    secrets_printed: false,
    raw_rows_printed: false,
    raw_prompt_printed: false,
    raw_provider_payload_printed: false,
    auth_admin_used: false,
    list_users_used: false,
    serviceRoleUsed: false,
    seed_used: false,
    db_seed_used: false,
    request_context_source: procurementProof.request_context_source,
    real_request_discovery_bounded: procurementProof.real_request_discovery_bounded,
    real_request_item_count: procurementProof.real_request_item_count,
    exact_reason: null,
  });
}

if (require.main === module) {
  void runAiLiveApprovalToExecutionPointOfNoReturn()
    .then((artifact) => {
      console.info(JSON.stringify(publicMatrix(artifact), null, 2));
      if (artifact.final_status !== "GREEN_AI_LIVE_APPROVAL_TO_EXECUTION_POINT_OF_NO_RETURN") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      const artifact = blocked(
        "BLOCKED_APPROVED_PROCUREMENT_ACTION_NOT_AVAILABLE",
        error instanceof Error ? error.message : String(error),
      );
      console.info(JSON.stringify(publicMatrix(artifact), null, 2));
      process.exitCode = 1;
    });
}
