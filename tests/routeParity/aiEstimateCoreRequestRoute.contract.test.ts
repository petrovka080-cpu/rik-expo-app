import { P0_UNFINISHED_AI_ESTIMATE_CASES, expectCaseValid } from "../aiEstimateCore/aiEstimateCoreTestHelpers";

describe("AI estimate request route", () => {
  it("returns structured estimate data for /request prompts", () => {
    expectCaseValid(P0_UNFINISHED_AI_ESTIMATE_CASES[1], "request");
  });
});
