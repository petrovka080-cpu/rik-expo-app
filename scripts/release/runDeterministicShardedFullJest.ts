import crypto from "node:crypto";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { finished } from "node:stream/promises";

import {
  DETERMINISTIC_FULL_JEST_SCHEMA_VERSION,
  buildDeterministicFullJestSubjectInputs,
  buildFullJestEvidenceContext,
  deterministicFullJestShardPlanSemanticHash,
  type FullJestEvidenceContext,
} from "./fullJestEvidence";

export type WeightedJestManifestEntry = {
  test_path: string;
  source_bytes: number;
  declared_tests: number;
  weight: number;
  content_sha256: string;
};

export type WeightedJestShardPlan = {
  shard_id: number;
  weight: number;
  test_files: string[];
};

export type JestShardMicrobatchPlan = {
  microbatch_id: number;
  test_files: string[];
};

type MicrobatchRuntimeResult = {
  microbatch_id: number;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  exit_code: number | null;
  signal: NodeJS.Signals | null;
  test_files: string[];
  jest_json_path: string;
  peak_memory_path: string;
  stdout_path: string;
  stderr_path: string;
  peak_rss_bytes: number | null;
  peak_heap_used_bytes: number | null;
  jest_success: boolean;
  num_failed_test_suites: number | null;
  num_failed_tests: number | null;
  num_pending_test_suites: number | null;
  num_pending_tests: number | null;
  num_total_test_suites: number | null;
  num_total_tests: number | null;
  observed_test_files: string[];
  jest_json_sha256: string | null;
  timed_out: boolean;
  timeout_ms: number;
  terminal_reason: "completed" | "timeout" | "signal" | "exit";
  cleanup_attempted: boolean;
  cleanup_succeeded: boolean;
  orphan_detected: boolean;
};

type ShardRuntimeResult = {
  shard_id: number;
  subject_sha: string;
  manifest_hash: string;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  exit_code: number | null;
  signal: NodeJS.Signals | null;
  test_files: string[];
  jest_json_path: string;
  peak_memory_path: string;
  stdout_path: string;
  stderr_path: string;
  peak_rss_bytes: number | null;
  peak_heap_used_bytes: number | null;
  jest_success: boolean;
  num_failed_test_suites: number | null;
  num_failed_tests: number | null;
  num_pending_test_suites: number | null;
  num_pending_tests: number | null;
  num_total_test_suites: number | null;
  num_total_tests: number | null;
  observed_test_files: string[];
  jest_cache_cleanup: CompletedShardJestCacheCleanup;
  microbatches: MicrobatchRuntimeResult[];
};

export type CompletedShardJestCacheCleanup = {
  cache_directory: string;
  existed_before: boolean;
  attempted: boolean;
  succeeded: boolean;
  status: "REMOVED" | "NOT_PRESENT" | "DEFERRED" | "BLOCKED";
  blocking: boolean;
  error: string | null;
};

export function classifyCompletedShardJestCacheCleanupError(
  error: unknown,
): Pick<CompletedShardJestCacheCleanup, "status" | "blocking" | "error"> {
  const message = error instanceof Error ? error.message : String(error);
  const blocking = message === "completed_shard_jest_cache_is_symbolic_link";
  return {
    status: blocking ? "BLOCKED" : "DEFERRED",
    blocking,
    error: message,
  };
}

type ParsedArgs = {
  shards: number;
  concurrency: number;
  planOnly: boolean;
  allowCurrentWorkspaceOverlay: boolean;
  outputDir: string | null;
  allowedOverlayPaths: string[];
  microbatchFiles: number;
  microbatchTimeoutMs: number;
};

const DEFAULT_SHARDS = 32;
const DEFAULT_CONCURRENCY = 2;
const DEFAULT_MICROBATCH_FILES = 20;
const DEFAULT_MICROBATCH_TIMEOUT_MS = 1_200_000;

function sha256(value: string | Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizedRelative(root: string, filePath: string): string {
  return path.relative(root, path.resolve(filePath)).replace(/\\/g, "/");
}

function safeInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const valueFor = (prefix: string) => argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  return {
    shards: safeInteger(valueFor("--shards="), DEFAULT_SHARDS),
    concurrency: safeInteger(valueFor("--concurrency="), DEFAULT_CONCURRENCY),
    planOnly: argv.includes("--plan-only"),
    allowCurrentWorkspaceOverlay: argv.includes("--allow-current-workspace-overlay"),
    outputDir: valueFor("--output-dir=") ?? null,
    microbatchFiles: safeInteger(valueFor("--microbatch-files="), DEFAULT_MICROBATCH_FILES),
    microbatchTimeoutMs: safeInteger(valueFor("--microbatch-timeout-ms="), DEFAULT_MICROBATCH_TIMEOUT_MS),
    allowedOverlayPaths: argv
      .filter((arg) => arg.startsWith("--allow-overlay="))
      .map((arg) => arg.slice("--allow-overlay=".length).replace(/\\/g, "/"))
      .filter(Boolean)
      .sort(),
  };
}

export function resolveAllowedWorkspaceOverlayPaths(input: {
  currentChangedFiles: readonly string[];
  explicitAllowedPaths: readonly string[];
  allowCurrentWorkspaceOverlay: boolean;
}): string[] {
  if (input.allowCurrentWorkspaceOverlay && input.explicitAllowedPaths.length > 0) {
    throw new Error("current_workspace_overlay_cannot_be_combined_with_explicit_paths");
  }
  const selected = input.allowCurrentWorkspaceOverlay
    ? input.currentChangedFiles
    : input.explicitAllowedPaths;
  return [...new Set(selected.map((file) => file.replace(/\\/g, "/")))].sort();
}

function git(root: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 20_000,
  }).trim();
}

function readJson(filePath: string): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function numberField(value: Record<string, unknown>, key: string): number | null {
  return typeof value[key] === "number" && Number.isFinite(value[key])
    ? value[key] as number
    : null;
}

function booleanField(value: Record<string, unknown>, key: string): boolean {
  return value[key] === true;
}

function assertAllowedWorkspaceOverlay(
  context: FullJestEvidenceContext,
  allowedOverlayPaths: readonly string[],
): void {
  const allowed = new Set(allowedOverlayPaths);
  const unexpected = context.changedFiles.filter((file) => !allowed.has(file.replace(/\\/g, "/")));
  const missing = allowedOverlayPaths.filter((file) => !context.changedFiles.includes(file));
  if (unexpected.length > 0 || missing.length > 0) {
    throw new Error(
      `workspace_overlay_mismatch:${JSON.stringify({ unexpected, missing, changed: context.changedFiles })}`,
    );
  }
}

function extractListTests(stdout: string): string[] {
  const start = stdout.indexOf("[");
  const end = stdout.lastIndexOf("]");
  if (start < 0 || end < start) throw new Error("jest_list_tests_json_missing");
  const value = JSON.parse(stdout.slice(start, end + 1)) as unknown;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error("jest_list_tests_json_invalid");
  }
  return value as string[];
}

function buildManifest(root: string, absoluteTestPaths: readonly string[]): WeightedJestManifestEntry[] {
  return absoluteTestPaths
    .map((absolutePath): WeightedJestManifestEntry => {
      const testPath = normalizedRelative(root, absolutePath);
      const source = fs.readFileSync(path.resolve(absolutePath));
      const text = source.toString("utf8");
      const declaredTests = (text.match(/\b(?:it|test)\s*\(/g) ?? []).length;
      return {
        test_path: testPath,
        source_bytes: source.byteLength,
        declared_tests: declaredTests,
        weight: Math.max(1, source.byteLength + declaredTests * 4096),
        content_sha256: sha256(source),
      };
    })
    .sort((left, right) => left.test_path.localeCompare(right.test_path, "en"));
}

export function planWeightedJestShards(
  manifest: readonly WeightedJestManifestEntry[],
  requestedShardCount: number,
): WeightedJestShardPlan[] {
  if (!Number.isInteger(requestedShardCount) || requestedShardCount <= 0) {
    throw new Error(`invalid_shard_count:${requestedShardCount}`);
  }
  const shardCount = Math.min(requestedShardCount, Math.max(1, manifest.length));
  const shards = Array.from({ length: shardCount }, (_, shardId): WeightedJestShardPlan => ({
    shard_id: shardId,
    weight: 0,
    test_files: [],
  }));
  const weighted = [...manifest].sort(
    (left, right) => right.weight - left.weight || left.test_path.localeCompare(right.test_path, "en"),
  );
  for (const entry of weighted) {
    const target = [...shards].sort(
      (left, right) => left.weight - right.weight || left.shard_id - right.shard_id,
    )[0];
    target.weight += entry.weight;
    target.test_files.push(entry.test_path);
  }
  for (const shard of shards) shard.test_files.sort((left, right) => left.localeCompare(right, "en"));
  return shards;
}

export function validateWeightedJestShardPlan(
  manifest: readonly WeightedJestManifestEntry[],
  shards: readonly WeightedJestShardPlan[],
): { missing: string[]; duplicates: string[]; unexpected: string[] } {
  const expected = new Set(manifest.map((entry) => entry.test_path));
  const occurrences = new Map<string, number>();
  for (const file of shards.flatMap((shard) => shard.test_files)) {
    occurrences.set(file, (occurrences.get(file) ?? 0) + 1);
  }
  return {
    missing: [...expected].filter((file) => !occurrences.has(file)).sort(),
    duplicates: [...occurrences].filter(([, count]) => count !== 1).map(([file]) => file).sort(),
    unexpected: [...occurrences.keys()].filter((file) => !expected.has(file)).sort(),
  };
}

export function planJestShardMicrobatches(
  shard: WeightedJestShardPlan,
  maximumFiles: number,
): JestShardMicrobatchPlan[] {
  if (!Number.isInteger(maximumFiles) || maximumFiles <= 0) {
    throw new Error(`invalid_microbatch_file_count:${maximumFiles}`);
  }
  const result: JestShardMicrobatchPlan[] = [];
  for (let offset = 0; offset < shard.test_files.length; offset += maximumFiles) {
    result.push({
      microbatch_id: result.length,
      test_files: shard.test_files.slice(offset, offset + maximumFiles),
    });
  }
  return result;
}

function manifestHash(manifest: readonly WeightedJestManifestEntry[]): string {
  return sha256(manifest.map((entry) => entry.test_path).join("\n"));
}

function manifestContentHash(manifest: readonly WeightedJestManifestEntry[]): string {
  return sha256(manifest.map((entry) => `${entry.test_path}\0${entry.content_sha256}`).join("\n"));
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function forceTerminateOwnedProcessTree(pid: number): boolean {
  if (process.platform === "win32") {
    const result = spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      encoding: "utf8",
      windowsHide: true,
    });
    return result.status === 0;
  }
  try {
    process.kill(pid, "SIGKILL");
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ESRCH";
  }
}

async function runMicrobatch(input: {
  root: string;
  shardDir: string;
  subjectSha: string;
  manifestHash: string;
  shardId: number;
  microbatch: JestShardMicrobatchPlan;
  timeoutMs: number;
}): Promise<MicrobatchRuntimeResult> {
  const id = String(input.microbatch.microbatch_id + 1).padStart(3, "0");
  const microbatchDir = path.join(input.shardDir, `microbatch-${id}`);
  fs.mkdirSync(microbatchDir, { recursive: true });
  const jestJsonPath = path.join(microbatchDir, "jest.json");
  const peakMemoryPath = path.join(microbatchDir, "peak-memory.json");
  const stdoutPath = path.join(microbatchDir, "stdout.log");
  const stderrPath = path.join(microbatchDir, "stderr.log");
  const metadataPath = path.join(microbatchDir, "metadata.json");
  const cacheDirectory = path.join(input.shardDir, "jest-cache");
  const reporterPath = path.join(input.root, "scripts", "release", "jestPeakMemoryReporter.cjs");
  const jestBin = path.join(input.root, "node_modules", "jest", "bin", "jest.js");
  writeJson(path.join(microbatchDir, "manifest.json"), {
    schema_version: DETERMINISTIC_FULL_JEST_SCHEMA_VERSION,
    evidence_class: "actual_environment",
    producer: "scripts/release/runDeterministicShardedFullJest.ts",
    subject_sha: input.subjectSha,
    manifest_hash: input.manifestHash,
    shard_id: input.shardId,
    microbatch_id: input.microbatch.microbatch_id,
    test_files: input.microbatch.test_files,
  });

  const args = [
    jestBin,
    "--runInBand",
    "--json",
    "--outputFile",
    jestJsonPath,
    "--cacheDirectory",
    cacheDirectory,
    "--runTestsByPath",
    ...input.microbatch.test_files,
  ];
  const startedAt = new Date();
  const stdout = fs.createWriteStream(stdoutPath, { flags: "w" });
  const stderr = fs.createWriteStream(stderrPath, { flags: "w" });
  const child = spawn(process.execPath, args, {
    cwd: input.root,
    env: {
      ...process.env,
      NODE_OPTIONS: [process.env.NODE_OPTIONS, `--require=${reporterPath.replace(/\\/g, "/")}`]
        .filter(Boolean)
        .join(" "),
      RIK_JEST_PEAK_MEMORY_PATH: peakMemoryPath,
      RIK_JEST_SHARD_SUBJECT_SHA: input.subjectSha,
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  child.stdout.pipe(stdout);
  child.stderr.pipe(stderr);
  let timedOut = false;
  let cleanupAttempted = false;
  let cleanupSucceeded = false;
  let forceCleanupTimer: ReturnType<typeof setTimeout> | null = null;
  const close = await new Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }>((resolve) => {
    const timeout = setTimeout(() => {
      timedOut = true;
      cleanupAttempted = true;
      child.kill("SIGTERM");
      forceCleanupTimer = setTimeout(() => {
        if (child.pid) cleanupSucceeded = forceTerminateOwnedProcessTree(child.pid);
      }, 5_000);
    }, input.timeoutMs);
    child.once("close", (exitCode, signal) => resolve({ exitCode, signal }));
    child.once("close", () => clearTimeout(timeout));
  });
  if (forceCleanupTimer) clearTimeout(forceCleanupTimer);
  if (timedOut) cleanupSucceeded = true;
  stdout.end();
  stderr.end();
  await Promise.all([finished(stdout), finished(stderr)]);
  const endedAt = new Date();
  const jest = readJson(jestJsonPath);
  const memory = readJson(peakMemoryPath);
  const observedTestFiles = Array.isArray(jest.testResults)
    ? (jest.testResults as Record<string, unknown>[])
      .map((result) => typeof result.name === "string" ? normalizedRelative(input.root, result.name) : "")
      .filter(Boolean)
      .sort()
    : [];
  const result: MicrobatchRuntimeResult = {
    microbatch_id: input.microbatch.microbatch_id,
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    duration_ms: endedAt.getTime() - startedAt.getTime(),
    exit_code: close.exitCode,
    signal: close.signal,
    test_files: input.microbatch.test_files,
    jest_json_path: normalizedRelative(input.root, jestJsonPath),
    peak_memory_path: normalizedRelative(input.root, peakMemoryPath),
    stdout_path: normalizedRelative(input.root, stdoutPath),
    stderr_path: normalizedRelative(input.root, stderrPath),
    peak_rss_bytes: numberField(memory, "peak_rss_bytes"),
    peak_heap_used_bytes: numberField(memory, "peak_heap_used_bytes"),
    jest_success: booleanField(jest, "success"),
    num_failed_test_suites: numberField(jest, "numFailedTestSuites"),
    num_failed_tests: numberField(jest, "numFailedTests"),
    num_pending_test_suites: numberField(jest, "numPendingTestSuites"),
    num_pending_tests: numberField(jest, "numPendingTests"),
    num_total_test_suites: numberField(jest, "numTotalTestSuites"),
    num_total_tests: numberField(jest, "numTotalTests"),
    observed_test_files: observedTestFiles,
    jest_json_sha256: fs.existsSync(jestJsonPath) ? sha256(fs.readFileSync(jestJsonPath)) : null,
    timed_out: timedOut,
    timeout_ms: input.timeoutMs,
    terminal_reason: timedOut ? "timeout" : close.signal !== null ? "signal" : close.exitCode === 0 ? "completed" : "exit",
    cleanup_attempted: cleanupAttempted,
    cleanup_succeeded: cleanupSucceeded,
    orphan_detected: timedOut && !cleanupSucceeded,
  };
  writeJson(metadataPath, result);
  return result;
}

function concatenateLogs(
  root: string,
  targetPath: string,
  microbatches: readonly MicrobatchRuntimeResult[],
  field: "stdout_path" | "stderr_path",
): void {
  fs.writeFileSync(targetPath, "", "utf8");
  for (const microbatch of microbatches) {
    fs.appendFileSync(targetPath, fs.readFileSync(path.resolve(root, microbatch[field])));
  }
}

function aggregateJestJson(
  root: string,
  targetPath: string,
  microbatches: readonly MicrobatchRuntimeResult[],
): void {
  const json = microbatches.map((microbatch) => readJson(path.resolve(root, microbatch.jest_json_path)));
  writeJson(targetPath, {
    success: microbatches.every((microbatch) => microbatch.jest_success),
    numFailedTestSuites: sumKnown(microbatches, "num_failed_test_suites"),
    numFailedTests: sumKnown(microbatches, "num_failed_tests"),
    numPendingTestSuites: sumKnown(microbatches, "num_pending_test_suites"),
    numPendingTests: sumKnown(microbatches, "num_pending_tests"),
    numTotalTestSuites: sumKnown(microbatches, "num_total_test_suites"),
    numTotalTests: sumKnown(microbatches, "num_total_tests"),
    testResults: json.flatMap((item) =>
      Array.isArray(item.testResults) ? item.testResults : []
    ),
  });
}

export function cleanupCompletedShardJestCache(shardDir: string): CompletedShardJestCacheCleanup {
  const resolvedShardDir = path.resolve(shardDir);
  const cacheDirectory = path.resolve(resolvedShardDir, "jest-cache");
  if (path.dirname(cacheDirectory) !== resolvedShardDir || path.basename(cacheDirectory) !== "jest-cache") {
    throw new Error(`invalid_completed_shard_jest_cache_path:${cacheDirectory}`);
  }
  const existedBefore = fs.existsSync(cacheDirectory);
  if (!existedBefore) {
    return {
      cache_directory: cacheDirectory,
      existed_before: false,
      attempted: false,
      succeeded: true,
      status: "NOT_PRESENT",
      blocking: false,
      error: null,
    };
  }
  try {
    const stat = fs.lstatSync(cacheDirectory);
    if (stat.isSymbolicLink()) throw new Error("completed_shard_jest_cache_is_symbolic_link");
    fs.rmSync(path.toNamespacedPath(cacheDirectory), {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    });
    const succeeded = !fs.existsSync(cacheDirectory);
    return {
      cache_directory: cacheDirectory,
      existed_before: true,
      attempted: true,
      succeeded,
      status: succeeded ? "REMOVED" : "DEFERRED",
      blocking: false,
      error: succeeded ? null : "completed_shard_jest_cache_remains",
    };
  } catch (error) {
    const classification = classifyCompletedShardJestCacheCleanupError(error);
    return {
      cache_directory: cacheDirectory,
      existed_before: true,
      attempted: true,
      succeeded: false,
      ...classification,
    };
  }
}

async function runShard(input: {
  root: string;
  outputDir: string;
  subjectSha: string;
  manifestHash: string;
  shard: WeightedJestShardPlan;
  microbatchFiles: number;
  microbatchTimeoutMs: number;
}): Promise<ShardRuntimeResult> {
  const id = String(input.shard.shard_id + 1).padStart(2, "0");
  const shardDir = path.join(input.outputDir, `shard-${id}`);
  fs.mkdirSync(shardDir, { recursive: true });
  const jestJsonPath = path.join(shardDir, "jest.json");
  const peakMemoryPath = path.join(shardDir, "peak-memory.json");
  const stdoutPath = path.join(shardDir, "stdout.log");
  const stderrPath = path.join(shardDir, "stderr.log");
  const metadataPath = path.join(shardDir, "metadata.json");
  const microbatchPlan = planJestShardMicrobatches(input.shard, input.microbatchFiles);
  writeJson(path.join(shardDir, "manifest.json"), {
    schema_version: DETERMINISTIC_FULL_JEST_SCHEMA_VERSION,
    evidence_class: "actual_environment",
    producer: "scripts/release/runDeterministicShardedFullJest.ts",
    subject_sha: input.subjectSha,
    manifest_hash: input.manifestHash,
    shard_id: input.shard.shard_id,
    test_files: input.shard.test_files,
    microbatches: microbatchPlan,
  });
  const startedAt = new Date();
  const microbatches: MicrobatchRuntimeResult[] = [];
  for (const microbatch of microbatchPlan) {
    microbatches.push(await runMicrobatch({
      root: input.root,
      shardDir,
      subjectSha: input.subjectSha,
      manifestHash: input.manifestHash,
      shardId: input.shard.shard_id,
      microbatch,
      timeoutMs: input.microbatchTimeoutMs,
    }));
  }
  aggregateJestJson(input.root, jestJsonPath, microbatches);
  writeJson(peakMemoryPath, {
    peak_rss_bytes: Math.max(...microbatches.map((item) => item.peak_rss_bytes ?? 0)),
    peak_heap_used_bytes: Math.max(...microbatches.map((item) => item.peak_heap_used_bytes ?? 0)),
  });
  concatenateLogs(input.root, stdoutPath, microbatches, "stdout_path");
  concatenateLogs(input.root, stderrPath, microbatches, "stderr_path");
  const cacheCleanup = cleanupCompletedShardJestCache(shardDir);
  const endedAt = new Date();
  const result: ShardRuntimeResult = {
    shard_id: input.shard.shard_id,
    subject_sha: input.subjectSha,
    manifest_hash: input.manifestHash,
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    duration_ms: endedAt.getTime() - startedAt.getTime(),
    exit_code: microbatches.every((item) => item.exit_code === 0) ? 0 : 1,
    signal: microbatches.find((item) => item.signal)?.signal ?? null,
    test_files: input.shard.test_files,
    jest_json_path: normalizedRelative(input.root, jestJsonPath),
    peak_memory_path: normalizedRelative(input.root, peakMemoryPath),
    stdout_path: normalizedRelative(input.root, stdoutPath),
    stderr_path: normalizedRelative(input.root, stderrPath),
    peak_rss_bytes: Math.max(...microbatches.map((item) => item.peak_rss_bytes ?? 0)),
    peak_heap_used_bytes: Math.max(...microbatches.map((item) => item.peak_heap_used_bytes ?? 0)),
    jest_success: microbatches.every((item) => item.jest_success),
    num_failed_test_suites: sumKnown(microbatches, "num_failed_test_suites"),
    num_failed_tests: sumKnown(microbatches, "num_failed_tests"),
    num_pending_test_suites: sumKnown(microbatches, "num_pending_test_suites"),
    num_pending_tests: sumKnown(microbatches, "num_pending_tests"),
    num_total_test_suites: sumKnown(microbatches, "num_total_test_suites"),
    num_total_tests: sumKnown(microbatches, "num_total_tests"),
    observed_test_files: microbatches.flatMap((item) => item.observed_test_files).sort(),
    jest_cache_cleanup: {
      ...cacheCleanup,
      cache_directory: normalizedRelative(input.root, cacheCleanup.cache_directory),
    },
    microbatches,
  };
  writeJson(metadataPath, result);
  return result;
}

async function runWithConcurrency<T, R>(
  inputs: readonly T[],
  concurrency: number,
  worker: (input: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(inputs.length);
  let cursor = 0;
  async function consume(): Promise<void> {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= inputs.length) return;
      results[index] = await worker(inputs[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, inputs.length) }, consume));
  return results;
}

function sumKnown<T extends object>(results: readonly T[], field: keyof T): number | null {
  const values = results.map((result) => result[field]);
  return values.every((value) => typeof value === "number")
    ? (values as number[]).reduce((sum, value) => sum + value, 0)
    : null;
}

async function main(): Promise<void> {
  const root = process.cwd();
  const args = parseArgs(process.argv.slice(2));
  const subjectSha = git(root, ["rev-parse", "HEAD"]);
  const branch = git(root, ["branch", "--show-current"]);
  const contextBefore = buildFullJestEvidenceContext();
  const subjectInputs = buildDeterministicFullJestSubjectInputs(root, contextBefore);
  const allowedOverlayPaths = resolveAllowedWorkspaceOverlayPaths({
    currentChangedFiles: contextBefore.changedFiles,
    explicitAllowedPaths: args.allowedOverlayPaths,
    allowCurrentWorkspaceOverlay: args.allowCurrentWorkspaceOverlay,
  });
  assertAllowedWorkspaceOverlay(contextBefore, allowedOverlayPaths);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = path.resolve(
    args.outputDir ?? path.join(root, ".release-runtime", "deterministic-full-jest", subjectSha, timestamp),
  );
  fs.mkdirSync(outputDir, { recursive: true });

  const jestBin = path.join(root, "node_modules", "jest", "bin", "jest.js");
  const listed = spawnSync(process.execPath, [jestBin, "--listTests", "--json", "--runInBand"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 100 * 1024 * 1024,
    windowsHide: true,
  });
  fs.writeFileSync(path.join(outputDir, "list-tests.stdout.log"), listed.stdout ?? "", "utf8");
  fs.writeFileSync(path.join(outputDir, "list-tests.stderr.log"), listed.stderr ?? "", "utf8");
  if (listed.status !== 0) throw new Error(`jest_list_tests_failed:${listed.status}`);
  const manifest = buildManifest(root, extractListTests(listed.stdout ?? ""));
  const hash = manifestHash(manifest);
  const contentHash = manifestContentHash(manifest);
  const shards = planWeightedJestShards(manifest, args.shards);
  const planValidation = validateWeightedJestShardPlan(manifest, shards);
  if (planValidation.missing.length || planValidation.duplicates.length || planValidation.unexpected.length) {
    throw new Error(`invalid_shard_plan:${JSON.stringify(planValidation)}`);
  }
  const manifestPath = path.join(outputDir, "manifest.json");
  const shardPlanPath = path.join(outputDir, "shard-plan.json");
  writeJson(manifestPath, {
    schema_version: DETERMINISTIC_FULL_JEST_SCHEMA_VERSION,
    evidence_class: "actual_environment",
    producer: "scripts/release/runDeterministicShardedFullJest.ts",
    subject_sha: subjectSha,
    branch,
    subject_inputs: subjectInputs,
    workspace_fingerprint: contextBefore.workspaceFingerprint,
    allowed_workspace_overlay_paths: allowedOverlayPaths,
    manifest_hash: hash,
    manifest_content_hash: contentHash,
    test_files_count: manifest.length,
    files: manifest,
  });
  const shardPlanSemanticHash = deterministicFullJestShardPlanSemanticHash(shards);
  writeJson(shardPlanPath, {
    schema_version: DETERMINISTIC_FULL_JEST_SCHEMA_VERSION,
    evidence_class: "actual_environment",
    producer: "scripts/release/runDeterministicShardedFullJest.ts",
    subject_sha: subjectSha,
    branch,
    subject_inputs: subjectInputs,
    manifest_hash: hash,
    requested_shards: args.shards,
    concurrency: args.concurrency,
    microbatch_files: args.microbatchFiles,
    microbatch_timeout_ms: args.microbatchTimeoutMs,
    shard_plan_semantic_hash: shardPlanSemanticHash,
    validation: planValidation,
    shards,
  });
  const manifestFileSha256 = sha256(fs.readFileSync(manifestPath));
  const shardPlanFileSha256 = sha256(fs.readFileSync(shardPlanPath));
  if (args.planOnly) {
    console.info(JSON.stringify({
      final_status: "GREEN_DETERMINISTIC_FULL_JEST_SHARD_PLAN_READY",
      subject_sha: subjectSha,
      manifest_hash: hash,
      test_files_count: manifest.length,
      shards: shards.length,
      microbatch_files: args.microbatchFiles,
      microbatch_timeout_ms: args.microbatchTimeoutMs,
      shard_plan_semantic_hash: shardPlanSemanticHash,
      manifest_file_sha256: manifestFileSha256,
      shard_plan_file_sha256: shardPlanFileSha256,
      output_dir: normalizedRelative(root, outputDir),
    }, null, 2));
    return;
  }

  const startedAt = new Date();
  const results = await runWithConcurrency(shards, args.concurrency, (shard) => runShard({
    root,
    outputDir,
    subjectSha,
    manifestHash: hash,
    shard,
    microbatchFiles: args.microbatchFiles,
    microbatchTimeoutMs: args.microbatchTimeoutMs,
  }));
  const endedAt = new Date();
  const contextAfter = buildFullJestEvidenceContext();
  const workspaceStable =
    contextAfter.headSha === contextBefore.headSha &&
    contextAfter.headTreeSha === contextBefore.headTreeSha &&
    contextAfter.workspaceFingerprint === contextBefore.workspaceFingerprint &&
    JSON.stringify(contextAfter.changedFiles) === JSON.stringify(contextBefore.changedFiles);
  const observed = results.flatMap((result) => result.observed_test_files);
  const observedOccurrences = new Map<string, number>();
  for (const file of observed) observedOccurrences.set(file, (observedOccurrences.get(file) ?? 0) + 1);
  const expected = new Set(manifest.map((entry) => entry.test_path));
  const observedMissing = [...expected].filter((file) => !observedOccurrences.has(file)).sort();
  const observedDuplicates = [...observedOccurrences]
    .filter(([, count]) => count !== 1)
    .map(([file]) => file)
    .sort();
  const observedUnexpected = [...observedOccurrences.keys()].filter((file) => !expected.has(file)).sort();
  const allShardExitsZero = results.every((result) => result.exit_code === 0 && result.signal === null);
  const allJestSuccess = results.every((result) => result.jest_success);
  const noPendingTests = results.every(
    (result) => result.num_pending_tests === 0 && result.num_pending_test_suites === 0,
  );
  const allResultsSameSubject = results.every(
    (result) => result.subject_sha === subjectSha && result.manifest_hash === hash,
  );
  const noTimeoutsOrOrphans = results.every((result) => result.microbatches.every((microbatch) =>
    !microbatch.timed_out && !microbatch.orphan_detected && microbatch.terminal_reason === "completed"));
  const allJestCachesCleaned = results.every((result) => result.jest_cache_cleanup.succeeded);
  const noBlockingJestCacheCleanupFailures = results.every(
    (result) => !result.jest_cache_cleanup.blocking,
  );
  const green =
    workspaceStable &&
    allShardExitsZero &&
    allJestSuccess &&
    noPendingTests &&
    allResultsSameSubject &&
    noTimeoutsOrOrphans &&
    noBlockingJestCacheCleanupFailures &&
    observedMissing.length === 0 &&
    observedDuplicates.length === 0 &&
    observedUnexpected.length === 0;
  const summary = {
    schema_version: DETERMINISTIC_FULL_JEST_SCHEMA_VERSION,
    evidence_class: "actual_environment",
    producer: "scripts/release/runDeterministicShardedFullJest.ts",
    terminal_complete: true,
    final_status: green
      ? "GREEN_ESTIMATE_V4_CURRENT_CORE_DETERMINISTIC_SHARDED_FULL_JEST"
      : "STOP_ESTIMATE_V4_CURRENT_CORE_DETERMINISTIC_SHARDED_FULL_JEST",
    subject_sha: subjectSha,
    branch,
    subject_inputs: subjectInputs,
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    duration_ms: endedAt.getTime() - startedAt.getTime(),
    manifest_hash: hash,
    manifest_content_hash: contentHash,
    manifest_file_sha256: manifestFileSha256,
    shard_plan_file_sha256: shardPlanFileSha256,
    shard_plan_semantic_hash: shardPlanSemanticHash,
    manifest_files: manifest.length,
    requested_shards: args.shards,
    planned_shards: shards.length,
    concurrency: args.concurrency,
    microbatch_files: args.microbatchFiles,
    microbatch_timeout_ms: args.microbatchTimeoutMs,
    microbatches: results.reduce((sum, result) => sum + result.microbatches.length, 0),
    workspace_fingerprint_before: contextBefore.workspaceFingerprint,
    workspace_fingerprint_after: contextAfter.workspaceFingerprint,
    workspace_stable: workspaceStable,
    allowed_workspace_overlay_paths: allowedOverlayPaths,
    missing_files: observedMissing,
    duplicate_files: observedDuplicates,
    unexpected_files: observedUnexpected,
    all_shard_exits_zero: allShardExitsZero,
    all_jest_success: allJestSuccess,
    no_pending_tests: noPendingTests,
    all_results_same_subject_sha: allResultsSameSubject,
    no_timeouts_or_orphans: noTimeoutsOrOrphans,
    all_completed_shard_jest_caches_cleaned: allJestCachesCleaned,
    no_blocking_completed_shard_jest_cache_cleanup_failures: noBlockingJestCacheCleanupFailures,
    completed_shard_jest_cache_cleanup_deferred: results
      .filter((result) => result.jest_cache_cleanup.status === "DEFERRED")
      .map((result) => ({
        shard_id: result.shard_id,
        ...result.jest_cache_cleanup,
      })),
    completed_shard_jest_cache_cleanup_failures: results
      .filter((result) => !result.jest_cache_cleanup.succeeded)
      .map((result) => ({
        shard_id: result.shard_id,
        ...result.jest_cache_cleanup,
      })),
    num_failed_test_suites: sumKnown(results, "num_failed_test_suites"),
    num_failed_tests: sumKnown(results, "num_failed_tests"),
    num_pending_test_suites: sumKnown(results, "num_pending_test_suites"),
    num_pending_tests: sumKnown(results, "num_pending_tests"),
    num_total_test_suites: sumKnown(results, "num_total_test_suites"),
    num_total_tests: sumKnown(results, "num_total_tests"),
    peak_rss_bytes: Math.max(...results.map((result) => result.peak_rss_bytes ?? 0)),
    shards: results,
    fake_green_claimed: false,
  };
  writeJson(path.join(outputDir, "terminal-summary.json"), summary);
  console.info(JSON.stringify(summary, null, 2));
  if (!green) process.exitCode = 1;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/release/runDeterministicShardedFullJest.ts")) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}
