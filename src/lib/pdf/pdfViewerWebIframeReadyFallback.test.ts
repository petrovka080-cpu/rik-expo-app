import {
  PDF_VIEWER_WEB_IFRAME_READY_FALLBACK_MS,
  resolvePdfViewerWebIframeReadyFallbackPlan,
} from "./pdfViewerWebIframeReadyFallback";

describe("pdfViewerWebIframeReadyFallback", () => {
  it("keeps the remote web fallback inside the repeat-open budget", () => {
    expect(PDF_VIEWER_WEB_IFRAME_READY_FALLBACK_MS).toBeGreaterThan(0);
    expect(PDF_VIEWER_WEB_IFRAME_READY_FALLBACK_MS).toBeLessThanOrEqual(200);
  });

  it("schedules a deterministic ready fallback only for web remote PDF iframes", () => {
    expect(
      resolvePdfViewerWebIframeReadyFallbackPlan({
        platform: "web",
        sourceKind: "remote-url",
        renderUri: "https://example.com/document.pdf",
      }),
    ).toEqual({
      action: "schedule_ready_fallback",
      delayMs: PDF_VIEWER_WEB_IFRAME_READY_FALLBACK_MS,
      reason: "web_remote_pdf_iframe_load_unreliable",
    });
  });

  it("does not schedule fallback for native or non-remote viewer branches", () => {
    expect(
      resolvePdfViewerWebIframeReadyFallbackPlan({
        platform: "android",
        sourceKind: "remote-url",
        renderUri: "https://example.com/document.pdf",
      }),
    ).toEqual({
      action: "skip_ready_fallback",
      reason: "non_web_platform",
    });
    expect(
      resolvePdfViewerWebIframeReadyFallbackPlan({
        platform: "web",
        sourceKind: "local-file",
        renderUri: "file:///cache/document.pdf",
      }),
    ).toEqual({
      action: "skip_ready_fallback",
      reason: "non_remote_source",
    });
    expect(
      resolvePdfViewerWebIframeReadyFallbackPlan({
        platform: "web",
        sourceKind: "remote-url",
        renderUri: " ",
      }),
    ).toEqual({
      action: "skip_ready_fallback",
      reason: "missing_render_uri",
    });
  });
});
