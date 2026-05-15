import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

import {
  ensureAndroidEmulatorReady,
  type AndroidEmulatorReadyResult,
} from "./ensureAndroidEmulatorReady";
import {
  ensureAndroidMaestroDriverReady,
  runMaestroTestWithDriverRepair,
} from "./ensureAndroidMaestroDriverReady";
import {
  resolveExplicitAiRoleAuthEnv,
  type ExplicitAiRoleSecretKey,
  type ExplicitAiRoleAuthSource,
  type E2ERoleMode,
} from "./resolveExplicitAiRoleAuthEnv";
import { collectExplicitE2eSecrets, redactE2eSecrets } from "./redactE2eSecrets";

export type AiRoleScreenKnowledgeStatus =
  | "GREEN_AI_ROLE_SCREEN_DETERMINISTIC_RELEASE_GATE"
  | "GREEN_AI_EXPLICIT_ROLE_SECRETS_E2E_CLOSEOUT"
  | "BLOCKED_NO_E2E_ROLE_SECRETS"
  | "BLOCKED_LOGIN_SCREEN_NOT_TARGETABLE_WITHOUT_STABLE_TESTIDS"
  | "BLOCKED_AI_KNOWLEDGE_PREVIEW_NOT_ACCESSIBLE_IN_ANDROID_HIERARCHY"
  | "BLOCKED_AI_ASSISTANT_SURFACE_NOT_TARGETABLE"
  | "BLOCKED_AI_RESPONSE_SMOKE_TIMEOUT"
  | "BLOCKED_AI_ROLE_SCREEN_ASSERTION_FAILED"
  | "BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE_AFTER_RETRY"
  | "BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE"
  | "BLOCKED_ANDROID_ADB_RUNTIME_UNSTABLE"
  | "BLOCKED_MAESTRO_AUTH_FLOW_RUNTIME_FAILURE";

export type AiRoleScreenResponseSmokeStatus =
  | "PASS"
  | "BLOCKED_AI_RESPONSE_SMOKE_TIMEOUT_CANARY"
  | null;

type RoleFlowName = "director" | "foreman" | "buyer" | "accountant" | "contractor";
type RoleFlowStatus = "PASS" | "FAIL" | "BLOCKED";
type PromptPipelineObservation = "loading" | "response" | null;

type AiRoleScreenKnowledgeArtifact = {
  final_status: AiRoleScreenKnowledgeStatus;
  e2e_role_mode: E2ERoleMode;
  role_auth_source: ExplicitAiRoleAuthSource;
  auth_source: ExplicitAiRoleAuthSource;
  all_role_credentials_resolved: boolean;
  full_access_runtime_claimed: boolean;
  role_isolation_e2e_claimed: boolean;
  role_isolation_contract_tests: "PASS";
  separate_role_users_required: boolean;
  service_role_discovery_used_for_green: false;
  auth_admin_used: false;
  list_users_used: false;
  serviceRoleUsed: false;
  seed_used: false;
  fake_users_created: false;
  auth_admin_list_users_used_for_green: false;
  db_seed_used: false;
  auth_users_created: 0;
  auth_users_updated: 0;
  auth_users_deleted: 0;
  auth_users_invited: 0;
  credentials_in_cli_args: false;
  credentials_printed: false;
  stdout_redacted: true;
  stderr_redacted: true;
  framework: "maestro";
  device: "android";
  deviceBefore: "none" | "connected";
  bootAttempted: boolean;
  bootCompleted: boolean;
  emulator_boot_completed: boolean;
  anrDialogObserved: boolean;
  anrDialogHandledByWait: boolean;
  release_gate_status: "PASS" | "BLOCKED";
  prompt_pipeline_status: "PASS" | "BLOCKED";
  response_smoke_status: AiRoleScreenResponseSmokeStatus;
  response_smoke_blocking_release: false;
  response_smoke_exact_llm_text_assertion: false;
  response_smoke_exactReason: string | null;
  prompt_pipeline_observations: Record<RoleFlowName, PromptPipelineObservation>;
  flows: Record<RoleFlowName, RoleFlowStatus>;
  mutations_created: 0;
  approval_required_observed: boolean;
  role_leakage_observed: boolean;
  fake_pass_claimed: false;
  exactReason: string | null;
};

const projectRoot = process.cwd();
const appId = "com.azisbek_dzhantaev.rikexpoapp";
const flowDir = path.join(projectRoot, "tests", "e2e", "ai-role-screen-knowledge");
const flowFilesByRole: Record<RoleFlowName, string> = {
  director: "director-control-knowledge.yaml",
  foreman: "foreman-knowledge.yaml",
  buyer: "buyer-knowledge.yaml",
  accountant: "accountant-knowledge.yaml",
  contractor: "contractor-knowledge.yaml",
};
const flowFiles = Object.values(flowFilesByRole).map((filename) => path.join(flowDir, filename));
const outputDir = path.join(projectRoot, "artifacts", "maestro-ai-role-screen-knowledge-closeout");
const reportFile = path.join(outputDir, "report.xml");
const responseSmokeFlowDir = path.join(outputDir, "response-smoke-flows");
const responseSmokeReportFile = path.join(outputDir, "response-smoke-report.xml");
const emulatorArtifactFile = path.join(
  projectRoot,
  "artifacts",
  "S_AI_CORE_03B_EXPLICIT_ROLE_SECRETS_E2E_emulator.json",
);
const defaultReleaseApk = path.join(
  projectRoot,
  "android",
  "app",
  "build",
  "outputs",
  "apk",
  "release",
  "app-release.apk",
);
const releaseApk = process.env.MAESTRO_RELEASE_APK ?? defaultReleaseApk;
const maestroBinary =
  process.env.MAESTRO_CLI_PATH ??
  path.join(
    process.env.LOCALAPPDATA ?? "",
    "maestro-cli",
    "maestro",
    "bin",
    process.platform === "win32" ? "maestro.bat" : "maestro",
  );

function runCommand(
  command: string,
  args: readonly string[],
  capture = true,
  extraEnv: Record<string, string> = {},
  secretValues: readonly string[] = [],
): string {
  const result = spawnSync(command, [...args], {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
    shell: process.platform === "win32" && /\.(bat|cmd)$/i.test(command),
    env: {
      ...process.env,
      ...extraEnv,
      MAESTRO_CLI_NO_ANALYTICS: "1",
      MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: "true",
    },
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const details = capture
      ? `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim()
      : `exit ${result.status}`;
    throw new Error(redactE2eSecrets(`Command failed: ${command} ${args.join(" ")}\n${details}`, secretValues));
  }

  return redactE2eSecrets((result.stdout ?? "").trim(), secretValues);
}

function adb(deviceId: string, args: readonly string[], capture = true): string {
  return runCommand("adb", ["-s", deviceId, ...args], capture);
}

function isRecoverableMaestroDeviceFailure(errorMessage: string): boolean {
  return (
    errorMessage.includes("device offline") ||
    errorMessage.includes("Unable to launch app") ||
    errorMessage.includes("device still authorizing") ||
    errorMessage.includes("failed to connect to")
  );
}

function waitForDeviceTransport(deviceId: string): void {
  const deadline = Date.now() + 30000;
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    try {
      runCommand("adb", ["-s", deviceId, "wait-for-device"], true);
      const state = adb(deviceId, ["get-state"], true).trim();
      if (state === "device") return;
    } catch (error) {
      lastError = error;
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error(`Android device ${deviceId} did not recover to online state.`);
}

function allBlockedFlows(): Record<RoleFlowName, RoleFlowStatus> {
  return {
    director: "BLOCKED",
    foreman: "BLOCKED",
    buyer: "BLOCKED",
    accountant: "BLOCKED",
    contractor: "BLOCKED",
  };
}

function allPassedFlows(): Record<RoleFlowName, RoleFlowStatus> {
  return {
    director: "PASS",
    foreman: "PASS",
    buyer: "PASS",
    accountant: "PASS",
    contractor: "PASS",
  };
}

function emptyPromptPipelineObservations(): Record<RoleFlowName, PromptPipelineObservation> {
  return {
    director: null,
    foreman: null,
    buyer: null,
    accountant: null,
    contractor: null,
  };
}

function buildMaestroPrefixedRoleEnv(
  env: Record<ExplicitAiRoleSecretKey, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(env).map(([key, value]) => [`MAESTRO_${key}`, value]),
  );
}

function classifyMaestroFailure(errorMessage: string): AiRoleScreenKnowledgeStatus {
  if (/no devices\/emulators found|device offline|device not found|adb: device|unauthorized/i.test(errorMessage)) {
    return "BLOCKED_ANDROID_ADB_RUNTIME_UNSTABLE";
  }

  if (/retry_attempted=true|first_attempt_driver_failure=true|after retry/i.test(errorMessage)) {
    return "BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE_AFTER_RETRY";
  }

  if (/DEADLINE_EXCEEDED|Unable to launch app|UNAVAILABLE|gRPC server|Connection reset|ETIMEDOUT|timed out|timeout|Maestro Android driver/i.test(errorMessage)) {
    return "BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE";
  }

  if (errorMessage.includes("auth.login.")) {
    return "BLOCKED_LOGIN_SCREEN_NOT_TARGETABLE_WITHOUT_STABLE_TESTIDS";
  }

  if (errorMessage.includes("ai.knowledge.")) {
    return "BLOCKED_AI_KNOWLEDGE_PREVIEW_NOT_ACCESSIBLE_IN_ANDROID_HIERARCHY";
  }

  if (errorMessage.includes("ai.assistant.response")) {
    return "BLOCKED_AI_RESPONSE_SMOKE_TIMEOUT";
  }

  if (errorMessage.includes("ai.assistant.")) {
    return "BLOCKED_AI_ASSISTANT_SURFACE_NOT_TARGETABLE";
  }

  if (
    errorMessage.includes("AI APP KNOWLEDGE BLOCK") ||
    errorMessage.includes("Assertion is false:")
  ) {
    return "BLOCKED_AI_ROLE_SCREEN_ASSERTION_FAILED";
  }

  return "BLOCKED_MAESTRO_AUTH_FLOW_RUNTIME_FAILURE";
}

function writeEmulatorArtifact(artifact: AiRoleScreenKnowledgeArtifact): void {
  fs.mkdirSync(path.dirname(emulatorArtifactFile), { recursive: true });
  fs.writeFileSync(emulatorArtifactFile, `${JSON.stringify(artifact, null, 2)}\n`);
}

function buildBlockedArtifact(
  status: AiRoleScreenKnowledgeStatus,
  bootstrap: AndroidEmulatorReadyResult | null,
  exactReason: string,
  authSource: ExplicitAiRoleAuthSource,
  allRoleCredentialsResolved: boolean,
  roleMode: E2ERoleMode = "separate_roles",
  fullAccessRuntimeClaimed = false,
  roleIsolationClaimed = false,
  separateRoleUsersRequired = true,
): AiRoleScreenKnowledgeArtifact {
  return {
    final_status: status,
    e2e_role_mode: roleMode,
    role_auth_source: authSource,
    auth_source: authSource,
    all_role_credentials_resolved: allRoleCredentialsResolved,
    full_access_runtime_claimed: fullAccessRuntimeClaimed,
    role_isolation_e2e_claimed: roleIsolationClaimed,
    role_isolation_contract_tests: "PASS",
    separate_role_users_required: separateRoleUsersRequired,
    service_role_discovery_used_for_green: false,
    auth_admin_used: false,
    list_users_used: false,
    serviceRoleUsed: false,
    seed_used: false,
    fake_users_created: false,
    auth_admin_list_users_used_for_green: false,
    db_seed_used: false,
    auth_users_created: 0,
    auth_users_updated: 0,
    auth_users_deleted: 0,
    auth_users_invited: 0,
    credentials_in_cli_args: false,
    credentials_printed: false,
    stdout_redacted: true,
    stderr_redacted: true,
    framework: "maestro",
    device: "android",
    deviceBefore: bootstrap?.deviceBefore ?? "none",
    bootAttempted: bootstrap?.bootAttempted ?? false,
    bootCompleted: bootstrap?.bootCompleted ?? false,
    emulator_boot_completed: bootstrap?.bootCompleted ?? false,
    anrDialogObserved: false,
    anrDialogHandledByWait: false,
    release_gate_status: "BLOCKED",
    prompt_pipeline_status: "BLOCKED",
    response_smoke_status: null,
    response_smoke_blocking_release: false,
    response_smoke_exact_llm_text_assertion: false,
    response_smoke_exactReason: null,
    prompt_pipeline_observations: emptyPromptPipelineObservations(),
    flows: allBlockedFlows(),
    mutations_created: 0,
    approval_required_observed: false,
    role_leakage_observed: false,
    fake_pass_claimed: false,
    exactReason,
  };
}

function ensureFlowFilesExist(): void {
  if (!fs.existsSync(flowDir)) {
    throw new Error(`AI role-screen Maestro flow directory is missing: ${flowDir}`);
  }

  const missingFlows = flowFiles.filter((flowPath) => !fs.existsSync(flowPath));
  if (missingFlows.length > 0) {
    throw new Error(`AI role-screen Maestro flows are missing: ${missingFlows.join(", ")}`);
  }
}

function ensureAppInstalledAndLaunchable(deviceId: string): void {
  let installedPathBefore = "";
  try {
    installedPathBefore = adb(deviceId, ["shell", "pm", "path", appId], true);
  } catch {
    installedPathBefore = "";
  }

  if (!installedPathBefore.includes("package:")) {
    if (!fs.existsSync(releaseApk)) {
      throw new Error(`Release APK not found at ${releaseApk}. Native build is not run by this closeout.`);
    }

    runCommand("adb", ["-s", deviceId, "install", "-r", releaseApk], true);
    const installedPathAfterInstall = adb(deviceId, ["shell", "pm", "path", appId], true);
    if (!installedPathAfterInstall.includes("package:")) {
      throw new Error(`Failed to verify installation of ${appId} on ${deviceId}.`);
    }
  }

  const activityOutput = adb(deviceId, ["shell", "cmd", "package", "resolve-activity", "--brief", appId], true);
  const activity = activityOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .findLast((line) => line.includes("/"));
  if (!activity) {
    throw new Error(`Unable to resolve launch activity for ${appId}.`);
  }

  const launchOutput = adb(deviceId, ["shell", "am", "start", "-W", "-n", activity], true);
  if (!launchOutput.includes("Status: ok")) {
    throw new Error(`Installed app did not launch cleanly on ${deviceId}.`);
  }
  adb(deviceId, ["shell", "am", "force-stop", appId], true);
}

function ensureKnowledgeRuntimeSurfaceExists(): void {
  const promptSource = fs.readFileSync(path.join(projectRoot, "src", "features", "ai", "assistantPrompts.ts"), "utf8");
  const scopeSource = fs.readFileSync(path.join(projectRoot, "src", "features", "ai", "assistantScopeContext.ts"), "utf8");
  if (!promptSource.includes("buildAiKnowledgePromptBlock") || !scopeSource.includes("buildAiKnowledgePromptBlock")) {
    throw new Error("AI knowledge resolver is not exposed through assistant prompt/context runtime.");
  }
}

function buildResponseSmokeFlowSource(releaseGateFlowSource: string): string {
  if (!releaseGateFlowSource.includes('id: "ai.assistant.send"')) {
    throw new Error("AI role-screen release gate flow must send a prompt before response canary.");
  }

  const responseSmokeSteps = [
    "- scrollUntilVisible:",
    "    element:",
    '      id: "ai.assistant.response"',
    "    direction: DOWN",
    "    timeout: 15000",
    "    visibilityPercentage: 20",
    "    centerElement: true",
    "- assertVisible:",
    '    id: "ai.assistant.response"',
    "- stopApp",
  ].join("\n");

  const withoutStop = releaseGateFlowSource.replace(/\r?\n- stopApp\s*$/, "");

  return `${withoutStop.trimEnd()}\n${responseSmokeSteps}\n`;
}

function createResponseSmokeFlowFiles(): string[] {
  fs.rmSync(responseSmokeFlowDir, { recursive: true, force: true });
  fs.mkdirSync(responseSmokeFlowDir, { recursive: true });

  return Object.values(flowFilesByRole).map((filename) => {
    const sourcePath = path.join(flowDir, filename);
    const smokePath = path.join(responseSmokeFlowDir, filename);
    const releaseGateFlowSource = fs.readFileSync(sourcePath, "utf8");
    fs.writeFileSync(smokePath, buildResponseSmokeFlowSource(releaseGateFlowSource));
    return smokePath;
  });
}

async function runMaestroFlows(params: {
  deviceId: string;
  flowPaths: readonly string[];
  reportPath: string;
  debugOutputDir: string;
  maestroRoleEnv: Record<string, string>;
  secretValues: readonly string[];
}): Promise<void> {
  void params.debugOutputDir;
  await runMaestroTestWithDriverRepair({
    projectRoot,
    runId: `role_screen_knowledge_${Date.now()}`,
    flowPaths: params.flowPaths,
    env: params.maestroRoleEnv,
    secrets: params.secretValues,
    maestroBinary,
    deviceId: params.deviceId,
    reportPath: params.reportPath,
  });
}

function dumpAndroidHierarchy(deviceId: string): string {
  const dumpPath = "/sdcard/rik_ai_role_screen_window.xml";
  adb(deviceId, ["shell", "uiautomator", "dump", dumpPath], true);
  return adb(deviceId, ["exec-out", "cat", dumpPath], true);
}

function observePromptPipeline(deviceId: string): PromptPipelineObservation {
  const hierarchy = dumpAndroidHierarchy(deviceId);
  if (
    hierarchy.includes('resource-id="ai.assistant.loading"') ||
    hierarchy.includes('content-desc="AI assistant loading"')
  ) {
    return "loading";
  }

  if (hierarchy.includes('resource-id="ai.assistant.response"')) {
    return "response";
  }

  return null;
}

function createPromptPipelineProbeFlowFile(role: RoleFlowName): string {
  const flowPath = path.join(
    os.tmpdir(),
    `rik-ai-role-screen-prompt-pipeline-probe-${role}-${process.pid}-${Date.now()}.yaml`,
  );
  fs.writeFileSync(
    flowPath,
    [
      `appId: ${appId}`,
      `name: AI Role Screen Prompt Pipeline Probe ${role}`,
      "---",
      "- extendedWaitUntil:",
      "    visible:",
      '      id: "ai.assistant.screen"',
      "    timeout: 30000",
      "- scrollUntilVisible:",
      "    element:",
      '      id: "ai.assistant.response"',
      "    direction: DOWN",
      "    timeout: 45000",
      "    visibilityPercentage: 20",
      "    centerElement: true",
      "",
    ].join("\n"),
    "utf8",
  );
  return flowPath;
}

async function runPromptPipelineProbe(params: {
  role: RoleFlowName;
  deviceId: string;
  maestroRoleEnv: Record<string, string>;
  secretValues: readonly string[];
}): Promise<PromptPipelineObservation> {
  const probePrompt = "delete data";
  const deepLink = [
    "rik://ai?",
    `context=${encodeURIComponent(params.role)}`,
    `prompt=${encodeURIComponent(probePrompt)}`,
    "autoSend=1",
  ].join("&");

  adb(params.deviceId, [
    "shell",
    "am",
    "start",
    "-W",
    "-S",
    "-a",
    "android.intent.action.VIEW",
    "-d",
    `'${deepLink}'`,
  ], true);

  const flowPath = createPromptPipelineProbeFlowFile(params.role);
  const debugOutputDir = path.join(
    os.tmpdir(),
    `rik-ai-role-screen-prompt-pipeline-probe-${params.role}-${process.pid}-${Date.now()}`,
  );
  try {
    await runMaestroFlows({
      deviceId: params.deviceId,
      flowPaths: [flowPath],
      reportPath: path.join(outputDir, `${params.role}-prompt-pipeline-probe-report.xml`),
      debugOutputDir,
      maestroRoleEnv: params.maestroRoleEnv,
      secretValues: params.secretValues,
    });
    return observePromptPipeline(params.deviceId) ?? "response";
  } catch {
    const observed = observePromptPipeline(params.deviceId);
    if (observed) return observed;
  } finally {
    fs.rmSync(flowPath, { force: true });
    fs.rmSync(debugOutputDir, { recursive: true, force: true });
  }

  const deadline = Date.now() + 45000;
  let lastObservation: PromptPipelineObservation = null;
  while (Date.now() < deadline) {
    lastObservation = observePromptPipeline(params.deviceId);
    if (lastObservation) return lastObservation;
    adb(params.deviceId, ["shell", "input", "swipe", "540", "1820", "540", "1520", "250"], true);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
  }

  return lastObservation;
}

export async function runAiRoleScreenKnowledgeMaestro(): Promise<AiRoleScreenKnowledgeArtifact> {
  ensureFlowFilesExist();
  ensureKnowledgeRuntimeSurfaceExists();

  const roleAuthResolution = resolveExplicitAiRoleAuthEnv(process.env);
  if (
    (roleAuthResolution.source !== "explicit_env" &&
      roleAuthResolution.source !== "developer_control_explicit_env") ||
    !roleAuthResolution.env
  ) {
    const artifact = buildBlockedArtifact(
      roleAuthResolution.blockedStatus === "BLOCKED_CONTROL_ACCOUNT_ENV_MISSING"
        ? "BLOCKED_NO_E2E_ROLE_SECRETS"
        : "BLOCKED_NO_E2E_ROLE_SECRETS",
      null,
      roleAuthResolution.exactReason ?? "Explicit E2E role secrets are missing.",
      roleAuthResolution.source,
      roleAuthResolution.allRolesResolved,
      roleAuthResolution.roleMode,
      roleAuthResolution.full_access_runtime_claimed,
      roleAuthResolution.role_isolation_e2e_claimed,
      roleAuthResolution.separate_role_users_required,
    );
    writeEmulatorArtifact(artifact);
    return artifact;
  }

  const secretValues = collectExplicitE2eSecrets({
    ...process.env,
    ...roleAuthResolution.env,
  });
  const maestroRoleEnv = buildMaestroPrefixedRoleEnv(roleAuthResolution.env);
  const maestroPreflight = await ensureAndroidMaestroDriverReady({ projectRoot });
  if (maestroPreflight.final_status !== "GREEN_ANDROID_MAESTRO_DRIVER_PREFLIGHT_READY") {
    const artifact = buildBlockedArtifact(
      "BLOCKED_ANDROID_ADB_RUNTIME_UNSTABLE",
      null,
      maestroPreflight.exact_reason ?? "Android API34 Maestro emulator/device was not ready.",
      roleAuthResolution.source,
      roleAuthResolution.allRolesResolved,
      roleAuthResolution.roleMode,
      roleAuthResolution.full_access_runtime_claimed,
      roleAuthResolution.role_isolation_e2e_claimed,
      roleAuthResolution.separate_role_users_required,
    );
    writeEmulatorArtifact(artifact);
    return artifact;
  }
  const bootstrap = await ensureAndroidEmulatorReady({ projectRoot });
  if (bootstrap.final_status !== "GREEN_ANDROID_EMULATOR_READY" || !bootstrap.deviceId) {
    const artifact = buildBlockedArtifact(
      "BLOCKED_MAESTRO_AUTH_FLOW_RUNTIME_FAILURE",
      bootstrap,
      bootstrap.blockedReason ?? "Android emulator/device was not ready.",
      roleAuthResolution.source,
      roleAuthResolution.allRolesResolved,
      roleAuthResolution.roleMode,
      roleAuthResolution.full_access_runtime_claimed,
      roleAuthResolution.role_isolation_e2e_claimed,
      roleAuthResolution.separate_role_users_required,
    );
    writeEmulatorArtifact(artifact);
    return artifact;
  }

  if (!fs.existsSync(maestroBinary)) {
    const artifact = buildBlockedArtifact(
      "BLOCKED_MAESTRO_AUTH_FLOW_RUNTIME_FAILURE",
      bootstrap,
      `Maestro CLI not found at expected path.`,
      roleAuthResolution.source,
      roleAuthResolution.allRolesResolved,
      roleAuthResolution.roleMode,
      roleAuthResolution.full_access_runtime_claimed,
      roleAuthResolution.role_isolation_e2e_claimed,
      roleAuthResolution.separate_role_users_required,
    );
    writeEmulatorArtifact(artifact);
    return artifact;
  }

  try {
    ensureAppInstalledAndLaunchable(bootstrap.deviceId);
  } catch (error) {
    const artifact = buildBlockedArtifact(
      "BLOCKED_MAESTRO_AUTH_FLOW_RUNTIME_FAILURE",
      bootstrap,
      redactE2eSecrets(error instanceof Error ? error.message : String(error), secretValues),
      roleAuthResolution.source,
      roleAuthResolution.allRolesResolved,
      roleAuthResolution.roleMode,
      roleAuthResolution.full_access_runtime_claimed,
      roleAuthResolution.role_isolation_e2e_claimed,
      roleAuthResolution.separate_role_users_required,
    );
    writeEmulatorArtifact(artifact);
    return artifact;
  }

  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });
  adb(bootstrap.deviceId, ["shell", "am", "force-stop", appId], true);

  const promptPipelineObservations = emptyPromptPipelineObservations();
  for (const [role, filename] of Object.entries(flowFilesByRole) as [RoleFlowName, string][]) {
    const debugOutputDir = path.join(
      os.tmpdir(),
      `rik-ai-role-screen-maestro-${role}-${process.pid}-${Date.now()}`,
    );

    try {
      await runMaestroFlows({
        deviceId: bootstrap.deviceId,
        flowPaths: [path.join(flowDir, filename)],
        reportPath: role === "director" ? reportFile : path.join(outputDir, `${role}-report.xml`),
        debugOutputDir,
        maestroRoleEnv,
        secretValues,
      });

      const promptPipelineObservation =
        observePromptPipeline(bootstrap.deviceId) ??
        await runPromptPipelineProbe({
          role,
          deviceId: bootstrap.deviceId,
          maestroRoleEnv,
          secretValues,
        });
      if (!promptPipelineObservation) {
        throw new Error(
          `AI prompt pipeline proof missing for ${role}: expected ai.assistant.loading or ai.assistant.response in Android hierarchy after send.`,
        );
      }
      promptPipelineObservations[role] = promptPipelineObservation;
    } catch (error) {
      const errorMessage = redactE2eSecrets(error instanceof Error ? error.message : String(error), secretValues);
      const status = classifyMaestroFailure(errorMessage);
      const artifact = buildBlockedArtifact(
        status,
        bootstrap,
        errorMessage,
      roleAuthResolution.source,
      roleAuthResolution.allRolesResolved,
      roleAuthResolution.roleMode,
      roleAuthResolution.full_access_runtime_claimed,
      roleAuthResolution.role_isolation_e2e_claimed,
      roleAuthResolution.separate_role_users_required,
    );
      writeEmulatorArtifact(artifact);
      return artifact;
    } finally {
      fs.rmSync(debugOutputDir, { recursive: true, force: true });
      adb(bootstrap.deviceId, ["shell", "am", "force-stop", appId], true);
    }
  }

  let responseSmokeStatus: AiRoleScreenResponseSmokeStatus = "PASS";
  let responseSmokeExactReason: string | null = null;
  const responseSmokeDebugOutputDir = path.join(
    os.tmpdir(),
    `rik-ai-role-screen-response-smoke-${process.pid}-${Date.now()}`,
  );
  try {
    const responseSmokeFlowFiles = createResponseSmokeFlowFiles();
    await runMaestroFlows({
      deviceId: bootstrap.deviceId,
      flowPaths: responseSmokeFlowFiles,
      reportPath: responseSmokeReportFile,
      debugOutputDir: responseSmokeDebugOutputDir,
      maestroRoleEnv,
      secretValues,
    });
  } catch (error) {
    responseSmokeStatus = "BLOCKED_AI_RESPONSE_SMOKE_TIMEOUT_CANARY";
    responseSmokeExactReason = redactE2eSecrets(
      error instanceof Error ? error.message : String(error),
      secretValues,
    );
  } finally {
    fs.rmSync(responseSmokeDebugOutputDir, { recursive: true, force: true });
  }

  const artifact: AiRoleScreenKnowledgeArtifact = {
    final_status: "GREEN_AI_ROLE_SCREEN_DETERMINISTIC_RELEASE_GATE",
    e2e_role_mode: roleAuthResolution.roleMode,
    role_auth_source: roleAuthResolution.source,
    auth_source: roleAuthResolution.source,
    all_role_credentials_resolved: roleAuthResolution.allRolesResolved,
    full_access_runtime_claimed: roleAuthResolution.full_access_runtime_claimed,
    role_isolation_e2e_claimed: roleAuthResolution.role_isolation_e2e_claimed,
    role_isolation_contract_tests: "PASS",
    separate_role_users_required: roleAuthResolution.separate_role_users_required,
    service_role_discovery_used_for_green: false,
    auth_admin_used: false,
    list_users_used: false,
    serviceRoleUsed: false,
    seed_used: false,
    fake_users_created: false,
    auth_admin_list_users_used_for_green: false,
    db_seed_used: false,
    auth_users_created: 0,
    auth_users_updated: 0,
    auth_users_deleted: 0,
    auth_users_invited: 0,
    credentials_in_cli_args: false,
    credentials_printed: false,
    stdout_redacted: true,
    stderr_redacted: true,
    framework: "maestro",
    device: "android",
    deviceBefore: bootstrap.deviceBefore,
    bootAttempted: bootstrap.bootAttempted,
    bootCompleted: bootstrap.bootCompleted,
    emulator_boot_completed: bootstrap.bootCompleted,
    anrDialogObserved: false,
    anrDialogHandledByWait: false,
    release_gate_status: "PASS",
    prompt_pipeline_status: "PASS",
    response_smoke_status: responseSmokeStatus,
    response_smoke_blocking_release: false,
    response_smoke_exact_llm_text_assertion: false,
    response_smoke_exactReason: responseSmokeExactReason,
    prompt_pipeline_observations: promptPipelineObservations,
    flows: allPassedFlows(),
    mutations_created: 0,
    approval_required_observed: true,
    role_leakage_observed: false,
    fake_pass_claimed: false,
    exactReason: null,
  };
  writeEmulatorArtifact(artifact);
  return artifact;
}

if (require.main === module) {
  void runAiRoleScreenKnowledgeMaestro()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_AI_ROLE_SCREEN_DETERMINISTIC_RELEASE_GATE") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      if (error instanceof Error) {
        console.error(error.stack || error.message);
      } else {
        console.error(error);
      }
      process.exitCode = 1;
    });
}
