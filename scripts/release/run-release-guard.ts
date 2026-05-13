import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { loadAgentOwnerFlagsIntoEnv } from "../env/checkRequiredAgentFlags";
import { getExpectedReleaseBranch, isCanonicalReleaseChannel } from "../../src/shared/release/releaseInfo";
import { PROJECT_ROOT, loadReleaseConfigSummary } from "./releaseConfig.shared";
import {
  RELEASE_GUARD_OTA_PUBLISH_MAX_BUFFER_BYTES,
  buildReleaseChangedFilesGitArgs,
  buildReleaseGuardOtaPublishCommand,
  buildReleaseGuardOtaPublishEnv,
  buildReleaseMetadataEnforcement,
  REQUIRED_RELEASE_GATES,
  buildReleaseGuardMigrationPolicy,
  classifyPackageJsonMutation,
  classifyReleaseChanges,
  evaluateReleaseGuardReadiness,
  parseEasUpdateOutput,
  resolveReleaseGuardCommitRange,
  resolveReleaseGuardPath,
  resolveReleaseRepoSync,
  resolveTrackedEnvFilePolicy,
  type PackageJsonMutationKind,
  type ReleaseGateDefinition,
  type ReleaseGateResult,
  type ReleaseGuardMode,
  type ReleaseGuardReport,
  type ReleaseRepoState,
} from "./releaseGuard.shared";

type ParsedArgs = {
  mode: ReleaseGuardMode;
  channel: string | null;
  message: string | null;
  json: boolean;
  dryRun: boolean;
  reportFile: string | null;
  requireArtifacts: string[];
  range: string | null;
  rolloutPercentage: number | null;
};

function parseRolloutPercentage(rawValue: string | undefined): number | null {
  if (rawValue == null) {
    return null;
  }

  if (!/^\d+$/.test(rawValue)) {
    throw new Error("--rollout-percentage must be an integer between 1 and 100.");
  }

  const value = Number(rawValue);
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    throw new Error("--rollout-percentage must be an integer between 1 and 100.");
  }

  return value;
}

function parseArgs(argv: string[]): ParsedArgs {
  const [modeValue, ...rest] = argv;
  if (modeValue !== "preflight" && modeValue !== "verify" && modeValue !== "ota") {
    throw new Error('Usage: tsx scripts/release/run-release-guard.ts <preflight|verify|ota> [--channel <channel>] [--message "<message>"] [--rollout-percentage <1-100>] [--json] [--dry-run] [--report-file <path>] [--require-artifact <path>] [--range <git-range>]');
  }

  const values = new Map<string, string[]>();
  const flags = new Set<string>();

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (token === "--json" || token === "--dry-run") {
      flags.add(token);
      continue;
    }

    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument "${token}".`);
    }

    const next = rest[index + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for argument "${token}".`);
    }

    const bucket = values.get(token) ?? [];
    bucket.push(next);
    values.set(token, bucket);
    index += 1;
  }

  const rolloutPercentage = parseRolloutPercentage(values.get("--rollout-percentage")?.[0]);
  if (rolloutPercentage != null && modeValue !== "ota") {
    throw new Error("--rollout-percentage is only supported in ota mode.");
  }

  return {
    mode: modeValue,
    channel: values.get("--channel")?.[0] ?? null,
    message: values.get("--message")?.[0] ?? null,
    json: flags.has("--json"),
    dryRun: flags.has("--dry-run"),
    reportFile: values.get("--report-file")?.[0] ?? null,
    requireArtifacts: values.get("--require-artifact") ?? [],
    range: values.get("--range")?.[0] ?? null,
    rolloutPercentage,
  };
}

function readCommand(command: string): string {
  return execSync(command, {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function readGitCount(args: string[]): number {
  const result = spawnSync("git", args, {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    return 0;
  }

  const value = Number(result.stdout.trim());
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function hasHeadParent(): boolean {
  return spawnSync("git", ["rev-parse", "--verify", "HEAD^"], {
    cwd: PROJECT_ROOT,
    stdio: "ignore",
  }).status === 0;
}

function readChangedFiles(range: string): string[] {
  const result = spawnSync("git", buildReleaseChangedFilesGitArgs(range), {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    const message = result.stderr?.trim() || `git changed-files read failed for range ${range}`;
    throw new Error(message);
  }

  return result.stdout
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function resolveRangeRefs(range: string): { baseRef: string | null; headRef: string } {
  const parts = range.split("..");
  if (parts.length === 2) {
    return {
      baseRef: parts[0] || null,
      headRef: parts[1] || "HEAD",
    };
  }

  return {
    baseRef: null,
    headRef: range || "HEAD",
  };
}

function readGitObject(refSpec: string): string | null {
  const result = spawnSync("git", ["show", refSpec], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    return null;
  }

  return result.stdout;
}

function readCurrentFile(relativePath: string): string | null {
  const absolutePath = path.join(PROJECT_ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }

  return fs.readFileSync(absolutePath, "utf8");
}

function readTrackedFiles(): string[] {
  const result = spawnSync("git", ["ls-files"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    return [];
  }

  return result.stdout
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function readPackageJsonMutationKind(range: string, changedFiles: string[]): PackageJsonMutationKind {
  if (!changedFiles.includes("package.json")) {
    return "none";
  }

  const refs = resolveRangeRefs(range);
  const previousSource = refs.baseRef ? readGitObject(`${refs.baseRef}:package.json`) : null;
  const currentSource = refs.headRef === "HEAD" ? readCurrentFile("package.json") : readGitObject(`${refs.headRef}:package.json`);
  return classifyPackageJsonMutation({
    previousSource,
    currentSource,
  });
}

function readRepoState(): ReleaseRepoState {
  const gitBranch = readCommand("git branch --show-current");
  const headCommit = readCommand("git rev-parse HEAD");
  const originMainCommit = readCommand("git rev-parse origin/main");
  const worktreeClean = readCommand("git status --short").length === 0;
  const envFilePolicy = resolveTrackedEnvFilePolicy(readTrackedFiles());
  const localCommitsAheadOriginMain = readGitCount(["rev-list", "--count", "origin/main..HEAD"]);
  const originMainCommitsAheadHead = readGitCount(["rev-list", "--count", "HEAD..origin/main"]);
  const sync = resolveReleaseRepoSync({
    headMatchesOriginMain: headCommit === originMainCommit,
    localCommitsAheadOriginMain,
    originMainCommitsAheadHead,
  });

  return {
    gitBranch,
    headCommit,
    originMainCommit,
    worktreeClean,
    envFilePolicyValid: envFilePolicy.envFilePolicyValid,
    trackedEnvFiles: envFilePolicy.trackedEnvFiles,
    unsafeTrackedEnvFiles: envFilePolicy.unsafeTrackedEnvFiles,
    headMatchesOriginMain: headCommit === originMainCommit,
    localCommitsAheadOriginMain,
    originMainCommitsAheadHead,
    syncStatus: sync.syncStatus,
    syncAction: sync.syncAction,
    requiredSyncApprovalKeys: sync.requiredSyncApprovalKeys,
  };
}

function runGate(gate: ReleaseGateDefinition): ReleaseGateResult {
  const result = spawnSync(gate.command, {
    cwd: PROJECT_ROOT,
    shell: true,
    stdio: "inherit",
  });

  return {
    ...gate,
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status ?? 1,
  };
}

function ensureArtifacts(requiredArtifacts: string[]): string[] {
  return requiredArtifacts.filter((artifactPath) => !fs.existsSync(resolveReleaseGuardPath(PROJECT_ROOT, artifactPath)));
}

function writeReport(reportFile: string | null, report: ReleaseGuardReport) {
  if (!reportFile) {
    return;
  }

  const absolutePath = resolveReleaseGuardPath(PROJECT_ROOT, reportFile);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, JSON.stringify(report, null, 2) + "\n", "utf8");
}

function printHumanReport(report: ReleaseGuardReport) {
  console.info(`Mode: ${report.mode}`);
  console.info(`Commit range: ${report.commitRange}`);
  console.info(`HEAD: ${report.repo.headCommit}`);
  console.info(`origin/main: ${report.repo.originMainCommit}`);
  console.info(`Local commits ahead origin/main: ${report.repo.localCommitsAheadOriginMain}`);
  console.info(`origin/main commits ahead HEAD: ${report.repo.originMainCommitsAheadHead}`);
  console.info(`Repo sync status: ${report.repo.syncStatus}`);
  console.info(`Repo sync action: ${report.repo.syncAction}`);
  if (report.repo.requiredSyncApprovalKeys.length > 0) {
    console.info(`Required sync approval keys: ${report.repo.requiredSyncApprovalKeys.join(", ")}`);
  }
  console.info(`Worktree clean: ${String(report.repo.worktreeClean)}`);
  console.info(`Env file policy valid: ${String(report.repo.envFilePolicyValid)}`);
  if (report.repo.trackedEnvFiles.length > 0) {
    console.info(`Tracked env files: ${report.repo.trackedEnvFiles.join(", ")}`);
  }
  if (report.repo.unsafeTrackedEnvFiles.length > 0) {
    console.info(`Unsafe tracked env files: ${report.repo.unsafeTrackedEnvFiles.join(", ")}`);
  }
  console.info(`Classification: ${report.classification.kind}`);
  console.info(`Runtime strategy: ${report.runtimePolicy.runtimeVersionStrategy}`);
  console.info(`Resolved runtime: ${report.runtimePolicy.resolvedRuntimeVersion}`);
  console.info(`Runtime policy: ${report.runtimePolicy.runtimePolicy}`);
  console.info(`Build required: ${String(report.runtimePolicy.buildRequired)}`);
  console.info(`Supabase migrations changed: ${String(report.migrationPolicy.migrationFiles.length)}`);
  console.info(`Production DB migration approval required: ${String(report.migrationPolicy.productionDbApprovalRequired)}`);
  if (report.migrationPolicy.requiredApprovalKeys.length > 0) {
    console.info(`Required migration approval keys: ${report.migrationPolicy.requiredApprovalKeys.join(", ")}`);
  }
  if (report.migrationPolicy.nextSafeWave) {
    console.info(`Next migration safe wave: ${report.migrationPolicy.nextSafeWave}`);
  }
  console.info(`Updates enabled: ${String(report.startupPolicy.updatesEnabled)}`);
  console.info(`Check automatically: ${report.startupPolicy.checkAutomatically}`);
  console.info(
    `Fallback timeout: ${
      report.startupPolicy.fallbackToCacheTimeout == null ? "unknown" : report.startupPolicy.fallbackToCacheTimeout
    }`,
  );
  console.info(`Startup policy valid: ${String(report.startupPolicy.startupPolicyValid)}`);
  if (report.classification.changeClass) {
    console.info(`Change class: ${report.classification.changeClass}`);
  }
  console.info(`OTA disposition: ${report.readiness.otaDisposition}`);
  if (report.targetChannel) {
    console.info(`Target channel: ${report.targetChannel}`);
  }
  if (report.expectedBranch) {
    console.info(`Expected branch: ${report.expectedBranch}`);
  }
  if (report.rolloutPercentage != null) {
    console.info(`Rollout percentage: ${report.rolloutPercentage}`);
  }

  console.info("");
  console.info("Required gates:");
  for (const gate of report.gates) {
    console.info(`- ${gate.name}: ${gate.status}`);
  }

  console.info("");
  console.info("Changed files:");
  for (const filePath of report.classification.files) {
    console.info(`- ${filePath}`);
  }

  console.info("");
  console.info("Reasons:");
  for (const reason of report.classification.reasons) {
    console.info(`- ${reason}`);
  }

  if (report.missingArtifacts.length > 0) {
    console.info("");
    console.info("Missing artifacts:");
    for (const artifact of report.missingArtifacts) {
      console.info(`- ${artifact}`);
    }
  }

  if (report.migrationPolicy.risks.length > 0) {
    console.info("");
    console.info("Supabase migration policy:");
    for (const risk of report.migrationPolicy.risks) {
      console.info(`- ${risk.filePath}: ${risk.riskLevel}`);
      for (const reason of risk.reasons) {
        console.info(`  - ${reason}`);
      }
    }
  }

  if (report.readiness.blockers.length > 0) {
    console.info("");
    console.info("Blockers:");
    for (const blocker of report.readiness.blockers) {
      console.info(`- ${blocker}`);
    }
  }

  if (report.otaPublish) {
    console.info("");
    console.info("OTA metadata:");
    console.info(`- updateGroupId: ${report.otaPublish.updateGroupId}`);
    console.info(`- androidUpdateId: ${report.otaPublish.androidUpdateId}`);
    console.info(`- iosUpdateId: ${report.otaPublish.iosUpdateId}`);
    console.info(`- dashboardUrl: ${report.otaPublish.dashboardUrl}`);
  }
}

function assertCanonicalChannel(channel: string | null): string | null {
  if (!channel) {
    return null;
  }

  if (!isCanonicalReleaseChannel(channel)) {
    throw new Error(`Unsupported --channel "${channel}". Allowed values: development, preview, production.`);
  }

  return channel;
}

function buildBaseReport(
  args: ParsedArgs,
  gates: ReleaseGateResult[],
  changedFiles: string[],
  repo: ReleaseRepoState,
  approvalEnv: NodeJS.ProcessEnv,
): ReleaseGuardReport {
  const configSummary = loadReleaseConfigSummary();
  const packageJsonMutationKind = readPackageJsonMutationKind(args.range ?? "HEAD", changedFiles);
  const classification = classifyReleaseChanges({
    changedFiles,
    packageJsonMutationKind,
  });
  const migrationPolicy = buildReleaseGuardMigrationPolicy({
    changedFiles,
    readFile: readCurrentFile,
    approvalEnv,
  });
  const targetChannel = assertCanonicalChannel(args.channel);
  const expectedBranch = targetChannel ? getExpectedReleaseBranch(targetChannel) : null;
  const missingArtifacts = ensureArtifacts(args.requireArtifacts);
  const readiness = evaluateReleaseGuardReadiness({
    mode: args.mode,
    repo,
    gates,
    classification,
    migrationPolicy,
    runtimePolicy: {
      resolvedRuntimeVersion: configSummary.runtimeVersion,
      runtimePolicy: configSummary.runtimePolicy,
      runtimeVersionStrategy: configSummary.runtimeVersionStrategy,
      runtimePolicyValid: configSummary.runtimePolicyValid,
      runtimePolicyReason: configSummary.runtimePolicyReason,
      runtimeProofConsistent: configSummary.runtimeProofConsistent,
      runtimeProofReason: configSummary.runtimeProofReason,
      buildRequired: classification.kind === "build-required",
    },
    startupPolicy: {
      updatesEnabled: configSummary.updatesEnabled,
      checkAutomatically: configSummary.checkAutomatically,
      fallbackToCacheTimeout: configSummary.fallbackToCacheTimeout,
      startupPolicyValid: configSummary.startupPolicyValid,
      startupPolicyReason: configSummary.startupPolicyReason,
    },
    targetChannel,
    releaseMessage: args.message,
    missingArtifacts,
    expectedBranch,
  });
  const runtimePolicy = {
    resolvedRuntimeVersion: configSummary.runtimeVersion,
    runtimePolicy: configSummary.runtimePolicy,
    runtimeVersionStrategy: configSummary.runtimeVersionStrategy,
    runtimePolicyValid: configSummary.runtimePolicyValid,
    runtimePolicyReason: configSummary.runtimePolicyReason,
    runtimeProofConsistent: configSummary.runtimeProofConsistent,
    runtimeProofReason: configSummary.runtimeProofReason,
    buildRequired: classification.kind === "build-required",
  };
  const startupPolicy = {
    updatesEnabled: configSummary.updatesEnabled,
    checkAutomatically: configSummary.checkAutomatically,
    fallbackToCacheTimeout: configSummary.fallbackToCacheTimeout,
    startupPolicyValid: configSummary.startupPolicyValid,
    startupPolicyReason: configSummary.startupPolicyReason,
  };

  return {
    mode: args.mode,
    timestamp: new Date().toISOString(),
    repo,
    gates,
    classification,
    migrationPolicy,
    runtimePolicy,
    startupPolicy,
    readiness,
    requiredArtifacts: args.requireArtifacts,
    missingArtifacts,
    targetChannel,
    expectedBranch,
    releaseMessage: args.message,
    rolloutPercentage: args.rolloutPercentage,
    commitRange: args.range ?? "HEAD",
    otaPublish: null,
    releaseMetadata: buildReleaseMetadataEnforcement({
      repo,
      appVersion: configSummary.appVersion,
      configuredIosBuildNumber: configSummary.configuredIosBuildNumber,
      configuredAndroidVersionCode: configSummary.configuredAndroidVersionCode,
      appVersionSource: configSummary.appVersionSource,
      runtimeVersion: configSummary.runtimeVersion,
      runtimePolicyValid: configSummary.runtimePolicyValid,
      runtimeProofConsistent: configSummary.runtimeProofConsistent,
      startupPolicyValid: configSummary.startupPolicyValid,
      readiness,
      targetChannel,
      expectedBranch,
      otaPublish: null,
    }),
  };
}

function runRequiredGates(): ReleaseGateResult[] {
  return REQUIRED_RELEASE_GATES.map(runGate);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const approvalEnv = { ...process.env };
  loadAgentOwnerFlagsIntoEnv(approvalEnv, PROJECT_ROOT);
  const repo = readRepoState();
  const commitRange = resolveReleaseGuardCommitRange({
    explicitRange: args.range,
    repo,
    headParentExists: hasHeadParent(),
  });
  const changedFiles = readChangedFiles(commitRange);
  const gates = runRequiredGates();
  const baseReport = buildBaseReport({ ...args, range: commitRange }, gates, changedFiles, repo, approvalEnv);

  if (baseReport.readiness.status === "fail") {
    writeReport(args.reportFile, baseReport);
    if (args.json) {
      console.info(JSON.stringify(baseReport, null, 2));
    } else {
      printHumanReport(baseReport);
    }
    process.exit(1);
  }

  if (args.mode !== "ota" || args.dryRun || baseReport.readiness.otaDisposition === "skip") {
    writeReport(args.reportFile, baseReport);
    if (args.json) {
      console.info(JSON.stringify(baseReport, null, 2));
    } else {
      printHumanReport(baseReport);
      if (baseReport.readiness.otaDisposition === "skip") {
        console.info("");
        console.info("OTA skipped because this release commit is classified as non-runtime.");
      }
    }
    return;
  }

  const targetChannel = assertCanonicalChannel(args.channel);
  if (!targetChannel) {
    throw new Error("OTA mode requires an explicit --channel.");
  }

  const message = args.message?.trim();
  if (!message) {
    throw new Error("OTA mode requires a non-empty --message.");
  }

  const publishResult = spawnSync(buildReleaseGuardOtaPublishCommand({
    platform: process.platform,
    channel: targetChannel,
    message,
    rolloutPercentage: args.rolloutPercentage,
  }), {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: buildReleaseGuardOtaPublishEnv(process.env),
    maxBuffer: RELEASE_GUARD_OTA_PUBLISH_MAX_BUFFER_BYTES,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (publishResult.error) {
    const errorOutput = `${publishResult.stdout ?? ""}${publishResult.stderr ?? ""}`.trim();
    const cause = publishResult.error.message.trim();
    throw new Error(`${cause}${errorOutput ? `\n${errorOutput}` : ""}`);
  }

  if (publishResult.status !== 0) {
    const errorOutput = `${publishResult.stdout ?? ""}${publishResult.stderr ?? ""}`.trim();
    throw new Error(errorOutput || "Guarded OTA publish failed.");
  }

  const publishOutput = publishResult.stdout ?? "";

  const otaPublish = parseEasUpdateOutput(publishOutput);
  const publishedMissing = [
    ...baseReport.releaseMetadata.missing,
    ...(otaPublish.branch ? [] : ["channel", "branch"]),
    ...(otaPublish.platform ? [] : ["platform"]),
    "sentrySourceMaps",
    "binarySourceMapsProven",
  ].filter((value, index, values) => values.indexOf(value) === index);
  const finalReport: ReleaseGuardReport = {
    ...baseReport,
    otaPublish,
    releaseMetadata: {
      ...baseReport.releaseMetadata,
      channel: otaPublish.branch ? "present" : "missing",
      branch: otaPublish.branch ? "present" : "missing",
      platform: otaPublish.platform ? "present" : "missing",
      otaDisposition: "published",
      sentrySourceMaps: "missing",
      binarySourceMapsProven: "missing",
      otaPublished: true,
      easUpdateTriggered: true,
      missing: publishedMissing,
      warnings: [
        ...baseReport.releaseMetadata.warnings,
        "Sentry source maps are not marked shipped because no source map proof is attached to this report.",
        "Binary/source map proof is not marked shipped without explicit proof artifacts.",
      ],
    },
  };

  writeReport(args.reportFile, finalReport);
  if (args.json) {
    console.info(JSON.stringify(finalReport, null, 2));
  } else {
    printHumanReport(finalReport);
    console.info("");
    console.info(publishOutput.trim());
  }
}

main();
