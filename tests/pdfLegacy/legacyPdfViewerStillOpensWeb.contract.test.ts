import { readJsonArtifact } from "../aiEstimatePdf/aiEstimatePdfSafeIntegrationTestHelpers";

describe("legacy PDF web viewer regression", () => {
  it("has Playwright proof that the legacy PDF still opens in /pdf-viewer", () => {
    const artifact = readJsonArtifact<{ legacy_pdf_viewer_web_passed: boolean }>(
      "S_AI_ESTIMATE_PDF_SAFE_INTEGRATION_web_screenshots.json",
    );
    expect(artifact.legacy_pdf_viewer_web_passed).toBe(true);
  });
});
