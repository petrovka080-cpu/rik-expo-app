import type { DocumentAsset } from "../documents/pdfDocumentSessions";
import type { PdfViewerRenderEventTransitionPlan } from "./usePdfViewerOrchestrator";

type PdfViewerRenderAsset = Pick<
  DocumentAsset,
  | "documentType"
  | "fileName"
  | "originModule"
  | "sizeBytes"
  | "sourceKind"
  | "uri"
>;

type PdfViewerRenderSource = {
  sourceKind: DocumentAsset["sourceKind"];
  renderer: "web-frame" | "native-webview";
};

export type PdfViewerRenderConsoleCommand = {
  level: "error" | "info";
  label: string;
  payload: Record<string, unknown>;
};

export type PdfViewerRenderBreadcrumbPayload = {
  uri?: string | null;
  uriKind?: string | null;
  sourceKind?: string | null;
  fileExists?: boolean | null;
  fileSizeBytes?: number | null;
  previewPath?: string | null;
  errorMessage?: string | null;
  terminalState?: "error" | "success" | null;
  extra?: Record<string, unknown>;
};

export type PdfViewerRenderBreadcrumbCommand = {
  marker: string;
  payload: PdfViewerRenderBreadcrumbPayload;
};

export type PdfViewerRenderReadyPlan =
  | { action: "commit_ready"; console?: PdfViewerRenderConsoleCommand; breadcrumbs?: PdfViewerRenderBreadcrumbCommand[] }
  | { action: "skip_render_event"; reason: "stale_render_key" | "render_failed" };

export type PdfViewerRenderErrorPlan =
  | {
      action: "commit_error";
      message: string;
      console: PdfViewerRenderConsoleCommand;
      breadcrumbs?: PdfViewerRenderBreadcrumbCommand[];
    }
  | { action: "skip_render_event"; reason: "stale_render_key" | "render_failed" };

export function shouldCommitPdfViewerRenderEvent(args: {
  activeRenderInstanceKey: string;
  eventRenderInstanceKey: string;
}): boolean {
  const active = String(args.activeRenderInstanceKey || "").trim();
  const event = String(args.eventRenderInstanceKey || "").trim();
  return Boolean(active && event && active === event);
}

const renderEventSkip = (plan: PdfViewerRenderEventTransitionPlan) =>
  plan.action === "commit_render_event" ? null : plan;

const buildAssetConsolePayload = (args: {
  asset: PdfViewerRenderAsset;
  sessionId: string;
  uri: string;
  extra?: Record<string, unknown>;
}) => ({
  sessionId: args.sessionId,
  documentType: args.asset.documentType,
  originModule: args.asset.originModule,
  uri: args.uri,
  ...(args.extra ?? {}),
});

const getRenderUriScheme = (uri?: string | null) => {
  const value = String(uri || "");
  const index = value.indexOf(":");
  return index > 0 ? value.slice(0, index).toLowerCase() : "unknown";
};

const buildNativeBreadcrumbPayload = (args: {
  asset: PdfViewerRenderAsset;
  source: PdfViewerRenderSource;
  errorMessage?: string;
  extra?: Record<string, unknown>;
  terminalState?: "error" | "success";
}) => ({
  uri: args.asset.uri,
  uriKind: getRenderUriScheme(args.asset.uri),
  sourceKind: args.source.sourceKind,
  fileSizeBytes: args.asset.sizeBytes,
  fileExists: typeof args.asset.sizeBytes === "number" ? true : null,
  previewPath: args.source.renderer,
  ...(args.errorMessage ? { errorMessage: args.errorMessage } : {}),
  ...(args.terminalState ? { terminalState: args.terminalState } : {}),
  ...(args.extra ? { extra: args.extra } : {}),
});

export function resolvePdfViewerWebIframeLoadEventPlan(args: {
  renderEventPlan: PdfViewerRenderEventTransitionPlan;
  renderFailed: boolean;
  sessionId: string;
  asset: PdfViewerRenderAsset;
  renderUri: string;
}): PdfViewerRenderReadyPlan {
  const skip = renderEventSkip(args.renderEventPlan);
  if (skip) return skip;
  if (args.renderFailed) {
    return { action: "skip_render_event", reason: "render_failed" };
  }

  return {
    action: "commit_ready",
    console: {
      level: "info",
      label: "[pdf-viewer] web_iframe_load",
      payload: buildAssetConsolePayload({
        asset: args.asset,
        sessionId: args.sessionId,
        uri: args.renderUri,
      }),
    },
  };
}

export function resolvePdfViewerWebIframeErrorEventPlan(args: {
  renderEventPlan: PdfViewerRenderEventTransitionPlan;
  sessionId: string;
  asset: PdfViewerRenderAsset;
  renderUri: string;
}): PdfViewerRenderErrorPlan {
  const skip = renderEventSkip(args.renderEventPlan);
  if (skip) return skip;

  return {
    action: "commit_error",
    message: "Web PDF frame failed to load.",
    console: {
      level: "error",
      label: "[pdf-viewer] web_iframe_error",
      payload: buildAssetConsolePayload({
        asset: args.asset,
        sessionId: args.sessionId,
        uri: args.renderUri,
      }),
    },
  };
}

export function resolvePdfViewerNativeLoadStartEventPlan(args: {
  asset: PdfViewerRenderAsset;
  source: PdfViewerRenderSource;
}): { breadcrumbs: PdfViewerRenderBreadcrumbCommand[] } {
  return {
    breadcrumbs: [
      {
        marker: "native_open_start",
        payload: buildNativeBreadcrumbPayload({
          asset: args.asset,
          source: args.source,
          extra: {
            handoffType: "native_webview",
          },
        }),
      },
      {
        marker: "native_webview_load_start",
        payload: buildNativeBreadcrumbPayload({
          asset: args.asset,
          source: args.source,
        }),
      },
    ],
  };
}

export function resolvePdfViewerNativeLoadEndEventPlan(args: {
  renderEventPlan: PdfViewerRenderEventTransitionPlan;
  renderFailed: boolean;
  sessionId: string;
  asset: PdfViewerRenderAsset;
  source: PdfViewerRenderSource;
}): PdfViewerRenderReadyPlan {
  const skip = renderEventSkip(args.renderEventPlan);
  if (skip) return skip;
  if (args.renderFailed) {
    return { action: "skip_render_event", reason: "render_failed" };
  }

  return {
    action: "commit_ready",
    console: {
      level: "info",
      label: "[pdf-viewer] native_webview_load_end",
      payload: buildAssetConsolePayload({
        asset: args.asset,
        sessionId: args.sessionId,
        uri: args.asset.uri,
      }),
    },
    breadcrumbs: [
      {
        marker: "native_webview_load_end",
        payload: buildNativeBreadcrumbPayload({
          asset: args.asset,
          source: args.source,
        }),
      },
      {
        marker: "native_open_success",
        payload: buildNativeBreadcrumbPayload({
          asset: args.asset,
          source: args.source,
          terminalState: "success",
          extra: {
            handoffType: "native_webview",
          },
        }),
      },
    ],
  };
}

export function resolvePdfViewerNativeErrorEventPlan(args: {
  renderEventPlan: PdfViewerRenderEventTransitionPlan;
  sessionId: string;
  asset: PdfViewerRenderAsset;
  source: PdfViewerRenderSource;
  description?: unknown;
}): PdfViewerRenderErrorPlan {
  const skip = renderEventSkip(args.renderEventPlan);
  if (skip) return skip;

  const message = String(
    args.description || "Native PDF viewer failed to load.",
  ).trim();

  return {
    action: "commit_error",
    message,
    console: {
      level: "error",
      label: "[pdf-viewer] native_webview_error",
      payload: buildAssetConsolePayload({
        asset: args.asset,
        sessionId: args.sessionId,
        uri: args.asset.uri,
        extra: { error: message },
      }),
    },
    breadcrumbs: [
      {
        marker: "native_webview_error",
        payload: buildNativeBreadcrumbPayload({
          asset: args.asset,
          source: args.source,
          errorMessage: message,
        }),
      },
      {
        marker: "native_open_error",
        payload: buildNativeBreadcrumbPayload({
          asset: args.asset,
          source: args.source,
          errorMessage: message,
          terminalState: "error",
          extra: {
            handoffType: "native_webview",
          },
        }),
      },
    ],
  };
}

export function resolvePdfViewerNativeHttpErrorEventPlan(args: {
  renderEventPlan: PdfViewerRenderEventTransitionPlan;
  sessionId: string;
  asset: PdfViewerRenderAsset;
  source: PdfViewerRenderSource;
  description?: unknown;
  statusCode?: unknown;
}): PdfViewerRenderErrorPlan {
  const skip = renderEventSkip(args.renderEventPlan);
  if (skip) return skip;

  const statusCode = Number(args.statusCode);
  const normalizedStatusCode = Number.isFinite(statusCode) ? statusCode : null;
  const description = String(args.description || "").trim();
  const message = statusCode
    ? `PDF request failed (${statusCode}).`
    : description || "PDF request failed.";
  const statusExtra = { statusCode: normalizedStatusCode };

  return {
    action: "commit_error",
    message,
    console: {
      level: "error",
      label: "[pdf-viewer] native_webview_http_error",
      payload: buildAssetConsolePayload({
        asset: args.asset,
        sessionId: args.sessionId,
        uri: args.asset.uri,
        extra: {
          ...statusExtra,
          error: message,
        },
      }),
    },
    breadcrumbs: [
      {
        marker: "native_webview_http_error",
        payload: buildNativeBreadcrumbPayload({
          asset: args.asset,
          source: args.source,
          errorMessage: message,
          extra: statusExtra,
        }),
      },
      {
        marker: "native_open_error",
        payload: buildNativeBreadcrumbPayload({
          asset: args.asset,
          source: args.source,
          errorMessage: message,
          terminalState: "error",
          extra: {
            handoffType: "native_webview",
            ...statusExtra,
          },
        }),
      },
    ],
  };
}

export function resolvePdfViewerNativeRenderProcessGoneEventPlan(args: {
  renderEventPlan: PdfViewerRenderEventTransitionPlan;
  sessionId: string;
  asset: PdfViewerRenderAsset;
  source: PdfViewerRenderSource;
  didCrash?: unknown;
}): PdfViewerRenderErrorPlan {
  const skip = renderEventSkip(args.renderEventPlan);
  if (skip) return skip;

  const didCrash = args.didCrash === true;
  const message = didCrash
    ? "Native PDF renderer process crashed."
    : "Native PDF renderer process was terminated.";
  const processGoneExtra = { didCrash };

  return {
    action: "commit_error",
    message,
    console: {
      level: "error",
      label: "[pdf-viewer] native_webview_process_gone",
      payload: buildAssetConsolePayload({
        asset: args.asset,
        sessionId: args.sessionId,
        uri: args.asset.uri,
        extra: {
          ...processGoneExtra,
          error: message,
        },
      }),
    },
    breadcrumbs: [
      {
        marker: "native_webview_process_gone",
        payload: buildNativeBreadcrumbPayload({
          asset: args.asset,
          source: args.source,
          errorMessage: message,
          extra: processGoneExtra,
        }),
      },
      {
        marker: "native_open_error",
        payload: buildNativeBreadcrumbPayload({
          asset: args.asset,
          source: args.source,
          errorMessage: message,
          terminalState: "error",
          extra: {
            handoffType: "native_webview",
            ...processGoneExtra,
          },
        }),
      },
    ],
  };
}
