import {
  PRODUCTION_WORK_DEFINITIONS_10000,
  compileProductionExpandedEstimate10000,
} from "../../src/lib/ai/estimateTemplate10000";

describe("calculation trace 10000", () => {
  it("adds formula, template, and source parameter trace to every compiled production template row", () => {
    const sampleDefinitions = PRODUCTION_WORK_DEFINITIONS_10000.filter((_, index) => index % 101 === 0);
    expect(sampleDefinitions.length).toBeGreaterThan(90);

    const allSampleUnits = new Set<string>();
    for (const definition of sampleDefinitions) {
      const estimate = compileProductionExpandedEstimate10000({
        workKey: definition.workKey,
        quantity: 54,
        countryCode: "KG",
      });

      expect(estimate.rows.length).toBeGreaterThanOrEqual(25);
      expect(estimate.rows.every((row) => row.unitPrice === null && row.priceStatus === "PRICE_MISSING")).toBe(true);
      expect(estimate.rows.every((row) =>
        row.formulaId
          && row.quantityFormula
          && row.calculationTrace.includes(`template=${estimate.templateKey}`)
          && row.calculationTrace.includes("baseQuantity=54")
          && row.sourceParameters.baseQuantity === 54
          && row.sourceParameters.workKey === definition.workKey
          && row.sourceParameters.rowCode === row.rowCode
          && row.templateId === estimate.templateKey
          && row.templateVersion
      )).toBe(true);

      const units = new Set(estimate.rows.map((row) => row.unit));
      units.forEach((unit) => allSampleUnits.add(unit));
      expect(units.size).toBeGreaterThanOrEqual(2);
    }
    expect(allSampleUnits.size).toBeGreaterThanOrEqual(5);
  });
});
