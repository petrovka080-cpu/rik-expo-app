import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { verifyAndroidInstalledBuildRuntime } from "../release/verifyAndroidInstalledBuildRuntime";
import { resolveAiAndroidRebuildRequirement } from "../release/requireAndroidRebuildForAiSourceChanges";
import { ensureAndroidEmulatorReady } from "./ensureAndroidEmulatorReady";
import { redactE2eSecrets } from "./redactE2eSecrets";

export type AiMandatoryEmulatorRuntimeGateStatus =
  | "GREEN_AI_MANDATORY_EMULATOR_RUNTIME_GATE_READY"
  | "BLOCKED_AI_RUNTIME_EMULATOR_GATE"
  | "BLOCKED_ANDROID_REBUILD_REQUIRED_FOR_AI_RUNTIME_PROOF"
  | "BLOCKED_CHILD_AI_RUNTIME_RUNNER_NOT_FOUND";

type ChildRunnerMode = "blocking" | "pass_or_exact_blocker";

type ChildRunnerSpec = {
  key: string;
  runner: string;
  relativePath: string;
  exportName: string;
  greenStatuses: readonly string[];
  mode: ChildRunnerMode;
  forbiddenDbWriteBoundary?: boolean;
};

type ChildRunnerResult = {
  key: string;
  runner: string;
  mode: ChildRunnerMode;
  executed: boolean;
  final_status: string;
  status: "PASS" | "EXACT_BLOCKER" | "BLOCKED";
  exact_reason: string | null;
  mutations_created: number;
  fake_green_claimed: boolean;
  fake_emulator_pass: boolean;
  secrets_printed: boolean;
  role_leakage_observed: boolean;
};

export type AiMandatoryEmulatorRuntimeMatrix = {
  final_status: AiMandatoryEmulatorRuntimeGateStatus;
  android_emulator_ready: boolean;
  android_installed_runtime_smoke: "PASS" | "BLOCKED";
  ai_source_changed_requires_rebuild: boolean;
  local_android_rebuild_install: "PASS" | "NOT_REQUIRED" | "BLOCKED";
  developer_control_e2e: "PASS" | "BLOCKED";
  role_screen_knowledge_e2e: "PASS" | "BLOCKED";
  command_center_runtime_e2e: "PASS" | "BLOCKED";
  screen_action_runtime_e2e: "PASS" | "BLOCKED";
  proactive_workday_runtime_e2e: "PASS" | "PASS_OR_EMPTY_STATE_GREEN" | "BLOCKED";
  approval_ledger_e2e: "PASS" | "PASS_OR_EXACT_BLOCKER" | "BLOCKED";
  live_approval_execution_e2e: "PASS" | "PASS_OR_EXACT_BLOCKER" | "BLOCKED";
  exact_llm_text_assertions: boolean;
  fake_emulator_pass: boolean;
  mutations_created: number;
  role_leakage_observed: boolean;
  secrets_printed: boolean;
  blocking_child_runner: string | null;
  exact_reason: string | null;
  fake_green_claimed: boolean;
  child_runners: ChildRunnerResult[];
};

const projectRoot = process.cwd();
const wave = "S_AI_QA_01_MANDATORY_EMULATOR_RUNTIME_GATE";
const artifactPrefix = path.join(projectRoot, "artifacts", wave);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;

const deterministicTestIds = [
  "ai.assistant.screen",
  "ai.assistant.input",
  "ai.assistant.send",
  "ai.assistant.loading",
  "ai.assistant.response",
  "ai.knowledge.preview",
  "ai.command_center.screen",
  "ai.command_center.task_stream",
  "ai.approval_inbox.screen",
  "ai.screen.actions.preview",
  "ai.workday.section",
  "ai.workday.empty_state",
] as const;

const childRunners: ChildRunnerSpec[] = [
  {
    key: "developer_control_e2e",
    runner: "runDeveloperControlFullAccessMaestro",
    relativePath: "scripts/e2e/runDeveloperControlFullAccessMaestro.ts",
    exportName: "runDeveloperControlFullAccessMaestro",
    greenStatuses: [
      "GREEN_DEVELOPER_CONTROL_FULL_ACCESS_RUNTIME_MODE_READY",
      "GREEN_DEVELOPER_CONTROL_FULL_ACCESS_RUNTIME_TARGETABILITY",
    ],
    mode: "blocking",
  },
  {
    key: "role_screen_knowledge_e2e",
    runner: "runAiRoleScreenKnowledgeMaestro",
    relativePath: "scripts/e2e/runAiRoleScreenKnowledgeMaestro.ts",
    exportName: "runAiRoleScreenKnowledgeMaestro",
    greenStatuses: [
      "GREEN_AI_ROLE_SCREEN_DETERMINISTIC_RELEASE_GATE",
      "GREEN_AI_EXPLICIT_ROLE_SECRETS_E2E_CLOSEOUT",
    ],
    mode: "blocking",
  },
  {
    key: "screen_action_runtime_e2e",
    runner: "runAiScreenButtonActionMapMaestro",
    relativePath: "scripts/e2e/runAiScreenButtonActionMapMaestro.ts",
    exportName: "runAiScreenButtonActionMapMaestro",
    greenStatuses: ["GREEN_AI_SCREEN_BUTTON_ACTION_INTELLIGENCE_MAP_READY"],
    mode: "blocking",
  },
  {
    key: "screen_action_truth_map_e2e",
    runner: "runAiScreenButtonActionTruthMapMaestro",
    relativePath: "scripts/e2e/runAiScreenButtonActionTruthMapMaestro.ts",
    exportName: "runAiScreenButtonActionTruthMapMaestro",
    greenStatuses: ["GREEN_AI_SCREEN_BUTTON_ACTION_TRUTH_MAP_READY"],
    mode: "blocking",
  },
  {
    key: "command_center_runtime_e2e",
    runner: "runAiCommandCenterApprovalRuntimeMaestro",
    relativePath: "scripts/e2e/runAiCommandCenterApprovalRuntimeMaestro.ts",
    exportName: "runAiCommandCenterApprovalRuntimeMaestro",
    greenStatuses: ["GREEN_AI_COMMAND_CENTER_APPROVAL_RUNTIME_READY"],
    mode: "blocking",
  },
  {
    key: "proactive_workday_runtime_e2e",
    runner: "runAiProactiveWorkdayTaskIntelligenceMaestro",
    relativePath: "scripts/e2e/runAiProactiveWorkdayTaskIntelligenceMaestro.ts",
    exportName: "runAiProactiveWorkdayTaskIntelligenceMaestro",
    greenStatuses: [
      "GREEN_AI_PROACTIVE_WORKDAY_TASK_INTELLIGENCE_READY",
      "GREEN_AI_PROACTIVE_WORKDAY_EMPTY_STATE_READY",
    ],
    mode: "blocking",
  },
  {
    key: "approval_ledger_e2e",
    runner: "runAiApprovalLedgerPersistenceMaestro",
    relativePath: "scripts/e2e/runAiApprovalLedgerPersistenceMaestro.ts",
    exportName: "runAiApprovalLedgerPersistenceMaestro",
    greenStatuses: ["GREEN_AI_APPROVAL_LEDGER_PERSISTENCE_RUNTIME_READY"],
    mode: "pass_or_exact_blocker",
    forbiddenDbWriteBoundary: true,
  },
  {
    key: "live_approval_execution_e2e",
    runner: "runAiLiveApprovalToExecutionPointOfNoReturn",
    relativePath: "scripts/e2e/runAiLiveApprovalToExecutionPointOfNoReturn.ts",
    exportName: "runAiLiveApprovalToExecutionPointOfNoReturn",
    greenStatuses: ["GREEN_AI_LIVE_APPROVAL_TO_EXECUTION_POINT_OF_NO_RETURN"],
    mode: "pass_or_exact_blocker",
    forbiddenDbWriteBoundary: true,
  },
];

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(record: Record<string, unknown>, ...keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

function numberField(record: Record<string, unknown>, ...keys: readonly string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return 0;
}

function boolField(record: Record<string, unknown>, ...keys: readonly string[]): boolean {
  return keys.some((key) => record[key] === true);
}

function childResultFromArtifact(
  spec: ChildRunnerSpec,
  artifact: Record<string, unknown>,
): ChildRunnerResult {
  const finalStatus = stringField(artifact, "final_status", "finalStatus") ?? "BLOCKED_CHILD_ARTIFACT_STATUS_MISSING";
  const pass = spec.greenStatuses.includes(finalStatus);
  return {
    key: spec.key,
    runner: spec.runner,
    mode: spec.mode,
    executed: true,
    final_status: finalStatus,
    status: pass ? "PASS" : spec.mode === "pass_or_exact_blocker" ? "EXACT_BLOCKER" : "BLOCKED",
    exact_reason: stringField(artifact, "exact_reason", "exactReason") ?? (pass ? null : finalStatus),
    mutations_created: numberField(artifact, "mutations_created", "mutation_count", "ledger_mutations_created"),
    fake_green_claimed: boolField(artifact, "fake_green_claimed", "fake_pass_claimed"),
    fake_emulator_pass: boolField(artifact, "fake_emulator_pass"),
    secrets_printed: boolField(artifact, "secrets_printed", "credentials_printed"),
    role_leakage_observed: boolField(artifact, "role_leakage_observed"),
  };
}

function exactBlockerChild(spec: ChildRunnerSpec, status: string, exactReason: string): ChildRunnerResult {
  return {
    key: spec.key,
    runner: spec.runner,
    mode: spec.mode,
    executed: false,
    final_status: status,
    status: spec.mode === "pass_or_exact_blocker" ? "EXACT_BLOCKER" : "BLOCKED",
    exact_reason: exactReason,
    mutations_created: 0,
    fake_green_claimed: false,
    fake_emulator_pass: false,
    secrets_printed: false,
    role_leakage_observed: false,
  };
}

async function runChildRunner(spec: ChildRunnerSpec): Promise<ChildRunnerResult> {
  const absolutePath = path.join(projectRoot, spec.relativePath);
  if (!fs.existsSync(absolutePath)) {
    return exactBlockerChild(
      spec,
      "RUNNER_NOT_FOUND_EXACT_BLOCKER",
      `Required AI runtime child runner is missing: ${spec.relativePath}`,
    );
  }

  if (
    spec.forbiddenDbWriteBoundary &&
    process.env.S_AI_EMULATOR_ALLOW_DB_MUTATING_CHILD_RUNNERS !== "true"
  ) {
    return exactBlockerChild(
      spec,
      "BLOCKED_DB_WRITE_FORBIDDEN_BY_S_AI_QA_01",
      `${spec.runner} requires live approval ledger mutations; S_AI_QA_01 forbids DB writes, so this child is an exact blocker instead of an executed write path.`,
    );
  }

  try {
    const imported = await import(pathToFileURL(absolutePath).href) as Record<string, unknown>;
    const runner = imported[spec.exportName];
    if (typeof runner !== "function") {
      return exactBlockerChild(
        spec,
        "RUNNER_NOT_FOUND_EXACT_BLOCKER",
        `Required export ${spec.exportName} was not found in ${spec.relativePath}.`,
      );
    }
    const artifact = await runner();
    if (!isRecord(artifact)) {
      return exactBlockerChild(
        spec,
        "BLOCKED_CHILD_AI_RUNTIME_RUNNER_INVALID_ARTIFACT",
        `${spec.runner} did not return a JSON object artifact.`,
      );
    }
    return childResultFromArtifact(spec, artifact);
  } catch (error) {
    return exactBlockerChild(
      spec,
      "BLOCKED_CHILD_AI_RUNTIME_RUNNER_THROWN",
      redactE2eSecrets(error instanceof Error ? error.message : String(error)),
    );
  }
}

function exactLlmTextAssertionsPresent(): boolean {
  const roleFlowDir = path.join(projectRoot, "tests", "e2e", "ai-role-screen-knowledge");
  if (!fs.existsSync(roleFlowDir)) return true;
  const flowSources = fs.readdirSync(roleFlowDir)
    .filter((fileName) => fileName.endsWith(".yaml") || fileName.endsWith(".yml"))
    .map((fileName) => fs.readFileSync(path.join(roleFlowDir, fileName), "utf8"));
  return flowSources.some((source) => {
    const sendIndex = source.indexOf('id: "ai.assistant.send"');
    const postSend = sendIndex >= 0 ? source.slice(sendIndex) : source;
    return (
      source.includes('visible: "AI APP KNOWLEDGE BLOCK"') ||
      postSend.includes('visible: "AI APP KNOWLEDGE BLOCK"') ||
      postSend.includes('assertVisible:\n    id: "ai.assistant.response"')
    );
  });
}

function firstBlockingChild(children: readonly ChildRunnerResult[]): ChildRunnerResult | null {
  return children.find((child) => child.mode === "blocking" && child.status !== "PASS") ?? null;
}

function buildMatrix(params: {
  finalStatus: AiMandatoryEmulatorRuntimeGateStatus;
  androidEmulatorReady: boolean;
  androidInstalledRuntimeSmoke: "PASS" | "BLOCKED";
  rebuildRequirement: ReturnType<typeof resolveAiAndroidRebuildRequirement>;
  children: ChildRunnerResult[];
  blockingChildRunner: string | null;
  exactReason: string | null;
  exactLlmTextAssertions?: boolean;
}): AiMandatoryEmulatorRuntimeMatrix {
  const childByKey = new Map(params.children.map((child) => [child.key, child]));
  const proactive = childByKey.get("proactive_workday_runtime_e2e");
  const approvalLedger = childByKey.get("approval_ledger_e2e");
  const liveApproval = childByKey.get("live_approval_execution_e2e");
  const mutationsCreated = params.children.reduce((sum, child) => sum + child.mutations_created, 0);
  const roleLeakageObserved = params.children.some((child) => child.role_leakage_observed);
  const secretsPrinted = params.children.some((child) => child.secrets_printed);
  const fakeGreenClaim = params.children.some((child) => child.fake_green_claimed);
  const fakeEmulatorPass = params.children.some((child) => child.fake_emulator_pass);

  return {
    final_status: params.finalStatus,
    android_emulator_ready: params.androidEmulatorReady,
    android_installed_runtime_smoke: params.androidInstalledRuntimeSmoke,
    ai_source_changed_requires_rebuild: params.rebuildRequirement.require_rebuild,
    local_android_rebuild_install: params.rebuildRequirement.local_android_rebuild_install,
    developer_control_e2e: childByKey.get("developer_control_e2e")?.status === "PASS" ? "PASS" : "BLOCKED",
    role_screen_knowledge_e2e: childByKey.get("role_screen_knowledge_e2e")?.status === "PASS" ? "PASS" : "BLOCKED",
    command_center_runtime_e2e: childByKey.get("command_center_runtime_e2e")?.status === "PASS" ? "PASS" : "BLOCKED",
    screen_action_runtime_e2e:
      childByKey.get("screen_action_runtime_e2e")?.status === "PASS" &&
      childByKey.get("screen_action_truth_map_e2e")?.status === "PASS"
        ? "PASS"
        : "BLOCKED",
    proactive_workday_runtime_e2e: proactive?.status === "PASS"
      ? proactive.final_status === "GREEN_AI_PROACTIVE_WORKDAY_EMPTY_STATE_READY"
        ? "PASS_OR_EMPTY_STATE_GREEN"
        : "PASS"
      : "BLOCKED",
    approval_ledger_e2e: approvalLedger?.status === "PASS"
      ? "PASS"
      : approvalLedger?.status === "EXACT_BLOCKER"
        ? "PASS_OR_EXACT_BLOCKER"
        : "BLOCKED",
    live_approval_execution_e2e: liveApproval?.status === "PASS"
      ? "PASS"
      : liveApproval?.status === "EXACT_BLOCKER"
        ? "PASS_OR_EXACT_BLOCKER"
        : "BLOCKED",
    exact_llm_text_assertions: params.exactLlmTextAssertions ?? false,
    fake_emulator_pass: fakeEmulatorPass,
    mutations_created: mutationsCreated,
    role_leakage_observed: roleLeakageObserved,
    secrets_printed: secretsPrinted,
    blocking_child_runner: params.blockingChildRunner,
    exact_reason: params.exactReason,
    fake_green_claimed: fakeGreenClaim,
    child_runners: params.children.map((child) => ({
      ...child,
      fake_green_claimed: child.fake_green_claimed,
      fake_emulator_pass: child.fake_emulator_pass,
    })),
  };
}

function writeArtifacts(params: {
  matrix: AiMandatoryEmulatorRuntimeMatrix;
  rebuildRequirement: ReturnType<typeof resolveAiAndroidRebuildRequirement>;
  emulatorResult: Awaited<ReturnType<typeof ensureAndroidEmulatorReady>> | null;
  installedRuntime: Awaited<ReturnType<typeof verifyAndroidInstalledBuildRuntime>> | null;
}): AiMandatoryEmulatorRuntimeMatrix {
  writeJson(inventoryPath, {
    wave,
    runner: "scripts/e2e/runAiMandatoryEmulatorRuntimeMatrix.ts",
    rebuild_policy: "scripts/release/requireAndroidRebuildForAiSourceChanges.ts",
    android_rebuild_install: "scripts/release/buildInstallAndroidPreviewForEmulator.ts",
    deterministic_test_ids: deterministicTestIds,
    child_runners: childRunners.map((child) => ({
      runner: child.runner,
      path: child.relativePath,
      mode: child.mode,
    })),
    exact_llm_text_assertions_allowed: false,
    response_smoke_blocking_release: false,
    fake_emulator_pass: false,
    secrets_printed: false,
  });
  writeJson(matrixPath, params.matrix);
  writeJson(emulatorPath, {
    wave,
    android_emulator_ready: params.matrix.android_emulator_ready,
    android_installed_runtime_smoke: params.matrix.android_installed_runtime_smoke,
    rebuild_requirement: params.rebuildRequirement,
    emulator_boot_completed: params.emulatorResult?.bootCompleted ?? false,
    emulator_device_present: Boolean(params.emulatorResult?.deviceId),
    installed_runtime_status: params.installedRuntime?.final_status ?? null,
    fake_emulator_pass: false,
    secrets_printed: false,
    exact_reason: params.matrix.exact_reason,
  });
  fs.writeFileSync(
    proofPath,
    [
      "# S_AI_QA_01 Mandatory Android Emulator AI Runtime Gate",
      "",
      `final_status: ${params.matrix.final_status}`,
      `android_emulator_ready: ${String(params.matrix.android_emulator_ready)}`,
      `android_installed_runtime_smoke: ${params.matrix.android_installed_runtime_smoke}`,
      `ai_source_changed_requires_rebuild: ${String(params.matrix.ai_source_changed_requires_rebuild)}`,
      `local_android_rebuild_install: ${params.matrix.local_android_rebuild_install}`,
      `developer_control_e2e: ${params.matrix.developer_control_e2e}`,
      `role_screen_knowledge_e2e: ${params.matrix.role_screen_knowledge_e2e}`,
      `command_center_runtime_e2e: ${params.matrix.command_center_runtime_e2e}`,
      `screen_action_runtime_e2e: ${params.matrix.screen_action_runtime_e2e}`,
      `proactive_workday_runtime_e2e: ${params.matrix.proactive_workday_runtime_e2e}`,
      `approval_ledger_e2e: ${params.matrix.approval_ledger_e2e}`,
      `live_approval_execution_e2e: ${params.matrix.live_approval_execution_e2e}`,
      `exact_llm_text_assertions: ${String(params.matrix.exact_llm_text_assertions)}`,
      `fake_emulator_pass: ${String(params.matrix.fake_emulator_pass)}`,
      `mutations_created: ${params.matrix.mutations_created}`,
      `role_leakage_observed: ${String(params.matrix.role_leakage_observed)}`,
      `secrets_printed: ${String(params.matrix.secrets_printed)}`,
      params.matrix.blocking_child_runner ? `blocking_child_runner: ${params.matrix.blocking_child_runner}` : "blocking_child_runner: null",
      params.matrix.exact_reason ? `exact_reason: ${params.matrix.exact_reason}` : "exact_reason: null",
      "",
    ].join("\n"),
    "utf8",
  );
  return params.matrix;
}

export async function runAiMandatoryEmulatorRuntimeMatrix(): Promise<AiMandatoryEmulatorRuntimeMatrix> {
  const rebuildRequirement = resolveAiAndroidRebuildRequirement();
  let emulatorResult: Awaited<ReturnType<typeof ensureAndroidEmulatorReady>> | null = null;
  let installedRuntime: Awaited<ReturnType<typeof verifyAndroidInstalledBuildRuntime>> | null = null;
  const children: ChildRunnerResult[] = [];

  if (rebuildRequirement.final_status === "BLOCKED_ANDROID_REBUILD_REQUIRED_FOR_AI_RUNTIME_PROOF") {
    return writeArtifacts({
      matrix: buildMatrix({
        finalStatus: "BLOCKED_ANDROID_REBUILD_REQUIRED_FOR_AI_RUNTIME_PROOF",
        androidEmulatorReady: false,
        androidInstalledRuntimeSmoke: "BLOCKED",
        rebuildRequirement,
        children,
        blockingChildRunner: null,
        exactReason: rebuildRequirement.exact_reason,
      }),
      rebuildRequirement,
      emulatorResult,
      installedRuntime,
    });
  }

  if (exactLlmTextAssertionsPresent()) {
    return writeArtifacts({
      matrix: buildMatrix({
        finalStatus: "BLOCKED_AI_RUNTIME_EMULATOR_GATE",
        androidEmulatorReady: false,
        androidInstalledRuntimeSmoke: "BLOCKED",
        rebuildRequirement,
        children,
        blockingChildRunner: "deterministic_llm_assertion_policy",
        exactReason: "Blocking exact LLM text assertions are present in AI role-screen release flows.",
        exactLlmTextAssertions: true,
      }),
      rebuildRequirement,
      emulatorResult,
      installedRuntime,
    });
  }

  emulatorResult = await ensureAndroidEmulatorReady({ projectRoot });
  if (emulatorResult.final_status !== "GREEN_ANDROID_EMULATOR_READY" || !emulatorResult.deviceId) {
    return writeArtifacts({
      matrix: buildMatrix({
        finalStatus: "BLOCKED_AI_RUNTIME_EMULATOR_GATE",
        androidEmulatorReady: false,
        androidInstalledRuntimeSmoke: "BLOCKED",
        rebuildRequirement,
        children,
        blockingChildRunner: "ensureAndroidEmulatorReady",
        exactReason: emulatorResult.blockedReason ?? "Android emulator/device was not ready.",
      }),
      rebuildRequirement,
      emulatorResult,
      installedRuntime,
    });
  }

  installedRuntime = await verifyAndroidInstalledBuildRuntime();
  if (installedRuntime.final_status !== "GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF") {
    return writeArtifacts({
      matrix: buildMatrix({
        finalStatus: "BLOCKED_AI_RUNTIME_EMULATOR_GATE",
        androidEmulatorReady: true,
        androidInstalledRuntimeSmoke: "BLOCKED",
        rebuildRequirement,
        children,
        blockingChildRunner: "verifyAndroidInstalledBuildRuntime",
        exactReason: installedRuntime.exact_reason ?? "Android installed runtime smoke did not pass.",
      }),
      rebuildRequirement,
      emulatorResult,
      installedRuntime,
    });
  }

  for (const child of childRunners) {
    children.push(await runChildRunner(child));
  }

  const missingRequired = children.find(
    (child) => child.mode === "blocking" && child.final_status === "RUNNER_NOT_FOUND_EXACT_BLOCKER",
  );
  const blockingChild = firstBlockingChild(children);
  const mutationsCreated = children.reduce((sum, child) => sum + child.mutations_created, 0);
  const safetyBlocker = children.find(
    (child) => child.fake_green_claimed || child.fake_emulator_pass || child.secrets_printed || child.role_leakage_observed,
  );
  const exactReason =
    missingRequired?.exact_reason ??
    blockingChild?.exact_reason ??
    safetyBlocker?.exact_reason ??
    (mutationsCreated > 0 ? "AI mandatory emulator matrix observed runtime mutations; S_AI_QA_01 requires zero mutations." : null);
  const finalStatus: AiMandatoryEmulatorRuntimeGateStatus = missingRequired
    ? "BLOCKED_CHILD_AI_RUNTIME_RUNNER_NOT_FOUND"
    : blockingChild || safetyBlocker || mutationsCreated > 0
      ? "BLOCKED_AI_RUNTIME_EMULATOR_GATE"
      : "GREEN_AI_MANDATORY_EMULATOR_RUNTIME_GATE_READY";

  return writeArtifacts({
    matrix: buildMatrix({
      finalStatus,
      androidEmulatorReady: true,
      androidInstalledRuntimeSmoke: "PASS",
      rebuildRequirement,
      children,
      blockingChildRunner: missingRequired?.runner ?? blockingChild?.runner ?? safetyBlocker?.runner ?? null,
      exactReason,
    }),
    rebuildRequirement,
    emulatorResult,
    installedRuntime,
  });
}

if (require.main === module) {
  void runAiMandatoryEmulatorRuntimeMatrix()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_AI_MANDATORY_EMULATOR_RUNTIME_GATE_READY") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      const message = redactE2eSecrets(error instanceof Error ? error.stack ?? error.message : String(error));
      const rebuildRequirement = resolveAiAndroidRebuildRequirement();
      const matrix = buildMatrix({
        finalStatus: "BLOCKED_AI_RUNTIME_EMULATOR_GATE",
        androidEmulatorReady: false,
        androidInstalledRuntimeSmoke: "BLOCKED",
        rebuildRequirement,
        children: [],
        blockingChildRunner: "runAiMandatoryEmulatorRuntimeMatrix",
        exactReason: message,
      });
      writeArtifacts({
        matrix,
        rebuildRequirement,
        emulatorResult: null,
        installedRuntime: null,
      });
      console.info(JSON.stringify(matrix, null, 2));
      process.exitCode = 1;
    });
}
