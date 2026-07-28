import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const ANDROID_PROBE_CASE_TIMEOUT_MAX_MS = 120_000;
export const ANDROID_PROBE_RUN_TIMEOUT_MAX_MS = 12 * 60_000;
const MAX_CAPTURED_STREAM_CHARS = 8_000;

export type ProbeCommandResult = {
  command: string;
  args: string[];
  pid: number | null;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  killAttempted: boolean;
  durationMs: number;
  stdout: string;
  stderr: string;
};

export type ProbeTerminalStatus = "PASS" | "RED" | "ERROR" | "TIMEOUT";

export type ProbeTerminalArtifact = {
  schemaVersion: 1;
  terminal: true;
  runId: string;
  caseId: string;
  launchId: string;
  status: ProbeTerminalStatus;
  terminalReason: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  timeoutMs: number;
  singleUiObserver: true;
  cleanup: {
    attempted: true;
    ok: boolean;
    detail: string;
  };
  childProcesses: {
    launchedPids: number[];
    terminationAttemptedPids: number[];
    activePidsAtTerminalWrite: number[];
  };
  evidence: Record<string, unknown>;
};

export type ProbeCaseResult = {
  passed: boolean;
  reason: string;
  evidence?: Record<string, unknown>;
};

export type ProbeCaseContext = {
  runCommand: (
    command: string,
    args: readonly string[],
    timeoutMs?: number,
    maxCapturedStreamChars?: number,
  ) => Promise<ProbeCommandResult>;
};

function boundedAppend(
  current: string,
  chunk: Buffer | string,
  maxCapturedStreamChars: number,
): string {
  const next = `${current}${String(chunk)}`;
  return next.length <= maxCapturedStreamChars
    ? next
    : next.slice(next.length - maxCapturedStreamChars);
}

export function redactProbeText(value: string): string {
  return value
    .replace(
      /\bAuthorization\s*:\s*(?:Bearer\s+)?[A-Za-z0-9._~+/=-]+/gi,
      "Authorization: [redacted]",
    )
    .replace(
      /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi,
      "Bearer [redacted]",
    )
    .replace(
      /\b(?:access_token|refresh_token|service_role_key|anon_key|password)\s*[:=]\s*["']?[^"'&\s]+/gi,
      (match) => `${match.split(/[:=]/, 1)[0]}=[redacted]`,
    )
    .replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      "[redacted-email]",
    )
    .trim();
}

function sanitizedArgs(args: readonly string[]): string[] {
  return args.map((arg) => {
    if (/token|password|secret|authorization/i.test(arg)) return "[redacted-arg]";
    return arg.length > 512 ? `${arg.slice(0, 128)}…[truncated]` : arg;
  });
}

export function killExactProcessTree(pid: number): boolean {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  if (process.platform === "win32") {
    const result = spawnSync(
      "taskkill",
      ["/PID", String(pid), "/T", "/F"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 15_000,
        windowsHide: true,
      },
    );
    return result.status === 0;
  }
  try {
    process.kill(-pid, "SIGKILL");
    return true;
  } catch {
    try {
      process.kill(pid, "SIGKILL");
      return true;
    } catch {
      return false;
    }
  }
}

function waitForClose(
  child: ChildProcess,
  timeoutMs: number,
): Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (exitCode: number | null, signal: NodeJS.Signals | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(fallback);
      resolve({ exitCode, signal });
    };
    const fallback = setTimeout(
      () => finish(child.exitCode, child.signalCode),
      timeoutMs,
    );
    child.once("close", finish);
    child.once("error", () => finish(child.exitCode, child.signalCode));
  });
}

export async function runProbeChildCommand(input: {
  command: string;
  args: readonly string[];
  timeoutMs: number;
  maxCapturedStreamChars?: number;
  onPid?: (pid: number) => void;
  onClosed?: (pid: number) => void;
  onTerminationAttempt?: (pid: number) => void;
}): Promise<ProbeCommandResult> {
  const startedAt = Date.now();
  const child = spawn(input.command, [...input.args], {
    cwd: process.cwd(),
    env: process.env,
    detached: process.platform !== "win32",
    shell: false,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const pid = child.pid ?? null;
  if (pid != null) input.onPid?.(pid);
  let stdout = "";
  let stderr = "";
  const maxCapturedStreamChars = Math.max(
    MAX_CAPTURED_STREAM_CHARS,
    input.maxCapturedStreamChars ?? MAX_CAPTURED_STREAM_CHARS,
  );
  child.stdout.on("data", (chunk) => {
    stdout = boundedAppend(stdout, chunk, maxCapturedStreamChars);
  });
  child.stderr.on("data", (chunk) => {
    stderr = boundedAppend(stderr, chunk, maxCapturedStreamChars);
  });

  let timedOut = false;
  let killAttempted = false;
  const timer = setTimeout(() => {
    timedOut = true;
    if (pid != null) {
      killAttempted = true;
      input.onTerminationAttempt?.(pid);
      killExactProcessTree(pid);
    }
  }, Math.max(1, input.timeoutMs));

  const closed = await waitForClose(
    child,
    Math.max(5_000, input.timeoutMs + 5_000),
  );
  clearTimeout(timer);
  if (pid != null) input.onClosed?.(pid);
  return {
    command: input.command,
    args: sanitizedArgs(input.args),
    pid,
    exitCode: closed.exitCode,
    signal: closed.signal,
    timedOut,
    killAttempted,
    durationMs: Date.now() - startedAt,
    stdout: redactProbeText(stdout),
    stderr: redactProbeText(stderr),
  };
}

export function writeJsonAtomic(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  try {
    fs.renameSync(tempPath, filePath);
  } catch {
    fs.rmSync(filePath, { force: true });
    fs.renameSync(tempPath, filePath);
  }
}

export async function withSingleAndroidUiObserver<T>(
  lockPath: string,
  work: () => Promise<T>,
): Promise<T> {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  let handle: number | null = null;
  try {
    handle = fs.openSync(lockPath, "wx");
    fs.writeFileSync(
      handle,
      `${JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() })}\n`,
      "utf8",
    );
  } catch (error) {
    throw new Error(
      `ANDROID_UI_OBSERVER_ALREADY_ACTIVE:${error instanceof Error ? error.message : String(error)}`,
    );
  }
  try {
    return await work();
  } finally {
    if (handle != null) fs.closeSync(handle);
    fs.rmSync(lockPath, { force: true });
  }
}

export async function runTerminalProbeCase(input: {
  artifactPath: string;
  runId: string;
  caseId: string;
  launchId: string;
  timeoutMs: number;
  execute: (context: ProbeCaseContext) => Promise<ProbeCaseResult>;
  cleanup: () => Promise<{ ok: boolean; detail: string }>;
}): Promise<ProbeTerminalArtifact> {
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const timeoutMs = Math.min(
    Math.max(1, input.timeoutMs),
    ANDROID_PROBE_CASE_TIMEOUT_MAX_MS,
  );
  const activePids = new Set<number>();
  const launchedPids = new Set<number>();
  const terminationAttemptedPids = new Set<number>();
  let status: ProbeTerminalStatus = "ERROR";
  let terminalReason = "unhandled_exception";
  let evidence: Record<string, unknown> = {};
  let cleanupResult = { ok: false, detail: "cleanup_not_completed" };
  let caseTimer: ReturnType<typeof setTimeout> | null = null;

  const context: ProbeCaseContext = {
    runCommand: (
      command,
      args,
      commandTimeoutMs = timeoutMs,
      maxCapturedStreamChars = MAX_CAPTURED_STREAM_CHARS,
    ) =>
      runProbeChildCommand({
        command,
        args,
        timeoutMs: Math.min(commandTimeoutMs, timeoutMs),
        maxCapturedStreamChars,
        onPid: (pid) => {
          launchedPids.add(pid);
          activePids.add(pid);
        },
        onClosed: (pid) => activePids.delete(pid),
        onTerminationAttempt: (pid) => terminationAttemptedPids.add(pid),
      }),
  };

  try {
    const timeout = new Promise<never>((_resolve, reject) => {
      caseTimer = setTimeout(() => {
        for (const pid of activePids) {
          terminationAttemptedPids.add(pid);
          killExactProcessTree(pid);
        }
        reject(new Error(`ANDROID_PROBE_CASE_TIMEOUT:${timeoutMs}`));
      }, timeoutMs);
    });
    const result = await Promise.race([input.execute(context), timeout]);
    status = result.passed ? "PASS" : "RED";
    terminalReason = result.reason;
    evidence = result.evidence ?? {};
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    status = message.startsWith("ANDROID_PROBE_CASE_TIMEOUT:")
      ? "TIMEOUT"
      : "ERROR";
    terminalReason = redactProbeText(message);
  } finally {
    if (caseTimer) clearTimeout(caseTimer);
    for (const pid of activePids) {
      terminationAttemptedPids.add(pid);
      killExactProcessTree(pid);
    }
    try {
      cleanupResult = await input.cleanup();
    } catch (error) {
      cleanupResult = {
        ok: false,
        detail: redactProbeText(
          error instanceof Error ? error.message : String(error),
        ),
      };
    }
  }

  const finishedAtMs = Date.now();
  const artifact: ProbeTerminalArtifact = {
    schemaVersion: 1,
    terminal: true,
    runId: input.runId,
    caseId: input.caseId,
    launchId: input.launchId,
    status,
    terminalReason,
    startedAt,
    finishedAt: new Date(finishedAtMs).toISOString(),
    durationMs: finishedAtMs - startedAtMs,
    timeoutMs,
    singleUiObserver: true,
    cleanup: {
      attempted: true,
      ok: cleanupResult.ok,
      detail: cleanupResult.detail,
    },
    childProcesses: {
      launchedPids: [...launchedPids],
      terminationAttemptedPids: [...terminationAttemptedPids],
      activePidsAtTerminalWrite: [...activePids].filter(isProcessAlive),
    },
    evidence,
  };
  writeJsonAtomic(input.artifactPath, artifact);
  return artifact;
}

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
