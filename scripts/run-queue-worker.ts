import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  MIN_WORKER_LOOP_BACKOFF_MS,
  defaultWorkerLoopClock,
  runCancellableWorkerLoop,
} from "../src/lib/async/mapWithConcurrencyLimit";

const DEFAULT_QUEUE_RUNNER_BOOTSTRAP_RESTART_BACKOFF_MS = 5_000;
const MIN_QUEUE_RUNNER_BOOTSTRAP_RESTART_BACKOFF_MS = 1_000;
const MAX_QUEUE_RUNNER_BOOTSTRAP_RESTART_BACKOFF_MS = 60_000;
const DEFAULT_QUEUE_RUNNER_MAX_BOOTSTRAP_RESTARTS = 20;
const MAX_QUEUE_RUNNER_MAX_BOOTSTRAP_RESTARTS = 100;

function ignoreBrokenPipe(stream: NodeJS.WriteStream | undefined) {
  if (!stream) return;
  stream.on("error", (error: NodeJS.ErrnoException) => {
    if (error?.code === "EPIPE") return;
    throw error;
  });
}

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

function finiteInteger(value: unknown): number | null {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function clampPositiveInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = finiteInteger(value);
  const parsedFallback = finiteInteger(fallback);
  const candidate =
    parsed != null && parsed > 0
      ? parsed
      : parsedFallback != null && parsedFallback > 0
        ? parsedFallback
        : min;

  return Math.max(min, Math.min(max, candidate));
}

export function resolveQueueRunnerRestartBackoffMs(value: unknown): number {
  return clampPositiveInteger(
    value,
    DEFAULT_QUEUE_RUNNER_BOOTSTRAP_RESTART_BACKOFF_MS,
    MIN_QUEUE_RUNNER_BOOTSTRAP_RESTART_BACKOFF_MS,
    MAX_QUEUE_RUNNER_BOOTSTRAP_RESTART_BACKOFF_MS,
  );
}

export function resolveQueueRunnerMaxBootstrapRestarts(value: unknown): number {
  return clampPositiveInteger(
    value,
    DEFAULT_QUEUE_RUNNER_MAX_BOOTSTRAP_RESTARTS,
    1,
    MAX_QUEUE_RUNNER_MAX_BOOTSTRAP_RESTARTS,
  );
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  const message = String(error ?? "").trim();
  return message || fallback;
}

const root = process.cwd();
loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

ignoreBrokenPipe(process.stdout);
ignoreBrokenPipe(process.stderr);

async function main() {
  const { SERVER_SUPABASE_KEY_KIND } = await import("../src/lib/server/serverSupabaseEnv");
  const restartBackoffMs = resolveQueueRunnerRestartBackoffMs(
    process.env.QUEUE_RUNNER_BOOTSTRAP_RESTART_BACKOFF_MS,
  );
  const maxBootstrapRestarts = resolveQueueRunnerMaxBootstrapRestarts(
    process.env.QUEUE_RUNNER_MAX_BOOTSTRAP_RESTARTS,
  );

  console.info("[queue.runner] starting", {
    JOB_QUEUE_ENABLED:
      process.env.EXPO_PUBLIC_JOB_QUEUE_ENABLED ?? process.env.JOB_QUEUE_ENABLED ?? null,
    SUPABASE_KEY_KIND: SERVER_SUPABASE_KEY_KIND,
    QUEUE_RUNNER_BOOTSTRAP_RESTART_BACKOFF_MS: restartBackoffMs,
    QUEUE_RUNNER_MAX_BOOTSTRAP_RESTARTS: maxBootstrapRestarts,
  });

  let handle: { stop: () => void } | null = null;
  let stopped = false;
  let resolveStopped: (() => void) | null = null;
  let bootstrapRestartCount = 0;
  const runnerAbortController = new AbortController();

  const stop = () => {
    stopped = true;
    runnerAbortController.abort();
    try {
      handle?.stop();
    } catch (error: unknown) {
      console.warn("[queue.runner] stop failed", {
        message: errorMessage(error, "unknown worker stop error"),
      });
    } finally {
      handle = null;
      resolveStopped?.();
      resolveStopped = null;
    }
  };

  process.on("SIGINT", () => {
    stop();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    stop();
    process.exit(0);
  });

  await runCancellableWorkerLoop({
    label: "queue.runner.bootstrap",
    signal: runnerAbortController.signal,
    clock: defaultWorkerLoopClock,
    backoffMs: MIN_WORKER_LOOP_BACKOFF_MS,
    errorBackoffMs: restartBackoffMs,
    shouldStop: () => stopped,
    runIteration: async () => {
      const { startServerQueueWorker } = await import("../src/workers/queueWorker.server");
      handle = startServerQueueWorker({
        workerId: `node:${Date.now().toString(36)}`,
      });
      bootstrapRestartCount = 0;

      await new Promise<void>((resolve) => {
        // Keep process alive while the worker loop runs.
        resolveStopped = resolve;
      });
      return {
        stop: stopped,
        backoffMs: MIN_WORKER_LOOP_BACKOFF_MS,
      };
    },
    onError: (error) => {
      if (stopped) return "stop";

      bootstrapRestartCount += 1;
      const message = errorMessage(error, "unknown worker bootstrap error");

      if (bootstrapRestartCount > maxBootstrapRestarts) {
        console.error("[queue.runner] bootstrap restart limit reached", {
          message,
          bootstrapRestartCount,
          maxBootstrapRestarts,
        });
        process.exitCode = 1;
        stop();
        return "stop";
      }

      console.error("[queue.runner] crashed, restarting", {
        message,
        bootstrapRestartCount,
        maxBootstrapRestarts,
        restartBackoffMs,
      });
      return "continue";
    },
  });
}

void main();
