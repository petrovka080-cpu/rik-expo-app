import { P0_UNFINISHED_AI_ESTIMATE_CASES, answerCase, expectNoGenericRowsInAnswer } from "./aiEstimateCoreTestHelpers";

describe("P0 generic row blocker", () => {
  it("does not allow known works to fall back to generic construction rows", () => {
    for (const testCase of P0_UNFINISHED_AI_ESTIMATE_CASES) {
      expectNoGenericRowsInAnswer(answerCase(testCase));
    }
  });
});
