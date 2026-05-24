import { buildSafeIntegrationPdf, SELECTED_OPTION } from "./aiEstimatePdfSafeIntegrationTestHelpers";

describe("AI estimate PDF selected path", () => {
  it("uses the isolated Option B renderer adapter", () => {
    const { pdf } = buildSafeIntegrationPdf();
    expect(SELECTED_OPTION).toBe("OPTION_B_ADD_ISOLATED_AI_ESTIMATE_PDF_RENDERER_ADAPTER");
    expect(pdf.rendererPath).toBe("OPTION_B_ISOLATED_AI_ESTIMATE_RENDERER");
  });
});
