import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { classifyNativeRuntimeImpact } from "./nativeRuntimeImpact";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const ARTIFACT_PREFIX = "S_IOS_EAS_UPDATE_CHANNEL_FAST_QA_NO_REBUILD";
const WAVE = "S_IOS_EAS_UPDATE_CHANNEL_FAST_QA_NO_REBUILD_GATE_POINT_OF_NO_RETURN";

type CommandProbe = {
  command: string;
  status: number | null;
  ok: boolean;
  stdout: string;
  stderr: string;
  parsedJson: unknown | null;
};

type ChannelBranchConfig = {
  channel: string;
  easBuildProfileChannel: string | null;
  configuredBranch: string | null;
  easLinkedBranch: string | null;
  mappingVerified: boolean;
};

type OtaChannelProofMatrix = {
  wave: typeof WAVE;
  final_status:
    | "GREEN_IOS_EAS_UPDATE_CHANNEL_FAST_QA_NO_REBUILD_READY"
    | "BLOCKED_NATIVE_RUNTIME_IMPACT_REQUIRES_IOS_BUILD"
    | "BLOCKED_IOS_OTA_CHANNEL_RUNTIME_MISMATCH"
    | "BLOCKED_IOS_OTA_UPDATE_NOT_PUBLISHED"
    | "BLOCKED_PHYSICAL_IPHONE_OTA_PROOF_MISSING"
    | "BLOCKED_EAS_CHANNEL_RUNTIME_INSPECTION_FAILED";
  native_impact_classifier_ready: boolean;
  native_impact_detected: boolean;
  ios_build_required: boolean;
  ota_allowed: boolean;
  installed_iphone_channel_detected: boolean;
  installed_iphone_runtime_detected: boolean;
  channel_branch_mapping_verified: boolean;
  update_runtime_matches_build_runtime: boolean;
  eas_update_published: boolean;
  published_to_correct_branch: boolean;
  published_platform_ios: boolean;
  iphone_received_update: boolean;
  iphone_ui_changes_visible: boolean;
  unnecessary_ios_build_created: false;
  runtime_version_bumped_for_js_only_change: boolean;
  wrong_channel_publish_found: boolean;
  release_verify_passed: boolean;
  fake_green_claimed: false;
};

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "").trim();
}

function runGit(args: string[]): string[] {
  const result = spawnSync("git", args, {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) return [];
  return (result.stdout ?? "")
    .split(/\r?\n/)
    .map(normalizePath)
    .filter(Boolean);
}

function readGitText(args: string[]): string | null {
  const result = spawnSync("git", args, {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return result.status === 0 ? result.stdout ?? "" : null;
}

function readDirtyWorktreeFiles(): string[] {
  return [
    ...new Set([
      ...runGit(["diff", "--name-only", "--diff-filter=ACMRTUXB", "HEAD", "--"]),
      ...runGit(["ls-files", "--others", "--exclude-standard"]),
    ]),
  ].sort();
}

function sortedJson(value: unknown): string {
  if (value === undefined) return "null";

  if (Array.isArray(value)) {
    return JSON.stringify(value.map((item) => JSON.parse(sortedJson(item))));
  }

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    return JSON.stringify(
      Object.keys(record)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = JSON.parse(sortedJson(record[key]));
          return acc;
        }, {}),
    );
  }

  return JSON.stringify(value);
}

function inferPackageJsonMutationKind(files: readonly string[]) {
  if (!files.includes("package.json")) return "none" as const;
  const previous = readJsonFromSource(readGitText(["show", "HEAD:package.json"]));
  const currentPath = path.join(PROJECT_ROOT, "package.json");
  const current = fs.existsSync(currentPath) ? readJsonFromSource(fs.readFileSync(currentPath, "utf8")) : null;
  if (!previous || !current) return "dependencies-or-native-risk" as const;

  const previousWithoutScripts = { ...previous };
  const currentWithoutScripts = { ...current };
  delete previousWithoutScripts.scripts;
  delete currentWithoutScripts.scripts;

  if (sortedJson(previous.scripts ?? {}) !== sortedJson(current.scripts ?? {}) &&
    sortedJson(previousWithoutScripts) === sortedJson(currentWithoutScripts)) {
    return "scripts-only" as const;
  }

  const previousDependencies = sortedJson({
    dependencies: previous.dependencies ?? {},
    devDependencies: previous.devDependencies ?? {},
    optionalDependencies: previous.optionalDependencies ?? {},
    peerDependencies: previous.peerDependencies ?? {},
  });
  const currentDependencies = sortedJson({
    dependencies: current.dependencies ?? {},
    devDependencies: current.devDependencies ?? {},
    optionalDependencies: current.optionalDependencies ?? {},
    peerDependencies: current.peerDependencies ?? {},
  });

  return previousDependencies === currentDependencies ? "non-runtime" as const : "dependencies-or-native-risk" as const;
}

function readJson(filePath: string): Record<string, unknown> | null {
  if (!fs.existsSync(filePath)) return null;
  return readJsonFromSource(fs.readFileSync(filePath, "utf8"));
}

function readJsonFromSource(source: string | null): Record<string, unknown> | null {
  if (!source) return null;
  const parsed: unknown = JSON.parse(source);
  return isRecord(parsed) ? parsed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function boolFromEnv(value: string | undefined): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function writeJsonArtifact(name: string, value: unknown): void {
  const artifactsDir = path.join(PROJECT_ROOT, "artifacts");
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeTextArtifact(name: string, value: string): void {
  const artifactsDir = path.join(PROJECT_ROOT, "artifacts");
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, name), value, "utf8");
}

function shellQuote(arg: string): string {
  return `"${arg.replace(/"/g, '""')}"`;
}

function parseJsonMaybe(value: string): unknown | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function runCommand(command: string): CommandProbe {
  const first = spawnSync(command, {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 16 * 1024 * 1024,
  });
  const stdout = first.stdout ?? "";
  const stderr = first.stderr ?? "";

  return {
    command,
    status: first.status,
    ok: first.status === 0,
    stdout,
    stderr,
    parsedJson: parseJsonMaybe(stdout),
  };
}

function easCommand(args: string[]): CommandProbe {
  const command = ["eas", ...args.map(shellQuote)].join(" ");
  const result = runCommand(command);
  const notFound = `${result.stdout}\n${result.stderr}`.toLowerCase().includes("not recognized") ||
    `${result.stdout}\n${result.stderr}`.toLowerCase().includes("command not found");

  if (!notFound) return result;

  return runCommand(["npx", "eas-cli", ...args.map(shellQuote)].join(" "));
}

function extractBranchFromChannelView(parsed: unknown, raw: string): string | null {
  if (isRecord(parsed)) {
    const branchMapping = isRecord(parsed.branchMapping) ? parsed.branchMapping : null;
    const branch = stringValue(parsed.branch) ?? stringValue(parsed.branchName) ?? stringValue(branchMapping?.branchId);
    if (branch) return branch;
  }

  const branchLine = raw.match(/Branch\s*[:│]\s*([A-Za-z0-9_.-]+)/i);
  return branchLine?.[1] ?? null;
}

function findFirstStringByKey(value: unknown, key: string): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstStringByKey(item, key);
      if (found) return found;
    }
    return null;
  }

  if (!isRecord(value)) return null;
  const direct = stringValue(value[key]);
  if (direct) return direct;

  for (const child of Object.values(value)) {
    const found = findFirstStringByKey(child, key);
    if (found) return found;
  }
  return null;
}

function findLatestIosBuild(parsed: unknown): Record<string, unknown> | null {
  if (!Array.isArray(parsed)) return null;
  const iosBuild = parsed.find((entry) => {
    if (!isRecord(entry)) return false;
    const platform = stringValue(entry.platform)?.toLowerCase();
    return platform === "ios";
  });
  return isRecord(iosBuild) ? iosBuild : null;
}

function buildChannelConfigs(params: {
  appJson: Record<string, unknown> | null;
  easJson: Record<string, unknown> | null;
  channelViews: Record<string, CommandProbe>;
}): ChannelBranchConfig[] {
  const expo = isRecord(params.appJson?.expo) ? params.appJson.expo : null;
  const extra = isRecord(expo?.extra) ? expo.extra : null;
  const release = isRecord(extra?.release) ? extra.release : null;
  const channelBranchMapping = isRecord(release?.channelBranchMapping) ? release.channelBranchMapping : {};
  const build = isRecord(params.easJson?.build) ? params.easJson.build : {};

  return ["development", "preview", "production"].map((channel) => {
    const profile = isRecord(build[channel]) ? build[channel] : null;
    const easBuildProfileChannel = stringValue(profile?.channel);
    const configuredBranch = stringValue(channelBranchMapping[channel]) ?? channel;
    const probe = params.channelViews[channel];
    const easLinkedBranch = probe ? extractBranchFromChannelView(probe.parsedJson, `${probe.stdout}\n${probe.stderr}`) : null;
    return {
      channel,
      easBuildProfileChannel,
      configuredBranch,
      easLinkedBranch,
      mappingVerified: easBuildProfileChannel === channel && (!easLinkedBranch || easLinkedBranch === configuredBranch),
    };
  });
}

function buildProofMarkdown(params: {
  matrix: OtaChannelProofMatrix;
  installedChannel: string | null;
  installedRuntime: string | null;
  linkedBranch: string | null;
  blockers: string[];
}): string {
  const lines = [
    `# ${WAVE}`,
    "",
    `Final status: ${params.matrix.final_status}`,
    "",
    "## OTA Rule",
    "",
    "- JS/UI/layout/AI text/backend-only changes: OTA path, no iOS build.",
    "- Native runtime/app config/dependency changes: new iOS build required.",
    "- Physical iPhone green requires installed channel/runtime and visible OTA result.",
    "",
    "## Current Mapping",
    "",
    `- installed channel: ${params.installedChannel ?? "BLOCKED_NOT_PROVIDED"}`,
    `- installed runtimeVersion: ${params.installedRuntime ?? "BLOCKED_NOT_PROVIDED"}`,
    `- linked branch: ${params.linkedBranch ?? "BLOCKED_NOT_DETECTED"}`,
    "",
    "## Blockers",
    "",
    ...(params.blockers.length > 0 ? params.blockers.map((blocker) => `- ${blocker}`) : ["- none"]),
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function main(): void {
  const args = new Set(process.argv.slice(2));
  const allowBlocked = args.has("--allow-blocked");
  const skipEas = args.has("--skip-eas") || boolFromEnv(process.env.IOS_OTA_SKIP_EAS_CLI);
  const changedFiles = readDirtyWorktreeFiles();
  const nativeImpact = classifyNativeRuntimeImpact({
    changedFiles,
    packageJsonMutationKind: inferPackageJsonMutationKind(changedFiles),
  });
  const appJson = readJson(path.join(PROJECT_ROOT, "app.json"));
  const easJson = readJson(path.join(PROJECT_ROOT, "eas.json"));

  const probes: Record<string, CommandProbe> = {};
  const channels = ["preview", "production"];
  const branches = ["preview", "production"];
  if (!skipEas) {
    probes.buildList = easCommand(["build:list", "--platform", "ios", "--limit", "10", "--json", "--non-interactive"]);
    probes.channelList = easCommand(["channel:list", "--json", "--non-interactive"]);
    for (const channel of channels) {
      probes[`channel:${channel}`] = easCommand(["channel:view", channel, "--json", "--non-interactive"]);
    }
    for (const branch of branches) {
      probes[`branch:${branch}`] = easCommand(["branch:view", branch, "--json", "--non-interactive"]);
      probes[`updates:${branch}`] = easCommand(["update:list", "--branch", branch, "--limit", "10", "--json", "--non-interactive"]);
    }
  }

  const channelConfigs = buildChannelConfigs({
    appJson,
    easJson,
    channelViews: {
      preview: probes["channel:preview"],
      production: probes["channel:production"],
    },
  });
  const latestIosBuild = findLatestIosBuild(probes.buildList?.parsedJson);
  const inferredChannel = stringValue(latestIosBuild?.channel) ?? stringValue(latestIosBuild?.buildProfile);
  const inferredRuntime = stringValue(latestIosBuild?.runtimeVersion);
  const installedChannel = stringValue(process.env.IOS_INSTALLED_CHANNEL) ?? inferredChannel;
  const installedRuntime = stringValue(process.env.IOS_INSTALLED_RUNTIME_VERSION) ?? inferredRuntime;
  const physicalInstalledChannelDetected = Boolean(stringValue(process.env.IOS_INSTALLED_CHANNEL));
  const physicalInstalledRuntimeDetected = Boolean(stringValue(process.env.IOS_INSTALLED_RUNTIME_VERSION));
  const selectedMapping = channelConfigs.find((config) => config.channel === installedChannel) ?? null;
  const linkedBranch = selectedMapping?.easLinkedBranch ?? selectedMapping?.configuredBranch ?? installedChannel;
  const latestUpdateProbe = linkedBranch ? probes[`updates:${linkedBranch}`] : null;
  const latestUpdateRuntime = findFirstStringByKey(latestUpdateProbe?.parsedJson, "runtimeVersion");
  const updateRuntimeMatchesBuildRuntime =
    Boolean(installedRuntime && latestUpdateRuntime && installedRuntime === latestUpdateRuntime) ||
    Boolean(installedRuntime && !latestUpdateRuntime && probes.buildList?.ok);
  const easCommandsOk = skipEas || Object.values(probes).every((probe) => probe.ok);
  const channelBranchMappingVerified = channelConfigs
    .filter((config) => config.channel === "preview" || config.channel === "production")
    .every((config) => config.mappingVerified);
  const easUpdatePublished = boolFromEnv(process.env.IOS_EAS_UPDATE_PUBLISHED);
  const publishedBranch = stringValue(process.env.IOS_PUBLISHED_UPDATE_BRANCH);
  const publishedPlatform = stringValue(process.env.IOS_PUBLISHED_UPDATE_PLATFORM);
  const publishedToCorrectBranch = easUpdatePublished && Boolean(linkedBranch && publishedBranch === linkedBranch);
  const publishedPlatformIos = easUpdatePublished && publishedPlatform === "ios";
  const iphoneReceivedUpdate = boolFromEnv(process.env.IOS_IPHONE_RECEIVED_UPDATE);
  const iphoneUiChangesVisible = boolFromEnv(process.env.IOS_IPHONE_UI_CHANGES_VISIBLE);
  const releaseVerifyPassed = boolFromEnv(process.env.RELEASE_VERIFY_PASSED);

  const blockers: string[] = [];
  if (nativeImpact.nativeImpact) {
    blockers.push("BLOCKED_NATIVE_RUNTIME_IMPACT_REQUIRES_IOS_BUILD");
  }
  if (!easCommandsOk) {
    blockers.push("BLOCKED_EAS_CHANNEL_RUNTIME_INSPECTION_FAILED");
  }
  if (!physicalInstalledChannelDetected || !physicalInstalledRuntimeDetected) {
    blockers.push("BLOCKED_PHYSICAL_IPHONE_INSTALLED_CHANNEL_RUNTIME_NOT_PROVIDED");
  }
  if (!channelBranchMappingVerified) {
    blockers.push("BLOCKED_EAS_CHANNEL_BRANCH_MAPPING_NOT_VERIFIED");
  }
  if (installedRuntime && latestUpdateRuntime && installedRuntime !== latestUpdateRuntime) {
    blockers.push("BLOCKED_IOS_OTA_CHANNEL_RUNTIME_MISMATCH");
  }
  if (!easUpdatePublished) {
    blockers.push("BLOCKED_IOS_OTA_UPDATE_NOT_PUBLISHED");
  }
  if (!iphoneReceivedUpdate || !iphoneUiChangesVisible) {
    blockers.push("BLOCKED_PHYSICAL_IPHONE_OTA_PROOF_MISSING");
  }

  const wrongChannelPublishFound = easUpdatePublished && (!publishedToCorrectBranch || !publishedPlatformIos);
  if (wrongChannelPublishFound) {
    blockers.push("BLOCKED_IOS_OTA_WRONG_BRANCH_OR_PLATFORM");
  }

  const finalStatus: OtaChannelProofMatrix["final_status"] = nativeImpact.nativeImpact
    ? "BLOCKED_NATIVE_RUNTIME_IMPACT_REQUIRES_IOS_BUILD"
    : !easCommandsOk
      ? "BLOCKED_EAS_CHANNEL_RUNTIME_INSPECTION_FAILED"
      : installedRuntime && latestUpdateRuntime && installedRuntime !== latestUpdateRuntime
        ? "BLOCKED_IOS_OTA_CHANNEL_RUNTIME_MISMATCH"
        : !easUpdatePublished
          ? "BLOCKED_IOS_OTA_UPDATE_NOT_PUBLISHED"
          : !iphoneReceivedUpdate || !iphoneUiChangesVisible || !physicalInstalledChannelDetected || !physicalInstalledRuntimeDetected
            ? "BLOCKED_PHYSICAL_IPHONE_OTA_PROOF_MISSING"
            : "GREEN_IOS_EAS_UPDATE_CHANNEL_FAST_QA_NO_REBUILD_READY";

  const matrix: OtaChannelProofMatrix = {
    wave: WAVE,
    final_status: finalStatus,
    native_impact_classifier_ready: true,
    native_impact_detected: nativeImpact.nativeImpact,
    ios_build_required: nativeImpact.iosBuildRequired,
    ota_allowed: nativeImpact.otaAllowed,
    installed_iphone_channel_detected: physicalInstalledChannelDetected,
    installed_iphone_runtime_detected: physicalInstalledRuntimeDetected,
    channel_branch_mapping_verified: channelBranchMappingVerified,
    update_runtime_matches_build_runtime: updateRuntimeMatchesBuildRuntime,
    eas_update_published: easUpdatePublished,
    published_to_correct_branch: publishedToCorrectBranch,
    published_platform_ios: publishedPlatformIos,
    iphone_received_update: iphoneReceivedUpdate,
    iphone_ui_changes_visible: iphoneUiChangesVisible,
    unnecessary_ios_build_created: false,
    runtime_version_bumped_for_js_only_change: nativeImpact.runtimeVersionChanged && !nativeImpact.nativeImpact,
    wrong_channel_publish_found: wrongChannelPublishFound,
    release_verify_passed: releaseVerifyPassed,
    fake_green_claimed: false,
  };

  const recommendedPublishCommand = linkedBranch
    ? `eas update --branch ${linkedBranch} --platform ios --message "QA update"`
    : null;

  writeJsonArtifact(`${ARTIFACT_PREFIX}_inventory.json`, {
    wave: WAVE,
    generatedAt: new Date().toISOString(),
    changedFilesCount: changedFiles.length,
    nativeImpactDetected: nativeImpact.nativeImpact,
    iosBuildRequired: nativeImpact.iosBuildRequired,
    otaAllowed: nativeImpact.otaAllowed,
    easCommandsAttempted: Object.fromEntries(
      Object.entries(probes).map(([key, probe]) => [
        key,
        {
          command: probe.command,
          status: probe.status,
          ok: probe.ok,
        },
      ]),
    ),
    skipEas,
    publishedByThisScript: false,
  });
  writeJsonArtifact(`${ARTIFACT_PREFIX}_channel_map.json`, {
    wave: WAVE,
    generatedAt: new Date().toISOString(),
    channelConfigs,
    probes: Object.fromEntries(
      Object.entries(probes)
        .filter(([key]) => key.startsWith("channel") || key.startsWith("branch"))
        .map(([key, probe]) => [key, { command: probe.command, status: probe.status, ok: probe.ok }]),
    ),
  });
  writeJsonArtifact(`${ARTIFACT_PREFIX}_runtime_map.json`, {
    wave: WAVE,
    generatedAt: new Date().toISOString(),
    installedChannel,
    installedRuntimeVersion: installedRuntime,
    physicalInstalledChannelDetected,
    physicalInstalledRuntimeDetected,
    latestIosBuild,
    latestUpdateRuntime,
    updateRuntimeMatchesBuildRuntime,
  });
  writeJsonArtifact(`${ARTIFACT_PREFIX}_update_publish.json`, {
    wave: WAVE,
    generatedAt: new Date().toISOString(),
    publishedByThisScript: false,
    easUpdatePublished,
    publishedBranch,
    publishedPlatform,
    linkedBranch,
    recommendedPublishCommand,
    publishGuard: "This proof never publishes OTA by default. Run the recommended command only after precommit gates pass.",
  });
  writeJsonArtifact(`${ARTIFACT_PREFIX}_iphone_qa.json`, {
    wave: WAVE,
    generatedAt: new Date().toISOString(),
    installedChannel,
    installedRuntimeVersion: installedRuntime,
    iphoneReceivedUpdate,
    iphoneUiChangesVisible,
    routesToVerify: [
      "/office/foreman",
      "/office/foreman materials",
      "/add",
      "/office/buyer",
      "/office/accountant",
      "/ai?context=foreman",
    ],
    blockers: blockers.filter((blocker) => blocker.includes("IPHONE") || blocker.includes("OTA_PROOF")),
  });
  writeJsonArtifact(`${ARTIFACT_PREFIX}_matrix.json`, matrix);
  writeTextArtifact(
    `${ARTIFACT_PREFIX}_proof.md`,
    buildProofMarkdown({ matrix, installedChannel, installedRuntime, linkedBranch, blockers }),
  );

  const output = {
    wave: WAVE,
    generatedAt: new Date().toISOString(),
    nativeImpact,
    channelConfigs,
    installedChannel,
    installedRuntimeVersion: installedRuntime,
    linkedBranch,
    latestUpdateRuntime,
    recommendedPublishCommand,
    blockers,
    matrix,
  };

  console.info(JSON.stringify(output, null, 2));

  if (matrix.final_status !== "GREEN_IOS_EAS_UPDATE_CHANNEL_FAST_QA_NO_REBUILD_READY" && !allowBlocked) {
    process.exit(1);
  }
}

main();
