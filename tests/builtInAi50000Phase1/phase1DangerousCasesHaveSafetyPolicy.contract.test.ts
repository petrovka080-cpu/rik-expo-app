import { PHASE1_CASES } from "./phase1TestHelpers";

describe("built-in AI 50000 Phase 1 dangerous work safety policy", () => {
  it("requires no-DIY and specialist review for dangerous work", () => {
    const dangerous = PHASE1_CASES.filter((testCase) => testCase.dangerousWork);
    expect(dangerous.length).toBeGreaterThan(0);
    expect(dangerous.every((testCase) => testCase.noDiyInstructionsRequired && testCase.specialistReviewRequired)).toBe(true);
  });
});
