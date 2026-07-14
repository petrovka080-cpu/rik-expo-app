import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  OFFICE_MARKET_REGRESSION_REQUIRED_COVERAGE,
  OFFICE_MARKET_REGRESSION_SUITES,
  type OfficeMarketCoverageKey,
  type OfficeMarketRegressionPath,
  type OfficeMarketRegressionSuite,
} from "./officeMarketRegressionManifest";

type SuiteStatus = "passed" | "failed" | "skipped";

type ResolvedSuite = {
  suite: OfficeMarketRegressionSuite;
  runnablePaths: string[];
  skippedMissing: string[];
  missingRequired: string[];
};

type SuiteResult = {
  name: string;
  owner: string;
  status: SuiteStatus;
  command: string | null;
  exitCode: number | null;
  timed_out: boolean;
  timeout_ms: number | null;
  duration_ms: number;
  paths: string[];
  skipped_missing: string[];
  missing_required: string[];
};

type OfficeMarketRegressionSummary = {
  sha: string;
  branch: string;
  started_at: string;
  duration_ms: number;
  executed_suites: number;
  skipped_suites: number;
  failed_suites: number;
  timed_out_suites: number;
  timed_out_suite_names: string[];
  foreman: boolean;
  director: boolean;
  pdf: boolean;
  buyer: boolean;
  downstream: boolean;
  consumer: boolean;
  market: boolean;
  auth: boolean;
  suite_results: SuiteResult[];
  slowest_suites: Array<Pick<SuiteResult, "name" | "status" | "duration_ms">>;
  first_failure: string | null;
  command: string | null;
  final_status:
    | "GREEN_OFFICE_MARKET_REGRESSION_READY"
    | "BLOCKED_OFFICE_MARKET_REGRESSION";
};

const projectRoot = process.cwd();
const runtimeSummaryPath = path.join(
  projectRoot,
  ".release-runtime",
  "office-market-regression",
  "latest.json",
);
const jestBin = path.join(projectRoot, "node_modules", "jest", "bin", "jest.js");
const targetLocalDurationMs = 10 * 60 * 1000;
const defaultSuiteTimeoutMs = 8 * 60 * 1000;
const suiteTimeoutMs = parsePositiveIntegerEnv(
  "OFFICE_MARKET_REGRESSION_SUITE_TIMEOUT_MS",
  defaultSuiteTimeoutMs,
);
const officeEstimateBatchSize = parsePositiveIntegerEnv(
  "OFFICE_MARKET_ESTIMATE_CHAIN_BATCH_SIZE",
  12,
);
const gitCommandTimeoutMs = 30 * 1000;
const jestOutputMaxBufferBytes = 64 * 1024 * 1024;

function normalizeForJest(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function parsePositiveIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function pathExists(entry: OfficeMarketRegressionPath): boolean {
  const fullPath = path.join(projectRoot, entry.path);
  if (!fs.existsSync(fullPath)) return false;
  const stat = fs.statSync(fullPath);
  return entry.kind === "dir" ? stat.isDirectory() : stat.isFile();
}

function collectTestFiles(directory: string): string[] {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectTestFiles(fullPath);
    if (!entry.isFile()) return [];
    return /\.(?:test|spec)\.(?:ts|tsx|js|jsx)$/.test(entry.name)
      ? [normalizeForJest(path.relative(projectRoot, fullPath))]
      : [];
  });
}

function resolveEntryFiles(entry: OfficeMarketRegressionPath): string[] {
  const fullPath = path.join(projectRoot, entry.path);
  if (!pathExists(entry)) return [];
  if (entry.kind === "file") return [normalizeForJest(entry.path)];
  return collectTestFiles(fullPath).sort();
}

function runGit(args: string[]): string {
  const result = spawnSync("git", args, {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: gitCommandTimeoutMs,
    killSignal: "SIGTERM",
  });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${(result.stderr || result.stdout || "").trim()}`,
    );
  }
  return (result.stdout ?? "").trim();
}

function assertRuntimeSummaryIgnored() {
  const result = spawnSync("git", ["check-ignore", "-q", runtimeSummaryPath], {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: gitCommandTimeoutMs,
    killSignal: "SIGTERM",
  });
  if (result.status !== 0) {
    throw new Error(
      ".release-runtime/office-market-regression/latest.json is not gitignored",
    );
  }
}

function resolveSuite(suite: OfficeMarketRegressionSuite): ResolvedSuite {
  const runnablePaths: string[] = [];
  const skippedMissing: string[] = [];
  const missingRequired: string[] = [];

  for (const entry of suite.paths) {
    const entryFiles = resolveEntryFiles(entry);
    if (entryFiles.length > 0) {
      runnablePaths.push(...entryFiles);
      continue;
    }
    if (pathExists(entry)) {
      skippedMissing.push(`${entry.path}:SKIPPED_EMPTY_SUITE`);
      continue;
    }
    if (entry.required) {
      missingRequired.push(entry.path);
    } else {
      skippedMissing.push(`${entry.path}:${entry.missingReason ?? "SKIPPED_MISSING_SUITE"}`);
    }
  }

  return { suite, runnablePaths, skippedMissing, missingRequired };
}

function suiteRequiresProcessBatches(suite: OfficeMarketRegressionSuite): boolean {
  return suite.name === "office-estimate-chain";
}

function chunkPaths(paths: string[], chunkSize: number): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < paths.length; index += chunkSize) {
    chunks.push(paths.slice(index, index + chunkSize));
  }
  return chunks;
}

function runJestProcess(input: {
  suite: OfficeMarketRegressionSuite;
  paths: string[];
  batchIndex: number;
  batchTotal: number;
}): {
  command: string;
  exitCode: number | null;
  timed_out: boolean;
  passed: boolean;
} {
  const args = [jestBin, "--runInBand", "--runTestsByPath", ...input.paths];
  const command = [process.execPath, ...args].join(" ");
  const batchLabel = input.batchTotal > 1
    ? ` batch ${input.batchIndex + 1}/${input.batchTotal}`
    : "";

  console.info(`\n[office-market] ${input.suite.name}${batchLabel} (${input.suite.owner})`);
  console.info(`> ${command}`);
  console.info(`[office-market] timeout=${suiteTimeoutMs}ms`);

  const result = spawnSync(process.execPath, args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: suiteTimeoutMs,
    killSignal: "SIGTERM",
    maxBuffer: jestOutputMaxBufferBytes,
    env: process.env,
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) process.stderr.write(`${String(result.error.message ?? result.error)}\n`);
  const timedOut = getErrorCode(result.error) === "ETIMEDOUT";
  if (timedOut) {
    process.stderr.write(`[office-market] Suite timed out after ${suiteTimeoutMs}ms: ${input.suite.name}${batchLabel}\n`);
  }

  return {
    command,
    exitCode: result.status ?? 1,
    timed_out: timedOut,
    passed: !result.error && result.status === 0,
  };
}

function runSuite(resolved: ResolvedSuite): SuiteResult {
  const startedAt = Date.now();
  const { suite, runnablePaths, skippedMissing, missingRequired } = resolved;

  if (missingRequired.length > 0) {
    return {
      name: suite.name,
      owner: suite.owner,
      status: "failed",
      command: null,
      exitCode: 1,
      timed_out: false,
      timeout_ms: null,
      duration_ms: Date.now() - startedAt,
      paths: [],
      skipped_missing: skippedMissing,
      missing_required: missingRequired,
    };
  }

  if (runnablePaths.length === 0) {
    return {
      name: suite.name,
      owner: suite.owner,
      status: "skipped",
      command: null,
      exitCode: null,
      timed_out: false,
      timeout_ms: null,
      duration_ms: Date.now() - startedAt,
      paths: [],
      skipped_missing: skippedMissing,
      missing_required: [],
    };
  }

  const batches = suiteRequiresProcessBatches(suite)
    ? chunkPaths(runnablePaths, officeEstimateBatchSize)
    : [runnablePaths];
  let failedBatch: ReturnType<typeof runJestProcess> | null = null;
  let command = "";

  for (const [batchIndex, paths] of batches.entries()) {
    const result = runJestProcess({
      suite,
      paths,
      batchIndex,
      batchTotal: batches.length,
    });
    command = command ? `${command} && ${result.command}` : result.command;
    if (!result.passed) {
      failedBatch = result;
      break;
    }
  }

  return {
    name: suite.name,
    owner: suite.owner,
    status: failedBatch ? "failed" : "passed",
    command,
    exitCode: failedBatch?.exitCode ?? 0,
    timed_out: failedBatch?.timed_out ?? false,
    timeout_ms: suiteTimeoutMs,
    duration_ms: Date.now() - startedAt,
    paths: runnablePaths,
    skipped_missing: skippedMissing,
    missing_required: [],
  };
}

function buildCoverage(results: SuiteResult[]): Record<OfficeMarketCoverageKey, boolean> {
  const coverage = Object.fromEntries(
    OFFICE_MARKET_REGRESSION_REQUIRED_COVERAGE.map((key) => [key, false]),
  ) as Record<OfficeMarketCoverageKey, boolean>;

  for (const result of results) {
    if (result.status !== "passed") continue;
    const suite = OFFICE_MARKET_REGRESSION_SUITES.find((entry) => entry.name === result.name);
    if (!suite) continue;
    for (const key of suite.coverage) {
      coverage[key] = true;
    }
  }

  return coverage;
}

function buildSummary(params: {
  startedAt: string;
  startedMs: number;
  results: SuiteResult[];
}): OfficeMarketRegressionSummary {
  const coverage = buildCoverage(params.results);
  const failed = params.results.filter((result) => result.status === "failed");
  const timedOut = params.results.filter((result) => result.timed_out);
  const firstFailure = failed[0] ?? null;

  return {
    sha: runGit(["rev-parse", "HEAD"]),
    branch: runGit(["branch", "--show-current"]),
    started_at: params.startedAt,
    duration_ms: Date.now() - params.startedMs,
    executed_suites: params.results.filter((result) => result.status !== "skipped").length,
    skipped_suites: params.results.filter((result) => result.status === "skipped").length,
    failed_suites: failed.length,
    timed_out_suites: timedOut.length,
    timed_out_suite_names: timedOut.map((result) => result.name),
    foreman: coverage.foreman,
    director: coverage.director,
    pdf: coverage.pdf,
    buyer: coverage.buyer,
    downstream: coverage.downstream,
    consumer: coverage.consumer,
    market: coverage.market,
    auth: coverage.auth,
    suite_results: params.results,
    slowest_suites: [...params.results]
      .sort((left, right) => right.duration_ms - left.duration_ms)
      .slice(0, 5)
      .map(({ name, status, duration_ms }) => ({ name, status, duration_ms })),
    first_failure: firstFailure?.name ?? null,
    command: firstFailure?.command ?? null,
    final_status:
      failed.length === 0
        ? "GREEN_OFFICE_MARKET_REGRESSION_READY"
        : "BLOCKED_OFFICE_MARKET_REGRESSION",
  };
}

function writeRuntimeSummary(summary: OfficeMarketRegressionSummary) {
  fs.mkdirSync(path.dirname(runtimeSummaryPath), { recursive: true });
  fs.writeFileSync(runtimeSummaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}

function printCompactSummary(summary: OfficeMarketRegressionSummary) {
  const lines = [
    "",
    "OFFICE_MARKET_REGRESSION_SUMMARY",
    "",
    `sha=${summary.sha}`,
    `branch=${summary.branch}`,
    `started_at=${summary.started_at}`,
    `duration_ms=${summary.duration_ms}`,
    `executed_suites=${summary.executed_suites}`,
    `skipped_suites=${summary.skipped_suites}`,
    `failed_suites=${summary.failed_suites}`,
    "",
    `foreman=${String(summary.foreman)}`,
    `director=${String(summary.director)}`,
    `pdf=${String(summary.pdf)}`,
    `buyer=${String(summary.buyer)}`,
    `downstream=${String(summary.downstream)}`,
    `consumer=${String(summary.consumer)}`,
    `market=${String(summary.market)}`,
    `auth=${String(summary.auth)}`,
    "",
    "suite_durations:",
    ...summary.suite_results.map(
      (suite) =>
        `- ${suite.name} ${suite.status} ${suite.duration_ms}ms timeout=${String(
          suite.timeout_ms,
        )} timed_out=${String(suite.timed_out)}`,
    ),
  ];

  if (summary.duration_ms > targetLocalDurationMs) {
    lines.push("", "slowest_suites:");
    for (const suite of summary.slowest_suites) {
      lines.push(`- ${suite.name} ${suite.status} ${suite.duration_ms}ms`);
    }
  }

  if (summary.final_status === "BLOCKED_OFFICE_MARKET_REGRESSION") {
    lines.push(
      "",
      `final_status=${summary.final_status}`,
      `first_failure=${summary.first_failure ?? "unknown"}`,
      `command=${summary.command ?? "preflight"}`,
      `timed_out_suites=${summary.timed_out_suite_names.join(",") || "none"}`,
    );
  } else {
    lines.push("", `final_status=${summary.final_status}`);
  }

  console.info(lines.join("\n"));
}

function main() {
  assertRuntimeSummaryIgnored();
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const results = OFFICE_MARKET_REGRESSION_SUITES.map(resolveSuite).map(runSuite);
  const summary = buildSummary({ startedAt, startedMs, results });
  writeRuntimeSummary(summary);
  printCompactSummary(summary);

  if (summary.final_status !== "GREEN_OFFICE_MARKET_REGRESSION_READY") {
    process.exitCode = 1;
  }
}

main();
