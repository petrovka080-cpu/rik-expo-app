import { buildConstructionEstimateAnswer, composeConstructionEstimateAnswerRu } from "../../../src/lib/ai/estimateEngine";

describe("AI asphalt estimate 100m2", () => {
  it("returns an asphalt estimate instead of falling back to generic work", () => {
    const estimate = buildConstructionEstimateAnswer("дай смету на асфальт 100 кв м");
    const text = composeConstructionEstimateAnswerRu(estimate);

    expect(estimate.workType).toBe("asphalt_paving");
    expect(estimate.materials.some((line) => line.nameRu.includes("Асфальт"))).toBe(true);
    expect(text).toContain("Смета:");
    expect(text).toContain("Итого:");
  });
});
