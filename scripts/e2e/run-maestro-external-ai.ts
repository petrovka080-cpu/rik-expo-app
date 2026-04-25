import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  createMaestroCriticalBusinessSeed,
  type MaestroCriticalBusinessSeed,
} from "./_shared/maestroCriticalBusinessSeed";

const projectRoot = process.cwd();
const appId = "com.azisbek_dzhantaev.rikexpoapp";
const expectedApiLevel = "34";
const expectedAbi = "x86_64";
const expectedAvdPattern = process.env.MAESTRO_EXPECTED_AVD_PATTERN ?? "API_34";
const flowDir = path.join(projectRoot, "maestro", "flows", "external-ai");
const externalAiFlows = ["foreman-ai-draft-submit.yaml"].map((filename) =>
  path.join(flowDir, filename),
);
const outputDir = path.join(projectRoot, "artifacts", "maestro-external-ai");
const reportFile = path.join(outputDir, "report.xml");
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

type ExternalAiSeed = MaestroCriticalBusinessSeed;

function runCommand(
  command: string,
  args: string[],
  capture = false,
  extraEnv: Record<string, string> = {},
) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
    shell: process.platform === "win32" && command.endsWith(".bat"),
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

function adb(deviceId: string, args: string[], capture = true) {
  return runCommand("adb", ["-s", deviceId, ...args], capture);
}

function buildMaestroEnvArgs(envMap: Record<string, string>) {
  const shouldQuoteForWindowsBatch =
    process.platform === "win32" && maestroBinary.toLowerCase().endsWith(".bat");

  return Object.entries(envMap).flatMap(([key, value]) => {
    const entry = `${key}=${value}`;
    if (!shouldQuoteForWindowsBatch) {
      return ["-e", entry];
    }
    return ["-e", `"${entry.replace(/"/g, '""')}"`];
  });
}

function detectDeviceId() {
  const explicit = process.env.MAESTRO_DEVICE_ID ?? process.env.ANDROID_SERIAL;
  if (explicit) {
    return explicit;
  }

  const devicesOutput = runCommand("adb", ["devices"], true);
  const devices = devicesOutput
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/))
    .filter((parts) => parts[1] === "device")
    .map((parts) => parts[0]);

  if (devices.length === 0) {
    throw new Error("No Android device detected for Maestro external AI suite.");
  }

  if (devices.length > 1) {
    throw new Error(
      `Multiple Android devices detected (${devices.join(", ")}). Set MAESTRO_DEVICE_ID explicitly.`,
    );
  }

  return devices[0];
}

function getProp(deviceId: string, prop: string) {
  return adb(deviceId, ["shell", "getprop", prop], true).trim();
}

function ensureCanonicalEnvironment(deviceId: string) {
  const apiLevel = getProp(deviceId, "ro.build.version.sdk");
  const abi = getProp(deviceId, "ro.product.cpu.abi");
  const avdName =
    getProp(deviceId, "ro.boot.qemu.avd_name") ||
    getProp(deviceId, "ro.kernel.qemu.avd_name");

  if (apiLevel !== expectedApiLevel) {
    throw new Error(
      `Expected Android API ${expectedApiLevel}, received ${apiLevel || "<empty>"}.`,
    );
  }

  if (abi !== expectedAbi) {
    throw new Error(
      `Expected emulator ABI ${expectedAbi}, received ${abi || "<empty>"}.`,
    );
  }

  if (!avdName || !avdName.includes(expectedAvdPattern)) {
    throw new Error(
      `Expected an API 34 AVD matching "${expectedAvdPattern}", received ${avdName || "<empty>"}.`,
    );
  }
}

function ensureAppInstalled(deviceId: string) {
  if (!fs.existsSync(releaseApk)) {
    throw new Error(
      `Release APK for Maestro external AI suite was not found at ${releaseApk}. Build the current release APK before running this suite.`,
    );
  }

  runCommand("adb", ["-s", deviceId, "install", "-r", releaseApk], false);
  const installedPath = adb(deviceId, ["shell", "pm", "path", appId], true);
  if (!installedPath.includes("package:")) {
    throw new Error(`Failed to verify installation of ${appId} on ${deviceId}.`);
  }
}

async function createExternalAiSuiteSeed(): Promise<ExternalAiSeed> {
  return await createMaestroCriticalBusinessSeed();
}

async function cleanupExternalAiSuiteSeed(seed: ExternalAiSeed | null) {
  if (!seed) return;
  await seed.cleanup();
}

async function main() {
  if (!fs.existsSync(flowDir)) {
    throw new Error(`Maestro external AI flow directory not found at ${flowDir}`);
  }

  const missingFlows = externalAiFlows.filter((flowPath) => !fs.existsSync(flowPath));
  if (missingFlows.length > 0) {
    throw new Error(`Maestro external AI flows missing: ${missingFlows.join(", ")}`);
  }

  if (!fs.existsSync(maestroBinary)) {
    throw new Error(`Maestro CLI not found at ${maestroBinary}`);
  }

  const deviceId = detectDeviceId();
  ensureCanonicalEnvironment(deviceId);
  ensureAppInstalled(deviceId);
  fs.mkdirSync(outputDir, { recursive: true });

  let seed: ExternalAiSeed | null = null;

  try {
    seed = await createExternalAiSuiteSeed();
    adb(deviceId, ["shell", "am", "force-stop", appId], false);

    console.log(`Running Maestro external AI suite on ${deviceId}`);
    console.log(
      `Canonical environment: API ${expectedApiLevel}, ABI ${expectedAbi}, AVD pattern ${expectedAvdPattern}`,
    );

    runCommand(
      maestroBinary,
      [
        "test",
        "--device",
        deviceId,
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
        ...buildMaestroEnvArgs(seed.env),
        ...externalAiFlows,
      ],
      false,
    );
  } finally {
    try {
      adb(deviceId, ["shell", "am", "force-stop", appId], false);
    } catch {
      // best-effort device cleanup
    }
    await cleanupExternalAiSuiteSeed(seed);
  }
}

void main().catch((error) => {
  if (error instanceof Error) {
    console.error(error.stack || error.message);
  } else {
    try {
      console.error(JSON.stringify(error, null, 2));
    } catch {
      console.error(error);
    }
  }

  process.exitCode = 1;
});
