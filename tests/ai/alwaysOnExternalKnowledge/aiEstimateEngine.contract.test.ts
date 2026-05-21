import {
  buildConstructionEstimateAnswer,
  composeConstructionEstimateAnswerRu,
  guardConstructionEstimateAnswerFirst,
} from "../../../src/lib/ai/estimateEngine";

describe("AI estimate engine", () => {
  it("builds a guarded result-first estimate with quantities and totals", () => {
    const estimate = buildConstructionEstimateAnswer("дай смету на паркет 100 м²");
    const text = composeConstructionEstimateAnswerRu(estimate);
    const guard = guardConstructionEstimateAnswerFirst(estimate, text);

    expect(estimate.materials.length).toBeGreaterThan(0);
    expect(estimate.works.length).toBeGreaterThan(0);
    expect(estimate.totals.grandTotal).toBeGreaterThan(0);
    expect(text).toContain("Коротко:");
    expect(text).toContain("Итого:");
    expect(guard.passed).toBe(true);
  });
});
