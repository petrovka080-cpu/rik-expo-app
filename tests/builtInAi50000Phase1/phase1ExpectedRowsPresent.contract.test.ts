import { PHASE1_CASES } from "./phase1TestHelpers";

describe("built-in AI 50000 Phase 1 expected rows", () => {
  it("declares work-specific expected row hints for every case", () => {
    expect(PHASE1_CASES.every((testCase) => testCase.expectedRowsContain.length > 0)).toBe(true);
  });
});
