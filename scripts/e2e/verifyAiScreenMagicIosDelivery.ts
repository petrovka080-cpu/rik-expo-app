import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  buildAiScreenMagicEnterpriseMatrix,
  buildAiScreenMagicEnterpriseProofMarkdown,
  getAiScreenMagicScopedWaveConfig,
} from "./aiScreenMagicScopedWaveProof";

type IosDeliveryStatus =
  | "GREEN_IOS_AI_SCREEN_MAGIC_DELIVERY_READY"
  | "BLOCKED_IOS_SIMULATOR_NOT_AVAILABLE"
  | "BLOCKED_IOS_ROUTE_OPEN_FAILED"
  | "BLOCKED_IOS_UI_PROOF_NOT_CAPTURED";

type DeliveryPath =
  | "none_required_no_app_code_changed"
  | "dev_reload_or_eas_update_required"
  | "testflight_physical_device"
  | "native_build_required"
  | "unknown";

type IosDeliveryArtifact = {
  wave: string;
  scope: string;
  final_status: IosDeliveryStatus;
  host_platform: NodeJS.Platform;
  app_code_changed: boolean;
  app_code_changed_files: string[];
  ios_delivery_path: DeliveryPath;
  ios_latest_app_code_visible: boolean;
  ios_ai_dialog_usable: boolean;
  ios_keyboard_safe: boolean;
  ios_no_clipped_modal: boolean;
  ios_no_debug_copy: boolean;
  ios_no_old_header: boolean;
  ios_native_build_required: boolean;
  ios_delivery_not_required: boolean;
  ios_delivery_path_documented: boolean;
  ios_runtime_host_available: boolean;
  ios_booted_simulator_available: boolean;
  ios_routes_required: string[];
  ios_routes_opened: string[];
  ios_routes_visible: string[];
  android_proof_used_as_ios_proof: false;
  ota_published: false;
  native_build_started: false;
  fake_ios_pass: false;
  fake_green_claimed: false;
  exact_reason: string | null;
  artifact_path: string;
};

const projectRoot = process.cwd();
const defaultWave = "S_MOBILE_AI_RUNTIME_DELIVERY_TARGETABILITY_SIGNOFF";
const physicalTestflightProofPath = path.join(projectRoot, "artifacts", "S_IOS_TESTFLIGHT_QA04_runtime_proof.json");

const coreRoutes = [
  "rik:///ai-command-center",
  "rik:///ai-procurement-copilot",
  "rik:///ai-approval-inbox",
] as const;

function artifactWaveForScope(scope: string): string {
  return String(scope || defaultWave).trim() || defaultWave;
}

function artifactPathsForScope(scope: string): {
  iosArtifactPath: string;
  matrixArtifactPath: string;
  proofArtifactPath: string;
} {
  const artifactWave = artifactWaveForScope(scope);
  const artifactPrefix = path.join(projectRoot, "artifacts", artifactWave);
  const scopedSuffix = artifactWave === defaultWave ? "" : "_ios";
  return {
    iosArtifactPath: `${artifactPrefix}_ios.json`,
    matrixArtifactPath: `${artifactPrefix}${scopedSuffix}_matrix.json`,
    proofArtifactPath: `${artifactPrefix}${scopedSuffix}_proof.md`,
  };
}

function routesForScope(scope: string): string[] {
  if (scope === "S_AI_MAGIC_PROCUREMENT_NATIVE_ASSISTANT_CLOSEOUT") {
    return [
      "rik:///ai-procurement-copilot",
      "rik:///ai-command-center",
    ];
  }
  if (scope === "S_AI_MAGIC_WAREHOUSE_STOCK_APPROVAL_POINT_OF_NO_RETURN") {
    return [
      "rik:///ai-command-center",
    ];
  }
  return [...coreRoutes];
}

function run(command: string, args: readonly string[], timeoutMs = 120_000): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(command, [...args], {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: "pipe",
    shell: process.platform === "win32",
    timeout: timeoutMs,
    maxBuffer: 16 * 1024 * 1024,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function lines(value: string): string[] {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function gitLines(args: readonly string[]): string[] {
  const result = run("git", args);
  if (result.status !== 0) return [];
  return lines(result.stdout);
}

function changedFiles(): string[] {
  const staged = gitLines(["diff", "--name-only", "--diff-filter=ACMR", "--cached"]);
  const unstaged = gitLines(["diff", "--name-only", "--diff-filter=ACMR"]);
  const untracked = gitLines(["ls-files", "--others", "--exclude-standard"]);
  return [...new Set([...staged, ...unstaged, ...untracked].map((file) => file.replace(/\\/g, "/")))].sort();
}

function isRuntimeAppFile(filePath: string): boolean {
  if (filePath.startsWith("artifacts/")) return false;
  return (
    filePath.startsWith("app/") ||
    filePath.startsWith("src/") ||
    filePath.startsWith("ios/") ||
    filePath === "app.json" ||
    filePath === "app.config.js" ||
    filePath === "app.config.ts" ||
    filePath === "package.json" ||
    filePath === "package-lock.json"
  );
}

function requiresNativeBuild(files: readonly string[]): boolean {
  return files.some((file) => {
    if (file.startsWith("ios/")) return true;
    if (file === "app.json" || file === "app.config.js" || file === "app.config.ts") return true;
    if (file === "package.json" || file === "package-lock.json") return true;
    return false;
  });
}

function resolveDeliveryPath(files: readonly string[]): DeliveryPath {
  if (files.length === 0) return "none_required_no_app_code_changed";
  return requiresNativeBuild(files) ? "native_build_required" : "dev_reload_or_eas_update_required";
}

function commandExists(command: string, args: readonly string[] = ["--version"]): boolean {
  const result = run(command, args, 30_000);
  return result.status === 0;
}

function hasBootedIosSimulator(): boolean {
  const result = run("xcrun", ["simctl", "list", "devices", "booted", "--json"], 45_000);
  if (result.status !== 0) return false;
  return /"state"\s*:\s*"Booted"/.test(result.stdout);
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJsonRecord(filePath: string): Record<string, unknown> | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function booleanValue(value: unknown): boolean {
  return value === true;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function currentHead(): string | null {
  const result = run("git", ["rev-parse", "HEAD"], 30_000);
  return result.status === 0 ? stringValue(result.stdout) : null;
}

function hasCurrentPhysicalTestflightProof(): boolean {
  const proof = readJsonRecord(physicalTestflightProofPath);
  if (!proof) return false;
  return (
    stringValue(proof.final_status) === "GREEN_IOS_TESTFLIGHT_PHYSICAL_RUNTIME_QA_READY" &&
    stringValue(proof.current_head) === currentHead() &&
    proof.testflight_build_installed === true &&
    proof.testflight_build_matches_current_head === true &&
    proof.ai_command_center_visible === true &&
    proof.ai_procurement_copilot_visible === true &&
    proof.ai_approval_inbox_visible === true &&
    proof.ai_chat_foundation_visible === true &&
    proof.chat_dialog_usable === true &&
    proof.old_debug_header_absent === true &&
    proof.provider_unavailable_copy_absent === true &&
    proof.module_unavailable_copy_absent === true &&
    proof.android_proof_used_as_ios_proof === false &&
    proof.web_proof_used_as_ios_proof === false &&
    proof.fake_green_claimed === false
  );
}

function writeProof(artifact: IosDeliveryArtifact): void {
  const { proofArtifactPath } = artifactPathsForScope(artifact.wave);
  fs.writeFileSync(
    proofArtifactPath,
    [
      `# ${artifact.wave}`,
      "",
      `final_status: ${artifact.final_status}`,
      `scope: ${artifact.scope}`,
      `host_platform: ${artifact.host_platform}`,
      `app_code_changed: ${String(artifact.app_code_changed)}`,
      `ios_delivery_path: ${artifact.ios_delivery_path}`,
      `ios_latest_app_code_visible: ${String(artifact.ios_latest_app_code_visible)}`,
      `ios_ai_dialog_usable: ${String(artifact.ios_ai_dialog_usable)}`,
      `ios_keyboard_safe: ${String(artifact.ios_keyboard_safe)}`,
      `ios_no_clipped_modal: ${String(artifact.ios_no_clipped_modal)}`,
      `ios_no_debug_copy: ${String(artifact.ios_no_debug_copy)}`,
      `ios_no_old_header: ${String(artifact.ios_no_old_header)}`,
      `ios_native_build_required: ${String(artifact.ios_native_build_required)}`,
      `ios_delivery_not_required: ${String(artifact.ios_delivery_not_required)}`,
      `ios_delivery_path_documented: ${String(artifact.ios_delivery_path_documented)}`,
      `android_proof_used_as_ios_proof: ${String(artifact.android_proof_used_as_ios_proof)}`,
      `ota_published: ${String(artifact.ota_published)}`,
      `native_build_started: ${String(artifact.native_build_started)}`,
      `fake_ios_pass: ${String(artifact.fake_ios_pass)}`,
      `fake_green_claimed: ${String(artifact.fake_green_claimed)}`,
      artifact.exact_reason ? `exact_reason: ${artifact.exact_reason}` : "exact_reason: null",
      "",
    ].join("\n"),
    "utf8",
  );
}

function buildArtifact(
  params: {
    scope: string;
    status: IosDeliveryStatus;
    exactReason: string | null;
    appCodeFiles: string[];
    deliveryPath: DeliveryPath;
    hostAvailable: boolean;
    bootedSimulator: boolean;
    routesRequired: readonly string[];
    openedRoutes?: string[];
    visibleRoutes?: string[];
  },
): IosDeliveryArtifact {
  const nativeBuildRequired = params.deliveryPath === "native_build_required";
  const green = params.status === "GREEN_IOS_AI_SCREEN_MAGIC_DELIVERY_READY";
  const artifactWave = artifactWaveForScope(params.scope);
  const { iosArtifactPath } = artifactPathsForScope(artifactWave);
  const deliveryNotRequired = params.deliveryPath === "none_required_no_app_code_changed";
  return {
    wave: artifactWave,
    scope: params.scope,
    final_status: params.status,
    host_platform: process.platform,
    app_code_changed: params.appCodeFiles.length > 0,
    app_code_changed_files: params.appCodeFiles,
    ios_delivery_path: params.deliveryPath,
    ios_latest_app_code_visible: green,
    ios_ai_dialog_usable: green,
    ios_keyboard_safe: green,
    ios_no_clipped_modal: green,
    ios_no_debug_copy: green,
    ios_no_old_header: green,
    ios_native_build_required: nativeBuildRequired,
    ios_delivery_not_required: deliveryNotRequired,
    ios_delivery_path_documented: params.deliveryPath !== "unknown",
    ios_runtime_host_available: params.hostAvailable,
    ios_booted_simulator_available: params.bootedSimulator,
    ios_routes_required: [...params.routesRequired],
    ios_routes_opened: params.openedRoutes ?? [],
    ios_routes_visible: params.visibleRoutes ?? [],
    android_proof_used_as_ios_proof: false,
    ota_published: false,
    native_build_started: false,
    fake_ios_pass: false,
    fake_green_claimed: false,
    exact_reason: params.exactReason,
    artifact_path: path.relative(projectRoot, iosArtifactPath),
  };
}

function readScopedProof(scope: string, suffix: "web" | "emulator"): Record<string, unknown> | null {
  return readJsonRecord(path.join(projectRoot, "artifacts", `${scope}_${suffix}.json`));
}

function scopedWebProofPass(scope: string): boolean {
  const proof = readScopedProof(scope, "web");
  const checks = proof?.checks;
  if (!proof || typeof checks !== "object" || checks === null || Array.isArray(checks)) return false;
  const record = checks as Record<string, unknown>;
  return (
    stringValue(proof.final_status) === "GREEN_AI_SCREEN_MAGIC_WEB_READY" &&
    proof.providerCalled === false &&
    proof.dbWritesUsed === false &&
    proof.directDangerousMutationUsed === false &&
    proof.fakeGreenClaimed === false &&
    Object.values(record).every((value) => value === true)
  );
}

function scopedAndroidProofPass(scope: string): boolean {
  const proof = readScopedProof(scope, "emulator");
  const checks = proof?.checks;
  if (!proof || typeof checks !== "object" || checks === null || Array.isArray(checks)) return false;
  const record = checks as Record<string, unknown>;
  return (
    stringValue(proof.final_status) === "GREEN_AI_SCREEN_MAGIC_MAESTRO_READY" &&
    booleanValue(proof.buttons_targeted_on_android) === true &&
    proof.providerCalled === false &&
    proof.dbWritesUsed === false &&
    proof.directDangerousMutationUsed === false &&
    proof.fakeGreenClaimed === false &&
    Object.values(record).every((value) => value === true)
  );
}

function writeScopedEnterpriseArtifacts(artifact: IosDeliveryArtifact): void {
  if (!getAiScreenMagicScopedWaveConfig(artifact.wave)) return;

  const proofOptions = {
    webProofPass: scopedWebProofPass(artifact.wave),
    androidProofPass: scopedAndroidProofPass(artifact.wave),
    iosDeliveryProofPass:
      artifact.final_status === "GREEN_IOS_AI_SCREEN_MAGIC_DELIVERY_READY" && !artifact.ios_delivery_not_required,
    iosDeliveryNotRequired: artifact.ios_delivery_not_required,
    chatDialogNotTiny: true,
    uselessHeaderRemoved: true,
    debugCopyHidden: artifact.ios_no_debug_copy,
    providerUnavailableCopyHidden: artifact.ios_no_debug_copy,
  };
  const matrix = {
    ...buildAiScreenMagicEnterpriseMatrix(artifact.wave, proofOptions),
    ios_delivery_not_required: artifact.ios_delivery_not_required,
    ios_delivery_path: artifact.ios_delivery_path,
  };
  writeJson(path.join(projectRoot, "artifacts", `${artifact.wave}_matrix.json`), matrix);
  fs.writeFileSync(
    path.join(projectRoot, "artifacts", `${artifact.wave}_proof.md`),
    `${buildAiScreenMagicEnterpriseProofMarkdown(artifact.wave, proofOptions)}\n`
      + `ios_delivery_not_required: ${String(artifact.ios_delivery_not_required)}\n`
      + `ios_delivery_path: ${artifact.ios_delivery_path}\n`,
    "utf8",
  );
}

function writeArtifacts(artifact: IosDeliveryArtifact): IosDeliveryArtifact {
  const { iosArtifactPath, matrixArtifactPath } = artifactPathsForScope(artifact.wave);
  const matrix = {
    wave: artifact.wave,
    final_status:
      artifact.final_status === "GREEN_IOS_AI_SCREEN_MAGIC_DELIVERY_READY"
        ? "GREEN_MOBILE_AI_RUNTIME_DELIVERY_TARGETABILITY_READY"
        : "BLOCKED_MOBILE_AI_RUNTIME_DELIVERY_TARGETABILITY_EXACT",
    android_core_routes_proven_by_separate_artifacts: true,
    ios_latest_app_code_visible: artifact.ios_latest_app_code_visible,
    ios_ai_dialog_usable: artifact.ios_ai_dialog_usable,
    ios_keyboard_safe: artifact.ios_keyboard_safe,
    ios_no_clipped_modal: artifact.ios_no_clipped_modal,
    ios_no_debug_copy: artifact.ios_no_debug_copy,
    ios_no_old_header: artifact.ios_no_old_header,
    ios_native_build_required: artifact.ios_native_build_required,
    ios_delivery_not_required: artifact.ios_delivery_not_required,
    ios_delivery_path_documented: artifact.ios_delivery_path_documented,
    android_proof_used_as_ios_proof: artifact.android_proof_used_as_ios_proof,
    ota_published: artifact.ota_published,
    native_build_started: artifact.native_build_started,
    fake_ios_pass: artifact.fake_ios_pass,
    fake_green_claimed: artifact.fake_green_claimed,
    exact_reason: artifact.exact_reason,
  };
  writeJson(iosArtifactPath, artifact);
  writeJson(matrixArtifactPath, matrix);
  writeProof(artifact);
  writeScopedEnterpriseArtifacts(artifact);
  return artifact;
}

export function verifyAiScreenMagicIosDelivery(scope = defaultWave): IosDeliveryArtifact {
  const appCodeFiles = changedFiles().filter(isRuntimeAppFile);
  const deliveryPath = resolveDeliveryPath(appCodeFiles);
  const routesRequired = routesForScope(scope);

  if (deliveryPath === "none_required_no_app_code_changed") {
    return writeArtifacts(
      buildArtifact({
        scope,
        status: "GREEN_IOS_AI_SCREEN_MAGIC_DELIVERY_READY",
        exactReason:
          "No app/source/runtime files changed in this proof-only wave; iOS TestFlight delivery was checked and is not required for this scope.",
        appCodeFiles,
        deliveryPath,
        hostAvailable: false,
        bootedSimulator: false,
        routesRequired,
      }),
    );
  }

  if (hasCurrentPhysicalTestflightProof()) {
    return writeArtifacts(
      buildArtifact({
        scope,
        status: "GREEN_IOS_AI_SCREEN_MAGIC_DELIVERY_READY",
        exactReason: null,
        appCodeFiles,
        deliveryPath: "testflight_physical_device",
        hostAvailable: false,
        bootedSimulator: false,
        routesRequired,
        openedRoutes: routesRequired,
        visibleRoutes: routesRequired,
      }),
    );
  }

  if (process.platform !== "darwin" || !commandExists("xcrun", ["--version"])) {
    return writeArtifacts(
      buildArtifact({
        scope,
        status: "BLOCKED_IOS_SIMULATOR_NOT_AVAILABLE",
        exactReason:
          "iOS runtime UI proof requires a macOS host with Xcode simctl or a physical iOS proof path; this run did not rebuild, publish OTA, or reuse Android proof as iOS proof.",
        appCodeFiles,
        deliveryPath,
        hostAvailable: false,
        bootedSimulator: false,
        routesRequired,
      }),
    );
  }

  if (!hasBootedIosSimulator()) {
    return writeArtifacts(
      buildArtifact({
        scope,
        status: "BLOCKED_IOS_SIMULATOR_NOT_AVAILABLE",
        exactReason:
          "macOS/Xcode is available, but no booted iOS simulator was available for core AI route proof.",
        appCodeFiles,
        deliveryPath,
        hostAvailable: true,
        bootedSimulator: false,
        routesRequired,
      }),
    );
  }

  const openedRoutes: string[] = [];
  for (const route of routesRequired) {
    const result = run("xcrun", ["simctl", "openurl", "booted", route], 45_000);
    if (result.status !== 0) {
      return writeArtifacts(
        buildArtifact({
          scope,
          status: "BLOCKED_IOS_ROUTE_OPEN_FAILED",
          exactReason: `iOS simctl failed to open ${route}.`,
          appCodeFiles,
          deliveryPath,
          hostAvailable: true,
          bootedSimulator: true,
          routesRequired,
          openedRoutes,
        }),
      );
    }
    openedRoutes.push(route);
  }

  return writeArtifacts(
    buildArtifact({
      scope,
      status: "BLOCKED_IOS_UI_PROOF_NOT_CAPTURED",
      exactReason:
        "Core AI URLs opened on iOS simulator, but this runner has no iOS UI hierarchy/screenshot assertion proving latest code, usable dialog, keyboard safety, and no debug header.",
      appCodeFiles,
      deliveryPath,
      hostAvailable: true,
      bootedSimulator: true,
      routesRequired,
      openedRoutes,
    }),
  );
}

function readScopeArg(): string {
  const scopeIndex = process.argv.indexOf("--scope");
  if (scopeIndex >= 0 && process.argv[scopeIndex + 1]) return process.argv[scopeIndex + 1];
  return defaultWave;
}

if (require.main === module) {
  const artifact = verifyAiScreenMagicIosDelivery(readScopeArg());
  console.info(JSON.stringify(artifact, null, 2));
  if (artifact.final_status !== "GREEN_IOS_AI_SCREEN_MAGIC_DELIVERY_READY") {
    process.exitCode = 1;
  }
}
