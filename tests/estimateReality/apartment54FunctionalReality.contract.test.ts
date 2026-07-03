import {
  evaluateWorkSpecificityCase,
  FUNCTIONAL_REALITY_CASES,
} from "../../scripts/estimate/validateEstimateWorkSpecificity";

describe("apartment 54 functional reality audit", () => {
  it("blocks apartment area-only output until required room parameters are present", () => {
    const testCase = FUNCTIONAL_REALITY_CASES.find((item) => item.case_id === "apartment_54");
    expect(testCase).toBeDefined();

    const result = evaluateWorkSpecificityCase(testCase!);

    expect(result.extracted_parameters.apartment_area_m2).toBe(54);
    expect(result.missing_parameters).toEqual(expect.arrayContaining([
      "ceiling_height_m",
      "room_count",
      "wall_area_m2",
    ]));
    expect(result.rows_generated_despite_missing_params).toBe(false);
    expect(result.row_count).toBe(0);
    expect(result.professional).toBe(true);
    expect(result.blocking_reasons).toEqual([]);
  });
});
