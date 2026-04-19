import { router as rootRouter, type Href } from "expo-router";
import { InteractionManager, Platform } from "react-native";
import type { DocumentDescriptor } from "./pdfDocument";
import {
  createDocumentPreviewSession,
  createInMemoryDocumentPreviewSession,
} from "./pdfDocumentSessions";
import {
  openPdfExternal,
  openPdfPreview,
  openPdfShare,
  preparePdfExecutionSource,
  type BusyLike,
} from "../pdfRunner";
import { beginPdfLifecycleObservation } from "../pdf/pdfLifecycle";
import { createPdfSource, type PdfSource } from "../pdfFileContract";
import {
  beginPdfOpenVisibilityWait,
  createPdfOpenFlowContext,
  failPdfOpenVisible,
  recordPdfOpenStage,
  type PdfOpenFlowContext,
} from "../pdf/pdfOpenFlow";
import {
  recordPdfCrashBreadcrumb,
  shouldRecordPdfCrashBreadcrumbs,
} from "../pdf/pdfCrashBreadcrumbs";
import {
  checkPdfMobilePreviewEligibility,
  recordPdfPreviewOversizeBlocked,
} from "../pdf/pdfMobilePreviewSizeGuard";
import {
  createPdfActionBoundaryKey,
  createPdfActionBoundaryRun,
  recordPdfActionBoundaryEvent,
  toPdfActionBoundaryError,
  type PdfActionBoundaryRun,
} from "../pdf/pdfActionBoundary";
import {
  resolvePdfDocumentOpenFlowCleanupPlan,
  resolvePdfDocumentOpenFlowStartPlan,
} from "./pdfDocumentOpenFlowPlan";
import { resolvePdfDocumentPreviewSessionPlan } from "./pdfDocumentPreviewSessionPlan";
import {
  resolvePdfDocumentBusyExecutionPlan,
  resolvePdfDocumentBusyRunOutputPlan,
  resolvePdfDocumentManualBusyCleanupPlan,
  resolvePdfDocumentVisibilityFailureRecordPlan,
  resolvePdfDocumentVisibilityFailureSignalPlan,
  resolvePdfDocumentVisibilityStartPlan,
  resolvePdfDocumentVisibilitySuccessPlan,
} from "./pdfDocumentVisibilityBusyPlan";
export function getPdfFlowErrorMessage(
  error: unknown,
  fallback = "Не удалось открыть PDF",
): string {
  if (error && typeof error === "object") {
    const maybeMessage =
      "message" in error ? (error as { message?: unknown }).message : undefined;
    const text = typeof maybeMessage === "string" ? maybeMessage.trim() : "";
    if (text) return text;
  }
  const text = String(error ?? "").trim();
  return text && text !== "[object Object]" ? text : fallback;
}
type PreparePdfDocumentArgs = {
  busy?: BusyLike;
  supabase: any;
  key?: string;
  label?: string;
  descriptor: Omit<DocumentDescriptor, "uri" | "fileSource"> & {
    uri?: string;
    fileSource?: PdfSource;
  };
  resolveSource?: () => Promise<PdfSource> | PdfSource;
  getRemoteUrl?: () => Promise<string> | string;
};
export type PdfViewerRouterLike = {
  push: (href: Href, options?: unknown) => void;
  replace?: (href: Href, options?: unknown) => void;
};
function canUseInMemoryRemoteViewerShortcut(
  doc: DocumentDescriptor,
  hasRouter: boolean,
) {
  return (
    resolvePdfDocumentPreviewSessionPlan({
      platform: Platform.OS,
      sourceKind: doc.fileSource.kind,
      hasRouter,
    }).action === "use_in_memory_remote_session"
  );
}
function toSafeRouteParam(value: unknown) {
  return String(value ?? "").trim();
}
function extractUriScheme(uri: unknown): string {
  return (
    String(uri || "")
      .match(/^([a-z0-9+.-]+):/i)?.[1]
      ?.toLowerCase() || ""
  );
}
function createViewerHref(sessionId: unknown, openToken: unknown) {
  const safeSessionId = toSafeRouteParam(sessionId);
  const safeOpenToken = toSafeRouteParam(openToken);
  if (!safeSessionId) {
    throw new Error("PDF viewer navigation requires a non-empty sessionId");
  }
  return {
    safeSessionId,
    safeOpenToken,
    href: `/pdf-viewer?sessionId=${encodeURIComponent(safeSessionId)}&openToken=${encodeURIComponent(safeOpenToken)}` as Href,
  };
}
async function pushViewerRouteSafely(
  router: PdfViewerRouterLike,
  href: Href,
  onBeforeNavigate?: (() => void | Promise<void>) | null,
) {
  if (__DEV__) console.info("[pdf-document-actions] viewer_patch_v3_navigation_call", {
    href: String(href),
    platform: Platform.OS,
    patchVersion: "v3",
  });
  if (__DEV__) console.info("[pdf-document-actions] viewer_route_push_pre_schedule", {
    href: String(href),
    platform: Platform.OS,
  });
  // Dismiss any active native Modal BEFORE navigating.
  // React Native <Modal> renders at the native window level (UIWindow on iOS),
  // which physically sits above the entire navigation Stack. If a Modal is
  // still visible when router.push fires, the PDF viewer screen will appear
  // underneath the Modal. Calling onBeforeNavigate here sets the modal-visible
  // state to false, which triggers the native dismiss animation. The subsequent
  // InteractionManager.runAfterInteractions call then waits for that animation
  // (an Animated interaction) to fully settle before executing the push.
  const hadModalDismiss = typeof onBeforeNavigate === "function";
  if (hadModalDismiss) {
    try {
      await Promise.resolve(onBeforeNavigate());
    } catch (error) {
      if (__DEV__) console.warn("[pdf-document-actions] onBeforeNavigate error (non-fatal)", error);
    }
  }
  await new Promise<void>((resolve, reject) => {
    const runPush = () => {
      try {
        if (__DEV__) console.info("[pdf-document-actions] viewer_route_replace_start", {
          href: String(href),
          platform: Platform.OS,
          method: Platform.OS === "ios" ? "push" : "replace",
        });
        if (Platform.OS === "ios") {
          // On iOS, `replace` from inside (tabs) to a root-level route
          // performs a cross-navigator replace that can crash UIKit's
          // native navigation controller. `push` is a safe forward navigation.
          if (typeof rootRouter?.push === "function") {
            rootRouter.push(href);
          } else {
            router.push(href);
          }
        } else if (typeof rootRouter?.replace === "function") {
          rootRouter.replace(href);
        } else if (typeof router.replace === "function") {
          router.replace(href);
        } else {
          router.push(href);
        }
        if (__DEV__) console.info("[pdf-document-actions] viewer_route_replace_done", {
          href: String(href),
          platform: Platform.OS,
        });
        resolve();
      } catch (error) {
        if (__DEV__) console.error("[pdf-document-actions] viewer_route_replace_crash", {
          href: String(href),
          platform: Platform.OS,
          errorName: error instanceof Error ? error.name : undefined,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
        reject(error);
      }
    };
    // L-PERF: Only wait for InteractionManager when a modal dismiss was
    // triggered. When no modal is active, there are no in-flight dismiss
    // animations to wait for, so push immediately via microtask.
    // This saves ~200-400ms for non-modal screens (Warehouse, Foreman,
    // Buyer, Accountant, Contractor).
    if (hadModalDismiss && typeof InteractionManager?.runAfterInteractions === "function") {
      InteractionManager.runAfterInteractions(() => {
        // D-MODAL-PDF: On Android, the native <Modal> window may still be
        // detaching when InteractionManager fires. The Modal renders at
        // the native window level, and router.replace can execute
        // "underneath" the not-yet-fully-dismissed modal. A minimal
        // frame delay ensures the modal has fully detached.
        if (Platform.OS === "android" && hadModalDismiss) {
          setTimeout(runPush, 80);
        } else {
          runPush();
        }
      });
    } else {
      // No modal dismiss — push immediately on next microtask
      Promise.resolve().then(runPush).catch(reject);
    }
  });
}
type PreviewPdfDocumentOpts = {
  router?: PdfViewerRouterLike;
  openFlow?: PdfOpenFlowContext & {
    openToken?: string;
  };
  /** Called before router.push — use to dismiss native Modals that sit above the navigation Stack. */
  boundaryRun?: PdfActionBoundaryRun;
  assertCurrentRun?: (stage: "prepare" | "viewer_entry" | "visibility") => void;
  onBeforeNavigate?: (() => void | Promise<void>) | null;
};
type ActivePreviewFlow = {
  promise: Promise<DocumentDescriptor>;
  runId: string;
  startedAt: number;
};
const activePreviewFlows = new Map<string, ActivePreviewFlow>();
// D-MODAL-PDF: Track when each flow started so we can expire abandoned entries.
// If a flow promise is leaked (e.g., component unmounts during PDF generation),
// future opens of the same key would be blocked forever. 60s TTL prevents this.
const activePreviewFlowTimestamps = new Map<string, number>();
const ACTIVE_FLOW_MAX_TTL_MS = 60_000;
let pdfActionRunSeq = 0;
const latestPreviewRunByKey = new Map<string, string>();

function nextPdfActionRunId(): string {
  pdfActionRunSeq += 1;
  return `pdf-action-${Date.now()}-${pdfActionRunSeq}`;
}

function assertCurrentPdfActionRun(
  flowKey: string,
  runId: string,
  stage: "prepare" | "viewer_entry" | "visibility",
): void {
  if (latestPreviewRunByKey.get(flowKey) === runId) return;
  throw toPdfActionBoundaryError(
    new Error(`Stale PDF action result ignored for ${flowKey}`),
    stage,
    "Stale PDF action result ignored",
  );
}
function persistCriticalPdfBreadcrumb(input: {
  marker: string;
  screen: unknown;
  documentType?: unknown;
  originModule?: unknown;
  sourceKind?: unknown;
  uriKind?: unknown;
  uri?: unknown;
  fileName?: unknown;
  entityId?: unknown;
  sessionId?: unknown;
  openToken?: unknown;
  fileExists?: unknown;
  fileSizeBytes?: unknown;
  previewPath?: unknown;
  errorMessage?: unknown;
  terminalState?: unknown;
  extra?: Record<string, unknown>;
}): void {
  if (!shouldRecordPdfCrashBreadcrumbs(input.screen)) return;
  // L-PERF: fire-and-forget breadcrumbs must NOT block the critical open path.
  // Previously each await did 2 AsyncStorage I/O ops (read+write), and 6 sequential
  // awaits on the critical path added 12 I/O ops before the viewer route push.
  recordPdfCrashBreadcrumb(input);
}
function requiresCanonicalRemotePdfSource(
  args: Pick<DocumentDescriptor, "documentType" | "originModule">,
) {
  const key = `${args.originModule}:${args.documentType}`;
  return (
    key === "foreman:request" ||
    key === "director:director_report" ||
    key === "director:supplier_summary" ||
    key === "warehouse:warehouse_document" ||
    key === "warehouse:warehouse_register" ||
    key === "warehouse:warehouse_materials"
  );
}
function assertCanonicalRemotePdfSource(
  descriptor: Pick<DocumentDescriptor, "documentType" | "originModule">,
  source: PdfSource,
) {
  if (!requiresCanonicalRemotePdfSource(descriptor)) return;
  if (source.kind === "remote-url") return;
  throw new Error(
    `Canonical ${descriptor.originModule} ${descriptor.documentType} PDF must use backend remote-url source`,
  );
}
export async function preparePdfDocument(
  args: PreparePdfDocumentArgs,
): Promise<DocumentDescriptor> {
  const run = async () => {
    const observation = beginPdfLifecycleObservation({
      screen: "reports",
      surface: "pdf_document_actions",
      event: "pdf_output_prepare",
      stage: "output_prepare",
      sourceKind: "pdf:document",
      context: {
        documentFamily: args.descriptor.documentType,
        documentType: args.descriptor.documentType,
        originModule: args.descriptor.originModule,
        entityId: args.descriptor.entityId ?? null,
        fileName: args.descriptor.fileName,
        source: args.descriptor.uri ?? args.descriptor.fileSource?.uri ?? null,
      },
    });
    try {
      if (__DEV__) console.info("[pdf-document-actions] prepare_requested", {
        stage: "prepare_requested",
        platform: Platform.OS,
        documentType: args.descriptor.documentType,
        originModule: args.descriptor.originModule,
        sourceUri: args.descriptor.uri ?? null,
        fileName: args.descriptor.fileName,
        busyKey: args.key ?? null,
      });
      const preparedSource = await preparePdfExecutionSource({
        supabase: args.supabase,
        source:
          args.descriptor.fileSource ??
          (args.descriptor.uri
            ? createPdfSource(args.descriptor.uri)
            : undefined),
        resolveSource: args.resolveSource,
        getRemoteUrl: args.getRemoteUrl,
        fileName: args.descriptor.fileName,
      });
      assertCanonicalRemotePdfSource(args.descriptor, preparedSource);
      const uri = preparedSource.uri;
      if (__DEV__) console.info("[pdf-document-actions] prepare_ready", {
        stage: "prepare_ready",
        platform: Platform.OS,
        documentType: args.descriptor.documentType,
        originModule: args.descriptor.originModule,
        finalUri: uri,
        finalScheme: extractUriScheme(uri),
        finalSourceKind: preparedSource.kind,
        fileName: args.descriptor.fileName,
      });
      observation.success({
        sourceKind: preparedSource.kind,
        extra: {
          uri: uri,
        },
      });
      return { ...args.descriptor, uri, fileSource: preparedSource };
    } catch (error) {
      const lifecycleError = observation.error(error, {
        fallbackMessage: "PDF preparation failed",
      });
      const message = getPdfFlowErrorMessage(
        lifecycleError,
        "PDF preparation failed",
      );
      if (__DEV__) console.error("[pdf-document-actions] prepare_failed", {
        stage: "prepare_failed",
        platform: Platform.OS,
        documentType: args.descriptor.documentType,
        originModule: args.descriptor.originModule,
        fileName: args.descriptor.fileName,
        errorName:
          error && typeof error === "object" && "name" in error
            ? String((error as { name?: unknown }).name || "")
            : "",
        errorMessage: message,
      });
      throw lifecycleError instanceof Error
        ? lifecycleError
        : new Error(message);
    }
  };
  if (args.busy?.run) {
    const out = await args.busy.run(run, {
      key: args.key,
      label: args.label,
      minMs: 200,
    });
    if (!out) throw new Error("PDF preparation cancelled");
    return out;
  }
  return await run();
}
export async function previewPdfDocument(
  doc: DocumentDescriptor,
  opts?: PreviewPdfDocumentOpts,
): Promise<void> {
  const breadcrumbScreen = doc.originModule;
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
  const recordBoundary = (
    event: string,
    stage: "viewer_entry" | "visibility" = "viewer_entry",
    result: "success" | "error" = "success",
    error?: unknown,
  ) => {
    if (!opts?.boundaryRun) return;
    recordPdfActionBoundaryEvent({
      run: opts.boundaryRun,
      event,
      stage,
      result,
      sourceKind: doc.fileSource.kind,
      error,
    });
  };
  try {
    const scheme = extractUriScheme(doc.uri);
    if (__DEV__) console.info("[pdf-document-actions] preview", {
      stage: "preview_requested",
      platform: Platform.OS,
      documentType: doc.documentType,
      originModule: doc.originModule,
      scheme,
      uri: doc.uri,
      fileName: doc.fileName,
    });
    if (canUseInMemoryRemoteViewerShortcut(doc, Boolean(opts?.router))) {
      recordPdfOpenStage({
        context: opts.openFlow,
        stage: "document_prepare_done",
        sourceKind: doc.fileSource.kind,
        extra: {
          previewSourceMode: "direct_remote_viewer_contract",
          uriKind: scheme || doc.fileSource.kind,
          uri: doc.fileSource.uri,
        },
      });
      recordPdfOpenStage({
        context: opts.openFlow,
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
        openToken: opts.openFlow?.openToken,
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
      } = createViewerHref(session.sessionId, opts.openFlow?.openToken);
      recordPdfOpenStage({
        context: opts.openFlow,
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
        finalUri: asset.uri,
        finalScheme: extractUriScheme(asset.uri),
        finalSourceKind: asset.sourceKind,
        isLocalFile: false,
        fileName: asset.fileName,
        previewSourceMode: "direct_remote_viewer_session_contract",
        payloadMode: "session_id_only",
        routeParamsJson: JSON.stringify({
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
          context: opts.openFlow,
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
        await pushViewerRouteSafely(opts.router, viewerHref, opts?.onBeforeNavigate);
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
          context: opts.openFlow,
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
        failPdfOpenVisible(opts.openFlow?.openToken, error, {
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
    const { session, asset } = await (async () => {
      try {
        return await createDocumentPreviewSession(doc);
      } catch (error) {
        throw outputObservation.error(error, {
          fallbackMessage: "PDF preview asset preparation failed",
        });
      }
    })();
    recordPdfOpenStage({
      context: opts?.openFlow,
      stage: "document_prepare_done",
      sourceKind: asset.sourceKind,
      extra: {
        sessionId: session.sessionId,
        assetId: asset.assetId,
        uriKind: extractUriScheme(asset.uri) || asset.sourceKind,
        uri: asset.uri,
        fileExists: typeof asset.sizeBytes === "number" ? true : undefined,
        fileSizeBytes: asset.sizeBytes,
      },
    });
    outputObservation.success({
      sourceKind: asset.sourceKind,
      extra: {
        sessionId: session.sessionId,
        assetId: asset.assetId,
      },
    });
    if (__DEV__) console.info("[pdf-document-actions] preview_asset", {
      stage: "preview_asset_ready",
      sessionId: session.sessionId,
      documentType: asset.documentType,
      originModule: asset.originModule,
      sourceKind: asset.sourceKind,
      uri: asset.uri,
      scheme: extractUriScheme(asset.uri),
      fileName: asset.fileName,
      exists: typeof asset.sizeBytes === "number" ? true : undefined,
      sizeBytes: asset.sizeBytes,
    });
    // iOS oversize guard.
    // Must fire BEFORE the viewer route push. If the file is too large for
    // the iOS in-app viewer, we throw IosPdfOversizeError which bubbles to
    // the busy handler for proper cleanup and user-facing Alert.
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
    // Route handoff boundary.
    if (opts?.router) {
      recordPdfOpenStage({
        context: opts.openFlow,
        stage: "viewer_or_handoff_start",
        sourceKind: asset.sourceKind,
        extra: {
          route: "/pdf-viewer",
          sessionId: session.sessionId,
          previewPath: "session_viewer_contract",
          uriKind: extractUriScheme(asset.uri) || asset.sourceKind,
          uri: asset.uri,
          fileExists: typeof asset.sizeBytes === "number" ? true : undefined,
          fileSizeBytes: asset.sizeBytes,
        },
      });
      persistCriticalPdfBreadcrumb({
        marker: "document_prepare_done",
        screen: breadcrumbScreen,
        documentType: asset.documentType,
        originModule: asset.originModule,
        sourceKind: asset.sourceKind,
        uriKind: extractUriScheme(asset.uri) || asset.sourceKind,
        uri: asset.uri,
        fileName: asset.fileName,
        entityId: doc.entityId,
        sessionId: session.sessionId,
        openToken: opts.openFlow?.openToken,
        fileExists: typeof asset.sizeBytes === "number" ? true : undefined,
        fileSizeBytes: asset.sizeBytes,
        previewPath: "session_viewer_contract",
        extra: {
          route: "/pdf-viewer",
          checkpoint: "mobile_pre_navigation",
        },
      });
      const {
        safeSessionId,
        safeOpenToken,
        href: viewerHref,
      } = createViewerHref(session.sessionId, opts.openFlow?.openToken);
      if (__DEV__) console.info("[pdf-document-actions] about_to_navigate_to_viewer", {
        sessionId: safeSessionId,
        documentType: asset.documentType,
        originModule: asset.originModule,
        finalUri: asset.uri,
        finalScheme: extractUriScheme(asset.uri),
        finalSourceKind: asset.sourceKind,
        isLocalFile: /^file:\/\//i.test(String(asset.uri || "")),
        fileName: asset.fileName,
        routeParamsJson: JSON.stringify({
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
          uriKind: extractUriScheme(asset.uri) || asset.sourceKind,
          uri: asset.uri,
          fileName: asset.fileName,
          entityId: doc.entityId,
          sessionId: safeSessionId,
          openToken: safeOpenToken,
          fileExists: typeof asset.sizeBytes === "number" ? true : undefined,
          fileSizeBytes: asset.sizeBytes,
          previewPath: "session_viewer_contract",
          extra: {
            route: "/pdf-viewer",
            patchVersion: "v3",
          },
        });
        persistCriticalPdfBreadcrumb({
          marker: "viewer_patch_v3_before_navigation",
          screen: breadcrumbScreen,
          documentType: asset.documentType,
          originModule: asset.originModule,
          sourceKind: asset.sourceKind,
          uriKind: extractUriScheme(asset.uri) || asset.sourceKind,
          uri: asset.uri,
          fileName: asset.fileName,
          entityId: doc.entityId,
          sessionId: safeSessionId,
          openToken: safeOpenToken,
          fileExists: typeof asset.sizeBytes === "number" ? true : undefined,
          fileSizeBytes: asset.sizeBytes,
          previewPath: "session_viewer_contract",
          extra: {
            route: "/pdf-viewer",
            patchVersion: "v3",
          },
        });
        persistCriticalPdfBreadcrumb({
          marker: "viewer_route_push_attempt",
          screen: breadcrumbScreen,
          documentType: asset.documentType,
          originModule: asset.originModule,
          sourceKind: asset.sourceKind,
          uriKind: extractUriScheme(asset.uri) || asset.sourceKind,
          uri: asset.uri,
          fileName: asset.fileName,
          entityId: doc.entityId,
          sessionId: safeSessionId,
          openToken: safeOpenToken,
          fileExists: typeof asset.sizeBytes === "number" ? true : undefined,
          fileSizeBytes: asset.sizeBytes,
          previewPath: "session_viewer_contract",
          extra: {
            route: "/pdf-viewer",
          },
        });
        recordPdfOpenStage({
          context: opts.openFlow,
          stage: "viewer_route_push_attempt",
          sourceKind: asset.sourceKind,
          extra: {
            route: "/pdf-viewer",
            sessionId: safeSessionId,
            openToken: safeOpenToken,
            previewPath: "session_viewer_contract",
          },
        });
        persistCriticalPdfBreadcrumb({
          marker: "viewer_patch_v3_navigation_call",
          screen: breadcrumbScreen,
          documentType: asset.documentType,
          originModule: asset.originModule,
          sourceKind: asset.sourceKind,
          uriKind: extractUriScheme(asset.uri) || asset.sourceKind,
          uri: asset.uri,
          fileName: asset.fileName,
          entityId: doc.entityId,
          sessionId: safeSessionId,
          openToken: safeOpenToken,
          fileExists: typeof asset.sizeBytes === "number" ? true : undefined,
          fileSizeBytes: asset.sizeBytes,
          previewPath: "session_viewer_contract",
          extra: {
            route: "/pdf-viewer",
            patchVersion: "v3",
          },
        });
        opts?.assertCurrentRun?.("viewer_entry");
        recordBoundary("pdf_viewer_entry_started", "viewer_entry");
        await pushViewerRouteSafely(opts.router, viewerHref, opts?.onBeforeNavigate);
        recordBoundary("pdf_viewer_entry_confirmed", "viewer_entry");
        persistCriticalPdfBreadcrumb({
          marker: "viewer_route_pushed",
          screen: breadcrumbScreen,
          documentType: asset.documentType,
          originModule: asset.originModule,
          sourceKind: asset.sourceKind,
          uriKind: extractUriScheme(asset.uri) || asset.sourceKind,
          uri: asset.uri,
          fileName: asset.fileName,
          entityId: doc.entityId,
          sessionId: safeSessionId,
          openToken: safeOpenToken,
          fileExists: typeof asset.sizeBytes === "number" ? true : undefined,
          fileSizeBytes: asset.sizeBytes,
          previewPath: "session_viewer_contract",
          extra: {
            route: "/pdf-viewer",
          },
        });
        openObservation.success({
          sourceKind: asset.sourceKind,
          extra: {
            route: "/pdf-viewer",
            sessionId: safeSessionId,
          },
        });
        return;
      } catch (error) {
        recordPdfOpenStage({
          context: opts.openFlow,
          stage: "viewer_route_push_crash",
          result: "error",
          sourceKind: asset.sourceKind,
          error,
          extra: {
            route: "/pdf-viewer",
            sessionId: safeSessionId,
            openToken: safeOpenToken,
            previewPath: "session_viewer_contract",
          },
        });
        failPdfOpenVisible(opts.openFlow?.openToken, error, {
          sourceKind: asset.sourceKind,
          extra: {
            route: "/pdf-viewer",
            sessionId: safeSessionId,
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
          documentType: asset.documentType,
          originModule: asset.originModule,
          errorName:
            error && typeof error === "object" && "name" in error
              ? String((error as { name?: unknown }).name || "")
              : "",
          errorMessage: message,
        });
        throw lifecycleError instanceof Error
          ? lifecycleError
          : new Error(message);
      }
    }
    if (__DEV__) console.warn("[pdf-document-actions] preview_without_router_fallback", {
      documentType: asset.documentType,
      originModule: asset.originModule,
      finalUri: asset.uri,
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
  } catch (error) {
    recordBoundary("pdf_terminal_failure", "viewer_entry", "error", error);
    const lifecycleError = error;
    const message = getPdfFlowErrorMessage(
      lifecycleError,
      "PDF preview failed",
    );
    if (__DEV__) console.error("[pdf-document-actions] preview_failed", {
      stage: "preview_failed",
      platform: Platform.OS,
      documentType: doc.documentType,
      originModule: doc.originModule,
      fileName: doc.fileName,
      uri: doc.uri,
      errorName:
        error && typeof error === "object" && "name" in error
          ? String((error as { name?: unknown }).name || "")
          : "",
      errorMessage: message,
    });
    throw lifecycleError instanceof Error ? lifecycleError : new Error(message);
  }
}
export async function sharePdfDocument(doc: DocumentDescriptor): Promise<void> {
  const observation = beginPdfLifecycleObservation({
    screen: "reports",
    surface: "pdf_document_actions",
    event: "pdf_share_open",
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
  try {
    await openPdfShare(doc.fileSource.uri, doc.fileName);
    observation.success({
      extra: {
        openStrategy: "share_sheet",
      },
    });
  } catch (error) {
    throw observation.error(error, {
      fallbackMessage: "PDF share failed",
      extra: {
        openStrategy: "share_sheet",
      },
    });
  }
}
export async function prepareAndPreviewPdfDocument(
  args: PreparePdfDocumentArgs & {
    router?: PdfViewerRouterLike;
    /** Optional earlier tap timestamp used when descriptor/source creation happens before this boundary. */
    openFlowStartedAt?: number | null;
    /** Called before router.push to dismiss native Modals that sit above the navigation Stack. */
    onBeforeNavigate?: (() => void | Promise<void>) | null;
  },
): Promise<DocumentDescriptor> {
  const descriptorUri =
    args.descriptor.uri ?? args.descriptor.fileSource?.uri ?? null;
  const flowKey = createPdfActionBoundaryKey({
    key: args.key,
    documentType: args.descriptor.documentType,
    originModule: args.descriptor.originModule,
    entityId: args.descriptor.entityId ?? null,
    fileName: args.descriptor.fileName,
    uri: descriptorUri,
  });
  const runId = nextPdfActionRunId();
  const boundaryRun = createPdfActionBoundaryRun({
    runId,
    key: flowKey,
    label: args.label,
    documentType: args.descriptor.documentType,
    originModule: args.descriptor.originModule,
    entityId: args.descriptor.entityId ?? null,
    fileName: args.descriptor.fileName,
  });
  const baseContext = createPdfOpenFlowContext({
    key: flowKey,
    label: args.label,
    fileName: args.descriptor.fileName,
    entityId: args.descriptor.entityId ?? null,
    documentType: args.descriptor.documentType,
    originModule: args.descriptor.originModule,
    startedAt: args.openFlowStartedAt,
  });
  const recordBoundary = (
    event: string,
    stage: "access" | "prepare" | "viewer_entry" | "visibility",
    result: "success" | "error" | "joined_inflight" = "success",
    error?: unknown,
    extra?: Record<string, unknown>,
  ) => {
    recordPdfActionBoundaryEvent({
      run: boundaryRun,
      event,
      stage,
      result,
      sourceKind: args.descriptor.fileSource?.kind ?? "pdf:document",
      error,
      extra,
    });
  };
  if (flowKey) {
    const existing = activePreviewFlows.get(flowKey);
    const existingTs = activePreviewFlowTimestamps.get(flowKey) ?? existing?.startedAt ?? 0;
    const startPlan = resolvePdfDocumentOpenFlowStartPlan({
      flowKey,
      existingRunId: existing?.runId,
      existingStartedAt: existing?.startedAt,
      existingTimestamp: existingTs,
      nowMs: Date.now(),
      maxTtlMs: ACTIVE_FLOW_MAX_TTL_MS,
    });
    if (startPlan.action === "join_existing" && existing) {
      recordPdfOpenStage({
        context: baseContext,
        stage: "tap_start",
        result: "joined_inflight",
        extra: {
          guardReason: startPlan.guardReason,
        },
      });
      recordBoundary("pdf_action_started", "access", "joined_inflight", undefined, {
        duplicateStrategy: "join_inflight",
        joinedRunId: startPlan.joinedRunId,
      });
      return await existing.promise;
    }
    // D-MODAL-PDF: Stale flow entry (abandoned promise or TTL expired) — clean
    // up and proceed with a fresh open rather than blocking indefinitely.
    if (startPlan.action === "start_new" && startPlan.clearExisting) {
      activePreviewFlows.delete(flowKey);
      activePreviewFlowTimestamps.delete(flowKey);
    }
  }
  latestPreviewRunByKey.set(flowKey, runId);
  const assertCurrentRun = (stage: "prepare" | "viewer_entry" | "visibility") => {
    assertCurrentPdfActionRun(flowKey, runId, stage);
  };
  const runFlow = async () => {
    recordPdfOpenStage({
      context: baseContext,
      stage: "tap_start",
      extra: {
        hasBusyOwner: Boolean(args.busy?.run || args.busy?.show),
      },
    });
    recordBoundary("pdf_action_started", "access", "success", undefined, {
      hasBusyOwner: Boolean(args.busy?.run || args.busy?.show),
    });
    persistCriticalPdfBreadcrumb({
      marker: "tap_start",
      screen: args.descriptor.originModule,
      documentType: args.descriptor.documentType,
      originModule: args.descriptor.originModule,
      sourceKind: args.descriptor.fileSource?.kind ?? null,
      uriKind:
        extractUriScheme(args.descriptor.uri ?? args.descriptor.fileSource?.uri) || null,
      uri: args.descriptor.uri ?? args.descriptor.fileSource?.uri ?? null,
      fileName: args.descriptor.fileName,
      entityId: args.descriptor.entityId,
      previewPath: "document_open_orchestrator",
      extra: {
        hasBusyOwner: Boolean(args.busy?.run || args.busy?.show),
      },
    });
    const execute = async () => {
      recordPdfOpenStage({
        context: baseContext,
        stage: "busy_shown",
      });
      recordPdfOpenStage({
        context: baseContext,
        stage: "document_prepare_start",
      });
      recordBoundary("pdf_access_requested", "access");
      recordBoundary("pdf_document_prepare_started", "prepare");
      let document: DocumentDescriptor;
      try {
        document = await preparePdfDocument({
          ...args,
          busy: undefined,
        });
        assertCurrentRun("prepare");
        recordBoundary("pdf_access_resolved", "access", "success", undefined, {
          sourceKind: document.fileSource.kind,
        });
        recordBoundary("pdf_document_prepare_completed", "prepare", "success", undefined, {
          sourceKind: document.fileSource.kind,
        });
      } catch (error) {
        const boundaryError = toPdfActionBoundaryError(
          error,
          "prepare",
          "PDF document prepare failed",
        );
        recordPdfOpenStage({
          context: baseContext,
          stage: "document_prepare_fail",
          result: "error",
          sourceKind: args.descriptor.fileSource?.kind ?? "pdf:document",
          error: boundaryError,
          extra: {
            source:
              args.descriptor.uri ?? args.descriptor.fileSource?.uri ?? null,
          },
        });
        recordBoundary("pdf_terminal_failure", "prepare", "error", boundaryError);
        throw boundaryError;
      }
      const visibilityStartPlan = resolvePdfDocumentVisibilityStartPlan({
        hasRouter: Boolean(args.router),
      });
      const visibilityWait =
        visibilityStartPlan.action === "begin_visibility_wait"
          ? beginPdfOpenVisibilityWait(baseContext)
          : null;
      try {
        assertCurrentRun("prepare");
        await previewPdfDocument(document, {
          router: args.router,
          onBeforeNavigate: args.onBeforeNavigate,
          boundaryRun,
          assertCurrentRun,
          openFlow: visibilityWait
            ? {
                ...baseContext,
                openToken: visibilityWait.token,
              }
            : baseContext,
        });
        const visibilitySuccessPlan = resolvePdfDocumentVisibilitySuccessPlan({
          hasVisibilityWait: Boolean(visibilityWait),
        });
        if (visibilitySuccessPlan.action === "await_visibility_wait") {
          await visibilityWait!.promise;
          assertCurrentRun(visibilitySuccessPlan.assertStage);
        } else {
          recordPdfOpenStage({
            context: baseContext,
            stage: visibilitySuccessPlan.stage,
            sourceKind: document.fileSource.kind,
          });
          assertCurrentRun(visibilitySuccessPlan.assertStage);
        }
        recordBoundary("pdf_terminal_success", "visibility", "success", undefined, {
          sourceKind: document.fileSource.kind,
        });
        return document;
      } catch (error) {
        const boundaryError = toPdfActionBoundaryError(
          error,
          "visibility",
          "PDF viewer readiness failed",
        );
        const failureSignalPlan = resolvePdfDocumentVisibilityFailureSignalPlan({
          visibilityToken: visibilityWait?.token,
        });
        const signalledFailure =
          failureSignalPlan.action === "signal_visibility_failure"
            ? failPdfOpenVisible(failureSignalPlan.token, boundaryError, {
                sourceKind: document.fileSource.kind,
              })
            : false;
        const failureRecordPlan = resolvePdfDocumentVisibilityFailureRecordPlan({
          signalledFailure,
        });
        if (failureRecordPlan.recordOpenFailedStage) {
          recordPdfOpenStage({
            context: baseContext,
            stage: "open_failed",
            result: "error",
            sourceKind: document.fileSource.kind,
            error: boundaryError,
          });
        }
        recordBoundary("pdf_terminal_failure", "visibility", "error", boundaryError, {
          sourceKind: document.fileSource.kind,
        });
        throw boundaryError;
      }
    };
    const busyExecutionPlan = resolvePdfDocumentBusyExecutionPlan({
      hasBusyRun: Boolean(args.busy?.run),
      hasBusyShow: Boolean(args.busy?.show),
      hasBusyHide: Boolean(args.busy?.hide),
      flowKey,
      label: args.label,
    });
    try {
      if (busyExecutionPlan.mode === "busy_run" && args.busy?.run) {
        const output = await args.busy.run(execute, {
          key: busyExecutionPlan.key,
          label: busyExecutionPlan.label,
          minMs: busyExecutionPlan.minMs,
        });
        const outputPlan = resolvePdfDocumentBusyRunOutputPlan({
          hasOutput: Boolean(output),
        });
        if (outputPlan.action === "throw_cancelled") {
          throw new Error(outputPlan.message);
        }
        return output;
      }
      if (
        busyExecutionPlan.mode === "manual_busy" &&
        args.busy?.show &&
        args.busy?.hide
      ) {
        const manualBusyKey = busyExecutionPlan.key;
        args.busy.show(manualBusyKey, busyExecutionPlan.label);
        try {
          return await execute();
        } finally {
          const cleanupPlan = resolvePdfDocumentManualBusyCleanupPlan({
            isBusy: Boolean(args.busy.isBusy?.(manualBusyKey)),
          });
          if (cleanupPlan.hideBusy) {
            args.busy.hide(manualBusyKey);
          }
          recordPdfOpenStage({
            context: baseContext,
            stage: "busy_cleared",
          });
        }
      }
      return await execute();
    } finally {
      if (busyExecutionPlan.mode === "busy_run") {
        recordPdfOpenStage({
          context: baseContext,
          stage: "busy_cleared",
        });
      }
    }
  };
  const promise = runFlow().finally(() => {
    if (flowKey) {
      const active = activePreviewFlows.get(flowKey);
      const cleanupPlan = resolvePdfDocumentOpenFlowCleanupPlan({
        flowKey,
        activeRunId: active?.runId,
        latestRunId: latestPreviewRunByKey.get(flowKey),
        currentRunId: runId,
      });
      if (cleanupPlan.clearActiveFlow) {
        activePreviewFlows.delete(flowKey);
        activePreviewFlowTimestamps.delete(flowKey);
      }
      if (cleanupPlan.clearLatestRun) {
        latestPreviewRunByKey.delete(flowKey);
      }
    }
  });
  if (flowKey) {
    const startedAt = Date.now();
    activePreviewFlows.set(flowKey, {
      promise,
      runId,
      startedAt,
    });
    activePreviewFlowTimestamps.set(flowKey, Date.now());
  }
  return await promise;
}
export async function openPdfDocumentExternal(
  doc: DocumentDescriptor,
): Promise<void> {
  const observation = beginPdfLifecycleObservation({
    screen: "reports",
    surface: "pdf_document_actions",
    event: "pdf_external_open",
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
  try {
    await openPdfExternal(doc.fileSource.uri, doc.fileName);
    observation.success({
      extra: {
        openStrategy: "external",
      },
    });
  } catch (error) {
    throw observation.error(error, {
      fallbackMessage: "PDF external open failed",
      extra: {
        openStrategy: "external",
      },
    });
  }
}
