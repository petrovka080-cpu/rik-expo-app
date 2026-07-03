import {
  evaluateWorkSpecificityCase,
  FUNCTIONAL_REALITY_CASES,
} from "../../scripts/estimate/validateEstimateWorkSpecificity";

describe("known work generic fallback guard", () => {
  it("hard-fails known work when generic family-default rows are present", () => {
    const failedKnownWorks = FUNCTIONAL_REALITY_CASES
      .filter((item) => ["diamond_drilling_full", "profile_sheet_fence_full", "mansard_roof_full", "apartment_54"].includes(item.case_id))
      .map(evaluateWorkSpecificityCase);

    expect(failedKnownWorks.every((item) => item.generic_known_work_is_hard_fail)).toBe(true);
    expect(failedKnownWorks.every((item) => item.professional === false)).toBe(true);
  });
});
