import { readFileSync } from "fs";
import { join } from "path";

import type { DocumentAsset } from "../documents/pdfDocumentSessions";
import { createPdfSource } from "../pdfFileContract";
import {
  resolvePdfViewerNativeErrorEventPlan,
  resolvePdfViewerNativeHttpErrorEventPlan,
  resolvePdfViewerNativeLoadEndEventPlan,
  resolvePdfViewerNativeLoadStartEventPlan,
  resolvePdfViewerNativeRenderProcessGoneEventPlan,
  resolvePdfViewerWebIframeErrorEventPlan,
  resolvePdfViewerWebIframeLoadEventPlan,
  shouldCommitPdfViewerRenderEvent,
} from "./pdfViewerRenderEventGuard";

const asset: DocumentAsset = {
  assetId: "asset-1",
  createdAt: "2026-04-19T00:00:00.000Z",
  documentType: "director_report",
  entityId: "object-1",
  fileSource: createPdfSource("https://example.com/director-report.pdf"),
  fileName: "director-report.pdf",
  mimeType: "application/pdf",
  originModule: "director",
  sizeBytes: 128,
  source: "generated",
  sourceKind: "remote-url",
  title: "Director Report",
  uri: "https://example.com/director-report.pdf",
};

const source = {
  sourceKind: "remote-url" as const,
  renderer: "native-webview" as const,
};

const commitPlan = { action: "commit_render_event" as const };
const stalePlan = {
  action: "skip_render_event" as const,
  reason: "stale_render_key" as const,
};

describe("pdfViewerRenderEventGuard", () => {
  it("allows events from the active render instance", () => {
    expect(
      shouldCommitPdfViewerRenderEvent({
        activeRenderInstanceKey: "pdf-render:web:session:asset:0",
        eventRenderInstanceKey: "pdf-render:web:session:asset:0",
      }),
    ).toBe(true);
  });

  it("ignores stale events from a previous render instance", () => {
    expect(
      shouldCommitPdfViewerRenderEvent({
        activeRenderInstanceKey: "pdf-render:web:session:asset:1",
        eventRenderInstanceKey: "pdf-render:web:session:asset:0",
      }),
    ).toBe(false);
  });

  it("does not commit when either side is missing", () => {
    expect(
      shouldCommitPdfViewerRenderEvent({
        activeRenderInstanceKey: "",
        eventRenderInstanceKey: "pdf-render:web:session:asset:0",
      }),
    ).toBe(false);
    expect(
      shouldCommitPdfViewerRenderEvent({
        activeRenderInstanceKey: "pdf-render:web:session:asset:0",
        eventRenderInstanceKey: "",
      }),
    ).toBe(false);
  });
});

describe("pdfViewerRenderEventGuard command planning", () => {
  it("plans web iframe ready and error commits without side effects", () => {
    expect(
      resolvePdfViewerWebIframeLoadEventPlan({
        renderEventPlan: commitPlan,
        renderFailed: false,
        sessionId: "session-1",
        asset,
        renderUri: "https://example.com/embed.pdf",
      }),
    ).toEqual({
      action: "commit_ready",
      console: {
        level: "info",
        label: "[pdf-viewer] web_iframe_load",
        payload: {
          sessionId: "session-1",
          documentType: "director_report",
          originModule: "director",
          uri: "https://example.com/embed.pdf",
        },
      },
    });

    expect(
      resolvePdfViewerWebIframeErrorEventPlan({
        renderEventPlan: commitPlan,
        sessionId: "session-1",
        asset,
        renderUri: "https://example.com/embed.pdf",
      }),
    ).toMatchObject({
      action: "commit_error",
      message: "Web PDF frame failed to load.",
      console: {
        level: "error",
        label: "[pdf-viewer] web_iframe_error",
      },
    });
  });

  it("keeps stale and failed render events suppressed before terminal work", () => {
    expect(
      resolvePdfViewerWebIframeLoadEventPlan({
        renderEventPlan: stalePlan,
        renderFailed: false,
        sessionId: "session-1",
        asset,
        renderUri: asset.uri,
      }),
    ).toEqual(stalePlan);

    expect(
      resolvePdfViewerNativeLoadEndEventPlan({
        renderEventPlan: commitPlan,
        renderFailed: true,
        sessionId: "session-1",
        asset,
        source,
      }),
    ).toEqual({
      action: "skip_render_event",
      reason: "render_failed",
    });
  });

  it("plans native load start breadcrumbs in the legacy order", () => {
    expect(
      resolvePdfViewerNativeLoadStartEventPlan({ asset, source }).breadcrumbs.map(
        (command) => command.marker,
      ),
    ).toEqual(["native_open_start", "native_webview_load_start"]);
  });

  it("plans native load end ready with success breadcrumbs", () => {
    expect(
      resolvePdfViewerNativeLoadEndEventPlan({
        renderEventPlan: commitPlan,
        renderFailed: false,
        sessionId: "session-1",
        asset,
        source,
      }),
    ).toEqual({
      action: "commit_ready",
      console: {
        level: "info",
        label: "[pdf-viewer] native_webview_load_end",
        payload: {
          sessionId: "session-1",
          documentType: "director_report",
          originModule: "director",
          uri: asset.uri,
        },
      },
      breadcrumbs: [
        {
          marker: "native_webview_load_end",
          payload: {
            uri: asset.uri,
            uriKind: "https",
            sourceKind: "remote-url",
            fileSizeBytes: 128,
            fileExists: true,
            previewPath: "native-webview",
          },
        },
        {
          marker: "native_open_success",
          payload: {
            uri: asset.uri,
            uriKind: "https",
            sourceKind: "remote-url",
            fileSizeBytes: 128,
            fileExists: true,
            previewPath: "native-webview",
            terminalState: "success",
            extra: {
              handoffType: "native_webview",
            },
          },
        },
      ],
    });
  });

  it("plans native error and preserves the viewer error message contract", () => {
    expect(
      resolvePdfViewerNativeErrorEventPlan({
        renderEventPlan: commitPlan,
        sessionId: "session-1",
        asset,
        source,
        description: "failed",
      }),
    ).toMatchObject({
      action: "commit_error",
      message: "failed",
      console: {
        level: "error",
        label: "[pdf-viewer] native_webview_error",
        payload: {
          error: "failed",
        },
      },
      breadcrumbs: [
        { marker: "native_webview_error" },
        { marker: "native_open_error" },
      ],
    });

    expect(
      resolvePdfViewerNativeErrorEventPlan({
        renderEventPlan: commitPlan,
        sessionId: "session-1",
        asset,
        source,
      }),
    ).toMatchObject({
      action: "commit_error",
      message: "Native PDF viewer failed to load.",
    });
  });

  it("plans native HTTP errors with status, description, and fallback messages", () => {
    expect(
      resolvePdfViewerNativeHttpErrorEventPlan({
        renderEventPlan: commitPlan,
        sessionId: "session-1",
        asset,
        source,
        statusCode: 500,
        description: "server exploded",
      }),
    ).toMatchObject({
      action: "commit_error",
      message: "PDF request failed (500).",
      console: {
        payload: {
          statusCode: 500,
          error: "PDF request failed (500).",
        },
      },
      breadcrumbs: [
        {
          marker: "native_webview_http_error",
          payload: {
            errorMessage: "PDF request failed (500).",
            extra: { statusCode: 500 },
          },
        },
        {
          marker: "native_open_error",
          payload: {
            errorMessage: "PDF request failed (500).",
            terminalState: "error",
            extra: {
              handoffType: "native_webview",
              statusCode: 500,
            },
          },
        },
      ],
    });

    expect(
      resolvePdfViewerNativeHttpErrorEventPlan({
        renderEventPlan: commitPlan,
        sessionId: "session-1",
        asset,
        source,
        description: "network",
      }),
    ).toMatchObject({
      action: "commit_error",
      message: "network",
      console: {
        payload: {
          statusCode: null,
          error: "network",
        },
      },
    });

    expect(
      resolvePdfViewerNativeHttpErrorEventPlan({
        renderEventPlan: commitPlan,
        sessionId: "session-1",
        asset,
        source,
      }),
    ).toMatchObject({
      action: "commit_error",
      message: "PDF request failed.",
    });
  });

  it("plans native renderer process termination as a terminal render error", () => {
    expect(
      resolvePdfViewerNativeRenderProcessGoneEventPlan({
        renderEventPlan: commitPlan,
        sessionId: "session-1",
        asset,
        source,
        didCrash: true,
      }),
    ).toMatchObject({
      action: "commit_error",
      message: "Native PDF renderer process crashed.",
      console: {
        level: "error",
        label: "[pdf-viewer] native_webview_process_gone",
        payload: {
          didCrash: true,
          error: "Native PDF renderer process crashed.",
        },
      },
      breadcrumbs: [
        {
          marker: "native_webview_process_gone",
          payload: {
            errorMessage: "Native PDF renderer process crashed.",
            extra: { didCrash: true },
          },
        },
        {
          marker: "native_open_error",
          payload: {
            errorMessage: "Native PDF renderer process crashed.",
            terminalState: "error",
            extra: {
              handoffType: "native_webview",
              didCrash: true,
            },
          },
        },
      ],
    });

    expect(
      resolvePdfViewerNativeRenderProcessGoneEventPlan({
        renderEventPlan: stalePlan,
        sessionId: "session-1",
        asset,
        source,
      }),
    ).toEqual(stalePlan);
  });

  it("stays pure and does not import runtime side-effect APIs", () => {
    const sourceText = readFileSync(
      join(__dirname, "pdfViewerRenderEventGuard.ts"),
      "utf8",
    );

    expect(sourceText).not.toContain("console.");
    expect(sourceText).not.toContain("recordViewerBreadcrumb");
    expect(sourceText).not.toContain("markReady");
    expect(sourceText).not.toContain("markError");
    expect(sourceText).not.toContain("setState");
    expect(sourceText).not.toContain("router");
    expect(sourceText).not.toContain("openPdfPreview");
    expect(sourceText).not.toContain("pdfViewer.helpers");
  });
});
