import { buildGlobalEstimateDataOpsCoverageMatrix } from "../../src/lib/ai/globalEstimate";

describe("Global Estimate Data Ops coverage matrix contract", () => {
  it("reports template, rate, tax and source coverage explicitly", () => {
    const coverage = buildGlobalEstimateDataOpsCoverageMatrix();

    expect(coverage.templatesCovered).toBe(true);
    expect(coverage.templateRowsCovered).toBe(true);
    expect(coverage.materialRatesHaveSources).toBe(true);
    expect(coverage.laborRatesHaveSources).toBe(true);
    expect(coverage.taxRulesHaveSources).toBe(true);
    expect(coverage.countriesCovered.length).toBeGreaterThan(0);
  });
});
