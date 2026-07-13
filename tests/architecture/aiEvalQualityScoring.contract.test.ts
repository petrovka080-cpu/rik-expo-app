import fs from "node:fs";
import path from "node:path";

import type { AiEvalCase } from "../../src/lib/aiPlatform/eval/AiEvalContract";
import { extractAiEvalActual } from "../../src/lib/aiPlatform/eval/extractAiEvalActual";
import { explainAiEvalScoreRu } from "../../src/lib/aiPlatform/eval/explainAiEvalScore";
import { scoreAiEstimateEvalResult } from "../../src/lib/aiPlatform/eval/scoreAiEstimateEvalResult";

function loadGoldenCase(index: number): AiEvalCase {
  const fixture = JSON.parse(fs.readFileSync(
    path.resolve(__dirname, "../fixtures/aiPlatform/eval/aiEstimateGoldenEvalCases.json"),
    "utf8",
  ));
  return fixture.cases[index] as AiEvalCase;
}

describe("AI EvalOps quality scoring", () => {
  it("scores separate quality dimensions instead of a single opaque total", () => {
    const testCase = loadGoldenCase(15);
    const actual = extractAiEvalActual(testCase, {
      answerRu: "Черновик сметы собран через единый AI runtime.",
      durationMs: 10,
      providerKey: "provider",
      modelKey: "model",
    });
    const scored = scoreAiEstimateEvalResult(testCase, actual, {
      piiRedactionPassed: true,
      rawInternalIdsVisible: false,
      deterministicContractPassed: true,
      groundingPassed: true,
    });

    expect(scored.score).toBeGreaterThanOrEqual(testCase.qualityGates.minScore);
    expect(scored.scoreBreakdown.work_classification_score).toBe(1);
    expect(scored.scoreBreakdown.parameter_extraction_score).toBe(1);
    expect(scored.scoreBreakdown.parameter_passport_score).toBe(1);
    expect(scored.scoreBreakdown.quantity_trace_score).toBe(1);
    expect(scored.scoreBreakdown.policy_compliance_score).toBe(1);
    expect(explainAiEvalScoreRu(scored.score, scored.scoreBreakdown)).toContain("Оценка");
  });
});
