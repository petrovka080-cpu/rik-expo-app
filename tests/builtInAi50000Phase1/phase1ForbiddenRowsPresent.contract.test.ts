import { PHASE1_CASES } from "./phase1TestHelpers";

describe("built-in AI 50000 Phase 1 forbidden rows", () => {
  it("declares forbidden fallback rows for every case", () => {
    expect(PHASE1_CASES.every((testCase) =>
      testCase.forbiddenRowsContain.includes("generic_construction_work_row"),
    )).toBe(true);
  });
});
