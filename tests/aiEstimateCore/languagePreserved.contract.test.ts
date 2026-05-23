import { P0_UNFINISHED_AI_ESTIMATE_CASES, expectCaseValid } from "./aiEstimateCoreTestHelpers";

describe("AI estimate language", () => {
  it("keeps Russian output for Russian prompts", () => {
    for (const testCase of P0_UNFINISHED_AI_ESTIMATE_CASES) {
      const answer = expectCaseValid(testCase);
      expect(answer.toolResult.estimate?.locale.language).toBe("ru");
      expect(answer.answerTextRu).toMatch(/[А-Яа-яЁё]/);
    }
  });
});
