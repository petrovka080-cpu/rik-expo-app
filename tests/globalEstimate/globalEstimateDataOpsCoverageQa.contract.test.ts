import {
  buildGlobalEstimateDataOpsCoverageMatrix,
  runGlobalEstimateDataOpsEstimateQa,
} from "../../src/lib/ai/globalEstimate";

describe("global estimate data ops coverage and estimate QA", () => {
  it("keeps templates, rows, rates, tax rules and QA covered", async () => {
    const coverage = buildGlobalEstimateDataOpsCoverageMatrix();
    expect(coverage.blockers).toEqual([]);
    expect(coverage.templatesCovered).toBe(true);
    expect(coverage.templateRowsCovered).toBe(true);
    expect(coverage.materialRatesHaveSources).toBe(true);
    expect(coverage.laborRatesHaveSources).toBe(true);
    expect(coverage.taxRulesHaveSources).toBe(true);
    expect(coverage.sourceFreshnessReady).toBe(true);

    const qa = await runGlobalEstimateDataOpsEstimateQa();
    expect(qa).toMatchObject({
      qaPassed: true,
      backendResultsUsed: true,
      noPriceWithoutSource: true,
      noTaxWithoutRule: true,
      professionalRowsPresent: true,
    });
  });
});
