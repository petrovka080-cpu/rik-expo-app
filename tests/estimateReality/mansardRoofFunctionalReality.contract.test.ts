import {
  evaluateWorkSpecificityCase,
  FUNCTIONAL_REALITY_CASES,
} from "../../scripts/estimate/validateEstimateWorkSpecificity";

describe("mansard roof functional reality audit", () => {
  it("uses mansard roof formulas with source-backed rows", () => {
    const testCase = FUNCTIONAL_REALITY_CASES.find((item) => item.case_id === "mansard_roof_full");
    expect(testCase).toBeDefined();

    const result = evaluateWorkSpecificityCase(testCase!);

    expect(result.extracted_parameters.roof_area_m2).toBe(200);
    expect(result.extracted_parameters.slope_angle_deg).toBe(35);
    expect(result.extracted_parameters.insulation_thickness_mm).toBe(200);
    expect(result.professional).toBe(true);
    expect(result.selected_work_key).toBe("mansard_roof_metal_tile_insulated");
    expect(result.source_backed_row_count).toBe(result.row_count);
    expect(result.known_work_generic_fallback_rejected).toBe(false);
    expect(result.blocking_reasons).toEqual([]);
  });
});
