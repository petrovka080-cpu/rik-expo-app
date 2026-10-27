import type { AiEvalScoreBreakdown } from "./AiEvalContract";

export function explainAiEvalScoreRu(score: number, breakdown: AiEvalScoreBreakdown): string {
  const failed = Object.entries(breakdown)
    .filter(([, value]) => value < 1)
    .map(([key]) => key);
  if (failed.length === 0) return `Оценка ${score.toFixed(3)}: все критичные проверки качества прошли.`;
  return `Оценка ${score.toFixed(3)}: требуют внимания ${failed.join(", ")}.`;
}
