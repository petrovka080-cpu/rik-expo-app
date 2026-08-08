import { execFileSync, spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { buildAffectedJestShardPlan } from "./affectedJestSharding";
import { buildVerificationPlan, type VerificationLevel } from "./impactAnalyzer";
import { mergeVerificationShards, type ShardResult } from "./verificationShardMerger";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function git(args: string[]): string {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 20_000,
  }).trim();
}

function lines(value: string): string[] {
  return value.split(/\r?\n/).map((item) => item.trim().replace(/\\/g, "/")).filter(Boolean);
}

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function changedFiles(baseSha: string, headSha: string): string[] {
  const committed = lines(git(["diff", "--name-only", `${baseSha}..${headSha}`]));
  const unstaged = lines(git(["diff", "--name-only"]));
  const staged = lines(git(["diff", "--cached", "--name-only"]));
  const untracked = lines(git(["ls-files", "--others", "--exclude-standard"]));
  return [...new Set([...committed, ...unstaged, ...staged, ...untracked])].sort((a, b) => a.localeCompare(b, "en"));
}

type JestJson = Record<string, unknown> & {
  assertionResults?: Array<Record<string, unknown>>;
  testResults?: Array<Record<string, unknown>>;
};

type JestShardRuntime = {
  shardId: number;
  suites: string[];
  status: number;
  signal: NodeJS.Signals | null;
  stdoutPath: string;
  stderrPath: string;
  resultPath: string;
  result: JestJson;
  failedAssertions: string[];
};

function failedAssertions(result: JestJson): string[] {
  return Array.isArray(result.testResults)
    ? result.testResults.flatMap((suite) =>
      Array.isArray(suite.assertionResults)
        ? (suite.assertionResults as Array<Record<string, unknown>>)
          .filter((assertion) => assertion.status === "failed")
          .map((assertion) => String(assertion.fullName ?? assertion.title ?? "unknown"))
        : [],
    )
    : [];
}

function numeric(result: JestJson, key: string): number {
  const value = result[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function runJestShard(input: {
  root: string;
  outputDir: string;
  runId: string;
  shardId: number;
  suites: string[];
}): Promise<JestShardRuntime> {
  const shardDir = path.join(input.outputDir, "shards", input.runId, `shard-${input.shardId}`);
  fs.mkdirSync(shardDir, { recursive: true });
  const resultPath = path.join(shardDir, "jest-result.json");
  const stdoutPath = path.join(shardDir, "stdout.log");
  const stderrPath = path.join(shardDir, "stderr.log");
  return new Promise((resolve) => {
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    const child = spawn(process.execPath, [
      path.join(input.root, "node_modules", "jest", "bin", "jest.js"),
      ...input.suites,
      "--runInBand",
      "--detectOpenHandles",
      "--json",
      `--outputFile=${resultPath}`,
    ], {
      cwd: input.root,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.once("error", (error) => stderr.push(Buffer.from(`\nspawn_error:${error.message}\n`, "utf8")));
    child.once("close", (code, signal) => {
      fs.writeFileSync(stdoutPath, Buffer.concat(stdout));
      fs.writeFileSync(stderrPath, Buffer.concat(stderr));
      const result = fs.existsSync(resultPath)
        ? JSON.parse(fs.readFileSync(resultPath, "utf8")) as JestJson
        : {};
      resolve({
        shardId: input.shardId,
        suites: input.suites,
        status: code ?? 1,
        signal,
        stdoutPath,
        stderrPath,
        resultPath,
        result,
        failedAssertions: failedAssertions(result),
      });
    });
  });
}

function mergedJestResult(shards: readonly JestShardRuntime[]): JestJson {
  const sum = (key: string) => shards.reduce((total, shard) => total + numeric(shard.result, key), 0);
  const results = shards.flatMap((shard) =>
    Array.isArray(shard.result.testResults) ? shard.result.testResults : [],
  );
  return {
    numFailedTestSuites: sum("numFailedTestSuites"),
    numFailedTests: sum("numFailedTests"),
    numPassedTestSuites: sum("numPassedTestSuites"),
    numPassedTests: sum("numPassedTests"),
    numPendingTestSuites: sum("numPendingTestSuites"),
    numPendingTests: sum("numPendingTests"),
    numRuntimeErrorTestSuites: sum("numRuntimeErrorTestSuites"),
    numTotalTestSuites: sum("numTotalTestSuites"),
    numTotalTests: sum("numTotalTests"),
    success: shards.every((shard) => shard.status === 0 && shard.result.success === true),
    testResults: results,
    wasInterrupted: shards.some((shard) => shard.result.wasInterrupted === true),
  };
}

async function run(): Promise<void> {
  const root = process.cwd();
  const level = (arg("level") ?? "local") as VerificationLevel;
  if (!( ["local", "affected", "pr"] as string[]).includes(level)) {
    throw new Error(`invalid_verification_level:${level}`);
  }
  const baseSha = arg("base") ?? git(["rev-parse", "HEAD"]);
  const headSha = arg("head") ?? git(["rev-parse", "HEAD"]);
  const plan = buildVerificationPlan({ baseSha, headSha, level, changedFiles: changedFiles(baseSha, headSha) });
  const outputDir = path.resolve(arg("output-dir") ?? path.join(".release-runtime", "verification-v1", headSha, level));
  const planPath = path.join(outputDir, "plan.json");
  writeJson(planPath, plan);

  if (process.argv.includes("--plan-only")) {
    process.stdout.write(`${JSON.stringify({
      final_status: "GREEN_VERIFICATION_PLAN_READY",
      plan_path: path.relative(root, planPath).replace(/\\/g, "/"),
      ...plan,
    }, null, 2)}\n`);
    return;
  }

  const started = new Date();
  const resultPath = path.join(outputDir, "jest-result.json");
  const stdoutPath = path.join(outputDir, "stdout.log");
  const stderrPath = path.join(outputDir, "stderr.log");
  const suites = plan.selected_suites.filter((suite) => fs.existsSync(path.join(root, suite)));
  const missingSuites = plan.selected_suites.filter((suite) => !fs.existsSync(path.join(root, suite)));
  const shardCount = level === "affected" ? 4 : 1;
  const shardPlan = buildAffectedJestShardPlan({ root, suites, shardCount });
  const runId = started.toISOString().replace(/[:.]/g, "-");
  const shardRuns = missingSuites.length === 0 && suites.length > 0
    ? await Promise.all(shardPlan.shards.map((shard) => runJestShard({
      root,
      outputDir,
      runId,
      shardId: shard.shard_id,
      suites: shard.test_files,
    })))
    : [];
  const jest = mergedJestResult(shardRuns);
  writeJson(resultPath, jest);
  fs.writeFileSync(
    stdoutPath,
    shardRuns.map((shard) => fs.readFileSync(shard.stdoutPath, "utf8")).join("\n"),
    "utf8",
  );
  fs.writeFileSync(
    stderrPath,
    shardRuns.map((shard) => fs.readFileSync(shard.stderrPath, "utf8")).join("\n"),
    "utf8",
  );
  const subjectSha = git(["rev-parse", "HEAD"]);
  const shardResults: ShardResult[] = shardRuns.map((shard) => ({
    shard_id: shard.shardId,
    subject_sha: subjectSha,
    manifest_hash: shardPlan.manifest_sha256,
    exit_code: shard.status,
    suites: shard.suites,
    failed_assertions: shard.failedAssertions,
  }));
  const fanIn = mergeVerificationShards({
    expectedShardIds: shardPlan.shards.map((shard) => shard.shard_id),
    expectedSuites: suites,
    subjectSha,
    manifestHash: shardPlan.manifest_sha256,
    results: shardResults,
  });
  const ended = new Date();
  const budgetMs = level === "local" ? 300_000 : level === "affected" ? 600_000 : 1_800_000;
  const durationMs = ended.getTime() - started.getTime();
  const failures = failedAssertions(jest);
  const exitCode = missingSuites.length === 0 && fanIn.exit_code === 0 && jest.success === true ? 0 : 1;
  const passed = exitCode === 0 && durationMs <= budgetMs;
  const artifactPaths = [
    planPath,
    resultPath,
    stdoutPath,
    stderrPath,
    ...shardRuns.flatMap((shard) => [shard.resultPath, shard.stdoutPath, shard.stderrPath]),
  ].filter(fs.existsSync);
  const summary = {
    schema: "verification-gate-summary/v1",
    gate_name: `${level}-verification-gate`,
    gate_version: "2",
    base_sha: baseSha,
    head_sha: headSha,
    input_fingerprint: plan.input_fingerprint,
    selected_domains: plan.selections.filter((item) => item.selected).flatMap((item) => item.domains),
    selected_suites: suites,
    selected_producers: plan.selected_producers,
    cache: { status: "reported-by-required-artifact-preflight", reason: "content-addressed prerequisite gate" },
    shard_manifest: {
      mode: "bounded-parallel-run-in-band",
      shard_count: shardPlan.shards.length,
      detect_open_handles_per_shard: true,
      calibration_path: shardPlan.calibration_path,
      calibration_sha256: shardPlan.calibration_sha256,
      manifest_sha256: shardPlan.manifest_sha256,
      validation: shardPlan.validation,
      shards: shardPlan.shards,
      fan_in: fanIn,
    },
    started_at: started.toISOString(),
    ended_at: ended.toISOString(),
    duration_ms: durationMs,
    passed_tests: numeric(jest, "numPassedTests"),
    failed_tests: numeric(jest, "numFailedTests"),
    skipped_tests: numeric(jest, "numPendingTests"),
    passed_suites: numeric(jest, "numPassedTestSuites"),
    failed_suites: numeric(jest, "numFailedTestSuites"),
    skipped_suites: numeric(jest, "numPendingTestSuites"),
    failed_assertions: failures,
    missing_suites: missingSuites,
    artifact_hashes: artifactPaths.map((file) => ({
      path: path.relative(root, file).replace(/\\/g, "/"),
      sha256: sha256File(file),
    })),
    exit_code: passed ? 0 : exitCode || 1,
    budget: { limit_ms: budgetMs, actual_ms: durationMs, passed: durationMs <= budgetMs },
    final_status: passed ? "GREEN_VERIFICATION_GATE" : "RED_VERIFICATION_GATE",
    fake_green_claimed: false,
  };
  writeJson(path.join(outputDir, "summary.json"), summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (!passed) process.exitCode = 1;
}

void run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
