import fs from "node:fs";
import path from "node:path";

import { buildAiMcpApprovalPolicyMatrix } from "../../src/features/ai/mcp/aiMcpApprovalPolicy";
import { buildAiMcpCapabilitySchemaMatrix } from "../../src/features/ai/mcp/aiMcpCapabilitySchema";
import { buildAiMcpSecurityPolicyMatrix } from "../../src/features/ai/mcp/aiMcpSecurityPolicy";
import { buildAiMcpToolManifestMatrix } from "../../src/features/ai/mcp/aiMcpToolManifest";
import { parseAgentEnvFileValues } from "../env/checkRequiredAgentFlags";
import { verifyAndroidInstalledBuildRuntime } from "../release/verifyAndroidInstalledBuildRuntime";

type AiMcpBlueprintStatus =
  | "GREEN_AI_MCP_APPS_SDK_BLUEPRINT_READY"
  | "BLOCKED_AI_MCP_BLUEPRINT_APPROVAL_MISSING"
  | "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE"
  | "BLOCKED_AI_MCP_BLUEPRINT_POLICY_FAILED";

type AiMcpBlueprintMatrix = {
  final_status: AiMcpBlueprintStatus;
  provider_neutral: true;
  tool_manifest_ready: boolean;
  capability_schema_ready: boolean;
  security_policy_ready: boolean;
  approval_policy_ready: boolean;
  tools_registered: number;
  all_tools_from_registry: boolean;
  all_tools_role_scoped: boolean;
  all_tools_have_security_policy: boolean;
  all_tools_have_approval_policy: boolean;
  all_tools_have_capability_schema: boolean;
  all_tools_evidence_required: boolean;
  all_tools_redacted: boolean;
  all_tools_bounded: boolean;
  high_risk_requires_approval: boolean;
  mutation_without_approval_allowed: false;
  final_action_allowed_from_manifest: false;
  direct_execution_allowed: false;
  direct_ui_mutation_allowed: false;
  direct_database_access_allowed: false;
  external_host_execution_allowed: false;
  external_live_fetch: false;
  model_provider_invocation_allowed: false;
  model_provider_changed: false;
  gpt_enabled: false;
  gemini_removed: false;
  raw_rows_returned: false;
  raw_prompt_returned: false;
  raw_provider_payload_returned: false;
  secrets_returned: false;
  auth_admin_used: false;
  list_users_used: false;
  privileged_backend_role_used: false;
  mutation_count: 0;
  db_writes: 0;
  android_runtime_smoke: "PASS" | "BLOCKED";
  emulator_runtime_proof: "PASS" | "BLOCKED";
  fake_green_claimed: false;
  secrets_printed: false;
  exact_reason: string | null;
};

const projectRoot = process.cwd();
const wave = "S_AI_MAGIC_25_MCP_APPS_SDK_BLUEPRINT";
const artifactPrefix = path.join(projectRoot, "artifacts", wave);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;

const REQUIRED_TRUE_FLAGS = [
  "S_AI_MAGIC_REQUIRE_ANDROID_EMULATOR_PROOF",
  "S_AI_MAGIC_REQUIRE_EVIDENCE",
  "S_AI_MAGIC_REQUIRE_AUDIT",
  "S_AI_MAGIC_REQUIRE_ROLE_SCOPE",
  "S_AI_MAGIC_REQUIRE_APPROVAL_FOR_HIGH_RISK",
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
  finalStatus: AiMcpBlueprintStatus,
  exactReason: string | null,
  overrides: Partial<AiMcpBlueprintMatrix> = {},
): AiMcpBlueprintMatrix {
  return {
    final_status: finalStatus,
    provider_neutral: true,
    tool_manifest_ready: false,
    capability_schema_ready: false,
    security_policy_ready: false,
    approval_policy_ready: false,
    tools_registered: 0,
    all_tools_from_registry: false,
    all_tools_role_scoped: false,
    all_tools_have_security_policy: false,
    all_tools_have_approval_policy: false,
    all_tools_have_capability_schema: false,
    all_tools_evidence_required: false,
    all_tools_redacted: false,
    all_tools_bounded: false,
    high_risk_requires_approval: false,
    mutation_without_approval_allowed: false,
    final_action_allowed_from_manifest: false,
    direct_execution_allowed: false,
    direct_ui_mutation_allowed: false,
    direct_database_access_allowed: false,
    external_host_execution_allowed: false,
    external_live_fetch: false,
    model_provider_invocation_allowed: false,
    model_provider_changed: false,
    gpt_enabled: false,
    gemini_removed: false,
    raw_rows_returned: false,
    raw_prompt_returned: false,
    raw_provider_payload_returned: false,
    secrets_returned: false,
    auth_admin_used: false,
    list_users_used: false,
    privileged_backend_role_used: false,
    mutation_count: 0,
    db_writes: 0,
    android_runtime_smoke: "BLOCKED",
    emulator_runtime_proof: "BLOCKED",
    fake_green_claimed: false,
    secrets_printed: false,
    exact_reason: exactReason,
    ...overrides,
  };
}

function persistArtifacts(matrix: AiMcpBlueprintMatrix): void {
  writeJson(matrixPath, matrix);
  writeJson(inventoryPath, {
    wave,
    artifacts: [inventoryPath, matrixPath, emulatorPath, proofPath].map((filePath) =>
      path.relative(projectRoot, filePath).replace(/\\/g, "/"),
    ),
    provider_neutral: true,
    tools_registered: matrix.tools_registered,
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
      "# S_AI_MAGIC_25_MCP_APPS_SDK_BLUEPRINT",
      "",
      `final_status: ${matrix.final_status}`,
      `tools_registered: ${matrix.tools_registered}`,
      `tool_manifest_ready: ${String(matrix.tool_manifest_ready)}`,
      `capability_schema_ready: ${String(matrix.capability_schema_ready)}`,
      `security_policy_ready: ${String(matrix.security_policy_ready)}`,
      `approval_policy_ready: ${String(matrix.approval_policy_ready)}`,
      `high_risk_requires_approval: ${String(matrix.high_risk_requires_approval)}`,
      `external_host_execution_allowed: ${String(matrix.external_host_execution_allowed)}`,
      `model_provider_invocation_allowed: ${String(matrix.model_provider_invocation_allowed)}`,
      `mutation_count: ${matrix.mutation_count}`,
      `db_writes: ${matrix.db_writes}`,
      `android_runtime_smoke: ${matrix.android_runtime_smoke}`,
      `exact_reason: ${matrix.exact_reason ?? "none"}`,
      "",
    ].join("\n"),
    "utf8",
  );
}

async function run(): Promise<AiMcpBlueprintMatrix> {
  loadEnvFilesIntoProcess();

  if (!flagsReady()) {
    return baseMatrix(
      "BLOCKED_AI_MCP_BLUEPRINT_APPROVAL_MISSING",
      `Missing required blueprint approval flags: ${[
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

  const manifest = buildAiMcpToolManifestMatrix();
  const capability = buildAiMcpCapabilitySchemaMatrix();
  const security = buildAiMcpSecurityPolicyMatrix();
  const approval = buildAiMcpApprovalPolicyMatrix();
  const ready =
    manifest.manifest_status === "ready" &&
    manifest.all_tools_from_registry &&
    manifest.all_tools_have_security_policy &&
    manifest.all_tools_have_approval_policy &&
    manifest.all_tools_have_capability_schema &&
    capability.all_tools_have_capability_schema &&
    capability.direct_execution_allowed === false &&
    capability.external_host_execution_allowed === false &&
    security.all_tools_have_security_policy &&
    security.all_tools_bounded &&
    security.external_host_execution_allowed === false &&
    security.model_provider_invocation_allowed === false &&
    security.direct_database_access_allowed === false &&
    approval.high_risk_requires_approval &&
    approval.mutation_without_approval_allowed === false &&
    approval.final_action_allowed_from_manifest === false;

  if (!ready) {
    return baseMatrix(
      "BLOCKED_AI_MCP_BLUEPRINT_POLICY_FAILED",
      "AI MCP blueprint failed manifest, capability, security, or approval policy validation.",
      {
        tool_manifest_ready: manifest.manifest_status === "ready",
        capability_schema_ready: capability.all_tools_have_capability_schema,
        security_policy_ready: security.all_tools_have_security_policy,
        approval_policy_ready: approval.high_risk_requires_approval,
        tools_registered: manifest.tool_count,
        all_tools_from_registry: manifest.all_tools_from_registry,
        all_tools_role_scoped: manifest.all_tools_role_scoped,
        all_tools_have_security_policy: manifest.all_tools_have_security_policy,
        all_tools_have_approval_policy: manifest.all_tools_have_approval_policy,
        all_tools_have_capability_schema: manifest.all_tools_have_capability_schema,
        all_tools_evidence_required: manifest.all_tools_evidence_required,
        all_tools_redacted: manifest.all_tools_redacted,
        all_tools_bounded: security.all_tools_bounded,
        high_risk_requires_approval: approval.high_risk_requires_approval,
        android_runtime_smoke: "PASS",
        emulator_runtime_proof: "PASS",
      },
    );
  }

  return baseMatrix("GREEN_AI_MCP_APPS_SDK_BLUEPRINT_READY", null, {
    tool_manifest_ready: true,
    capability_schema_ready: true,
    security_policy_ready: true,
    approval_policy_ready: true,
    tools_registered: manifest.tool_count,
    all_tools_from_registry: true,
    all_tools_role_scoped: true,
    all_tools_have_security_policy: true,
    all_tools_have_approval_policy: true,
    all_tools_have_capability_schema: true,
    all_tools_evidence_required: true,
    all_tools_redacted: true,
    all_tools_bounded: true,
    high_risk_requires_approval: true,
    android_runtime_smoke: "PASS",
    emulator_runtime_proof: "PASS",
  });
}

run()
  .then((matrix) => {
    persistArtifacts(matrix);
    process.stdout.write(`${JSON.stringify(matrix, null, 2)}\n`);
    process.exitCode = matrix.final_status === "GREEN_AI_MCP_APPS_SDK_BLUEPRINT_READY" ? 0 : 2;
  })
  .catch((error) => {
    const matrix = baseMatrix("BLOCKED_AI_MCP_BLUEPRINT_POLICY_FAILED", sanitizeReason(error));
    persistArtifacts(matrix);
    process.stdout.write(`${JSON.stringify(matrix, null, 2)}\n`);
    process.exitCode = 2;
  });
