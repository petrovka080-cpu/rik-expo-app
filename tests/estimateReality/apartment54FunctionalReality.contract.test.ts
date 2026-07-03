import {
  evaluateWorkSpecificityCase,
  FUNCTIONAL_REALITY_CASES,
} from "../../scripts/estimate/validateEstimateWorkSpecificity";

describe("apartment 54 functional reality audit", () => {
  it("does not accept apartment area-only output as product green", () => {
    const testCase = FUNCTIONAL_REALITY_CASES.find((item) => item.case_id === "apartment_54");
    expect(testCase).toBeDefined();

    const result = evaluateWorkSpecificityCase(testCase!);

    expect(result.extracted_parameters.apartment_area_m2).toBe(54);
    expect(result.missing_parameters).toEqual(expect.arrayContaining([
      "ceiling_height_m",
      "room_count",
      "wall_area_m2",
    ]));
    expect(result.rows_generated_despite_missing_params).toBe(true);
    expect(result.professional).toBe(false);
    expect(result.blocking_reasons).toContain("apartment_renovation_contains_generic_rows");
  });
});
