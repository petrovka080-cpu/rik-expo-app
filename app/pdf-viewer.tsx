import React from "react";
import { Platform, useWindowDimensions } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  failDocumentSession,
  getDocumentSessionSnapshot,
  touchDocumentSession,
  type DocumentAsset,
} from "../src/lib/documents/pdfDocumentSessions";
import { FALLBACK_ROUTE } from "../src/lib/pdf/pdfViewer.constants";
import { getReadAccessParentUri } from "../src/lib/pdf/pdfViewerContract";
import { normalizePdfViewerError } from "../src/lib/pdf/pdfViewer.error";
import { createPdfViewerRenderInstanceKey } from "../src/lib/pdf/pdfViewerRenderLifecycle";
import {
  type PdfViewerRenderBreadcrumbCommand,
  type PdfViewerRenderConsoleCommand,
  resolvePdfViewerNativeErrorEventPlan,
  resolvePdfViewerNativeHttpErrorEventPlan,
  resolvePdfViewerNativeLoadEndEventPlan,
  resolvePdfViewerNativeLoadStartEventPlan,
  resolvePdfViewerWebIframeErrorEventPlan,
  resolvePdfViewerWebIframeLoadEventPlan,
  shouldCommitPdfViewerRenderEvent,
} from "../src/lib/pdf/pdfViewerRenderEventGuard";
import {
  armPdfViewerLoadingTimeout,
  cancelPdfViewerLoadingTimeout,
  shouldCommitPdfViewerLoadingTimeout,
} from "../src/lib/pdf/pdfViewerLoadingTimeoutGuard";
import {
  resolvePdfViewerManualHandoffPlan,
  resolvePdfViewerHandoffPlan,
} from "../src/lib/pdf/pdfViewer.handoffPlan";
import {
  getUriScheme,
  inspectLocalPdfFile,
  validateEmbeddedPreviewResolution,
  FileSystemCompat,
} from "../src/lib/pdf/pdfViewer.helpers";
import { resolvePdfViewerNativeWebView } from "../src/lib/pdf/pdfViewer.nativeWebView";
import {
  resolvePdfViewerOpenFailedSignalPlan,
  resolvePdfViewerOpenVisibleSignalPlan,
} from "../src/lib/pdf/pdfViewerOpenSignalPlan";
import { PdfViewerScreenContent } from "../src/lib/pdf/PdfViewerScreenContent";
import {
  resolvePdfViewerChromeModel,
  resolvePdfViewerContentModel,
  resolvePdfViewerReadinessModel,
} from "../src/lib/pdf/pdfViewer.readiness";
import {
  resolvePdfViewerRouteModel,
  resolvePdfViewerSnapshot,
} from "../src/lib/pdf/pdfViewer.route";
import { styles } from "../src/lib/pdf/pdfViewer.styles";
import {
  planPdfViewerLoadingTransition,
  planPdfViewerTimeoutTransition,
  usePdfViewerOrchestrator,
} from "../src/lib/pdf/usePdfViewerOrchestrator";
import { resolvePdfViewerWebIframeReadyFallbackPlan } from "../src/lib/pdf/pdfViewerWebIframeReadyFallback";
import { resolvePdfViewerWebRenderUriCleanup } from "../src/lib/pdf/pdfViewerWebRenderUriCleanup";
import { usePdfViewerActions } from "../src/lib/pdf/usePdfViewerActions";
import {
  recordPdfCrashBreadcrumbAsync,
  shouldRecordPdfCrashBreadcrumbs,
} from "../src/lib/pdf/pdfCrashBreadcrumbs";
import { recordPdfCriticalPathEvent } from "../src/lib/pdf/pdfCriticalPath";
import {
  beginPdfNativeHandoff,
  completePdfNativeHandoff,
  createPdfNativeHandoffKey,
} from "../src/lib/pdf/pdfNativeHandoffGuard";
import {
  planPdfNativeHandoffErrorCompletion,
  planPdfNativeHandoffStart,
  planPdfNativeHandoffSuccessCompletion,
  resolvePdfNativeHandoffDuplicateSkipCommandPlan,
  resolvePdfNativeHandoffErrorCommandPlan,
  resolvePdfNativeHandoffStartCommandPlan,
  resolvePdfNativeHandoffSuccessTelemetryPlan,
} from "../src/lib/pdf/pdfNativeHandoffPlan";
import {
  failPdfOpenVisible,
  markPdfOpenRouteMounted,
  markPdfOpenVisible,
} from "../src/lib/pdf/pdfOpenFlow";
import { openPdfPreview } from "../src/lib/pdfRunner";
import { recordCatchDiscipline } from "../src/lib/observability/catchDiscipline";
import { safeBack } from "../src/lib/navigation/safeBack";
import { redactSensitiveRecord, redactSensitiveText } from "../src/lib/security/redaction";
import { withScreenErrorBoundary } from "../src/shared/ui/ScreenErrorBoundary";

const getCurrentViewerPlatform = () =>
  Platform.OS === "web" ? "web" : Platform.OS === "android" ? "android" : "ios";

const redactPdfViewerConsolePayload = (payload: Record<string, unknown>) =>
  redactSensitiveRecord(payload) ?? {};

const logPdfViewerInfo = (label: string, payload: Record<string, unknown>) => {
  console.info(label, redactPdfViewerConsolePayload(payload));
};

const logPdfViewerError = (label: string, payload: Record<string, unknown>) => {
  console.error(label, redactPdfViewerConsolePayload(payload));
};

const emitPdfViewerRenderConsoleCommand = (
  command?: PdfViewerRenderConsoleCommand,
) => {
  if (!command) return;
  if (command.level === "error") {
    logPdfViewerError(command.label, command.payload);
    return;
  }
  logPdfViewerInfo(command.label, command.payload);
};

const emitPdfViewerRenderBreadcrumbCommands = (
  recordViewerBreadcrumb: (
    marker: string,
    overrides?: PdfViewerRenderBreadcrumbCommand["payload"],
  ) => void,
  commands?: PdfViewerRenderBreadcrumbCommand[],
) => {
  for (const command of commands ?? []) {
    recordViewerBreadcrumb(command.marker, command.payload);
  }
};

console.info("[pdf-viewer] module_loaded", { platform: Platform.OS });

function PdfViewerScreen() {
  console.info("[pdf-viewer] viewer_screen_enter", { platform: Platform.OS });
  const params = useLocalSearchParams<{
    sessionId?: string;
    openToken?: string;
    uri?: string;
    fileName?: string;
    title?: string;
    sourceKind?: string;
    documentType?: string;
    originModule?: string;
    source?: string;
    entityId?: string;
  }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const viewerPlatform = getCurrentViewerPlatform();
  const nativePdfWebView = resolvePdfViewerNativeWebView();
  const routeSessionId = params.sessionId;
  const routeOpenToken = params.openToken;
  const routeUri = params.uri;
  const routeFileName = params.fileName;
  const routeTitle = params.title;
  const routeSourceKind = params.sourceKind;
  const routeDocumentType = params.documentType;
  const routeOriginModule = params.originModule;
  const routeSource = params.source;
  const routeEntityId = params.entityId;

  const route = React.useMemo(
    () =>
      resolvePdfViewerRouteModel({
        sessionId: routeSessionId,
        openToken: routeOpenToken,
        uri: routeUri,
        fileName: routeFileName,
        title: routeTitle,
        sourceKind: routeSourceKind,
        documentType: routeDocumentType,
        originModule: routeOriginModule,
        source: routeSource,
        entityId: routeEntityId,
      }),
    [
      routeDocumentType,
      routeEntityId,
      routeFileName,
      routeOpenToken,
      routeOriginModule,
      routeSessionId,
      routeSource,
      routeSourceKind,
      routeTitle,
      routeUri,
    ],
  );
  const sessionId = route.sessionId;
  const openToken = route.openToken;

  logPdfViewerInfo("[pdf-viewer] viewer_params_parsed", {
    platform: Platform.OS,
    sessionId: route.receivedSessionId,
    openToken: route.openToken || null,
    hasUri: route.hasUri,
  });

  const resolveSnapshot = React.useCallback(
    () =>
      resolvePdfViewerSnapshot({
        route,
        registrySnapshot: getDocumentSessionSnapshot(sessionId),
      }),
    [route, sessionId],
  );
  const snapshot = React.useMemo(() => resolveSnapshot(), [resolveSnapshot]);

  logPdfViewerInfo("[pdf-viewer] viewer_snapshot_resolved", {
    platform: Platform.OS,
    hasSession: Boolean(snapshot.session),
    hasAsset: Boolean(snapshot.asset),
    sessionId: snapshot.session?.sessionId ?? null,
    assetUri: snapshot.asset?.uri?.slice(-40) ?? null,
    sourceKind: snapshot.asset?.sourceKind ?? null,
  });

  const initialReadinessModel = React.useMemo(
    () =>
      resolvePdfViewerReadinessModel({
        session: snapshot.session,
        asset: snapshot.asset,
        platform: viewerPlatform,
      }),
    [snapshot.asset, snapshot.session, viewerPlatform],
  );

  const [menuOpen, setMenuOpen] = React.useState(false);
  const [chromeVisible, setChromeVisible] = React.useState(true);
  const loadingTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const webIframeReadyFallbackRef = React.useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  const orchestrator = usePdfViewerOrchestrator({
    initialSession: snapshot.session,
    initialAsset: snapshot.asset,
    initialState: initialReadinessModel.initialState,
    initialErrorText: snapshot.session?.errorMessage || "",
  });
  const {
    session,
    setSession,
    asset,
    setAsset,
    state,
    setState,
    errorText,
    setErrorText,
    isReadyToRender,
    setIsReadyToRender,
    nativeHandoffCompleted,
    loadAttempt,
    webRenderUri,
    setWebRenderUri,
    openedAtRef,
    isMountedRef,
    renderFailedRef,
    readyCommittedRef,
    webRenderUriRef,
    viewerCycleRef,
    openSignalSettledRef,
    webIframeRenderLoggedKeyRef,
    activeRenderInstanceKeyRef,
    nativeHandoffGuardRef,
    loadingTimeoutGuardRef,
    resetOpenAttemptGuards,
    beginBootstrapCycle,
    commitEmptyState,
    commitLoadingState,
    commitErrorState,
    claimReadyCommit,
    commitReadyState,
    resetForNativeHandoffStart,
    commitNativeHandoffCompleted,
    retry: retryViewerOrchestrator,
    planRenderEventCommit,
  } = orchestrator;

  const readinessModel = React.useMemo(
    () =>
      resolvePdfViewerReadinessModel({
        session,
        asset,
        platform: viewerPlatform,
      }),
    [asset, session, viewerPlatform],
  );
  const resolvedSource = readinessModel.resolvedSource;
  const resolvedPreviewPath = readinessModel.previewPath;

  const diagnosticsScreen = React.useMemo(() => {
    const origin = String(
      asset?.originModule ??
        snapshot.asset?.originModule ??
        route.originModule ??
        "",
    )
      .trim()
      .toLowerCase();
    return shouldRecordPdfCrashBreadcrumbs(origin) ? origin : null;
  }, [asset?.originModule, route.originModule, snapshot.asset?.originModule]);

  const recordViewerBreadcrumb = React.useCallback(
    (
      marker: string,
      overrides?: {
        uri?: string | null;
        uriKind?: string | null;
        sourceKind?: string | null;
        fileExists?: boolean | null;
        fileSizeBytes?: number | null;
        previewPath?: string | null;
        errorMessage?: string | null;
        terminalState?: "success" | "error" | null;
        extra?: Record<string, unknown>;
      },
    ) => {
      if (!diagnosticsScreen) return;
      const currentAsset = asset ?? snapshot.asset ?? null;
      const uri = overrides?.uri ?? currentAsset?.uri ?? null;
      void recordPdfCrashBreadcrumbAsync({
        marker,
        screen: diagnosticsScreen,
        documentType: currentAsset?.documentType ?? route.documentType,
        originModule: currentAsset?.originModule ?? route.originModule,
        sourceKind:
          overrides?.sourceKind ??
          currentAsset?.sourceKind ??
          route.sourceKind,
        uriKind: overrides?.uriKind ?? getUriScheme(uri),
        uri,
        fileName: currentAsset?.fileName ?? route.fileName,
        entityId: currentAsset?.entityId ?? route.entityId,
        sessionId,
        openToken,
        fileExists: overrides?.fileExists,
        fileSizeBytes: overrides?.fileSizeBytes,
        previewPath: overrides?.previewPath ?? resolvedPreviewPath,
        errorMessage: overrides?.errorMessage,
        terminalState: overrides?.terminalState ?? null,
        extra: overrides?.extra,
      });
    },
    [
      diagnosticsScreen,
      asset,
      snapshot.asset,
      route.documentType,
      route.originModule,
      route.sourceKind,
      route.fileName,
      route.entityId,
      sessionId,
      openToken,
      resolvedPreviewPath,
    ],
  );

  const clearWebIframeReadyFallback = React.useCallback(() => {
    if (webIframeReadyFallbackRef.current) {
      clearTimeout(webIframeReadyFallbackRef.current);
      webIframeReadyFallbackRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    resetOpenAttemptGuards();
    clearWebIframeReadyFallback();
  }, [
    clearWebIframeReadyFallback,
    loadAttempt,
    openToken,
    resetOpenAttemptGuards,
    sessionId,
  ]);

  const clearWebRenderUri = React.useCallback(
    (options?: { commitState?: boolean }) => {
      const current = webRenderUriRef.current;
      const cleanup = resolvePdfViewerWebRenderUriCleanup({
        platform: Platform.OS,
        uri: current,
        commitState: options?.commitState,
      });
      if (
        cleanup.revokeUri &&
        typeof URL !== "undefined" &&
        typeof URL.revokeObjectURL === "function"
      ) {
        try {
          URL.revokeObjectURL(cleanup.revokeUri);
        } catch (error) {
          recordCatchDiscipline({
            screen: "reports",
            surface: "pdf_viewer",
            event: "viewer_blob_revoke_failed",
            kind: "cleanup_only",
            error,
            category: "reload",
            sourceKind: "pdf:viewer",
            errorStage: "open_view",
            extra: {
              sourceKind: "blob",
            },
          });
        }
      }
      webRenderUriRef.current = null;
      if (cleanup.shouldCommitState) setWebRenderUri(null);
    },
    [setWebRenderUri, webRenderUriRef],
  );

  React.useEffect(() => {
    return () => {
      clearWebRenderUri({ commitState: false });
    };
  }, [clearWebRenderUri]);

  React.useEffect(() => {
    logPdfViewerInfo("[pdf-viewer] viewer_route_mounted", {
      platform: Platform.OS,
      sessionId,
      receivedSessionId: route.receivedSessionId,
      initialUri: snapshot.asset?.uri ?? route.uri,
      initialScheme: getUriScheme(snapshot.asset?.uri),
    });
    recordViewerBreadcrumb("viewer_route_mounted", {
      uri: snapshot.asset?.uri ?? route.uri,
      uriKind: getUriScheme(snapshot.asset?.uri ?? route.uri),
      sourceKind: snapshot.asset?.sourceKind ?? route.sourceKind ?? null,
      previewPath: "viewer_route",
      extra: {
        receivedSessionId: route.receivedSessionId,
      },
    });
    recordPdfCriticalPathEvent({
      event: "pdf_viewer_mounted",
      screen: diagnosticsScreen ?? "pdf_viewer",
      sourceKind: snapshot.asset?.sourceKind ?? route.sourceKind ?? null,
      documentType: snapshot.asset?.documentType ?? route.documentType,
      originModule: snapshot.asset?.originModule ?? route.originModule,
      entityId: snapshot.asset?.entityId ?? route.entityId,
      fileName: snapshot.asset?.fileName ?? route.fileName,
      sessionId,
      openToken,
      uri: snapshot.asset?.uri ?? route.uri,
      uriKind: getUriScheme(snapshot.asset?.uri ?? route.uri),
      previewPath: "viewer_route",
      extra: {
        receivedSessionId: route.receivedSessionId,
      },
    });
    markPdfOpenRouteMounted(openToken, {
      sourceKind: snapshot.asset?.sourceKind ?? route.sourceKind ?? null,
      extra: {
        route: "/pdf-viewer",
        sessionId,
        receivedSessionId: route.receivedSessionId,
        documentType: snapshot.asset?.documentType ?? route.documentType,
        originModule: snapshot.asset?.originModule ?? route.originModule,
        uriKind: getUriScheme(snapshot.asset?.uri ?? route.uri),
      },
    });
  }, [
    diagnosticsScreen,
    openToken,
    recordViewerBreadcrumb,
    route.documentType,
    route.entityId,
    route.fileName,
    route.originModule,
    route.receivedSessionId,
    route.sourceKind,
    route.uri,
    sessionId,
    snapshot.asset?.documentType,
    snapshot.asset?.entityId,
    snapshot.asset?.fileName,
    snapshot.asset?.originModule,
    snapshot.asset?.sourceKind,
    snapshot.asset?.uri,
  ]);

  const syncSnapshot = React.useCallback(() => {
    const next = resolveSnapshot();
    setSession((prev) =>
      prev?.sessionId === next.session?.sessionId &&
      prev?.status === next.session?.status &&
      prev?.errorMessage === next.session?.errorMessage
        ? prev
        : next.session,
    );
    setAsset((prev) =>
      prev?.assetId === next.asset?.assetId && prev?.uri === next.asset?.uri
        ? prev
        : next.asset,
    );
    setErrorText(next.session?.errorMessage || "");
    setState((prev) => {
      const nextState = resolvePdfViewerReadinessModel({
        session: next.session,
        asset: next.asset,
        platform: viewerPlatform,
      }).initialState;
      return prev === nextState ? prev : nextState;
    });
    return next;
  }, [
    resolveSnapshot,
    setAsset,
    setErrorText,
    setSession,
    setState,
    viewerPlatform,
  ]);

  const clearLoadingTimeout = React.useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    cancelPdfViewerLoadingTimeout(loadingTimeoutGuardRef.current);
  }, [loadingTimeoutGuardRef]);

  const signalOpenVisible = React.useCallback(
    (resolvedAsset?: DocumentAsset | null, extra?: Record<string, unknown>) => {
      const signalPlan = resolvePdfViewerOpenVisibleSignalPlan({
        openToken,
        alreadySettled: openSignalSettledRef.current,
        sessionId,
        asset: resolvedAsset,
        extra,
      });
      if (signalPlan.action !== "emit_visible") return;
      openSignalSettledRef.current = true;
      markPdfOpenVisible(signalPlan.openToken, {
        sourceKind: signalPlan.sourceKind,
        extra: signalPlan.extra,
      });
    },
    [openSignalSettledRef, openToken, sessionId],
  );

  const signalOpenFailed = React.useCallback(
    (message: string, extra?: Record<string, unknown>) => {
      const signalPlan = resolvePdfViewerOpenFailedSignalPlan({
        openToken,
        alreadySettled: openSignalSettledRef.current,
        sessionId,
        message,
        asset: {
          sourceKind: asset?.sourceKind,
          documentType: asset?.documentType,
          originModule: asset?.originModule,
          fileName: asset?.fileName,
        },
        extra,
      });
      if (signalPlan.action !== "emit_failed") return;
      openSignalSettledRef.current = true;
      failPdfOpenVisible(signalPlan.openToken, new Error(signalPlan.message), {
        sourceKind: signalPlan.sourceKind,
        extra: signalPlan.extra,
      });
    },
    [
      asset?.documentType,
      asset?.fileName,
      asset?.originModule,
      asset?.sourceKind,
      openSignalSettledRef,
      openToken,
      sessionId,
    ],
  );

  const markError = React.useCallback(
    (
      message: string,
      phase: "resolution" | "render" | "timeout" | "action" = "render",
    ) => {
      const normalizedError = normalizePdfViewerError({
        error: message,
        phase,
      });
      clearWebIframeReadyFallback();
      clearLoadingTimeout();
      commitErrorState(normalizedError.message);
      if (sessionId) failDocumentSession(sessionId, normalizedError.message);
      const next = syncSnapshot();
      if (next.asset) {
        const scheme = String(next.asset.uri || "").split(":")[0] || "unknown";
        logPdfViewerError("[pdf-viewer] load_error", {
          documentType: next.asset.documentType,
          originModule: next.asset.originModule,
          scheme,
          platform: Platform.OS,
          phase,
          error: redactSensitiveText(normalizedError.message),
        });
      }
      recordViewerBreadcrumb("viewer_terminal_error", {
        uri: next.asset?.uri ?? null,
        uriKind: getUriScheme(next.asset?.uri),
        sourceKind: next.asset?.sourceKind ?? null,
        fileSizeBytes: next.asset?.sizeBytes,
        fileExists: typeof next.asset?.sizeBytes === "number" ? true : null,
        errorMessage: normalizedError.message,
        terminalState: "error",
        extra: {
          phase,
          kind: normalizedError.kind,
        },
      });
      if (phase === "render") {
        recordPdfCriticalPathEvent({
          event: "pdf_render_fail",
          screen: next.asset?.originModule ?? diagnosticsScreen ?? "pdf_viewer",
          result: "error",
          sourceKind: next.asset?.sourceKind ?? "pdf:viewer",
          error: new Error(normalizedError.message),
          documentType: next.asset?.documentType ?? route.documentType,
          originModule: next.asset?.originModule ?? route.originModule,
          entityId: next.asset?.entityId ?? route.entityId,
          fileName: next.asset?.fileName ?? route.fileName,
          sessionId,
          openToken,
          uri: next.asset?.uri ?? null,
          uriKind: getUriScheme(next.asset?.uri),
          previewPath: resolvedPreviewPath,
          extra: {
            phase,
            kind: normalizedError.kind,
          },
        });
      }
      recordPdfCriticalPathEvent({
        event: "pdf_terminal_fail",
        screen: next.asset?.originModule ?? diagnosticsScreen ?? "pdf_viewer",
        result: "error",
        sourceKind: next.asset?.sourceKind ?? "pdf:viewer",
        error: new Error(normalizedError.message),
        documentType: next.asset?.documentType ?? route.documentType,
        originModule: next.asset?.originModule ?? route.originModule,
        entityId: next.asset?.entityId ?? route.entityId,
        fileName: next.asset?.fileName ?? route.fileName,
        sessionId,
        openToken,
        uri: next.asset?.uri ?? null,
        uriKind: getUriScheme(next.asset?.uri),
        previewPath: resolvedPreviewPath,
        terminalState: "error",
        extra: {
          phase,
          kind: normalizedError.kind,
        },
      });
      signalOpenFailed(normalizedError.message, {
        phase,
        kind: normalizedError.kind,
      });
    },
    [
      clearLoadingTimeout,
      clearWebIframeReadyFallback,
      commitErrorState,
      diagnosticsScreen,
      openToken,
      recordViewerBreadcrumb,
      resolvedPreviewPath,
      route.documentType,
      route.entityId,
      route.fileName,
      route.originModule,
      sessionId,
      signalOpenFailed,
      syncSnapshot,
    ],
  );

  const enterLoading = React.useCallback(() => {
    clearLoadingTimeout();
    const next = syncSnapshot();
    const loadingPlan = planPdfViewerLoadingTransition({
      hasSession: Boolean(next.session),
    });
    if (loadingPlan.action === "show_empty") {
      commitEmptyState();
      return;
    }
    touchDocumentSession(next.session.sessionId);
    commitLoadingState();
    const timeoutCycle = armPdfViewerLoadingTimeout(
      loadingTimeoutGuardRef.current,
    );
    loadingTimeoutRef.current = setTimeout(() => {
      const timeoutPlan = planPdfViewerTimeoutTransition({
        shouldCommit: shouldCommitPdfViewerLoadingTimeout(
          loadingTimeoutGuardRef.current,
          timeoutCycle,
        ),
      });
      if (timeoutPlan.action === "skip_timeout") {
        return;
      }
      markError("Document loading timed out.", "timeout");
    }, 15000);
  }, [
    clearLoadingTimeout,
    commitEmptyState,
    commitLoadingState,
    loadingTimeoutGuardRef,
    markError,
    syncSnapshot,
  ]);

  const markReady = React.useCallback(() => {
    if (claimReadyCommit().action !== "commit_ready") return;
    clearWebIframeReadyFallback();
    clearLoadingTimeout();
    const next = syncSnapshot();
    commitReadyState();
    if (next.session) touchDocumentSession(next.session.sessionId);
    signalOpenVisible(next.asset, {
      route: "/pdf-viewer",
      state: "ready",
    });
    if (next.asset) {
      console.info("[pdf-viewer] ready", {
        documentType: next.asset.documentType,
        originModule: next.asset.originModule,
        ms: Date.now() - openedAtRef.current,
      });
    }
    recordViewerBreadcrumb("viewer_terminal_success", {
      uri: next.asset?.uri ?? null,
      uriKind: getUriScheme(next.asset?.uri),
      sourceKind: next.asset?.sourceKind ?? null,
      fileSizeBytes: next.asset?.sizeBytes,
      fileExists: typeof next.asset?.sizeBytes === "number" ? true : null,
      terminalState: "success",
      extra: {
        state: "ready",
      },
    });
    recordPdfCriticalPathEvent({
      event: "pdf_render_success",
      screen: next.asset?.originModule ?? diagnosticsScreen ?? "pdf_viewer",
      sourceKind: next.asset?.sourceKind ?? "pdf:viewer",
      documentType: next.asset?.documentType ?? route.documentType,
      originModule: next.asset?.originModule ?? route.originModule,
      entityId: next.asset?.entityId ?? route.entityId,
      fileName: next.asset?.fileName ?? route.fileName,
      sessionId,
      openToken,
      uri: next.asset?.uri ?? null,
      uriKind: getUriScheme(next.asset?.uri),
      previewPath: resolvedPreviewPath,
      extra: {
        state: "ready",
      },
    });
    recordPdfCriticalPathEvent({
      event: "pdf_terminal_success",
      screen: next.asset?.originModule ?? diagnosticsScreen ?? "pdf_viewer",
      sourceKind: next.asset?.sourceKind ?? "pdf:viewer",
      documentType: next.asset?.documentType ?? route.documentType,
      originModule: next.asset?.originModule ?? route.originModule,
      entityId: next.asset?.entityId ?? route.entityId,
      fileName: next.asset?.fileName ?? route.fileName,
      sessionId,
      openToken,
      uri: next.asset?.uri ?? null,
      uriKind: getUriScheme(next.asset?.uri),
      previewPath: resolvedPreviewPath,
      terminalState: "success",
      extra: {
        state: "ready",
      },
    });
  }, [
    clearLoadingTimeout,
    clearWebIframeReadyFallback,
    claimReadyCommit,
    commitReadyState,
    diagnosticsScreen,
    openToken,
    openedAtRef,
    recordViewerBreadcrumb,
    resolvedPreviewPath,
    route.documentType,
    route.entityId,
    route.fileName,
    route.originModule,
    sessionId,
    signalOpenVisible,
    syncSnapshot,
  ]);

  const scheduleWebIframeReadyFallback = React.useCallback(
    (args: {
      resolvedAsset: DocumentAsset;
      renderUri: string;
      sourceKind: string;
    }) => {
      const fallbackPlan = resolvePdfViewerWebIframeReadyFallbackPlan({
        platform: viewerPlatform,
        sourceKind: args.sourceKind,
        renderUri: args.renderUri,
      });
      if (fallbackPlan.action !== "schedule_ready_fallback") return;

      clearWebIframeReadyFallback();
      const cycle = viewerCycleRef.current;
      webIframeReadyFallbackRef.current = setTimeout(() => {
        webIframeReadyFallbackRef.current = null;
        if (
          !isMountedRef.current ||
          renderFailedRef.current ||
          readyCommittedRef.current ||
          viewerCycleRef.current !== cycle ||
          webRenderUriRef.current !== args.renderUri
        ) {
          return;
        }
        const latest = syncSnapshot();
        if (latest.asset?.assetId !== args.resolvedAsset.assetId) return;
        logPdfViewerInfo("[pdf-viewer] web_iframe_ready_fallback", {
          sessionId: latest.session?.sessionId ?? sessionId,
          documentType: args.resolvedAsset.documentType,
          originModule: args.resolvedAsset.originModule,
          uri: args.renderUri,
          delayMs: fallbackPlan.delayMs,
          reason: fallbackPlan.reason,
        });
        recordViewerBreadcrumb("web_iframe_ready_fallback", {
          uri: args.renderUri,
          uriKind: getUriScheme(args.renderUri),
          sourceKind: args.sourceKind,
          previewPath: "web-frame",
          extra: {
            delayMs: fallbackPlan.delayMs,
            reason: fallbackPlan.reason,
          },
        });
        markReady();
      }, fallbackPlan.delayMs);
    },
    [
      clearWebIframeReadyFallback,
      isMountedRef,
      markReady,
      recordViewerBreadcrumb,
      readyCommittedRef,
      renderFailedRef,
      sessionId,
      syncSnapshot,
      viewerCycleRef,
      viewerPlatform,
      webRenderUriRef,
    ],
  );

  const handoffPdfPreview = React.useCallback(
    async (resolvedAsset: DocumentAsset, trigger: "primary" | "manual") => {
      const handoffContext = {
        diagnosticsScreen,
        openToken,
        sessionId,
        uriKind: getUriScheme(resolvedAsset.uri),
      };
      const handoffKey = createPdfNativeHandoffKey({
        assetId: resolvedAsset.assetId,
        sessionId,
        uri: resolvedAsset.uri,
      });
      const startPlan =
        trigger === "primary"
          ? planPdfNativeHandoffStart({
              trigger,
              guardDecision: beginPdfNativeHandoff(
                nativeHandoffGuardRef.current,
                handoffKey,
              ),
            })
          : planPdfNativeHandoffStart({ trigger });
      if (startPlan.action === "mark_ready") {
        markReady();
        return;
      }
      if (startPlan.action === "record_duplicate_skip") {
        const duplicatePlan = resolvePdfNativeHandoffDuplicateSkipCommandPlan({
          startPlan,
          asset: resolvedAsset,
          context: handoffContext,
        });
        logPdfViewerInfo(duplicatePlan.console.label, duplicatePlan.console.payload);
        recordViewerBreadcrumb(
          duplicatePlan.breadcrumb.marker,
          duplicatePlan.breadcrumb.payload,
        );
        return;
      }
      const startCommandPlan = resolvePdfNativeHandoffStartCommandPlan({
        startPlan,
        asset: resolvedAsset,
        context: handoffContext,
      });
      clearLoadingTimeout();
      setMenuOpen(false);
      resetForNativeHandoffStart();

      try {
        logPdfViewerInfo(
          "[pdf-viewer] native_handoff_start",
          startCommandPlan.console.payload,
        );
        recordViewerBreadcrumb(
          startCommandPlan.breadcrumb.marker,
          startCommandPlan.breadcrumb.payload,
        );
        recordPdfCriticalPathEvent(startCommandPlan.criticalPath);
        await openPdfPreview(
          startCommandPlan.openPreview.uri,
          startCommandPlan.openPreview.fileName,
        );
        const successTelemetryPlan = resolvePdfNativeHandoffSuccessTelemetryPlan({
          asset: resolvedAsset,
          context: handoffContext,
          trigger,
        });
        logPdfViewerInfo(
          "[pdf-viewer] native_handoff_ready",
          successTelemetryPlan.console.payload,
        );
        recordViewerBreadcrumb(
          successTelemetryPlan.breadcrumb.marker,
          successTelemetryPlan.breadcrumb.payload,
        );
        let successPlan = planPdfNativeHandoffSuccessCompletion({
          trigger,
          isMounted: isMountedRef.current,
        });
        if (successPlan.action === "complete_guard") {
          const completed = completePdfNativeHandoff(
            nativeHandoffGuardRef.current,
            handoffKey,
            "success",
          );
          successPlan = planPdfNativeHandoffSuccessCompletion({
            trigger,
            isMounted: true,
            primaryGuardCompleted: completed,
          });
        }
        if (successPlan.action !== "commit_ready") return;
        commitNativeHandoffCompleted();
        markReady();
      } catch (error) {
        let errorPlan = planPdfNativeHandoffErrorCompletion({
          trigger,
          isMounted: isMountedRef.current,
          error,
        });
        if (errorPlan.action === "complete_guard") {
          const completed = completePdfNativeHandoff(
            nativeHandoffGuardRef.current,
            handoffKey,
            "failure",
          );
          errorPlan = planPdfNativeHandoffErrorCompletion({
            trigger,
            isMounted: true,
            primaryGuardCompleted: completed,
            error,
          });
        }
        if (errorPlan.action !== "commit_error") return;
        const errorCommandPlan = resolvePdfNativeHandoffErrorCommandPlan({
          errorPlan,
          asset: resolvedAsset,
          context: handoffContext,
        });
        logPdfViewerError(
          errorCommandPlan.console.label,
          errorCommandPlan.console.payload,
        );
        recordViewerBreadcrumb(
          errorCommandPlan.breadcrumb.marker,
          errorCommandPlan.breadcrumb.payload,
        );
        markError(
          errorCommandPlan.terminalError.message,
          errorCommandPlan.terminalError.phase,
        );
      }
    },
    [
      clearLoadingTimeout,
      commitNativeHandoffCompleted,
      diagnosticsScreen,
      isMountedRef,
      markError,
      markReady,
      nativeHandoffGuardRef,
      openToken,
      recordViewerBreadcrumb,
      resetForNativeHandoffStart,
      sessionId,
    ],
  );

  React.useEffect(() => {
    beginBootstrapCycle();
    clearWebIframeReadyFallback();
    clearLoadingTimeout();
    clearWebRenderUri();
    setChromeVisible(true);
    setMenuOpen(false);
    const next = syncSnapshot();

    if (!next.session) {
      commitEmptyState();
      return;
    }

    touchDocumentSession(next.session.sessionId);
    setErrorText(next.session.errorMessage || "");
    setState(
      resolvePdfViewerReadinessModel({
        session: next.session,
        asset: next.asset,
        platform: viewerPlatform,
      }).initialState,
    );
    let cancelled = false;

    const prepareViewer = async () => {
      const nextReadinessModel = resolvePdfViewerReadinessModel({
        session: next.session,
        asset: next.asset,
        platform: viewerPlatform,
      });
      const handoffPlan = resolvePdfViewerHandoffPlan({
        resolution: nextReadinessModel.resolvedSource,
        platform: viewerPlatform,
      });
      if (handoffPlan.action === "show_empty") {
        commitEmptyState();
        return;
      }
      if (handoffPlan.action === "show_error") {
        if (handoffPlan.reason === "unsupported_mobile_source") {
          markError(handoffPlan.errorMessage, "resolution");
          return;
        }
        setErrorText(handoffPlan.errorMessage);
        setState("error");
        return;
      }

      const resolvedResolution = nextReadinessModel.resolvedSource;
      const resolvedAsset = handoffPlan.asset;
      if (
        !("scheme" in resolvedResolution) ||
        !("sourceKind" in resolvedResolution) ||
        !("renderer" in resolvedResolution)
      ) {
        markError("Preview failed to load.", "resolution");
        return;
      }

      logPdfViewerInfo("[pdf-viewer] open", {
        sessionId: next.session.sessionId,
        documentType: resolvedAsset.documentType,
        originModule: resolvedAsset.originModule,
        uri: resolvedAsset.uri,
        scheme: resolvedResolution.scheme,
        sourceKind: resolvedResolution.sourceKind,
        fileName: resolvedAsset.fileName,
        exists:
          typeof resolvedAsset.sizeBytes === "number" ? true : undefined,
        sizeBytes: resolvedAsset.sizeBytes,
        renderer: resolvedResolution.renderer,
        openTime: new Date().toISOString(),
      });
      recordViewerBreadcrumb("viewer_resolution_selected", {
        uri: resolvedAsset.uri,
        uriKind: resolvedResolution.scheme,
        sourceKind: resolvedResolution.sourceKind,
        fileSizeBytes: resolvedAsset.sizeBytes,
        fileExists:
          typeof resolvedAsset.sizeBytes === "number" ? true : null,
        previewPath:
          resolvedResolution.kind === "resolved-embedded"
            ? resolvedResolution.renderer
            : resolvedResolution.kind,
        extra: {
          renderer: resolvedResolution.renderer,
          resolutionKind: resolvedResolution.kind,
        },
      });
      recordViewerBreadcrumb(
        resolvedResolution.sourceKind === "local-file"
          ? "viewer_resolution_local_file"
          : "viewer_resolution_remote_url",
        {
          uri: resolvedAsset.uri,
          uriKind: resolvedResolution.scheme,
          sourceKind: resolvedResolution.sourceKind,
          fileSizeBytes: resolvedAsset.sizeBytes,
          fileExists:
            typeof resolvedAsset.sizeBytes === "number" ? true : null,
          previewPath:
            resolvedResolution.kind === "resolved-embedded"
              ? resolvedResolution.renderer
              : resolvedResolution.kind,
          extra: {
            renderer: resolvedResolution.renderer,
            resolutionKind: resolvedResolution.kind,
          },
        },
      );

      enterLoading();
      if (handoffPlan.action === "start_native_handoff") {
        await handoffPdfPreview(handoffPlan.asset, handoffPlan.trigger);
        return;
      }
      if (
        handoffPlan.action === "show_embedded_render" &&
        handoffPlan.shouldValidateEmbeddedPreview
      ) {
        if (resolvedResolution.kind !== "resolved-embedded") {
          markError("Preview failed to load.", "resolution");
          return;
        }
        recordViewerBreadcrumb("viewer_validation_start", {
          uri: resolvedAsset.uri,
          uriKind: resolvedResolution.scheme,
          sourceKind: resolvedResolution.sourceKind,
          fileSizeBytes: resolvedAsset.sizeBytes,
          fileExists:
            typeof resolvedAsset.sizeBytes === "number" ? true : null,
          previewPath: resolvedResolution.renderer,
        });
        try {
          await validateEmbeddedPreviewResolution(resolvedResolution);
          recordViewerBreadcrumb("viewer_validation_success", {
            uri: resolvedAsset.uri,
            uriKind: resolvedResolution.scheme,
            sourceKind: resolvedResolution.sourceKind,
            fileSizeBytes: resolvedAsset.sizeBytes,
            fileExists:
              typeof resolvedAsset.sizeBytes === "number" ? true : null,
            previewPath: resolvedResolution.renderer,
          });
        } catch (error) {
          if (!cancelled) {
            const normalizedError = normalizePdfViewerError({
              error,
              phase: "resolution",
              kind: "validation",
            });
            recordViewerBreadcrumb("viewer_validation_failed", {
              uri: resolvedAsset.uri,
              uriKind: resolvedResolution.scheme,
              sourceKind: resolvedResolution.sourceKind,
              fileSizeBytes: resolvedAsset.sizeBytes,
              fileExists:
                typeof resolvedAsset.sizeBytes === "number" ? true : null,
              previewPath: resolvedResolution.renderer,
              errorMessage: normalizedError.message,
            });
            markError(normalizedError.message, "resolution");
          }
          return;
        }
      }
      if (handoffPlan.action === "show_web_remote_iframe") {
        clearWebRenderUri();
        webRenderUriRef.current = handoffPlan.renderUri;
        setWebRenderUri(handoffPlan.renderUri);
        console.info("[pdf-viewer] signedUrl", redactSensitiveText(handoffPlan.renderUri));
        logPdfViewerInfo("[pdf-viewer] web_iframe_src_ready", {
          sessionId: next.session.sessionId,
          documentType: resolvedAsset.documentType,
          originModule: resolvedAsset.originModule,
          remoteUri: handoffPlan.renderUri,
          renderUri: handoffPlan.renderUri,
          renderScheme: getUriScheme(handoffPlan.renderUri),
        });
        setIsReadyToRender(true);
        scheduleWebIframeReadyFallback({
          resolvedAsset,
          renderUri: handoffPlan.renderUri,
          sourceKind: handoffPlan.sourceKind,
        });
        return;
      }
      if (
        handoffPlan.action === "show_embedded_render" &&
        handoffPlan.renderUri
      ) {
        setWebRenderUri(handoffPlan.renderUri);
      }
      if (!cancelled) {
        recordViewerBreadcrumb("viewer_render_bootstrap_ready", {
          uri: resolvedAsset.uri,
          uriKind: resolvedResolution.scheme,
          sourceKind: resolvedResolution.sourceKind,
          fileSizeBytes: resolvedAsset.sizeBytes,
          fileExists:
            typeof resolvedAsset.sizeBytes === "number" ? true : null,
          previewPath: resolvedResolution.renderer,
        });
        setIsReadyToRender(true);
      }
    };

    void prepareViewer();

    return () => {
      cancelled = true;
      logPdfViewerInfo("[pdf-viewer] unmount", {
        sessionId,
        documentType: next.asset?.documentType ?? null,
        originModule: next.asset?.originModule ?? null,
        scheme: getUriScheme(next.asset?.uri),
      });
      clearLoadingTimeout();
      clearWebIframeReadyFallback();
    };
  }, [
    beginBootstrapCycle,
    clearLoadingTimeout,
    clearWebIframeReadyFallback,
    clearWebRenderUri,
    commitEmptyState,
    enterLoading,
    handoffPdfPreview,
    markError,
    recordViewerBreadcrumb,
    scheduleWebIframeReadyFallback,
    sessionId,
    setErrorText,
    setIsReadyToRender,
    setState,
    setWebRenderUri,
    syncSnapshot,
    viewerPlatform,
    webRenderUriRef,
    loadAttempt,
  ]);

  const { onShare, onOpenExternal, onDownload, onPrint } = usePdfViewerActions({
    asset,
    markError,
    setMenuOpen,
  });

  const onRetry = React.useCallback(() => {
    const next = syncSnapshot();
    if (!next.session) {
      commitEmptyState();
      return;
    }
    clearWebRenderUri();
    retryViewerOrchestrator();
  }, [clearWebRenderUri, commitEmptyState, retryViewerOrchestrator, syncSnapshot]);

  const onBack = React.useCallback(() => {
    safeBack(
      router as typeof router & { canGoBack?: () => boolean },
      FALLBACK_ROUTE,
    );
  }, []);

  const source = React.useMemo(
    () =>
      resolvedSource.kind === "resolved-embedded"
        ? resolvedSource.source
        : undefined,
    [resolvedSource],
  );
  const webEmbeddedUri = React.useMemo(() => {
    if (viewerPlatform !== "web" || resolvedSource.kind !== "resolved-embedded") {
      return "";
    }
    if (resolvedSource.sourceKind === "remote-url") return webRenderUri ?? "";
    return resolvedSource.canonicalUri;
  }, [resolvedSource, viewerPlatform, webRenderUri]);
  const nativeWebViewReadAccessUri = React.useMemo(() => {
    if (viewerPlatform === "web" || resolvedSource.kind !== "resolved-embedded") {
      return undefined;
    }
    if (
      "html" in resolvedSource.source &&
      typeof resolvedSource.source.baseUrl === "string"
    ) {
      const baseUrl = resolvedSource.source.baseUrl.trim();
      if (baseUrl) return baseUrl;
    }
    return getReadAccessParentUri(resolvedSource.asset.uri);
  }, [resolvedSource, viewerPlatform]);
  const hasRenderableSource = React.useMemo(
    () =>
      viewerPlatform === "web"
        ? Boolean(webEmbeddedUri || asset?.uri)
        : Boolean(source),
    [asset?.uri, source, viewerPlatform, webEmbeddedUri],
  );
  const contentModel = React.useMemo(
    () =>
      resolvePdfViewerContentModel({
        state,
        errorText,
        asset,
        resolvedSource,
        isReadyToRender,
        hasRenderableSource,
      }),
    [
      asset,
      errorText,
      hasRenderableSource,
      isReadyToRender,
      resolvedSource,
      state,
    ],
  );
  const chromeModel = React.useMemo(
    () =>
      resolvePdfViewerChromeModel({
        platform: viewerPlatform,
        width,
        topInset: insets.top,
        chromeVisible,
        state,
        asset,
        resolvedSource,
      }),
    [
      asset,
      chromeVisible,
      insets.top,
      resolvedSource,
      state,
      viewerPlatform,
      width,
    ],
  );
  const manualHandoffPlan = React.useMemo(
    () => resolvePdfViewerManualHandoffPlan({ resolution: resolvedSource }),
    [resolvedSource],
  );
  const renderInstanceKey = React.useMemo(() => {
    if (!asset || resolvedSource.kind !== "resolved-embedded") {
      return createPdfViewerRenderInstanceKey({
        platform: viewerPlatform,
        sessionId,
        loadAttempt,
      });
    }
    return createPdfViewerRenderInstanceKey({
      platform: viewerPlatform,
      sessionId,
      assetId: asset.assetId,
      uri: asset.uri,
      renderUri:
        viewerPlatform === "web"
          ? webEmbeddedUri || asset.uri
          : resolvedSource.canonicalUri,
      renderer: resolvedSource.renderer,
      loadAttempt,
    });
  }, [asset, loadAttempt, resolvedSource, sessionId, viewerPlatform, webEmbeddedUri]);

  React.useLayoutEffect(() => {
    activeRenderInstanceKeyRef.current = renderInstanceKey;
  }, [activeRenderInstanceKeyRef, renderInstanceKey]);

  const resolveRenderEventCommitPlan = React.useCallback(
    (eventRenderInstanceKey: string) => {
      const guardActive = shouldCommitPdfViewerRenderEvent({
        activeRenderInstanceKey: activeRenderInstanceKeyRef.current,
        eventRenderInstanceKey,
      });
      return planRenderEventCommit(guardActive);
    },
    [activeRenderInstanceKeyRef, planRenderEventCommit],
  );

  const toggleChrome = React.useCallback(() => {
    if (viewerPlatform === "web") return;
    setMenuOpen(false);
    setChromeVisible((value) => !value);
  }, [viewerPlatform]);

  const toggleMenu = React.useCallback(() => {
    setMenuOpen((value) => !value);
  }, []);

  const onOpenAgain = React.useCallback(() => {
    if (manualHandoffPlan.action !== "reopen_native_handoff") return;
    void handoffPdfPreview(manualHandoffPlan.asset, manualHandoffPlan.trigger);
  }, [handoffPdfPreview, manualHandoffPlan]);

  React.useEffect(() => {
    let cancelled = false;

    const inspect = async () => {
      if (resolvedSource.kind !== "resolved-embedded") {
        return;
      }
      const embeddedResolution = resolvedSource;
      const { asset: resolvedAsset, scheme } = embeddedResolution;
      let exists: boolean | undefined;
      let size: number | undefined;

      if (
        viewerPlatform !== "web" &&
        scheme === "file" &&
        FileSystemCompat.getInfoAsync
      ) {
        try {
          const info = await inspectLocalPdfFile(resolvedAsset.uri);
          exists = info?.exists;
          size = info?.sizeBytes;
        } catch (error) {
          const normalizedError = normalizePdfViewerError({
            error,
            phase: "render",
          });
          logPdfViewerError("[pdf-viewer] viewer_file_inspect_failed", {
            sessionId,
            uri: resolvedAsset.uri,
            error: redactSensitiveText(normalizedError.message),
          });
        }
      }

      if (!cancelled) {
        if (viewerPlatform !== "web" && scheme === "file" && exists === false) {
          logPdfViewerInfo("[pdf-viewer] viewer_local_file_exists_no", {
            sessionId,
            uri: resolvedAsset.uri,
            exists: false,
            sizeBytes: size ?? resolvedAsset.sizeBytes,
            sourceKind: "local-file",
            documentType: resolvedAsset.documentType,
            originModule: resolvedAsset.originModule,
          });
          logPdfViewerError("[pdf-viewer] viewer_file_not_found", {
            sessionId,
            uri: resolvedAsset.uri,
            fileName: resolvedAsset.fileName,
          });
        } else if (
          viewerPlatform !== "web" &&
          scheme === "file" &&
          exists === true
        ) {
          logPdfViewerInfo("[pdf-viewer] viewer_local_file_exists_yes", {
            sessionId,
            uri: resolvedAsset.uri,
            exists: true,
            sizeBytes: size ?? resolvedAsset.sizeBytes,
            sourceKind: "local-file",
            documentType: resolvedAsset.documentType,
            originModule: resolvedAsset.originModule,
          });
        }
        logPdfViewerInfo("[pdf-viewer] viewer_before_render", {
          platform: Platform.OS,
          sessionId,
          documentType: resolvedAsset.documentType,
          originModule: resolvedAsset.originModule,
          uri: resolvedAsset.uri,
          scheme,
          fileName: resolvedAsset.fileName,
          mimeType: resolvedAsset.mimeType,
          sourceKind: embeddedResolution.sourceKind,
          exists,
          sizeBytes: size ?? resolvedAsset.sizeBytes,
          source,
        });
        recordViewerBreadcrumb("viewer_before_render", {
          uri: resolvedAsset.uri,
          uriKind: scheme,
          sourceKind: embeddedResolution.sourceKind,
          fileExists: exists,
          fileSizeBytes: size ?? resolvedAsset.sizeBytes,
          previewPath: embeddedResolution.renderer,
          extra: {
            mimeType: resolvedAsset.mimeType,
          },
        });
        recordPdfCriticalPathEvent({
          event: "pdf_render_start",
          screen:
            resolvedAsset.originModule ?? diagnosticsScreen ?? "pdf_viewer",
          sourceKind: embeddedResolution.sourceKind,
          documentType: resolvedAsset.documentType,
          originModule: resolvedAsset.originModule,
          entityId: resolvedAsset.entityId,
          fileName: resolvedAsset.fileName,
          sessionId,
          openToken,
          uri: resolvedAsset.uri,
          uriKind: scheme,
          previewPath: embeddedResolution.renderer,
          extra: {
            mimeType: resolvedAsset.mimeType,
            fileExists: exists ?? null,
            fileSizeBytes: size ?? resolvedAsset.sizeBytes ?? null,
          },
        });
      }
    };

    void inspect();
    return () => {
      cancelled = true;
    };
  }, [
    diagnosticsScreen,
    openToken,
    recordViewerBreadcrumb,
    resolvedSource,
    sessionId,
    source,
    viewerPlatform,
  ]);

  React.useEffect(() => {
    if (
      viewerPlatform !== "web" ||
      !isReadyToRender ||
      resolvedSource.kind !== "resolved-embedded" ||
      !asset
    ) {
      return;
    }
    const embeddedResolution = resolvedSource;

    const iframeSrc = webEmbeddedUri || asset.uri;
    const cycleKey = `${sessionId || "direct"}:${asset.assetId}:${iframeSrc}:${loadAttempt}`;
    if (webIframeRenderLoggedKeyRef.current === cycleKey) return;
    webIframeRenderLoggedKeyRef.current = cycleKey;

    logPdfViewerInfo("[pdf-viewer] web_iframe_render", {
      sessionId,
      documentType: asset.documentType,
      originModule: asset.originModule,
      iframeSrc,
      renderInstanceKey,
    });
    recordViewerBreadcrumb("web_iframe_render", {
      uri: iframeSrc,
      uriKind: getUriScheme(iframeSrc),
      sourceKind: embeddedResolution.sourceKind,
      previewPath: embeddedResolution.renderer,
      extra: {
        renderInstanceKey,
      },
    });
  }, [
    asset,
    isReadyToRender,
    loadAttempt,
    recordViewerBreadcrumb,
    renderInstanceKey,
    resolvedSource,
    sessionId,
    viewerPlatform,
    webEmbeddedUri,
    webIframeRenderLoggedKeyRef,
  ]);

  const onWebLoad = React.useCallback(() => {
    if (!asset) return;
    const eventPlan = resolvePdfViewerWebIframeLoadEventPlan({
      renderEventPlan: resolveRenderEventCommitPlan(renderInstanceKey),
      renderFailed: renderFailedRef.current,
      sessionId,
      asset,
      renderUri: webEmbeddedUri || asset.uri,
    });
    if (eventPlan.action === "skip_render_event") return;
    emitPdfViewerRenderConsoleCommand(eventPlan.console);
    markReady();
  }, [
    asset,
    markReady,
    renderFailedRef,
    renderInstanceKey,
    resolveRenderEventCommitPlan,
    sessionId,
    webEmbeddedUri,
  ]);

  const onWebError = React.useCallback(() => {
    if (!asset) return;
    const eventPlan = resolvePdfViewerWebIframeErrorEventPlan({
      renderEventPlan: resolveRenderEventCommitPlan(renderInstanceKey),
      sessionId,
      asset,
      renderUri: webEmbeddedUri || asset.uri,
    });
    if (eventPlan.action === "skip_render_event") return;
    emitPdfViewerRenderConsoleCommand(eventPlan.console);
    markError(eventPlan.message, "render");
  }, [
    asset,
    markError,
    renderInstanceKey,
    resolveRenderEventCommitPlan,
    sessionId,
    webEmbeddedUri,
  ]);

  const onNativeLoadStart = React.useCallback(() => {
    if (resolvedSource.kind !== "resolved-embedded" || !asset) return;
    const eventPlan = resolvePdfViewerNativeLoadStartEventPlan({
      asset,
      source: resolvedSource,
    });
    emitPdfViewerRenderBreadcrumbCommands(
      recordViewerBreadcrumb,
      eventPlan.breadcrumbs,
    );
  }, [asset, recordViewerBreadcrumb, resolvedSource]);

  const onNativeLoadEnd = React.useCallback(() => {
    if (resolvedSource.kind !== "resolved-embedded" || !asset) return;
    const eventPlan = resolvePdfViewerNativeLoadEndEventPlan({
      renderEventPlan: resolveRenderEventCommitPlan(renderInstanceKey),
      renderFailed: renderFailedRef.current,
      sessionId,
      asset,
      source: resolvedSource,
    });
    if (eventPlan.action === "skip_render_event") return;
    emitPdfViewerRenderConsoleCommand(eventPlan.console);
    emitPdfViewerRenderBreadcrumbCommands(
      recordViewerBreadcrumb,
      eventPlan.breadcrumbs,
    );
    markReady();
  }, [
    asset,
    markReady,
    recordViewerBreadcrumb,
    renderFailedRef,
    renderInstanceKey,
    resolveRenderEventCommitPlan,
    resolvedSource,
    sessionId,
  ]);

  const onNativeError = React.useCallback(
    (event: { nativeEvent?: { description?: string } }) => {
      if (resolvedSource.kind !== "resolved-embedded" || !asset) return;
      const eventPlan = resolvePdfViewerNativeErrorEventPlan({
        renderEventPlan: resolveRenderEventCommitPlan(renderInstanceKey),
        sessionId,
        asset,
        source: resolvedSource,
        description: event?.nativeEvent?.description,
      });
      if (eventPlan.action === "skip_render_event") return;
      emitPdfViewerRenderConsoleCommand(eventPlan.console);
      emitPdfViewerRenderBreadcrumbCommands(
        recordViewerBreadcrumb,
        eventPlan.breadcrumbs,
      );
      markError(eventPlan.message, "render");
    },
    [
      asset,
      markError,
      recordViewerBreadcrumb,
      renderInstanceKey,
      resolveRenderEventCommitPlan,
      resolvedSource,
      sessionId,
    ],
  );

  const onNativeHttpError = React.useCallback(
    (event: { nativeEvent?: { description?: string; statusCode?: number } }) => {
      if (resolvedSource.kind !== "resolved-embedded" || !asset) return;
      const eventPlan = resolvePdfViewerNativeHttpErrorEventPlan({
        renderEventPlan: resolveRenderEventCommitPlan(renderInstanceKey),
        sessionId,
        asset,
        source: resolvedSource,
        description: event?.nativeEvent?.description,
        statusCode: event?.nativeEvent?.statusCode,
      });
      if (eventPlan.action === "skip_render_event") return;
      emitPdfViewerRenderConsoleCommand(eventPlan.console);
      emitPdfViewerRenderBreadcrumbCommands(
        recordViewerBreadcrumb,
        eventPlan.breadcrumbs,
      );
      markError(eventPlan.message, "render");
    },
    [
      asset,
      markError,
      recordViewerBreadcrumb,
      renderInstanceKey,
      resolveRenderEventCommitPlan,
      resolvedSource,
      sessionId,
    ],
  );

  React.useEffect(() => {
    if (contentModel.kind === "empty") {
      logPdfViewerError("[pdf-viewer] viewer_missing_session", {
        platform: Platform.OS,
        sessionId,
      });
      return;
    }
    if (contentModel.kind === "error") {
      logPdfViewerError("[pdf-viewer] viewer_error_state", {
        platform: Platform.OS,
        sessionId,
        errorText: redactSensitiveText(contentModel.subtitle),
        uri: asset?.uri ?? null,
        scheme: getUriScheme(asset?.uri),
      });
      return;
    }
    if (contentModel.kind === "missing-asset") {
      logPdfViewerError("[pdf-viewer] viewer_invalid_asset", {
        platform: Platform.OS,
        sessionId,
        hasAsset: Boolean(asset),
        uri: asset?.uri ?? null,
      });
    }
  }, [asset, contentModel, sessionId]);

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <PdfViewerScreenContent
        title={asset?.title || "PDF"}
        showChrome={chromeModel.showChrome}
        headerHeight={chromeModel.headerHeight}
        topInset={insets.top}
        menuOpen={menuOpen}
        asset={asset}
        contentModel={contentModel}
        width={width}
        renderInstanceKey={renderInstanceKey}
        webEmbeddedUri={webEmbeddedUri}
        nativeHandoffCompleted={nativeHandoffCompleted}
        nativePdfWebView={nativePdfWebView}
        nativeWebViewReadAccessUri={nativeWebViewReadAccessUri}
        source={source}
        resolvedSource={resolvedSource}
        showPageIndicator={chromeModel.showPageIndicator}
        pageIndicatorText={chromeModel.pageIndicatorText}
        onBack={onBack}
        onToggleMenu={toggleMenu}
        onShare={() => void onShare()}
        onDownload={() => void onDownload()}
        onOpenExternal={() => void onOpenExternal()}
        onPrint={() => void onPrint()}
        onRetry={onRetry}
        onToggleChrome={toggleChrome}
        onOpenAgain={onOpenAgain}
        onWebLoad={onWebLoad}
        onWebError={onWebError}
        onNativeLoadStart={onNativeLoadStart}
        onNativeLoadEnd={onNativeLoadEnd}
        onNativeError={onNativeError}
        onNativeHttpError={onNativeHttpError}
      />
    </SafeAreaView>
  );
}

export default withScreenErrorBoundary(PdfViewerScreen, {
  screen: "pdf_viewer",
  route: "/pdf-viewer",
  title: "Ошибка просмотра PDF",
});
