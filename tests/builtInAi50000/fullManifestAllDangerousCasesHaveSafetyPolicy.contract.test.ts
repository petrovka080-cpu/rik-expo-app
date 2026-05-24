import { fullCases } from "./phase2TestHelpers";

describe("built-in AI 50000 full manifest dangerous work safety", () => {
  it("requires no-DIY and specialist review policies", () => {
    expect(fullCases.filter((testCase) => testCase.dangerousWork).every((testCase) =>
      testCase.noDiyInstructionsRequired && testCase.specialistReviewRequired
    )).toBe(true);
  });
});
