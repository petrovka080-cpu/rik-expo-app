import { validateProfessionalEstimateFormulaQuality } from "../../src/lib/ai/globalEstimate";
import { allRows, stripFoundationEstimate } from "./boqDepthTestHelpers";

describe("strip foundation concrete volume", () => {
  it("uses length * width * height and returns 32.64 m3 for the hard regression prompt", () => {
    const estimate = stripFoundationEstimate();
    const concrete = allRows(estimate).find((row) => row.code === "strip_foundation_concrete_m300");
    const validation = validateProfessionalEstimateFormulaQuality(estimate);

    expect(estimate.input.dimensions).toMatchObject({
      length: 48,
      width: 0.4,
      height: 1.7,
      concreteVolumeM3: 32.64,
    });
    expect(concrete).toMatchObject({ quantity: 32.64, unit: "m3" });
    expect(validation.passed).toBe(true);
  });

  it("blocks the exact bad regression where concrete is 9.6 linear_m", () => {
    const estimate = stripFoundationEstimate();
    const invalid = {
      ...estimate,
      sections: estimate.sections.map((section) => ({
        ...section,
        rows: section.rows.map((row) =>
          row.code === "strip_foundation_concrete_m300" ? { ...row, quantity: 9.6, unit: "linear_m" } : row,
        ),
      })),
    };

    const validation = validateProfessionalEstimateFormulaQuality(invalid);

    expect(validation.passed).toBe(false);
    expect(validation.blockers).toContain("STRIP_FOUNDATION_CONCRETE_VOLUME_MISMATCH");
    expect(validation.blockers).toContain("STRIP_FOUNDATION_CONCRETE_UNIT_NOT_M3");
    expect(validation.blockers).toContain("FORMULA_STRIP_FOUNDATION_CONCRETE_NOT_M3");
  });
});
