import { buildGlobalEstimateDataOpsCoverageMatrix } from "../../src/lib/ai/globalEstimate";

describe("Global Estimate Data Ops template admin contract", () => {
  it("keeps live estimate templates covered by rows before admin data can be green", () => {
    const coverage = buildGlobalEstimateDataOpsCoverageMatrix();

    expect(coverage.templatesCovered).toBe(true);
    expect(coverage.templateRowsCovered).toBe(true);
    expect(coverage.blockers).not.toEqual(
      expect.arrayContaining([expect.stringContaining("TEMPLATE_ROWS_MISSING")]),
    );
  });
});
