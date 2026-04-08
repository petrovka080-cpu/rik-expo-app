import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as FileSystemModule from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";

import {
  failDocumentSession,
  getDocumentSessionSnapshot,
  touchDocumentSession,
  type DocumentAsset,
  type DocumentSession,
} from "../src/lib/documents/pdfDocumentSessions";
import {
  openPdfDocumentExternal,
  sharePdfDocument,
} from "../src/lib/documents/pdfDocumentActions";
import {
  getReadAccessParentUri,
  resolvePdfViewerDirectSnapshot,
  resolvePdfViewerResolution,
  resolvePdfViewerState,
  type PdfViewerResolution,
  type PdfViewerState as ViewerState,
} from "../src/lib/pdf/pdfViewerContract";
import {
  failPdfOpenVisible,
  markPdfOpenVisible,
} from "../src/lib/pdf/pdfOpenFlow";
import {
  recordPdfCrashBreadcrumbAsync,
  shouldRecordPdfCrashBreadcrumbs,
} from "../src/lib/pdf/pdfCrashBreadcrumbs";
import {
  assertValidLocalPdfFile,
  assertValidRemotePdfResponse,
} from "../src/lib/pdf/pdfSourceValidation";
import { openPdfPreview } from "../src/lib/pdfRunner";
import { recordCatchDiscipline } from "../src/lib/observability/catchDiscipline";

type ViewerFileInfo = {
  exists: boolean;
  sizeBytes?: number;
};

type FileSystemInfoResult = {
  exists?: unknown;
  size?: unknown;
};

type FileSystemCompatShape = {
  getInfoAsync?: (uri: string) => Promise<FileSystemInfoResult | null | undefined>;
  readAsStringAsync?: (
    uri: string,
    options: { encoding: "base64"; position?: number; length?: number },
  ) => Promise<string>;
};

const FileSystemCompat: FileSystemCompatShape = FileSystemModule;
const NativePdfWebView =
  Platform.OS === "web"
    ? null
    : ((() => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          return require("react-native-webview").WebView ?? null;
        } catch {
          return null;
        }
      })() as React.ComponentType<any> | null);

const FALLBACK_ROUTE = "/";
const VIEWER_BG = "#111111";
const VIEWER_HEADER_BG = "rgba(17,17,17,0.94)";
const VIEWER_BORDER = "rgba(255,255,255,0.08)";
const VIEWER_TEXT = "#F8FAFC";
const VIEWER_SUBTLE = "rgba(255,255,255,0.72)";
const VIEWER_DIM = "rgba(255,255,255,0.52)";
const VIEWER_PLATFORM = Platform.OS === "web" ? "web" : Platform.OS === "android" ? "android" : "ios";

function getUriScheme(uri?: string | null) {
  const value = String(uri || "").trim();
  const match = value.match(/^([a-z0-9+.-]+):/i);
  return match?.[1]?.toLowerCase() || "";
}

async function inspectLocalPdfFile(uri: string): Promise<ViewerFileInfo | null> {
  if (!FileSystemCompat.getInfoAsync) return null;
  const info = await FileSystemCompat.getInfoAsync(uri);
  return {
    exists: Boolean(info?.exists),
    sizeBytes: Number.isFinite(Number(info?.size)) ? Number(info?.size) : undefined,
  };
}

async function validateEmbeddedPreviewResolution(
  resolution: Extract<PdfViewerResolution, { kind: "resolved-embedded" }>,
) {
  if (Platform.OS === "web") return;

  if (resolution.sourceKind === "local-file" || resolution.scheme === "file") {
    await assertValidLocalPdfFile({
      fileSystem: FileSystemCompat,
      uri: resolution.asset.uri,
      failureLabel: "PDF preview file",
      mode: Platform.OS === "ios" ? "size-only" : "content-probe",
    });
    return;
  }

  if (resolution.sourceKind === "remote-url") {
    await assertValidRemotePdfResponse({
      uri: resolution.asset.uri,
      failureLabel: "PDF preview response",
    });
  }
}

async function downloadPdfAsset(asset: DocumentAsset) {
  if (Platform.OS === "web") {
    if (typeof document === "undefined") return;
    const link = document.createElement("a");
    link.href = asset.uri;
    link.download = asset.fileName || `${asset.title || "document"}.pdf`;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }
  await sharePdfDocument(asset);
}

async function printPdfAsset(asset: DocumentAsset) {
  if (Platform.OS === "web") {
    if (typeof document === "undefined") return;
    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.opacity = "0";
    frame.style.pointerEvents = "none";
    frame.src = asset.uri;
    document.body.appendChild(frame);
    frame.onload = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(frame);
      }, 1200);
    };
    return;
  }
  await openPdfDocumentExternal(asset);
}

export default function PdfViewerScreen() {
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
  const sessionId = React.useMemo(() => String(params.sessionId || "").trim(), [params.sessionId]);
  const openToken = React.useMemo(() => String(params.openToken || "").trim(), [params.openToken]);
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
    return resolvePdfViewerDirectSnapshot(directSnapshotParams) ?? { session: null, asset: null };
  }, [directSnapshotParams, sessionId]);
  const snapshot = React.useMemo(() => resolveSnapshot(), [resolveSnapshot]);
  const [session, setSession] = React.useState<DocumentSession | null>(snapshot.session);
  const [asset, setAsset] = React.useState<DocumentAsset | null>(snapshot.asset);
  const [state, setState] = React.useState<ViewerState>(
    resolvePdfViewerState(snapshot.session, snapshot.asset, VIEWER_PLATFORM),
  );
  const [errorText, setErrorText] = React.useState(snapshot.session?.errorMessage || "");
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [isReadyToRender, setIsReadyToRender] = React.useState(false);
  const [chromeVisible, setChromeVisible] = React.useState(true);
  const [nativeHandoffCompleted, setNativeHandoffCompleted] = React.useState(false);
  const [loadAttempt, setLoadAttempt] = React.useState(0);
  const [webRenderUri, setWebRenderUri] = React.useState<string | null>(null);
  const openedAtRef = React.useRef<number>(Date.now());
  const loadingTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialAssetUriRef = React.useRef("");
  const isMountedRef = React.useRef(true);
  const renderFailedRef = React.useRef(false);
  const webRenderUriRef = React.useRef<string | null>(null);
  const openSignalSettledRef = React.useRef(false);
  const webIframeRenderLoggedKeyRef = React.useRef("");
  const resolvedSource = React.useMemo(
    () => resolvePdfViewerResolution({ session, asset, platform: VIEWER_PLATFORM }),
    [asset, session],
  );
  const resolvedPreviewPath = React.useMemo(
    () => (resolvedSource.kind === "resolved-embedded" ? resolvedSource.renderer : resolvedSource.kind),
    [resolvedSource],
  );
  const diagnosticsScreen = React.useMemo(() => {
    const origin = String(asset?.originModule ?? snapshot.asset?.originModule ?? params.originModule ?? "").trim().toLowerCase();
    return shouldRecordPdfCrashBreadcrumbs(origin) ? origin : null;
  }, [asset?.originModule, params.originModule, snapshot.asset?.originModule]);
  const recordViewerBreadcrumb = React.useCallback((marker: string, overrides?: {
    uri?: string | null;
    uriKind?: string | null;
    sourceKind?: string | null;
    fileExists?: boolean | null;
    fileSizeBytes?: number | null;
    previewPath?: string | null;
    errorMessage?: string | null;
    terminalState?: "success" | "error" | null;
    extra?: Record<string, unknown>;
  }) => {
    if (!diagnosticsScreen) return;
    const currentAsset = asset ?? snapshot.asset ?? null;
    const uri = overrides?.uri ?? currentAsset?.uri ?? null;
    void recordPdfCrashBreadcrumbAsync({
      marker,
      screen: diagnosticsScreen,
      documentType: currentAsset?.documentType ?? params.documentType,
      originModule: currentAsset?.originModule ?? params.originModule,
      sourceKind: overrides?.sourceKind ?? currentAsset?.sourceKind ?? params.sourceKind,
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
  }, [
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
  ]);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    openSignalSettledRef.current = false;
    webIframeRenderLoggedKeyRef.current = "";
  }, [openToken, sessionId, loadAttempt]);

  const clearWebRenderUri = React.useCallback(() => {
    const current = webRenderUriRef.current;
    if (
      Platform.OS === "web" &&
      current &&
      current.startsWith("blob:") &&
      typeof URL !== "undefined" &&
      typeof URL.revokeObjectURL === "function"
    ) {
      try {
        URL.revokeObjectURL(current);
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
    setWebRenderUri(null);
  }, []);

  React.useEffect(() => {
    return () => {
      clearWebRenderUri();
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
  }, [
    params.sessionId,
    params.sourceKind,
    params.uri,
    recordViewerBreadcrumb,
    sessionId,
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
      const nextState = resolvePdfViewerState(next.session, next.asset, VIEWER_PLATFORM);
      return prev === nextState ? prev : nextState;
    });
    return next;
  }, [resolveSnapshot]);

  const clearLoadingTimeout = React.useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, []);

  const signalOpenVisible = React.useCallback(
    (resolvedAsset?: DocumentAsset | null, extra?: Record<string, unknown>) => {
      if (!openToken || openSignalSettledRef.current) return;
      openSignalSettledRef.current = true;
      markPdfOpenVisible(openToken, {
        sourceKind: resolvedAsset?.sourceKind,
        extra: {
          sessionId,
          documentType: resolvedAsset?.documentType ?? null,
          originModule: resolvedAsset?.originModule ?? null,
          fileName: resolvedAsset?.fileName ?? null,
          ...extra,
        },
      });
    },
    [openToken, sessionId],
  );

  const signalOpenFailed = React.useCallback(
    (message: string, extra?: Record<string, unknown>) => {
      if (!openToken || openSignalSettledRef.current) return;
      openSignalSettledRef.current = true;
      failPdfOpenVisible(openToken, new Error(message), {
        sourceKind: asset?.sourceKind,
        extra: {
          sessionId,
          documentType: asset?.documentType ?? null,
          originModule: asset?.originModule ?? null,
          fileName: asset?.fileName ?? null,
          ...extra,
        },
      });
    },
    [asset?.documentType, asset?.fileName, asset?.originModule, asset?.sourceKind, openToken, sessionId],
  );

  const markError = React.useCallback(
    (message: string, phase: "resolution" | "render" | "timeout" | "action" = "render") => {
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
      signalOpenFailed(message, { phase });
    },
    [clearLoadingTimeout, recordViewerBreadcrumb, sessionId, signalOpenFailed, syncSnapshot],
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
    loadingTimeoutRef.current = setTimeout(() => {
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
  }, [clearLoadingTimeout, recordViewerBreadcrumb, signalOpenVisible, syncSnapshot]);

  const handoffPdfPreview = React.useCallback(
    async (resolvedAsset: DocumentAsset, trigger: "primary" | "manual") => {
      clearLoadingTimeout();
      setMenuOpen(false);
      setErrorText("");
      setState("loading");
      setIsReadyToRender(true);
      setNativeHandoffCompleted(false);

      try {
        console.info("[pdf-viewer] native_handoff_start", {
          sessionId,
          documentType: resolvedAsset.documentType,
          originModule: resolvedAsset.originModule,
          uri: resolvedAsset.uri,
          scheme: getUriScheme(resolvedAsset.uri),
          sourceKind: resolvedAsset.sourceKind,
          trigger,
        });
        recordViewerBreadcrumb("native_open_start", {
          uri: resolvedAsset.uri,
          uriKind: getUriScheme(resolvedAsset.uri),
          sourceKind: resolvedAsset.sourceKind,
          fileSizeBytes: resolvedAsset.sizeBytes,
          fileExists: typeof resolvedAsset.sizeBytes === "number" ? true : null,
          previewPath: "native_handoff",
          extra: {
            trigger,
            handoffType: "native_handoff",
          },
        });
        await openPdfPreview(resolvedAsset.uri, resolvedAsset.fileName);
        console.info("[pdf-viewer] native_handoff_ready", {
          sessionId,
          documentType: resolvedAsset.documentType,
          originModule: resolvedAsset.originModule,
          uri: resolvedAsset.uri,
          sourceKind: resolvedAsset.sourceKind,
          trigger,
        });
        recordViewerBreadcrumb("native_open_success", {
          uri: resolvedAsset.uri,
          uriKind: getUriScheme(resolvedAsset.uri),
          sourceKind: resolvedAsset.sourceKind,
          fileSizeBytes: resolvedAsset.sizeBytes,
          fileExists: typeof resolvedAsset.sizeBytes === "number" ? true : null,
          previewPath: "native_handoff",
          terminalState: "success",
          extra: {
            trigger,
            handoffType: "native_handoff",
          },
        });
        if (!isMountedRef.current) return;
        setNativeHandoffCompleted(true);
        markReady();
      } catch (error) {
        if (!isMountedRef.current) return;
        const message = error instanceof Error ? error.message : String(error);
        console.error("[pdf-viewer] native_handoff_error", {
          sessionId,
          documentType: resolvedAsset.documentType,
          originModule: resolvedAsset.originModule,
          uri: resolvedAsset.uri,
          trigger,
          error: message,
        });
        recordViewerBreadcrumb("native_open_error", {
          uri: resolvedAsset.uri,
          uriKind: getUriScheme(resolvedAsset.uri),
          sourceKind: resolvedAsset.sourceKind,
          fileSizeBytes: resolvedAsset.sizeBytes,
          fileExists: typeof resolvedAsset.sizeBytes === "number" ? true : null,
          previewPath: "native_handoff",
          errorMessage: message,
          terminalState: "error",
          extra: {
            trigger,
            handoffType: "native_handoff",
          },
        });
        markError(message, "render");
      }
    },
    [clearLoadingTimeout, markError, markReady, recordViewerBreadcrumb, sessionId],
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
      if (resolution.kind === "missing-session") {
        setState("empty");
        return;
      }
      if (resolution.kind === "session-error") {
        setErrorText(resolution.errorMessage);
        setState("error");
        return;
      }
      if (resolution.kind === "missing-asset") {
        setErrorText("Missing document asset.");
        setState("error");
        return;
      }
      if (resolution.kind === "unsupported-mobile-source") {
        markError(resolution.errorMessage, "resolution");
        return;
      }

      initialAssetUriRef.current = String(resolution.asset.uri || "");
      console.info("[pdf-viewer] open", {
          sessionId: next.session.sessionId,
          documentType: resolution.asset.documentType,
          originModule: resolution.asset.originModule,
          uri: resolution.asset.uri,
          scheme: resolution.scheme,
          sourceKind: resolution.sourceKind,
          fileName: resolution.asset.fileName,
          exists: typeof resolution.asset.sizeBytes === "number" ? true : undefined,
          sizeBytes: resolution.asset.sizeBytes,
        renderer: resolution.renderer,
        openTime: new Date().toISOString(),
      });
      recordViewerBreadcrumb("viewer_resolution_selected", {
        uri: resolution.asset.uri,
        uriKind: resolution.scheme,
        sourceKind: resolution.sourceKind,
        fileSizeBytes: resolution.asset.sizeBytes,
        fileExists: typeof resolution.asset.sizeBytes === "number" ? true : null,
        previewPath: resolution.kind === "resolved-embedded" ? resolution.renderer : resolution.kind,
        extra: {
          renderer: resolution.renderer,
          resolutionKind: resolution.kind,
        },
      });

      enterLoading();
      if (resolution.kind === "resolved-native-handoff") {
        await handoffPdfPreview(resolution.asset, "primary");
        return;
      }
      if (Platform.OS !== "web" && resolution.kind === "resolved-embedded") {
        recordViewerBreadcrumb("viewer_validation_start", {
          uri: resolution.asset.uri,
          uriKind: resolution.scheme,
          sourceKind: resolution.sourceKind,
          fileSizeBytes: resolution.asset.sizeBytes,
          fileExists: typeof resolution.asset.sizeBytes === "number" ? true : null,
          previewPath: resolution.renderer,
        });
        try {
          await validateEmbeddedPreviewResolution(resolution);
          recordViewerBreadcrumb("viewer_validation_success", {
            uri: resolution.asset.uri,
            uriKind: resolution.scheme,
            sourceKind: resolution.sourceKind,
            fileSizeBytes: resolution.asset.sizeBytes,
            fileExists: typeof resolution.asset.sizeBytes === "number" ? true : null,
            previewPath: resolution.renderer,
          });
        } catch (error) {
          if (!cancelled) {
            const message = error instanceof Error ? error.message : String(error);
            recordViewerBreadcrumb("viewer_validation_failed", {
              uri: resolution.asset.uri,
              uriKind: resolution.scheme,
              sourceKind: resolution.sourceKind,
              fileSizeBytes: resolution.asset.sizeBytes,
              fileExists: typeof resolution.asset.sizeBytes === "number" ? true : null,
              previewPath: resolution.renderer,
              errorMessage: message,
            });
            markError(message, "resolution");
          }
          return;
        }
      }
      if (Platform.OS === "web" && resolution.kind === "resolved-embedded") {
        if (resolution.sourceKind === "remote-url") {
          clearWebRenderUri();
          webRenderUriRef.current = resolution.asset.uri;
          setWebRenderUri(resolution.asset.uri);
          console.info("[pdf-viewer] signedUrl", resolution.asset.uri);
          console.info("[pdf-viewer] web_iframe_src_ready", {
            sessionId: next.session.sessionId,
            documentType: resolution.asset.documentType,
            originModule: resolution.asset.originModule,
            remoteUri: resolution.asset.uri,
            renderUri: resolution.asset.uri,
            renderScheme: getUriScheme(resolution.asset.uri),
          });
          setIsReadyToRender(true);
          return;
        }
        setWebRenderUri(resolution.asset.uri);
      }
      if (!cancelled) {
        recordViewerBreadcrumb("viewer_render_bootstrap_ready", {
          uri: resolution.asset.uri,
          uriKind: resolution.scheme,
          sourceKind: resolution.sourceKind,
          fileSizeBytes: resolution.asset.sizeBytes,
          fileExists: typeof resolution.asset.sizeBytes === "number" ? true : null,
          previewPath: resolution.renderer,
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

  const onShare = React.useCallback(async () => {
    if (!asset) return;
    try {
      await sharePdfDocument(asset);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      markError(message);
      console.error("[pdf-viewer] share_error", {
        documentType: asset.documentType,
        originModule: asset.originModule,
        error: message,
      });
    } finally {
      setMenuOpen(false);
    }
  }, [asset, markError]);

  const onOpenExternal = React.useCallback(async () => {
    if (!asset) return;
    try {
      await openPdfDocumentExternal(asset);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      markError(message);
      console.error("[pdf-viewer] external_open_error", {
        documentType: asset.documentType,
        originModule: asset.originModule,
        error: message,
      });
    } finally {
      setMenuOpen(false);
    }
  }, [asset, markError]);

  const onDownload = React.useCallback(async () => {
    if (!asset) return;
    try {
      await downloadPdfAsset(asset);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      markError(message);
    } finally {
      setMenuOpen(false);
    }
  }, [asset, markError]);

  const onPrint = React.useCallback(async () => {
    if (!asset) return;
    try {
      await printPdfAsset(asset);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      markError(message);
    } finally {
      setMenuOpen(false);
    }
  }, [asset, markError]);

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
    const canGoBackRouter = typeof (router as any).canGoBack === "function"
      ? Boolean((router as any).canGoBack())
      : false;
    const webHasHistory =
      Platform.OS === "web" && typeof window !== "undefined" && window.history.length > 1;

    if ((Platform.OS !== "web" && canGoBackRouter) || webHasHistory) {
      router.back();
      return;
    }

    router.replace(FALLBACK_ROUTE);
  }, []);

  const source = React.useMemo(() => {
    return resolvedSource.kind === "resolved-embedded" ? resolvedSource.source : undefined;
  }, [resolvedSource]);
  const webEmbeddedUri = React.useMemo(() => {
    if (Platform.OS !== "web" || resolvedSource.kind !== "resolved-embedded") return "";
    if (resolvedSource.sourceKind === "remote-url") return webRenderUri ?? "";
    return resolvedSource.canonicalUri;
  }, [resolvedSource, webRenderUri]);
  const nativeWebViewReadAccessUri = React.useMemo(() => {
    if (Platform.OS === "web" || resolvedSource.kind !== "resolved-embedded") return undefined;
    if ("html" in resolvedSource.source && typeof resolvedSource.source.baseUrl === "string") {
      const baseUrl = resolvedSource.source.baseUrl.trim();
      if (baseUrl) return baseUrl;
    }
    return getReadAccessParentUri(resolvedSource.asset.uri);
  }, [resolvedSource]);

  const showChrome = Platform.OS === "web" ? true : chromeVisible;
  const headerBarHeight = Platform.OS === "web" || width >= 768 ? 56 : 50;
  const headerHeight = headerBarHeight + (Platform.OS === "web" ? 0 : insets.top);
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
      if (
        resolvedSource.kind !== "resolved-embedded"
      ) {
        return;
      }
      const { asset: resolvedAsset, scheme } = resolvedSource;
      let exists: boolean | undefined;
      let size: number | undefined;

      if (Platform.OS !== "web" && scheme === "file" && FileSystemCompat.getInfoAsync) {
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
        } else if (Platform.OS !== "web" && scheme === "file" && exists === true) {
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
      }
    };

    void inspect();
    return () => {
      cancelled = true;
    };
  }, [recordViewerBreadcrumb, resolvedSource, sessionId, source]);

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
    });
    recordViewerBreadcrumb("web_iframe_render", {
      uri: iframeSrc,
      uriKind: getUriScheme(iframeSrc),
      sourceKind: resolvedSource.sourceKind,
      previewPath: resolvedSource.renderer,
    });
  }, [
    asset,
    isReadyToRender,
    loadAttempt,
    recordViewerBreadcrumb,
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
      return <EmptyState title="Document not found" subtitle="Missing document asset." />;
    }

    if (
      resolvedSource.kind !== "resolved-embedded"
    ) {
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
      return <EmptyState title="Document not found" subtitle="Missing document asset." />;
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
                title={asset.title || "PDF"}
                src={webEmbeddedUri || undefined}
                onLoad={() => {
                  console.info("[pdf-viewer] web_iframe_load", {
                    sessionId,
                    documentType: asset.documentType,
                    originModule: asset.originModule,
                    uri: webEmbeddedUri || asset.uri,
                  });
                  markReady();
                }}
                onError={() => {
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
        ) : (
          NativePdfWebView ? (
            <NativePdfWebView
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
                const message = String(event?.nativeEvent?.description || "Native PDF viewer failed to load.").trim();
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
              onHttpError={(event: { nativeEvent?: { statusCode?: number; description?: string } }) => {
                const statusCode = Number(event?.nativeEvent?.statusCode);
                const description = String(event?.nativeEvent?.description || "").trim();
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
          )
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
            { height: headerHeight, paddingTop: Platform.OS === "web" ? 0 : insets.top },
          ]}
        >
            <Pressable onPress={onBack} style={styles.iconButton} accessibilityLabel="Back">
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
                <Ionicons name="ellipsis-horizontal" size={18} color={VIEWER_TEXT} />
              </Pressable>
              {menuOpen && asset ? (
                <View style={styles.menu}>
                  <MenuAction icon="share-outline" label="Share" onPress={() => void onShare()} />
                  <MenuAction icon="download-outline" label="Download" onPress={() => void onDownload()} />
                  <MenuAction icon="open-outline" label="Open externally" onPress={() => void onOpenExternal()} />
                  <MenuAction icon="print-outline" label="Print" onPress={() => void onPrint()} />
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
              showChrome ? styles.pageIndicatorVisible : styles.pageIndicatorHidden,
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

function MenuAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.menuAction}>
      <Ionicons name={icon} size={18} color={VIEWER_TEXT} />
      <Text style={styles.menuActionText}>{label}</Text>
    </Pressable>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return <CenteredPanel title={title} subtitle={subtitle} />;
}

function CenteredPanel({
  title,
  subtitle,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
}: {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 28,
        backgroundColor: VIEWER_BG,
      }}
    >
      <Text style={{ color: VIEWER_TEXT, fontSize: 22, fontWeight: "800", textAlign: "center" }}>
        {title}
      </Text>
      <Text
        style={{
          color: VIEWER_SUBTLE,
          fontSize: 14,
          textAlign: "center",
          marginTop: 10,
          maxWidth: 420,
          lineHeight: 20,
        }}
      >
        {subtitle}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={{
            marginTop: 18,
            height: 42,
            paddingHorizontal: 16,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.12)",
            borderWidth: 1,
            borderColor: VIEWER_BORDER,
          }}
        >
          <Text style={{ color: VIEWER_TEXT, fontWeight: "800" }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
      {secondaryLabel && onSecondaryAction ? (
        <Pressable
          onPress={onSecondaryAction}
          style={{
            marginTop: 10,
            height: 42,
            paddingHorizontal: 16,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.06)",
            borderWidth: 1,
            borderColor: VIEWER_BORDER,
          }}
        >
          <Text style={{ color: VIEWER_TEXT, fontWeight: "800" }}>{secondaryLabel}</Text>
        </Pressable>
      ) : null}
      {Platform.OS === "web" ? (
        <Text style={{ color: VIEWER_DIM, fontSize: 12, marginTop: 14 }}>
          Web preview uses in-app iframe rendering.
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: VIEWER_BG,
  },
  screenRoot: {
    flex: 1,
    backgroundColor: VIEWER_BG,
    overflow: "hidden",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: VIEWER_BORDER,
    backgroundColor: VIEWER_HEADER_BG,
    zIndex: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 8,
  },
  headerTitle: {
    color: VIEWER_TEXT,
    fontSize: 16,
    fontWeight: "700",
  },
  menuAnchor: {
    position: "relative",
  },
  menu: {
    position: "absolute",
    top: 40,
    right: 0,
    width: 220,
    borderRadius: 16,
    paddingVertical: 6,
    backgroundColor: "rgba(22,22,22,0.98)",
    borderWidth: 1,
    borderColor: VIEWER_BORDER,
    zIndex: 20,
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  menuAction: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  menuActionText: {
    color: VIEWER_TEXT,
    fontSize: 15,
    fontWeight: "600",
  },
  chromeVisible: {
    opacity: 1,
  },
  chromeHidden: {
    opacity: 0,
  },
  documentStage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: VIEWER_BG,
    overflow: "hidden",
  },
  viewerBody: {
    flex: 1,
    backgroundColor: VIEWER_BG,
    overflow: "hidden",
  },
  webFrameWrap: {
    flex: 1,
    width: "100%",
    alignSelf: "center",
    backgroundColor: VIEWER_BG,
  },
  nativeWebView: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: VIEWER_BG,
  },
  loadingState: {
    flex: 1,
    backgroundColor: VIEWER_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    backgroundColor: "rgba(17,17,17,0.16)",
  },
  loadingText: {
    color: VIEWER_TEXT,
    marginTop: 12,
    fontWeight: "700",
  },
  pageIndicatorWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 18,
    alignItems: "center",
  },
  pageIndicatorVisible: {
    opacity: 1,
  },
  pageIndicatorHidden: {
    opacity: 0.18,
  },
  pageIndicator: {
    minWidth: 54,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  pageIndicatorText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
