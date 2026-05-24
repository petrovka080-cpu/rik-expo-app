import { PHASE1_CASES } from "./phase1TestHelpers";

describe("built-in AI 50000 Phase 1 estimate rate keys", () => {
  it("requires rate keys for every estimate case", () => {
    const estimates = PHASE1_CASES.filter((testCase) => testCase.intent === "estimate");
    expect(estimates.every((testCase) => testCase.requiredRateKeys.length > 0)).toBe(true);
  });
});
