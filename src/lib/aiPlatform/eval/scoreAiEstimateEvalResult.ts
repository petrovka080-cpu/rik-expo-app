import type { AiEvalActual, AiEvalCase } from "./AiEvalContract";
import { scoreAiEvalResult, totalAiEvalScore } from "./scoreAiEvalResult";

export function scoreAiEstimateEvalResult(testCase: AiEvalCase, actual: AiEvalActual, input: {
  piiRedactionPassed: boolean;
  rawInternalIdsVisible: boolean;
  deterministicContractPassed: boolean;
  groundingPassed: boolean;
}) {
  const scoreBreakdown = scoreAiEvalResult(testCase, actual, input);
  return {
    score: totalAiEvalScore(scoreBreakdown),
    scoreBreakdown,
  };
}
