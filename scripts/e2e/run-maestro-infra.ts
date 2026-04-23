import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const appId = "com.azisbek_dzhantaev.rikexpoapp";
const expectedApiLevel = "34";
const expectedAbi = "x86_64";
const expectedAvdPattern = process.env.MAESTRO_EXPECTED_AVD_PATTERN ?? "API_34";
const flowFile = path.join(projectRoot, "maestro", "flows", "infra-launch.yaml");
const outputDir = path.join(projectRoot, "artifacts", "maestro-infra");
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

function runCommand(command: string, args: string[], capture = false) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
    shell: process.platform === "win32" && command.endsWith(".bat"),
    env: {
      ...process.env,
      MAESTRO_CLI_NO_ANALYTICS: "1",
      MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: "true",
    },
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const details = capture ? `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim() : `exit ${result.status}`;
    throw new Error(`Command failed: ${command} ${args.join(" ")}\n${details}`);
  }

  return (result.stdout ?? "").trim();
}

function adb(deviceId: string, args: string[], capture = true) {
  return runCommand("adb", ["-s", deviceId, ...args], capture);
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
    throw new Error("No Android device detected for Maestro infra probe.");
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
    throw new Error(`Expected Android API ${expectedApiLevel}, received ${apiLevel || "<empty>"}.`);
  }

  if (abi !== expectedAbi) {
    throw new Error(`Expected emulator ABI ${expectedAbi}, received ${abi || "<empty>"}.`);
  }

  if (!avdName || !avdName.includes(expectedAvdPattern)) {
    throw new Error(
      `Expected an API 34 AVD matching "${expectedAvdPattern}", received ${avdName || "<empty>"}.`,
    );
  }
}

function ensureAppInstalled(deviceId: string) {
  const packagePath = adb(deviceId, ["shell", "pm", "path", appId], true);
  if (packagePath.includes("package:")) {
    return;
  }

  if (!fs.existsSync(releaseApk)) {
    throw new Error(
      `Release APK is not installed on ${deviceId} and no APK was found at ${releaseApk}.`,
    );
  }

  runCommand("adb", ["-s", deviceId, "install", "-r", releaseApk], false);
  const installedPath = adb(deviceId, ["shell", "pm", "path", appId], true);
  if (!installedPath.includes("package:")) {
    throw new Error(`Failed to verify installation of ${appId} on ${deviceId}.`);
  }
}

function main() {
  if (!fs.existsSync(flowFile)) {
    throw new Error(`Maestro flow not found at ${flowFile}`);
  }

  if (!fs.existsSync(maestroBinary)) {
    throw new Error(`Maestro CLI not found at ${maestroBinary}`);
  }

  const deviceId = detectDeviceId();
  ensureCanonicalEnvironment(deviceId);
  ensureAppInstalled(deviceId);
  fs.mkdirSync(outputDir, { recursive: true });

  adb(deviceId, ["shell", "am", "force-stop", appId], false);

  console.log(`Running Maestro infra probe on ${deviceId}`);
  console.log(`Canonical environment: API ${expectedApiLevel}, ABI ${expectedAbi}, AVD pattern ${expectedAvdPattern}`);

  runCommand(
    maestroBinary,
    [
      "test",
      flowFile,
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
    ],
    false,
  );
}

main();
