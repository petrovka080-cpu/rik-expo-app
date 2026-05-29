import type {
  AiEstimatePerformanceMetric,
  AiEstimatePerformanceStep,
} from "./aiEstimatePerformanceTypes";

export function percentile(values: readonly number[], ratio: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1);
  return Math.round((sorted[Math.max(0, index)] ?? 0) * 100) / 100;
}

export function collectAiEstimateLatencyMetrics(metrics: readonly AiEstimatePerformanceMetric[]): Record<
  AiEstimatePerformanceStep,
  { samples: number; p95Ms: number; maxMs: number; averageMs: number }
> {
  const grouped = new Map<AiEstimatePerformanceStep, number[]>();
  for (const metric of metrics) {
    grouped.set(metric.step, [...(grouped.get(metric.step) ?? []), metric.durationMs]);
  }

  return Object.fromEntries(
    Array.from(grouped.entries()).map(([step, values]) => {
      const total = values.reduce((sum, value) => sum + value, 0);
      return [
        step,
        {
          samples: values.length,
          p95Ms: percentile(values, 0.95),
          maxMs: Math.round(Math.max(0, ...values) * 100) / 100,
          averageMs: Math.round((values.length > 0 ? total / values.length : 0) * 100) / 100,
        },
      ];
    }),
  ) as Record<AiEstimatePerformanceStep, { samples: number; p95Ms: number; maxMs: number; averageMs: number }>;
}

export function redactAiEstimatePromptForMetrics(prompt: string): string {
  return prompt
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted_email]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[redacted_phone]")
    .slice(0, 160);
}
