import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

type IosDeliveryStatus =
  | "GREEN_IOS_AI_SCREEN_MAGIC_DELIVERY_READY"
  | "BLOCKED_IOS_RUNTIME_PROOF_HOST_UNAVAILABLE"
  | "BLOCKED_IOS_NO_BOOTED_SIMULATOR"
  | "BLOCKED_IOS_ROUTE_OPEN_FAILED"
  | "BLOCKED_IOS_UI_PROOF_NOT_CAPTURED";

type DeliveryPath =
  | "none_required_no_app_code_changed"
  | "dev_reload_or_eas_update_required"
  | "native_build_required"
  | "unknown";

type IosDeliveryArtifact = {
  wave: "S_MOBILE_AI_RUNTIME_DELIVERY_TARGETABILITY_SIGNOFF";
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
const wave = "S_MOBILE_AI_RUNTIME_DELIVERY_TARGETABILITY_SIGNOFF";
const artifactPrefix = path.join(projectRoot, "artifacts", wave);
const iosArtifactPath = `${artifactPrefix}_ios.json`;
const matrixArtifactPath = `${artifactPrefix}_matrix.json`;
const proofArtifactPath = `${artifactPrefix}_proof.md`;

const coreRoutes = [
  "rik:///ai-command-center",
  "rik:///ai-procurement-copilot",
  "rik:///ai-approval-inbox",
] as const;

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

function writeProof(artifact: IosDeliveryArtifact): void {
  fs.writeFileSync(
    proofArtifactPath,
    [
      `# ${wave}`,
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
    openedRoutes?: string[];
    visibleRoutes?: string[];
  },
): IosDeliveryArtifact {
  const nativeBuildRequired = params.deliveryPath === "native_build_required";
  const green = params.status === "GREEN_IOS_AI_SCREEN_MAGIC_DELIVERY_READY";
  return {
    wave,
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
    ios_delivery_path_documented: params.deliveryPath !== "unknown",
    ios_runtime_host_available: params.hostAvailable,
    ios_booted_simulator_available: params.bootedSimulator,
    ios_routes_required: [...coreRoutes],
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

function writeArtifacts(artifact: IosDeliveryArtifact): IosDeliveryArtifact {
  const matrix = {
    wave,
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
  return artifact;
}

export function verifyAiScreenMagicIosDelivery(scope = wave): IosDeliveryArtifact {
  const appCodeFiles = changedFiles().filter(isRuntimeAppFile);
  const deliveryPath = resolveDeliveryPath(appCodeFiles);

  if (process.platform !== "darwin" || !commandExists("xcrun", ["--version"])) {
    return writeArtifacts(
      buildArtifact({
        scope,
        status: "BLOCKED_IOS_RUNTIME_PROOF_HOST_UNAVAILABLE",
        exactReason:
          "iOS runtime UI proof requires a macOS host with Xcode simctl or a physical iOS proof path; this run did not rebuild, publish OTA, or reuse Android proof as iOS proof.",
        appCodeFiles,
        deliveryPath,
        hostAvailable: false,
        bootedSimulator: false,
      }),
    );
  }

  if (!hasBootedIosSimulator()) {
    return writeArtifacts(
      buildArtifact({
        scope,
        status: "BLOCKED_IOS_NO_BOOTED_SIMULATOR",
        exactReason:
          "macOS/Xcode is available, but no booted iOS simulator was available for core AI route proof.",
        appCodeFiles,
        deliveryPath,
        hostAvailable: true,
        bootedSimulator: false,
      }),
    );
  }

  const openedRoutes: string[] = [];
  for (const route of coreRoutes) {
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
      openedRoutes,
    }),
  );
}

function readScopeArg(): string {
  const scopeIndex = process.argv.indexOf("--scope");
  if (scopeIndex >= 0 && process.argv[scopeIndex + 1]) return process.argv[scopeIndex + 1];
  return wave;
}

if (require.main === module) {
  const artifact = verifyAiScreenMagicIosDelivery(readScopeArg());
  console.info(JSON.stringify(artifact, null, 2));
  if (artifact.final_status !== "GREEN_IOS_AI_SCREEN_MAGIC_DELIVERY_READY") {
    process.exitCode = 1;
  }
}
