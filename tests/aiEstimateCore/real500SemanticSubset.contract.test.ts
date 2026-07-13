import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { buildStructuredEstimatePayload } from "../../src/lib/estimateStructuredPipeline";
import { resolveEstimatorOutcome } from "../../src/lib/ai/estimatorKernel";
import { REAL_DIVERSE_500_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse500ConstructionWorks";
import {
  internalKeysVisible,
  mojibakeVisible,
  paidControlRows,
  weakGenericRows,
} from "./aiEstimateCoreReal10000HardeningTestHelpers";

function contextFor(route: string): "request" | "foreman" {
  return route.includes("foreman") ? "foreman" : "request";
}

describe("AI estimate core real 500 semantic subset contract", () => {
  it("covers 500 real cases and keeps a semantic sample stable without PDF side effects", () => {
    expect(REAL_DIVERSE_500_CONSTRUCTION_WORKS).toHaveLength(500);

    for (const testCase of REAL_DIVERSE_500_CONSTRUCTION_WORKS.slice(0, 25)) {
      const outcome = resolveEstimatorOutcome({ text: testCase.promptRu, currency: "KGS" });
      expect(outcome.plan?.semanticFrame.object).toBe(testCase.expectedObject);
      expect(outcome.plan?.semanticFrame.operation).toBe(testCase.expectedOperation);

      const context = contextFor(testCase.route);
      const answer = answerBuiltInAi({
        text: testCase.promptRu,
        route: testCase.route,
        screenContext: context,
        role: context,
        countryCode: "KG",
        cityOrRegion: "Bishkek",
      });
      expect(answer.route.intent).toBe("estimate");
      expect(answer.toolResult.estimate).toBeTruthy();
      const payload = buildStructuredEstimatePayload(answer.toolResult.estimate!, { source: "request" });
      expect(payload.rows.length).toBeGreaterThanOrEqual(testCase.expectedMinimumRows);
      expect(weakGenericRows(payload)).toEqual([]);
      expect(paidControlRows(payload)).toEqual([]);
      expect(internalKeysVisible(payload)).toEqual([]);
      expect(mojibakeVisible(payload)).toEqual([]);
    }
  });
});
