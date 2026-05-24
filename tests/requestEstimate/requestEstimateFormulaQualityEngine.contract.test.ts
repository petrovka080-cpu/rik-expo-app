import {
  calculateGlobalConstructionEstimateSync,
  validateEstimateFormulaQuality,
  type GlobalEstimateResult,
} from "../../src/lib/ai/globalEstimate";

const FOUNDATION_PROMPT = "смета на ленточный фундамент длин 48 метров ширина 0,4 м, и высота 1.7 м";

function foundationEstimate(): GlobalEstimateResult {
  return calculateGlobalConstructionEstimateSync({
    text: FOUNDATION_PROMPT,
    language: "ru",
    countryCode: "KG",
    city: "Bishkek",
  });
}

function mutateConcreteRow(result: GlobalEstimateResult, patch: Partial<GlobalEstimateResult["sections"][number]["rows"][number]>): GlobalEstimateResult {
  return {
    ...result,
    sections: result.sections.map((section) => ({
      ...section,
      rows: section.rows.map((row) =>
        row.code === "strip_foundation_concrete_m300" ? { ...row, ...patch } : row,
      ),
    })),
  };
}

describe("request estimate formula quality engine", () => {
  it("passes the strip foundation backend result with professional BOQ depth and concrete formula trace", () => {
    const validation = validateEstimateFormulaQuality(foundationEstimate());

    expect(validation.passed).toBe(true);
    expect(validation.blockers).toEqual([]);
    expect(validation.trace.rowCount).toBeGreaterThanOrEqual(12);
    expect(validation.trace.allRowsLinearM).toBe(false);
    expect(validation.trace.stripFoundation).toMatchObject({
      dimensionsParsed: true,
      lengthM: 48,
      widthM: 0.4,
      heightM: 1.7,
      formula: "length * width * height",
      expectedConcreteVolumeM3: 32.64,
      actualConcreteVolumeM3: 32.64,
      concreteRowUnit: "m3",
      concreteVolumeMatches: true,
      requiredRowsPresent: true,
      unitMismatches: [],
    });
  });

  it("blocks the exact bad foundation regression: concrete as 9.6 linear_m", () => {
    const invalid = mutateConcreteRow(foundationEstimate(), {
      quantity: 9.6,
      unit: "linear_m",
    });
    const validation = validateEstimateFormulaQuality(invalid);

    expect(validation.passed).toBe(false);
    expect(validation.blockers).toContain("STRIP_FOUNDATION_CONCRETE_VOLUME_MISMATCH");
    expect(validation.blockers).toContain("STRIP_FOUNDATION_CONCRETE_UNIT_NOT_M3");
    expect(validation.blockers).toContain("STRIP_FOUNDATION_UNIT_MISMATCH:strip_foundation_concrete_m300:linear_m!=m3");
  });
});
