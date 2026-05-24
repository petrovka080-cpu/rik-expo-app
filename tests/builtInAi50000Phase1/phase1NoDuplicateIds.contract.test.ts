import { PHASE1_CASES } from "./phase1TestHelpers";

describe("built-in AI 50000 Phase 1 no duplicate IDs", () => {
  it("keeps each case ID unique", () => {
    const ids = PHASE1_CASES.map((testCase) => testCase.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
