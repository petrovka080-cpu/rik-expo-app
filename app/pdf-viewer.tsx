import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";

import {
  failDocumentSession,
  getDocumentSessionSnapshot,
  touchDocumentSession,
  type DocumentAsset,
} from "../src/lib/documents/pdfDocumentSessions";


import {
  getReadAccessParentUri,
  resolvePdfViewerDirectSnapshot,
  resolvePdfViewerResolution,
  resolvePdfViewerState,
} from "../src/lib/pdf/pdfViewerContract";
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
import { resolvePdfViewerWebRenderUriCleanup } from "../src/lib/pdf/pdfViewerWebRenderUriCleanup";
import {
  failPdfOpenVisible,
  markPdfOpenVisible,
  markPdfOpenRouteMounted,
} from "../src/lib/pdf/pdfOpenFlow";
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
  armPdfViewerLoadingTimeout,
  cancelPdfViewerLoadingTimeout,
  shouldCommitPdfViewerLoadingTimeout,
} from "../src/lib/pdf/pdfViewerLoadingTimeoutGuard";
import {
  planPdfViewerLoadingTransition,
  planPdfViewerTimeoutTransition,
  usePdfViewerOrchestrator,
} from "../src/lib/pdf/usePdfViewerOrchestrator";
import { resolvePdfViewerBootstrapPlan } from "../src/lib/pdf/pdfViewerBootstrapPlan";
import {
  resolvePdfViewerOpenFailedSignalPlan,
  resolvePdfViewerOpenVisibleSignalPlan,
} from "../src/lib/pdf/pdfViewerOpenSignalPlan";
import { resolvePdfViewerWebIframeReadyFallbackPlan } from "../src/lib/pdf/pdfViewerWebIframeReadyFallback";
import { openPdfPreview } from "../src/lib/pdfRunner";
import {
  FALLBACK_ROUTE,
  VIEWER_TEXT,
} from "../src/lib/pdf/pdfViewer.constants";
import { styles } from "../src/lib/pdf/pdfViewer.styles";
import { MenuAction, EmptyState, CenteredPanel } from "../src/lib/pdf/pdfViewer.components";
import { PdfViewerNativeShell } from "../src/lib/pdf/PdfViewerNativeShell";
import { PdfViewerWebShell } from "../src/lib/pdf/PdfViewerWebShell";
import {
  getUriScheme,
  inspectLocalPdfFile,
  validateEmbeddedPreviewResolution,
  FileSystemCompat,
} from "../src/lib/pdf/pdfViewer.helpers";
import { usePdfViewerActions } from "../src/lib/pdf/usePdfViewerActions";
import { recordCatchDiscipline } from "../src/lib/observability/catchDiscipline";
import { safeBack } from "../src/lib/navigation/safeBack";
import { redactSensitiveRecord, redactSensitiveText } from "../src/lib/security/redaction";
import { withScreenErrorBoundary } from "../src/shared/ui/ScreenErrorBoundary";


const NativePdfWebView =
  Platform.OS === "web"
    ? null
    : ((() => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          return require("react-native-webview").WebView ?? null;
        } catch (error) {
          recordCatchDiscipline({
            screen: "pdf_viewer",
            surface: "pdf_viewer",
            event: "native_webview_require_failed",
            kind: "degraded_fallback",
            error,
            category: "ui",
            sourceKind: "pdf:viewer",
            errorStage: "module_require",
          });
          return null;
        }
      })() as React.ComponentType<any> | null);

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
  const sessionId = React.useMemo(
    () => String(params.sessionId || "").trim(),
    [params.sessionId],
  );
  const openToken = React.useMemo(
    () => String(params.openToken || "").trim(),
    [params.openToken],
  );
  logPdfViewerInfo("[pdf-viewer] viewer_params_parsed", {
    platform: Platform.OS,
    sessionId: String(params.sessionId || "").trim() || null,
    openToken: String(params.openToken || "").trim() || null,
    hasUri: Boolean(params.uri),
  });
  const directSnapshotParams = React.useMemo(
    () => ({
      uri: params.uri,
      fileName: params.fileName,
      title: params.title,
      sourceKind: params.sourceKind,
      documentType: params.documentType,
      originModule: params.originModule,
      source: params.source,
      entityId: params.entityId,
    }),
    [
      params.documentType,
      params.entityId,
      params.fileName,
      params.originModule,
      params.source,
      params.sourceKind,
      params.title,
      params.uri,
    ],
  );
  const resolveSnapshot = React.useCallback(() => {
    const registrySnapshot = getDocumentSessionSnapshot(sessionId);
    if (registrySnapshot.session) return registrySnapshot;
    return (
      resolvePdfViewerDirectSnapshot(directSnapshotParams) ?? {
        session: null,
        asset: null,
      }
    );
  }, [directSnapshotParams, sessionId]);
  const snapshot = React.useMemo(() => resolveSnapshot(), [resolveSnapshot]);
  logPdfViewerInfo("[pdf-viewer] viewer_snapshot_resolved", {
    platform: Platform.OS,
    hasSession: Boolean(snapshot.session),
    hasAsset: Boolean(snapshot.asset),
    sessionId: snapshot.session?.sessionId ?? null,
    assetUri: snapshot.asset?.uri?.slice(-40) ?? null,
    sourceKind: snapshot.asset?.sourceKind ?? null,
  });
  const viewerPlatform = getCurrentViewerPlatform();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [chromeVisible, setChromeVisible] = React.useState(true);
  const loadingTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const webIframeReadyFallbackRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const orchestrator = usePdfViewerOrchestrator({
    initialSession: snapshot.session,
    initialAsset: snapshot.asset,
    initialState: resolvePdfViewerState(snapshot.session, snapshot.asset, viewerPlatform),
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
  const resolvedSource = React.useMemo(
    () =>
      resolvePdfViewerResolution({ session, asset, platform: viewerPlatform }),
    [asset, session, viewerPlatform],
  );
  const resolvedPreviewPath = React.useMemo(
    () =>
      resolvedSource.kind === "resolved-embedded"
        ? resolvedSource.renderer
        : resolvedSource.kind,
    [resolvedSource],
  );
  const diagnosticsScreen = React.useMemo(() => {
    const origin = String(
      asset?.originModule ??
        snapshot.asset?.originModule ??
        params.originModule ??
        "",
    )
      .trim()
      .toLowerCase();
    return shouldRecordPdfCrashBreadcrumbs(origin) ? origin : null;
  }, [asset?.originModule, params.originModule, snapshot.asset?.originModule]);
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
        documentType: currentAsset?.documentType ?? params.documentType,
        originModule: currentAsset?.originModule ?? params.originModule,
        sourceKind:
          overrides?.sourceKind ??
          currentAsset?.sourceKind ??
          params.sourceKind,
        uriKind: overrides?.uriKind ?? getUriScheme(uri),
        uri,
        fileName: currentAsset?.fileName ?? params.fileName,
        entityId: currentAsset?.entityId ?? params.entityId,
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
      params.documentType,
      params.originModule,
      params.sourceKind,
      params.fileName,
      params.entityId,
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
  }, [clearWebIframeReadyFallback, loadAttempt, openToken, resetOpenAttemptGuards, sessionId]);

  const clearWebRenderUri = React.useCallback((options?: { commitState?: boolean }) => {
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
  }, [setWebRenderUri, webRenderUriRef]);

  React.useEffect(() => {
    return () => {
      clearWebRenderUri({ commitState: false });
    };
  }, [clearWebRenderUri]);

  React.useEffect(() => {
    logPdfViewerInfo("[pdf-viewer] viewer_route_mounted", {
      platform: Platform.OS,
      sessionId,
      receivedSessionId: params.sessionId ?? null,
      initialUri: snapshot.asset?.uri ?? null,
      initialScheme: getUriScheme(snapshot.asset?.uri),
    });
    recordViewerBreadcrumb("viewer_route_mounted", {
      uri: snapshot.asset?.uri ?? params.uri ?? null,
      uriKind: getUriScheme(snapshot.asset?.uri ?? params.uri),
      sourceKind: snapshot.asset?.sourceKind ?? params.sourceKind ?? null,
      previewPath: "viewer_route",
      extra: {
        receivedSessionId: params.sessionId ?? null,
      },
    });
    recordPdfCriticalPathEvent({
      event: "pdf_viewer_mounted",
      screen: diagnosticsScreen ?? "pdf_viewer",
      sourceKind: snapshot.asset?.sourceKind ?? params.sourceKind ?? null,
      documentType: snapshot.asset?.documentType ?? params.documentType,
      originModule: snapshot.asset?.originModule ?? params.originModule,
      entityId: snapshot.asset?.entityId ?? params.entityId,
      fileName: snapshot.asset?.fileName ?? params.fileName,
      sessionId,
      openToken,
      uri: snapshot.asset?.uri ?? params.uri ?? null,
      uriKind: getUriScheme(snapshot.asset?.uri ?? params.uri),
      previewPath: "viewer_route",
      extra: {
        receivedSessionId: params.sessionId ?? null,
      },
    });
    markPdfOpenRouteMounted(openToken, {
      sourceKind: snapshot.asset?.sourceKind ?? params.sourceKind ?? null,
      extra: {
        route: "/pdf-viewer",
        sessionId,
        receivedSessionId: params.sessionId ?? null,
        documentType: snapshot.asset?.documentType ?? params.documentType,
        originModule: snapshot.asset?.originModule ?? params.originModule,
        uriKind: getUriScheme(snapshot.asset?.uri ?? params.uri),
      },
    });
  }, [
    diagnosticsScreen,
    openToken,
    params.documentType,
    params.entityId,
    params.fileName,
    params.originModule,
    params.sessionId,
    params.sourceKind,
    params.uri,
    recordViewerBreadcrumb,
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
      const nextState = resolvePdfViewerState(
        next.session,
        next.asset,
        viewerPlatform,
      );
      return prev === nextState ? prev : nextState;
    });
    return next;
  }, [resolveSnapshot, setAsset, setErrorText, setSession, setState, viewerPlatform]);

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
      clearWebIframeReadyFallback();
      clearLoadingTimeout();
      commitErrorState(message);
      if (sessionId) failDocumentSession(sessionId, message);
      const next = syncSnapshot();
      if (next.asset) {
        const scheme = String(next.asset.uri || "").split(":")[0] || "unknown";
        logPdfViewerError("[pdf-viewer] load_error", {
          documentType: next.asset.documentType,
          originModule: next.asset.originModule,
          scheme,
          platform: Platform.OS,
          phase,
          error: redactSensitiveText(message),
        });
      }
      recordViewerBreadcrumb("viewer_terminal_error", {
        uri: next.asset?.uri ?? null,
        uriKind: getUriScheme(next.asset?.uri),
        sourceKind: next.asset?.sourceKind ?? null,
        fileSizeBytes: next.asset?.sizeBytes,
        fileExists: typeof next.asset?.sizeBytes === "number" ? true : null,
        errorMessage: message,
        terminalState: "error",
        extra: {
          phase,
        },
      });
      if (phase === "render") {
        recordPdfCriticalPathEvent({
          event: "pdf_render_fail",
          screen: next.asset?.originModule ?? diagnosticsScreen ?? "pdf_viewer",
          result: "error",
          sourceKind: next.asset?.sourceKind ?? "pdf:viewer",
          error: new Error(message),
          documentType: next.asset?.documentType ?? params.documentType,
          originModule: next.asset?.originModule ?? params.originModule,
          entityId: next.asset?.entityId ?? params.entityId,
          fileName: next.asset?.fileName ?? params.fileName,
          sessionId,
          openToken,
          uri: next.asset?.uri ?? null,
          uriKind: getUriScheme(next.asset?.uri),
          previewPath: resolvedPreviewPath,
          extra: {
            phase,
          },
        });
      }
      recordPdfCriticalPathEvent({
        event: "pdf_terminal_fail",
        screen: next.asset?.originModule ?? diagnosticsScreen ?? "pdf_viewer",
        result: "error",
        sourceKind: next.asset?.sourceKind ?? "pdf:viewer",
        error: new Error(message),
        documentType: next.asset?.documentType ?? params.documentType,
        originModule: next.asset?.originModule ?? params.originModule,
        entityId: next.asset?.entityId ?? params.entityId,
        fileName: next.asset?.fileName ?? params.fileName,
        sessionId,
        openToken,
        uri: next.asset?.uri ?? null,
        uriKind: getUriScheme(next.asset?.uri),
        previewPath: resolvedPreviewPath,
        terminalState: "error",
        extra: {
          phase,
        },
      });
      signalOpenFailed(message, { phase });
    },
    [
      clearLoadingTimeout,
      clearWebIframeReadyFallback,
      commitErrorState,
      diagnosticsScreen,
      openToken,
      params.documentType,
      params.entityId,
      params.fileName,
      params.originModule,
      recordViewerBreadcrumb,
      resolvedPreviewPath,
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
      documentType: next.asset?.documentType ?? params.documentType,
      originModule: next.asset?.originModule ?? params.originModule,
      entityId: next.asset?.entityId ?? params.entityId,
      fileName: next.asset?.fileName ?? params.fileName,
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
      documentType: next.asset?.documentType ?? params.documentType,
      originModule: next.asset?.originModule ?? params.originModule,
      entityId: next.asset?.entityId ?? params.entityId,
      fileName: next.asset?.fileName ?? params.fileName,
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
    params.documentType,
    params.entityId,
    params.fileName,
    params.originModule,
    recordViewerBreadcrumb,
    resolvedPreviewPath,
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
        logPdfViewerInfo("[pdf-viewer] native_handoff_start", startCommandPlan.console.payload);
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
        logPdfViewerInfo("[pdf-viewer] native_handoff_ready", successTelemetryPlan.console.payload);
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
    setState(resolvePdfViewerState(next.session, next.asset, viewerPlatform));
    let cancelled = false;

    const prepareViewer = async () => {
      const resolution = resolvePdfViewerResolution({
        session: next.session,
        asset: next.asset,
        platform: viewerPlatform,
      });
      const bootstrapPlan = resolvePdfViewerBootstrapPlan({
        resolution,
        platform: viewerPlatform,
      });
      if (bootstrapPlan.action === "show_empty") {
        commitEmptyState();
        return;
      }
      if (bootstrapPlan.action === "show_session_error") {
        setErrorText(bootstrapPlan.errorMessage);
        setState("error");
        return;
      }
      if (bootstrapPlan.action === "show_missing_asset") {
        setErrorText(bootstrapPlan.errorMessage);
        setState("error");
        return;
      }
      if (bootstrapPlan.action === "fail_resolution") {
        markError(bootstrapPlan.errorMessage, "resolution");
        return;
      }

      const resolvedResolution = bootstrapPlan.resolution;
      const resolvedAsset = resolvedResolution.asset;

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
      if (bootstrapPlan.action === "start_native_handoff") {
        await handoffPdfPreview(bootstrapPlan.resolution.asset, "primary");
        return;
      }
      if (
        bootstrapPlan.action === "show_embedded_render" &&
        bootstrapPlan.shouldValidateEmbeddedPreview
      ) {
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
          await validateEmbeddedPreviewResolution(bootstrapPlan.resolution);
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
            const message =
              error instanceof Error ? error.message : String(error);
            recordViewerBreadcrumb("viewer_validation_failed", {
              uri: resolvedAsset.uri,
              uriKind: resolvedResolution.scheme,
              sourceKind: resolvedResolution.sourceKind,
              fileSizeBytes: resolvedAsset.sizeBytes,
              fileExists:
                typeof resolvedAsset.sizeBytes === "number" ? true : null,
              previewPath: resolvedResolution.renderer,
              errorMessage: message,
            });
            markError(message, "resolution");
          }
          return;
        }
      }
      if (bootstrapPlan.action === "show_web_remote_iframe") {
        clearWebRenderUri();
        webRenderUriRef.current = bootstrapPlan.webRenderUri;
        setWebRenderUri(bootstrapPlan.webRenderUri);
        console.info("[pdf-viewer] signedUrl", redactSensitiveText(bootstrapPlan.webRenderUri));
        logPdfViewerInfo("[pdf-viewer] web_iframe_src_ready", {
          sessionId: next.session.sessionId,
          documentType: resolvedAsset.documentType,
          originModule: resolvedAsset.originModule,
          remoteUri: bootstrapPlan.webRenderUri,
          renderUri: bootstrapPlan.webRenderUri,
          renderScheme: getUriScheme(bootstrapPlan.webRenderUri),
        });
        setIsReadyToRender(true);
        scheduleWebIframeReadyFallback({
          resolvedAsset,
          renderUri: bootstrapPlan.webRenderUri,
          sourceKind: resolvedResolution.sourceKind,
        });
        return;
      }
      if (
        bootstrapPlan.action === "show_embedded_render" &&
        bootstrapPlan.webRenderUri
      ) {
        setWebRenderUri(bootstrapPlan.webRenderUri);
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
    markReady,
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

  const source = React.useMemo(() => {
    return resolvedSource.kind === "resolved-embedded"
      ? resolvedSource.source
      : undefined;
  }, [resolvedSource]);
  const webEmbeddedUri = React.useMemo(() => {
    if (Platform.OS !== "web" || resolvedSource.kind !== "resolved-embedded")
      return "";
    if (resolvedSource.sourceKind === "remote-url") return webRenderUri ?? "";
    return resolvedSource.canonicalUri;
  }, [resolvedSource, webRenderUri]);
  const nativeWebViewReadAccessUri = React.useMemo(() => {
    if (Platform.OS === "web" || resolvedSource.kind !== "resolved-embedded")
      return undefined;
    if (
      "html" in resolvedSource.source &&
      typeof resolvedSource.source.baseUrl === "string"
    ) {
      const baseUrl = resolvedSource.source.baseUrl.trim();
      if (baseUrl) return baseUrl;
    }
    return getReadAccessParentUri(resolvedSource.asset.uri);
  }, [resolvedSource]);
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
        Platform.OS === "web"
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

  const showChrome = Platform.OS === "web" ? true : chromeVisible;
  const headerBarHeight = Platform.OS === "web" || width >= 768 ? 56 : 50;
  const headerHeight =
    headerBarHeight + (Platform.OS === "web" ? 0 : insets.top);
  const pageIndicatorText = state === "ready" ? "1 / 1" : "…";
  const showPageIndicator =
    Boolean(asset) && resolvedSource.kind === "resolved-embedded";

  const toggleChrome = React.useCallback(() => {
    if (Platform.OS === "web") return;
    setMenuOpen(false);
    setChromeVisible((value) => !value);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    const inspect = async () => {
      if (resolvedSource.kind !== "resolved-embedded") {
        return;
      }
      const { asset: resolvedAsset, scheme } = resolvedSource;
      let exists: boolean | undefined;
      let size: number | undefined;

      if (
        Platform.OS !== "web" &&
        scheme === "file" &&
        FileSystemCompat.getInfoAsync
      ) {
        try {
          const info = await inspectLocalPdfFile(resolvedAsset.uri);
          exists = info?.exists;
          size = info?.sizeBytes;
        } catch (error) {
          logPdfViewerError("[pdf-viewer] viewer_file_inspect_failed", {
            sessionId,
            uri: resolvedAsset.uri,
            error: redactSensitiveText(error instanceof Error ? error.message : String(error)),
          });
        }
      }

      if (!cancelled) {
        if (Platform.OS !== "web" && scheme === "file" && exists === false) {
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
          Platform.OS !== "web" &&
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
          sourceKind: resolvedSource.sourceKind,
          exists,
          sizeBytes: size ?? resolvedAsset.sizeBytes,
          source,
        });
        recordViewerBreadcrumb("viewer_before_render", {
          uri: resolvedAsset.uri,
          uriKind: scheme,
          sourceKind: resolvedSource.sourceKind,
          fileExists: exists,
          fileSizeBytes: size ?? resolvedAsset.sizeBytes,
          previewPath: resolvedSource.renderer,
          extra: {
            mimeType: resolvedAsset.mimeType,
          },
        });
        recordPdfCriticalPathEvent({
          event: "pdf_render_start",
          screen:
            resolvedAsset.originModule ?? diagnosticsScreen ?? "pdf_viewer",
          sourceKind: resolvedSource.sourceKind,
          documentType: resolvedAsset.documentType,
          originModule: resolvedAsset.originModule,
          entityId: resolvedAsset.entityId,
          fileName: resolvedAsset.fileName,
          sessionId,
          openToken,
          uri: resolvedAsset.uri,
          uriKind: scheme,
          previewPath: resolvedSource.renderer,
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
  ]);

  React.useEffect(() => {
    if (
      Platform.OS !== "web" ||
      !isReadyToRender ||
      resolvedSource.kind !== "resolved-embedded" ||
      !asset
    ) {
      return;
    }

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
      sourceKind: resolvedSource.sourceKind,
      previewPath: resolvedSource.renderer,
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
    webEmbeddedUri,
    webIframeRenderLoggedKeyRef,
  ]);

  const body = (() => {
    if (state === "empty") {
      logPdfViewerError("[pdf-viewer] viewer_missing_session", {
        platform: Platform.OS,
        sessionId,
      });
      return (
        <EmptyState
          title="Document not found"
          subtitle="Viewer session was not found or has expired."
        />
      );
    }

    if (state === "error") {
      logPdfViewerError("[pdf-viewer] viewer_error_state", {
        platform: Platform.OS,
        sessionId,
        errorText: redactSensitiveText(errorText),
        uri: asset?.uri ?? null,
        scheme: getUriScheme(asset?.uri),
      });
      return (
        <CenteredPanel
          title="Unable to open document"
          subtitle={errorText || "Preview failed to load."}
          actionLabel="Retry"
          onAction={onRetry}
          secondaryLabel={asset ? "Open externally" : undefined}
          onSecondaryAction={asset ? () => void onOpenExternal() : undefined}
        />
      );
    }

    if (resolvedSource.kind === "missing-asset") {
      logPdfViewerError("[pdf-viewer] viewer_invalid_asset", {
        platform: Platform.OS,
        sessionId,
        hasAsset: Boolean(asset),
        uri: asset?.uri ?? null,
      });
      return (
        <EmptyState
          title="Document not found"
          subtitle="Missing document asset."
        />
      );
    }

    if (resolvedSource.kind !== "resolved-embedded") {
      if (resolvedSource.kind === "resolved-native-handoff") {
        return (
          <PdfViewerNativeShell
            mode="native-handoff"
            asset={asset}
            completed={nativeHandoffCompleted}
            onToggleChrome={toggleChrome}
            onOpenAgain={() => {
              void handoffPdfPreview(resolvedSource.asset, "manual");
            }}
            onShare={asset ? () => void onShare() : undefined}
          />
        );
      }
      return (
        <CenteredPanel
          title="Unable to open document"
          subtitle={
            resolvedSource.kind === "unsupported-mobile-source"
              ? resolvedSource.errorMessage
              : "Preview failed to load."
          }
          actionLabel="Retry"
          onAction={onRetry}
          secondaryLabel={asset ? "Open externally" : undefined}
          onSecondaryAction={asset ? () => void onOpenExternal() : undefined}
        />
      );
    }

    if (!isReadyToRender) {
      return (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Открывается...</Text>
        </View>
      );
    }

    if (!source) {
      logPdfViewerError("[pdf-viewer] viewer_invalid_asset", {
        platform: Platform.OS,
        sessionId,
        hasAsset: Boolean(asset),
        uri: asset?.uri ?? null,
      });
      return (
        <EmptyState
          title="Document not found"
          subtitle="Missing document asset."
        />
      );
    }

    return (
      <Pressable style={styles.viewerBody} onPress={toggleChrome}>
        {state === "loading" ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Открывается...</Text>
          </View>
        ) : null}

        {Platform.OS === "web" ? (
          <PdfViewerWebShell
            asset={asset}
            width={width}
            renderInstanceKey={renderInstanceKey}
            webEmbeddedUri={webEmbeddedUri}
            onLoad={() => {
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
            }}
            onError={() => {
              const eventPlan = resolvePdfViewerWebIframeErrorEventPlan({
                renderEventPlan: resolveRenderEventCommitPlan(renderInstanceKey),
                sessionId,
                asset,
                renderUri: webEmbeddedUri || asset.uri,
              });
              if (eventPlan.action === "skip_render_event") return;
              emitPdfViewerRenderConsoleCommand(eventPlan.console);
              markError(eventPlan.message, "render");
            }}
          />
        ) : (
          <PdfViewerNativeShell
            mode="native-webview"
            source={source}
            renderInstanceKey={renderInstanceKey}
            nativePdfWebView={NativePdfWebView}
            nativeWebViewReadAccessUri={nativeWebViewReadAccessUri}
            onLoadStart={() => {
              const eventPlan = resolvePdfViewerNativeLoadStartEventPlan({
                asset,
                source: resolvedSource,
              });
              emitPdfViewerRenderBreadcrumbCommands(
                recordViewerBreadcrumb,
                eventPlan.breadcrumbs,
              );
            }}
            onLoadEnd={() => {
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
            }}
            onError={(event) => {
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
            }}
            onHttpError={(event) => {
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
            }}
            onOpenExternal={() => void onOpenExternal()}
          />
        )}
      </Pressable>
    );
  })();

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <View style={styles.screenRoot}>
        <View
          pointerEvents={showChrome ? "auto" : "none"}
          style={[
            styles.header,
            showChrome ? styles.chromeVisible : styles.chromeHidden,
            {
              height: headerHeight,
              paddingTop: Platform.OS === "web" ? 0 : insets.top,
            },
          ]}
        >
          <Pressable
            onPress={onBack}
            style={styles.iconButton}
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={20} color={VIEWER_TEXT} />
          </Pressable>

          <View style={styles.headerTitleWrap}>
            <Text numberOfLines={1} style={styles.headerTitle}>
              {asset?.title || "PDF"}
            </Text>
          </View>

          <View style={styles.menuAnchor}>
            <Pressable
              onPress={() => setMenuOpen((value) => !value)}
              style={styles.iconButton}
              disabled={!asset}
              accessibilityLabel="Document actions"
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={18}
                color={VIEWER_TEXT}
              />
            </Pressable>
            {menuOpen && asset ? (
              <View style={styles.menu}>
                <MenuAction
                  icon="share-outline"
                  label="Share"
                  onPress={() => void onShare()}
                />
                <MenuAction
                  icon="download-outline"
                  label="Download"
                  onPress={() => void onDownload()}
                />
                <MenuAction
                  icon="open-outline"
                  label="Open externally"
                  onPress={() => void onOpenExternal()}
                />
                <MenuAction
                  icon="print-outline"
                  label="Print"
                  onPress={() => void onPrint()}
                />
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.documentStage}>{body}</View>

        {showPageIndicator ? (
          <View
            pointerEvents="none"
            style={[
              styles.pageIndicatorWrap,
              showChrome
                ? styles.pageIndicatorVisible
                : styles.pageIndicatorHidden,
            ]}
          >
            <View style={styles.pageIndicator}>
              <Text style={styles.pageIndicatorText}>{pageIndicatorText}</Text>
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}


export default withScreenErrorBoundary(PdfViewerScreen, {
  screen: "pdf_viewer",
  route: "/pdf-viewer",
  title: "Ошибка просмотра PDF",
});

