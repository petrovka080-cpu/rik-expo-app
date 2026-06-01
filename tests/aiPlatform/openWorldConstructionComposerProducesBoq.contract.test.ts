import { requireOpenWorldBoq, UNIVERSAL_KNOWN_WORK_CASES } from "./universalProfessionalEstimateEngineTestHelpers";

describe("open-world construction composer", () => {
  it.each(UNIVERSAL_KNOWN_WORK_CASES)("$id produces a BOQ instead of template gap", (testCase) => {
    const composed = requireOpenWorldBoq(testCase);
    expect(composed.boq?.rows.length).toBe(composed.rowCount);
  });
});
