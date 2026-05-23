import { P0_UNFINISHED_AI_ESTIMATE_CASES, expectCaseValid } from "../aiEstimateCore/aiEstimateCoreTestHelpers";

describe("AI estimate foreman route", () => {
  it("returns structured estimates on /ai?context=foreman", () => {
    expectCaseValid(P0_UNFINISHED_AI_ESTIMATE_CASES[0], "ai_foreman");
  });
});
