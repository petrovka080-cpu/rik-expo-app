import type { AiEvalResult, AiEvalRunSummary } from "./AiEvalContract";

export function summarizeAiEvalResults(input: {
  evalRunId: string;
  sourceSha: string;
  runtimeVersion: string;
  promptVersion: string;
  providerKey: string;
  modelKey: string;
  results: AiEvalResult[];
}): AiEvalRunSummary {
  const scores = input.results.map((result) => result.score);
  const durations = input.results.map((result) => result.cost.durationMs).sort((left, right) => left - right);
  const p95Index = Math.max(0, Math.ceil(durations.length * 0.95) - 1);
  const passed = input.results.filter((result) => result.status === "passed").length;
  const blocked = input.results.filter((result) => result.status === "blocked").length;
  return {
    evalRunId: input.evalRunId,
    sourceSha: input.sourceSha,
    runtimeVersion: input.runtimeVersion,
    promptVersion: input.promptVersion,
    providerKey: input.providerKey,
    modelKey: input.modelKey,
    total: input.results.length,
    passed,
    failed: input.results.length - passed - blocked,
    blocked,
    minScore: scores.length ? Math.min(...scores) : 0,
    averageScore: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0,
    p95DurationMs: durations[p95Index] ?? 0,
    results: input.results,
  };
}
