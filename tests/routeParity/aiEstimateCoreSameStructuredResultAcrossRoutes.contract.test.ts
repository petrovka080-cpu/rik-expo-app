import { P0_UNFINISHED_AI_ESTIMATE_CASES, answerCase } from "../aiEstimateCore/aiEstimateCoreTestHelpers";

describe("AI estimate structured result parity", () => {
  it("keeps sections, totals and actions across routes", () => {
    const testCase = P0_UNFINISHED_AI_ESTIMATE_CASES[0];
    for (const route of ["chat", "ai_foreman", "request"] as const) {
      const answer = answerCase(testCase, route);
      expect(answer.toolResult.estimate?.sections.length).toBeGreaterThanOrEqual(2);
      expect(answer.toolResult.estimate?.totals.grandTotal).toBeGreaterThan(0);
      expect(answer.actions.some((action) => action.id === "make_pdf" && action.visible)).toBe(true);
    }
  });
});
