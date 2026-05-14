import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { ensureAndroidEmulatorReady } from "./ensureAndroidEmulatorReady";
import { collectExplicitE2eSecrets, redactE2eSecrets } from "./redactE2eSecrets";
import {
  resolveExplicitAiRoleAuthEnv,
  type E2ERoleMode,
  type ExplicitAiRoleAuthSource,
} from "./resolveExplicitAiRoleAuthEnv";
import { verifyAndroidInstalledBuildRuntime } from "../release/verifyAndroidInstalledBuildRuntime";
import { isAgentFlagEnabled, parseAgentEnvFileValues } from "../env/checkRequiredAgentFlags";
import {
  AI_SCREEN_ACTION_REQUIRED_SCREEN_IDS,
  listAiScreenActionEntries,
} from "../../src/features/ai/screenActions/aiScreenActionRegistry";
import {
  planAiScreenAction,
  resolveAiScreenActions,
  validateAiScreenActionRegistry,
} from "../../src/features/ai/screenActions/aiScreenActionResolver";

type AiScreenButtonActionMapStatus =
  | "GREEN_AI_SCREEN_BUTTON_ACTION_INTELLIGENCE_MAP_READY"
  | "BLOCKED_SCREEN_ACTION_MAP_E2E_APPROVAL_MISSING"
  | "BLOCKED_SCREEN_ACTION_REGISTRY_CONTRACT"
  | "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE"
  | "BLOCKED_SCREEN_ACTION_RUNTIME_TARGETABILITY";

type AiScreenButtonActionMapArtifact = {
  final_status: AiScreenButtonActionMapStatus;
  framework: "maestro";
  device: "android";
  screens_registered: number;
  buttons_or_actions_registered: number;
  all_actions_have_role_scope: boolean;
  all_actions_have_risk_policy: boolean;
  all_actions_have_evidence_source: boolean;
  all_high_risk_actions_require_approval: boolean;
  unknown_tool_references: number;
  forbidden_actions_executable: false;
  developer_control_full_access: true;
  role_isolation_e2e_claimed: false;
  role_isolation_contract_proof: true;
  emulator_runtime_proof: "PASS" | "BLOCKED";
  android_runtime_smoke: "PASS" | "BLOCKED";
  command_center_preview_targetable: boolean;
  required_screen_backend_maps_checked: boolean;
  safe_read_actions_visible: boolean;
  draft_actions_visible: boolean;
  approval_required_visible: boolean;
  mutations_created: 0;
  db_writes: 0;
  external_live_fetch: false;
  model_provider_changed: false;
  gpt_enabled: false;
  gemini_removed: false;
  hook_work_done: false;
  ui_decomposition_done: false;
  fake_ai_answer: false;
  fake_green_claimed: false;
  secrets_printed: false;
  e2e_role_mode: E2ERoleMode;
  auth_source: ExplicitAiRoleAuthSource;
  full_access_runtime_claimed: boolean;
  exact_reason: string | null;
};

const projectRoot = process.cwd();
const appId = "com.azisbek_dzhantaev.rikexpoapp";
const wave = "S_AI_MAGIC_10_SCREEN_BUTTON_ACTION_INTELLIGENCE_MAP";
const artifactPrefix = path.join(projectRoot, "artifacts", wave);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;
const maestroBinary =
  process.env.MAESTRO_CLI_PATH ??
  path.join(
    process.env.LOCALAPPDATA ?? "",
    "maestro-cli",
    "maestro",
    "bin",
    process.platform === "win32" ? "maestro.bat" : "maestro",
  );

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function readFlag(key: string): string | undefined {
  if (process.env[key] && String(process.env[key]).trim()) return process.env[key];
  const agentEnv = parseAgentEnvFileValues(path.join(projectRoot, ".env.agent.staging.local"));
  return agentEnv.get(key);
}

function e2eApproved(): boolean {
  return (
    isAgentFlagEnabled(readFlag("S_AI_SCREEN_ACTION_MAP_E2E_APPROVED")) &&
    isAgentFlagEnabled(readFlag("S_AI_SCREEN_ACTION_MAP_ALLOW_RUNTIME_PROOF"))
  );
}

function sourceReady(): boolean {
  const registrySource = readProjectFile("src/features/ai/screenActions/aiScreenActionRegistry.ts");
  const resolverSource = readProjectFile("src/features/ai/screenActions/aiScreenActionResolver.ts");
  const routeSource = readProjectFile("src/features/ai/agent/agentScreenActionRoutes.ts");
  const shellSource = readProjectFile("src/features/ai/agent/agentBffRouteShell.ts");
  const commandCenterSource = readProjectFile("src/features/ai/commandCenter/AiCommandCenterScreen.tsx");
  return (
    AI_SCREEN_ACTION_REQUIRED_SCREEN_IDS.every((screenId) => registrySource.includes(screenId)) &&
    resolverSource.includes("validateAiScreenActionRegistry") &&
    routeSource.includes("GET /agent/screen-actions/:screenId") &&
    routeSource.includes("POST /agent/screen-actions/:screenId/intent-preview") &&
    routeSource.includes("POST /agent/screen-actions/:screenId/action-plan") &&
    shellSource.includes("agent.screen_actions.read") &&
    commandCenterSource.includes("ai.screen.actions.preview") &&
    commandCenterSource.includes("ai.screen.actions.safe_read") &&
    commandCenterSource.includes("ai.screen.actions.draft") &&
    commandCenterSource.includes("ai.screen.actions.approval_required")
  );
}

function backendMapsChecked(): boolean {
  const directorAuth = { userId: "developer-control", role: "director" as const };
  const allRequiredScreensReady = AI_SCREEN_ACTION_REQUIRED_SCREEN_IDS.every((screenId) => {
    const map = resolveAiScreenActions({ auth: directorAuth, screenId });
    return (
      map.status === "ready" &&
      map.mutationCount === 0 &&
      map.dbWrites === 0 &&
      map.externalLiveFetch === false &&
      map.visibleActions.length > 0
    );
  });
  const buyerMap = resolveAiScreenActions({
    auth: { userId: "buyer-e2e", role: "buyer" },
    screenId: "buyer.requests",
  });
  const contractorBlocked = resolveAiScreenActions({
    auth: { userId: "contractor-e2e", role: "contractor" },
    screenId: "accountant.main",
  });
  const forbiddenPlan = planAiScreenAction({
    auth: { userId: "buyer-e2e", role: "buyer" },
    input: {
      screenId: "buyer.requests",
      actionId: "buyer.requests.create_order_forbidden",
    },
  });

  return (
    allRequiredScreensReady &&
    buyerMap.status === "ready" &&
    contractorBlocked.status === "blocked" &&
    forbiddenPlan.status === "blocked" &&
    forbiddenPlan.executable === false
  );
}

function buildArtifact(
  finalStatus: AiScreenButtonActionMapStatus,
  exactReason: string | null,
  overrides: Partial<AiScreenButtonActionMapArtifact> = {},
): AiScreenButtonActionMapArtifact {
  const validation = validateAiScreenActionRegistry();
  const auth = resolveExplicitAiRoleAuthEnv();
  return {
    final_status: finalStatus,
    framework: "maestro",
    device: "android",
    screens_registered: validation.screensRegistered,
    buttons_or_actions_registered: validation.buttonsOrActionsRegistered,
    all_actions_have_role_scope: validation.allActionsHaveRoleScope,
    all_actions_have_risk_policy: validation.allActionsHaveRiskPolicy,
    all_actions_have_evidence_source: validation.allActionsHaveEvidenceSource,
    all_high_risk_actions_require_approval: validation.allHighRiskActionsRequireApproval,
    unknown_tool_references: validation.unknownToolReferences.length,
    forbidden_actions_executable: false,
    developer_control_full_access: true,
    role_isolation_e2e_claimed: false,
    role_isolation_contract_proof: true,
    emulator_runtime_proof: "BLOCKED",
    android_runtime_smoke: "BLOCKED",
    command_center_preview_targetable: false,
    required_screen_backend_maps_checked: backendMapsChecked(),
    safe_read_actions_visible: false,
    draft_actions_visible: false,
    approval_required_visible: false,
    mutations_created: 0,
    db_writes: 0,
    external_live_fetch: false,
    model_provider_changed: false,
    gpt_enabled: false,
    gemini_removed: false,
    hook_work_done: false,
    ui_decomposition_done: false,
    fake_ai_answer: false,
    fake_green_claimed: false,
    secrets_printed: false,
    e2e_role_mode: auth.roleMode,
    auth_source: auth.auth_source,
    full_access_runtime_claimed: auth.full_access_runtime_claimed,
    exact_reason: exactReason,
    ...overrides,
  };
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeProof(artifact: AiScreenButtonActionMapArtifact): void {
  fs.writeFileSync(
    proofPath,
    [
      "# S_AI_MAGIC_10_SCREEN_BUTTON_ACTION_INTELLIGENCE_MAP",
      "",
      `final_status: ${artifact.final_status}`,
      `screens_registered: ${artifact.screens_registered}`,
      `buttons_or_actions_registered: ${artifact.buttons_or_actions_registered}`,
      `developer_control_full_access: ${String(artifact.developer_control_full_access)}`,
      "role_isolation_e2e_claimed: false",
      `role_isolation_contract_proof: ${String(artifact.role_isolation_contract_proof)}`,
      `required_screen_backend_maps_checked: ${String(artifact.required_screen_backend_maps_checked)}`,
      `emulator_runtime_proof: ${artifact.emulator_runtime_proof}`,
      `android_runtime_smoke: ${artifact.android_runtime_smoke}`,
      "mutations_created: 0",
      "db_writes: 0",
      "external_live_fetch: false",
      "model_provider_changed: false",
      "gpt_enabled: false",
      "gemini_removed: false",
      "hook_work_done: false",
      "ui_decomposition_done: false",
      "fake_ai_answer: false",
      "fake_green_claimed: false",
      "secrets_printed: false",
      artifact.exact_reason ? `exact_reason: ${artifact.exact_reason}` : "exact_reason: null",
      "",
    ].join("\n"),
    "utf8",
  );
}

function writeArtifacts(artifact: AiScreenButtonActionMapArtifact): AiScreenButtonActionMapArtifact {
  const entries = listAiScreenActionEntries();
  writeJson(inventoryPath, {
    wave,
    registry: "src/features/ai/screenActions/aiScreenActionRegistry.ts",
    resolver: "src/features/ai/screenActions/aiScreenActionResolver.ts",
    bff_routes: "src/features/ai/agent/agentScreenActionRoutes.ts",
    bff_contracts: "src/features/ai/agent/agentScreenActionContracts.ts",
    command_center_surface: "src/features/ai/commandCenter/AiCommandCenterScreen.tsx",
    screens: entries.map((entry) => entry.screenId),
    actions: entries.flatMap((entry) =>
      entry.visibleActions.map((action) => ({
        screenId: entry.screenId,
        actionId: action.actionId,
        mode: action.mode,
        riskLevel: action.riskLevel,
        aiTool: action.aiTool ?? null,
      })),
    ),
    secrets_printed: false,
  });
  writeJson(matrixPath, artifact);
  writeJson(emulatorPath, artifact);
  writeProof(artifact);
  return artifact;
}

function runCommand(
  command: string,
  args: readonly string[],
  env: Record<string, string>,
  secrets: readonly string[],
): string {
  const result = spawnSync(command, [...args], {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: "pipe",
    shell: process.platform === "win32" && /\.(bat|cmd)$/i.test(command),
    timeout: 120_000,
    killSignal: "SIGTERM",
    env: {
      ...process.env,
      ...env,
      MAESTRO_CLI_NO_ANALYTICS: "1",
      MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: "true",
    },
  });
  const stdout = redactE2eSecrets(result.stdout ?? "", secrets);
  const stderr = redactE2eSecrets(result.stderr ?? "", secrets);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}\n${stdout}\n${stderr}`.trim());
  }
  return stdout.trim();
}

function flowLines(): string[] {
  return [
    `appId: ${appId}`,
    "name: AI Screen Button Action Intelligence Map",
    "---",
    "- launchApp:",
    "    clearState: false",
    "- runFlow:",
    "    when:",
    "      visible:",
    '        id: "auth.login.screen"',
    "    commands:",
    "      - extendedWaitUntil:",
    "          visible:",
    '            id: "auth.login.email"',
    "          timeout: 15000",
    "      - tapOn:",
    '          id: "auth.login.email"',
    "      - inputText: ${MAESTRO_E2E_DIRECTOR_EMAIL}",
    "      - tapOn:",
    '          id: "auth.login.password"',
    "      - inputText: ${MAESTRO_E2E_DIRECTOR_PASSWORD}",
    "      - hideKeyboard",
    "      - tapOn:",
    '          id: "auth.login.submit"',
    "      - extendedWaitUntil:",
    "          visible:",
    '            id: "profile-edit-open"',
    "          timeout: 30000",
    "- stopApp",
    '- openLink: "rik://ai-command-center"',
    "- extendedWaitUntil:",
    "    visible:",
    '      id: "ai.command.center.screen"',
    "    timeout: 30000",
    "- scrollUntilVisible:",
    "    element:",
    '      id: "ai.screen.actions.preview"',
    "    direction: DOWN",
    "    timeout: 15000",
    "    visibilityPercentage: 20",
    "    centerElement: true",
    "- assertVisible:",
    '    id: "ai.screen.actions.role"',
    "- assertVisible:",
    '    id: "ai.screen.actions.safe_read"',
    "- assertVisible:",
    '    id: "ai.screen.actions.draft"',
    "- assertVisible:",
    '    id: "ai.screen.actions.approval_required"',
    "",
  ];
}

function createFlowFile(): string {
  const flowPath = path.join(os.tmpdir(), `rik-ai-screen-action-map-${process.pid}-${Date.now()}.yaml`);
  fs.writeFileSync(flowPath, flowLines().join("\n"), "utf8");
  return flowPath;
}

export async function runAiScreenButtonActionMapMaestro(): Promise<AiScreenButtonActionMapArtifact> {
  const validation = validateAiScreenActionRegistry();
  if (!sourceReady() || !validation.ok || !backendMapsChecked()) {
    return writeArtifacts(
      buildArtifact(
        "BLOCKED_SCREEN_ACTION_REGISTRY_CONTRACT",
        "AI screen action source, registry validation, or backend map proof is not ready.",
      ),
    );
  }

  if (!e2eApproved()) {
    return writeArtifacts(
      buildArtifact(
        "BLOCKED_SCREEN_ACTION_MAP_E2E_APPROVAL_MISSING",
        "S_AI_SCREEN_ACTION_MAP_E2E_APPROVED and S_AI_SCREEN_ACTION_MAP_ALLOW_RUNTIME_PROOF are required.",
      ),
    );
  }

  const roleAuth = resolveExplicitAiRoleAuthEnv();
  if (
    roleAuth.roleMode !== "developer_control_full_access" ||
    roleAuth.source !== "developer_control_explicit_env" ||
    !roleAuth.greenEligible ||
    !roleAuth.env
  ) {
    return writeArtifacts(
      buildArtifact(
        "BLOCKED_SCREEN_ACTION_RUNTIME_TARGETABILITY",
        roleAuth.exactReason ?? "Developer/control full-access E2E auth is required.",
      ),
    );
  }

  const androidRuntime = await verifyAndroidInstalledBuildRuntime();
  if (androidRuntime.final_status !== "GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF") {
    return writeArtifacts(
      buildArtifact(
        "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE",
        androidRuntime.exact_reason ?? "Android installed runtime smoke did not pass.",
      ),
    );
  }

  const emulator = await ensureAndroidEmulatorReady({ projectRoot });
  if (emulator.final_status !== "GREEN_ANDROID_EMULATOR_READY" || !emulator.deviceId) {
    return writeArtifacts(
      buildArtifact(
        "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE",
        emulator.blockedReason ?? "Android emulator/device was not ready.",
        { android_runtime_smoke: "PASS" },
      ),
    );
  }

  if (!fs.existsSync(maestroBinary)) {
    return writeArtifacts(
      buildArtifact("BLOCKED_SCREEN_ACTION_RUNTIME_TARGETABILITY", "Maestro CLI is not available.", {
        android_runtime_smoke: "PASS",
        emulator_runtime_proof: "BLOCKED",
      }),
    );
  }

  const secrets = collectExplicitE2eSecrets({ ...process.env, ...roleAuth.env });
  const flowPath = createFlowFile();
  try {
    runCommand(
      maestroBinary,
      ["--device", emulator.deviceId, "test", flowPath],
      {
        MAESTRO_E2E_DIRECTOR_EMAIL: roleAuth.env.E2E_DIRECTOR_EMAIL,
        MAESTRO_E2E_DIRECTOR_PASSWORD: roleAuth.env.E2E_DIRECTOR_PASSWORD,
      },
      secrets,
    );
  } catch {
    return writeArtifacts(
      buildArtifact(
        "BLOCKED_SCREEN_ACTION_RUNTIME_TARGETABILITY",
        "AI screen action preview testIDs are not targetable in Android hierarchy.",
        {
          android_runtime_smoke: "PASS",
          emulator_runtime_proof: "BLOCKED",
        },
      ),
    );
  } finally {
    fs.rmSync(flowPath, { force: true });
  }

  return writeArtifacts(
    buildArtifact("GREEN_AI_SCREEN_BUTTON_ACTION_INTELLIGENCE_MAP_READY", null, {
      emulator_runtime_proof: "PASS",
      android_runtime_smoke: "PASS",
      command_center_preview_targetable: true,
      required_screen_backend_maps_checked: true,
      safe_read_actions_visible: true,
      draft_actions_visible: true,
      approval_required_visible: true,
    }),
  );
}

if (require.main === module) {
  void runAiScreenButtonActionMapMaestro()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_AI_SCREEN_BUTTON_ACTION_INTELLIGENCE_MAP_READY") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
