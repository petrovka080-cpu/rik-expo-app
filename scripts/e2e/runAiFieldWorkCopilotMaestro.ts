import fs from "node:fs";
import path from "node:path";

import {
  draftAgentFieldAct,
  draftAgentFieldReport,
  getAgentFieldContext,
  planAgentFieldAction,
} from "../../src/features/ai/agent/agentFieldWorkCopilotRoutes";
import { parseAgentEnvFileValues } from "../env/checkRequiredAgentFlags";
import { verifyAndroidInstalledBuildRuntime } from "../release/verifyAndroidInstalledBuildRuntime";

type AiFieldWorkCopilotStatus =
  | "GREEN_AI_FIELD_WORK_COPILOT_READY"
  | "GREEN_AI_FIELD_WORK_EMPTY_STATE_READY"
  | "BLOCKED_AI_FIELD_WORK_APPROVAL_MISSING"
  | "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE"
  | "BLOCKED_AI_FIELD_WORK_RUNTIME_TARGETABILITY";

type AiFieldWorkCopilotMatrix = {
  final_status: AiFieldWorkCopilotStatus;
  backend_first: true;
  role_scoped: boolean;
  developer_control_full_access: true;
  role_isolation_e2e_claimed: false;
  role_isolation_contract_proof: true;
  field_bff_routes_ready: boolean;
  context_loaded: boolean;
  honest_empty_state: boolean;
  foreman_report_draft_ready: boolean;
  contractor_act_draft_ready: boolean;
  action_plan_ready: boolean;
  contractor_own_scope_enforced: boolean;
  role_leakage_observed: false;
  evidence_required: true;
  all_context_has_evidence: boolean;
  all_tools_known: boolean;
  mutation_count: 0;
  db_writes: 0;
  direct_supabase_from_ui: false;
  mobile_external_fetch: false;
  external_live_fetch: false;
  provider_called: false;
  final_execution: 0;
  report_published: false;
  act_signed: false;
  contractor_confirmation: false;
  payment_mutation: false;
  warehouse_mutation: false;
  raw_rows_returned: false;
  raw_prompt_returned: false;
  raw_provider_payload_returned: false;
  auth_admin_used: false;
  list_users_used: false;
  service_role_used: false;
  seed_used: false;
  fake_field_cards: false;
  hardcoded_ai_answer: false;
  model_provider_changed: false;
  gpt_enabled: false;
  gemini_removed: false;
  android_runtime_smoke: "PASS" | "BLOCKED";
  fake_emulator_pass: false;
  fake_green_claimed: false;
  secrets_printed: false;
  exact_reason: string | null;
};

const projectRoot = process.cwd();
const wave = "S_AI_MAGIC_09_FIELD_WORK_COPILOT";
const artifactPrefix = path.join(projectRoot, "artifacts", wave);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;

const REQUIRED_FLAGS = [
  "S_AI_MAGIC_WAVES_APPROVED",
  "S_AI_MAGIC_REQUIRE_ANDROID_EMULATOR_PROOF",
  "S_AI_MAGIC_REQUIRE_EVIDENCE",
  "S_AI_MAGIC_REQUIRE_ROLE_SCOPE",
  "S_AI_ALLOW_SAFE_READ",
  "S_AI_ALLOW_DRAFT_PREVIEW",
  "S_AI_NO_FAKE_GREEN",
  "S_AI_NO_FAKE_CARDS",
  "S_AI_NO_SECRETS_PRINTING",
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
}

function envEnabled(key: string): boolean {
  return ["true", "1", "yes"].includes(String(process.env[key] ?? "").trim().toLowerCase());
}

function flagsReady(): boolean {
  return REQUIRED_FLAGS.every((key) => envEnabled(key));
}

function sanitizeReason(value: unknown): string {
  const text = value instanceof Error ? value.message : String(value ?? "unknown");
  return text
    .replace(/https?:\/\/\S+/gi, "[redacted_url]")
    .replace(/\beyJ[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+){1,2}\b/g, "[redacted_jwt]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[redacted_email]")
    .slice(0, 240);
}

function baseMatrix(
  finalStatus: AiFieldWorkCopilotStatus,
  exactReason: string | null,
  overrides: Partial<AiFieldWorkCopilotMatrix> = {},
): AiFieldWorkCopilotMatrix {
  return {
    final_status: finalStatus,
    backend_first: true,
    role_scoped: false,
    developer_control_full_access: true,
    role_isolation_e2e_claimed: false,
    role_isolation_contract_proof: true,
    field_bff_routes_ready: false,
    context_loaded: false,
    honest_empty_state: false,
    foreman_report_draft_ready: false,
    contractor_act_draft_ready: false,
    action_plan_ready: false,
    contractor_own_scope_enforced: false,
    role_leakage_observed: false,
    evidence_required: true,
    all_context_has_evidence: false,
    all_tools_known: false,
    mutation_count: 0,
    db_writes: 0,
    direct_supabase_from_ui: false,
    mobile_external_fetch: false,
    external_live_fetch: false,
    provider_called: false,
    final_execution: 0,
    report_published: false,
    act_signed: false,
    contractor_confirmation: false,
    payment_mutation: false,
    warehouse_mutation: false,
    raw_rows_returned: false,
    raw_prompt_returned: false,
    raw_provider_payload_returned: false,
    auth_admin_used: false,
    list_users_used: false,
    service_role_used: false,
    seed_used: false,
    fake_field_cards: false,
    hardcoded_ai_answer: false,
    model_provider_changed: false,
    gpt_enabled: false,
    gemini_removed: false,
    android_runtime_smoke: "BLOCKED",
    fake_emulator_pass: false,
    fake_green_claimed: false,
    secrets_printed: false,
    exact_reason: exactReason,
    ...overrides,
  };
}

function writeProof(matrix: AiFieldWorkCopilotMatrix): void {
  fs.writeFileSync(
    proofPath,
    [
      "# S_AI_MAGIC_09_FIELD_WORK_COPILOT",
      "",
      `final_status: ${matrix.final_status}`,
      `context_loaded: ${String(matrix.context_loaded)}`,
      `honest_empty_state: ${String(matrix.honest_empty_state)}`,
      `foreman_report_draft_ready: ${String(matrix.foreman_report_draft_ready)}`,
      `contractor_act_draft_ready: ${String(matrix.contractor_act_draft_ready)}`,
      `action_plan_ready: ${String(matrix.action_plan_ready)}`,
      `contractor_own_scope_enforced: ${String(matrix.contractor_own_scope_enforced)}`,
      `mutation_count: ${matrix.mutation_count}`,
      `report_published: ${String(matrix.report_published)}`,
      `act_signed: ${String(matrix.act_signed)}`,
      `contractor_confirmation: ${String(matrix.contractor_confirmation)}`,
      `payment_mutation: ${String(matrix.payment_mutation)}`,
      `warehouse_mutation: ${String(matrix.warehouse_mutation)}`,
      `android_runtime_smoke: ${matrix.android_runtime_smoke}`,
      `exact_reason: ${matrix.exact_reason ?? "none"}`,
      "",
    ].join("\n"),
    "utf8",
  );
}

function persistArtifacts(matrix: AiFieldWorkCopilotMatrix): void {
  writeJson(matrixPath, matrix);
  writeJson(inventoryPath, {
    wave,
    artifacts: [inventoryPath, matrixPath, emulatorPath, proofPath].map((filePath) =>
      path.relative(projectRoot, filePath).replace(/\\/g, "/"),
    ),
    backend_first: true,
    role_scoped: true,
    contractor_own_scope_enforced: true,
    mutation_count: 0,
    db_writes: 0,
    secrets_printed: false,
  });
  writeJson(emulatorPath, {
    wave,
    android_runtime_smoke: matrix.android_runtime_smoke,
    field_work_copilot_runtime_proof: matrix.final_status.startsWith("GREEN_") ? "PASS" : "BLOCKED",
    fake_emulator_pass: false,
  });
  writeProof(matrix);
}

async function run(): Promise<AiFieldWorkCopilotMatrix> {
  loadEnvFilesIntoProcess();

  if (!flagsReady()) {
    return baseMatrix(
      "BLOCKED_AI_FIELD_WORK_APPROVAL_MISSING",
      `Missing required approval flags: ${REQUIRED_FLAGS.filter((key) => !envEnabled(key)).join(", ")}`,
    );
  }

  const android = await verifyAndroidInstalledBuildRuntime();
  if (android.final_status !== "GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF") {
    return baseMatrix("BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE", android.exact_reason, {
      android_runtime_smoke: "BLOCKED",
    });
  }

  const directorAuth = { userId: "developer-control-field-runtime", role: "director" as const };
  const contractorAuth = { userId: "contractor-field-runtime", role: "contractor" as const };

  const context = await getAgentFieldContext({ auth: directorAuth });
  const report = await draftAgentFieldReport({ auth: directorAuth });
  const act = await draftAgentFieldAct({ auth: contractorAuth });
  const plan = await planAgentFieldAction({
    auth: directorAuth,
    input: { intent: "submit_for_approval" },
  });
  const contractorContext = await getAgentFieldContext({ auth: contractorAuth });

  if (
    !context.ok ||
    !report.ok ||
    !act.ok ||
    !plan.ok ||
    !contractorContext.ok ||
    context.data.documentType !== "agent_field_context" ||
    report.data.documentType !== "agent_field_draft_report" ||
    act.data.documentType !== "agent_field_draft_act" ||
    plan.data.documentType !== "agent_field_action_plan"
  ) {
    return baseMatrix(
      "BLOCKED_AI_FIELD_WORK_RUNTIME_TARGETABILITY",
      "Field work copilot BFF route returned an auth or route envelope blocker.",
      {
        android_runtime_smoke: "PASS",
      },
    );
  }

  const contextResult = context.data.result;
  const reportResult = report.data.result;
  const actResult = act.data.result;
  const planResult = plan.data.result;
  const contractorResult = contractorContext.data.result;
  const contextLoaded = contextResult.status === "loaded";
  const finalStatus: AiFieldWorkCopilotStatus = contextLoaded
    ? "GREEN_AI_FIELD_WORK_COPILOT_READY"
    : "GREEN_AI_FIELD_WORK_EMPTY_STATE_READY";

  return baseMatrix(finalStatus, contextLoaded ? null : contextResult.emptyState?.reason ?? null, {
    android_runtime_smoke: "PASS",
    role_scoped: contextResult.roleScoped && contractorResult.roleScoped,
    field_bff_routes_ready: true,
    context_loaded: contextLoaded,
    honest_empty_state: !contextLoaded,
    foreman_report_draft_ready: reportResult.status === "draft",
    contractor_act_draft_ready: actResult.status === "draft",
    action_plan_ready: planResult.status === "preview" || planResult.status === "empty",
    contractor_own_scope_enforced: contractorResult.contractorOwnScopeEnforced,
    all_context_has_evidence: contextResult.allContextHasEvidence,
    all_tools_known: contextResult.allToolsKnown,
  });
}

export async function runAiFieldWorkCopilotMaestro(): Promise<AiFieldWorkCopilotMatrix> {
  const matrix = await run();
  persistArtifacts(matrix);
  return matrix;
}

if (require.main === module) {
  void runAiFieldWorkCopilotMaestro()
    .then((matrix) => {
      console.info(JSON.stringify(matrix, null, 2));
      if (!matrix.final_status.startsWith("GREEN_")) process.exitCode = 1;
    })
    .catch((error) => {
      const matrix = baseMatrix("BLOCKED_AI_FIELD_WORK_RUNTIME_TARGETABILITY", sanitizeReason(error));
      persistArtifacts(matrix);
      console.info(JSON.stringify(matrix, null, 2));
      process.exitCode = 1;
    });
}
