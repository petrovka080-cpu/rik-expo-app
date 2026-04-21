import type { DocumentAsset } from "../../src/lib/documents/pdfDocumentSessions";
import type { PdfViewerResolution } from "../../src/lib/pdf/pdfViewerContract";
import {
  resolvePdfViewerHandoffPlan,
  resolvePdfViewerManualHandoffPlan,
} from "../../src/lib/pdf/pdfViewer.handoffPlan";

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
};

const localAsset: DocumentAsset = {
  ...remoteAsset,
  assetId: "asset-2",
  uri: "file:///cache/report.pdf",
  fileSource: {
    kind: "local-file",
    uri: "file:///cache/report.pdf",
  },
  sourceKind: "local-file",
};

describe("pdfViewer.handoffPlan", () => {
  it("keeps missing session on the empty path", () => {
    expect(
      resolvePdfViewerHandoffPlan({
        resolution: { kind: "missing-session" },
        platform: "web",
      }),
    ).toEqual({
      action: "show_empty",
    });
  });

  it("keeps session error on the viewer error path", () => {
    expect(
      resolvePdfViewerHandoffPlan({
        resolution: {
          kind: "session-error",
          errorMessage: "Session expired",
        },
        platform: "web",
      }),
    ).toEqual({
      action: "show_error",
      reason: "session_error",
      errorMessage: "Session expired",
    });
  });

  it("plans Android native handoff without executing side effects", () => {
    const resolution: PdfViewerResolution = {
      kind: "resolved-native-handoff",
      asset: remoteAsset,
      scheme: "https",
      sourceKind: "remote-url",
      renderer: "native-handoff",
      canonicalUri: remoteAsset.uri,
    };

    expect(
      resolvePdfViewerHandoffPlan({
        resolution,
        platform: "android",
      }),
    ).toEqual({
      action: "start_native_handoff",
      asset: remoteAsset,
      trigger: "primary",
    });
  });

  it("plans the web remote iframe branch with the original render uri", () => {
    const resolution: PdfViewerResolution = {
      kind: "resolved-embedded",
      asset: remoteAsset,
      source: { uri: remoteAsset.uri },
      scheme: "https",
      sourceKind: "remote-url",
      renderer: "web-frame",
      canonicalUri: remoteAsset.uri,
    };

    expect(
      resolvePdfViewerHandoffPlan({
        resolution,
        platform: "web",
      }),
    ).toEqual({
      action: "show_web_remote_iframe",
      asset: remoteAsset,
      renderUri: remoteAsset.uri,
      sourceKind: "remote-url",
    });
  });

  it("plans iOS embedded rendering with validation for local pdf previews", () => {
    const resolution: PdfViewerResolution = {
      kind: "resolved-embedded",
      asset: localAsset,
      source: { uri: localAsset.uri },
      scheme: "file",
      sourceKind: "local-file",
      renderer: "native-webview",
      canonicalUri: localAsset.uri,
    };

    expect(
      resolvePdfViewerHandoffPlan({
        resolution,
        platform: "ios",
      }),
    ).toEqual({
      action: "show_embedded_render",
      asset: localAsset,
      renderUri: null,
      sourceKind: "local-file",
      renderer: "native-webview",
      shouldValidateEmbeddedPreview: true,
    });
  });

  it("reopens native handoff only when the resolved source is still a native handoff", () => {
    expect(
      resolvePdfViewerManualHandoffPlan({
        resolution: {
          kind: "resolved-native-handoff",
          asset: remoteAsset,
          scheme: "https",
          sourceKind: "remote-url",
          renderer: "native-handoff",
          canonicalUri: remoteAsset.uri,
        },
      }),
    ).toEqual({
      action: "reopen_native_handoff",
      asset: remoteAsset,
      trigger: "manual",
    });

    expect(
      resolvePdfViewerManualHandoffPlan({
        resolution: {
          kind: "resolved-embedded",
          asset: remoteAsset,
          source: { uri: remoteAsset.uri },
          scheme: "https",
          sourceKind: "remote-url",
          renderer: "web-frame",
          canonicalUri: remoteAsset.uri,
        },
      }),
    ).toEqual({
      action: "blocked",
      reason: "not_in_native_handoff",
    });
  });
});
