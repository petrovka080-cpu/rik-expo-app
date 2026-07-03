import {
  evaluateWorkSpecificityCase,
  FUNCTIONAL_REALITY_CASES,
} from "../../scripts/estimate/validateEstimateWorkSpecificity";

describe("blind quantity copy detector", () => {
  it("detects user quantity copied into unrelated generic rows", () => {
    const testCase = FUNCTIONAL_REALITY_CASES.find((item) => item.case_id === "profile_sheet_fence_full");
    expect(testCase).toBeDefined();

    const result = evaluateWorkSpecificityCase(testCase!);

    expect(result.blind_quantity_copy_count).toBeGreaterThan(0);
    expect(result.blocking_reasons).toContain("blind_user_quantity_copy_detected");
  });
});
