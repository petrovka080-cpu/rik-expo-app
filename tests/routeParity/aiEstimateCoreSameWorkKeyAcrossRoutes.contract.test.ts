import { P0_UNFINISHED_AI_ESTIMATE_CASES, answerCase } from "../aiEstimateCore/aiEstimateCoreTestHelpers";

describe("AI estimate work key parity", () => {
  it("keeps the same work key across chat, foreman and request routes", () => {
    const testCase = P0_UNFINISHED_AI_ESTIMATE_CASES[1];
    const keys = ["chat", "ai_foreman", "request"].map((route) =>
      answerCase(testCase, route as "chat" | "ai_foreman" | "request").toolResult.estimate?.work.workKey,
    );
    expect(new Set(keys)).toEqual(new Set([testCase.expectedWorkKey]));
  });
});
