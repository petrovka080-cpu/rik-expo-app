import { LIVE_ESTIMATE_CASES, buildCarpetRequestDraftAndPdf, buildLiveEstimate, generateAndValidateLivePdf } from "./liveAiEstimatePdfRealityTestHelpers";

describe("live PDF viewer readable acceptance", () => {
  it("creates readable PDFs for live estimate cases and request draft", () => {
    for (const item of LIVE_ESTIMATE_CASES) {
      const estimate = buildLiveEstimate(item.prompt, item.route === "/chat" ? "/chat" : "/ai");
      const { pdf, validation } = generateAndValidateLivePdf(estimate);
      expect(pdf.openAction.route).toBe("/pdf-viewer");
      expect(validation.valid).toBe(true);
      expect(validation.text).toContain("Таблица сметы");
    }

    const request = buildCarpetRequestDraftAndPdf();
    expect(request.opened.signedUrl).toContain("data:application/pdf;base64,");
    expect(request.validation.valid).toBe(true);
  });
});
