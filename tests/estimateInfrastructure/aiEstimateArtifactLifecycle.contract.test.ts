import { validateAiEstimateArtifactLifecycle } from "../../src/lib/estimate/artifacts/validateAiEstimateArtifactLifecycle";

describe("AI estimate artifact lifecycle", () => {
  it("binds snapshots, PDF and buyer package to the current revision", () => {
    const result = validateAiEstimateArtifactLifecycle();

    expect(result.ok).toBe(true);
    expect(result.snapshotBoundToRevisionId).toBe(true);
    expect(result.pdfRowsEqualSnapshotRows).toBe(true);
    expect(result.buyerPackageIsProcurementSubset).toBe(true);
    expect(result.pdfInvalidatedAfterParameterChange).toBe(true);
    expect(result.buyerPackageInvalidatedAfterParameterChange).toBe(true);
  }, 300_000);
});
