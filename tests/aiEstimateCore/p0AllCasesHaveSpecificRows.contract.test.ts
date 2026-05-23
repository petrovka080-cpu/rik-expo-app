import { P0_UNFINISHED_AI_ESTIMATE_CASES, expectCaseValid } from "./aiEstimateCoreTestHelpers";

describe("P0 estimate rows", () => {
  it("renders each P0 case with work-specific BOQ rows", () => {
    for (const testCase of P0_UNFINISHED_AI_ESTIMATE_CASES) {
      expectCaseValid(testCase);
    }
  });
});
