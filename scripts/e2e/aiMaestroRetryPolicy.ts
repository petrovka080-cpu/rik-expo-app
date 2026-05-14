import { spawnSync } from "node:child_process";

import {
  classifyAiEmulatorFailure,
  resolveAiEmulatorFailureClassification,
  shouldRetryAiEmulatorFailure,
  type AiEmulatorFailureClassification,
  type AiEmulatorFailureKind,
} from "./aiEmulatorFlakePolicy";

export const AI_MAESTRO_MAX_RETRY_COUNT = 2;
export const AI_MAESTRO_BACKOFF_MS = [1000, 3000, 10000] as const;
export const AI_MAESTRO_PROBE_LATENCY_BUDGET_MS = 30_000;

export type AiMaestroProbeLatencyStatus = "PASS" | "YELLOW_LATENCY_BUDGET_EXCEEDED";

export type AiMaestroRetryMetrics = {
  probe_started_at: string;
  probe_finished_at: string;
  probe_latency_ms: number;
  probe_latency_budget_ms: number;
  probe_latency_status: AiMaestroProbeLatencyStatus;
  transport_retry_count: number;
  flake_retry_count: number;
  retry_classification: AiEmulatorFailureClassification | null;
};

export type AiMaestroRetryResult<T> = {
  result: T | null;
  metrics: AiMaestroRetryMetrics;
  final_failure_kind: AiEmulatorFailureKind | null;
  final_classification: AiEmulatorFailureClassification | null;
  error: unknown;
};

type RetryOperationParams<T> = {
  operation: () => Promise<T>;
  classifyResult?: (result: T) => string | null;
  projectRoot?: string;
  deviceId?: string;
  nowMs?: () => number;
  sleep?: (ms: number) => Promise<void>;
  prepareDevice?: () => void;
};

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function prepareAndroidDeviceForAiMaestroRetry(params: {
  projectRoot: string;
  deviceId?: string | null;
}): void {
  const adbArgs = params.deviceId ? ["-s", params.deviceId, "wait-for-device"] : ["wait-for-device"];
  spawnSync("adb", adbArgs, {
    cwd: params.projectRoot,
    encoding: "utf8",
    stdio: "ignore",
    shell: process.platform === "win32",
  });

  const bootArgs = params.deviceId
    ? ["-s", params.deviceId, "shell", "getprop", "sys.boot_completed"]
    : ["shell", "getprop", "sys.boot_completed"];
  spawnSync("adb", bootArgs, {
    cwd: params.projectRoot,
    encoding: "utf8",
    stdio: "ignore",
    shell: process.platform === "win32",
  });
}

export function buildAiMaestroRetryMetrics(params: {
  startedMs: number;
  finishedMs: number;
  transportRetryCount: number;
  flakeRetryCount: number;
  retryClassification: AiEmulatorFailureClassification | null;
}): AiMaestroRetryMetrics {
  const latency = Math.max(0, params.finishedMs - params.startedMs);
  return {
    probe_started_at: new Date(params.startedMs).toISOString(),
    probe_finished_at: new Date(params.finishedMs).toISOString(),
    probe_latency_ms: latency,
    probe_latency_budget_ms: AI_MAESTRO_PROBE_LATENCY_BUDGET_MS,
    probe_latency_status: latency > AI_MAESTRO_PROBE_LATENCY_BUDGET_MS ? "YELLOW_LATENCY_BUDGET_EXCEEDED" : "PASS",
    transport_retry_count: params.transportRetryCount,
    flake_retry_count: params.flakeRetryCount,
    retry_classification: params.retryClassification,
  };
}

export async function runAiMaestroWithRetry<T>(params: RetryOperationParams<T>): Promise<AiMaestroRetryResult<T>> {
  const nowMs = params.nowMs ?? Date.now;
  const sleep = params.sleep ?? defaultSleep;
  const startedMs = nowMs();
  let transportRetryCount = 0;
  let flakeRetryCount = 0;
  let lastKind: AiEmulatorFailureKind | null = null;
  let lastClassification: AiEmulatorFailureClassification | null = null;
  let lastError: unknown = null;
  let attempt = 0;

  while (true) {
    try {
      const result = await params.operation();
      const failureMessage = params.classifyResult?.(result) ?? null;
      if (!failureMessage) {
        const finishedMs = nowMs();
        return {
          result,
          metrics: buildAiMaestroRetryMetrics({
            startedMs,
            finishedMs,
            transportRetryCount,
            flakeRetryCount,
            retryClassification: lastClassification,
          }),
          final_failure_kind: null,
          final_classification: lastClassification,
          error: null,
        };
      }

      lastKind = classifyAiEmulatorFailure(failureMessage);
      const retryable = shouldRetryAiEmulatorFailure(lastKind);
      if (!retryable || attempt >= AI_MAESTRO_MAX_RETRY_COUNT) {
        lastClassification = resolveAiEmulatorFailureClassification(lastKind, retryable && attempt >= AI_MAESTRO_MAX_RETRY_COUNT);
        const finishedMs = nowMs();
        return {
          result,
          metrics: buildAiMaestroRetryMetrics({
            startedMs,
            finishedMs,
            transportRetryCount,
            flakeRetryCount,
            retryClassification: lastClassification,
          }),
          final_failure_kind: lastKind,
          final_classification: lastClassification,
          error: null,
        };
      }

      lastClassification = resolveAiEmulatorFailureClassification(lastKind, false);
    } catch (error) {
      lastError = error;
      lastKind = classifyAiEmulatorFailure(error);
      const retryable = shouldRetryAiEmulatorFailure(lastKind);
      if (!retryable || attempt >= AI_MAESTRO_MAX_RETRY_COUNT) {
        lastClassification = resolveAiEmulatorFailureClassification(lastKind, retryable && attempt >= AI_MAESTRO_MAX_RETRY_COUNT);
        const finishedMs = nowMs();
        return {
          result: null,
          metrics: buildAiMaestroRetryMetrics({
            startedMs,
            finishedMs,
            transportRetryCount,
            flakeRetryCount,
            retryClassification: lastClassification,
          }),
          final_failure_kind: lastKind,
          final_classification: lastClassification,
          error,
        };
      }

      lastClassification = resolveAiEmulatorFailureClassification(lastKind, false);
    }

    flakeRetryCount += 1;
    if (lastKind === "transport_flake" || lastKind === "device_offline") {
      transportRetryCount += 1;
    }
    params.prepareDevice?.();
    if (!params.prepareDevice && params.projectRoot) {
      prepareAndroidDeviceForAiMaestroRetry({ projectRoot: params.projectRoot, deviceId: params.deviceId });
    }
    await sleep(AI_MAESTRO_BACKOFF_MS[attempt] ?? AI_MAESTRO_BACKOFF_MS[AI_MAESTRO_BACKOFF_MS.length - 1]);
    attempt += 1;
  }
}
