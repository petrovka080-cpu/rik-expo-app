import type {
  DocumentAsset,
  DocumentSession,
} from "../../src/lib/documents/pdfDocumentSessions";
import type { PdfViewerResolution } from "../../src/lib/pdf/pdfViewerContract";
import {
  resolvePdfViewerChromeModel,
  resolvePdfViewerContentModel,
  resolvePdfViewerFallbackEligibility,
  resolvePdfViewerReadinessModel,
  resolvePdfViewerTerminalState,
} from "../../src/lib/pdf/pdfViewer.readiness";

const readySession: DocumentSession = {
  sessionId: "session-1",
  assetId: "asset-1",
  status: "ready",
  createdAt: "2026-04-20T10:00:00.000Z",
};

const remoteAsset: DocumentAsset = {
  assetId: "asset-1",
  uri: "https://example.com/report.pdf",
  fileSource: {
    kind: "remote-url",
    uri: "https://example.com/report.pdf",
  },
  sourceKind: "remote-url",
  fileName: "report.pdf",
  title: "Report",
  mimeType: "application/pdf",
  documentType: "director_report",
  originModule: "director",
  source: "generated",
  createdAt: "2026-04-20T10:00:00.000Z",
  sizeBytes: 128,
};

const localAsset: DocumentAsset = {
  ...remoteAsset,
  assetId: "asset-local-1",
  uri: "file:///cache/report.pdf",
  fileSource: {
    kind: "local-file",
    uri: "file:///cache/report.pdf",
  },
  sourceKind: "local-file",
};

describe("pdfViewer.readiness", () => {
  it("derives the same loading bootstrap model for a ready web asset", () => {
    const model = resolvePdfViewerReadinessModel({
      session: readySession,
      asset: remoteAsset,
      platform: "web",
    });

    expect(model.initialState).toBe("loading");
    expect(model.previewPath).toBe("web-frame");
    expect(model.resolvedSource).toMatchObject({
      kind: "resolved-embedded",
      renderer: "web-frame",
      sourceKind: "remote-url",
    });
    expect(model.bootstrapPlan).toMatchObject({
      action: "show_web_remote_iframe",
    });
  });

  it("keeps native handoff eligibility for mobile local pdf reuse", () => {
    const resolvedSource: PdfViewerResolution = {
      kind: "resolved-native-handoff",
      asset: localAsset,
      scheme: "file",
      sourceKind: "local-file",
      renderer: "native-handoff",
      canonicalUri: localAsset.uri,
    };

    expect(
      resolvePdfViewerFallbackEligibility({
        asset: localAsset,
        resolvedSource,
      }),
    ).toEqual({
      canRetry: true,
      canOpenExternally: true,
      canShareFromNativeHandoff: true,
    });
  });

  it("classifies terminal states deterministically", () => {
    expect(resolvePdfViewerTerminalState({ state: "ready" })).toBe("success");
    expect(resolvePdfViewerTerminalState({ state: "error" })).toBe("error");
    expect(resolvePdfViewerTerminalState({ state: "loading" })).toBeNull();
  });

  it("maps empty and error content states without changing viewer semantics", () => {
    const embeddedRemote: PdfViewerResolution = {
      kind: "resolved-embedded",
      asset: remoteAsset,
      source: { uri: remoteAsset.uri },
      scheme: "https",
      sourceKind: "remote-url",
      renderer: "web-frame",
      canonicalUri: remoteAsset.uri,
    };

    expect(
      resolvePdfViewerContentModel({
        state: "empty",
        errorText: "",
        asset: null,
        resolvedSource: { kind: "missing-session" },
        isReadyToRender: false,
        hasRenderableSource: false,
      }),
    ).toEqual({
      kind: "empty",
      title: "Document not found",
      subtitle: "Viewer session was not found or has expired.",
    });

    expect(
      resolvePdfViewerContentModel({
        state: "error",
        errorText: "Preview failed to load.",
        asset: remoteAsset,
        resolvedSource: embeddedRemote,
        isReadyToRender: false,
        hasRenderableSource: false,
      }),
    ).toEqual({
      kind: "error",
      title: "Unable to open document",
      subtitle: "Preview failed to load.",
      allowOpenExternal: true,
      allowRetry: true,
    });
  });

  it("maps ready embedded-web rendering without a loading overlay", () => {
    const embeddedRemote: PdfViewerResolution = {
      kind: "resolved-embedded",
      asset: remoteAsset,
      source: { uri: remoteAsset.uri },
      scheme: "https",
      sourceKind: "remote-url",
      renderer: "web-frame",
      canonicalUri: remoteAsset.uri,
    };

    expect(
      resolvePdfViewerContentModel({
        state: "ready",
        errorText: "",
        asset: remoteAsset,
        resolvedSource: embeddedRemote,
        isReadyToRender: true,
        hasRenderableSource: true,
      }),
    ).toEqual({
      kind: "embedded-web",
      showLoadingOverlay: false,
    });
  });

  it("maps missing renderable sources back to the missing-asset state", () => {
    const embeddedRemote: PdfViewerResolution = {
      kind: "resolved-embedded",
      asset: remoteAsset,
      source: { uri: remoteAsset.uri },
      scheme: "https",
      sourceKind: "remote-url",
      renderer: "web-frame",
      canonicalUri: remoteAsset.uri,
    };

    expect(
      resolvePdfViewerContentModel({
        state: "ready",
        errorText: "",
        asset: remoteAsset,
        resolvedSource: embeddedRemote,
        isReadyToRender: true,
        hasRenderableSource: false,
      }),
    ).toEqual({
      kind: "missing-asset",
      title: "Document not found",
      subtitle: "Missing document asset.",
    });
  });

  it("derives chrome visibility and page indicator from the resolved viewer state", () => {
    const embeddedRemote: PdfViewerResolution = {
      kind: "resolved-embedded",
      asset: remoteAsset,
      source: { uri: remoteAsset.uri },
      scheme: "https",
      sourceKind: "remote-url",
      renderer: "web-frame",
      canonicalUri: remoteAsset.uri,
    };

    expect(
      resolvePdfViewerChromeModel({
        platform: "ios",
        width: 390,
        topInset: 24,
        chromeVisible: false,
        state: "ready",
        asset: remoteAsset,
        resolvedSource: embeddedRemote,
      }),
    ).toEqual({
      showChrome: false,
      headerHeight: 74,
      pageIndicatorText: "1 / 1",
      showPageIndicator: true,
    });
  });
});
