const mockOpenHtmlAsPdfUniversal = jest.fn();
const mockNormalizeRuTextForHtml = jest.fn();

jest.mock("../api/pdf", () => ({
  openHtmlAsPdfUniversal: (...args: unknown[]) => mockOpenHtmlAsPdfUniversal(...args),
}));

jest.mock("../text/encoding", () => ({
  normalizeRuTextForHtml: (...args: unknown[]) => mockNormalizeRuTextForHtml(...args),
}));

import { renderPdfHtmlToSource } from "./pdf.runner";
import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../observability/platformObservability";

describe("pdf.runner lifecycle", () => {
  beforeEach(() => {
    mockOpenHtmlAsPdfUniversal.mockReset();
    mockNormalizeRuTextForHtml.mockReset();
    mockNormalizeRuTextForHtml.mockImplementation((html: string) => html);
    resetPlatformObservabilityEvents();
  });

  it("renders PDF HTML into a typed source", async () => {
    mockOpenHtmlAsPdfUniversal.mockResolvedValueOnce("file:///tmp/document.pdf");

    const result = await renderPdfHtmlToSource({
      html: "<html><body>ok</body></html>",
      documentType: "payment_order",
      source: "payment_order_pdf",
    });

    expect(result).toEqual({
      kind: "local-file",
      uri: "file:///tmp/document.pdf",
    });
    expect(
      getPlatformObservabilityEvents().some(
        (event) => event.event === "pdf_render_execute" && event.result === "success",
      ),
    ).toBe(true);
  });

  it("Render fail is visible during HTML PDF render", async () => {
    mockOpenHtmlAsPdfUniversal.mockRejectedValueOnce(new Error("render failed"));

    await expect(
      renderPdfHtmlToSource({
        html: "<html><body>broken</body></html>",
        documentType: "director_report",
        source: "director_finance",
      }),
    ).rejects.toMatchObject({
      name: "PdfLifecycleError",
      stage: "render",
      failureType: "render_fail",
    });

    expect(
      getPlatformObservabilityEvents().some(
        (event) =>
          event.event === "pdf_render_execute"
          && event.result === "error"
          && event.extra?.pdfFailureType === "render_fail",
      ),
    ).toBe(true);
  });
});
