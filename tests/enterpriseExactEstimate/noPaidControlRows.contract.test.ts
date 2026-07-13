import {
  buildSelectedExactEstimate,
  CONTROL_ROW_PATTERN,
  requiredCoverageWorkKeys,
} from "../exactEstimate/exactEstimateTestHelpers";

describe("enterprise exact estimate no paid control rows", () => {
  it("keeps quality/control labels out of paid material rows", () => {
    for (const workKey of requiredCoverageWorkKeys()) {
      const result = buildSelectedExactEstimate(workKey);
      expect(result.recipe.control_rows.every((row) => row.is_paid === false)).toBe(true);
      expect(result.material_lines.map((line) => line.material_visible_name_ru).filter((name) => CONTROL_ROW_PATTERN.test(name))).toEqual([]);
    }
  });
});
