import { execFileSync, spawn, spawnSync, type ChildProcess } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { clearInterval, clearTimeout, setInterval, setTimeout } from "node:timers";

import { startWindowsCurrentCoreMemoryMonitor } from "../release/currentCoreMemoryMonitor";
import {
  buildAffectedJestShardPlan,
  resolveAffectedJestShardCount,
} from "./affectedJestSharding";
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
const TERMINATION_GRACE_MS = 5_000;
const HEARTBEAT_INTERVAL_MS = 5_000;
const MEMORY_MONITOR_GRACE_MS = 500;
const JEST_PROCESS_ROOT_PATH = path.resolve("scripts/release/currentCoreJestBatchRoot.mjs");

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
  const baseSha = arg("base") ?? git(["rev-parse", "HEAD"]);
  const headSha = arg("head") ?? git(["rev-parse", "HEAD"]);
  const plan = buildVerificationPlan({ baseSha, headSha, level, changedFiles: changedFiles(baseSha, headSha) });
  const outputDir = path.resolve(arg("output-dir") ?? path.join(".release-runtime", "verification-v1", headSha, level));
  const planPath = path.join(outputDir, "plan.json");
  writeJson(planPath, plan);

  const resultPath = path.join(outputDir, "jest-result.json");
  const stdoutPath = path.join(outputDir, "stdout.log");
  const stderrPath = path.join(outputDir, "stderr.log");
  const suites = plan.selected_suites.filter((suite) => fs.existsSync(path.join(root, suite)));
  const missingSuites = plan.selected_suites.filter((suite) => !fs.existsSync(path.join(root, suite)));
  const shardCount = level === "affected" ? resolveAffectedJestShardCount(suites.length) : 1;
  const shardPlan = buildAffectedJestShardPlan({ root, suites, shardCount });
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
      + shardPlan.validation.unexpected.length;
    const readiness = evaluateAffectedVerificationPlanReadiness({
      selectedSuites: suites.length,
      calibratedSuites: shardPlan.calibration_coverage.calibrated_selected_suites,
      executionProfileCompatible: shardPlan.calibration_coverage.execution_profile_compatible,
      predictedCriticalPathMs: shardPlan.resource_plan.predicted_critical_path_weight_ms,
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
      resource_plan: shardPlan.resource_plan,
      ...plan,
    }, null, 2)}\n`);
    if (!readiness.passed) process.exitCode = 1;
    return;
  }
  const runId = started.toISOString().replace(/[:.]/g, "-");
  const shardRuns: JestShardRuntime[] = [];
  const resourceAdmissions: Array<{
    wave_id: number;
    sampled_at: string;
    free_physical_bytes: number;
    total_physical_bytes: number;
    minimum_free_physical_bytes: number;
    closeout_reserve_bytes: number;
    required_available_bytes: number;
    passed: boolean;
  }> = [];
  let resourceBlocked = false;
  if (missingSuites.length === 0 && suites.length > 0) {
    for (const wave of shardPlan.resource_plan.waves) {
      const freePhysicalBytes = os.freemem();
      const requiredAvailableBytes = wave.minimum_free_physical_bytes + wave.closeout_reserve_bytes;
      const admission = {
        wave_id: wave.wave_id,
        sampled_at: new Date().toISOString(),
        free_physical_bytes: freePhysicalBytes,
        total_physical_bytes: os.totalmem(),
        minimum_free_physical_bytes: wave.minimum_free_physical_bytes,
        closeout_reserve_bytes: wave.closeout_reserve_bytes,
        required_available_bytes: requiredAvailableBytes,
        passed: freePhysicalBytes >= requiredAvailableBytes,
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
    expectedSuites: suites,
    subjectSha,
    manifestHash: shardPlan.manifest_sha256,
    results: shardResults,
  });
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
  const observedSuiteSet = new Set(shardRuns.flatMap((shard) => shard.observedSuites));
  const incompleteSuiteIds = suites.filter((suite) => !observedSuiteSet.has(suite));
  const functionalExitCode = missingSuites.length === 0 && !resourceBlocked && fanIn.exit_code === 0 && jest.success === true && !technicalTimedOut && !orphanDetected ? 0 : 1;
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
