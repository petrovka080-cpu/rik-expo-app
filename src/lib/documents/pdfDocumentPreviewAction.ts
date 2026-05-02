import { Platform } from "react-native";

import {
  createDocumentPreviewSession,
  createInstantDocumentPreviewSession,
  createInMemoryDocumentPreviewSession,
  createPreparingDocumentPreviewSession,
  failDocumentSession,
  materializeDocumentPreviewSessionAsset,
} from "./pdfDocumentSessions";
import { openPdfPreview } from "../pdfRunner";
import { beginPdfLifecycleObservation } from "../pdf/pdfLifecycle";
import {
  failPdfOpenVisible,
  recordPdfOpenStage,
} from "../pdf/pdfOpenFlow";
import {
  checkPdfMobilePreviewEligibility,
  recordPdfPreviewOversizeBlocked,
} from "../pdf/pdfMobilePreviewSizeGuard";
import {
  recordPdfActionBoundaryEvent,
  type PdfActionBoundaryRun,
} from "../pdf/pdfActionBoundary";
import {
  createPdfDocumentViewerHref,
  pushPdfDocumentViewerRouteSafely,
} from "./pdfDocumentViewerEntry";
import { redactSensitiveRecord, redactSensitiveText } from "../security/redaction";
import {
  getPdfDocumentActionErrorName,
  getPdfFlowErrorMessage,
  normalizePdfDocumentActionError,
} from "./pdfDocumentActionError";
import {
  canUsePdfDocumentDirectPreviewFallback,
  extractUriScheme,
  hasPdfDocumentPreviewRouter,
} from "./pdfDocumentActionPreconditions";
import { resolvePdfDocumentPreviewModePlan } from "./pdfDocumentActionPlan";
import type {
  PersistCriticalPdfBreadcrumbInput,
  PreviewPdfDocumentOpts,
} from "./pdfDocumentActionTypes";
import type { DocumentDescriptor } from "./pdfDocument";

type PreviewActionDependencies = {
  persistCriticalPdfBreadcrumb: (input: PersistCriticalPdfBreadcrumbInput) => void;
};

const redactedRouteParamsJson = (params: Record<string, unknown>) =>
  JSON.stringify(redactSensitiveRecord(params) ?? {});

export function createPreparingPdfDocumentViewerSession(
  doc: Parameters<typeof createPreparingDocumentPreviewSession>[0],
) {
  return createPreparingDocumentPreviewSession(doc);
}

export function getPdfViewerSessionErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message?: unknown }).message ?? "").trim();
    if (message && message !== "[object Object]") return message;
    const cause =
      (error as { causeValue?: unknown; causeError?: unknown }).causeValue ??
      (error as { causeValue?: unknown; causeError?: unknown }).causeError;
    if (cause && typeof cause === "object" && "message" in cause) {
      const causeMessage = String((cause as { message?: unknown }).message ?? "").trim();
      if (causeMessage) return causeMessage;
    }
  }
  return getPdfFlowErrorMessage(error, fallback);
}

export function failPreparingPdfDocumentViewerSession(
  sessionId: string,
  message: string,
): void {
  failDocumentSession(sessionId, message);
}

export async function materializePreparingPdfDocumentViewerSession(args: {
  sessionId: string;
  doc: DocumentDescriptor;
}) {
  const asset = await materializeDocumentPreviewSessionAsset(args.sessionId, args.doc);
  const sizeEligibility = checkPdfMobilePreviewEligibility({
    platform: Platform.OS,
    sizeBytes: asset.sizeBytes,
    documentType: asset.documentType,
    originModule: asset.originModule,
    fileName: asset.fileName,
  });
  if (!sizeEligibility.eligible) {
    const blocked = sizeEligibility as {
      eligible: false;
      sizeBytes: number;
      limitBytes: number;
    };
    const error = recordPdfPreviewOversizeBlocked({
      sizeBytes: blocked.sizeBytes,
      limitBytes: blocked.limitBytes,
      documentType: asset.documentType,
      originModule: asset.originModule,
      fileName: asset.fileName,
    });
    failDocumentSession(args.sessionId, error.message);
    throw error;
  }
  return asset;
}

function createPreviewBoundaryRecorder(args: {
  boundaryRun?: PdfActionBoundaryRun;
  sourceKind: string;
}) {
  return (
    event: string,
    stage: "viewer_entry" | "visibility" = "viewer_entry",
    result: "success" | "error" = "success",
    error?: unknown,
  ) => {
    if (!args.boundaryRun) return;
    recordPdfActionBoundaryEvent({
      run: args.boundaryRun,
      event,
      stage,
      result,
      sourceKind: args.sourceKind,
      error,
    });
  };
}

async function executeDirectRemoteViewerSessionPath(args: {
  doc: DocumentDescriptor;
  opts?: PreviewPdfDocumentOpts;
  persistCriticalPdfBreadcrumb: (input: PersistCriticalPdfBreadcrumbInput) => void;
  recordBoundary: (
    event: string,
    stage?: "viewer_entry" | "visibility",
    result?: "success" | "error",
    error?: unknown,
  ) => void;
  outputObservation: ReturnType<typeof beginPdfLifecycleObservation>;
  openObservation: ReturnType<typeof beginPdfLifecycleObservation>;
  scheme: string;
}): Promise<void> {
  const { doc, opts, persistCriticalPdfBreadcrumb, recordBoundary, outputObservation, openObservation, scheme } =
    args;
  const breadcrumbScreen = doc.originModule;
  recordPdfOpenStage({
    context: opts?.openFlow,
    stage: "document_prepare_done",
    sourceKind: doc.fileSource.kind,
    extra: {
      previewSourceMode: "direct_remote_viewer_contract",
      uriKind: scheme || doc.fileSource.kind,
      uri: doc.fileSource.uri,
    },
  });
  recordPdfOpenStage({
    context: opts?.openFlow,
    stage: "viewer_or_handoff_start",
    sourceKind: doc.fileSource.kind,
    extra: {
      route: "/pdf-viewer",
      previewSourceMode: "direct_remote_viewer_contract",
      previewPath: "direct_remote_viewer_contract",
      uriKind: scheme || doc.fileSource.kind,
      uri: doc.fileSource.uri,
    },
  });
  persistCriticalPdfBreadcrumb({
    marker: "document_prepare_done",
    screen: breadcrumbScreen,
    documentType: doc.documentType,
    originModule: doc.originModule,
    sourceKind: doc.fileSource.kind,
    uriKind: scheme || doc.fileSource.kind,
    uri: doc.fileSource.uri,
    fileName: doc.fileName,
    entityId: doc.entityId,
    openToken: opts?.openFlow?.openToken,
    previewPath: "direct_remote_viewer_contract",
    extra: {
      route: "/pdf-viewer",
      checkpoint: "mobile_pre_navigation",
    },
  });
  const { session, asset } = createInMemoryDocumentPreviewSession(doc);
  const {
    safeSessionId,
    safeOpenToken,
    href: viewerHref,
  } = createPdfDocumentViewerHref(session.sessionId, opts?.openFlow?.openToken);
  recordPdfOpenStage({
    context: opts?.openFlow,
    stage: "viewer_route_payload_ready",
    sourceKind: doc.fileSource.kind,
    extra: {
      previewSourceMode: "direct_remote_viewer_session_contract",
      payloadMode: "session_id_only",
      sessionId: safeSessionId,
      openToken: safeOpenToken,
    },
  });
  if (__DEV__) console.info("[pdf-document-actions] about_to_navigate_to_viewer", {
    sessionId: safeSessionId,
    documentType: asset.documentType,
    originModule: asset.originModule,
    finalUri: redactSensitiveText(asset.uri),
    finalScheme: extractUriScheme(asset.uri),
    finalSourceKind: asset.sourceKind,
    isLocalFile: false,
    fileName: asset.fileName,
    previewSourceMode: "direct_remote_viewer_session_contract",
    payloadMode: "session_id_only",
    routeParamsJson: redactedRouteParamsJson({
      sessionId: safeSessionId,
      openToken: safeOpenToken,
    }),
  });
  try {
    persistCriticalPdfBreadcrumb({
      marker: "viewer_patch_v3_active",
      screen: breadcrumbScreen,
      documentType: asset.documentType,
      originModule: asset.originModule,
      sourceKind: asset.sourceKind,
      uriKind: scheme || asset.sourceKind,
      uri: asset.uri,
      fileName: asset.fileName,
      entityId: asset.entityId,
      sessionId: safeSessionId,
      openToken: safeOpenToken,
      previewPath: "direct_remote_viewer_session_contract",
      extra: {
        route: "/pdf-viewer",
        patchVersion: "v3",
        payloadMode: "session_id_only",
      },
    });
    persistCriticalPdfBreadcrumb({
      marker: "viewer_patch_v3_before_navigation",
      screen: breadcrumbScreen,
      documentType: asset.documentType,
      originModule: asset.originModule,
      sourceKind: asset.sourceKind,
      uriKind: scheme || asset.sourceKind,
      uri: asset.uri,
      fileName: asset.fileName,
      entityId: asset.entityId,
      sessionId: safeSessionId,
      openToken: safeOpenToken,
      previewPath: "direct_remote_viewer_session_contract",
      extra: {
        route: "/pdf-viewer",
        patchVersion: "v3",
        payloadMode: "session_id_only",
      },
    });
    persistCriticalPdfBreadcrumb({
      marker: "viewer_route_push_attempt",
      screen: breadcrumbScreen,
      documentType: asset.documentType,
      originModule: asset.originModule,
      sourceKind: asset.sourceKind,
      uriKind: scheme || asset.sourceKind,
      uri: asset.uri,
      fileName: asset.fileName,
      entityId: asset.entityId,
      sessionId: safeSessionId,
      openToken: safeOpenToken,
      previewPath: "direct_remote_viewer_session_contract",
      extra: {
        route: "/pdf-viewer",
        payloadMode: "session_id_only",
      },
    });
    recordPdfOpenStage({
      context: opts?.openFlow,
      stage: "viewer_route_push_attempt",
      sourceKind: asset.sourceKind,
      extra: {
        route: "/pdf-viewer",
        sessionId: safeSessionId,
        openToken: safeOpenToken,
        previewSourceMode: "direct_remote_viewer_session_contract",
        payloadMode: "session_id_only",
      },
    });
    persistCriticalPdfBreadcrumb({
      marker: "viewer_patch_v3_navigation_call",
      screen: breadcrumbScreen,
      documentType: asset.documentType,
      originModule: asset.originModule,
      sourceKind: asset.sourceKind,
      uriKind: scheme || asset.sourceKind,
      uri: asset.uri,
      fileName: asset.fileName,
      entityId: asset.entityId,
      sessionId: safeSessionId,
      openToken: safeOpenToken,
      previewPath: "direct_remote_viewer_session_contract",
      extra: {
        route: "/pdf-viewer",
        patchVersion: "v3",
        payloadMode: "session_id_only",
      },
    });
    opts?.assertCurrentRun?.("viewer_entry");
    recordBoundary("pdf_viewer_entry_started", "viewer_entry");
    await pushPdfDocumentViewerRouteSafely(opts!.router!, viewerHref, opts?.onBeforeNavigate);
    recordBoundary("pdf_viewer_entry_confirmed", "viewer_entry");
    persistCriticalPdfBreadcrumb({
      marker: "viewer_route_pushed",
      screen: breadcrumbScreen,
      documentType: asset.documentType,
      originModule: asset.originModule,
      sourceKind: asset.sourceKind,
      uriKind: scheme || asset.sourceKind,
      uri: asset.uri,
      fileName: asset.fileName,
      entityId: asset.entityId,
      sessionId: safeSessionId,
      openToken: safeOpenToken,
      previewPath: "direct_remote_viewer_session_contract",
      extra: {
        route: "/pdf-viewer",
        payloadMode: "session_id_only",
      },
    });
    outputObservation.success({
      sourceKind: asset.sourceKind,
      extra: {
        sessionId: session.sessionId,
        assetId: asset.assetId,
        previewSourceMode: "direct_remote_viewer_session_contract",
      },
    });
    openObservation.success({
      sourceKind: asset.sourceKind,
      extra: {
        route: "/pdf-viewer",
        sessionId: safeSessionId,
        previewSourceMode: "direct_remote_viewer_session_contract",
      },
    });
    return;
  } catch (error) {
    recordPdfOpenStage({
      context: opts?.openFlow,
      stage: "viewer_route_push_crash",
      result: "error",
      sourceKind: asset.sourceKind,
      error,
      extra: {
        route: "/pdf-viewer",
        sessionId: safeSessionId,
        openToken: safeOpenToken,
        previewSourceMode: "direct_remote_viewer_session_contract",
        payloadMode: "session_id_only",
      },
    });
    failPdfOpenVisible(opts?.openFlow?.openToken, error, {
      sourceKind: asset.sourceKind,
      extra: {
        route: "/pdf-viewer",
        sessionId: safeSessionId,
        previewSourceMode: "direct_remote_viewer_session_contract",
      },
    });
    throw error;
  }
}

async function executeStoredPreviewSessionPath(args: {
  doc: DocumentDescriptor;
  opts?: PreviewPdfDocumentOpts;
  persistCriticalPdfBreadcrumb: (input: PersistCriticalPdfBreadcrumbInput) => void;
  recordBoundary: (
    event: string,
    stage?: "viewer_entry" | "visibility",
    result?: "success" | "error",
    error?: unknown,
  ) => void;
  outputObservation: ReturnType<typeof beginPdfLifecycleObservation>;
  openObservation: ReturnType<typeof beginPdfLifecycleObservation>;
}): Promise<void> {
  const { doc, opts, persistCriticalPdfBreadcrumb, recordBoundary, outputObservation, openObservation } =
    args;
  const breadcrumbScreen = doc.originModule;
  const routeViewerAvailable = Boolean(opts?.router);
  const { session, asset, materializationMode } = await (async () => {
    try {
      if (routeViewerAvailable) {
        return await createInstantDocumentPreviewSession(doc);
      }
      const ready = await createDocumentPreviewSession(doc);
      return {
        ...ready,
        materializationMode: "blocking_materialization" as const,
      };
    } catch (error) {
      throw outputObservation.error(error, {
        fallbackMessage: "PDF preview asset preparation failed",
      });
    }
  })();
  const stageSourceKind = asset?.sourceKind ?? doc.fileSource.kind;
  recordPdfOpenStage({
    context: opts?.openFlow,
    stage: "document_prepare_done",
    sourceKind: stageSourceKind,
    extra: {
      sessionId: session.sessionId,
      assetId: asset?.assetId ?? null,
      uriKind: asset ? extractUriScheme(asset.uri) || asset.sourceKind : doc.fileSource.kind,
      uri: asset?.uri ?? null,
      fileExists: asset ? (typeof asset.sizeBytes === "number" ? true : undefined) : false,
      fileSizeBytes: asset?.sizeBytes,
      previewSourceMode: "instant_local_cache_session",
      materializationMode,
    },
  });
  outputObservation.success({
    sourceKind: stageSourceKind,
    extra: {
      sessionId: session.sessionId,
      assetId: asset?.assetId ?? null,
      materializationMode,
    },
  });
  if (__DEV__) console.info("[pdf-document-actions] preview_asset", {
    stage: asset ? "preview_asset_ready" : "preview_asset_preparing",
    sessionId: session.sessionId,
    documentType: asset?.documentType ?? doc.documentType,
    originModule: asset?.originModule ?? doc.originModule,
    sourceKind: asset?.sourceKind ?? doc.fileSource.kind,
    uri: asset ? redactSensitiveText(asset.uri) : null,
    scheme: asset ? extractUriScheme(asset.uri) : null,
    fileName: asset?.fileName ?? doc.fileName,
    exists: asset ? (typeof asset.sizeBytes === "number" ? true : undefined) : false,
    sizeBytes: asset?.sizeBytes,
    materializationMode,
  });
  if (asset) {
    const sizeEligibility = checkPdfMobilePreviewEligibility({
      platform: Platform.OS,
      sizeBytes: asset.sizeBytes,
      documentType: asset.documentType,
      originModule: asset.originModule,
      fileName: asset.fileName,
    });
    if (!sizeEligibility.eligible) {
      const blocked = sizeEligibility as { eligible: false; sizeBytes: number; limitBytes: number };
      throw recordPdfPreviewOversizeBlocked({
        sizeBytes: blocked.sizeBytes,
        limitBytes: blocked.limitBytes,
        documentType: asset.documentType,
        originModule: asset.originModule,
        fileName: asset.fileName,
      });
    }
  }
  if (opts?.router) {
    recordPdfOpenStage({
      context: opts.openFlow,
      stage: "viewer_or_handoff_start",
      sourceKind: stageSourceKind,
      extra: {
        route: "/pdf-viewer",
        sessionId: session.sessionId,
        previewPath: "session_viewer_contract",
        uriKind: asset ? extractUriScheme(asset.uri) || asset.sourceKind : doc.fileSource.kind,
        uri: asset?.uri ?? null,
        fileExists: asset ? (typeof asset.sizeBytes === "number" ? true : undefined) : false,
        fileSizeBytes: asset?.sizeBytes,
        materializationMode,
      },
    });
    persistCriticalPdfBreadcrumb({
      marker: "document_prepare_done",
      screen: breadcrumbScreen,
      documentType: asset?.documentType ?? doc.documentType,
      originModule: asset?.originModule ?? doc.originModule,
      sourceKind: stageSourceKind,
      uriKind: asset ? extractUriScheme(asset.uri) || asset.sourceKind : doc.fileSource.kind,
      uri: asset?.uri ?? null,
      fileName: asset?.fileName ?? doc.fileName,
      entityId: doc.entityId,
      sessionId: session.sessionId,
      openToken: opts.openFlow?.openToken,
      fileExists: asset ? (typeof asset.sizeBytes === "number" ? true : undefined) : false,
      fileSizeBytes: asset?.sizeBytes,
      previewPath: "session_viewer_contract",
      extra: {
        route: "/pdf-viewer",
        checkpoint: "mobile_pre_navigation",
        materializationMode,
      },
    });
    const {
      safeSessionId,
      safeOpenToken,
      href: viewerHref,
    } = createPdfDocumentViewerHref(session.sessionId, opts.openFlow?.openToken);
    const navDocumentType = asset?.documentType ?? doc.documentType;
    const navOriginModule = asset?.originModule ?? doc.originModule;
    const navSourceKind = asset?.sourceKind ?? doc.fileSource.kind;
    const navUri = asset?.uri ?? null;
    const navUriKind = asset ? extractUriScheme(asset.uri) || asset.sourceKind : doc.fileSource.kind;
    const navFileName = asset?.fileName ?? doc.fileName;
    const navFileExists = asset ? (typeof asset.sizeBytes === "number" ? true : undefined) : false;
    const navFileSizeBytes = asset?.sizeBytes;
    if (__DEV__) console.info("[pdf-document-actions] about_to_navigate_to_viewer", {
      sessionId: safeSessionId,
      documentType: navDocumentType,
      originModule: navOriginModule,
      finalUri: navUri ? redactSensitiveText(navUri) : null,
      finalScheme: navUri ? extractUriScheme(navUri) : null,
      finalSourceKind: navSourceKind,
      isLocalFile: /^file:\/\//i.test(String(navUri || "")),
      fileName: navFileName,
      materializationMode,
      routeParamsJson: redactedRouteParamsJson({
        sessionId: safeSessionId,
        openToken: safeOpenToken,
      }),
    });
    try {
      persistCriticalPdfBreadcrumb({
        marker: "viewer_patch_v3_active",
        screen: breadcrumbScreen,
        documentType: navDocumentType,
        originModule: navOriginModule,
        sourceKind: navSourceKind,
        uriKind: navUriKind,
        uri: navUri,
        fileName: navFileName,
        entityId: doc.entityId,
        sessionId: safeSessionId,
        openToken: safeOpenToken,
        fileExists: navFileExists,
        fileSizeBytes: navFileSizeBytes,
        previewPath: "session_viewer_contract",
        extra: {
          route: "/pdf-viewer",
          patchVersion: "v3",
          materializationMode,
        },
      });
      persistCriticalPdfBreadcrumb({
        marker: "viewer_patch_v3_before_navigation",
        screen: breadcrumbScreen,
        documentType: navDocumentType,
        originModule: navOriginModule,
        sourceKind: navSourceKind,
        uriKind: navUriKind,
        uri: navUri,
        fileName: navFileName,
        entityId: doc.entityId,
        sessionId: safeSessionId,
        openToken: safeOpenToken,
        fileExists: navFileExists,
        fileSizeBytes: navFileSizeBytes,
        previewPath: "session_viewer_contract",
        extra: {
          route: "/pdf-viewer",
          patchVersion: "v3",
          materializationMode,
        },
      });
      persistCriticalPdfBreadcrumb({
        marker: "viewer_route_push_attempt",
        screen: breadcrumbScreen,
        documentType: navDocumentType,
        originModule: navOriginModule,
        sourceKind: navSourceKind,
        uriKind: navUriKind,
        uri: navUri,
        fileName: navFileName,
        entityId: doc.entityId,
        sessionId: safeSessionId,
        openToken: safeOpenToken,
        fileExists: navFileExists,
        fileSizeBytes: navFileSizeBytes,
        previewPath: "session_viewer_contract",
        extra: {
          route: "/pdf-viewer",
          materializationMode,
        },
      });
      recordPdfOpenStage({
        context: opts.openFlow,
        stage: "viewer_route_push_attempt",
        sourceKind: navSourceKind,
        extra: {
          route: "/pdf-viewer",
          sessionId: safeSessionId,
          openToken: safeOpenToken,
          previewPath: "session_viewer_contract",
          materializationMode,
        },
      });
      persistCriticalPdfBreadcrumb({
        marker: "viewer_patch_v3_navigation_call",
        screen: breadcrumbScreen,
        documentType: navDocumentType,
        originModule: navOriginModule,
        sourceKind: navSourceKind,
        uriKind: navUriKind,
        uri: navUri,
        fileName: navFileName,
        entityId: doc.entityId,
        sessionId: safeSessionId,
        openToken: safeOpenToken,
        fileExists: navFileExists,
        fileSizeBytes: navFileSizeBytes,
        previewPath: "session_viewer_contract",
        extra: {
          route: "/pdf-viewer",
          patchVersion: "v3",
          materializationMode,
        },
      });
      opts?.assertCurrentRun?.("viewer_entry");
      recordBoundary("pdf_viewer_entry_started", "viewer_entry");
      await pushPdfDocumentViewerRouteSafely(opts.router, viewerHref, opts?.onBeforeNavigate);
      recordBoundary("pdf_viewer_entry_confirmed", "viewer_entry");
      persistCriticalPdfBreadcrumb({
        marker: "viewer_route_pushed",
        screen: breadcrumbScreen,
        documentType: navDocumentType,
        originModule: navOriginModule,
        sourceKind: navSourceKind,
        uriKind: navUriKind,
        uri: navUri,
        fileName: navFileName,
        entityId: doc.entityId,
        sessionId: safeSessionId,
        openToken: safeOpenToken,
        fileExists: navFileExists,
        fileSizeBytes: navFileSizeBytes,
        previewPath: "session_viewer_contract",
        extra: {
          route: "/pdf-viewer",
          materializationMode,
        },
      });
      openObservation.success({
        sourceKind: navSourceKind,
        extra: {
          route: "/pdf-viewer",
          sessionId: safeSessionId,
          materializationMode,
        },
      });
      return;
    } catch (error) {
      recordPdfOpenStage({
        context: opts.openFlow,
        stage: "viewer_route_push_crash",
        result: "error",
        sourceKind: navSourceKind,
        error,
        extra: {
          route: "/pdf-viewer",
          sessionId: safeSessionId,
          openToken: safeOpenToken,
          previewPath: "session_viewer_contract",
          materializationMode,
        },
      });
      failPdfOpenVisible(opts.openFlow?.openToken, error, {
        sourceKind: navSourceKind,
        extra: {
          route: "/pdf-viewer",
          sessionId: safeSessionId,
          materializationMode,
        },
      });
      const lifecycleError = openObservation.error(error, {
        fallbackMessage: "Viewer navigation failed",
        extra: {
          sessionId: safeSessionId,
        },
      });
      const message = getPdfFlowErrorMessage(
        lifecycleError,
        "Viewer navigation failed",
      );
      if (__DEV__) console.error("[pdf-document-actions] preview_navigation_failed", {
        stage: "navigation_failed",
        sessionId: safeSessionId,
        documentType: navDocumentType,
        originModule: navOriginModule,
        errorName: getPdfDocumentActionErrorName(error),
        errorMessage: message,
      });
      throw normalizePdfDocumentActionError(
        lifecycleError,
        "Viewer navigation failed",
      );
    }
  }

  if (!asset) {
    throw outputObservation.error(new Error("PDF preview asset is still preparing"), {
      fallbackMessage: "PDF preview asset preparation failed",
      extra: {
        sessionId: session.sessionId,
        materializationMode,
      },
    });
  }

  if (__DEV__) console.warn("[pdf-document-actions] preview_without_router_fallback", {
    documentType: asset.documentType,
    originModule: asset.originModule,
    finalUri: redactSensitiveText(asset.uri),
  });
  recordPdfOpenStage({
    context: opts?.openFlow,
    stage: "viewer_or_handoff_start",
    sourceKind: asset.sourceKind,
    extra: {
      openStrategy: "direct_preview",
    },
  });
  try {
    opts?.assertCurrentRun?.("viewer_entry");
    recordBoundary("pdf_viewer_entry_started", "viewer_entry");
    await openPdfPreview(asset.uri, asset.fileName);
    recordBoundary("pdf_viewer_entry_confirmed", "viewer_entry");
    openObservation.success({
      sourceKind: asset.sourceKind,
      extra: {
        openStrategy: "direct_preview",
      },
    });
  } catch (error) {
    throw openObservation.error(error, {
      fallbackMessage: "PDF preview open failed",
      extra: {
        openStrategy: "direct_preview",
      },
    });
  }
}

export async function executePreviewPdfDocument(
  doc: DocumentDescriptor,
  opts?: PreviewPdfDocumentOpts,
  deps?: PreviewActionDependencies,
): Promise<void> {
  const persistCriticalPdfBreadcrumb =
    deps?.persistCriticalPdfBreadcrumb ?? (() => undefined);
  const outputObservation = beginPdfLifecycleObservation({
    screen: "reports",
    surface: "pdf_document_actions",
    event: "pdf_preview_output_prepare",
    stage: "output_prepare",
    sourceKind: doc.fileSource.kind,
    context: {
      documentFamily: doc.documentType,
      documentType: doc.documentType,
      originModule: doc.originModule,
      entityId: doc.entityId ?? null,
      fileName: doc.fileName,
      source: doc.uri,
    },
  });
  const openObservation = beginPdfLifecycleObservation({
    screen: "reports",
    surface: "pdf_document_actions",
    event: "pdf_preview_open",
    stage: "open_view",
    sourceKind: doc.fileSource.kind,
    context: {
      documentFamily: doc.documentType,
      documentType: doc.documentType,
      originModule: doc.originModule,
      entityId: doc.entityId ?? null,
      fileName: doc.fileName,
      source: doc.uri,
    },
  });
  const recordBoundary = createPreviewBoundaryRecorder({
    boundaryRun: opts?.boundaryRun,
    sourceKind: doc.fileSource.kind,
  });

  try {
    const scheme = extractUriScheme(doc.uri);
    if (__DEV__) console.info("[pdf-document-actions] preview", {
      stage: "preview_requested",
      platform: Platform.OS,
      documentType: doc.documentType,
      originModule: doc.originModule,
      scheme,
      uri: redactSensitiveText(doc.uri),
      fileName: doc.fileName,
    });

    const hasRouter = hasPdfDocumentPreviewRouter(opts?.router);
    const previewModePlan = resolvePdfDocumentPreviewModePlan({
      platform: Platform.OS,
      sourceKind: doc.fileSource.kind,
      hasRouter,
    });

    if (previewModePlan.mode === "in_memory_remote_session") {
      await executeDirectRemoteViewerSessionPath({
        doc,
        opts,
        persistCriticalPdfBreadcrumb,
        recordBoundary,
        outputObservation,
        openObservation,
        scheme,
      });
      return;
    }

    if (previewModePlan.mode === "session_viewer_contract") {
      await executeStoredPreviewSessionPath({
        doc,
        opts,
        persistCriticalPdfBreadcrumb,
        recordBoundary,
        outputObservation,
        openObservation,
      });
      return;
    }

    if (!canUsePdfDocumentDirectPreviewFallback({ hasRouter })) {
      throw new Error("PDF preview route fallback is unavailable");
    }

    await executeStoredPreviewSessionPath({
      doc,
      opts,
      persistCriticalPdfBreadcrumb,
      recordBoundary,
      outputObservation,
      openObservation,
    });
  } catch (error) {
    recordBoundary("pdf_terminal_failure", "viewer_entry", "error", error);
    const message = getPdfFlowErrorMessage(error, "PDF preview failed");
    if (__DEV__) console.error("[pdf-document-actions] preview_failed", {
      stage: "preview_failed",
      platform: Platform.OS,
      documentType: doc.documentType,
      originModule: doc.originModule,
      fileName: doc.fileName,
      uri: redactSensitiveText(doc.uri),
      errorName: getPdfDocumentActionErrorName(error),
      errorMessage: redactSensitiveText(message),
    });
    throw normalizePdfDocumentActionError(error, "PDF preview failed");
  }
}
