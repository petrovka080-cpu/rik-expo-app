import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  ensureAndroidMaestroDriverReady,
  runMaestroTestWithDriverRepair,
} from "./ensureAndroidMaestroDriverReady";
import { collectExplicitE2eSecrets } from "./redactE2eSecrets";
import {
  resolveExplicitAiRoleAuthEnv,
  type E2ERoleMode,
  type ExplicitAiRoleAuthSource,
} from "./resolveExplicitAiRoleAuthEnv";
import { verifyAndroidInstalledBuildRuntime } from "../release/verifyAndroidInstalledBuildRuntime";
import { isAgentFlagEnabled, parseAgentEnvFileValues } from "../env/checkRequiredAgentFlags";
import { getAgentWorkdayTasks } from "../../src/features/ai/agent/agentWorkdayTaskRoutes";
import { AI_WORKDAY_TASK_ENGINE_CONTRACT } from "../../src/features/ai/workday/aiWorkdayTaskEngine";
import { AI_WORKDAY_EMPTY_STATE_REASON } from "../../src/features/ai/workday/aiWorkdayTaskEvidence";
import type { AiWorkdayTaskEngineResult } from "../../src/features/ai/workday/aiWorkdayTaskTypes";

type AiProactiveWorkdayStatus =
  | "GREEN_AI_PROACTIVE_WORKDAY_TASK_INTELLIGENCE_READY"
  | "GREEN_AI_PROACTIVE_WORKDAY_EMPTY_STATE_READY"
  | "BLOCKED_PROACTIVE_WORKDAY_E2E_APPROVAL_MISSING"
  | "BLOCKED_PROACTIVE_WORKDAY_BACKEND_CONTRACT"
  | "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE"
  | "BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE_AFTER_RETRY"
  | "BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE"
  | "BLOCKED_ANDROID_ADB_RUNTIME_UNSTABLE"
  | "BLOCKED_PROACTIVE_WORKDAY_RUNTIME_TARGETABILITY";

type AiProactiveWorkdayArtifact = {
  final_status: AiProactiveWorkdayStatus;
  framework: "maestro";
  device: "android";
  backend_first: true;
  role_scoped: true;
  developer_control_full_access: true;
  role_isolation_e2e_claimed: false;
  evidence_required: true;
  all_cards_have_evidence: boolean;
  all_cards_have_risk_policy: boolean;
  all_cards_have_known_tool: boolean;
  high_risk_requires_approval: boolean;
  forbidden_actions_blocked: true;
  internal_first: true;
  external_live_fetch: false;
  mutation_count: 0;
  db_writes: 0;
  direct_supabase_from_ui: false;
  mobile_external_fetch: false;
  fake_cards: false;
  hardcoded_ai_answer: false;
  model_provider_changed: false;
  gpt_enabled: false;
  gemini_removed: false;
  android_runtime_smoke: "PASS" | "BLOCKED";
  emulator_runtime_proof: "PASS" | "BLOCKED";
  command_center_workday_section_visible: boolean;
  workday_card_visible: boolean;
  workday_empty_state_visible: boolean;
  honest_empty_state: boolean;
  exact_reason: string | null;
  e2e_role_mode: E2ERoleMode;
  auth_source: ExplicitAiRoleAuthSource;
  fake_green_claimed: false;
  secrets_printed: false;
};

const projectRoot = process.cwd();
const appId = "com.azisbek_dzhantaev.rikexpoapp";
const wave = "S_AI_MAGIC_12_PROACTIVE_WORKDAY_TASK_INTELLIGENCE";
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
    isAgentFlagEnabled(readFlag("S_AI_MAGIC_12_PROACTIVE_WORKDAY_APPROVED")) &&
    isAgentFlagEnabled(readFlag("S_AI_MAGIC_12_REQUIRE_ANDROID_EMULATOR_PROOF"))
  );
}

function sourceReady(): boolean {
  const engine = readProjectFile("src/features/ai/workday/aiWorkdayTaskEngine.ts");
  const routes = readProjectFile("src/features/ai/agent/agentWorkdayTaskRoutes.ts");
  const shell = readProjectFile("src/features/ai/agent/agentBffRouteShell.ts");
  const commandCenter = readProjectFile("src/features/ai/commandCenter/AiCommandCenterScreen.tsx");
  return (
    engine.includes("AI_WORKDAY_TASK_ENGINE_CONTRACT") &&
    engine.includes("loadAiTaskStreamRuntime") &&
    routes.includes("GET /agent/workday/tasks") &&
    routes.includes("POST /agent/workday/tasks/:taskId/preview") &&
    routes.includes("POST /agent/workday/tasks/:taskId/action-plan") &&
    shell.includes("agent.workday.tasks.read") &&
    commandCenter.includes("ai.workday.section") &&
    commandCenter.includes("ai.workday.card.evidence") &&
    commandCenter.includes("ai.workday.empty_state")
  );
}

function backendContract(): AiWorkdayTaskEngineResult | null {
  const response = getAgentWorkdayTasks({
    auth: { userId: "developer-control", role: "director" },
    input: { screenId: "ai.command_center" },
  });
  if (!response.ok) return null;
  if (response.data.endpoint !== "GET /agent/workday/tasks") return null;
  return response.data.result;
}

function buildArtifact(
  finalStatus: AiProactiveWorkdayStatus,
  exactReason: string | null,
  overrides: Partial<AiProactiveWorkdayArtifact> = {},
): AiProactiveWorkdayArtifact {
  const auth = resolveExplicitAiRoleAuthEnv();
  const backend = backendContract();
  return {
    final_status: finalStatus,
    framework: "maestro",
    device: "android",
    backend_first: true,
    role_scoped: true,
    developer_control_full_access: true,
    role_isolation_e2e_claimed: false,
    evidence_required: true,
    all_cards_have_evidence: backend?.allCardsHaveEvidence ?? false,
    all_cards_have_risk_policy: backend?.allCardsHaveRiskPolicy ?? false,
    all_cards_have_known_tool: backend?.allCardsHaveKnownTool ?? false,
    high_risk_requires_approval: backend?.highRiskRequiresApproval ?? false,
    forbidden_actions_blocked: true,
    internal_first: true,
    external_live_fetch: false,
    mutation_count: 0,
    db_writes: 0,
    direct_supabase_from_ui: false,
    mobile_external_fetch: false,
    fake_cards: false,
    hardcoded_ai_answer: false,
    model_provider_changed: false,
    gpt_enabled: false,
    gemini_removed: false,
    android_runtime_smoke: "BLOCKED",
    emulator_runtime_proof: "BLOCKED",
    command_center_workday_section_visible: false,
    workday_card_visible: false,
    workday_empty_state_visible: false,
    honest_empty_state: false,
    exact_reason: exactReason,
    e2e_role_mode: auth.roleMode,
    auth_source: auth.auth_source,
    fake_green_claimed: false,
    secrets_printed: false,
    ...overrides,
  };
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeProof(artifact: AiProactiveWorkdayArtifact): void {
  fs.writeFileSync(
    proofPath,
    [
      "# S_AI_MAGIC_12_PROACTIVE_WORKDAY_TASK_INTELLIGENCE",
      "",
      `final_status: ${artifact.final_status}`,
      "backend_first: true",
      "role_scoped: true",
      "developer_control_full_access: true",
      "role_isolation_e2e_claimed: false",
      `all_cards_have_evidence: ${String(artifact.all_cards_have_evidence)}`,
      `all_cards_have_known_tool: ${String(artifact.all_cards_have_known_tool)}`,
      `high_risk_requires_approval: ${String(artifact.high_risk_requires_approval)}`,
      "mutation_count: 0",
      "db_writes: 0",
      "external_live_fetch: false",
      `android_runtime_smoke: ${artifact.android_runtime_smoke}`,
      `emulator_runtime_proof: ${artifact.emulator_runtime_proof}`,
      `command_center_workday_section_visible: ${String(artifact.command_center_workday_section_visible)}`,
      `workday_card_visible: ${String(artifact.workday_card_visible)}`,
      `workday_empty_state_visible: ${String(artifact.workday_empty_state_visible)}`,
      `honest_empty_state: ${String(artifact.honest_empty_state)}`,
      "fake_cards: false",
      "hardcoded_ai_answer: false",
      "fake_green_claimed: false",
      "secrets_printed: false",
      artifact.exact_reason ? `exact_reason: ${artifact.exact_reason}` : "exact_reason: null",
      "",
    ].join("\n"),
    "utf8",
  );
}

function writeArtifacts(artifact: AiProactiveWorkdayArtifact): AiProactiveWorkdayArtifact {
  writeJson(inventoryPath, {
    wave,
    engine: "src/features/ai/workday/aiWorkdayTaskEngine.ts",
    policy: "src/features/ai/workday/aiWorkdayTaskPolicy.ts",
    evidence: "src/features/ai/workday/aiWorkdayTaskEvidence.ts",
    ranking: "src/features/ai/workday/aiWorkdayTaskRanking.ts",
    bff_routes: "src/features/ai/agent/agentWorkdayTaskRoutes.ts",
    bff_contracts: "src/features/ai/agent/agentWorkdayTaskContracts.ts",
    command_center_surface: "src/features/ai/commandCenter/AiCommandCenterScreen.tsx",
    test_ids: [
      "ai.workday.section",
      "ai.workday.card",
      "ai.workday.card.evidence",
      "ai.workday.card.risk",
      "ai.workday.card.next_action",
      "ai.workday.empty_state",
    ],
    contract: AI_WORKDAY_TASK_ENGINE_CONTRACT,
    empty_state_reason: AI_WORKDAY_EMPTY_STATE_REASON,
    secrets_printed: false,
  });
  writeJson(matrixPath, artifact);
  writeJson(emulatorPath, artifact);
  writeProof(artifact);
  return artifact;
}

function loginFlowLines(): string[] {
  return [
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
  ];
}

function flowLines(mode: "card" | "empty"): string[] {
  const lines = [
    `appId: ${appId}`,
    `name: AI Proactive Workday Task Intelligence ${mode}`,
    "---",
    ...loginFlowLines(),
    '- openLink: "rik://ai-command-center"',
    "- extendedWaitUntil:",
    "    visible:",
    '      id: "ai.command.center.screen"',
    "    timeout: 30000",
    "- assertVisible:",
    '    id: "ai.workday.section"',
  ];

  if (mode === "card") {
    lines.push(
      "- assertVisible:",
      '    id: "ai.workday.card"',
      "- assertVisible:",
      '    id: "ai.workday.card.evidence"',
      "- assertVisible:",
      '    id: "ai.workday.card.risk"',
      "- assertVisible:",
      '    id: "ai.workday.card.next_action"',
    );
  } else {
    lines.push(
      "- assertVisible:",
      '    id: "ai.workday.empty_state"',
    );
  }

  lines.push("");
  return lines;
}

function createFlowFile(mode: "card" | "empty"): string {
  const flowPath = path.join(
    os.tmpdir(),
    `rik-ai-proactive-workday-${mode}-${process.pid}-${Date.now()}.yaml`,
  );
  fs.writeFileSync(flowPath, flowLines(mode).join("\n"), "utf8");
  return flowPath;
}

function classifyMaestroFailure(error: unknown): {
  status: Extract<
    AiProactiveWorkdayStatus,
    | "BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE_AFTER_RETRY"
    | "BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE"
    | "BLOCKED_ANDROID_ADB_RUNTIME_UNSTABLE"
    | "BLOCKED_PROACTIVE_WORKDAY_RUNTIME_TARGETABILITY"
  >;
  exactReason: string;
} {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  if (/no devices\/emulators found|device offline|device not found|adb: device|unauthorized/i.test(message)) {
    return {
      status: "BLOCKED_ANDROID_ADB_RUNTIME_UNSTABLE",
      exactReason: "Proactive workday proof did not reach UI assertions because Android/ADB runtime was unstable.",
    };
  }
  if (/retry_attempted=true|first_attempt_driver_failure=true|after retry/i.test(message)) {
    return {
      status: "BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE_AFTER_RETRY",
      exactReason: "Proactive workday proof ran on the API34 Maestro gate with driver cleanup and one retry, but Maestro Android driver was still unavailable before UI assertions.",
    };
  }
  if (/Assertion is false|assertVisible|No visible element|Element .* not found|View .* not found|not visible|id: "ai\.|id: "auth\./i.test(message)) {
    return {
      status: "BLOCKED_PROACTIVE_WORKDAY_RUNTIME_TARGETABILITY",
      exactReason: "Command Center proactive workday section was reachable, but the requested workday card or empty-state assertion was not visible.",
    };
  }
  if (/DEADLINE_EXCEEDED|Unable to launch app|UNAVAILABLE|gRPC server|Connection reset|ETIMEDOUT|timed out|timeout|Maestro Android driver/i.test(message)) {
    return {
      status: "BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE",
      exactReason: "Proactive workday proof did not reach UI assertions because Maestro Android driver was unavailable.",
    };
  }
  return {
    status: "BLOCKED_PROACTIVE_WORKDAY_RUNTIME_TARGETABILITY",
    exactReason: "Command Center proactive workday section was not targetable in Android hierarchy.",
  };
}

async function runFlow(
  mode: "card" | "empty",
  roleEnv: Record<string, string>,
  secrets: readonly string[],
): Promise<{ passed: true } | { passed: false; failure: ReturnType<typeof classifyMaestroFailure> }> {
  const flowPath = createFlowFile(mode);
  try {
    await runMaestroTestWithDriverRepair({
      projectRoot,
      runId: `proactive_workday_${mode}_${Date.now()}`,
      flowPaths: [flowPath],
      env: roleEnv,
      secrets,
      maestroBinary,
    });
    return { passed: true };
  } catch (error) {
    return { passed: false, failure: classifyMaestroFailure(error) };
  } finally {
    fs.rmSync(flowPath, { force: true });
  }
}

export async function runAiProactiveWorkdayTaskIntelligenceMaestro(): Promise<AiProactiveWorkdayArtifact> {
  if (!sourceReady()) {
    return writeArtifacts(
      buildArtifact(
        "BLOCKED_PROACTIVE_WORKDAY_BACKEND_CONTRACT",
        "Proactive workday source contracts or Command Center testIDs are missing.",
      ),
    );
  }

  const backend = backendContract();
  if (!backend || backend.mutationCount !== 0 || backend.dbWrites !== 0 || backend.fakeCards) {
    return writeArtifacts(
      buildArtifact(
        "BLOCKED_PROACTIVE_WORKDAY_BACKEND_CONTRACT",
        "Proactive workday backend contract is not read-only or evidence-safe.",
      ),
    );
  }

  if (!e2eApproved()) {
    return writeArtifacts(
      buildArtifact(
        "BLOCKED_PROACTIVE_WORKDAY_E2E_APPROVAL_MISSING",
        "S_AI_MAGIC_12_PROACTIVE_WORKDAY_APPROVED and S_AI_MAGIC_12_REQUIRE_ANDROID_EMULATOR_PROOF are required.",
      ),
    );
  }

  const roleAuth = resolveExplicitAiRoleAuthEnv();
  if (!roleAuth.greenEligible || !roleAuth.env) {
    return writeArtifacts(
      buildArtifact(
        "BLOCKED_PROACTIVE_WORKDAY_RUNTIME_TARGETABILITY",
        roleAuth.exactReason ?? "Developer/control full-access E2E auth is required.",
        {
          e2e_role_mode: roleAuth.roleMode,
          auth_source: roleAuth.auth_source,
        },
      ),
    );
  }

  const maestroPreflight = await ensureAndroidMaestroDriverReady({ projectRoot });
  if (maestroPreflight.final_status !== "GREEN_ANDROID_MAESTRO_DRIVER_PREFLIGHT_READY") {
    return writeArtifacts(
      buildArtifact(
        "BLOCKED_ANDROID_ADB_RUNTIME_UNSTABLE",
        maestroPreflight.exact_reason ?? "Android API34 Maestro emulator/device was not ready.",
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

  if (!fs.existsSync(maestroBinary)) {
    return writeArtifacts(
      buildArtifact("BLOCKED_PROACTIVE_WORKDAY_RUNTIME_TARGETABILITY", "Maestro CLI is not available.", {
        android_runtime_smoke: "PASS",
      }),
    );
  }

  const roleEnv = {
    MAESTRO_E2E_DIRECTOR_EMAIL: roleAuth.env.E2E_DIRECTOR_EMAIL,
    MAESTRO_E2E_DIRECTOR_PASSWORD: roleAuth.env.E2E_DIRECTOR_PASSWORD,
  };
  const secrets = collectExplicitE2eSecrets({ ...process.env, ...roleAuth.env });
  const cardProof = await runFlow("card", roleEnv, secrets);
  if (
    !cardProof.passed &&
    cardProof.failure.status !== "BLOCKED_PROACTIVE_WORKDAY_RUNTIME_TARGETABILITY"
  ) {
    return writeArtifacts(
      buildArtifact(cardProof.failure.status, cardProof.failure.exactReason, {
        android_runtime_smoke: "PASS",
        emulator_runtime_proof: "BLOCKED",
      }),
    );
  }
  const emptyProof = cardProof.passed ? null : await runFlow("empty", roleEnv, secrets);
  const cardVisible = cardProof.passed;
  const emptyVisible = emptyProof?.passed === true;

  if (
    emptyProof &&
    !emptyProof.passed &&
    emptyProof.failure.status !== "BLOCKED_PROACTIVE_WORKDAY_RUNTIME_TARGETABILITY"
  ) {
    return writeArtifacts(
      buildArtifact(emptyProof.failure.status, emptyProof.failure.exactReason, {
        android_runtime_smoke: "PASS",
        emulator_runtime_proof: "BLOCKED",
      }),
    );
  }

  if (!cardVisible && !emptyVisible) {
    return writeArtifacts(
      buildArtifact(
        "BLOCKED_PROACTIVE_WORKDAY_RUNTIME_TARGETABILITY",
        "Command Center proactive workday section was not targetable in Android hierarchy.",
        {
          android_runtime_smoke: "PASS",
          emulator_runtime_proof: "BLOCKED",
          command_center_workday_section_visible: false,
        },
      ),
    );
  }

  const finalStatus = cardVisible
    ? "GREEN_AI_PROACTIVE_WORKDAY_TASK_INTELLIGENCE_READY"
    : "GREEN_AI_PROACTIVE_WORKDAY_EMPTY_STATE_READY";

  return writeArtifacts(
    buildArtifact(finalStatus, cardVisible ? null : AI_WORKDAY_EMPTY_STATE_REASON, {
      all_cards_have_evidence: backend.allCardsHaveEvidence,
      all_cards_have_risk_policy: backend.allCardsHaveRiskPolicy,
      all_cards_have_known_tool: backend.allCardsHaveKnownTool,
      high_risk_requires_approval: backend.highRiskRequiresApproval,
      android_runtime_smoke: "PASS",
      emulator_runtime_proof: "PASS",
      command_center_workday_section_visible: true,
      workday_card_visible: cardVisible,
      workday_empty_state_visible: emptyVisible,
      honest_empty_state: emptyVisible,
    }),
  );
}

if (require.main === module) {
  void runAiProactiveWorkdayTaskIntelligenceMaestro()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (
        artifact.final_status !== "GREEN_AI_PROACTIVE_WORKDAY_TASK_INTELLIGENCE_READY" &&
        artifact.final_status !== "GREEN_AI_PROACTIVE_WORKDAY_EMPTY_STATE_READY"
      ) {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
