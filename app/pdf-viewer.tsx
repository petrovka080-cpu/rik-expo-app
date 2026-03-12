import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import * as FileSystem from "expo-file-system";

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
const FileSystemCompat = FileSystem as any;

const FALLBACK_ROUTE = "/";

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

export default function PdfViewerScreen() {
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const sessionId = React.useMemo(() => String(params.sessionId || "").trim(), [params.sessionId]);
  const snapshot = React.useMemo(() => getDocumentSessionSnapshot(sessionId), [sessionId]);
  const [session, setSession] = React.useState<DocumentSession | null>(snapshot.session);
  const [asset, setAsset] = React.useState<DocumentAsset | null>(snapshot.asset);
  const [state, setState] = React.useState<ViewerState>(resolveViewerState(snapshot.session, snapshot.asset));
  const [errorText, setErrorText] = React.useState(snapshot.session?.errorMessage || "");
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [isReadyToRender, setIsReadyToRender] = React.useState(false);
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
      // Add a small delay to ensure navigation transition is finished before WebView starts
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
        <View style={{ flex: 1, backgroundColor: "#0A0F18", alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#38BDF8" />
          <Text style={{ color: "#E2E8F0", marginTop: 12, fontWeight: "700" }}>
            Preparing viewer...
          </Text>
        </View>
      );
    }

    return (
      <View style={{ flex: 1, backgroundColor: "#0A0F18" }}>
        {state === "loading" ? (
          <View
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2,
              backgroundColor: "rgba(10,15,24,0.18)",
            }}
          >
            <ActivityIndicator size="large" color="#38BDF8" />
            <Text style={{ color: "#E2E8F0", marginTop: 12, fontWeight: "700" }}>
              Preparing document...
            </Text>
          </View>
        ) : null}

        {Platform.OS === "web" ? (
          <View style={{ flex: 1, backgroundColor: "#0A0F18" }}>
            <iframe
              title={asset.title || "PDF"}
              src={asset.uri}
              onLoad={() => markReady()}
              onError={() => markError("Web PDF frame failed to load.")}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                background: "#0A0F18",
              }}
            />
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
            style={{ flex: 1, backgroundColor: "#0A0F18" }}
          />
        )}
      </View>
    );
  })();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#08111C" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255,255,255,0.08)",
          backgroundColor: "#08111C",
          gap: 10,
        }}
      >
        <Pressable onPress={onBack} style={headerButtonStyle}>
          <Text style={headerButtonText}>Back</Text>
        </Pressable>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: "#F8FAFC", fontSize: 16, fontWeight: "800" }}>
            {asset?.title || "PDF"}
          </Text>
          <Text numberOfLines={1} style={{ color: "#94A3B8", fontSize: 12 }}>
            {asset ? `${asset.documentType} · ${asset.originModule}` : "document"}
          </Text>
        </View>

        <Pressable onPress={() => void onShare()} style={headerButtonStyle} disabled={!asset}>
          <Text style={headerButtonText}>Share</Text>
        </Pressable>

        <View>
          <Pressable onPress={() => setMenuOpen((v) => !v)} style={headerButtonStyle} disabled={!asset}>
            <Text style={headerButtonText}>...</Text>
          </Pressable>
          {menuOpen && asset ? (
            <View
              style={{
                position: "absolute",
                top: 44,
                right: 0,
                width: 180,
                borderRadius: 14,
                padding: 8,
                backgroundColor: "#0F172A",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
                zIndex: 5,
              }}
            >
              <MenuAction label="Share" onPress={() => void onShare()} />
              <MenuAction label="Open in other app" onPress={() => void onOpenExternal()} />
            </View>
          ) : null}
        </View>
      </View>

      <View style={{ flex: 1 }}>{body}</View>

      {asset ? (
        <View
          style={{
            flexDirection: "row",
            gap: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.08)",
            backgroundColor: "#08111C",
          }}
        >
          <ActionButton label="Share" onPress={() => void onShare()} primary />
          <ActionButton label="Open externally" onPress={() => void onOpenExternal()} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function MenuAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 10,
      }}
    >
      <Text style={{ color: "#E2E8F0", fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

function ActionButton({
  label,
  onPress,
  primary = false,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        height: 44,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: primary ? "#38BDF8" : "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: primary ? "#38BDF8" : "rgba(255,255,255,0.12)",
      }}
    >
      <Text style={{ color: primary ? "#06131D" : "#E2E8F0", fontWeight: "800" }}>
        {label}
      </Text>
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
        backgroundColor: "#0A0F18",
      }}
    >
      <Text style={{ color: "#F8FAFC", fontSize: 22, fontWeight: "800", textAlign: "center" }}>
        {title}
      </Text>
      <Text
        style={{
          color: "#94A3B8",
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
            backgroundColor: "#38BDF8",
          }}
        >
          <Text style={{ color: "#06131D", fontWeight: "800" }}>{actionLabel}</Text>
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
            borderColor: "rgba(255,255,255,0.12)",
          }}
        >
          <Text style={{ color: "#E2E8F0", fontWeight: "800" }}>{secondaryLabel}</Text>
        </Pressable>
      ) : null}
      {Platform.OS === "web" ? (
        <Text style={{ color: "#64748B", fontSize: 12, marginTop: 14 }}>
          Web preview uses in-app iframe rendering.
        </Text>
      ) : null}
    </ScrollView>
  );
}

const headerButtonStyle = {
  height: 38,
  paddingHorizontal: 12,
  borderRadius: 12,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(255,255,255,0.06)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.12)",
} as const;

const headerButtonText = {
  color: "#E2E8F0",
  fontWeight: "800",
} as const;
