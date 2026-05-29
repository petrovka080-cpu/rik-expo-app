import type { AiEstimatePerformanceMetric, AiEstimatePerformanceStep } from "./aiEstimatePerformanceTypes";

function nowMs(): number {
  const perf = globalThis.performance;
  return typeof perf?.now === "function" ? perf.now() : Date.now();
}

function roundMetric(value: number): number {
  return Math.round(value * 100) / 100;
}

export function measureAiEstimateStep<T>(
  step: AiEstimatePerformanceStep,
  run: () => T,
  options: Omit<AiEstimatePerformanceMetric, "step" | "durationMs" | "startedAt" | "finishedAt"> = {},
): { value: T; metric: AiEstimatePerformanceMetric } {
  const startedAt = new Date().toISOString();
  const started = nowMs();
  const value = run();
  const finished = nowMs();
  return {
    value,
    metric: {
      ...options,
      step,
      durationMs: roundMetric(finished - started),
      startedAt,
      finishedAt: new Date().toISOString(),
    },
  };
}

export async function measureAiEstimateStepAsync<T>(
  step: AiEstimatePerformanceStep,
  run: () => Promise<T>,
  options: Omit<AiEstimatePerformanceMetric, "step" | "durationMs" | "startedAt" | "finishedAt"> = {},
): Promise<{ value: T; metric: AiEstimatePerformanceMetric }> {
  const startedAt = new Date().toISOString();
  const started = nowMs();
  const value = await run();
  const finished = nowMs();
  return {
    value,
    metric: {
      ...options,
      step,
      durationMs: roundMetric(finished - started),
      startedAt,
      finishedAt: new Date().toISOString(),
    },
  };
}
