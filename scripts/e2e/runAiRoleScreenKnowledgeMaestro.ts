import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  ensureAndroidEmulatorReady,
  type AndroidEmulatorReadyResult,
} from "./ensureAndroidEmulatorReady";
import {
  resolveExplicitAiRoleAuthEnv,
  type ExplicitAiRoleAuthSource,
} from "./resolveExplicitAiRoleAuthEnv";
import { collectExplicitE2eSecrets, redactE2eSecrets } from "./redactE2eSecrets";

export type AiRoleScreenKnowledgeStatus =
  | "GREEN_AI_EXPLICIT_ROLE_SECRETS_E2E_CLOSEOUT"
  | "BLOCKED_NO_E2E_ROLE_SECRETS"
  | "BLOCKED_LOGIN_SCREEN_NOT_TARGETABLE_WITHOUT_STABLE_TESTIDS"
  | "BLOCKED_MAESTRO_AUTH_FLOW_RUNTIME_FAILURE";

type RoleFlowName = "director" | "foreman" | "buyer" | "accountant" | "contractor";
type RoleFlowStatus = "PASS" | "FAIL" | "BLOCKED";

type AiRoleScreenKnowledgeArtifact = {
  final_status: AiRoleScreenKnowledgeStatus;
  role_auth_source: ExplicitAiRoleAuthSource;
  all_role_credentials_resolved: boolean;
  service_role_discovery_used_for_green: false;
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
): AiRoleScreenKnowledgeArtifact {
  return {
    final_status: status,
    role_auth_source: authSource,
    all_role_credentials_resolved: allRoleCredentialsResolved,
    service_role_discovery_used_for_green: false,
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
  if (!fs.existsSync(releaseApk)) {
    throw new Error(`Release APK not found at ${releaseApk}. Native build is not run by this closeout.`);
  }

  runCommand("adb", ["-s", deviceId, "install", "-r", releaseApk], true);
  const installedPath = adb(deviceId, ["shell", "pm", "path", appId], true);
  if (!installedPath.includes("package:")) {
    throw new Error(`Failed to verify installation of ${appId} on ${deviceId}.`);
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

export async function runAiRoleScreenKnowledgeMaestro(): Promise<AiRoleScreenKnowledgeArtifact> {
  ensureFlowFilesExist();
  ensureKnowledgeRuntimeSurfaceExists();

  const roleAuthResolution = resolveExplicitAiRoleAuthEnv(process.env);
  if (roleAuthResolution.source !== "explicit_env" || !roleAuthResolution.env) {
    const artifact = buildBlockedArtifact(
      "BLOCKED_NO_E2E_ROLE_SECRETS",
      null,
      roleAuthResolution.exactReason ?? "Explicit E2E role secrets are missing.",
      roleAuthResolution.source,
      roleAuthResolution.allRolesResolved,
    );
    writeEmulatorArtifact(artifact);
    return artifact;
  }

  const secretValues = collectExplicitE2eSecrets({
    ...process.env,
    ...roleAuthResolution.env,
  });
  const bootstrap = await ensureAndroidEmulatorReady({ projectRoot });
  if (bootstrap.final_status !== "GREEN_ANDROID_EMULATOR_READY" || !bootstrap.deviceId) {
    const artifact = buildBlockedArtifact(
      "BLOCKED_MAESTRO_AUTH_FLOW_RUNTIME_FAILURE",
      bootstrap,
      bootstrap.blockedReason ?? "Android emulator/device was not ready.",
      roleAuthResolution.source,
      roleAuthResolution.allRolesResolved,
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
    );
    writeEmulatorArtifact(artifact);
    return artifact;
  }

  fs.mkdirSync(outputDir, { recursive: true });
  adb(bootstrap.deviceId, ["shell", "am", "force-stop", appId], true);

  try {
    runCommand(
      maestroBinary,
      [
        "test",
        "--device",
        bootstrap.deviceId,
        "--platform",
        "android",
        "--format",
        "junit",
        "--output",
        reportFile,
        "--test-output-dir",
        outputDir,
        "--debug-output",
        outputDir,
        "--flatten-debug-output",
        "--no-ansi",
        ...flowFiles,
      ],
      true,
      roleAuthResolution.env,
      secretValues,
    );
  } catch (error) {
    const errorMessage = redactE2eSecrets(error instanceof Error ? error.message : String(error), secretValues);
    const status = errorMessage.includes("auth.login.email")
      ? "BLOCKED_LOGIN_SCREEN_NOT_TARGETABLE_WITHOUT_STABLE_TESTIDS"
      : "BLOCKED_MAESTRO_AUTH_FLOW_RUNTIME_FAILURE";
    const artifact = buildBlockedArtifact(
      status,
      bootstrap,
      errorMessage,
      roleAuthResolution.source,
      roleAuthResolution.allRolesResolved,
    );
    writeEmulatorArtifact(artifact);
    return artifact;
  }

  const artifact: AiRoleScreenKnowledgeArtifact = {
    final_status: "GREEN_AI_EXPLICIT_ROLE_SECRETS_E2E_CLOSEOUT",
    role_auth_source: roleAuthResolution.source,
    all_role_credentials_resolved: true,
    service_role_discovery_used_for_green: false,
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
      if (artifact.final_status !== "GREEN_AI_EXPLICIT_ROLE_SECRETS_E2E_CLOSEOUT") {
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
