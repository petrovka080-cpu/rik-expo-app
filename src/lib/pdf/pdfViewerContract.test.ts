import {
  resolvePdfViewerResolution,
  resolvePdfViewerState,
} from "./pdfViewerContract";

describe("pdfViewerContract", () => {
  const session = {
    sessionId: "session-1",
    assetId: "asset-1",
    status: "ready" as const,
    createdAt: "2026-03-30T10:00:00.000Z",
  };

  const remoteAsset = {
    assetId: "asset-1",
    uri: "https://example.com/document.pdf",
    fileSource: {
      kind: "remote-url" as const,
      uri: "https://example.com/document.pdf",
    },
    sourceKind: "remote-url" as const,
    fileName: "document.pdf",
    title: "Document",
    mimeType: "application/pdf" as const,
    documentType: "director_report" as const,
    originModule: "director" as const,
    source: "generated" as const,
    createdAt: "2026-03-30T10:00:00.000Z",
  };

  it("Viewer opens remote-url through the embedded contract", () => {
    const resolution = resolvePdfViewerResolution({
      session,
      asset: remoteAsset,
      platform: "android",
    });

    expect(resolution).toMatchObject({
      kind: "resolved-embedded",
      sourceKind: "remote-url",
      renderer: "native-webview",
      canonicalUri: "https://example.com/document.pdf",
    });
  });

  it("keeps viewer state loading for a valid remote PDF session", () => {
    expect(resolvePdfViewerState(session, remoteAsset, "android")).toBe("loading");
  });
});
