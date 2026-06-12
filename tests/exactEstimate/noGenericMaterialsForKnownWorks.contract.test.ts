import { buildSelectedExactEstimate, GENERIC_ROW_PATTERN, requiredCoverageWorkKeys } from "./exactEstimateTestHelpers";

describe("no generic materials for known works", () => {
  jest.setTimeout(120_000);

  it("does not expose generic material rows for required known work coverage", () => {
    for (const workKey of requiredCoverageWorkKeys()) {
      const result = buildSelectedExactEstimate(workKey);
      const generic = result.material_lines
        .map((line) => line.material_visible_name_ru)
        .filter((name) => GENERIC_ROW_PATTERN.test(name));
      expect(generic).toEqual([]);
    }
  });
});
