import { professionalCoverage } from "./professionalEstimateTestHelpers";

describe("professional estimate no generic material rows", () => {
  it("has zero generic material rows", () => {
    const result = professionalCoverage();
    expect(result.generic_material_rows).toBe(0);
  });
});
