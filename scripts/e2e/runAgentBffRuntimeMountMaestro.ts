import fs from "node:fs";
import path from "node:path";

import {
  buildAgentRuntimeGatewayMatrix,
  validateAgentRuntimeGatewayRequest,
} from "../../src/features/ai/agent/agentRuntimeGateway";
import { parseAgentEnvFileValues } from "../env/checkRequiredAgentFlags";
import { verifyAndroidInstalledBuildRuntime } from "../release/verifyAndroidInstalledBuildRuntime";

type AgentBffRuntimeMountStatus =
  | "GREEN_AGENT_BFF_RUNTIME_MOUNT_READY"
  | "BLOCKED_AGENT_BFF_RUNTIME_MOUNT_APPROVAL_MISSING"
  | "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE"
  | "BLOCKED_AGENT_BFF_RUNTIME_MOUNT_POLICY_FAILED";

type AgentBffRuntimeMountMatrix = {
  final_status: AgentBffRuntimeMountStatus;
  backend_first: true;
  route_scoped: boolean;
  role_scoped: boolean;
  all_routes_mounted: boolean;
  all_routes_auth_required: boolean;
  all_routes_have_runtime_transport: boolean;
  all_routes_have_budget: boolean;
  all_routes_have_payload_limit: boolean;
  all_routes_have_result_limit: boolean;
  all_routes_have_timeout: boolean;
  all_routes_have_evidence_policy: boolean;
  all_tools_have_transport_boundary: boolean;
  all_tools_have_budget: boolean;
  all_tools_have_rate_policy: boolean;
  redaction_guard_blocks_forbidden_payload: boolean;
  idempotency_required_for_approved_execution: boolean;
  safe_request_passes_without_execution: boolean;
  android_runtime_smoke: "PASS" | "BLOCKED";
  emulator_runtime_proof: "PASS" | "BLOCKED";
  mutation_count: 0;
  db_writes: 0;
  final_execution: 0;
  direct_supabase_from_ui: false;
  direct_mutation_from_ui: false;
  auth_admin_used: false;
  list_users_used: false;
  service_role_used: false;
  external_live_fetch: false;
  model_provider_changed: false;
  gpt_enabled: false;
  gemini_removed: false;
  fake_green_claimed: false;
  secrets_printed: false;
  exact_reason: string | null;
};

const projectRoot = process.cwd();
const wave = "S_AI_MAGIC_24_AGENT_BFF_RUNTIME_MOUNT_AND_BUDGETS";
const artifactPrefix = path.join(projectRoot, "artifacts", wave);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;

const REQUIRED_TRUE_FLAGS = [
  "S_AI_MAGIC_REQUIRE_ANDROID_EMULATOR_PROOF",
  "S_AI_MAGIC_REQUIRE_EVIDENCE",
  "S_AI_MAGIC_REQUIRE_ROLE_SCOPE",
  "S_AI_NO_FAKE_GREEN",
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

function roadmapApproved(): boolean {
  return envEnabled("S_AI_MAGIC_ROADMAP_APPROVED") || envEnabled("S_AI_MAGIC_WAVES_APPROVED");
}

function flagsReady(): boolean {
  return roadmapApproved() && REQUIRED_TRUE_FLAGS.every((key) => envEnabled(key));
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
  finalStatus: AgentBffRuntimeMountStatus,
  exactReason: string | null,
  overrides: Partial<AgentBffRuntimeMountMatrix> = {},
): AgentBffRuntimeMountMatrix {
  return {
    final_status: finalStatus,
    backend_first: true,
    route_scoped: false,
    role_scoped: false,
    all_routes_mounted: false,
    all_routes_auth_required: false,
    all_routes_have_runtime_transport: false,
    all_routes_have_budget: false,
    all_routes_have_payload_limit: false,
    all_routes_have_result_limit: false,
    all_routes_have_timeout: false,
    all_routes_have_evidence_policy: false,
    all_tools_have_transport_boundary: false,
    all_tools_have_budget: false,
    all_tools_have_rate_policy: false,
    redaction_guard_blocks_forbidden_payload: false,
    idempotency_required_for_approved_execution: false,
    safe_request_passes_without_execution: false,
    android_runtime_smoke: "BLOCKED",
    emulator_runtime_proof: "BLOCKED",
    mutation_count: 0,
    db_writes: 0,
    final_execution: 0,
    direct_supabase_from_ui: false,
    direct_mutation_from_ui: false,
    auth_admin_used: false,
    list_users_used: false,
    service_role_used: false,
    external_live_fetch: false,
    model_provider_changed: false,
    gpt_enabled: false,
    gemini_removed: false,
    fake_green_claimed: false,
    secrets_printed: false,
    exact_reason: exactReason,
    ...overrides,
  };
}

function persistArtifacts(matrix: AgentBffRuntimeMountMatrix): void {
  writeJson(matrixPath, matrix);
  writeJson(inventoryPath, {
    wave,
    artifacts: [inventoryPath, matrixPath, emulatorPath, proofPath].map((filePath) =>
      path.relative(projectRoot, filePath).replace(/\\/g, "/"),
    ),
    backend_first: true,
    route_scoped: matrix.route_scoped,
    role_scoped: matrix.role_scoped,
    mutation_count: 0,
    db_writes: 0,
    secrets_printed: false,
  });
  writeJson(emulatorPath, {
    wave,
    android_runtime_smoke: matrix.android_runtime_smoke,
    emulator_runtime_proof: matrix.emulator_runtime_proof,
    fake_emulator_pass: false,
  });
  fs.writeFileSync(
    proofPath,
    [
      "# S_AI_MAGIC_24_AGENT_BFF_RUNTIME_MOUNT_AND_BUDGETS",
      "",
      `final_status: ${matrix.final_status}`,
      `all_routes_mounted: ${String(matrix.all_routes_mounted)}`,
      `all_routes_have_budget: ${String(matrix.all_routes_have_budget)}`,
      `all_tools_have_transport_boundary: ${String(matrix.all_tools_have_transport_boundary)}`,
      `redaction_guard_blocks_forbidden_payload: ${String(matrix.redaction_guard_blocks_forbidden_payload)}`,
      `idempotency_required_for_approved_execution: ${String(matrix.idempotency_required_for_approved_execution)}`,
      `safe_request_passes_without_execution: ${String(matrix.safe_request_passes_without_execution)}`,
      `android_runtime_smoke: ${matrix.android_runtime_smoke}`,
      `mutation_count: ${matrix.mutation_count}`,
      `db_writes: ${matrix.db_writes}`,
      `exact_reason: ${matrix.exact_reason ?? "none"}`,
      "",
    ].join("\n"),
    "utf8",
  );
}

async function run(): Promise<AgentBffRuntimeMountMatrix> {
  loadEnvFilesIntoProcess();

  if (!flagsReady()) {
    return baseMatrix(
      "BLOCKED_AGENT_BFF_RUNTIME_MOUNT_APPROVAL_MISSING",
      `Missing required runtime approval flags: ${[
        "S_AI_MAGIC_ROADMAP_APPROVED|S_AI_MAGIC_WAVES_APPROVED",
        ...REQUIRED_TRUE_FLAGS,
      ]
        .filter((key) =>
          key.includes("|")
            ? !roadmapApproved()
            : !envEnabled(key),
        )
        .join(", ")}`,
    );
  }

  const android = await verifyAndroidInstalledBuildRuntime();
  if (android.final_status !== "GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF") {
    return baseMatrix("BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE", android.exact_reason, {
      android_runtime_smoke: "BLOCKED",
      emulator_runtime_proof: "BLOCKED",
    });
  }

  const gateway = buildAgentRuntimeGatewayMatrix();
  const auth = { userId: "developer-control-runtime-gateway", role: "director" as const };
  const safeDecision = validateAgentRuntimeGatewayRequest({
    operation: "agent.procurement.copilot.plan.preview",
    auth,
    payload: { screenId: "procurement.copilot" },
    evidenceRefs: ["runtime:evidence:redacted"],
    requestedLimit: 1,
  });
  const forbiddenDecision = validateAgentRuntimeGatewayRequest({
    operation: "agent.task_stream.read",
    auth,
    payload: { rawPrompt: "do not expose" },
    evidenceRefs: ["runtime:evidence:redacted"],
  });
  const missingIdempotencyDecision = validateAgentRuntimeGatewayRequest({
    operation: "agent.action.execute_approved",
    auth,
    payload: { actionId: "action:redacted" },
    evidenceRefs: ["runtime:evidence:redacted"],
  });

  const redactionGuardBlocks =
    !forbiddenDecision.ok && forbiddenDecision.error.code === "AGENT_RUNTIME_FORBIDDEN_PAYLOAD";
  const idempotencyRequired =
    !missingIdempotencyDecision.ok &&
    missingIdempotencyDecision.error.code === "AGENT_RUNTIME_IDEMPOTENCY_REQUIRED";
  const safeRequestPasses = safeDecision.ok && safeDecision.finalExecution === 0;
  const matrixReady =
    gateway.all_routes_mounted &&
    gateway.all_routes_auth_required &&
    gateway.all_routes_role_scoped &&
    gateway.all_routes_have_runtime_transport &&
    gateway.all_routes_have_budget &&
    gateway.all_routes_have_payload_limit &&
    gateway.all_routes_have_result_limit &&
    gateway.all_routes_have_timeout &&
    gateway.all_routes_have_evidence_policy &&
    gateway.all_tools_have_transport_boundary &&
    gateway.all_tools_have_budget &&
    gateway.all_tools_have_rate_policy &&
    redactionGuardBlocks &&
    idempotencyRequired &&
    safeRequestPasses;

  if (!matrixReady) {
    return baseMatrix(
      "BLOCKED_AGENT_BFF_RUNTIME_MOUNT_POLICY_FAILED",
      "Agent BFF runtime gateway did not satisfy route, budget, redaction, and idempotency policy.",
      {
        route_scoped: gateway.all_routes_are_route_scoped,
        role_scoped: gateway.all_routes_role_scoped,
        all_routes_mounted: gateway.all_routes_mounted,
        all_routes_auth_required: gateway.all_routes_auth_required,
        all_routes_have_runtime_transport: gateway.all_routes_have_runtime_transport,
        all_routes_have_budget: gateway.all_routes_have_budget,
        all_routes_have_payload_limit: gateway.all_routes_have_payload_limit,
        all_routes_have_result_limit: gateway.all_routes_have_result_limit,
        all_routes_have_timeout: gateway.all_routes_have_timeout,
        all_routes_have_evidence_policy: gateway.all_routes_have_evidence_policy,
        all_tools_have_transport_boundary: gateway.all_tools_have_transport_boundary,
        all_tools_have_budget: gateway.all_tools_have_budget,
        all_tools_have_rate_policy: gateway.all_tools_have_rate_policy,
        redaction_guard_blocks_forbidden_payload: redactionGuardBlocks,
        idempotency_required_for_approved_execution: idempotencyRequired,
        safe_request_passes_without_execution: safeRequestPasses,
        android_runtime_smoke: "PASS",
        emulator_runtime_proof: "PASS",
      },
    );
  }

  return baseMatrix("GREEN_AGENT_BFF_RUNTIME_MOUNT_READY", null, {
    route_scoped: true,
    role_scoped: true,
    all_routes_mounted: true,
    all_routes_auth_required: true,
    all_routes_have_runtime_transport: true,
    all_routes_have_budget: true,
    all_routes_have_payload_limit: true,
    all_routes_have_result_limit: true,
    all_routes_have_timeout: true,
    all_routes_have_evidence_policy: true,
    all_tools_have_transport_boundary: true,
    all_tools_have_budget: true,
    all_tools_have_rate_policy: true,
    redaction_guard_blocks_forbidden_payload: true,
    idempotency_required_for_approved_execution: true,
    safe_request_passes_without_execution: true,
    android_runtime_smoke: "PASS",
    emulator_runtime_proof: "PASS",
  });
}

run()
  .then((matrix) => {
    persistArtifacts(matrix);
    process.stdout.write(`${JSON.stringify(matrix, null, 2)}\n`);
    process.exitCode = matrix.final_status === "GREEN_AGENT_BFF_RUNTIME_MOUNT_READY" ? 0 : 2;
  })
  .catch((error) => {
    const matrix = baseMatrix(
      "BLOCKED_AGENT_BFF_RUNTIME_MOUNT_POLICY_FAILED",
      sanitizeReason(error),
    );
    persistArtifacts(matrix);
    process.stdout.write(`${JSON.stringify(matrix, null, 2)}\n`);
    process.exitCode = 2;
  });
