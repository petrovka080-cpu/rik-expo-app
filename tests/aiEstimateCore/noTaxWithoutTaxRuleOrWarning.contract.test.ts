import { UNFINISHED_AI_ESTIMATE_CASES, expectCaseValid } from "./aiEstimateCoreTestHelpers";

describe("AI estimate tax status", () => {
  it("shows a tax status or warning for every estimate", () => {
    for (const testCase of UNFINISHED_AI_ESTIMATE_CASES) {
      const answer = expectCaseValid(testCase);
      const tax = answer.toolResult.estimate?.tax;
      expect(Boolean(tax?.taxLabel || tax?.warning)).toBe(true);
    }
  });
});
