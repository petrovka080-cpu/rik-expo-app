import {
  resolvePdfViewerDirectSnapshot,
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

  const localAsset = {
    assetId: "asset-local-1",
    uri: "file:///data/user/0/com.azisbek_dzhantaev.rikexpoapp/cache/document.pdf",
    fileSource: {
      kind: "local-file" as const,
      uri: "file:///data/user/0/com.azisbek_dzhantaev.rikexpoapp/cache/document.pdf",
    },
    sourceKind: "local-file" as const,
    fileName: "document.pdf",
    title: "Document",
    mimeType: "application/pdf" as const,
    documentType: "payment_order" as const,
    originModule: "accountant" as const,
    source: "generated" as const,
    createdAt: "2026-03-30T10:00:00.000Z",
  };

  it("keeps embedded contract on web for remote-url PDFs", () => {
    const resolution = resolvePdfViewerResolution({
      session,
      asset: remoteAsset,
      platform: "web",
    });

    expect(resolution).toMatchObject({
      kind: "resolved-embedded",
      sourceKind: "remote-url",
      renderer: "web-frame",
      canonicalUri: "https://example.com/document.pdf",
    });
  });

  it("routes mobile local PDFs through native handoff instead of embedded webview", () => {
    const resolution = resolvePdfViewerResolution({
      session,
      asset: localAsset,
      platform: "android",
    });

    expect(resolution).toMatchObject({
      kind: "resolved-native-handoff",
      sourceKind: "local-file",
      renderer: "native-handoff",
      canonicalUri: localAsset.uri,
    });
  });

  it("routes mobile remote PDFs through native handoff instead of embedded webview", () => {
    const resolution = resolvePdfViewerResolution({
      session,
      asset: remoteAsset,
      platform: "android",
    });

    expect(resolution).toMatchObject({
      kind: "resolved-native-handoff",
      sourceKind: "remote-url",
      renderer: "native-handoff",
      canonicalUri: remoteAsset.uri,
    });
  });

  it("treats remote signed PDF URLs with query params as native handoff PDFs on mobile", () => {
    const queriedRemoteAsset = {
      ...remoteAsset,
      uri: "https://example.com/document.pdf?token=signed-proof",
      fileSource: {
        kind: "remote-url" as const,
        uri: "https://example.com/document.pdf?token=signed-proof",
      },
    };

    const resolution = resolvePdfViewerResolution({
      session,
      asset: queriedRemoteAsset,
      platform: "android",
    });

    expect(resolution).toMatchObject({
      kind: "resolved-native-handoff",
      sourceKind: "remote-url",
      renderer: "native-handoff",
      canonicalUri: queriedRemoteAsset.uri,
    });
  });

  it("keeps viewer state loading for a valid mobile PDF handoff session", () => {
    expect(resolvePdfViewerState(session, localAsset, "android")).toBe("loading");
  });

  it("builds a direct viewer snapshot for guarded runtime smoke and deep-link recovery", () => {
    const snapshot = resolvePdfViewerDirectSnapshot({
      uri: "https://example.com/runtime-proof.pdf",
      title: "Runtime Proof",
      fileName: "runtime-proof.pdf",
      documentType: "attachment_pdf",
      originModule: "reports",
      source: "generated",
    });

    expect(snapshot?.session.status).toBe("ready");
    expect(snapshot?.asset).toMatchObject({
      uri: "https://example.com/runtime-proof.pdf",
      sourceKind: "remote-url",
      fileName: "runtime-proof.pdf",
      title: "Runtime Proof",
      documentType: "attachment_pdf",
      originModule: "reports",
    });
  });
});
