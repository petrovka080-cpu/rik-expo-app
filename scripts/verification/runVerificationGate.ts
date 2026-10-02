import { execFileSync, spawn, spawnSync, type ChildProcess } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { clearInterval, clearTimeout, setInterval, setTimeout } from "node:timers";

import { startWindowsCurrentCoreMemoryMonitor } from "../release/currentCoreMemoryMonitor";
import {
  AFFECTED_JEST_OLD_SPACE_MIB,
  buildAffectedJestShardPlan,
  resolveAffectedJestShardCount,
} from "./affectedJestSharding";
import { buildVerificationPlan, type VerificationLevel } from "./impactAnalyzer";
import { hashDistributedReceiptStringList } from "./mergeDistributedAffectedJestShardReceipts";
import { mergeVerificationShards, type ShardResult } from "./verificationShardMerger";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function argValues(name: string): string[] {
  const prefix = `--${name}=`;
  return process.argv.filter((value) => value.startsWith(prefix)).map((value) => value.slice(prefix.length));
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
  assertionResults?: Record<string, unknown>[];
  testResults?: Record<string, unknown>[];
};

type JestShardRuntime = {
  shardId: number;
  resourceWaveId: number;
  suites: string[];
  status: number;
  signal: NodeJS.Signals | null;
  stdoutPath: string;
  stderrPath: string;
  resultPath: string;
  result: JestJson;
  failedAssertions: string[];
  pid: number | null;
  startedAt: string;
  endedAt: string;
  closeObserved: boolean;
  closeObservedAt: string | null;
  observedExitCode: number | null;
  withinTechnicalDeadline: boolean;
  timedOut: boolean;
  technicalDeadlineAt: string;
  terminationAttempted: boolean;
  terminationSucceeded: boolean;
  orphanDetected: boolean;
  observedSuites: string[];
  missingSuites: string[];
  progressPath: string;
  heartbeatPath: string;
  memoryEvidencePath: string;
  memoryEvidenceStatus: "COMPLETE" | "INFRASTRUCTURE_RED" | "UNSUPPORTED_PLATFORM";
  memoryEvidenceBlocker: string | null;
  memoryPeakBytes: number;
  memoryDescendantsObserved: number;
  memorySamples: number;
};

export const AFFECTED_VERIFICATION_BUDGET_MS = 600_000;
export const AFFECTED_VERIFICATION_TECHNICAL_TIMEOUT_MS = 720_000;
export const DISTRIBUTED_AFFECTED_REQUIRED_AVAILABLE_BYTES = 8_771_948_544;
export const MAX_DISTRIBUTED_AFFECTED_JEST_STANDARD_SHARDS = 16;
const TERMINATION_GRACE_MS = 5_000;
export const RESOURCE_ADMISSION_SETTLE_MAX_MS = 30_000;
export const RESOURCE_ADMISSION_SAMPLE_INTERVAL_MS = 2_000;
const HEARTBEAT_INTERVAL_MS = 5_000;
const MEMORY_MONITOR_GRACE_MS = 500;
const JEST_PROCESS_ROOT_PATH = path.resolve("scripts/release/currentCoreJestBatchRoot.mjs");

export type VerificationResourceAdmission = Readonly<{
  sampled_at: string;
  free_physical_bytes: number;
  required_available_bytes: number;
  passed: boolean;
  settle_wait_ms: number;
  sample_count: number;
  samples: readonly Readonly<{
    sampled_at: string;
    free_physical_bytes: number;
    passed: boolean;
  }>[];
}>;

export function resolveAffectedVerificationPredictedCriticalPathMs(input: Readonly<{
  distributedExecution: boolean;
  sequentialWaveWeightMs: number;
  shardWeightsMs: readonly number[];
}>): number {
  if (!input.distributedExecution) return input.sequentialWaveWeightMs;
  if (input.shardWeightsMs.length === 0) return 0;
  return Math.max(...input.shardWeightsMs);
}

export async function awaitVerificationResourceAdmission(input: Readonly<{
  requiredAvailableBytes: number;
  technicalDeadlineAtMs: number;
  sampleFreePhysicalBytes?: () => number;
  nowMs?: () => number;
  sleep?: (durationMs: number) => Promise<void>;
  maximumSettleMs?: number;
  sampleIntervalMs?: number;
}>): Promise<VerificationResourceAdmission> {
  const sampleFreePhysicalBytes = input.sampleFreePhysicalBytes ?? os.freemem;
  const nowMs = input.nowMs ?? Date.now;
  const sleep = input.sleep ?? ((durationMs: number) => new Promise<void>((resolveSleep) => {
    setTimeout(resolveSleep, durationMs);
  }));
  const maximumSettleMs = input.maximumSettleMs ?? RESOURCE_ADMISSION_SETTLE_MAX_MS;
  const sampleIntervalMs = input.sampleIntervalMs ?? RESOURCE_ADMISSION_SAMPLE_INTERVAL_MS;
  if (!Number.isSafeInteger(input.requiredAvailableBytes) || input.requiredAvailableBytes <= 0) {
    throw new Error("verification_resource_admission_required_bytes_invalid");
  }
  if (!Number.isSafeInteger(maximumSettleMs) || maximumSettleMs < 0) {
    throw new Error("verification_resource_admission_settle_ms_invalid");
  }
  if (!Number.isSafeInteger(sampleIntervalMs) || sampleIntervalMs <= 0) {
    throw new Error("verification_resource_admission_sample_interval_ms_invalid");
  }
  const startedAtMs = nowMs();
  const latestSampleAtMs = Math.min(
    startedAtMs + maximumSettleMs,
    input.technicalDeadlineAtMs - TERMINATION_GRACE_MS * 2,
  );
  const samples: Array<{
    sampled_at: string;
    free_physical_bytes: number;
    passed: boolean;
  }> = [];
  while (true) {
    const sampledAtMs = nowMs();
    const freePhysicalBytes = sampleFreePhysicalBytes();
    const passed = freePhysicalBytes >= input.requiredAvailableBytes;
    samples.push({
      sampled_at: new Date(sampledAtMs).toISOString(),
      free_physical_bytes: freePhysicalBytes,
      passed,
    });
    if (passed || sampledAtMs >= latestSampleAtMs) break;
    await sleep(Math.min(sampleIntervalMs, latestSampleAtMs - sampledAtMs));
  }
  const terminal = samples[samples.length - 1]!;
  return Object.freeze({
    sampled_at: terminal.sampled_at,
    free_physical_bytes: terminal.free_physical_bytes,
    required_available_bytes: input.requiredAvailableBytes,
    passed: terminal.passed,
    settle_wait_ms: Math.max(0, Date.parse(terminal.sampled_at) - startedAtMs),
    sample_count: samples.length,
    samples: Object.freeze(samples.map((sample) => Object.freeze(sample))),
  });
}

export function classifyAffectedVerificationSuites(suites: readonly string[]): {
  jest: string[];
  playwright: string[];
} {
  const playwright: string[] = [];
  const jest: string[] = [];
  for (const suite of suites) {
    if (/\.web\.spec\.[cm]?[jt]sx?$/i.test(suite)) playwright.push(suite);
    else jest.push(suite);
  }
  return { jest, playwright };
}

export function resolveAffectedPlaywrightRunnerOwnership(input: {
  root: string;
  suites: readonly string[];
}): {
  runner: "playwright";
  config_path: string;
  cli_path: string | null;
  project: "chromium";
  workers: 1;
  command: string[] | null;
  owned_suites: string[];
  unowned_suites: string[];
  complete: boolean;
  execution_mode: "external-explicit";
  requires_explicit_environment_and_actor_preflight: true;
} {
  const configPath = path.join(input.root, "playwright.config.ts");
  const cliPath = path.join(input.root, "node_modules", "playwright", "cli.js");
  const infrastructureReady = fs.existsSync(configPath) && fs.existsSync(cliPath);
  const relative = (value: string) => path.relative(input.root, value).replace(/\\/g, "/");
  const suites = [...input.suites];

  return {
    runner: "playwright",
    config_path: relative(configPath),
    cli_path: fs.existsSync(cliPath) ? relative(cliPath) : null,
    project: "chromium",
    workers: 1,
    command: infrastructureReady
      ? [
          process.execPath,
          relative(cliPath),
          "test",
          ...suites,
          `--config=${relative(configPath)}`,
          "--project=chromium",
          "--workers=1",
        ]
      : null,
    owned_suites: infrastructureReady ? suites : [],
    unowned_suites: infrastructureReady ? [] : suites,
    complete: suites.length === 0 || infrastructureReady,
    execution_mode: "external-explicit",
    requires_explicit_environment_and_actor_preflight: true,
  };
}

type PlaywrightJsonTest = {
  expectedStatus?: unknown;
  results?: unknown;
  status?: unknown;
};

type PlaywrightJsonSpec = {
  file?: unknown;
  line?: unknown;
  ok?: unknown;
  tests?: unknown;
  title?: unknown;
};

type PlaywrightJsonSuite = {
  file?: unknown;
  specs?: unknown;
  suites?: unknown;
};

function playwrightResultPassed(test: PlaywrightJsonTest): boolean {
  if (test.status !== "expected" || test.expectedStatus !== "passed" || !Array.isArray(test.results)) return false;
  const terminal = test.results.at(-1) as { status?: unknown } | undefined;
  return terminal?.status === "passed";
}

export function validateAffectedPlaywrightResultEvidence(input: {
  root: string;
  expectedSuites: readonly string[];
  resultFiles: readonly string[];
}): {
  complete: boolean;
  passed_suites: string[];
  missing_suites: string[];
  suite_evidence: {
    suite: string;
    result_path: string;
    result_sha256: string;
    test_ids: string[];
  }[];
  rejected_result_files: string[];
} {
  const expected = [...input.expectedSuites];
  const expectedSet = new Set(expected);
  const byBasename = new Map<string, string[]>();
  for (const suite of expected) {
    const basename = path.posix.basename(suite.replace(/\\/g, "/"));
    byBasename.set(basename, [...(byBasename.get(basename) ?? []), suite]);
  }
  const relative = (value: string) => path.relative(input.root, value).replace(/\\/g, "/");
  const successful = new Map<string, {
    result_path: string;
    result_sha256: string;
    test_ids: string[];
  }>();
  const rejectedResultFiles: string[] = [];

  for (const rawResultFile of input.resultFiles) {
    const resultFile = path.resolve(input.root, rawResultFile);
    if (!fs.existsSync(resultFile)) {
      rejectedResultFiles.push(relative(resultFile));
      continue;
    }
    let payload: { suites?: unknown };
    try {
      payload = JSON.parse(fs.readFileSync(resultFile, "utf8")) as { suites?: unknown };
    } catch {
      rejectedResultFiles.push(relative(resultFile));
      continue;
    }
    if (!Array.isArray(payload.suites)) {
      rejectedResultFiles.push(relative(resultFile));
      continue;
    }
    const observed = new Map<string, { allPassed: boolean; testIds: Set<string> }>();
    const stack = [...payload.suites] as PlaywrightJsonSuite[];
    while (stack.length > 0) {
      const suite = stack.pop();
      if (!suite || typeof suite !== "object") continue;
      if (Array.isArray(suite.suites)) stack.push(...suite.suites as PlaywrightJsonSuite[]);
      if (!Array.isArray(suite.specs)) continue;
      for (const spec of suite.specs as PlaywrightJsonSpec[]) {
        const rawFile = typeof spec.file === "string"
          ? spec.file.replace(/\\/g, "/")
          : typeof suite.file === "string" ? suite.file.replace(/\\/g, "/") : "";
        const direct = expectedSet.has(rawFile) ? rawFile : null;
        const basenameMatches = byBasename.get(path.posix.basename(rawFile)) ?? [];
        const selected = direct ?? (basenameMatches.length === 1 ? basenameMatches[0] : null);
        if (!selected) continue;
        const tests = Array.isArray(spec.tests) ? spec.tests as PlaywrightJsonTest[] : [];
        const passed = spec.ok === true && tests.length > 0 && tests.every(playwrightResultPassed);
        const testId = `${String(spec.title ?? "")}:${String(spec.line ?? "")}`;
        const current = observed.get(selected) ?? { allPassed: true, testIds: new Set<string>() };
        current.allPassed = current.allPassed && passed;
        current.testIds.add(testId);
        observed.set(selected, current);
      }
    }
    const resultPath = relative(resultFile);
    const resultSha256 = sha256File(resultFile);
    for (const [suite, terminal] of observed) {
      if (terminal.allPassed && terminal.testIds.size > 0) {
        successful.set(suite, {
          result_path: resultPath,
          result_sha256: resultSha256,
          test_ids: [...terminal.testIds].sort((left, right) => left.localeCompare(right, "en")),
        });
      }
    }
  }

  const passedSuites = expected.filter((suite) => successful.has(suite));
  const missingSuites = expected.filter((suite) => !successful.has(suite));
  return {
    complete: expected.length === 0 || missingSuites.length === 0,
    passed_suites: passedSuites,
    missing_suites: missingSuites,
    suite_evidence: passedSuites.map((suite) => ({ suite, ...successful.get(suite)! })),
    rejected_result_files: rejectedResultFiles,
  };
}

export function evaluateAffectedVerificationPlanReadiness(input: {
  selectedSuites: number;
  calibratedSuites: number;
  executionProfileCompatible: boolean;
  predictedCriticalPathMs: number;
  budgetMs: number;
  missingSuites: number;
  validationErrors: number;
}): {
  passed: boolean;
  calibration_complete: boolean;
  predicted_slo_feasible: boolean;
} {
  const calibrationComplete = input.selectedSuites > 0
    && input.calibratedSuites === input.selectedSuites
    && input.executionProfileCompatible;
  const predictedSloFeasible = Number.isFinite(input.predictedCriticalPathMs)
    && input.predictedCriticalPathMs <= input.budgetMs;
  return {
    passed: calibrationComplete
      && predictedSloFeasible
      && input.missingSuites === 0
      && input.validationErrors === 0,
    calibration_complete: calibrationComplete,
    predicted_slo_feasible: predictedSloFeasible,
  };
}

type ProcessTreeMemoryEvidence = {
  blocker?: string | null;
  descendants_observed?: number;
  memory_peak_bytes?: number;
  samples?: number;
  status?: "COMPLETE" | "INFRASTRUCTURE_RED";
  writer_complete?: boolean;
};

export type VerificationShardProcessTerminalInput = {
  resultSuccess: boolean;
  observedExitCode: number | null;
  closeObserved: boolean;
  closeObservedAtMs: number | null;
  technicalDeadlineAtMs: number;
  timeoutTriggered: boolean;
  orphanDetected: boolean;
  missingSuiteCount: number;
};

export function evaluateVerificationShardProcessTerminal(
  input: VerificationShardProcessTerminalInput,
): {
  passed: boolean;
  close_observed: boolean;
  exit_zero_observed: boolean;
  within_technical_deadline: boolean;
  technical_timed_out: boolean;
  complete_expected_suites: boolean;
} {
  const closeTimestampIsValid = input.closeObservedAtMs != null
    && Number.isFinite(input.closeObservedAtMs);
  const withinTechnicalDeadline = input.closeObserved
    && closeTimestampIsValid
    && (input.closeObservedAtMs as number) <= input.technicalDeadlineAtMs;
  const deadlineExceeded = input.closeObserved
    && closeTimestampIsValid
    && (input.closeObservedAtMs as number) > input.technicalDeadlineAtMs;
  const exitZeroObserved = input.closeObserved && input.observedExitCode === 0;
  const completeExpectedSuites = input.missingSuiteCount === 0;
  const technicalTimedOut = input.timeoutTriggered || deadlineExceeded;
  return {
    passed: input.resultSuccess
      && exitZeroObserved
      && withinTechnicalDeadline
      && !technicalTimedOut
      && !input.orphanDetected
      && completeExpectedSuites,
    close_observed: input.closeObserved,
    exit_zero_observed: exitZeroObserved,
    within_technical_deadline: withinTechnicalDeadline,
    technical_timed_out: technicalTimedOut,
    complete_expected_suites: completeExpectedSuites,
  };
}

export function evaluateVerificationShardMemoryTerminal(input: {
  platform: NodeJS.Platform;
  monitorExitCode: number | null;
  evidence: ProcessTreeMemoryEvidence | null;
}): {
  status: "COMPLETE" | "INFRASTRUCTURE_RED" | "UNSUPPORTED_PLATFORM";
  blocker: string | null;
  peakBytes: number;
  descendantsObserved: number;
  samples: number;
} {
  if (input.platform !== "win32") {
    return {
      status: "UNSUPPORTED_PLATFORM",
      blocker: "PROCESS_TREE_MEMORY_MEASUREMENT_UNSUPPORTED_PLATFORM",
      peakBytes: 0,
      descendantsObserved: 0,
      samples: 0,
    };
  }
  const complete = input.monitorExitCode === 0
    && input.evidence?.writer_complete === true
    && input.evidence.status === "COMPLETE"
    && Number(input.evidence.memory_peak_bytes ?? 0) > 0;
  return {
    status: complete ? "COMPLETE" : "INFRASTRUCTURE_RED",
    blocker: complete
      ? null
      : String(
        input.evidence?.blocker
          ?? (input.monitorExitCode === 0
            ? "MEMORY_EVIDENCE_MISSING_OR_INCOMPLETE"
            : `MEMORY_MONITOR_EXIT_${String(input.monitorExitCode)}`),
      ),
    peakBytes: complete ? Number(input.evidence?.memory_peak_bytes ?? 0) : 0,
    descendantsObserved: complete ? Number(input.evidence?.descendants_observed ?? 0) : 0,
    samples: complete ? Number(input.evidence?.samples ?? 0) : 0,
  };
}

export function affectedJestCliArgs(input: {
  root: string;
  suites: readonly string[];
  resultPath: string;
}): string[] {
  return [
    path.join(input.root, "node_modules", "jest", "bin", "jest.js"),
    "--runTestsByPath",
    ...input.suites,
    "--runInBand",
    "--reporters=default",
    `--reporters=${path.join(input.root, "scripts", "verification", "affectedJestProgressReporter.cjs")}`,
    "--json",
    `--outputFile=${input.resultPath}`,
  ];
}

export function affectedJestNodeOptions(current: string | undefined): string {
  const retained = (current ?? "")
    .replace(/(?:^|\s)--max-old-space-size(?:=|\s+)\d+(?=\s|$)/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return [retained, `--max-old-space-size=${AFFECTED_JEST_OLD_SPACE_MIB}`]
    .filter(Boolean)
    .join(" ");
}

function processExists(pid: number | null): boolean {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function terminateOwnedProcessTree(child: ChildProcess, force: boolean): boolean {
  if (!child.pid || child.exitCode != null || child.signalCode != null) return true;
  if (process.platform === "win32") {
    const result = spawnSync("taskkill", ["/PID", String(child.pid), "/T", ...(force ? ["/F"] : [])], {
      windowsHide: true,
      stdio: "ignore",
    });
    return result.status === 0 || !processExists(child.pid);
  }
  try {
    return child.kill(force ? "SIGKILL" : "SIGTERM");
  } catch {
    return !processExists(child.pid);
  }
}

function normalizedSuitePath(root: string, candidate: unknown): string | null {
  if (typeof candidate !== "string" || !candidate.trim()) return null;
  const absolute = path.isAbsolute(candidate) ? candidate : path.resolve(root, candidate);
  const relative = path.relative(root, absolute).replace(/\\/g, "/");
  return relative.startsWith("../") ? null : relative;
}

function observedSuitesFromResult(root: string, result: JestJson): string[] {
  if (!Array.isArray(result.testResults)) return [];
  return [...new Set(result.testResults
    .map((suite) => normalizedSuitePath(root, suite.name ?? suite.testFilePath))
    .filter((suite): suite is string => suite != null))].sort((a, b) => a.localeCompare(b, "en"));
}

function observedSuitesFromProgress(root: string, progressPath: string): string[] {
  if (!fs.existsSync(progressPath)) return [];
  const observed: string[] = [];
  for (const line of fs.readFileSync(progressPath, "utf8").split(/\r?\n/).filter(Boolean)) {
    try {
      const event = JSON.parse(line) as Record<string, unknown>;
      if (event.event !== "suite_terminal") continue;
      const suite = normalizedSuitePath(root, event.test_path);
      if (suite) observed.push(suite);
    } catch {
      // A partially flushed last line is not evidence and is ignored.
    }
  }
  return [...new Set(observed)].sort((a, b) => a.localeCompare(b, "en"));
}

function failedAssertions(result: JestJson): string[] {
  return Array.isArray(result.testResults)
    ? result.testResults.flatMap((suite) =>
      Array.isArray(suite.assertionResults)
        ? (suite.assertionResults as Record<string, unknown>[])
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

export function runJestShard(input: {
  root: string;
  outputDir: string;
  runId: string;
  shardId: number;
  resourceWaveId: number;
  suites: string[];
  technicalDeadlineAtMs: number;
}): Promise<JestShardRuntime> {
  const shardDir = path.join(input.outputDir, "shards", input.runId, `shard-${input.shardId}`);
  fs.mkdirSync(shardDir, { recursive: true });
  const resultPath = path.join(shardDir, "jest-result.json");
  const stdoutPath = path.join(shardDir, "stdout.log");
  const stderrPath = path.join(shardDir, "stderr.log");
  const progressPath = path.join(shardDir, "progress.ndjson");
  const heartbeatPath = path.join(shardDir, "heartbeat.json");
  const memoryEvidencePath = path.join(shardDir, "process-tree-memory.json");
  const memoryReadyPath = path.join(shardDir, "process-tree-memory.ready.json");
  for (const outputPath of [stdoutPath, stderrPath, progressPath]) fs.writeFileSync(outputPath, "", "utf8");
  for (const stalePath of [
    memoryEvidencePath,
    `${memoryEvidencePath}.tmp`,
    memoryReadyPath,
    `${memoryReadyPath}.tmp`,
  ]) {
    if (fs.existsSync(stalePath)) fs.rmSync(stalePath);
  }
  return new Promise((resolve) => {
    const started = new Date();
    const jestArguments = affectedJestCliArgs({
      root: input.root,
      suites: input.suites,
      resultPath,
    });
    const windowsTreeMeasurement = process.platform === "win32";
    const childArguments = windowsTreeMeasurement
      ? [JEST_PROCESS_ROOT_PATH, memoryReadyPath, ...jestArguments]
      : jestArguments;
    const child = spawn(process.execPath, childArguments, {
      cwd: input.root,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        AFFECTED_JEST_PROGRESS_PATH: progressPath,
        NODE_OPTIONS: affectedJestNodeOptions(process.env.NODE_OPTIONS),
      },
    });
    const pid = child.pid ?? null;
    let memoryMonitor: ChildProcess | null = null;
    let memoryMonitorClosed: Promise<number | null> = Promise.resolve(null);
    if (windowsTreeMeasurement && pid != null) {
      memoryMonitor = startWindowsCurrentCoreMemoryMonitor({
        cwd: input.root,
        evidencePath: memoryEvidencePath,
        expectedCommandFragments: [
          JEST_PROCESS_ROOT_PATH,
          jestArguments[0],
          resultPath,
        ],
        graceMs: MEMORY_MONITOR_GRACE_MS,
        maxDurationMs: Math.max(
          TERMINATION_GRACE_MS * 2,
          input.technicalDeadlineAtMs - Date.now() + TERMINATION_GRACE_MS * 2,
        ),
        readyPath: memoryReadyPath,
        rootPid: pid,
        runnerPid: process.pid,
      });
      memoryMonitorClosed = new Promise((monitorResolve) => {
        memoryMonitor?.once("close", (code) => monitorResolve(code));
        memoryMonitor?.once("error", () => monitorResolve(null));
      });
    }
    let timedOut = false;
    let terminationAttempted = false;
    let terminationSucceeded = false;
    let settled = false;
    let forceTimer: ReturnType<typeof setTimeout> | null = null;
    let boundedCloseoutTimer: ReturnType<typeof setTimeout> | null = null;
    const writeHeartbeat = (state: "RUNNING" | "TIMEOUT_CLOSEOUT" | "TERMINAL") => {
      const observedSuites = observedSuitesFromProgress(input.root, progressPath);
      writeJson(heartbeatPath, {
        schema: "verification-affected-jest-heartbeat/v1",
        shard_id: input.shardId,
        state,
        pid,
        started_at: started.toISOString(),
        observed_at: new Date().toISOString(),
        technical_deadline_at: new Date(input.technicalDeadlineAtMs).toISOString(),
        assigned_suite_count: input.suites.length,
        observed_suite_terminal_count: observedSuites.length,
        observed_suites: observedSuites,
        remaining_suite_count: input.suites.length - observedSuites.length,
        heartbeat_is_progress_proof: false,
      });
    };
    writeHeartbeat("RUNNING");
    const heartbeatTimer = setInterval(() => writeHeartbeat(timedOut ? "TIMEOUT_CLOSEOUT" : "RUNNING"), HEARTBEAT_INTERVAL_MS);
    child.stdout?.on("data", (chunk: Buffer) => fs.appendFileSync(stdoutPath, chunk));
    child.stderr?.on("data", (chunk: Buffer) => fs.appendFileSync(stderrPath, chunk));
    child.once("error", (error) => fs.appendFileSync(stderrPath, `\nspawn_error:${error.message}\n`, "utf8"));

    const finish = async (
      code: number | null,
      signal: NodeJS.Signals | null,
      closeObserved: boolean,
    ): Promise<void> => {
      if (settled) return;
      settled = true;
      const closeObservedAtMs = closeObserved ? Date.now() : null;
      clearInterval(heartbeatTimer);
      clearTimeout(deadlineTimer);
      if (forceTimer) clearTimeout(forceTimer);
      if (boundedCloseoutTimer) clearTimeout(boundedCloseoutTimer);
      if (!closeObserved && memoryMonitor && processExists(memoryMonitor.pid ?? null)) {
        memoryMonitor.kill();
      }
      const memoryMonitorExitCode = await memoryMonitorClosed;
      let memoryEvidence: ProcessTreeMemoryEvidence | null = null;
      if (fs.existsSync(memoryEvidencePath)) {
        try {
          memoryEvidence = JSON.parse(
            fs.readFileSync(memoryEvidencePath, "utf8"),
          ) as ProcessTreeMemoryEvidence;
        } catch {
          memoryEvidence = {
            blocker: "MEMORY_EVIDENCE_INVALID_JSON",
            status: "INFRASTRUCTURE_RED",
            writer_complete: false,
          };
        }
      }
      const memoryTerminal = evaluateVerificationShardMemoryTerminal({
        platform: process.platform,
        monitorExitCode: memoryMonitorExitCode,
        evidence: memoryEvidence,
      });
      let result: JestJson = {};
      if (fs.existsSync(resultPath)) {
        try {
          result = JSON.parse(fs.readFileSync(resultPath, "utf8")) as JestJson;
        } catch (error) {
          fs.appendFileSync(
            stderrPath,
            `\nresult_json_error:${error instanceof Error ? error.message : String(error)}\n`,
            "utf8",
          );
        }
      }
      const observedSuites = [...new Set([
        ...observedSuitesFromProgress(input.root, progressPath),
        ...observedSuitesFromResult(input.root, result),
      ])].sort((a, b) => a.localeCompare(b, "en"));
      const observedSet = new Set(observedSuites);
      const missingSuites = input.suites.filter((suite) => !observedSet.has(suite)).sort((a, b) => a.localeCompare(b, "en"));
      const orphanDetected = (timedOut || !closeObserved) && processExists(pid);
      const processTerminal = evaluateVerificationShardProcessTerminal({
        resultSuccess: result.success === true,
        observedExitCode: code,
        closeObserved,
        closeObservedAtMs,
        technicalDeadlineAtMs: input.technicalDeadlineAtMs,
        timeoutTriggered: timedOut,
        orphanDetected,
        missingSuiteCount: missingSuites.length,
      });
      timedOut = processTerminal.technical_timed_out;
      if (terminationAttempted && !orphanDetected) terminationSucceeded = true;
      writeHeartbeat("TERMINAL");
      const ended = new Date();
      resolve({
        shardId: input.shardId,
        resourceWaveId: input.resourceWaveId,
        suites: input.suites,
        status: processTerminal.passed && memoryTerminal.status !== "INFRASTRUCTURE_RED" ? 0 : 1,
        signal,
        stdoutPath,
        stderrPath,
        resultPath,
        result,
        failedAssertions: failedAssertions(result),
        pid,
        startedAt: started.toISOString(),
        endedAt: ended.toISOString(),
        closeObserved,
        closeObservedAt: closeObservedAtMs == null ? null : new Date(closeObservedAtMs).toISOString(),
        observedExitCode: code,
        withinTechnicalDeadline: processTerminal.within_technical_deadline,
        timedOut,
        technicalDeadlineAt: new Date(input.technicalDeadlineAtMs).toISOString(),
        terminationAttempted,
        terminationSucceeded,
        orphanDetected,
        observedSuites,
        missingSuites,
        progressPath,
        heartbeatPath,
        memoryEvidencePath,
        memoryEvidenceStatus: memoryTerminal.status,
        memoryEvidenceBlocker: memoryTerminal.blocker,
        memoryPeakBytes: memoryTerminal.peakBytes,
        memoryDescendantsObserved: memoryTerminal.descendantsObserved,
        memorySamples: memoryTerminal.samples,
      });
    };

    const deadlineDelayMs = Math.max(1, input.technicalDeadlineAtMs - Date.now());
    const deadlineTimer = setTimeout(() => {
      timedOut = true;
      terminationAttempted = true;
      fs.appendFileSync(stderrPath, `\ntechnical_timeout:${new Date().toISOString()}\n`, "utf8");
      writeHeartbeat("TIMEOUT_CLOSEOUT");
      terminationSucceeded = terminateOwnedProcessTree(child, false);
      forceTimer = setTimeout(() => {
        if (!processExists(pid)) return;
        terminationSucceeded = terminateOwnedProcessTree(child, true);
      }, TERMINATION_GRACE_MS);
      boundedCloseoutTimer = setTimeout(
        () => void finish(child.exitCode, child.signalCode, false),
        TERMINATION_GRACE_MS * 2,
      );
    }, deadlineDelayMs);
    child.once("close", (code, signal) => void finish(code, signal, true));
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
    wasInterrupted: shards.some((shard) => shard.timedOut || shard.result.wasInterrupted === true),
  };
}

async function run(): Promise<void> {
  const root = process.cwd();
  const level = (arg("level") ?? "local") as VerificationLevel;
  if (!( ["local", "affected", "pr"] as string[]).includes(level)) {
    throw new Error(`invalid_verification_level:${level}`);
  }
  const started = new Date();
  const budgetMs = level === "local" ? 300_000 : level === "affected" ? AFFECTED_VERIFICATION_BUDGET_MS : 1_800_000;
  const defaultTechnicalTimeoutMs = level === "local"
    ? 360_000
    : level === "affected" ? AFFECTED_VERIFICATION_TECHNICAL_TIMEOUT_MS : 2_100_000;
  const technicalTimeoutMs = Number(arg("technical-timeout-ms") ?? defaultTechnicalTimeoutMs);
  if (!Number.isInteger(technicalTimeoutMs) || technicalTimeoutMs < budgetMs) {
    throw new Error(`invalid_verification_technical_timeout_ms:${technicalTimeoutMs}:budget:${budgetMs}`);
  }
  const technicalDeadlineAtMs = started.getTime() + technicalTimeoutMs;
  const maximumParallelProcessRootsArg = arg("max-process-roots");
  const maximumParallelProcessRoots = maximumParallelProcessRootsArg == null
    ? undefined
    : Number(maximumParallelProcessRootsArg);
  if (
    maximumParallelProcessRoots != null
    && (!Number.isInteger(maximumParallelProcessRoots) || maximumParallelProcessRoots < 1)
  ) {
    throw new Error(`invalid_verification_max_process_roots:${maximumParallelProcessRootsArg}`);
  }
  const distributedExecution = process.argv.includes("--distributed-execution");
  if (distributedExecution && level !== "affected") {
    throw new Error("distributed_execution_requires_affected_level");
  }
  const requestedShardCountArg = arg("shard-count");
  const requestedShardCount = requestedShardCountArg == null
    ? undefined
    : Number(requestedShardCountArg);
  if (
    requestedShardCount != null
    && (
      level !== "affected"
      || !Number.isInteger(requestedShardCount)
      || requestedShardCount < 1
      || requestedShardCount > MAX_DISTRIBUTED_AFFECTED_JEST_STANDARD_SHARDS
    )
  ) {
    throw new Error(`invalid_verification_shard_count:${requestedShardCountArg}`);
  }
  const baseSha = arg("base") ?? git(["rev-parse", "HEAD"]);
  const headSha = arg("head") ?? git(["rev-parse", "HEAD"]);
  const plan = buildVerificationPlan({ baseSha, headSha, level, changedFiles: changedFiles(baseSha, headSha), root });
  const outputDir = path.resolve(arg("output-dir") ?? path.join(".release-runtime", "verification-v1", headSha, level));
  const planPath = path.join(outputDir, "plan.json");
  writeJson(planPath, plan);

  const resultPath = path.join(outputDir, "jest-result.json");
  const stdoutPath = path.join(outputDir, "stdout.log");
  const stderrPath = path.join(outputDir, "stderr.log");
  const suites = plan.selected_suites.filter((suite) => fs.existsSync(path.join(root, suite)));
  const missingSuites = plan.selected_suites.filter((suite) => !fs.existsSync(path.join(root, suite)));
  const runnerSuites = classifyAffectedVerificationSuites(suites);
  const playwrightOwnership = resolveAffectedPlaywrightRunnerOwnership({
    root,
    suites: runnerSuites.playwright,
  });
  const unsupportedRunnerSuites = playwrightOwnership.unowned_suites;
  const playwrightExecutionSuites = playwrightOwnership.owned_suites;
  const playwrightResultFiles = argValues("playwright-result").map((value) => path.resolve(root, value));
  const playwrightEvidence = validateAffectedPlaywrightResultEvidence({
    root,
    expectedSuites: playwrightExecutionSuites,
    resultFiles: playwrightResultFiles,
  });
  const jestSuites = runnerSuites.jest;
  const shardCount = level === "affected"
    ? requestedShardCount ?? resolveAffectedJestShardCount(jestSuites.length)
    : 1;
  const shardPlan = buildAffectedJestShardPlan({
    root,
    suites: jestSuites,
    shardCount,
    calibrationPath: arg("calibration"),
    maximumParallelProcessRoots,
  });
  const shardPlanPath = path.join(outputDir, "shard-plan.json");
  writeJson(shardPlanPath, {
    schema: "verification-affected-jest-shard-plan/v1",
    created_at: new Date().toISOString(),
    subject: { base_sha: baseSha, head_sha: headSha, input_fingerprint: plan.input_fingerprint },
    calibration_path: shardPlan.calibration_path,
    calibration_sha256: shardPlan.calibration_sha256,
    calibration_coverage: shardPlan.calibration_coverage,
    manifest: shardPlan.manifest,
    manifest_sha256: shardPlan.manifest_sha256,
    validation: shardPlan.validation,
    resource_plan: shardPlan.resource_plan,
  });
  if (process.argv.includes("--plan-only")) {
    const validationErrors = shardPlan.validation.missing.length
      + shardPlan.validation.duplicates.length
      + shardPlan.validation.unexpected.length
      + unsupportedRunnerSuites.length
      + playwrightEvidence.missing_suites.length;
    const predictedCriticalPathMs = resolveAffectedVerificationPredictedCriticalPathMs({
      distributedExecution,
      sequentialWaveWeightMs: shardPlan.resource_plan.predicted_critical_path_weight_ms,
      shardWeightsMs: shardPlan.shards.map((shard) => shard.weight),
    });
    const readiness = evaluateAffectedVerificationPlanReadiness({
      selectedSuites: jestSuites.length,
      calibratedSuites: shardPlan.calibration_coverage.calibrated_selected_suites,
      executionProfileCompatible: shardPlan.calibration_coverage.execution_profile_compatible,
      predictedCriticalPathMs,
      budgetMs,
      missingSuites: missingSuites.length,
      validationErrors,
    });
    process.stdout.write(`${JSON.stringify({
      final_status: readiness.passed
        ? "GREEN_VERIFICATION_PLAN_READY"
        : "RED_VERIFICATION_PLAN_NOT_READY",
      plan_readiness: readiness,
      budget_ms: budgetMs,
      plan_path: path.relative(root, planPath).replace(/\\/g, "/"),
      shard_plan_path: path.relative(root, shardPlanPath).replace(/\\/g, "/"),
      shard_manifest_sha256: shardPlan.manifest_sha256,
      shard_calibration_coverage: shardPlan.calibration_coverage,
      runner_ownership: {
        jest_suites: jestSuites,
        playwright_suites: runnerSuites.playwright,
        unsupported_runner_suites: unsupportedRunnerSuites,
        complete: unsupportedRunnerSuites.length === 0,
        playwright: playwrightOwnership,
      },
      playwright_execution: {
        suites: playwrightExecutionSuites,
        complete: playwrightEvidence.complete,
        evidence: playwrightEvidence,
        status: playwrightEvidence.complete
          ? "NOT_REQUIRED"
          : "BLOCKED_EXTERNAL_EXPLICIT_EXECUTION_REQUIRED",
      },
      resource_plan: shardPlan.resource_plan,
      execution_topology: distributedExecution
        ? "one-isolated-runner-per-shard"
        : "bounded-sequential-resource-waves",
      ...plan,
    }, null, 2)}\n`);
    if (!readiness.passed) process.exitCode = 1;
    return;
  }
  const runId = started.toISOString().replace(/[:.]/g, "-");
  const executeShardArg = arg("execute-shard");
  if (executeShardArg != null) {
    if (level !== "affected") throw new Error("distributed_shard_requires_affected_level");
    const executeShardId = Number(executeShardArg);
    if (!Number.isInteger(executeShardId) || executeShardId < 0) {
      throw new Error(`invalid_verification_execute_shard:${executeShardArg}`);
    }
    const selectedShard = shardPlan.shards.find((shard) => shard.shard_id === executeShardId);
    if (!selectedShard) throw new Error(`verification_execute_shard_missing:${executeShardId}`);
    const selectedWave = shardPlan.resource_plan.waves.find((wave) =>
      wave.shards.some((shard) => shard.shard_id === executeShardId)
    );
    if (!selectedWave) throw new Error(`verification_execute_shard_wave_missing:${executeShardId}`);
    const requiredAvailableBytes = distributedExecution
      ? DISTRIBUTED_AFFECTED_REQUIRED_AVAILABLE_BYTES
      : selectedWave.minimum_free_physical_bytes + selectedWave.closeout_reserve_bytes;
    const shardTechnicalDeadlineAtMs = Date.now() + technicalTimeoutMs;
    const admission = await awaitVerificationResourceAdmission({
      requiredAvailableBytes,
      technicalDeadlineAtMs: shardTechnicalDeadlineAtMs,
    });
    const prerequisitesPassed = missingSuites.length === 0
      && unsupportedRunnerSuites.length === 0
      && playwrightEvidence.complete
      && admission.passed;
    const shardRun = prerequisitesPassed
      ? await runJestShard({
        root,
        outputDir,
        runId,
        shardId: selectedShard.shard_id,
        resourceWaveId: selectedWave.wave_id,
        suites: selectedShard.test_files,
        technicalDeadlineAtMs: shardTechnicalDeadlineAtMs,
      })
      : null;
    const terminalPlan = buildVerificationPlan({
      baseSha,
      headSha,
      level,
      changedFiles: changedFiles(baseSha, headSha),
      root,
    });
    const inputDriftDetected = terminalPlan.input_fingerprint !== plan.input_fingerprint;
    const expectedSuites = [...selectedShard.test_files]
      .sort((left, right) => left.localeCompare(right, "en"));
    const observedSuites = [...(shardRun?.observedSuites ?? [])]
      .sort((left, right) => left.localeCompare(right, "en"));
    const membershipPassed = JSON.stringify(observedSuites) === JSON.stringify(expectedSuites);
    const compatibleEvidenceSha256 = crypto.createHash("sha256")
      .update(`${JSON.stringify(playwrightEvidence.suite_evidence)}\n`, "utf8")
      .digest("hex");
    const shardPassed = prerequisitesPassed
      && shardRun?.status === 0
      && shardRun.result.success === true
      && membershipPassed
      && !shardRun.timedOut
      && !shardRun.orphanDetected
      && shardRun.memoryEvidenceStatus !== "INFRASTRUCTURE_RED"
      && !inputDriftDetected;
    const receipt = {
      schema: "verification-distributed-affected-jest-shard-receipt/v1",
      final_status: shardPassed
        ? "GREEN_DISTRIBUTED_AFFECTED_JEST_SHARD"
        : "RED_DISTRIBUTED_AFFECTED_JEST_SHARD",
      subject: {
        base_sha: baseSha,
        head_sha: headSha,
        input_fingerprint: plan.input_fingerprint,
        terminal_input_fingerprint: terminalPlan.input_fingerprint,
        input_drift_detected: inputDriftDetected,
      },
      membership: {
        full_selected_jest_suites: jestSuites.length,
        full_selected_playwright_suites: playwrightExecutionSuites.length,
        shard_manifest_sha256: shardPlan.manifest_sha256,
        shard_id: executeShardId,
        resource_wave_id: selectedWave.wave_id,
        expected_suite_count: expectedSuites.length,
        expected_suites_sha256: hashDistributedReceiptStringList(expectedSuites),
        observed_suite_count: observedSuites.length,
        observed_suites_sha256: hashDistributedReceiptStringList(observedSuites),
        passed: membershipPassed,
      },
      playwright_evidence: {
        complete: playwrightEvidence.complete,
        expected_suite_count: playwrightExecutionSuites.length,
        expected_suites_sha256: hashDistributedReceiptStringList(playwrightExecutionSuites),
        compatible_evidence_sha256: compatibleEvidenceSha256,
      },
      admission: {
        required_available_bytes: requiredAvailableBytes,
        free_physical_bytes: admission.free_physical_bytes,
        passed: admission.passed,
      },
      execution: shardRun == null ? null : {
        started_at: shardRun.startedAt,
        ended_at: shardRun.endedAt,
        duration_ms: Date.parse(shardRun.endedAt) - Date.parse(shardRun.startedAt),
        exit_code: shardRun.status,
        observed_exit_code: shardRun.observedExitCode,
        result_success: shardRun.result.success === true,
        passed_suites: numeric(shardRun.result, "numPassedTestSuites"),
        failed_suites: numeric(shardRun.result, "numFailedTestSuites"),
        passed_tests: numeric(shardRun.result, "numPassedTests"),
        failed_tests: numeric(shardRun.result, "numFailedTests"),
        pending_tests: numeric(shardRun.result, "numPendingTests"),
        failed_assertion_count: shardRun.failedAssertions.length,
        technical_timed_out: shardRun.timedOut,
        orphan_detected: shardRun.orphanDetected,
        memory_evidence_status: shardRun.memoryEvidenceStatus,
        process_tree_memory_peak_bytes: shardRun.memoryPeakBytes,
      },
      slo_ms: budgetMs,
      technical_timeout_ms: technicalTimeoutMs,
    };
    writeJson(path.join(outputDir, "distributed-shard-receipt.json"), receipt);
    process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
    if (!shardPassed) process.exitCode = 1;
    return;
  }
  const shardRuns: JestShardRuntime[] = [];
  const resourceAdmissions: {
    wave_id: number;
    sampled_at: string;
    free_physical_bytes: number;
    total_physical_bytes: number;
    minimum_free_physical_bytes: number;
    closeout_reserve_bytes: number;
    required_available_bytes: number;
    passed: boolean;
    settle_wait_ms: number;
    sample_count: number;
    samples: VerificationResourceAdmission["samples"];
  }[] = [];
  let resourceBlocked = false;
  const runnerOwnershipBlocked = unsupportedRunnerSuites.length > 0;
  const playwrightExecutionBlocked = !playwrightEvidence.complete;
  if (
    missingSuites.length === 0
    && !runnerOwnershipBlocked
    && !playwrightExecutionBlocked
    && jestSuites.length > 0
  ) {
    for (const wave of shardPlan.resource_plan.waves) {
      const requiredAvailableBytes = wave.minimum_free_physical_bytes + wave.closeout_reserve_bytes;
      const measuredAdmission = await awaitVerificationResourceAdmission({
        requiredAvailableBytes,
        technicalDeadlineAtMs,
      });
      const admission = {
        wave_id: wave.wave_id,
        sampled_at: measuredAdmission.sampled_at,
        free_physical_bytes: measuredAdmission.free_physical_bytes,
        total_physical_bytes: os.totalmem(),
        minimum_free_physical_bytes: wave.minimum_free_physical_bytes,
        closeout_reserve_bytes: wave.closeout_reserve_bytes,
        required_available_bytes: requiredAvailableBytes,
        passed: measuredAdmission.passed,
        settle_wait_ms: measuredAdmission.settle_wait_ms,
        sample_count: measuredAdmission.sample_count,
        samples: measuredAdmission.samples,
      };
      resourceAdmissions.push(admission);
      if (!admission.passed) {
        resourceBlocked = true;
        break;
      }
      const waveRuns = await Promise.all(wave.shards.map((shard) => runJestShard({
        root,
        outputDir,
        runId,
        shardId: shard.shard_id,
        resourceWaveId: wave.wave_id,
        suites: shard.test_files,
        technicalDeadlineAtMs,
      })));
      shardRuns.push(...waveRuns);
    }
  }
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
    suites: shard.observedSuites,
    failed_assertions: shard.failedAssertions,
  }));
  const fanIn = mergeVerificationShards({
    expectedShardIds: shardPlan.shards.map((shard) => shard.shard_id),
    expectedSuites: jestSuites,
    subjectSha,
    manifestHash: shardPlan.manifest_sha256,
    results: shardResults,
  });
  const terminalPlan = buildVerificationPlan({
    baseSha,
    headSha,
    level,
    changedFiles: changedFiles(baseSha, headSha),
    root,
  });
  const inputDriftDetected = terminalPlan.input_fingerprint !== plan.input_fingerprint;
  const ended = new Date();
  const durationMs = ended.getTime() - started.getTime();
  const failures = failedAssertions(jest);
  const technicalTimedOut = shardRuns.some((shard) => shard.timedOut);
  const orphanDetected = shardRuns.some((shard) => shard.orphanDetected);
  const processTreeMemoryEvidenceIncomplete = process.platform === "win32"
    && shardRuns.some((shard) =>
      shard.memoryEvidenceStatus !== "COMPLETE" || shard.memoryPeakBytes <= 0
    );
  const resourceUsageByWave = shardPlan.resource_plan.waves.map((wave) => {
    const waveRuns = shardRuns.filter((shard) => shard.resourceWaveId === wave.wave_id);
    return {
      wave_id: wave.wave_id,
      resource_class: wave.resource_class,
      completed_roots: waveRuns.length,
      expected_roots: wave.shards.length,
      process_tree_peak_upper_bound_bytes: waveRuns.reduce(
        (total, shard) => total + shard.memoryPeakBytes,
        0,
      ),
      aggregation: "sum_of_per_root_observed_peaks_conservative_upper_bound",
      all_process_tree_measurements_complete: waveRuns.length === wave.shards.length
        && waveRuns.every((shard) =>
          shard.memoryEvidenceStatus === "COMPLETE" && shard.memoryPeakBytes > 0
        ),
    };
  });
  const observedSuiteSet = new Set([
    ...shardRuns.flatMap((shard) => shard.observedSuites),
    ...playwrightEvidence.passed_suites,
  ]);
  const incompleteSuiteIds = suites.filter((suite) => !observedSuiteSet.has(suite));
  const functionalExitCode = missingSuites.length === 0 && !runnerOwnershipBlocked && !playwrightExecutionBlocked && !resourceBlocked && !inputDriftDetected && fanIn.exit_code === 0 && jest.success === true && !technicalTimedOut && !orphanDetected ? 0 : 1;
  const functionalPassed = functionalExitCode === 0;
  const sloPassed = durationMs <= budgetMs;
  const passed = functionalPassed && sloPassed;
  const artifactPaths = [
    planPath,
    shardPlanPath,
    resultPath,
    stdoutPath,
    stderrPath,
    ...shardRuns.flatMap((shard) => [
      shard.resultPath,
      shard.stdoutPath,
      shard.stderrPath,
      shard.progressPath,
      shard.heartbeatPath,
      shard.memoryEvidencePath,
    ]),
    ...playwrightResultFiles,
  ].filter(fs.existsSync);
  const summary = {
    schema: "verification-gate-summary/v1",
    gate_name: `${level}-verification-gate`,
    gate_version: "2",
    base_sha: baseSha,
    head_sha: headSha,
    input_fingerprint: plan.input_fingerprint,
    input_integrity: {
      passed: !inputDriftDetected,
      initial_input_fingerprint: plan.input_fingerprint,
      terminal_input_fingerprint: terminalPlan.input_fingerprint,
      changed_files_at_start: plan.changed_files,
      changed_files_at_terminal: terminalPlan.changed_files,
    },
    selected_domains: plan.selections.filter((item) => item.selected).flatMap((item) => item.domains),
    selected_suites: suites,
    selected_producers: plan.selected_producers,
    cache: { status: "reported-by-required-artifact-preflight", reason: "content-addressed prerequisite gate" },
    shard_manifest: {
      mode: "bounded-resource-waves-run-in-band",
      shard_count: shardPlan.shards.length,
      execution_profile: shardPlan.calibration_coverage.target_execution_profile,
      detect_open_handles_per_shard: false,
      open_handle_control: "bounded-owned-process-tree-terminal",
      calibration_path: shardPlan.calibration_path,
      calibration_sha256: shardPlan.calibration_sha256,
      calibration_coverage: shardPlan.calibration_coverage,
      manifest_sha256: shardPlan.manifest_sha256,
      validation: shardPlan.validation,
      resource_plan: shardPlan.resource_plan,
      resource_admissions: resourceAdmissions,
      resource_usage: resourceUsageByWave,
      resource_blocked: resourceBlocked,
      runner_ownership_blocked: runnerOwnershipBlocked,
      runner_ownership: {
        jest_suites: jestSuites,
        playwright_suites: runnerSuites.playwright,
        unsupported_runner_suites: unsupportedRunnerSuites,
        complete: !runnerOwnershipBlocked,
        playwright: playwrightOwnership,
      },
      playwright_execution: {
        suites: playwrightExecutionSuites,
        blocked: playwrightExecutionBlocked,
        complete: playwrightEvidence.complete,
        evidence: playwrightEvidence,
        status: playwrightExecutionBlocked
          ? "BLOCKED_EXTERNAL_EXPLICIT_EXECUTION_REQUIRED"
          : "NOT_REQUIRED",
      },
      shards: shardPlan.shards,
      runtime: shardRuns.map((shard) => ({
        shard_id: shard.shardId,
        resource_wave_id: shard.resourceWaveId,
        pid: shard.pid,
        started_at: shard.startedAt,
        ended_at: shard.endedAt,
        close_observed: shard.closeObserved,
        close_observed_at: shard.closeObservedAt,
        observed_exit_code: shard.observedExitCode,
        within_technical_deadline: shard.withinTechnicalDeadline,
        assigned_suites: shard.suites.length,
        observed_suites: shard.observedSuites,
        missing_suites: shard.missingSuites,
        status: shard.status,
        signal: shard.signal,
        timed_out: shard.timedOut,
        termination_attempted: shard.terminationAttempted,
        termination_succeeded: shard.terminationSucceeded,
        orphan_detected: shard.orphanDetected,
        progress_path: path.relative(root, shard.progressPath).replace(/\\/g, "/"),
        heartbeat_path: path.relative(root, shard.heartbeatPath).replace(/\\/g, "/"),
        process_tree_memory_path: path.relative(root, shard.memoryEvidencePath).replace(/\\/g, "/"),
        process_tree_memory_status: shard.memoryEvidenceStatus,
        process_tree_memory_blocker: shard.memoryEvidenceBlocker,
        process_tree_memory_peak_bytes: shard.memoryPeakBytes,
        process_tree_memory_descendants_observed: shard.memoryDescendantsObserved,
        process_tree_memory_samples: shard.memorySamples,
      })),
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
    terminal: {
      functional_passed: functionalPassed,
      slo_passed: sloPassed,
      technical_timed_out: technicalTimedOut,
      orphan_detected: orphanDetected,
      resource_blocked: resourceBlocked,
      playwright_execution_blocked: playwrightExecutionBlocked,
      input_drift_detected: inputDriftDetected,
      process_tree_memory_evidence_incomplete: processTreeMemoryEvidenceIncomplete,
      technical_timeout_ms: technicalTimeoutMs,
      technical_deadline_at: new Date(technicalDeadlineAtMs).toISOString(),
      bounded_closeout_ms: TERMINATION_GRACE_MS * 2,
      incomplete_suite_ids: incompleteSuiteIds,
    },
    exit_code: passed ? 0 : 1,
    budget: { limit_ms: budgetMs, actual_ms: durationMs, passed: durationMs <= budgetMs },
    final_status: passed
      ? "GREEN_VERIFICATION_GATE"
      : runnerOwnershipBlocked
        ? "BLOCKED_RUNNER_OWNERSHIP_VERIFICATION_GATE"
        : playwrightExecutionBlocked
          ? "BLOCKED_PLAYWRIGHT_EXTERNAL_EXECUTION_VERIFICATION_GATE"
          : inputDriftDetected
            ? "RED_INPUT_DRIFT_VERIFICATION_GATE"
          : resourceBlocked
            ? "BLOCKED_RESOURCE_VERIFICATION_GATE"
            : technicalTimedOut || orphanDetected
              ? "TIMEOUT_VERIFICATION_GATE"
              : functionalPassed && !sloPassed
                ? "RED_SLO_VERIFICATION_GATE"
                : "RED_VERIFICATION_GATE",
    fake_green_claimed: false,
  };
  writeJson(path.join(outputDir, "summary.json"), summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (!passed) process.exitCode = 1;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/verification/runVerificationGate.ts")) {
  void run().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
