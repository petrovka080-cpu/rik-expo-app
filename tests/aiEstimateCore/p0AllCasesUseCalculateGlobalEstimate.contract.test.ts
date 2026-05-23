import { P0_UNFINISHED_AI_ESTIMATE_CASES, answerCase } from "./aiEstimateCoreTestHelpers";

describe("P0 estimate tool use", () => {
  it("routes every P0 prompt to calculate_global_estimate", () => {
    for (const testCase of P0_UNFINISHED_AI_ESTIMATE_CASES) {
      const answer = answerCase(testCase);
      expect(answer.route.intent).toBe("estimate");
      expect(answer.toolResult.toolName).toBe("calculate_global_estimate");
      expect(answer.toolResult.backendCalled).toBe(true);
      expect(answer.runtimeTrace.selectedTool).toBe("calculate_global_estimate");
    }
  });
});
