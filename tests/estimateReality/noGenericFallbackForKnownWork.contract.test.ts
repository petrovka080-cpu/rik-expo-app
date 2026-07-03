import {
  evaluateWorkSpecificityCase,
  FUNCTIONAL_REALITY_CASES,
} from "../../scripts/estimate/validateEstimateWorkSpecificity";

describe("known work generic fallback guard", () => {
  it("keeps known works out of generic family-default fallbacks", () => {
    const knownWorks = FUNCTIONAL_REALITY_CASES
      .filter((item) => ["diamond_drilling_full", "profile_sheet_fence_full", "mansard_roof_full", "apartment_54"].includes(item.case_id))
      .map(evaluateWorkSpecificityCase);

    expect(knownWorks.every((item) => item.generic_known_work_is_hard_fail)).toBe(false);
    expect(knownWorks.every((item) => item.known_work_generic_fallback_rejected)).toBe(false);
    expect(knownWorks.every((item) => item.professional)).toBe(true);
  });
});
