import {
  evaluateWorkSpecificityCase,
  FUNCTIONAL_REALITY_CASES,
} from "../../scripts/estimate/validateEstimateWorkSpecificity";

describe("mansard roof functional reality audit", () => {
  it("keeps mansard formulas visible but rejects their unadmitted source claim", () => {
    const testCase = FUNCTIONAL_REALITY_CASES.find((item) => item.case_id === "mansard_roof_full");
    expect(testCase).toBeDefined();

    const result = evaluateWorkSpecificityCase(testCase!);

    expect(result.extracted_parameters.roof_area_m2).toBe(200);
    expect(result.extracted_parameters.slope_angle_deg).toBe(35);
    expect(result.extracted_parameters.insulation_thickness_mm).toBe(200);
    expect(result.professional).toBe(false);
    expect(result.selected_work_key).toBe("mansard_roof_metal_tile_insulated");
    expect(result.source_backed_row_count).toBe(0);
    expect(result.known_work_generic_fallback_rejected).toBe(true);
    expect(result.blocking_reasons).toContain("known_work_generic_fallback");
  });
});
