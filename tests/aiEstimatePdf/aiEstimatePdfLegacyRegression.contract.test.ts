import { buildLegacyPdfProof, readJsonArtifact } from "./aiEstimatePdfSafeIntegrationTestHelpers";

describe("AI estimate PDF legacy regression guard", () => {
  it("keeps legacy PDF regression green while adding AI PDF", () => {
    const proof = buildLegacyPdfProof();
    const artifact = readJsonArtifact<{ legacyPdfRegressionPassed: boolean }>(
      "S_AI_ESTIMATE_PDF_SAFE_INTEGRATION_legacy_regression.json",
    );
    expect(proof.extraction.valid).toBe(true);
    expect(artifact.legacyPdfRegressionPassed).toBe(true);
  });
});
