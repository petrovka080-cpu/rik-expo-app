import { buildConstructionEstimateAnswer, composeConstructionEstimateAnswerRu } from "../../../src/lib/ai/estimateEngine";

describe("AI plaster consumption 200m2", () => {
  it("returns material consumption with quantities", () => {
    const estimate = buildConstructionEstimateAnswer("расход штукатурки 200 кв м");
    const text = composeConstructionEstimateAnswerRu(estimate);

    expect(estimate.workType).toBe("plastering");
    expect(estimate.materials.some((line) => line.nameRu.includes("Штукатурная смесь") && line.quantity === 3200)).toBe(true);
    expect(text).toContain("Расчет:");
  });
});
