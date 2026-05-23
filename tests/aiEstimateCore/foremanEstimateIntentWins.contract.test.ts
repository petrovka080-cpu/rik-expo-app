import { P0_UNFINISHED_AI_ESTIMATE_CASES, expectCaseValid } from "./aiEstimateCoreTestHelpers";

describe("foreman estimate intent", () => {
  it("lets estimate intent beat role context on /ai?context=foreman", () => {
    expectCaseValid(P0_UNFINISHED_AI_ESTIMATE_CASES[0], "ai_foreman");
  });
});
