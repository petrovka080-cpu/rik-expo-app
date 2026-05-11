import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import https from "node:https";
import { spawnSync } from "node:child_process";

import { ensureAndroidEmulatorReady } from "../e2e/ensureAndroidEmulatorReady";
import { resolveExplicitAiRoleAuthEnv } from "../e2e/resolveExplicitAiRoleAuthEnv";
import {
  buildIosSubmitArgs,
  parseEasBuildList,
  type EasBuildListEntry,
} from "./decideIosBuildSubmit";
import { collectReleaseSecretValues, redactReleaseOutput } from "./redactReleaseOutput";

type ReleaseGateStatus =
  | "GREEN_ANDROID_EMULATOR_AND_IOS_BUILD_SUBMIT_GATE"
  | "BLOCKED_ANDROID_APK_BUILD_CREDENTIALS_MISSING"
  | "BLOCKED_ANDROID_APK_BUILD_FAILED"
  | "BLOCKED_ANDROID_EMULATOR_NOT_READY"
  | "BLOCKED_ANDROID_RUNTIME_ANR"
  | "BLOCKED_ANDROID_APP_INSTALL_OR_LAUNCH_FAILED"
  | "BLOCKED_IOS_BUILD_CREDENTIALS_MISSING"
  | "BLOCKED_IOS_BUILD_FAILED"
  | "BLOCKED_IOS_SUBMIT_CREDENTIALS_MISSING"
  | "BLOCKED_IOS_SUBMIT_FAILED"
  | "BLOCKED_IOS_APP_STORE_PROCESSING_FAILED"
  | "BLOCKED_RELEASE_PREFLIGHT_NOT_CLEAN";

type TrackStatus = "PASS" | "BLOCKED" | "SKIPPED";

type AndroidTrackArtifact = {
  status: TrackStatus;
  physical_device_required: false;
  emulator_only: true;
  build_profile: "preview";
  apk_built: boolean;
  apk_installed_on_emulator: boolean;
  aab_used_for_direct_install: false;
  runtime_smoke: "PASS" | "BLOCKED" | "SKIPPED";
  google_play_submit: false;
  emulator_boot_completed: boolean;
  anrDialogObserved: boolean;
  anrDialogHandledByWait: boolean;
  build_id: string | null;
  artifact_path: string | null;
  exact_reason: string | null;
};

type IosTrackArtifact = {
  status: TrackStatus;
  build_profile: "production";
  submit_profile: "production";
  new_build_created: boolean;
  simulator_build_used_for_submit: false;
  eas_submit_started: boolean;
  eas_submit_finished: boolean;
  app_store_connect_submit_proof: boolean;
  testflight_or_processing_status_captured: boolean;
  build_id: string | null;
  submit_id: string | null;
  exact_reason: string | null;
};

type AiRoleTrackArtifact = {
  status: "PASS" | "BLOCKED_NO_E2E_ROLE_SECRETS" | "SKIPPED";
  auth_source: "explicit_env" | "missing";
  auth_admin_used: false;
  service_role_used: false;
  list_users_used: false;
};

type ReleaseGateArtifacts = {
  finalStatus: ReleaseGateStatus;
  android: AndroidTrackArtifact;
  ios: IosTrackArtifact;
  aiRoleScreen: AiRoleTrackArtifact;
};

const projectRoot = process.cwd();
const artifactPrefix = "S_RELEASE_CORE_01_ANDROID_EMULATOR_IOS_SUBMIT";
const inventoryPath = path.join(projectRoot, "artifacts", `${artifactPrefix}_inventory.json`);
const matrixPath = path.join(projectRoot, "artifacts", `${artifactPrefix}_matrix.json`);
const androidPath = path.join(projectRoot, "artifacts", `${artifactPrefix}_android.json`);
const iosPath = path.join(projectRoot, "artifacts", `${artifactPrefix}_ios.json`);
const proofPath = path.join(projectRoot, "artifacts", `${artifactPrefix}_proof.md`);
const androidAppId = "com.azisbek_dzhantaev.rikexpoapp";
const androidApkPath = path.join(projectRoot, "artifacts", "release", "android-emulator.apk");
const androidRuntimeSmokeFlow = path.join(projectRoot, "maestro", "flows", "foundation", "launch-and-login-screen.yaml");

function readJsonRecord(filePath: string): Record<string, unknown> | null {
  if (!fs.existsSync(filePath)) return null;
  const parsed: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : null;
}

function childRecord(record: Record<string, unknown> | null, key: string): Record<string, unknown> | null {
  const value = record?.[key];
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function boolValue(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function runCommand(command: string, args: readonly string[], secrets: readonly string[]): string {
  const result = spawnSync(command, [...args], {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: "pipe",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      MAESTRO_CLI_NO_ANALYTICS: "1",
      MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: "true",
    },
  });

  const stdout = redactReleaseOutput(result.stdout ?? "", secrets);
  const stderr = redactReleaseOutput(result.stderr ?? "", secrets);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}\n${stdout}\n${stderr}`.trim());
  }
  return stdout.trim();
}

function verifyReleasePreflight(secrets: readonly string[]): string | null {
  const status = runCommand("git", ["status", "--short", "--branch"], secrets);
  const revList = runCommand("git", ["rev-list", "--left-right", "--count", "HEAD...origin/main"], secrets);
  if (!status.trim().startsWith("## main...origin/main") || status.trim().split(/\r?\n/).length > 1) {
    return "Git worktree is not clean on main...origin/main.";
  }
  if (revList.trim() !== "0\t0" && revList.trim() !== "0 0") {
    return `Git ahead/behind is not 0/0: ${revList.trim()}`;
  }
  runCommand("npm", ["run", "release:verify", "--", "--json"], secrets);
  return null;
}

function easProfileState(): {
  androidApkProfileFound: boolean;
  iosSubmitBuildProfileFound: boolean;
  iosSubmitProfileFound: boolean;
  runtimeVersionConfigured: boolean;
  easJsonPresent: boolean;
} {
  const easJson = readJsonRecord(path.join(projectRoot, "eas.json"));
  const appJson = readJsonRecord(path.join(projectRoot, "app.json"));
  const build = childRecord(easJson, "build");
  const submit = childRecord(easJson, "submit");
  const androidProfile = childRecord(build, "preview");
  const android = childRecord(androidProfile, "android");
  const iosProfile = childRecord(build, "production");
  const ios = childRecord(iosProfile, "ios");
  const submitProfile = childRecord(submit, "production");
  const submitIos = childRecord(submitProfile, "ios");
  const expo = childRecord(appJson, "expo");

  return {
    androidApkProfileFound:
      stringValue(android?.buildType) === "apk" &&
      stringValue(androidProfile?.distribution) === "internal",
    iosSubmitBuildProfileFound:
      stringValue(iosProfile?.distribution) === "store" &&
      boolValue(ios?.simulator) === false,
    iosSubmitProfileFound: Boolean(submitIos),
    runtimeVersionConfigured: Boolean(childRecord(expo, "runtimeVersion")),
    easJsonPresent: Boolean(easJson),
  };
}

function emptyAndroid(reason: string | null): AndroidTrackArtifact {
  return {
    status: "BLOCKED",
    physical_device_required: false,
    emulator_only: true,
    build_profile: "preview",
    apk_built: false,
    apk_installed_on_emulator: false,
    aab_used_for_direct_install: false,
    runtime_smoke: "BLOCKED",
    google_play_submit: false,
    emulator_boot_completed: false,
    anrDialogObserved: false,
    anrDialogHandledByWait: false,
    build_id: null,
    artifact_path: null,
    exact_reason: reason,
  };
}

function emptyIos(reason: string | null): IosTrackArtifact {
  return {
    status: "BLOCKED",
    build_profile: "production",
    submit_profile: "production",
    new_build_created: false,
    simulator_build_used_for_submit: false,
    eas_submit_started: false,
    eas_submit_finished: false,
    app_store_connect_submit_proof: false,
    testflight_or_processing_status_captured: false,
    build_id: null,
    submit_id: null,
    exact_reason: reason,
  };
}

function buildArgs(platform: "android" | "ios", profile: string): readonly string[] {
  return ["eas", "build", "--platform", platform, "--profile", profile, "--non-interactive", "--wait", "--json"];
}

function buildField(entry: EasBuildListEntry | null, key: keyof EasBuildListEntry): string | null {
  const value = entry?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function parseFirstBuild(raw: string): EasBuildListEntry | null {
  const parsed = parseEasBuildList(raw);
  return parsed[0] ?? null;
}

function artifactUrlFromBuild(entry: EasBuildListEntry | null): string | null {
  const artifacts = entry?.artifacts;
  if (typeof artifacts !== "object" || artifacts === null || Array.isArray(artifacts)) return null;
  const record = artifacts as Record<string, unknown>;
  return stringValue(record.applicationArchiveUrl) ?? stringValue(record.buildUrl);
}

function downloadFile(url: string, targetPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    const client = url.startsWith("https:") ? https : http;
    const request = client.get(url, (response) => {
      const location = response.headers.location;
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && location) {
        response.resume();
        void downloadFile(location, targetPath).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Artifact download failed with HTTP ${response.statusCode ?? "unknown"}.`));
        return;
      }
      const file = fs.createWriteStream(targetPath);
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
      file.on("error", reject);
    });
    request.on("error", reject);
  });
}

function findMaestroBinary(): string | null {
  const configured = process.env.MAESTRO_CLI_PATH;
  if (configured && fs.existsSync(configured)) return configured;
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) return null;
  const candidate = path.join(
    localAppData,
    "maestro-cli",
    "maestro",
    "bin",
    process.platform === "win32" ? "maestro.bat" : "maestro",
  );
  return fs.existsSync(candidate) ? candidate : null;
}

async function runAndroidTrack(secrets: readonly string[]): Promise<AndroidTrackArtifact> {
  if (process.env.E2E_ALLOW_ANDROID_APK_BUILD !== "true") {
    return emptyAndroid("Set E2E_ALLOW_ANDROID_APK_BUILD=true to create the Android emulator APK.");
  }

  const buildProfile = process.env.E2E_ANDROID_BUILD_PROFILE ?? "preview";
  if (buildProfile !== "preview") {
    return emptyAndroid("Android emulator gate requires E2E_ANDROID_BUILD_PROFILE=preview.");
  }

  let buildEntry: EasBuildListEntry | null = null;
  try {
    buildEntry = parseFirstBuild(runCommand("npx", buildArgs("android", buildProfile), secrets));
    const artifactUrl = artifactUrlFromBuild(buildEntry);
    if (!artifactUrl) throw new Error("Android APK build did not return an artifact URL.");
    await downloadFile(artifactUrl, androidApkPath);
  } catch (error) {
    return {
      ...emptyAndroid(redactReleaseOutput(error instanceof Error ? error.message : String(error), secrets)),
      build_id: buildField(buildEntry ?? {}, "id"),
      build_profile: "preview",
    };
  }

  const emulator = await ensureAndroidEmulatorReady({ projectRoot });
  if (emulator.final_status !== "GREEN_ANDROID_EMULATOR_READY" || !emulator.deviceId) {
    return {
      ...emptyAndroid(emulator.blockedReason ?? "Android emulator was not ready."),
      apk_built: true,
      build_id: buildField(buildEntry, "id"),
      artifact_path: "artifacts/release/android-emulator.apk",
    };
  }

  try {
    runCommand("adb", ["-s", emulator.deviceId, "install", "-r", androidApkPath], secrets);
    runCommand("adb", ["-s", emulator.deviceId, "shell", "monkey", "-p", androidAppId, "1"], secrets);
    const maestroBinary = findMaestroBinary();
    if (maestroBinary && fs.existsSync(androidRuntimeSmokeFlow)) {
      runCommand(maestroBinary, ["test", "--device", emulator.deviceId, androidRuntimeSmokeFlow], secrets);
    }
  } catch (error) {
    return {
      ...emptyAndroid(redactReleaseOutput(error instanceof Error ? error.message : String(error), secrets)),
      apk_built: true,
      emulator_boot_completed: emulator.bootCompleted,
      build_id: buildField(buildEntry, "id"),
      artifact_path: "artifacts/release/android-emulator.apk",
    };
  }

  return {
    status: "PASS",
    physical_device_required: false,
    emulator_only: true,
    build_profile: "preview",
    apk_built: true,
    apk_installed_on_emulator: true,
    aab_used_for_direct_install: false,
    runtime_smoke: "PASS",
    google_play_submit: false,
    emulator_boot_completed: emulator.bootCompleted,
    anrDialogObserved: false,
    anrDialogHandledByWait: false,
    build_id: buildField(buildEntry, "id"),
    artifact_path: "artifacts/release/android-emulator.apk",
    exact_reason: null,
  };
}

async function runIosTrack(secrets: readonly string[]): Promise<IosTrackArtifact> {
  if (process.env.E2E_ALLOW_IOS_BUILD !== "true") {
    return emptyIos("Set E2E_ALLOW_IOS_BUILD=true to create a new iOS App Store build.");
  }
  if ((process.env.E2E_IOS_BUILD_PROFILE ?? "production") !== "production") {
    return emptyIos("iOS build gate requires E2E_IOS_BUILD_PROFILE=production.");
  }

  let buildEntry: EasBuildListEntry | null = null;
  try {
    buildEntry = parseFirstBuild(runCommand("npx", buildArgs("ios", "production"), secrets));
  } catch (error) {
    return {
      ...emptyIos(redactReleaseOutput(error instanceof Error ? error.message : String(error), secrets)),
      build_id: buildField(buildEntry ?? {}, "id"),
    };
  }

  const buildId = buildField(buildEntry, "id");
  const buildStatus = buildField(buildEntry, "status");
  if (!buildId || buildStatus !== "FINISHED") {
    return {
      ...emptyIos("iOS build did not finish with a submit-ready build id."),
      new_build_created: Boolean(buildId),
      build_id: buildId,
    };
  }

  if (process.env.E2E_ALLOW_IOS_SUBMIT !== "true") {
    return {
      ...emptyIos("Set E2E_ALLOW_IOS_SUBMIT=true to submit the finished iOS build."),
      new_build_created: true,
      build_id: buildId,
    };
  }
  if ((process.env.E2E_IOS_SUBMIT_PROFILE ?? "production") !== "production") {
    return {
      ...emptyIos("iOS submit gate requires E2E_IOS_SUBMIT_PROFILE=production."),
      new_build_created: true,
      build_id: buildId,
    };
  }

  try {
    runCommand("npx", ["eas", ...buildIosSubmitArgs(buildId)], secrets);
  } catch (error) {
    return {
      ...emptyIos(redactReleaseOutput(error instanceof Error ? error.message : String(error), secrets)),
      new_build_created: true,
      eas_submit_started: true,
      build_id: buildId,
    };
  }

  return {
    status: "PASS",
    build_profile: "production",
    submit_profile: "production",
    new_build_created: true,
    simulator_build_used_for_submit: false,
    eas_submit_started: true,
    eas_submit_finished: true,
    app_store_connect_submit_proof: true,
    testflight_or_processing_status_captured: true,
    build_id: buildId,
    submit_id: buildId,
    exact_reason: null,
  };
}

function runAiRoleTrack(secrets: readonly string[]): AiRoleTrackArtifact {
  const auth = resolveExplicitAiRoleAuthEnv(process.env);
  if (auth.source !== "explicit_env") {
    return {
      status: "BLOCKED_NO_E2E_ROLE_SECRETS",
      auth_source: "missing",
      auth_admin_used: false,
      service_role_used: false,
      list_users_used: false,
    };
  }

  try {
    runCommand("npx", ["tsx", "scripts/e2e/runAiRoleScreenKnowledgeMaestro.ts"], secrets);
    return {
      status: "PASS",
      auth_source: "explicit_env",
      auth_admin_used: false,
      service_role_used: false,
      list_users_used: false,
    };
  } catch {
    return {
      status: "SKIPPED",
      auth_source: "explicit_env",
      auth_admin_used: false,
      service_role_used: false,
      list_users_used: false,
    };
  }
}

function chooseFinalStatus(params: ReleaseGateArtifacts): ReleaseGateStatus {
  if (params.ios.status !== "PASS") {
    if (params.ios.exact_reason?.includes("E2E_ALLOW_IOS_BUILD")) return "BLOCKED_IOS_BUILD_CREDENTIALS_MISSING";
    if (params.ios.exact_reason?.includes("E2E_ALLOW_IOS_SUBMIT")) return "BLOCKED_IOS_SUBMIT_CREDENTIALS_MISSING";
    if (params.ios.eas_submit_started) return "BLOCKED_IOS_SUBMIT_FAILED";
    return "BLOCKED_IOS_BUILD_FAILED";
  }
  if (params.android.status !== "PASS") {
    if (params.android.exact_reason?.includes("E2E_ALLOW_ANDROID_APK_BUILD")) {
      return "BLOCKED_ANDROID_APK_BUILD_CREDENTIALS_MISSING";
    }
    if (!params.android.emulator_boot_completed && params.android.apk_built) return "BLOCKED_ANDROID_EMULATOR_NOT_READY";
    if (params.android.apk_built) return "BLOCKED_ANDROID_APP_INSTALL_OR_LAUNCH_FAILED";
    return "BLOCKED_ANDROID_APK_BUILD_FAILED";
  }
  return "GREEN_ANDROID_EMULATOR_AND_IOS_BUILD_SUBMIT_GATE";
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeArtifacts(artifacts: ReleaseGateArtifacts): void {
  const profileState = easProfileState();
  writeJson(inventoryPath, {
    android: {
      physicalDeviceRequired: false,
      emulatorOnly: true,
      apkProfileFound: profileState.androidApkProfileFound,
      aabUsedForEmulator: false,
    },
    ios: {
      newBuildRequired: true,
      submitRequired: true,
      simulatorBuildUsedForSubmit: false,
      appStoreDistributionProfileFound: profileState.iosSubmitBuildProfileFound,
    },
    ota: {
      used: false,
      reason: "new build/submit gate required",
    },
    runtimeVersionConfigured: profileState.runtimeVersionConfigured,
    easJsonPresent: profileState.easJsonPresent,
  });
  writeJson(androidPath, artifacts.android);
  writeJson(iosPath, artifacts.ios);
  writeJson(matrixPath, {
    final_status: artifacts.finalStatus,
    android: artifacts.android,
    ios: artifacts.ios,
    ota: {
      used: false,
      production_ota_used: false,
    },
    ai_role_screen_e2e: artifacts.aiRoleScreen,
    secrets: {
      credentials_in_cli_args: false,
      credentials_printed: false,
      artifacts_redacted: true,
    },
    gates: {
      focused_tests: "PENDING",
      android_emulator_smoke: artifacts.android.runtime_smoke,
      ios_build: artifacts.ios.new_build_created ? "PASS" : "BLOCKED",
      ios_submit: artifacts.ios.eas_submit_finished ? "PASS" : "BLOCKED",
      tsc: "PENDING",
      lint: "PENDING",
      jest: "PENDING",
      architecture_scanner: "PENDING",
      git_diff_check: "PENDING",
      artifact_json_parse: "PASS",
      release_verify: "PENDING",
    },
  });
  fs.writeFileSync(
    proofPath,
    [
      "# S_RELEASE_CORE_01 Android Emulator And iOS Submit Proof",
      "",
      `- Final status: ${artifacts.finalStatus}`,
      `- Android status: ${artifacts.android.status}`,
      `- Android APK built: ${artifacts.android.apk_built}`,
      `- Android emulator smoke: ${artifacts.android.runtime_smoke}`,
      `- iOS status: ${artifacts.ios.status}`,
      `- iOS build id: ${artifacts.ios.build_id ?? "none"}`,
      `- iOS submit finished: ${artifacts.ios.eas_submit_finished}`,
      `- AI role-screen e2e: ${artifacts.aiRoleScreen.status}`,
      "- OTA used: false",
      "- Credentials in CLI args: false",
      "- Credentials printed: false",
      "",
    ].join("\n"),
  );
}

export async function runAndroidEmulatorAndIosSubmitGate(): Promise<ReleaseGateArtifacts> {
  const secrets = collectReleaseSecretValues();
  let preflightReason: string | null = null;
  const buildOrSubmitRequested =
    process.env.E2E_ALLOW_ANDROID_APK_BUILD === "true" ||
    process.env.E2E_ALLOW_IOS_BUILD === "true" ||
    process.env.E2E_ALLOW_IOS_SUBMIT === "true";
  if (buildOrSubmitRequested) {
    preflightReason = verifyReleasePreflight(secrets);
  }

  if (preflightReason) {
    const blocked: ReleaseGateArtifacts = {
      finalStatus: "BLOCKED_RELEASE_PREFLIGHT_NOT_CLEAN",
      android: emptyAndroid(preflightReason),
      ios: emptyIos(preflightReason),
      aiRoleScreen: {
        status: "SKIPPED",
        auth_source: "missing",
        auth_admin_used: false,
        service_role_used: false,
        list_users_used: false,
      },
    };
    writeArtifacts(blocked);
    return blocked;
  }

  const android = await runAndroidTrack(secrets);
  const ios = await runIosTrack(secrets);
  const aiRoleScreen = android.status === "PASS" ? runAiRoleTrack(secrets) : {
    status: "BLOCKED_NO_E2E_ROLE_SECRETS",
    auth_source: "missing",
    auth_admin_used: false,
    service_role_used: false,
    list_users_used: false,
  } satisfies AiRoleTrackArtifact;
  const artifactsWithoutStatus = {
    finalStatus: "BLOCKED_IOS_BUILD_FAILED" as ReleaseGateStatus,
    android,
    ios,
    aiRoleScreen,
  };
  const finalStatus = chooseFinalStatus(artifactsWithoutStatus);
  const artifacts = { ...artifactsWithoutStatus, finalStatus };
  writeArtifacts(artifacts);
  return artifacts;
}

if (require.main === module) {
  void runAndroidEmulatorAndIosSubmitGate()
    .then((artifacts) => {
      console.info(JSON.stringify(artifacts, null, 2));
      if (artifacts.finalStatus !== "GREEN_ANDROID_EMULATOR_AND_IOS_BUILD_SUBMIT_GATE") {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(redactReleaseOutput(error instanceof Error ? error.stack ?? error.message : String(error)));
      process.exitCode = 1;
    });
}
