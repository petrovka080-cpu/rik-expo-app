import { buildConstructionEstimateAnswer, composeConstructionEstimateAnswerRu } from "../../../src/lib/ai/estimateEngine";

describe("AI parquet estimate 100m2", () => {
  it("returns a parquet/flooring estimate table instead of generic construction work", () => {
    const estimate = buildConstructionEstimateAnswer("дай смету на установку паркета 100 кв м");
    const text = composeConstructionEstimateAnswerRu(estimate);

    expect(estimate.workType).toBe("parquet_flooring");
    expect(estimate.materials.some((line) => line.quantity === 110)).toBe(true);
    expect(text).toContain("Смета:");
    expect(text).not.toContain("строительная работа");
  });
});
