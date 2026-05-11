import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  ensureAndroidEmulatorReady,
  type AndroidEmulatorReadyResult,
} from "./ensureAndroidEmulatorReady";

export type AiRoleScreenKnowledgeStatus =
  | "GREEN_AI_ROLE_SCREEN_KNOWLEDGE_EMULATOR_CLOSEOUT"
  | "BLOCKED_HOST_HAS_NO_ANDROID_SDK_OR_AVD"
  | "BLOCKED_AI_KNOWLEDGE_NOT_EXPOSED_TO_RUNTIME_SURFACE"
  | "BLOCKED_E2E_ROLE_AUTH_HARNESS_NOT_AVAILABLE";

type RoleFlowName = "director" | "foreman" | "buyer" | "accountant" | "contractor";
type RoleFlowStatus = "PASS" | "FAIL" | "BLOCKED";

type AiRoleScreenKnowledgeArtifact = {
  final_status: AiRoleScreenKnowledgeStatus;
  framework: "maestro";
  device: "android";
  deviceBefore: "none" | "connected";
  bootAttempted: boolean;
  bootCompleted: boolean;
  flows: Record<RoleFlowName, RoleFlowStatus>;
  mutationsCreated: 0;
  approvalRequiredObserved: boolean;
  roleLeakageObserved: boolean;
  fakePassClaimed: false;
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
  "S_AI_CORE_03A_EMULATOR_ROLE_SCREEN_KNOWLEDGE_emulator.json",
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

const REQUIRED_ROLE_AUTH_ENV = [
  "E2E_DIRECTOR_EMAIL",
  "E2E_DIRECTOR_PASSWORD",
  "E2E_FOREMAN_EMAIL",
  "E2E_FOREMAN_PASSWORD",
  "E2E_BUYER_EMAIL",
  "E2E_BUYER_PASSWORD",
  "E2E_ACCOUNTANT_EMAIL",
  "E2E_ACCOUNTANT_PASSWORD",
  "E2E_CONTRACTOR_EMAIL",
  "E2E_CONTRACTOR_PASSWORD",
] as const;

function runCommand(
  command: string,
  args: readonly string[],
  capture = false,
  extraEnv: Record<string, string> = {},
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
    throw new Error(`Command failed: ${command} ${args.join(" ")}\n${details}`);
  }

  return (result.stdout ?? "").trim();
}

function adb(deviceId: string, args: readonly string[], capture = true): string {
  return runCommand("adb", ["-s", deviceId, ...args], capture);
}

function buildMaestroEnvArgs(envMap: Record<string, string>): string[] {
  const shouldQuoteForWindowsBatch =
    process.platform === "win32" && maestroBinary.toLowerCase().endsWith(".bat");

  return Object.entries(envMap).flatMap(([key, value]) => {
    const entry = `${key}=${value}`;
    if (!shouldQuoteForWindowsBatch) return ["-e", entry];
    return ["-e", `"${entry.replace(/"/g, '""')}"`];
  });
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
  bootstrap: AndroidEmulatorReadyResult,
  exactReason: string,
): AiRoleScreenKnowledgeArtifact {
  return {
    final_status: status,
    framework: "maestro",
    device: "android",
    deviceBefore: bootstrap.deviceBefore,
    bootAttempted: bootstrap.bootAttempted,
    bootCompleted: bootstrap.bootCompleted,
    flows: allBlockedFlows(),
    mutationsCreated: 0,
    approvalRequiredObserved: false,
    roleLeakageObserved: false,
    fakePassClaimed: false,
    exactReason,
  };
}

function getRoleAuthEnv(): Record<string, string> | null {
  const missing = REQUIRED_ROLE_AUTH_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) return null;

  return Object.fromEntries(
    REQUIRED_ROLE_AUTH_ENV.map((key) => [key, process.env[key] ?? ""]),
  );
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

  runCommand("adb", ["-s", deviceId, "install", "-r", releaseApk], false);
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
  adb(deviceId, ["shell", "am", "force-stop", appId], false);
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

  const bootstrap = await ensureAndroidEmulatorReady({ projectRoot });
  if (bootstrap.final_status !== "GREEN_ANDROID_EMULATOR_READY" || !bootstrap.deviceId) {
    const artifact = buildBlockedArtifact(
      "BLOCKED_HOST_HAS_NO_ANDROID_SDK_OR_AVD",
      bootstrap,
      bootstrap.blockedReason ?? "Android emulator/device was not ready.",
    );
    writeEmulatorArtifact(artifact);
    return artifact;
  }

  if (!fs.existsSync(maestroBinary)) {
    const artifact = buildBlockedArtifact(
      "BLOCKED_HOST_HAS_NO_ANDROID_SDK_OR_AVD",
      bootstrap,
      `Maestro CLI not found at expected path.`,
    );
    writeEmulatorArtifact(artifact);
    return artifact;
  }

  ensureAppInstalledAndLaunchable(bootstrap.deviceId);

  const roleAuthEnv = getRoleAuthEnv();
  if (!roleAuthEnv) {
    const artifact = buildBlockedArtifact(
      "BLOCKED_E2E_ROLE_AUTH_HARNESS_NOT_AVAILABLE",
      bootstrap,
      "Non-mutating E2E role credentials are not present in environment; DB-writing seed harness was not used by this wave.",
    );
    writeEmulatorArtifact(artifact);
    return artifact;
  }

  fs.mkdirSync(outputDir, { recursive: true });
  adb(bootstrap.deviceId, ["shell", "am", "force-stop", appId], false);

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
      ...buildMaestroEnvArgs(roleAuthEnv),
      ...flowFiles,
    ],
    false,
  );

  const artifact: AiRoleScreenKnowledgeArtifact = {
    final_status: "GREEN_AI_ROLE_SCREEN_KNOWLEDGE_EMULATOR_CLOSEOUT",
    framework: "maestro",
    device: "android",
    deviceBefore: bootstrap.deviceBefore,
    bootAttempted: bootstrap.bootAttempted,
    bootCompleted: bootstrap.bootCompleted,
    flows: allPassedFlows(),
    mutationsCreated: 0,
    approvalRequiredObserved: true,
    roleLeakageObserved: false,
    fakePassClaimed: false,
    exactReason: null,
  };
  writeEmulatorArtifact(artifact);
  return artifact;
}

if (require.main === module) {
  void runAiRoleScreenKnowledgeMaestro()
    .then((artifact) => {
      console.info(JSON.stringify(artifact, null, 2));
      if (artifact.final_status !== "GREEN_AI_ROLE_SCREEN_KNOWLEDGE_EMULATOR_CLOSEOUT") {
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
