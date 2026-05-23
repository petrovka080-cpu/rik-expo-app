import { calculateEstimateForPrompt } from "./anyEstimateTestHelpers";

describe("unknown work uses category fallback", () => {
  it("does not return not found for broad construction repair prompts", () => {
    const { route, result, answerText } = calculateEstimateForPrompt("смета на ремонт входной группы 120 м2");

    expect(route.shouldCallEstimateTool).toBe(true);
    expect(route.resolvedCategory).toBe("facade");
    expect(result.work.workKey).toBe("facade_plaster");
    expect(result.confidence).not.toBe("high");
    expect(answerText.toLowerCase()).not.toContain("не найдено");
    expect(result.clarifyingQuestions.length).toBeGreaterThan(0);
  });
});
