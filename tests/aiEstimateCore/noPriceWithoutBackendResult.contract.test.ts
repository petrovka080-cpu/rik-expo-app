import { UNFINISHED_AI_ESTIMATE_CASES, answerCase } from "./aiEstimateCoreTestHelpers";

describe("AI estimate pricing source", () => {
  it("does not expose prices without a GlobalEstimateResult", () => {
    for (const testCase of UNFINISHED_AI_ESTIMATE_CASES) {
      const answer = answerCase(testCase);
      expect(answer.toolResult.estimate).toBeTruthy();
      expect(answer.toolResult.backendCalled).toBe(true);
      expect(answer.toolResult.estimate?.totals.grandTotal).toBeGreaterThan(0);
    }
  });
});
