import { runProfessionalEstimatorQualityGate } from "../../scripts/e2e/runProfessionalEstimatorQualityProof";

describe("professional estimator canopy expansion", () => {
  it("expands metal canopy into specific structural rows instead of weak standalone rows", () => {
    const report = runProfessionalEstimatorQualityGate();
    const canopy = report.case_results.find((item) => item.id === "metal_canopy_specific_rows");

    expect(canopy).toBeDefined();
    expect(canopy?.passed).toBe(true);
    expect(canopy?.workKey).toBe("metal_canopy_installation");
    expect(canopy?.rowCount).toBeGreaterThanOrEqual(18);
    expect(canopy?.blockers).toEqual([]);
  });
});
