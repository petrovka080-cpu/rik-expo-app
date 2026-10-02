import {
  evaluateWorkSpecificityCase,
  FUNCTIONAL_REALITY_CASES,
} from "../../scripts/estimate/validateEstimateWorkSpecificity";

describe("profile sheet fence functional reality audit", () => {
  it("keeps the profile sheet fence calculator fail-closed until its norm source is verified", () => {
    const testCase = FUNCTIONAL_REALITY_CASES.find((item) => item.case_id === "profile_sheet_fence_full");
    expect(testCase).toBeDefined();

    const result = evaluateWorkSpecificityCase(testCase!);

    expect(result.extracted_parameters.fence_length_m).toBe(50);
    expect(result.extracted_parameters.fence_height_m).toBe(2);
    expect(result.extracted_parameters.post_spacing_m).toBe(2.5);
    expect(result.professional).toBe(false);
    expect(result.selected_work_key).toBe("profile_sheet_fence_metal_posts");
    expect(result.source_backed_row_count).toBe(0);
    expect(result.row_count).toBeGreaterThan(0);
    expect(result.known_work_generic_fallback_rejected).toBe(true);
    expect(result.blocking_reasons).toEqual(["known_work_generic_fallback"]);
  });
});
