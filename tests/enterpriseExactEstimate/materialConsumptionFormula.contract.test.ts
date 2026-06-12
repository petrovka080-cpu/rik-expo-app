import {
  requiredCoverageWorkKeys,
  buildSelectedExactEstimate,
} from "../exactEstimate/exactEstimateTestHelpers";

describe("enterprise exact estimate material consumption formulas", () => {
  it("keeps every material row quantity-based with non-negative waste", () => {
    for (const workKey of requiredCoverageWorkKeys()) {
      const result = buildSelectedExactEstimate(workKey);
      for (const line of result.material_lines) {
        expect(line.consumption_per_unit).toBeGreaterThan(0);
        expect(line.waste_percent).toBeGreaterThanOrEqual(0);
        expect(line.formula).toContain("quantity");
        expect(line.quantity).toBeGreaterThan(0);
      }
    }
  });
});
