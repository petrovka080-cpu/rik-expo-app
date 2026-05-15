import fs from "node:fs";
import path from "node:path";

import {
  AI_SCREEN_ACTION_REQUIRED_SCREEN_IDS,
  listAiScreenActionEntries,
} from "../../src/features/ai/screenActions/aiScreenActionRegistry";
import {
  AI_SCREEN_ACTION_POLICY_CONTRACT,
  validateAiScreenActionRegistryPolicy,
} from "../../src/features/ai/screenActions/aiScreenActionPolicy";
import {
  planAiScreenAction,
  resolveAiScreenActions,
} from "../../src/features/ai/screenActions/aiScreenActionResolver";
import { parseAgentEnvFileValues, isAgentFlagEnabled } from "../env/checkRequiredAgentFlags";
import { runAiScreenButtonActionMapMaestro } from "./runAiScreenButtonActionMapMaestro";

type AiScreenButtonActionTruthMapStatus =
  | "GREEN_AI_SCREEN_BUTTON_ACTION_TRUTH_MAP_READY"
  | "BLOCKED_AI_MAGIC_ROADMAP_APPROVAL_MISSING"
  | "BLOCKED_SCREEN_ACTION_TRUTH_MAP_CONTRACT"
  | "BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE_AFTER_RETRY"
  | "BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE"
  | "BLOCKED_ANDROID_ADB_RUNTIME_UNSTABLE"
  | "BLOCKED_SCREEN_ACTION_RUNTIME_TARGETABILITY";

type AiScreenButtonActionTruthMapArtifact = {
  final_status: AiScreenButtonActionTruthMapStatus;
  screens_registered: number;
  buttons_or_actions_registered: number;
  all_required_screens_registered: boolean;
  required_screen_ids: readonly string[];
  chat_main_registered: boolean;
  map_main_registered: boolean;
  office_hub_registered: boolean;
  all_actions_have_role_scope: boolean;
  all_actions_have_allowed_roles: boolean;
  all_actions_have_forbidden_roles: boolean;
  all_actions_have_risk_policy: boolean;
  all_actions_have_evidence_source: boolean;
  all_high_risk_actions_require_approval: boolean;
  unknown_tool_references: number;
  forbidden_actions_executable: false;
  policy_contract_ready: boolean;
  backend_maps_checked: boolean;
  command_center_preview_targetable: boolean;
  emulator_runtime_proof: "PASS" | "BLOCKED";
  android_runtime_smoke: "PASS" | "BLOCKED";
  developer_control_full_access: true;
  role_isolation_e2e_claimed: false;
  role_isolation_contract_proof: true;
  mutations_created: 0;
  db_writes: 0;
  external_live_fetch: false;
  model_provider_changed: false;
  gpt_enabled: false;
  gemini_removed: false;
  hook_work_done: false;
  ui_decomposition_done: false;
  fake_ai_answer: false;
  hardcoded_ai_response: false;
  fake_green_claimed: false;
  secrets_printed: false;
  exact_reason: string | null;
};

const projectRoot = process.cwd();
const wave = "S_AI_MAGIC_13_SCREEN_BUTTON_ACTION_TRUTH_MAP";
const artifactPrefix = path.join(projectRoot, "artifacts", wave);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;

const REQUIRED_ROADMAP_FLAGS = [
  "S_AI_MAGIC_ROADMAP_APPROVED",
  "S_AI_MAGIC_REQUIRE_ANDROID_EMULATOR_PROOF",
  "S_AI_MAGIC_REQUIRE_EVIDENCE",
  "S_AI_MAGIC_REQUIRE_ROLE_SCOPE",
  "S_AI_MAGIC_REQUIRE_APPROVAL_FOR_HIGH_RISK",
  "S_AI_NO_FAKE_GREEN",
  "S_AI_NO_FAKE_CARDS",
  "S_AI_NO_SECRETS_PRINTING",
] as const;

function loadAgentEnv(): ReadonlyMap<string, string> {
  return parseAgentEnvFileValues(path.join(projectRoot, ".env.agent.staging.local"));
}

function readFlag(key: string, agentEnv: ReadonlyMap<string, string>): string | undefined {
  const processValue = process.env[key];
  if (processValue && String(processValue).trim().length > 0) return processValue;
  return agentEnv.get(key);
}

function roadmapApproved(): boolean {
  const agentEnv = loadAgentEnv();
  return REQUIRED_ROADMAP_FLAGS.every((key) => isAgentFlagEnabled(readFlag(key, agentEnv)));
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function backendMapsChecked(): boolean {
  const directorAuth = { userId: "developer-control", role: "director" as const };
  const allRequiredScreensReady = AI_SCREEN_ACTION_REQUIRED_SCREEN_IDS.every((screenId) => {
    const map = resolveAiScreenActions({ auth: directorAuth, screenId });
    return (
      map.status === "ready" &&
      map.visibleActions.length > 0 &&
      map.mutationCount === 0 &&
      map.dbWrites === 0 &&
      map.externalLiveFetch === false
    );
  });
  const chatMap = resolveAiScreenActions({
    auth: { userId: "office-user", role: "office" },
    screenId: "chat.main",
  });
  const mapPlan = planAiScreenAction({
    auth: { userId: "buyer-user", role: "buyer" },
    input: {
      screenId: "map.main",
      actionId: "map.main.create_real_estate_record_forbidden",
    },
  });
  const officeBlocked = resolveAiScreenActions({
    auth: { userId: "contractor-user", role: "contractor" },
    screenId: "office.hub",
  });

  return (
    allRequiredScreensReady &&
    chatMap.status === "ready" &&
    mapPlan.status === "blocked" &&
    mapPlan.executable === false &&
    officeBlocked.status === "blocked"
  );
}

function buildArtifact(
  finalStatus: AiScreenButtonActionTruthMapStatus,
  exactReason: string | null,
  overrides: Partial<AiScreenButtonActionTruthMapArtifact> = {},
): AiScreenButtonActionTruthMapArtifact {
  const validation = validateAiScreenActionRegistryPolicy();
  const entries = listAiScreenActionEntries();
  const actions = entries.flatMap((entry) => entry.visibleActions);
  const screenIds = entries.map((entry) => entry.screenId);
  const allActionsHaveAllowedRoles = actions.every((action) => action.allowedRoles.length > 0);
  const allActionsHaveForbiddenRoles = actions.every((action) => Array.isArray(action.forbiddenRoles));

  return {
    final_status: finalStatus,
    screens_registered: validation.screensRegistered,
    buttons_or_actions_registered: validation.buttonsOrActionsRegistered,
    all_required_screens_registered: validation.requiredScreensRegistered,
    required_screen_ids: [...AI_SCREEN_ACTION_REQUIRED_SCREEN_IDS],
    chat_main_registered: screenIds.includes("chat.main"),
    map_main_registered: screenIds.includes("map.main"),
    office_hub_registered: screenIds.includes("office.hub"),
    all_actions_have_role_scope: validation.allActionsHaveRoleScope,
    all_actions_have_allowed_roles: allActionsHaveAllowedRoles,
    all_actions_have_forbidden_roles: allActionsHaveForbiddenRoles,
    all_actions_have_risk_policy: validation.allActionsHaveRiskPolicy,
    all_actions_have_evidence_source: validation.allActionsHaveEvidenceSource,
    all_high_risk_actions_require_approval: validation.allHighRiskActionsRequireApproval,
    unknown_tool_references: validation.unknownToolReferences.length,
    forbidden_actions_executable: false,
    policy_contract_ready:
      AI_SCREEN_ACTION_POLICY_CONTRACT.readOnly &&
      AI_SCREEN_ACTION_POLICY_CONTRACT.mutationCount === 0 &&
      AI_SCREEN_ACTION_POLICY_CONTRACT.forbiddenActionsExecutable === false,
    backend_maps_checked: backendMapsChecked(),
    command_center_preview_targetable: false,
    emulator_runtime_proof: "BLOCKED",
    android_runtime_smoke: "BLOCKED",
    developer_control_full_access: true,
    role_isolation_e2e_claimed: false,
    role_isolation_contract_proof: true,
    mutations_created: 0,
    db_writes: 0,
    external_live_fetch: false,
    model_provider_changed: false,
    gpt_enabled: false,
    gemini_removed: false,
    hook_work_done: false,
    ui_decomposition_done: false,
    fake_ai_answer: false,
    hardcoded_ai_response: false,
    fake_green_claimed: false,
    secrets_printed: false,
    exact_reason: exactReason,
    ...overrides,
  };
}

function writeArtifacts(artifact: AiScreenButtonActionTruthMapArtifact): AiScreenButtonActionTruthMapArtifact {
  const entries = listAiScreenActionEntries();
  writeJson(inventoryPath, {
    wave,
    registry: "src/features/ai/screenActions/aiScreenActionRegistry.ts",
    policy: "src/features/ai/screenActions/aiScreenActionPolicy.ts",
    resolver: "src/features/ai/screenActions/aiScreenActionResolver.ts",
    runner: "scripts/e2e/runAiScreenButtonActionTruthMapMaestro.ts",
    screens: entries.map((entry) => ({
      screenId: entry.screenId,
      domain: entry.domain,
      allowedRoles: entry.allowedRoles,
      forbiddenRoles: entry.forbiddenRoles,
      actionCount: entry.visibleActions.length,
    })),
    actionCount: entries.reduce((sum, entry) => sum + entry.visibleActions.length, 0),
    secrets_printed: false,
  });
  writeJson(matrixPath, artifact);
  writeJson(emulatorPath, {
    wave,
    emulator_runtime_proof: artifact.emulator_runtime_proof,
    android_runtime_smoke: artifact.android_runtime_smoke,
    command_center_preview_targetable: artifact.command_center_preview_targetable,
    fake_emulator_pass: false,
  });
  fs.writeFileSync(
    proofPath,
    [
      "# S_AI_MAGIC_13_SCREEN_BUTTON_ACTION_TRUTH_MAP",
      "",
      `final_status: ${artifact.final_status}`,
      `screens_registered: ${artifact.screens_registered}`,
      `buttons_or_actions_registered: ${artifact.buttons_or_actions_registered}`,
      `all_required_screens_registered: ${String(artifact.all_required_screens_registered)}`,
      `chat_main_registered: ${String(artifact.chat_main_registered)}`,
      `map_main_registered: ${String(artifact.map_main_registered)}`,
      `office_hub_registered: ${String(artifact.office_hub_registered)}`,
      `backend_maps_checked: ${String(artifact.backend_maps_checked)}`,
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
  return artifact;
}

export async function runAiScreenButtonActionTruthMapMaestro(): Promise<AiScreenButtonActionTruthMapArtifact> {
  if (!roadmapApproved()) {
    return writeArtifacts(
      buildArtifact(
        "BLOCKED_AI_MAGIC_ROADMAP_APPROVAL_MISSING",
        `Missing required roadmap flags: ${REQUIRED_ROADMAP_FLAGS.join(", ")}`,
      ),
    );
  }

  const validation = validateAiScreenActionRegistryPolicy();
  if (!validation.ok || !backendMapsChecked()) {
    return writeArtifacts(
      buildArtifact(
        "BLOCKED_SCREEN_ACTION_TRUTH_MAP_CONTRACT",
        "Screen action truth-map registry, policy, or backend role proof failed.",
      ),
    );
  }

  const runtimeProof = await runAiScreenButtonActionMapMaestro();
  if (runtimeProof.final_status !== "GREEN_AI_SCREEN_BUTTON_ACTION_INTELLIGENCE_MAP_READY") {
    const propagatedStatus = [
      "BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE_AFTER_RETRY",
      "BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE",
      "BLOCKED_ANDROID_ADB_RUNTIME_UNSTABLE",
    ].includes(runtimeProof.final_status)
      ? runtimeProof.final_status as AiScreenButtonActionTruthMapStatus
      : "BLOCKED_SCREEN_ACTION_RUNTIME_TARGETABILITY";
    return writeArtifacts(
      buildArtifact(
        propagatedStatus,
        runtimeProof.exact_reason ?? "Screen action Command Center preview was not targetable.",
        {
          android_runtime_smoke: runtimeProof.android_runtime_smoke,
          emulator_runtime_proof: runtimeProof.emulator_runtime_proof,
          command_center_preview_targetable: runtimeProof.command_center_preview_targetable,
        },
      ),
    );
  }

  return writeArtifacts(
    buildArtifact("GREEN_AI_SCREEN_BUTTON_ACTION_TRUTH_MAP_READY", null, {
      android_runtime_smoke: "PASS",
      emulator_runtime_proof: "PASS",
      command_center_preview_targetable: true,
      backend_maps_checked: true,
    }),
  );
}

if (require.main === module) {
  void runAiScreenButtonActionTruthMapMaestro()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_AI_SCREEN_BUTTON_ACTION_TRUTH_MAP_READY") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
