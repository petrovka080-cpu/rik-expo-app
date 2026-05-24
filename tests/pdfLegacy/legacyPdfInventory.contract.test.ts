import { readJsonArtifact } from "../aiEstimatePdf/aiEstimatePdfSafeIntegrationTestHelpers";

describe("legacy PDF inventory", () => {
  it("marks existing PDF routes as protected legacy paths", () => {
    const inventory = readJsonArtifact<{ protected: boolean; legacy_pdf_paths: Array<{ route: string; mustNotChange: boolean }> }>(
      "S_AI_ESTIMATE_PDF_SAFE_INTEGRATION_legacy_pdf_inventory.json",
    );
    expect(inventory.protected).toBe(true);
    expect(inventory.legacy_pdf_paths.some((item) => item.route === "/pdf-viewer" && item.mustNotChange)).toBe(true);
  });
});
