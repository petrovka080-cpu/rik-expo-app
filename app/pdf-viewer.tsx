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

function appendPdfViewerHash(uri: string) {
  const value = String(uri || "").trim();
  if (!value) return "";
  const hashJoiner = value.includes("#") ? "&" : "#";
  return `${value}${hashJoiner}page=1&view=FitH&toolbar=0&navpanes=0&scrollbar=0`;
}

function escapeHtmlAttr(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function buildMobilePdfShell(uri: string) {
  const viewerUri = escapeHtmlAttr(appendPdfViewerHash(uri));
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta
    name="viewport"
    content="width=device-width,height=device-height,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"
  />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: ${VIEWER_BG};
    }
    body {
      position: fixed;
      inset: 0;
    }
    #viewport {
      position: fixed;
      inset: 0;
      overflow: hidden;
      background: ${VIEWER_BG};
    }
    #frame, #embed {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      border: 0;
      background: ${VIEWER_BG};
      display: block;
    }
  </style>
</head>
<body>
  <div id="viewport">
    <iframe id="frame" src="${viewerUri}" title="PDF" allowfullscreen></iframe>
    <embed id="embed" src="${viewerUri}" type="application/pdf" />
  </div>
  <script>
    (function () {
      var root = document.documentElement;
      var body = document.body;
      var viewport = document.getElementById("viewport");
      function sync() {
        if (!root || !body || !viewport) return;
        var h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight || 0;
        root.style.height = h + "px";
        body.style.height = h + "px";
        viewport.style.height = h + "px";
        window.scrollTo(0, 0);
      }
      window.addEventListener("load", sync, { passive: true });
      window.addEventListener("resize", sync, { passive: true });
      sync();
      requestAnimationFrame(sync);
      setTimeout(sync, 30);
      setTimeout(sync, 150);
    })();
  </script>
</body>
</html>`;
}

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
  const insets = useSafeAreaInsets();
  const sessionId = React.useMemo(() => String(params.sessionId || "").trim(), [params.sessionId]);
  const snapshot = React.useMemo(() => getDocumentSessionSnapshot(sessionId), [sessionId]);
  const [session, setSession] = React.useState<DocumentSession | null>(snapshot.session);
  const [asset, setAsset] = React.useState<DocumentAsset | null>(snapshot.asset);
  const [state, setState] = React.useState<ViewerState>(resolveViewerState(snapshot.session, snapshot.asset));
  const [errorText, setErrorText] = React.useState(snapshot.session?.errorMessage || "");
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [isReadyToRender, setIsReadyToRender] = React.useState(false);
  const [chromeVisible, setChromeVisible] = React.useState(true);
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
    if (Platform.OS !== "web") {
      return {
        html: buildMobilePdfShell(asset.uri),
        baseUrl: getReadAccessParentUri(asset.uri) ?? asset.uri,
      };
    }
    return { uri: asset.uri };
  }, [asset]);

  const showChrome = Platform.OS === "web" ? true : chromeVisible;
  const headerBarHeight = Platform.OS === "web" || width >= 768 ? 56 : 50;
  const headerHeight = showChrome ? headerBarHeight + (Platform.OS === "web" ? 0 : insets.top) : 0;
  const pageIndicatorText = state === "ready" ? "1 / 1" : "…";

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
                src={asset.uri}
                onLoad={() => markReady()}
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
            bounces={false}
            contentInsetAdjustmentBehavior="never"
            automaticallyAdjustContentInsets={false}
            nestedScrollEnabled={false}
            overScrollMode="never"
            scalesPageToFit
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
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <View style={styles.screenRoot}>
        {showChrome ? (
          <View style={[styles.header, { height: headerHeight, paddingTop: Platform.OS === "web" ? 0 : insets.top }]}>
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

        <View style={[styles.documentStage, { top: headerHeight }]}>{body}</View>

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
  documentStage: {
    position: "absolute",
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
