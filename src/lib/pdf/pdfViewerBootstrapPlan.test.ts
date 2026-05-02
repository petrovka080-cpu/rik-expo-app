import { readFileSync } from "fs";
import { join } from "path";

import type { DocumentAsset } from "../documents/pdfDocumentSessions";
import {
  resolvePdfViewerBootstrapPlan,
} from "./pdfViewerBootstrapPlan";
import type { PdfViewerResolution } from "./pdfViewerContract";

const baseAsset: DocumentAsset = {
  assetId: "asset-1",
  uri: "https://example.com/report.pdf",
  fileSource: {
    kind: "remote-url",
    uri: "https://example.com/report.pdf",
  },
  sourceKind: "remote-url",
  fileName: "report.pdf",
  title: "Report PDF",
  mimeType: "application/pdf",
  documentType: "director_report",
  originModule: "director",
  source: "generated",
  createdAt: "2026-04-18T00:00:00.000Z",
};

describe("pdfViewerBootstrapPlan", () => {
  it("keeps missing session as an empty viewer command", () => {
    expect(
      resolvePdfViewerBootstrapPlan({
        resolution: { kind: "missing-session" },
        platform: "web",
      }),
    ).toEqual({ action: "show_empty" });
  });

  it("keeps session error as an inline error command", () => {
    expect(
      resolvePdfViewerBootstrapPlan({
        resolution: {
          kind: "session-error",
          errorMessage: "Session expired",
        },
        platform: "web",
      }),
    ).toEqual({
      action: "show_session_error",
      errorMessage: "Session expired",
    });
  });

  it("keeps missing asset as the existing missing document error", () => {
    expect(
      resolvePdfViewerBootstrapPlan({
        resolution: { kind: "missing-asset" },
        platform: "web",
      }),
    ).toEqual({
      action: "show_missing_asset",
      errorMessage: "Missing document asset.",
    });
  });

  it("keeps preparing assets on the loading path instead of surfacing an error", () => {
    expect(
      resolvePdfViewerBootstrapPlan({
        resolution: { kind: "preparing-asset" },
        platform: "ios",
      }),
    ).toEqual({
      action: "show_loading",
    });
  });

  it("keeps unsupported mobile sources on the resolution failure path", () => {
    expect(
      resolvePdfViewerBootstrapPlan({
        resolution: {
          kind: "unsupported-mobile-source",
          errorMessage: "Unsupported source",
        },
        platform: "android",
      }),
    ).toEqual({
      action: "fail_resolution",
      errorMessage: "Unsupported source",
    });
  });

  it("plans native handoff without executing native preview", () => {
    const resolution: PdfViewerResolution = {
      kind: "resolved-native-handoff",
      asset: baseAsset,
      scheme: "https",
      sourceKind: "remote-url",
      renderer: "native-handoff",
      canonicalUri: baseAsset.uri,
    };

    expect(
      resolvePdfViewerBootstrapPlan({
        resolution,
        platform: "android",
      }),
    ).toEqual({
      action: "start_native_handoff",
      resolution,
    });
  });

  it("plans web remote iframe rendering with the remote URI", () => {
    const resolution: PdfViewerResolution = {
      kind: "resolved-embedded",
      asset: baseAsset,
      source: { uri: baseAsset.uri },
      scheme: "https",
      sourceKind: "remote-url",
      renderer: "web-frame",
      canonicalUri: baseAsset.uri,
    };

    expect(
      resolvePdfViewerBootstrapPlan({
        resolution,
        platform: "web",
      }),
    ).toEqual({
      action: "show_web_remote_iframe",
      resolution,
      webRenderUri: baseAsset.uri,
    });
  });

  it("plans web local embedded rendering without native validation", () => {
    const localAsset: DocumentAsset = {
      ...baseAsset,
      uri: "file:///cache/report.pdf",
      fileSource: {
        kind: "local-file",
        uri: "file:///cache/report.pdf",
      },
      sourceKind: "local-file",
    };
    const resolution: PdfViewerResolution = {
      kind: "resolved-embedded",
      asset: localAsset,
      source: { uri: localAsset.uri },
      scheme: "file",
      sourceKind: "local-file",
      renderer: "web-frame",
      canonicalUri: localAsset.uri,
    };

    expect(
      resolvePdfViewerBootstrapPlan({
        resolution,
        platform: "web",
      }),
    ).toEqual({
      action: "show_embedded_render",
      resolution,
      shouldValidateEmbeddedPreview: false,
      webRenderUri: localAsset.uri,
    });
  });

  it("plans native embedded rendering with validation still required", () => {
    const localAsset: DocumentAsset = {
      ...baseAsset,
      uri: "file:///cache/report.pdf",
      fileSource: {
        kind: "local-file",
        uri: "file:///cache/report.pdf",
      },
      sourceKind: "local-file",
    };
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
      resolvePdfViewerBootstrapPlan({
        resolution,
        platform: "ios",
      }),
    ).toEqual({
      action: "show_embedded_render",
      resolution,
      shouldValidateEmbeddedPreview: true,
      webRenderUri: null,
    });
  });

  it("stays pure and does not import runtime side-effect APIs", () => {
    const source = readFileSync(join(__dirname, "pdfViewerBootstrapPlan.ts"), "utf8");

    expect(source).not.toContain("setState");
    expect(source).not.toContain("openPdfPreview");
    expect(source).not.toContain("validateEmbeddedPreviewResolution");
    expect(source).not.toContain("recordPdfCriticalPathEvent");
    expect(source).not.toContain("markPdfOpenVisible");
    expect(source).not.toContain("Date.now");
  });
});
