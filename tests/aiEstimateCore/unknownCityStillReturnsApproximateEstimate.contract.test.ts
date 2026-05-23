import { P0_UNFINISHED_AI_ESTIMATE_CASES } from "./aiEstimateCoreTestHelpers";
import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";

describe("AI estimate unknown city", () => {
  it("returns an approximate source-backed estimate instead of refusing normal construction work", () => {
    const testCase = P0_UNFINISHED_AI_ESTIMATE_CASES[0];
    const answer = answerBuiltInAi({ text: testCase.promptRu, screenContext: "chat", route: "/chat", role: "foreman" });
    expect(answer.toolResult.estimate?.work.workKey).toBe(testCase.expectedWorkKey);
    expect(answer.toolResult.estimate?.totals.grandTotal).toBeGreaterThan(0);
    expect(answer.answerTextRu).not.toMatch(/не найдено/i);
  });
});
