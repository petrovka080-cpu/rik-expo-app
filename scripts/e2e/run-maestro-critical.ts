import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  cleanupTempUser,
  createTempUser,
  createVerifierAdmin,
  type RuntimeTestUser,
} from "../_shared/testUserDiscipline";

const projectRoot = process.cwd();
const appId = "com.azisbek_dzhantaev.rikexpoapp";
const expectedApiLevel = "34";
const expectedAbi = "x86_64";
const expectedAvdPattern = process.env.MAESTRO_EXPECTED_AVD_PATTERN ?? "API_34";
const flowDir = path.join(projectRoot, "maestro", "flows", "critical");
const outputDir = path.join(projectRoot, "artifacts", "maestro-critical");
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

type CriticalSeed = {
  admin: SupabaseClient;
  user: RuntimeTestUser;
  companyId: string | null;
  companyProfileId: string | null;
};

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
    throw new Error("No Android device detected for Maestro critical suite.");
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
      `Release APK for Maestro critical suite was not found at ${releaseApk}. Build the current release APK before running this suite.`,
    );
  }

  runCommand("adb", ["-s", deviceId, "install", "-r", releaseApk], false);
  const installedPath = adb(deviceId, ["shell", "pm", "path", appId], true);
  if (!installedPath.includes("package:")) {
    throw new Error(`Failed to verify installation of ${appId} on ${deviceId}.`);
  }
}

async function seedOfficeCompany(admin: SupabaseClient, user: RuntimeTestUser) {
  const suffix = Date.now().toString(36).toUpperCase();
  const companyName = `Maestro Critical ${suffix}`;
  const companyResult = await admin
    .from("companies")
    .insert({
      owner_user_id: user.id,
      name: companyName,
      city: "Bishkek",
      address: "Maestro critical suite",
      phone_main: "+996555000000",
      email: user.email,
      about_short: "Critical flow verification company",
    })
    .select("id")
    .single();

  if (companyResult.error) {
    throw companyResult.error;
  }

  const companyId = String(companyResult.data?.id ?? "").trim();
  if (!companyId) {
    throw new Error("Seeded office company id is empty.");
  }

  const membershipResult = await admin.from("company_members").insert({
    company_id: companyId,
    user_id: user.id,
    role: "buyer",
  });
  if (membershipResult.error) {
    throw membershipResult.error;
  }

  const companyProfileResult = await admin.from("company_profiles").insert({
    id: companyId,
    user_id: user.id,
    owner_user_id: user.id,
    name: companyName,
    phone: "+996555000000",
    email: user.email,
  });
  if (companyProfileResult.error) {
    throw companyProfileResult.error;
  }

  return {
    companyId,
    companyProfileId: companyId,
  };
}

async function createCriticalSuiteSeed(): Promise<CriticalSeed> {
  const admin = createVerifierAdmin("maestro-phase3-critical-suite");
  const user = await createTempUser(admin, {
    role: "buyer",
    fullName: "Maestro Critical Buyer",
    emailPrefix: "maestro-critical",
    userProfile: {
      usage_build: true,
      usage_market: true,
    },
  });
  const officeSeed = await seedOfficeCompany(admin, user);
  return {
    admin,
    user,
    companyId: officeSeed.companyId,
    companyProfileId: officeSeed.companyProfileId,
  };
}

async function cleanupCriticalSuiteSeed(seed: CriticalSeed | null) {
  if (!seed) return;

  try {
    if (seed.companyId) {
      await seed.admin.from("company_invites").delete().eq("company_id", seed.companyId);
    }
  } catch {
    // best effort cleanup
  }

  try {
    if (seed.companyId) {
      await seed.admin.from("company_members").delete().eq("company_id", seed.companyId);
    }
  } catch {
    // best effort cleanup
  }

  try {
    if (seed.companyProfileId) {
      await seed.admin.from("company_profiles").delete().eq("id", seed.companyProfileId);
    }
  } catch {
    // best effort cleanup
  }

  try {
    if (seed.companyId) {
      await seed.admin.from("companies").delete().eq("id", seed.companyId);
    }
  } catch {
    // best effort cleanup
  }

  await cleanupTempUser(seed.admin, seed.user);
}

async function main() {
  if (!fs.existsSync(flowDir)) {
    throw new Error(`Maestro critical flow directory not found at ${flowDir}`);
  }

  if (!fs.existsSync(maestroBinary)) {
    throw new Error(`Maestro CLI not found at ${maestroBinary}`);
  }

  const deviceId = detectDeviceId();
  ensureCanonicalEnvironment(deviceId);
  ensureAppInstalled(deviceId);
  fs.mkdirSync(outputDir, { recursive: true });

  let seed: CriticalSeed | null = null;

  try {
    seed = await createCriticalSuiteSeed();
    adb(deviceId, ["shell", "am", "force-stop", appId], false);

    console.log(`Running Maestro critical suite on ${deviceId}`);
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
        "-e",
        `E2E_AUTH_EMAIL=${seed.user.email}`,
        "-e",
        `E2E_AUTH_PASSWORD=${seed.user.password}`,
        "-e",
        "E2E_BUYER_FIO=MaestroBuyer",
        flowDir,
      ],
      false,
    );
  } finally {
    try {
      adb(deviceId, ["shell", "am", "force-stop", appId], false);
    } catch {
      // best-effort device cleanup
    }
    await cleanupCriticalSuiteSeed(seed);
  }
}

void main();
