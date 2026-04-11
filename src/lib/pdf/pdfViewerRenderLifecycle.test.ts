import { createPdfViewerRenderInstanceKey } from "./pdfViewerRenderLifecycle";

describe("pdfViewerRenderLifecycle", () => {
  it("creates a stable render instance key for the same PDF render attempt", () => {
    const input = {
      platform: "ios",
      sessionId: "session-1",
      assetId: "asset-1",
      uri: "https://example.com/report.pdf?token=secret",
      renderUri: "https://example.com/report.pdf?token=secret#page=1",
      renderer: "native-webview",
      loadAttempt: 0,
    };

    expect(createPdfViewerRenderInstanceKey(input)).toBe(
      createPdfViewerRenderInstanceKey(input),
    );
  });

  it("changes the render key when retrying the same PDF", () => {
    const base = {
      platform: "web",
      sessionId: "session-1",
      assetId: "asset-1",
      uri: "https://example.com/report.pdf",
      renderUri: "https://example.com/report.pdf",
      renderer: "web-frame",
    };

    expect(
      createPdfViewerRenderInstanceKey({ ...base, loadAttempt: 0 }),
    ).not.toBe(createPdfViewerRenderInstanceKey({ ...base, loadAttempt: 1 }));
  });

  it("hashes source URIs instead of exposing raw signed URL material", () => {
    const key = createPdfViewerRenderInstanceKey({
      platform: "web",
      sessionId: "session-1",
      assetId: "asset-1",
      uri: "https://example.com/report.pdf?token=super-secret",
      renderUri: "https://example.com/report.pdf?token=super-secret#page=1",
      renderer: "web-frame",
      loadAttempt: 0,
    });

    expect(key).toContain("pdf-render:web:session-1:asset-1:web-frame:0:");
    expect(key).not.toContain("example.com");
    expect(key).not.toContain("super-secret");
  });
});
