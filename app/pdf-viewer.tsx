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
  type DocumentSession,
} from "../src/lib/documents/pdfDocumentSessions";


import {
  getReadAccessParentUri,
  resolvePdfViewerDirectSnapshot,
  resolvePdfViewerResolution,
  resolvePdfViewerState,
  type PdfViewerState as ViewerState,
} from "../src/lib/pdf/pdfViewerContract";
import { createPdfViewerRenderInstanceKey } from "../src/lib/pdf/pdfViewerRenderLifecycle";
import { shouldCommitPdfViewerRenderEvent } from "../src/lib/pdf/pdfViewerRenderEventGuard";
import { resolvePdfViewerWebRenderUriCleanup } from "../src/lib/pdf/pdfViewerWebRenderUriCleanup";
import {
  failPdfOpenVisible,
  markPdfOpenVisible,
} from "../src/lib/pdf/pdfOpenFlow";
import {
  recordPdfCrashBreadcrumbAsync,
  shouldRecordPdfCrashBreadcrumbs,
} from "../src/lib/pdf/pdfCrashBreadcrumbs";
import { recordPdfCriticalPathEvent } from "../src/lib/pdf/pdfCriticalPath";
import {
  beginPdfNativeHandoff,
  completePdfNativeHandoff,
  createPdfNativeHandoffGuardState,
  createPdfNativeHandoffKey,
  resetPdfNativeHandoffGuard,
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
  createPdfViewerLoadingTimeoutGuardState,
  shouldCommitPdfViewerLoadingTimeout,
} from "../src/lib/pdf/pdfViewerLoadingTimeoutGuard";
import { resolvePdfViewerBootstrapPlan } from "../src/lib/pdf/pdfViewerBootstrapPlan";
import {
  resolvePdfViewerOpenFailedSignalPlan,
  resolvePdfViewerOpenVisibleSignalPlan,
} from "../src/lib/pdf/pdfViewerOpenSignalPlan";

import { openPdfPreview } from "../src/lib/pdfRunner";
import {
  FALLBACK_ROUTE,
  VIEWER_BG,
  VIEWER_TEXT,
  VIEWER_PLATFORM,
} from "../src/lib/pdf/pdfViewer.constants";
import { styles } from "../src/lib/pdf/pdfViewer.styles";
import { MenuAction, EmptyState, CenteredPanel } from "../src/lib/pdf/pdfViewer.components";
import {
  getUriScheme,
  inspectLocalPdfFile,
  validateEmbeddedPreviewResolution,
  FileSystemCompat,
} from "../src/lib/pdf/pdfViewer.helpers";
import { usePdfViewerActions } from "../src/lib/pdf/usePdfViewerActions";
import { recordCatchDiscipline } from "../src/lib/observability/catchDiscipline";
import { safeBack } from "../src/lib/navigation/safeBack";
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
  console.info("[pdf-viewer] viewer_params_parsed", {
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
  console.info("[pdf-viewer] viewer_snapshot_resolved", {
    platform: Platform.OS,
    hasSession: Boolean(snapshot.session),
    hasAsset: Boolean(snapshot.asset),
    sessionId: snapshot.session?.sessionId ?? null,
    assetUri: snapshot.asset?.uri?.slice(-40) ?? null,
    sourceKind: snapshot.asset?.sourceKind ?? null,
  });
  const [session, setSession] = React.useState<DocumentSession | null>(
    snapshot.session,
  );
  const [asset, setAsset] = React.useState<DocumentAsset | null>(
    snapshot.asset,
  );
  const [state, setState] = React.useState<ViewerState>(
    resolvePdfViewerState(snapshot.session, snapshot.asset, VIEWER_PLATFORM),
  );
  const [errorText, setErrorText] = React.useState(
    snapshot.session?.errorMessage || "",
  );
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [isReadyToRender, setIsReadyToRender] = React.useState(false);
  const [chromeVisible, setChromeVisible] = React.useState(true);
  const [nativeHandoffCompleted, setNativeHandoffCompleted] =
    React.useState(false);
  const [loadAttempt, setLoadAttempt] = React.useState(0);
  const [webRenderUri, setWebRenderUri] = React.useState<string | null>(null);
  const openedAtRef = React.useRef<number>(Date.now());
  const loadingTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const initialAssetUriRef = React.useRef("");
  const isMountedRef = React.useRef(true);
  const renderFailedRef = React.useRef(false);
  const webRenderUriRef = React.useRef<string | null>(null);
  const openSignalSettledRef = React.useRef(false);
  const webIframeRenderLoggedKeyRef = React.useRef("");
  const activeRenderInstanceKeyRef = React.useRef("");
  const nativeHandoffGuardRef = React.useRef(
    createPdfNativeHandoffGuardState(),
  );
  const loadingTimeoutGuardRef = React.useRef(
    createPdfViewerLoadingTimeoutGuardState(),
  );
  const resolvedSource = React.useMemo(
    () =>
      resolvePdfViewerResolution({ session, asset, platform: VIEWER_PLATFORM }),
    [asset, session],
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

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    openSignalSettledRef.current = false;
    webIframeRenderLoggedKeyRef.current = "";
    resetPdfNativeHandoffGuard(nativeHandoffGuardRef.current);
  }, [openToken, sessionId, loadAttempt]);

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
  }, []);

  React.useEffect(() => {
    return () => {
      clearWebRenderUri({ commitState: false });
    };
  }, [clearWebRenderUri]);

  React.useEffect(() => {
    console.info("[pdf-viewer] viewer_route_mounted", {
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
        VIEWER_PLATFORM,
      );
      return prev === nextState ? prev : nextState;
    });
    return next;
  }, [resolveSnapshot]);

  const clearLoadingTimeout = React.useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    cancelPdfViewerLoadingTimeout(loadingTimeoutGuardRef.current);
  }, []);

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
    [openToken, sessionId],
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
      openToken,
      sessionId,
    ],
  );

  const markError = React.useCallback(
    (
      message: string,
      phase: "resolution" | "render" | "timeout" | "action" = "render",
    ) => {
      renderFailedRef.current = true;
      clearLoadingTimeout();
      setIsReadyToRender(false);
      setErrorText(message);
      setState("error");
      if (sessionId) failDocumentSession(sessionId, message);
      const next = syncSnapshot();
      if (next.asset) {
        const scheme = String(next.asset.uri || "").split(":")[0] || "unknown";
        console.error("[pdf-viewer] load_error", {
          documentType: next.asset.documentType,
          originModule: next.asset.originModule,
          scheme,
          platform: Platform.OS,
          phase,
          error: message,
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
    if (!next.session) {
      setState("empty");
      return;
    }
    touchDocumentSession(next.session.sessionId);
    setState("loading");
    const timeoutCycle = armPdfViewerLoadingTimeout(
      loadingTimeoutGuardRef.current,
    );
    loadingTimeoutRef.current = setTimeout(() => {
      if (
        !shouldCommitPdfViewerLoadingTimeout(
          loadingTimeoutGuardRef.current,
          timeoutCycle,
        )
      ) {
        return;
      }
      markError("Document loading timed out.", "timeout");
    }, 15000);
  }, [clearLoadingTimeout, markError, syncSnapshot]);

  const markReady = React.useCallback(() => {
    clearLoadingTimeout();
    const next = syncSnapshot();
    setErrorText("");
    setState("ready");
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
    diagnosticsScreen,
    openToken,
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
        console.info(duplicatePlan.console.label, duplicatePlan.console.payload);
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
      setErrorText("");
      setState("loading");
      setIsReadyToRender(true);
      setNativeHandoffCompleted(false);

      try {
        console.info(
          startCommandPlan.console.label,
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
        console.info(
          successTelemetryPlan.console.label,
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
        setNativeHandoffCompleted(true);
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
        console.error(
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
      diagnosticsScreen,
      markError,
      markReady,
      openToken,
      recordViewerBreadcrumb,
      sessionId,
    ],
  );

  React.useEffect(() => {
    openedAtRef.current = Date.now();
    renderFailedRef.current = false;
    clearLoadingTimeout();
    clearWebRenderUri();
    setIsReadyToRender(false);
    setNativeHandoffCompleted(false);
    setChromeVisible(true);
    setMenuOpen(false);
    const next = syncSnapshot();

    if (!next.session) {
      setState("empty");
      return;
    }

    touchDocumentSession(next.session.sessionId);
    setErrorText(next.session.errorMessage || "");
    setState(resolvePdfViewerState(next.session, next.asset, VIEWER_PLATFORM));
    let cancelled = false;

    const prepareViewer = async () => {
      const resolution = resolvePdfViewerResolution({
        session: next.session,
        asset: next.asset,
        platform: VIEWER_PLATFORM,
      });
      const bootstrapPlan = resolvePdfViewerBootstrapPlan({
        resolution,
        platform: VIEWER_PLATFORM,
      });
      if (bootstrapPlan.action === "show_empty") {
        setState("empty");
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

      initialAssetUriRef.current = String(resolvedAsset.uri || "");
      console.info("[pdf-viewer] open", {
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
        console.info("[pdf-viewer] signedUrl", bootstrapPlan.webRenderUri);
        console.info("[pdf-viewer] web_iframe_src_ready", {
          sessionId: next.session.sessionId,
          documentType: resolvedAsset.documentType,
          originModule: resolvedAsset.originModule,
          remoteUri: bootstrapPlan.webRenderUri,
          renderUri: bootstrapPlan.webRenderUri,
          renderScheme: getUriScheme(bootstrapPlan.webRenderUri),
        });
        setIsReadyToRender(true);
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
      console.info("[pdf-viewer] unmount", {
        sessionId,
        documentType: next.asset?.documentType ?? null,
        originModule: next.asset?.originModule ?? null,
        scheme: getUriScheme(next.asset?.uri),
      });
      clearLoadingTimeout();
    };
  }, [
    clearLoadingTimeout,
    clearWebRenderUri,
    enterLoading,
    handoffPdfPreview,
    markError,
    markReady,
    recordViewerBreadcrumb,
    sessionId,
    syncSnapshot,
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
      setState("empty");
      return;
    }
    clearWebRenderUri();
    setErrorText("");
    setNativeHandoffCompleted(false);
    setLoadAttempt((value) => value + 1);
  }, [clearWebRenderUri, syncSnapshot]);

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
        platform: VIEWER_PLATFORM,
        sessionId,
        loadAttempt,
      });
    }
    return createPdfViewerRenderInstanceKey({
      platform: VIEWER_PLATFORM,
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
  }, [asset, loadAttempt, resolvedSource, sessionId, webEmbeddedUri]);

  React.useLayoutEffect(() => {
    activeRenderInstanceKeyRef.current = renderInstanceKey;
  }, [renderInstanceKey]);

  const isActiveRenderEvent = React.useCallback(
    (eventRenderInstanceKey: string) =>
      shouldCommitPdfViewerRenderEvent({
        activeRenderInstanceKey: activeRenderInstanceKeyRef.current,
        eventRenderInstanceKey,
      }),
    [],
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
          console.error("[pdf-viewer] viewer_file_inspect_failed", {
            sessionId,
            uri: resolvedAsset.uri,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (!cancelled) {
        if (Platform.OS !== "web" && scheme === "file" && exists === false) {
          console.info("[pdf-viewer] viewer_local_file_exists_no", {
            sessionId,
            uri: resolvedAsset.uri,
            exists: false,
            sizeBytes: size ?? resolvedAsset.sizeBytes,
            sourceKind: "local-file",
            documentType: resolvedAsset.documentType,
            originModule: resolvedAsset.originModule,
          });
          console.error("[pdf-viewer] viewer_file_not_found", {
            sessionId,
            uri: resolvedAsset.uri,
            fileName: resolvedAsset.fileName,
          });
        } else if (
          Platform.OS !== "web" &&
          scheme === "file" &&
          exists === true
        ) {
          console.info("[pdf-viewer] viewer_local_file_exists_yes", {
            sessionId,
            uri: resolvedAsset.uri,
            exists: true,
            sizeBytes: size ?? resolvedAsset.sizeBytes,
            sourceKind: "local-file",
            documentType: resolvedAsset.documentType,
            originModule: resolvedAsset.originModule,
          });
        }
        console.info("[pdf-viewer] viewer_before_render", {
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

    console.info("[pdf-viewer] web_iframe_render", {
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
  ]);

  const body = (() => {
    if (state === "empty") {
      console.error("[pdf-viewer] viewer_missing_session", {
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
      console.error("[pdf-viewer] viewer_error_state", {
        platform: Platform.OS,
        sessionId,
        errorText,
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
      console.error("[pdf-viewer] viewer_invalid_asset", {
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
        if (!nativeHandoffCompleted) {
          return (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.loadingText}>Открывается...</Text>
            </View>
          );
        }
        return (
          <Pressable style={styles.viewerBody} onPress={toggleChrome}>
            <CenteredPanel
              title="Документ открыт во внешнем PDF-приложении"
              subtitle="Вернитесь в приложение, когда закончите, или откройте документ ещё раз отсюда."
              actionLabel="Открыть ещё раз"
              onAction={() => {
                void handoffPdfPreview(resolvedSource.asset, "manual");
              }}
              secondaryLabel={asset ? "Поделиться" : undefined}
              onSecondaryAction={asset ? () => void onShare() : undefined}
            />
          </Pressable>
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
      console.error("[pdf-viewer] viewer_invalid_asset", {
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
          <View style={styles.viewerBody}>
            <View
              style={[
                styles.webFrameWrap,
                { maxWidth: width >= 1200 ? 1080 : width >= 860 ? 960 : width },
              ]}
            >
              <iframe
                key={renderInstanceKey}
                data-render-key={renderInstanceKey}
                title={asset.title || "PDF"}
                src={webEmbeddedUri || undefined}
                onLoad={() => {
                  if (!isActiveRenderEvent(renderInstanceKey)) return;
                  console.info("[pdf-viewer] web_iframe_load", {
                    sessionId,
                    documentType: asset.documentType,
                    originModule: asset.originModule,
                    uri: webEmbeddedUri || asset.uri,
                  });
                  markReady();
                }}
                onError={() => {
                  if (!isActiveRenderEvent(renderInstanceKey)) return;
                  console.error("[pdf-viewer] web_iframe_error", {
                    sessionId,
                    documentType: asset.documentType,
                    originModule: asset.originModule,
                    uri: webEmbeddedUri || asset.uri,
                  });
                  markError("Web PDF frame failed to load.", "render");
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  background: VIEWER_BG,
                }}
              />
            </View>
          </View>
        ) : NativePdfWebView ? (
          <NativePdfWebView
            key={renderInstanceKey}
            testID="native-pdf-webview"
            source={source}
            originWhitelist={["*"]}
            allowingReadAccessToURL={nativeWebViewReadAccessUri}
            style={styles.nativeWebView}
            onLoadStart={() => {
              recordViewerBreadcrumb("native_open_start", {
                uri: asset.uri,
                uriKind: getUriScheme(asset.uri),
                sourceKind: resolvedSource.sourceKind,
                fileSizeBytes: asset.sizeBytes,
                fileExists: typeof asset.sizeBytes === "number" ? true : null,
                previewPath: resolvedSource.renderer,
                extra: {
                  handoffType: "native_webview",
                },
              });
              recordViewerBreadcrumb("native_webview_load_start", {
                uri: asset.uri,
                uriKind: getUriScheme(asset.uri),
                sourceKind: resolvedSource.sourceKind,
                fileSizeBytes: asset.sizeBytes,
                fileExists: typeof asset.sizeBytes === "number" ? true : null,
                previewPath: resolvedSource.renderer,
              });
            }}
            onLoadEnd={() => {
              if (!isActiveRenderEvent(renderInstanceKey)) return;
              if (renderFailedRef.current) return;
              console.info("[pdf-viewer] native_webview_load_end", {
                sessionId,
                documentType: asset.documentType,
                originModule: asset.originModule,
                uri: asset.uri,
              });
              recordViewerBreadcrumb("native_webview_load_end", {
                uri: asset.uri,
                uriKind: getUriScheme(asset.uri),
                sourceKind: resolvedSource.sourceKind,
                fileSizeBytes: asset.sizeBytes,
                fileExists: typeof asset.sizeBytes === "number" ? true : null,
                previewPath: resolvedSource.renderer,
              });
              recordViewerBreadcrumb("native_open_success", {
                uri: asset.uri,
                uriKind: getUriScheme(asset.uri),
                sourceKind: resolvedSource.sourceKind,
                fileSizeBytes: asset.sizeBytes,
                fileExists: typeof asset.sizeBytes === "number" ? true : null,
                previewPath: resolvedSource.renderer,
                terminalState: "success",
                extra: {
                  handoffType: "native_webview",
                },
              });
              markReady();
            }}
            onError={(event: { nativeEvent?: { description?: string } }) => {
              if (!isActiveRenderEvent(renderInstanceKey)) return;
              const message = String(
                event?.nativeEvent?.description ||
                  "Native PDF viewer failed to load.",
              ).trim();
              console.error("[pdf-viewer] native_webview_error", {
                sessionId,
                documentType: asset.documentType,
                originModule: asset.originModule,
                uri: asset.uri,
                error: message,
              });
              recordViewerBreadcrumb("native_webview_error", {
                uri: asset.uri,
                uriKind: getUriScheme(asset.uri),
                sourceKind: resolvedSource.sourceKind,
                fileSizeBytes: asset.sizeBytes,
                fileExists: typeof asset.sizeBytes === "number" ? true : null,
                previewPath: resolvedSource.renderer,
                errorMessage: message,
              });
              recordViewerBreadcrumb("native_open_error", {
                uri: asset.uri,
                uriKind: getUriScheme(asset.uri),
                sourceKind: resolvedSource.sourceKind,
                fileSizeBytes: asset.sizeBytes,
                fileExists: typeof asset.sizeBytes === "number" ? true : null,
                previewPath: resolvedSource.renderer,
                errorMessage: message,
                terminalState: "error",
                extra: {
                  handoffType: "native_webview",
                },
              });
              markError(message, "render");
            }}
            onHttpError={(event: {
              nativeEvent?: { statusCode?: number; description?: string };
            }) => {
              if (!isActiveRenderEvent(renderInstanceKey)) return;
              const statusCode = Number(event?.nativeEvent?.statusCode);
              const description = String(
                event?.nativeEvent?.description || "",
              ).trim();
              const message = statusCode
                ? `PDF request failed (${statusCode}).`
                : description || "PDF request failed.";
              console.error("[pdf-viewer] native_webview_http_error", {
                sessionId,
                documentType: asset.documentType,
                originModule: asset.originModule,
                uri: asset.uri,
                statusCode: Number.isFinite(statusCode) ? statusCode : null,
                error: message,
              });
              recordViewerBreadcrumb("native_webview_http_error", {
                uri: asset.uri,
                uriKind: getUriScheme(asset.uri),
                sourceKind: resolvedSource.sourceKind,
                fileSizeBytes: asset.sizeBytes,
                fileExists: typeof asset.sizeBytes === "number" ? true : null,
                previewPath: resolvedSource.renderer,
                errorMessage: message,
                extra: {
                  statusCode: Number.isFinite(statusCode) ? statusCode : null,
                },
              });
              recordViewerBreadcrumb("native_open_error", {
                uri: asset.uri,
                uriKind: getUriScheme(asset.uri),
                sourceKind: resolvedSource.sourceKind,
                fileSizeBytes: asset.sizeBytes,
                fileExists: typeof asset.sizeBytes === "number" ? true : null,
                previewPath: resolvedSource.renderer,
                errorMessage: message,
                terminalState: "error",
                extra: {
                  handoffType: "native_webview",
                  statusCode: Number.isFinite(statusCode) ? statusCode : null,
                },
              });
              markError(message, "render");
            }}
          />
        ) : (
          <CenteredPanel
            title="Unable to open document"
            subtitle="Native PDF preview is unavailable on this device."
            actionLabel="Open externally"
            onAction={() => void onOpenExternal()}
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

