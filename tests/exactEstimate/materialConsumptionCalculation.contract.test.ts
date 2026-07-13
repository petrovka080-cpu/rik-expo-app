import { buildRoofExactEstimate } from "./exactEstimateTestHelpers";

describe("material consumption calculation", () => {
  it("keeps deterministic consumption formulas and calculated quantities", () => {
    const result = buildRoofExactEstimate();

    for (const line of result.material_lines) {
      expect(line.consumption_per_unit).toBeGreaterThan(0);
      expect(line.formula).toBe(`quantity * ${line.consumption_per_unit}`);
      expect(Math.abs(line.quantity - (line.consumption_per_unit * result.input.quantity))).toBeLessThanOrEqual(0.02);
    }
  });
});
