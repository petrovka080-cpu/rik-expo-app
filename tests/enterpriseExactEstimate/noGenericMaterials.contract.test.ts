import {
  buildSelectedExactEstimate,
  GENERIC_ROW_PATTERN,
  requiredCoverageWorkKeys,
} from "../exactEstimate/exactEstimateTestHelpers";

describe("enterprise exact estimate no generic materials", () => {
  it("does not expose generic material rows for known works", () => {
    for (const workKey of requiredCoverageWorkKeys()) {
      const result = buildSelectedExactEstimate(workKey);
      const generic = result.material_lines
        .map((line) => line.material_visible_name_ru)
        .filter((name) => GENERIC_ROW_PATTERN.test(name));
      expect(generic).toEqual([]);
    }
  });
});
