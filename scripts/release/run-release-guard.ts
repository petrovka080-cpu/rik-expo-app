import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { getExpectedReleaseBranch, isCanonicalReleaseChannel } from "../../src/shared/release/releaseInfo";
import { PROJECT_ROOT } from "./releaseConfig.shared";
import {
  RELEASE_GUARD_OTA_PUBLISH_MAX_BUFFER_BYTES,
  buildReleaseChangedFilesGitArgs,
  buildReleaseGuardOtaPublishEnv,
  REQUIRED_RELEASE_GATES,
  classifyPackageJsonMutation,
  classifyReleaseChanges,
  evaluateReleaseGuardReadiness,
  parseEasUpdateOutput,
  resolveReleaseGuardPath,
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
};

function parseArgs(argv: string[]): ParsedArgs {
  const [modeValue, ...rest] = argv;
  if (modeValue !== "preflight" && modeValue !== "verify" && modeValue !== "ota") {
    throw new Error('Usage: tsx scripts/release/run-release-guard.ts <preflight|verify|ota> [--channel <channel>] [--message "<message>"] [--json] [--dry-run] [--report-file <path>] [--require-artifact <path>] [--range <git-range>]');
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

  return {
    mode: modeValue,
    channel: values.get("--channel")?.[0] ?? null,
    message: values.get("--message")?.[0] ?? null,
    json: flags.has("--json"),
    dryRun: flags.has("--dry-run"),
    reportFile: values.get("--report-file")?.[0] ?? null,
    requireArtifacts: values.get("--require-artifact") ?? [],
    range: values.get("--range")?.[0] ?? null,
  };
}

function readCommand(command: string): string {
  return execSync(command, {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function hasHeadParent(): boolean {
  return spawnSync("git", ["rev-parse", "--verify", "HEAD^"], {
    cwd: PROJECT_ROOT,
    stdio: "ignore",
  }).status === 0;
}

function resolveCommitRange(explicitRange: string | null): string {
  if (explicitRange && explicitRange.trim().length > 0) {
    return explicitRange.trim();
  }

  return hasHeadParent() ? "HEAD^..HEAD" : "HEAD";
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

  return {
    gitBranch,
    headCommit,
    originMainCommit,
    worktreeClean,
    headMatchesOriginMain: headCommit === originMainCommit,
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
  console.info(`Worktree clean: ${String(report.repo.worktreeClean)}`);
  console.info(`Classification: ${report.classification.kind}`);
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

function buildBaseReport(args: ParsedArgs, gates: ReleaseGateResult[], changedFiles: string[]): ReleaseGuardReport {
  const repo = readRepoState();
  const packageJsonMutationKind = readPackageJsonMutationKind(args.range ?? resolveCommitRange(null), changedFiles);
  const classification = classifyReleaseChanges({
    changedFiles,
    packageJsonMutationKind,
  });
  const targetChannel = assertCanonicalChannel(args.channel);
  const expectedBranch = targetChannel ? getExpectedReleaseBranch(targetChannel) : null;
  const missingArtifacts = ensureArtifacts(args.requireArtifacts);
  const readiness = evaluateReleaseGuardReadiness({
    mode: args.mode,
    repo,
    gates,
    classification,
    targetChannel,
    releaseMessage: args.message,
    missingArtifacts,
    expectedBranch,
  });

  return {
    mode: args.mode,
    timestamp: new Date().toISOString(),
    repo,
    gates,
    classification,
    readiness,
    requiredArtifacts: args.requireArtifacts,
    missingArtifacts,
    targetChannel,
    expectedBranch,
    releaseMessage: args.message,
    commitRange: args.range ?? resolveCommitRange(null),
    otaPublish: null,
  };
}

function runRequiredGates(): ReleaseGateResult[] {
  return REQUIRED_RELEASE_GATES.map(runGate);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const commitRange = resolveCommitRange(args.range);
  const changedFiles = readChangedFiles(commitRange);
  const gates = runRequiredGates();
  const baseReport = buildBaseReport({ ...args, range: commitRange }, gates, changedFiles);

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

  const publishResult = spawnSync("npx", ["eas", "update", "--branch", targetChannel, "--message", message], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: buildReleaseGuardOtaPublishEnv(process.env),
    maxBuffer: RELEASE_GUARD_OTA_PUBLISH_MAX_BUFFER_BYTES,
    shell: process.platform === "win32",
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
  const finalReport: ReleaseGuardReport = {
    ...baseReport,
    otaPublish,
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
