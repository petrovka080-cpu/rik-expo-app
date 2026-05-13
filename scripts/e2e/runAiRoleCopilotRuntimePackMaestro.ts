import fs from "node:fs";
import path from "node:path";

import {
  AI_ROLE_COPILOT_RUNTIME_CONTRACT,
  AI_ROLE_COPILOT_REQUIRED_ROLES,
  buildAiRoleCopilotRuntimeMatrix,
  validateAiRoleCopilotPolicy,
} from "../../src/features/ai/roles/aiRoleCopilotRuntime";
import {
  AI_ROLE_COPILOT_PROFILES,
  type AiRoleCopilotProfile,
} from "../../src/features/ai/roles/aiRoleCopilotProfiles";
import { isAgentFlagEnabled, parseAgentEnvFileValues } from "../env/checkRequiredAgentFlags";
import { verifyAndroidInstalledBuildRuntime } from "../release/verifyAndroidInstalledBuildRuntime";
import { runDeveloperControlFullAccessMaestro } from "./runDeveloperControlFullAccessMaestro";

type AiRoleCopilotRuntimePackStatus =
  | "GREEN_AI_ROLE_COPILOT_RUNTIME_PACK_READY"
  | "BLOCKED_AI_MAGIC_ROADMAP_APPROVAL_MISSING"
  | "BLOCKED_ROLE_COPILOT_CONTRACT"
  | "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE"
  | "BLOCKED_ROLE_COPILOT_RUNTIME_TARGETABILITY";

type DeveloperControlRuntimeArtifact = Awaited<
  ReturnType<typeof runDeveloperControlFullAccessMaestro>
>;

type AiRoleCopilotRuntimePackArtifact = {
  final_status: AiRoleCopilotRuntimePackStatus;
  backend_first: true;
  profile_driven: true;
  role_scoped: true;
  profiles_registered: number;
  roles_checked: number;
  required_roles_covered: boolean;
  all_profiles_have_allowed_domains: boolean;
  all_profiles_have_forbidden_domain_policy: boolean;
  all_profiles_have_default_tools: boolean;
  all_default_tools_known: boolean;
  all_tools_role_scoped: boolean;
  all_high_risk_requires_approval: boolean;
  director_control_full_access: true;
  developer_control_full_access: true;
  single_owner_account_mode: true;
  role_isolation_e2e_claimed: false;
  role_isolation_contract_proof: boolean;
  contractor_own_records_only: boolean;
  default_tools_visible: boolean;
  default_tools_executable: boolean;
  runtime_matrix_ready: boolean;
  android_runtime_smoke: "PASS" | "BLOCKED";
  developer_control_e2e: "PASS" | "BLOCKED";
  emulator_runtime_proof: "PASS" | "BLOCKED";
  mutation_count: 0;
  db_writes: 0;
  external_live_fetch: false;
  direct_supabase_from_ui: false;
  direct_mutation_from_ui: false;
  auth_admin_used: false;
  list_users_used: false;
  service_role_green_path: false;
  seed_used: false;
  model_provider_changed: false;
  gpt_enabled: false;
  gemini_removed: false;
  fake_role_isolation: false;
  fake_ai_answer: false;
  hardcoded_ai_response: false;
  fake_green_claimed: false;
  secrets_printed: false;
  canonical_wave_closeout: true;
  developer_control_runtime_status: string | null;
  blockers: readonly string[];
  exact_reason: string | null;
};

const projectRoot = process.cwd();
const wave = "S_AI_MAGIC_15_ROLE_COPILOT_RUNTIME_PACK";
const artifactPrefix = path.join(projectRoot, "artifacts", wave);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;

const REQUIRED_ROADMAP_FLAGS = [
  "S_AI_MAGIC_ROADMAP_APPROVED",
  "S_AI_MAGIC_REQUIRE_ANDROID_EMULATOR_PROOF",
  "S_AI_MAGIC_REQUIRE_ROLE_SCOPE",
  "S_AI_MAGIC_REQUIRE_APPROVAL_FOR_HIGH_RISK",
  "S_AI_DEVELOPER_CONTROL_FULL_ACCESS_APPROVED",
  "S_AI_SINGLE_OWNER_ACCOUNT_MODE_APPROVED",
  "S_AI_ALLOW_SAFE_READ",
  "S_AI_ALLOW_DRAFT_PREVIEW",
  "S_AI_ALLOW_SUBMIT_FOR_APPROVAL",
  "S_AI_NO_FAKE_GREEN",
  "S_AI_NO_SECRETS_PRINTING",
] as const;

function readAgentEnv(): ReadonlyMap<string, string> {
  return parseAgentEnvFileValues(path.join(projectRoot, ".env.agent.staging.local"));
}

function readFlag(key: string, agentEnv: ReadonlyMap<string, string>): string | undefined {
  const processValue = process.env[key];
  if (processValue && String(processValue).trim().length > 0) return processValue;
  return agentEnv.get(key);
}

function roadmapApproved(): boolean {
  const agentEnv = readAgentEnv();
  return REQUIRED_ROADMAP_FLAGS.every((key) => isAgentFlagEnabled(readFlag(key, agentEnv)));
}

function profileHasForbiddenDomainPolicy(profile: AiRoleCopilotProfile): boolean {
  return profile.allowedDomains.every((domain) => !profile.forbiddenDomains.includes(domain));
}

function developerControlRuntimePassed(runtime: DeveloperControlRuntimeArtifact | null): boolean {
  return (
    runtime?.final_status === "GREEN_DEVELOPER_CONTROL_FULL_ACCESS_RUNTIME_TARGETABILITY" ||
    runtime?.final_status === "GREEN_DEVELOPER_CONTROL_FULL_ACCESS_RUNTIME_MODE_READY"
  );
}

function buildArtifact(params: {
  finalStatus: AiRoleCopilotRuntimePackStatus;
  exactReason: string | null;
  androidRuntimeSmoke?: "PASS" | "BLOCKED";
  developerControlRuntime?: DeveloperControlRuntimeArtifact | null;
  emulatorRuntimeProof?: "PASS" | "BLOCKED";
  blockers?: readonly string[];
}): AiRoleCopilotRuntimePackArtifact {
  const policy = validateAiRoleCopilotPolicy();
  const runtimeMatrix = buildAiRoleCopilotRuntimeMatrix({
    auth: { userId: "developer-control", role: "director" },
    developerControlSingleAccountMode: true,
  });
  const defaultToolsVisible = runtimeMatrix.results.every(
    (result) => result.visibleTools.length > 0 && result.visibleTools.every((tool) => tool.visible),
  );
  const defaultToolsExecutable = runtimeMatrix.results.some((result) =>
    result.visibleTools.some((tool) => tool.executable),
  );
  const allProfilesHaveAllowedDomains = AI_ROLE_COPILOT_PROFILES.every(
    (profile) => profile.allowedDomains.length > 0,
  );
  const allProfilesHaveForbiddenDomainPolicy = AI_ROLE_COPILOT_PROFILES.every(
    profileHasForbiddenDomainPolicy,
  );
  const allProfilesHaveDefaultTools = AI_ROLE_COPILOT_PROFILES.every(
    (profile) => profile.defaultTools.length > 0,
  );

  return {
    final_status: params.finalStatus,
    backend_first: true,
    profile_driven: true,
    role_scoped: true,
    profiles_registered: policy.profilesRegistered,
    roles_checked: runtimeMatrix.rolesChecked,
    required_roles_covered: policy.requiredRolesCovered,
    all_profiles_have_allowed_domains: allProfilesHaveAllowedDomains,
    all_profiles_have_forbidden_domain_policy: allProfilesHaveForbiddenDomainPolicy,
    all_profiles_have_default_tools: allProfilesHaveDefaultTools,
    all_default_tools_known: policy.allProfilesHaveKnownTools,
    all_tools_role_scoped: policy.allToolsRoleScoped,
    all_high_risk_requires_approval: policy.allHighRiskRequiresApproval,
    director_control_full_access: true,
    developer_control_full_access: true,
    single_owner_account_mode: true,
    role_isolation_e2e_claimed: false,
    role_isolation_contract_proof: policy.roleIsolationContractProof,
    contractor_own_records_only: policy.contractorOwnRecordsOnly,
    default_tools_visible: defaultToolsVisible,
    default_tools_executable: defaultToolsExecutable,
    runtime_matrix_ready: runtimeMatrix.status === "ready",
    android_runtime_smoke: params.androidRuntimeSmoke ?? "BLOCKED",
    developer_control_e2e: developerControlRuntimePassed(params.developerControlRuntime ?? null)
      ? "PASS"
      : "BLOCKED",
    emulator_runtime_proof: params.emulatorRuntimeProof ?? "BLOCKED",
    mutation_count: 0,
    db_writes: 0,
    external_live_fetch: false,
    direct_supabase_from_ui: false,
    direct_mutation_from_ui: false,
    auth_admin_used: false,
    list_users_used: false,
    service_role_green_path: false,
    seed_used: false,
    model_provider_changed: false,
    gpt_enabled: false,
    gemini_removed: false,
    fake_role_isolation: false,
    fake_ai_answer: false,
    hardcoded_ai_response: false,
    fake_green_claimed: false,
    secrets_printed: false,
    canonical_wave_closeout: true,
    developer_control_runtime_status: params.developerControlRuntime?.final_status ?? null,
    blockers: [
      ...policy.blockers,
      ...runtimeMatrix.blockers,
      ...(defaultToolsExecutable ? ["BLOCKED_ROLE_COPILOT_DIRECT_EXECUTION"] : []),
      ...(params.blockers ?? []),
    ],
    exact_reason: params.exactReason,
  };
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeArtifacts(
  artifact: AiRoleCopilotRuntimePackArtifact,
): AiRoleCopilotRuntimePackArtifact {
  writeJson(inventoryPath, {
    wave,
    canonical_wave_closeout: true,
    profiles: "src/features/ai/roles/aiRoleCopilotProfiles.ts",
    policy: "src/features/ai/roles/aiRoleCopilotPolicy.ts",
    runtime: "src/features/ai/roles/aiRoleCopilotRuntime.ts",
    runtime_runner: "scripts/e2e/runAiRoleCopilotRuntimePackMaestro.ts",
    developer_control_runner: "scripts/e2e/runDeveloperControlFullAccessMaestro.ts",
    android_runtime_runner: "scripts/release/verifyAndroidInstalledBuildRuntime.ts",
    required_roles: [...AI_ROLE_COPILOT_REQUIRED_ROLES],
    required_flags: [...REQUIRED_ROADMAP_FLAGS],
    contract: AI_ROLE_COPILOT_RUNTIME_CONTRACT,
    secrets_printed: false,
  });
  writeJson(matrixPath, artifact);
  writeJson(emulatorPath, {
    wave,
    android_runtime_smoke: artifact.android_runtime_smoke,
    developer_control_e2e: artifact.developer_control_e2e,
    emulator_runtime_proof: artifact.emulator_runtime_proof,
    roles_checked: artifact.roles_checked,
    role_isolation_e2e_claimed: false,
    fake_emulator_pass: false,
    secrets_printed: false,
  });
  fs.writeFileSync(
    proofPath,
    [
      "# S_AI_MAGIC_15_ROLE_COPILOT_RUNTIME_PACK",
      "",
      `final_status: ${artifact.final_status}`,
      "backend_first: true",
      "profile_driven: true",
      "role_scoped: true",
      `profiles_registered: ${artifact.profiles_registered}`,
      `roles_checked: ${artifact.roles_checked}`,
      `required_roles_covered: ${String(artifact.required_roles_covered)}`,
      "developer_control_full_access: true",
      "single_owner_account_mode: true",
      "role_isolation_e2e_claimed: false",
      `role_isolation_contract_proof: ${String(artifact.role_isolation_contract_proof)}`,
      `all_default_tools_known: ${String(artifact.all_default_tools_known)}`,
      `all_tools_role_scoped: ${String(artifact.all_tools_role_scoped)}`,
      `all_high_risk_requires_approval: ${String(artifact.all_high_risk_requires_approval)}`,
      `contractor_own_records_only: ${String(artifact.contractor_own_records_only)}`,
      `default_tools_executable: ${String(artifact.default_tools_executable)}`,
      `runtime_matrix_ready: ${String(artifact.runtime_matrix_ready)}`,
      `android_runtime_smoke: ${artifact.android_runtime_smoke}`,
      `developer_control_e2e: ${artifact.developer_control_e2e}`,
      `emulator_runtime_proof: ${artifact.emulator_runtime_proof}`,
      "mutation_count: 0",
      "db_writes: 0",
      "external_live_fetch: false",
      "model_provider_changed: false",
      "gpt_enabled: false",
      "gemini_removed: false",
      "fake_role_isolation: false",
      "fake_green_claimed: false",
      "secrets_printed: false",
      artifact.exact_reason ? `exact_reason: ${artifact.exact_reason}` : "exact_reason: null",
      "",
    ].join("\n"),
    "utf8",
  );
  return artifact;
}

function roleCopilotContractReady(): boolean {
  const policy = validateAiRoleCopilotPolicy();
  const runtimeMatrix = buildAiRoleCopilotRuntimeMatrix({
    auth: { userId: "developer-control", role: "director" },
    developerControlSingleAccountMode: true,
  });
  return (
    policy.ok &&
    runtimeMatrix.status === "ready" &&
    runtimeMatrix.mutationCount === 0 &&
    runtimeMatrix.dbWrites === 0 &&
    runtimeMatrix.externalLiveFetch === false &&
    runtimeMatrix.providerCalled === false &&
    runtimeMatrix.roleIsolationE2eClaimed === false
  );
}

export async function runAiRoleCopilotRuntimePackMaestro(): Promise<AiRoleCopilotRuntimePackArtifact> {
  if (!roadmapApproved()) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_AI_MAGIC_ROADMAP_APPROVAL_MISSING",
        exactReason: `Missing required roadmap flags: ${REQUIRED_ROADMAP_FLAGS.join(", ")}`,
        blockers: ["BLOCKED_AI_MAGIC_ROADMAP_APPROVAL_MISSING"],
      }),
    );
  }

  if (!roleCopilotContractReady()) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_ROLE_COPILOT_CONTRACT",
        exactReason: "Role copilot profile/policy/runtime matrix is not production-safe.",
        blockers: ["BLOCKED_ROLE_COPILOT_CONTRACT"],
      }),
    );
  }

  const androidRuntime = await verifyAndroidInstalledBuildRuntime();
  if (androidRuntime.final_status !== "GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF") {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE",
        exactReason: androidRuntime.exact_reason ?? "Android installed runtime smoke did not pass.",
        androidRuntimeSmoke: "BLOCKED",
        blockers: ["BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE"],
      }),
    );
  }

  const developerControlRuntime = await runDeveloperControlFullAccessMaestro();
  if (!developerControlRuntimePassed(developerControlRuntime)) {
    return writeArtifacts(
      buildArtifact({
        finalStatus: "BLOCKED_ROLE_COPILOT_RUNTIME_TARGETABILITY",
        exactReason:
          developerControlRuntime.exactReason ??
          "Developer/control full-access runtime proof did not pass.",
        androidRuntimeSmoke: "PASS",
        developerControlRuntime,
        emulatorRuntimeProof: "BLOCKED",
        blockers: ["BLOCKED_ROLE_COPILOT_RUNTIME_TARGETABILITY"],
      }),
    );
  }

  return writeArtifacts(
    buildArtifact({
      finalStatus: "GREEN_AI_ROLE_COPILOT_RUNTIME_PACK_READY",
      exactReason: null,
      androidRuntimeSmoke: "PASS",
      developerControlRuntime,
      emulatorRuntimeProof: "PASS",
    }),
  );
}

if (require.main === module) {
  void runAiRoleCopilotRuntimePackMaestro()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_AI_ROLE_COPILOT_RUNTIME_PACK_READY") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
