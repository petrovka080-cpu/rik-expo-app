import { BUILT_IN_AI_10000_POST_BOQ_ESTIMATE_CASES } from "../../src/lib/ai/builtInAi10000";

describe("built-in AI 10000 post-BOQ estimate templates", () => {
  it("requires every estimate case to name the structured template contract", () => {
    expect(BUILT_IN_AI_10000_POST_BOQ_ESTIMATE_CASES.length).toBeGreaterThan(0);
    expect(BUILT_IN_AI_10000_POST_BOQ_ESTIMATE_CASES.every((testCase) => Boolean(testCase.templateId))).toBe(true);
    expect(BUILT_IN_AI_10000_POST_BOQ_ESTIMATE_CASES.every((testCase) => testCase.expectedTool === "calculate_global_estimate")).toBe(true);
  });
});
