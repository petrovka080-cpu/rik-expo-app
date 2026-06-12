import { buildSelectedExactEstimate, CONTROL_ROW_PATTERN, requiredCoverageWorkKeys } from "./exactEstimateTestHelpers";

describe("no paid control rows", () => {
  jest.setTimeout(120_000);

  it("keeps control/quality rows out of paid material/labor estimate rows", () => {
    for (const workKey of requiredCoverageWorkKeys()) {
      const result = buildSelectedExactEstimate(workKey);
      expect(result.recipe.control_rows.every((row) => row.is_paid === false)).toBe(true);
      expect(result.material_lines.map((line) => line.material_visible_name_ru).filter((name) => CONTROL_ROW_PATTERN.test(name))).toEqual([]);
      expect(result.recipe.labor_rows.map((line) => line.labor_visible_name_ru).filter((name) => CONTROL_ROW_PATTERN.test(name))).toEqual([]);
    }
  });
});
