import { readJsonArtifact } from "../aiEstimatePdf/aiEstimatePdfSafeIntegrationTestHelpers";

describe("legacy PDF Android viewer regression", () => {
  it("has Android proof that the legacy PDF viewer still opens", () => {
    const artifact = readJsonArtifact<{ legacy_pdf_viewer_android_passed: boolean }>(
      "S_AI_ESTIMATE_PDF_SAFE_INTEGRATION_android_screenshots.json",
    );
    expect(artifact.legacy_pdf_viewer_android_passed).toBe(true);
  });
});
