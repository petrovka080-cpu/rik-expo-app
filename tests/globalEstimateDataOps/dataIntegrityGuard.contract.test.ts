import { buildGlobalEstimateReferenceDataIntegrityReport } from "../../src/lib/ai/globalEstimate";

describe("Global Estimate Data Ops data integrity guard contract", () => {
  it("rejects active reference data that cannot support sourced estimates", () => {
    const report = buildGlobalEstimateReferenceDataIntegrityReport();

    expect(report.passed).toBe(true);
    expect(report.blockers).toEqual([]);
  });
});
