import { PHASE1_CASES, getPhase1ManifestValidation } from "./phase1TestHelpers";

describe("built-in AI 50000 Phase 1 manifest count", () => {
  it("contains exactly 5000 governed Phase 1 cases, not full 50000", () => {
    expect(PHASE1_CASES).toHaveLength(5000);
    expect(getPhase1ManifestValidation().valid).toBe(true);
  });
});
