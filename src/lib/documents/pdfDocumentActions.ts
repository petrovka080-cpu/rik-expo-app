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
  recordPdfCrashBreadcrumbAsync,
  shouldRecordPdfCrashBreadcrumbs,
} from "../pdf/pdfCrashBreadcrumbs";

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
  descriptor: Omit<DocumentDescriptor, "uri"> & { uri?: string };
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
    hasRouter &&
    Platform.OS === "android" &&
    doc.fileSource.kind === "remote-url"
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
  if (typeof onBeforeNavigate === "function") {
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

    // InteractionManager.runAfterInteractions waits for ALL in-flight UI
    // transitions — screen animations, Modal dismiss animations, and any
    // other Animated interactions — to fully settle before executing the
    // navigation push. This is used on ALL platforms (not just iOS) to
    // guarantee the Modal is fully dismissed before the PDF viewer route
    // is pushed, without any hardcoded timing delays.
    if (typeof InteractionManager?.runAfterInteractions === "function") {
      InteractionManager.runAfterInteractions(runPush);
    } else {
      setTimeout(runPush, 0);
    }
  });
}

type PreviewPdfDocumentOpts = {
  router?: PdfViewerRouterLike;
  openFlow?: PdfOpenFlowContext & {
    openToken?: string;
  };
  /** Called before router.push — use to dismiss native Modals that sit above the navigation Stack. */
  onBeforeNavigate?: (() => void | Promise<void>) | null;
};

const activePreviewFlows = new Map<string, Promise<DocumentDescriptor>>();

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
}) {
  if (!shouldRecordPdfCrashBreadcrumbs(input.screen)) return null;
  return recordPdfCrashBreadcrumbAsync(input);
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
      minMs: 650,
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
      const preparedBreadcrumb = persistCriticalPdfBreadcrumb({
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
      if (preparedBreadcrumb) await preparedBreadcrumb;
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
        const patchActiveBreadcrumb = persistCriticalPdfBreadcrumb({
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
        if (patchActiveBreadcrumb) await patchActiveBreadcrumb;
        const patchBeforeNavigationBreadcrumb = persistCriticalPdfBreadcrumb({
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
        if (patchBeforeNavigationBreadcrumb)
          await patchBeforeNavigationBreadcrumb;
        const pushAttemptBreadcrumb = persistCriticalPdfBreadcrumb({
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
        if (pushAttemptBreadcrumb) await pushAttemptBreadcrumb;
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
        const patchNavigationCallBreadcrumb = persistCriticalPdfBreadcrumb({
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
        if (patchNavigationCallBreadcrumb) await patchNavigationCallBreadcrumb;
        await pushViewerRouteSafely(opts.router, viewerHref, opts?.onBeforeNavigate);
        const pushedBreadcrumb = persistCriticalPdfBreadcrumb({
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
        if (pushedBreadcrumb) await pushedBreadcrumb;
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
      const preparedBreadcrumb = persistCriticalPdfBreadcrumb({
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
      if (preparedBreadcrumb) await preparedBreadcrumb;
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
        const patchActiveBreadcrumb = persistCriticalPdfBreadcrumb({
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
        if (patchActiveBreadcrumb) await patchActiveBreadcrumb;
        const patchBeforeNavigationBreadcrumb = persistCriticalPdfBreadcrumb({
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
        if (patchBeforeNavigationBreadcrumb)
          await patchBeforeNavigationBreadcrumb;
        const pushAttemptBreadcrumb = persistCriticalPdfBreadcrumb({
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
        if (pushAttemptBreadcrumb) await pushAttemptBreadcrumb;
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
        const patchNavigationCallBreadcrumb = persistCriticalPdfBreadcrumb({
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
        if (patchNavigationCallBreadcrumb) await patchNavigationCallBreadcrumb;
        await pushViewerRouteSafely(opts.router, viewerHref, opts?.onBeforeNavigate);
        const pushedBreadcrumb = persistCriticalPdfBreadcrumb({
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
        if (pushedBreadcrumb) await pushedBreadcrumb;
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
      await openPdfPreview(asset.uri, asset.fileName);
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
    /** Called before router.push — use to dismiss native Modals that sit above the navigation Stack. */
    onBeforeNavigate?: (() => void | Promise<void>) | null;
  },
): Promise<DocumentDescriptor> {
  const flowKey = String(args.key || "").trim();
  const baseContext = createPdfOpenFlowContext({
    key: args.key,
    label: args.label,
    fileName: args.descriptor.fileName,
    entityId: args.descriptor.entityId ?? null,
    documentType: args.descriptor.documentType,
    originModule: args.descriptor.originModule,
  });

  if (flowKey) {
    const existing = activePreviewFlows.get(flowKey);
    if (existing) {
      recordPdfOpenStage({
        context: baseContext,
        stage: "tap_start",
        result: "joined_inflight",
        extra: {
          guardReason: "owner_already_inflight",
        },
      });
      return await existing;
    }
  }

  const runFlow = async () => {
    recordPdfOpenStage({
      context: baseContext,
      stage: "tap_start",
      extra: {
        hasBusyOwner: Boolean(args.busy?.run || args.busy?.show),
      },
    });
    const tapBreadcrumb = persistCriticalPdfBreadcrumb({
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
    if (tapBreadcrumb) await tapBreadcrumb;

    const execute = async () => {
      recordPdfOpenStage({
        context: baseContext,
        stage: "busy_shown",
      });
      recordPdfOpenStage({
        context: baseContext,
        stage: "document_prepare_start",
      });

      let document: DocumentDescriptor;
      try {
        document = await preparePdfDocument({
          ...args,
          busy: undefined,
        });
      } catch (error) {
        recordPdfOpenStage({
          context: baseContext,
          stage: "document_prepare_fail",
          result: "error",
          sourceKind: args.descriptor.fileSource?.kind ?? "pdf:document",
          error,
          extra: {
            source:
              args.descriptor.uri ?? args.descriptor.fileSource?.uri ?? null,
          },
        });
        throw error;
      }

      const visibilityWait = args.router
        ? beginPdfOpenVisibilityWait(baseContext)
        : null;

      try {
        await previewPdfDocument(document, {
          router: args.router,
          onBeforeNavigate: args.onBeforeNavigate,
          openFlow: visibilityWait
            ? {
                ...baseContext,
                openToken: visibilityWait.token,
              }
            : baseContext,
        });
        if (visibilityWait) {
          await visibilityWait.promise;
        } else {
          recordPdfOpenStage({
            context: baseContext,
            stage: "first_open_visible",
            sourceKind: document.fileSource.kind,
          });
        }
        return document;
      } catch (error) {
        const signalledFailure = failPdfOpenVisible(
          visibilityWait?.token,
          error,
          {
            sourceKind: document.fileSource.kind,
          },
        );
        if (!signalledFailure) {
          recordPdfOpenStage({
            context: baseContext,
            stage: "open_failed",
            result: "error",
            sourceKind: document.fileSource.kind,
            error,
          });
        }
        throw error;
      }
    };

    try {
      if (args.busy?.run) {
        const output = await args.busy.run(execute, {
          key: args.key,
          label: args.label,
          minMs: 650,
        });
        if (!output) throw new Error("PDF open cancelled");
        return output;
      }

      if (args.busy?.show && args.busy?.hide) {
        const manualBusyKey = flowKey || "pdf:open";
        args.busy.show(manualBusyKey, args.label);
        try {
          return await execute();
        } finally {
          if (args.busy.isBusy?.(manualBusyKey)) {
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
      if (args.busy?.run) {
        recordPdfOpenStage({
          context: baseContext,
          stage: "busy_cleared",
        });
      }
    }
  };

  const promise = runFlow().finally(() => {
    if (flowKey) activePreviewFlows.delete(flowKey);
  });

  if (flowKey) activePreviewFlows.set(flowKey, promise);
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