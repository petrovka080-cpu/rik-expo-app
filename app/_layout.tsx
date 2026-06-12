// app/_layout.tsx  (PROD — Stack root for native iOS navigation support)
// AUTH-LIFECYCLE: Thin shell. Auth bootstrap + guard logic extracted to hooks.

import "../src/lib/runtime/installWeakRefPolyfill";
import React, { useEffect, useState } from "react";
import { InteractionManager, Linking, Platform, LogBox } from "react-native";
import { Stack, router, usePathname, useSegments, type Href } from "expo-router";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Host } from "react-native-portalize";

import { GlobalBusyProvider } from "../src/ui/GlobalBusy";
import { BuildIdentityMarker } from "../src/components/BuildIdentityMarker";
import { applyRootLayoutWebContainerStyle } from "../src/lib/entry/rootLayoutWebContainer";
import { AppQueryProvider } from "../src/lib/query/queryClient";
import { useAuthLifecycle } from "../src/lib/auth/useAuthLifecycle";
import { useAuthGuard } from "../src/lib/auth/useAuthGuard";
import { resolvePublicRequestDeepLinkTarget } from "../src/lib/navigation/coreRoutes";
import { initializeSentry, wrapRootComponentWithSentry } from "../src/lib/observability/sentry";
import { recordPlatformObservability } from "../src/lib/observability/platformObservability";
import { ROUTE_PROOF_MARKERS, RouteReadyMarker } from "../src/lib/testing/routeReadyMarkers";

initializeSentry();

// --- WEB: тихо глушим шумные предупреждения (только в браузере) ---
if (Platform.OS === "web") {
  LogBox.ignoreLogs([
    "props.pointerEvents is deprecated. Use style.pointerEvents",
    '"shadow*" style props are deprecated. Use "boxShadow".',
  ]);

  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const msg = String(args[0] ?? "");
    if (
      msg.includes("props.pointerEvents is deprecated") ||
      msg.includes('"shadow*" style props are deprecated')
    ) {
      return;
    }
    originalWarn(...args);
  };
}

type PdfViewerWarmupAuthStatus = "unknown" | "authenticated" | "unauthenticated";
type PlatformOfflineStatusHostComponent = React.ComponentType;

function normalizeWarmupPathname(pathname: string | null | undefined) {
  return String(pathname ?? "").split("?")[0] || "/";
}

function shouldWarmPdfViewerAfterStartup(input: {
  platformOs: string;
  pathname: string | null | undefined;
  sessionLoaded: boolean;
  authSessionStatus: PdfViewerWarmupAuthStatus;
}) {
  if (input.platformOs === "web") return false;
  if (!input.sessionLoaded) return false;
  if (input.authSessionStatus !== "authenticated") return false;

  const pathname = normalizeWarmupPathname(input.pathname);
  if (pathname === "/" || pathname === "/index") return false;
  if (pathname === "/pdf-viewer") return false;
  if (pathname === "/auth" || pathname.startsWith("/auth/")) return false;

  return true;
}

function DeferredPlatformOfflineStatusHost({ enabled }: { enabled: boolean }) {
  const [HostComponent, setHostComponent] =
    useState<PlatformOfflineStatusHostComponent | null>(null);

  useEffect(() => {
    if (!enabled || Platform.OS === "web") return undefined;

    let active = true;
    let loadTimeout: ReturnType<typeof setTimeout> | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      loadTimeout = setTimeout(() => {
        void import("../src/components/PlatformOfflineStatusHost")
          .then((module) => {
            if (active) setHostComponent(() => module.default);
          })
          .catch((error: unknown) => {
            recordPlatformObservability({
              screen: "request",
              surface: "startup_bootstrap",
              category: "ui",
              event: "offline_status_host_deferred_load_failed",
              result: "error",
              errorStage: "deferred_import",
              errorClass: error instanceof Error ? error.name : "Unknown",
              errorMessage: error instanceof Error ? error.message : String(error),
              fallbackUsed: true,
              extra: {
                owner: "root_layout",
              },
            });
          });
      }, 2_000);
    });

    return () => {
      active = false;
      task.cancel?.();
      if (loadTimeout) clearTimeout(loadTimeout);
    };
  }, [enabled]);

  if (!enabled || !HostComponent) return null;
  return <HostComponent />;
}

function RootLayout() {
  const segments = useSegments();
  const pathname = usePathname();
  const isPdfViewerRoute = pathname === "/pdf-viewer";

  // AUTH-LIFECYCLE: Auth bootstrap + listener (stable, route-independent)
  const authState = useAuthLifecycle({
    pathname,
    isPdfViewerRoute,
    segments,
  });

  // AUTH-LIFECYCLE: Route-coupled auth guard / redirect decisions
  useAuthGuard({
    ...authState,
    segments,
    pathname,
  });

  // --- Native: public request deep links must not be trapped on auth screens ---
  // --- WEB: нормальный контейнер/скролл ---
  useEffect(() => {
    if (Platform.OS === "web") return undefined;
    let active = true;

    const openPublicRequestDeepLink = (
      url: string | null | undefined,
      source: "initial_url" | "url_event",
    ) => {
      const target = resolvePublicRequestDeepLinkTarget(url);
      if (!target || !active) return;
      recordPlatformObservability({
        screen: "request",
        surface: "startup_bootstrap",
        category: "ui",
        event: "public_request_deep_link_resolved",
        result: "success",
        extra: {
          owner: "root_layout",
          source,
          target: target.pathname,
          normalizedPath: target.normalizedPath,
          queryParamNames: Object.keys(target.params).sort(),
        },
      });
      router.replace(target.href as Href);
    };

    const subscription = Linking.addEventListener("url", ({ url }) => {
      openPublicRequestDeepLink(url, "url_event");
    });

    void Linking.getInitialURL()
      .then((url) => openPublicRequestDeepLink(url, "initial_url"))
      .catch((error: unknown) => {
        recordPlatformObservability({
          screen: "request",
          surface: "startup_bootstrap",
          category: "ui",
          event: "public_request_deep_link_read_failed",
          result: "error",
          errorStage: "linking_get_initial_url",
          errorClass: error instanceof Error ? error.name : undefined,
          errorMessage:
            error instanceof Error
              ? error.message
              : String(error ?? "linking_get_initial_url_failed"),
          fallbackUsed: true,
          extra: {
            owner: "root_layout",
          },
        });
      });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const result = applyRootLayoutWebContainerStyle(document);
    if (result.ok === false) {
      recordPlatformObservability({
        screen: "request",
        surface: "auth_session_gate",
        category: "ui",
        event: "web_root_container_style_failed",
        result: "error",
        extra: {
          caller: "root_layout",
          errorStage: "web_root_container_setup",
          errorClass: result.errorClass,
          errorMessage: result.errorMessage,
          fallbackUsed: true,
        },
      });
    }
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "test" || Platform.OS === "web") return undefined;

    let cleanupTimeout: ReturnType<typeof setTimeout> | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      cleanupTimeout = setTimeout(() => {
        void import("../src/lib/cache/clearAppCache").then(({ clearAppCache }) =>
          clearAppCache({ owner: "root_layout:deferred_expired_cache" }),
        );
      }, 8_000);
    });

    return () => {
      task.cancel?.();
      if (cleanupTimeout) clearTimeout(cleanupTimeout);
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "test") return undefined;
    if (
      !shouldWarmPdfViewerAfterStartup({
        platformOs: Platform.OS,
        pathname,
        sessionLoaded: authState.sessionLoaded,
        authSessionStatus: authState.authSessionState.status,
      })
    ) {
      return undefined;
    }

    let warmupTimeout: ReturnType<typeof setTimeout> | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      warmupTimeout = setTimeout(() => {
        void import("./pdf-viewer");
      }, 4_000);
    });

    return () => {
      task.cancel?.();
      if (warmupTimeout) clearTimeout(warmupTimeout);
    };
  }, [authState.authSessionState.status, authState.sessionLoaded, pathname]);

  const APP_BG = "#0B0F14";
  const UI = {
    text: "#F8FAFC",
    cardBg: "#101826",
    border: "#1F2A37",
  };

  return (
    <AppQueryProvider>
      <SafeAreaProvider>
        <Host>
          <GlobalBusyProvider theme={UI} suppressOverlay={isPdfViewerRoute}>
            <SafeAreaView
              style={{ flex: 1, backgroundColor: APP_BG, paddingTop: 0 }}
              edges={Platform.OS === "web" ? [] : ["top"]}
            >
              <RouteReadyMarker marker={ROUTE_PROOF_MARKERS.appRoot} />
              <BuildIdentityMarker />
              <DeferredPlatformOfflineStatusHost
                enabled={
                  authState.sessionLoaded &&
                  authState.authSessionState.status === "authenticated"
                }
              />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen
                  name="pdf-viewer"
                  options={{
                    headerShown: false,
                    presentation: "fullScreenModal",
                    animation: "fade",
                    gestureEnabled: false,
                  }}
                />
              </Stack>
            </SafeAreaView>
          </GlobalBusyProvider>
        </Host>
      </SafeAreaProvider>
    </AppQueryProvider>
  );
}

export default wrapRootComponentWithSentry(RootLayout);
