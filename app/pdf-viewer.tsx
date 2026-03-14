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
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
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

type ViewerState = "init" | "loading" | "ready" | "error" | "empty";
const FileSystemCompat = FileSystemModule as any;

const FALLBACK_ROUTE = "/";
const VIEWER_BG = "#111111";
const VIEWER_HEADER_BG = "rgba(17,17,17,0.94)";
const VIEWER_BORDER = "rgba(255,255,255,0.08)";
const VIEWER_TEXT = "#F8FAFC";
const VIEWER_SUBTLE = "rgba(255,255,255,0.72)";
const VIEWER_DIM = "rgba(255,255,255,0.52)";
const WEB_PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const WEB_PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

type PageTelemetry = {
  current: number;
  total: number;
};

function resolveViewerState(session: DocumentSession | null, asset: DocumentAsset | null): ViewerState {
  if (!session) return "empty";
  if (session.status === "error") return "error";
  if (session.status === "preparing") return "loading";
  if (!asset) return "error";
  return "loading";
}

function getUriScheme(uri?: string | null) {
  const value = String(uri || "").trim();
  const match = value.match(/^([a-z0-9+.-]+):/i);
  return match?.[1]?.toLowerCase() || "";
}

function getReadAccessParentUri(uri?: string | null) {
  const value = String(uri || "").trim();
  if (!value.startsWith("file://")) return undefined;
  const slashIndex = value.lastIndexOf("/");
  if (slashIndex <= "file://".length) return undefined;
  return value.slice(0, slashIndex);
}

function buildWebPdfTelemetryHtml(pdfUrl: string) {
  const urlLiteral = JSON.stringify(pdfUrl);
  const pdfJsLiteral = JSON.stringify(WEB_PDFJS_URL);
  const workerLiteral = JSON.stringify(WEB_PDFJS_WORKER_URL);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes"
    />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: #111111;
        height: 100%;
        overflow: hidden;
      }
      #app {
        height: 100%;
        overflow: auto;
        -webkit-overflow-scrolling: touch;
        padding: 20px 0 48px;
        box-sizing: border-box;
      }
      .page-wrap {
        width: min(100%, 980px);
        margin: 0 auto 14px;
        display: flex;
        justify-content: center;
      }
      canvas {
        display: block;
        background: white;
        box-shadow: 0 18px 36px rgba(0, 0, 0, 0.24);
      }
      #status {
        color: rgba(255,255,255,0.72);
        font: 14px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    </style>
  </head>
  <body>
    <div id="app"><div id="status">Preparing document...</div></div>
    <script src=${pdfJsLiteral}></script>
    <script>
      (function () {
        const pdfUrl = ${urlLiteral};
        const app = document.getElementById('app');
        const statusNode = document.getElementById('status');
        const pageNodes = [];
        let totalPages = 0;
        let lastCurrent = 1;

        function emit(payload) {
          const message = { __pdfTelemetry: true, ...payload };
          try { window.parent.postMessage(message, '*'); } catch {}
          try {
            if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
              window.ReactNativeWebView.postMessage(JSON.stringify(message));
            }
          } catch {}
        }

        function reportCurrentPage() {
          if (!pageNodes.length) return;
          const viewportH = window.innerHeight || document.documentElement.clientHeight || 0;
          let bestPage = 1;
          let bestVisible = -1;
          for (const entry of pageNodes) {
            const rect = entry.node.getBoundingClientRect();
            const top = Math.max(rect.top, 0);
            const bottom = Math.min(rect.bottom, viewportH);
            const visible = Math.max(0, bottom - top);
            if (visible > bestVisible) {
              bestVisible = visible;
              bestPage = entry.page;
            }
          }
          if (bestPage !== lastCurrent) {
            lastCurrent = bestPage;
            emit({ type: 'page', current: bestPage, total: totalPages });
          }
        }

        async function render() {
          try {
            pdfjsLib.GlobalWorkerOptions.workerSrc = ${workerLiteral};
            const loadingTask = pdfjsLib.getDocument(pdfUrl);
            const pdf = await loadingTask.promise;
            totalPages = Number(pdf.numPages || 0);
            lastCurrent = totalPages > 0 ? 1 : 0;
            app.innerHTML = '';
            emit({ type: 'ready', current: lastCurrent, total: totalPages });

            for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
              const page = await pdf.getPage(pageNumber);
              const initialViewport = page.getViewport({ scale: 1 });
              const containerWidth = Math.min(app.clientWidth || window.innerWidth || initialViewport.width, 980);
              const scale = containerWidth / initialViewport.width;
              const viewport = page.getViewport({ scale });
              const wrap = document.createElement('div');
              wrap.className = 'page-wrap';
              const canvas = document.createElement('canvas');
              canvas.width = Math.floor(viewport.width);
              canvas.height = Math.floor(viewport.height);
              wrap.appendChild(canvas);
              app.appendChild(wrap);
              pageNodes.push({ page: pageNumber, node: wrap });
              await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            }

            reportCurrentPage();
            app.addEventListener('scroll', reportCurrentPage, { passive: true });
            window.addEventListener('resize', reportCurrentPage);
          } catch (error) {
            const message = error && error.message ? error.message : String(error || 'Failed to render PDF');
            if (statusNode) statusNode.textContent = message;
            emit({ type: 'error', message });
          }
        }

        render();
      })();
    </script>
  </body>
</html>`;
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
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const { width } = useWindowDimensions();
  const sessionId = React.useMemo(() => String(params.sessionId || "").trim(), [params.sessionId]);
  const snapshot = React.useMemo(() => getDocumentSessionSnapshot(sessionId), [sessionId]);
  const [session, setSession] = React.useState<DocumentSession | null>(snapshot.session);
  const [asset, setAsset] = React.useState<DocumentAsset | null>(snapshot.asset);
  const [state, setState] = React.useState<ViewerState>(resolveViewerState(snapshot.session, snapshot.asset));
  const [errorText, setErrorText] = React.useState(snapshot.session?.errorMessage || "");
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [isReadyToRender, setIsReadyToRender] = React.useState(false);
  const [chromeVisible, setChromeVisible] = React.useState(true);
  const [pageTelemetry, setPageTelemetry] = React.useState<PageTelemetry>({ current: 1, total: 1 });
  const openedAtRef = React.useRef<number>(Date.now());
  const loadingTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const renderDelayRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialAssetUriRef = React.useRef("");

  React.useEffect(() => {
    console.info("[pdf-viewer] viewer_route_mounted", {
      platform: Platform.OS,
      sessionId,
      receivedSessionId: params.sessionId ?? null,
      initialUri: snapshot.asset?.uri ?? null,
      initialScheme: getUriScheme(snapshot.asset?.uri),
    });
  }, [params.sessionId, sessionId, snapshot.asset?.uri]);

  const syncSnapshot = React.useCallback(() => {
    const next = getDocumentSessionSnapshot(sessionId);
    setSession(next.session);
    setAsset(next.asset);
    setErrorText(next.session?.errorMessage || "");
    setState(resolveViewerState(next.session, next.asset));
    return next;
  }, [sessionId]);

  const clearLoadingTimeout = React.useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, []);

  const clearRenderDelay = React.useCallback(() => {
    if (renderDelayRef.current) {
      clearTimeout(renderDelayRef.current);
      renderDelayRef.current = null;
    }
  }, []);

  const markError = React.useCallback(
    (message: string) => {
      clearLoadingTimeout();
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
          error: message,
        });
      }
    },
    [clearLoadingTimeout, sessionId, syncSnapshot],
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
      markError("Document loading timed out.");
    }, 15000);
  }, [clearLoadingTimeout, markError, syncSnapshot]);

  const markReady = React.useCallback(() => {
    clearLoadingTimeout();
    const next = syncSnapshot();
    setErrorText("");
    setState("ready");
    if (next.session) touchDocumentSession(next.session.sessionId);
    if (next.asset) {
      console.info("[pdf-viewer] ready", {
        documentType: next.asset.documentType,
        originModule: next.asset.originModule,
        ms: Date.now() - openedAtRef.current,
      });
    }
  }, [clearLoadingTimeout, syncSnapshot]);

  React.useEffect(() => {
    openedAtRef.current = Date.now();
    clearLoadingTimeout();
    clearRenderDelay();
    setIsReadyToRender(false);
    setChromeVisible(true);
    setMenuOpen(false);
    setPageTelemetry({ current: 1, total: 1 });
    const next = syncSnapshot();

    if (!next.session) {
      setState("empty");
      return;
    }

    touchDocumentSession(next.session.sessionId);
    setErrorText(next.session.errorMessage || "");
    setState(resolveViewerState(next.session, next.asset));
    if (next.asset) {
      const scheme = getUriScheme(next.asset.uri);
      initialAssetUriRef.current = String(next.asset.uri || "");
      console.info("[pdf-viewer] open", {
        sessionId: next.session.sessionId,
        documentType: next.asset.documentType,
        originModule: next.asset.originModule,
        uri: next.asset.uri,
        scheme,
        fileName: next.asset.fileName,
        exists: typeof next.asset.sizeBytes === "number" ? true : undefined,
        sizeBytes: next.asset.sizeBytes,
        renderer: Platform.OS === "web" ? "web" : "mobile",
        openTime: new Date().toISOString(),
      });
      if (
        Platform.OS !== "web" &&
        (scheme !== "file" || !String(next.asset.uri || "").toLowerCase().endsWith(".pdf"))
      ) {
        markError("Mobile preview requires a local file:// PDF asset.");
        return;
      }
      enterLoading();
      renderDelayRef.current = setTimeout(() => {
        setIsReadyToRender(true);
        renderDelayRef.current = null;
      }, Platform.OS === "ios" ? 150 : 50);
    }

    return () => {
      console.info("[pdf-viewer] unmount", {
        sessionId,
        documentType: next.asset?.documentType ?? null,
        originModule: next.asset?.originModule ?? null,
        scheme: getUriScheme(next.asset?.uri),
      });
      clearLoadingTimeout();
      clearRenderDelay();
    };
  }, [clearLoadingTimeout, clearRenderDelay, enterLoading, markError, sessionId, syncSnapshot]);

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
    setErrorText("");
    enterLoading();
  }, [enterLoading, syncSnapshot]);

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
    if (!asset?.uri) return undefined;
    return { uri: asset.uri };
  }, [asset]);

  const webPdfHtml = React.useMemo(() => {
    if (Platform.OS !== "web") return "";
    if (!asset?.uri) return "";
    return buildWebPdfTelemetryHtml(asset.uri);
  }, [asset?.uri]);

  const showChrome = Platform.OS === "web" ? true : chromeVisible;
  const headerHeight = Platform.OS === "web" || width >= 768 ? 56 : 50;
  const pageIndicatorText =
    state === "ready"
      ? `${Math.max(1, pageTelemetry.current)} / ${Math.max(1, pageTelemetry.total)}`
      : "…";

  const toggleChrome = React.useCallback(() => {
    if (Platform.OS === "web") return;
    setMenuOpen(false);
    setChromeVisible((value) => !value);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    const inspect = async () => {
      if (!asset?.uri) return;
      const scheme = getUriScheme(asset.uri);
      let exists: boolean | undefined;
      let size: number | undefined;

      if (Platform.OS !== "web" && scheme === "file" && FileSystemCompat?.getInfoAsync) {
        try {
          const info = await FileSystemCompat.getInfoAsync(asset.uri);
          exists = Boolean(info?.exists);
          size = Number.isFinite(Number(info?.size)) ? Number(info.size) : undefined;
        } catch (error) {
          console.error("[pdf-viewer] viewer_file_inspect_failed", {
            sessionId,
            uri: asset.uri,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (!cancelled) {
        if (Platform.OS !== "web" && scheme === "file" && exists === false) {
          console.info("[pdf-viewer] viewer_local_file_exists_no", {
            sessionId,
            uri: asset.uri,
            exists: false,
            sizeBytes: size ?? asset.sizeBytes,
            sourceKind: "local",
            documentType: asset.documentType,
            originModule: asset.originModule,
          });
          console.error("[pdf-viewer] viewer_file_not_found", {
            sessionId,
            uri: asset.uri,
            fileName: asset.fileName,
          });
        } else if (Platform.OS !== "web" && scheme === "file" && exists === true) {
          console.info("[pdf-viewer] viewer_local_file_exists_yes", {
            sessionId,
            uri: asset.uri,
            exists: true,
            sizeBytes: size ?? asset.sizeBytes,
            sourceKind: "local",
            documentType: asset.documentType,
            originModule: asset.originModule,
          });
        }
        console.info("[pdf-viewer] viewer_before_render", {
          platform: Platform.OS,
          sessionId,
          documentType: asset.documentType,
          originModule: asset.originModule,
          uri: asset.uri,
          scheme,
          fileName: asset.fileName,
          mimeType: asset.mimeType,
          exists,
          sizeBytes: size ?? asset.sizeBytes,
          source,
        });
      }
    };

    void inspect();
    return () => {
      cancelled = true;
    };
  }, [asset, sessionId, source]);

  React.useEffect(() => {
    if (Platform.OS !== "web") return;

    const onMessage = (event: MessageEvent) => {
      const payload = event.data;
      if (!payload || typeof payload !== "object" || payload.__pdfTelemetry !== true) return;

      if (payload.type === "ready") {
        const current = Number(payload.current || 1);
        const total = Number(payload.total || 1);
        setPageTelemetry({
          current: Number.isFinite(current) && current > 0 ? current : 1,
          total: Number.isFinite(total) && total > 0 ? total : 1,
        });
        markReady();
        return;
      }

      if (payload.type === "page") {
        const current = Number(payload.current || 1);
        const total = Number(payload.total || pageTelemetry.total || 1);
        setPageTelemetry({
          current: Number.isFinite(current) && current > 0 ? current : 1,
          total: Number.isFinite(total) && total > 0 ? total : 1,
        });
        return;
      }

      if (payload.type === "error") {
        markError(String(payload.message || "Web PDF renderer failed."));
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [markError, markReady, pageTelemetry.total]);

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

    if (!asset?.uri || !source) {
      console.error("[pdf-viewer] viewer_invalid_asset", {
        platform: Platform.OS,
        sessionId,
        hasAsset: Boolean(asset),
        uri: asset?.uri ?? null,
      });
      return <EmptyState title="Document not found" subtitle="Missing document asset." />;
    }

    if (!isReadyToRender) {
      return (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Preparing viewer...</Text>
        </View>
      );
    }

    return (
      <Pressable style={styles.viewerBody} onPress={toggleChrome}>
        {state === "loading" ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Preparing document...</Text>
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
                srcDoc={webPdfHtml}
                onError={() => markError("Web PDF frame failed to load.")}
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
          <WebView
            source={source}
            originWhitelist={["*"]}
            allowFileAccess
            allowFileAccessFromFileURLs
            allowUniversalAccessFromFileURLs
            allowingReadAccessToURL={
              Platform.OS === "ios" ? getReadAccessParentUri(asset.uri) : undefined
            }
            setSupportMultipleWindows={false}
            onLoadStart={() => enterLoading()}
            onLoadEnd={() => markReady()}
            onLoad={() => {
              console.info("[pdf-viewer] viewer_native_loaded", {
                sessionId,
                uri: asset.uri,
                scheme: getUriScheme(asset.uri),
              });
            }}
            onShouldStartLoadWithRequest={(request) => {
              const requestUrl = String(request.url || "");
              const requestScheme = getUriScheme(requestUrl);
              const initialUrl = initialAssetUriRef.current;
              const isInitial = requestUrl === initialUrl;
              const isSameDocument = !!initialUrl && requestUrl.startsWith(initialUrl);
              const allow =
                isInitial ||
                isSameDocument ||
                requestUrl === "about:blank" ||
                requestScheme === "file" ||
                requestScheme === "http" ||
                requestScheme === "https";

              if (!allow) {
                console.error("[pdf-viewer] blocked_mobile_navigation", {
                  requestUrl,
                  requestScheme,
                  initialUrl,
                  documentType: asset?.documentType ?? null,
                  originModule: asset?.originModule ?? null,
                });
                markError(`Blocked unsupported mobile navigation: ${requestScheme || "unknown"}`);
              }
              return allow;
            }}
            onOpenWindow={(event) => {
              console.error("[pdf-viewer] blocked_mobile_window_open", {
                targetUrl: event.nativeEvent.targetUrl,
                documentType: asset?.documentType ?? null,
                originModule: asset?.originModule ?? null,
              });
              markError("Blocked external handoff during mobile preview.");
            }}
            onHttpError={(event) => {
              console.error("[pdf-viewer] viewer_http_error", {
                sessionId,
                statusCode: event.nativeEvent.statusCode,
                description: event.nativeEvent.description,
                url: event.nativeEvent.url,
              });
              markError(event.nativeEvent.description || `HTTP ${event.nativeEvent.statusCode}`);
            }}
            onError={(event) => {
              const message = event.nativeEvent.description || "WebView failed";
              console.error("[pdf-viewer] viewer_native_error", {
                sessionId,
                message,
                url: event.nativeEvent.url,
                code: event.nativeEvent.code,
              });
              markError(message);
            }}
            style={styles.nativeWebView}
          />
        )}
      </Pressable>
    );
  })();

  return (
    <SafeAreaView style={styles.screen} edges={showChrome ? undefined : ["left", "right"]}>
      <View style={styles.screen}>
        {showChrome ? (
          <View style={[styles.header, { height: headerHeight }]}>
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
        ) : null}

        <View style={styles.documentStage}>{body}</View>

        {asset ? (
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
  header: {
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
  documentStage: {
    flex: 1,
    backgroundColor: VIEWER_BG,
  },
  viewerBody: {
    flex: 1,
    backgroundColor: VIEWER_BG,
  },
  webFrameWrap: {
    flex: 1,
    width: "100%",
    alignSelf: "center",
    backgroundColor: VIEWER_BG,
  },
  nativeWebView: {
    flex: 1,
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
