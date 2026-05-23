import { P0_UNFINISHED_AI_ESTIMATE_CASES, expectCaseValid } from "../aiEstimateCore/aiEstimateCoreTestHelpers";

describe("AI estimate chat route", () => {
  it("returns structured estimates on /chat", () => {
    expectCaseValid(P0_UNFINISHED_AI_ESTIMATE_CASES[0], "chat");
  });
});
