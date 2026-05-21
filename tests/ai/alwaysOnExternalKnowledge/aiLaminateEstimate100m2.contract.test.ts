import { buildConstructionEstimateAnswer, composeConstructionEstimateAnswerRu } from "../../../src/lib/ai/estimateEngine";

describe("AI laminate estimate 100m2", () => {
  it("returns a laminate estimate table with numeric totals", () => {
    const estimate = buildConstructionEstimateAnswer("дай смету на ламинат 100 м²");
    const text = composeConstructionEstimateAnswerRu(estimate);

    expect(estimate.workType).toBe("laminate_flooring");
    expect(estimate.totals.grandTotal).toBeGreaterThan(0);
    expect(text).toContain("Ламинат");
    expect(text).toContain("Общий ориентир:");
  });
});
