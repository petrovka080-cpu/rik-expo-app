import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import path from "node:path";

import type { runAiEstimatePlatformCoreV2Matrix } from "./runAiEstimatePlatformCoreV2Matrix";

const TERMINAL_PREFIX = "[AiEstimatePlatformCoreV2MatrixTerminal]";
const TECHNICAL_TIMEOUT_MS = 300_000;
const TERMINATION_GRACE_MS = 2_000;
const BOUNDED_CLOSEOUT_MS = 5_000;
export const GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_MATRIX_HARNESS =
  "GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_MATRIX" as const;

type PlatformCoreV2MatrixSummary = ReturnType<
  typeof runAiEstimatePlatformCoreV2Matrix
>["summary"];

export type PlatformCoreV2MatrixHarnessTerminal = {
  schema: "ai-estimate-platform-core-v2-matrix-harness-terminal/v1";
  status: "GREEN" | "RED" | "TIMEOUT";
  duration_ms: number;
  pid: number | null;
  started_at: string;
  technical_deadline_at: string;
  close_observed: boolean;
  close_observed_at: string | null;
  exit_code: number | null;
  signal: NodeJS.Signals | null;
  timed_out: boolean;
  within_technical_deadline: boolean;
  orphan_detected: boolean;
  termination_attempted: boolean;
  termination_succeeded: boolean;
};

function evaluateMatrixProcessTerminal(input: {
  resultSuccess: boolean;
  observedExitCode: number | null;
  closeObservedAtMs: number;
  technicalDeadlineAtMs: number;
  timeoutTriggered: boolean;
  orphanDetected: boolean;
}): { passed: boolean; withinTechnicalDeadline: boolean; technicalTimedOut: boolean } {
  const withinTechnicalDeadline = input.closeObservedAtMs <= input.technicalDeadlineAtMs;
  const technicalTimedOut = input.timeoutTriggered || !withinTechnicalDeadline;
  return {
    passed: input.resultSuccess
      && input.observedExitCode === 0
      && withinTechnicalDeadline
      && !technicalTimedOut
      && !input.orphanDetected,
    withinTechnicalDeadline,
    technicalTimedOut,
  };
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

function terminateOwnedChildTree(child: ChildProcess, force: boolean): boolean {
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

export function runAiEstimatePlatformCoreV2MatrixHarness(): Promise<{
  summary: PlatformCoreV2MatrixSummary;
  terminal: PlatformCoreV2MatrixHarnessTerminal;
}> {
  const root = process.cwd();
  const childEntry = path.join(root, "scripts", "estimate", "runAiEstimatePlatformCoreV2Matrix.ts");
  const startedAt = Date.now();
  const technicalDeadlineAt = startedAt + TECHNICAL_TIMEOUT_MS;
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      "--import",
      "tsx",
      childEntry,
      "--harness-terminal",
      "--no-write-summary",
    ], {
      cwd: root,
      env: { ...process.env, NODE_ENV: "test" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    const pid = child.pid ?? null;
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let terminationAttempted = false;
    let terminationSucceeded = false;
    let settled = false;
    let forceTimer: ReturnType<typeof setTimeout> | null = null;
    let boundedCloseoutTimer: ReturnType<typeof setTimeout> | null = null;
    const finishWithError = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (forceTimer) clearTimeout(forceTimer);
      if (boundedCloseoutTimer) clearTimeout(boundedCloseoutTimer);
      reject(error);
    };
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout = `${stdout}${chunk}`.slice(-8 * 1024 * 1024);
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr = `${stderr}${chunk}`.slice(-1024 * 1024);
    });
    child.once("error", (error) => finishWithError(error));
    child.once("close", (exitCode, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (forceTimer) clearTimeout(forceTimer);
      if (boundedCloseoutTimer) clearTimeout(boundedCloseoutTimer);
      const closeObservedAt = Date.now();
      const orphanDetected = processExists(pid);
      if (terminationAttempted && !orphanDetected) terminationSucceeded = true;
      const terminalLine = stdout.split(/\r?\n/u)
        .find((line) => line.startsWith(TERMINAL_PREFIX));
      if (!terminalLine) {
        reject(new Error(
          `AI_ESTIMATE_PLATFORM_CORE_V2_MATRIX_TERMINAL_MISSING:${exitCode}:${signal ?? "none"}:${stderr.trim()}`,
        ));
        return;
      }
      let summary: PlatformCoreV2MatrixSummary;
      try {
        summary = JSON.parse(terminalLine.slice(TERMINAL_PREFIX.length)) as PlatformCoreV2MatrixSummary;
      } catch (error) {
        reject(new Error(
          `AI_ESTIMATE_PLATFORM_CORE_V2_MATRIX_TERMINAL_INVALID:${error instanceof Error ? error.message : String(error)}`,
        ));
        return;
      }
      const processTerminal = evaluateMatrixProcessTerminal({
        resultSuccess: summary.final_status === GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_MATRIX_HARNESS,
        observedExitCode: exitCode,
        closeObservedAtMs: closeObservedAt,
        technicalDeadlineAtMs: technicalDeadlineAt,
        timeoutTriggered: timedOut,
        orphanDetected,
      });
      resolve({
        summary,
        terminal: {
          schema: "ai-estimate-platform-core-v2-matrix-harness-terminal/v1",
          status: processTerminal.technicalTimedOut || orphanDetected
            ? "TIMEOUT"
            : processTerminal.passed
              ? "GREEN"
              : "RED",
          duration_ms: closeObservedAt - startedAt,
          pid,
          started_at: new Date(startedAt).toISOString(),
          technical_deadline_at: new Date(technicalDeadlineAt).toISOString(),
          close_observed: true,
          close_observed_at: new Date(closeObservedAt).toISOString(),
          exit_code: exitCode,
          signal,
          timed_out: timedOut,
          within_technical_deadline: processTerminal.withinTechnicalDeadline,
          orphan_detected: orphanDetected,
          termination_attempted: terminationAttempted,
          termination_succeeded: terminationAttempted && terminationSucceeded,
        },
      });
    });
    const timeout = setTimeout(() => {
      timedOut = true;
      terminationAttempted = true;
      terminationSucceeded = terminateOwnedChildTree(child, false);
      forceTimer = setTimeout(() => {
        if (!processExists(pid)) return;
        terminationSucceeded = terminateOwnedChildTree(child, true);
      }, TERMINATION_GRACE_MS);
      boundedCloseoutTimer = setTimeout(() => {
        const orphanDetected = processExists(pid);
        finishWithError(new Error(JSON.stringify({
          schema: "ai-estimate-platform-core-v2-matrix-harness-terminal/v1",
          status: "TIMEOUT",
          duration_ms: Date.now() - startedAt,
          pid,
          started_at: new Date(startedAt).toISOString(),
          technical_deadline_at: new Date(technicalDeadlineAt).toISOString(),
          close_observed: false,
          close_observed_at: null,
          exit_code: child.exitCode,
          signal: child.signalCode,
          timed_out: true,
          within_technical_deadline: false,
          orphan_detected: orphanDetected,
          termination_attempted: true,
          termination_succeeded: !orphanDetected && terminationSucceeded,
        } satisfies PlatformCoreV2MatrixHarnessTerminal)));
      }, BOUNDED_CLOSEOUT_MS);
    }, TECHNICAL_TIMEOUT_MS);
  });
}
