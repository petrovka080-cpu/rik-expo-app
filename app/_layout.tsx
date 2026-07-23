// app/_layout.tsx  (PROD — Stack root for native iOS navigation support)
// AUTH-LIFECYCLE: Thin shell. Auth bootstrap + guard logic extracted to hooks.

import "../src/lib/runtime/installWeakRefPolyfill";
import "../src/lib/runtime/installExpoVectorIconWebFontFace";
import "../src/lib/runtime/installWebFontTimeoutFallback";
import * as ExpoLinking from "expo-linking";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, InteractionManager, Linking as RNLinking, Platform } from "react-native";
import {
  Stack,
  router,
  usePathname,
  useRootNavigationState,
  useSegments,
  type Href,
} from "expo-router";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Host } from "react-native-portalize";

import { GlobalBusyProvider } from "../src/ui/GlobalBusy";
import { BuildIdentityMarker } from "../src/components/BuildIdentityMarker";
import { applyRootLayoutWebContainerStyle } from "../src/lib/entry/rootLayoutWebContainer";
import { AppQueryProvider } from "../src/lib/query/queryClient";
import { useAuthLifecycle } from "../src/lib/auth/useAuthLifecycle";
import { useAuthGuard } from "../src/lib/auth/useAuthGuard";
import {
  addNativeViewUrlListener,
  clearLatestNativeViewUrl,
  getLatestNativeViewUrl,
} from "../src/lib/navigation/nativeIntentEvents";
import {
  isPublicRequestRoutePathname,
  resolvePublicRequestDeepLinkTarget,
  type PublicRequestDeepLinkTarget,
} from "../src/lib/navigation/coreRoutes";
import {
  hasPublicRequestTabNavigationHandler,
  navigatePublicRequestTab,
} from "../src/lib/navigation/publicRequestTabNavigator";
import { initializeSentry, wrapRootComponentWithSentry } from "../src/lib/observability/sentry";
import { recordPlatformObservability } from "../src/lib/observability/platformObservability";
import { ROUTE_PROOF_MARKERS, RouteReadyMarker } from "../src/lib/testing/routeReadyMarkers";

initializeSentry();

type PdfViewerWarmupAuthStatus = "unknown" | "authenticated" | "unauthenticated";
type PlatformOfflineStatusHostComponent = React.ComponentType;
type PublicRequestDeepLinkSource =
  | "expo_linking_url"
  | "initial_url"
  | "native_view_intent"
  | "url_event";
type PendingPublicRequestDeepLink = {
  key: string;
  source: PublicRequestDeepLinkSource;
  url: string;
  routedSources: PublicRequestDeepLinkSource[];
};

const NATIVE_VIEW_URL_DRAIN_STALE_MS = 2_500;

function logAndroidPublicRequestDeepLink(
  event: string,
  extra: Record<string, unknown>,
) {
  if (Platform.OS !== "android") return;
  console.info(`[RikWarmDeepLink] ${event} ${JSON.stringify(extra)}`);
}

function routePublicRequestDeepLink(
  target: PublicRequestDeepLinkTarget,
):
  | "tab_navigation"
  | "replace_href"
  | "replace_object_fallback"
  | "navigate_href_fallback" {
  const routeTarget = {
    pathname: target.navigationPathname,
    params: target.params,
  } as Href;
  const href = target.href as Href;

  if (navigatePublicRequestTab(target)) {
    logAndroidPublicRequestDeepLink("route", {
      method: "tab_navigation",
      normalizedPath: target.normalizedPath,
    });
    return "tab_navigation";
  }

  try {
    router.replace(href);
    logAndroidPublicRequestDeepLink("route", {
      method: "replace_href",
      normalizedPath: target.normalizedPath,
    });
    return "replace_href";
  } catch {
    try {
      router.replace(routeTarget);
      logAndroidPublicRequestDeepLink("route", {
        method: "replace_object_fallback",
        normalizedPath: target.normalizedPath,
      });
      return "replace_object_fallback";
    } catch {
      router.navigate(href);
      logAndroidPublicRequestDeepLink("route", {
        method: "navigate_href_fallback",
        normalizedPath: target.normalizedPath,
      });
      return "navigate_href_fallback";
    }
  }
}

function normalizeWarmupPathname(pathname: string | null | undefined) {
  return String(pathname ?? "").split("?")[0] || "/";
}

function shouldWarmPdfViewerAfterStartup(input: {
  platformOs: string;
  pathname: string | null | undefined;
  sessionLoaded: boolean;
  authSessionStatus: PdfViewerWarmupAuthStatus;
}) {
  if (input.platformOs !== "ios") return false;
  if (!input.sessionLoaded) return false;
  if (input.authSessionStatus !== "authenticated") return false;

  const pathname = normalizeWarmupPathname(input.pathname);
  if (pathname === "/" || pathname === "/index") return false;
  if (pathname === "/pdf-viewer") return false;
  if (pathname === "/auth" || pathname.startsWith("/auth/")) return false;

  return true;
}

function shouldWarmOfficeRouteAfterStartup(pathname: string | null | undefined) {
  const normalizedPathname = normalizeWarmupPathname(pathname);
  if (normalizedPathname === "/office" || normalizedPathname.startsWith("/office/")) return false;
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
  const rootNavigationState = useRootNavigationState();
  const rootNavigationReady = Boolean(rootNavigationState?.key);
  const pendingPublicRequestDeepLinkRef = useRef<PendingPublicRequestDeepLink | null>(null);
  const isPdfViewerRoute = pathname === "/pdf-viewer";
  const expoLinkingUrl = ExpoLinking.useLinkingURL();

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

  const openPublicRequestDeepLink = useCallback((
    url: string | null | undefined,
    source: PublicRequestDeepLinkSource,
  ) => {
    const target = resolvePublicRequestDeepLinkTarget(url);
    if (!target) return false;
    const resolvedUrl = String(url);
    const pendingKey = target.href;
    logAndroidPublicRequestDeepLink("open_attempt", {
      source,
      rootNavigationReady,
      observedPathname: pathname,
      normalizedPath: target.normalizedPath,
      tabHandlerAvailable: hasPublicRequestTabNavigationHandler(),
    });
    if (!rootNavigationReady) {
      if (pendingPublicRequestDeepLinkRef.current?.key !== pendingKey) {
        pendingPublicRequestDeepLinkRef.current = {
          key: pendingKey,
          source,
          url: resolvedUrl,
          routedSources: [],
        };
        recordPlatformObservability({
          screen: "request",
          surface: "startup_bootstrap",
          category: "ui",
          event: "public_request_deep_link_deferred",
          result: "skipped",
          extra: {
            owner: "root_layout",
            source,
            target: target.pathname,
            normalizedPath: target.normalizedPath,
            reason: "root_navigation_not_ready",
          },
        });
      }
      return true;
    }

    const previousPending = pendingPublicRequestDeepLinkRef.current;
    const routedSources =
      previousPending?.key === pendingKey ? previousPending.routedSources : [];
    if (routedSources.includes(source)) return true;

    pendingPublicRequestDeepLinkRef.current = {
      key: pendingKey,
      source,
      url: resolvedUrl,
      routedSources: [...routedSources, source],
    };

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
    try {
      const method = routePublicRequestDeepLink(target);
      recordPlatformObservability({
        screen: "request",
        surface: "startup_bootstrap",
        category: "ui",
        event: "public_request_deep_link_navigation",
        result: "success",
        extra: {
          owner: "root_layout",
          source,
          target: target.href,
          normalizedPath: target.normalizedPath,
          method,
          routedSourceCount: routedSources.length + 1,
          observedPathname: pathname,
        },
      });
    } catch (error: unknown) {
      recordPlatformObservability({
        screen: "request",
        surface: "startup_bootstrap",
        category: "ui",
        event: "public_request_deep_link_navigation_failed",
        result: "error",
        errorStage: "router_replace",
        errorClass: error instanceof Error ? error.name : undefined,
        errorMessage:
          error instanceof Error
            ? error.message
            : String(error ?? "public_request_deep_link_navigation_failed"),
        fallbackUsed: true,
        extra: {
          owner: "root_layout",
          source,
          target: target.href,
          normalizedPath: target.normalizedPath,
        },
      });
      pendingPublicRequestDeepLinkRef.current = {
        key: pendingKey,
        source,
        url: resolvedUrl,
        routedSources,
      };
      return false;
    }
    return true;
  }, [pathname, rootNavigationReady]);

  useEffect(() => {
    if (!rootNavigationReady) return;
    const pending = pendingPublicRequestDeepLinkRef.current;
    if (!pending) return;
    if (isPublicRequestRoutePathname(pathname)) {
      pendingPublicRequestDeepLinkRef.current = null;
      clearLatestNativeViewUrl(pending.url);
      recordPlatformObservability({
        screen: "request",
        surface: "startup_bootstrap",
        category: "ui",
        event: "public_request_deep_link_navigation_observed",
        result: "success",
        extra: {
          owner: "root_layout",
          source: pending.source,
          routedSourceCount: pending.routedSources.length,
          pathname,
        },
      });
      return;
    }
    if (pending.routedSources.length === 0) {
      openPublicRequestDeepLink(pending.url, pending.source);
    }
  }, [openPublicRequestDeepLink, pathname, rootNavigationReady]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    openPublicRequestDeepLink(expoLinkingUrl, "expo_linking_url");
  }, [expoLinkingUrl, openPublicRequestDeepLink]);

  // --- Native: public request deep links must not be trapped on auth screens ---
  // --- WEB: нормальный контейнер/скролл ---
  useEffect(() => {
    if (Platform.OS === "web") return undefined;
    let active = true;
    let nativeReadInFlightStartedAt: number | null = null;
    let nativeReadFailureRecorded = false;
    let nativeReadStaleRecorded = false;

    const drainLatestNativeViewUrl = () => {
      const now = Date.now();
      if (nativeReadInFlightStartedAt != null) {
        const inFlightAgeMs = now - nativeReadInFlightStartedAt;
        if (inFlightAgeMs < NATIVE_VIEW_URL_DRAIN_STALE_MS) return;
        if (!nativeReadStaleRecorded) {
          nativeReadStaleRecorded = true;
          recordPlatformObservability({
            screen: "request",
            surface: "startup_bootstrap",
            category: "ui",
            event: "public_request_native_intent_read_stale",
            result: "skipped",
            fallbackUsed: true,
            extra: {
              owner: "root_layout",
              inFlightAgeMs,
              staleAfterMs: NATIVE_VIEW_URL_DRAIN_STALE_MS,
            },
          });
        }
      }

      const readStartedAt = now;
      nativeReadInFlightStartedAt = readStartedAt;
      void getLatestNativeViewUrl()
        .then((url) => {
          if (active) openPublicRequestDeepLink(url, "native_view_intent");
        })
        .catch((error: unknown) => {
          if (nativeReadFailureRecorded) return;
          nativeReadFailureRecorded = true;
          recordPlatformObservability({
            screen: "request",
            surface: "startup_bootstrap",
            category: "ui",
            event: "public_request_native_intent_read_failed",
            result: "error",
            errorStage: "native_latest_view_url",
            errorClass: error instanceof Error ? error.name : undefined,
            errorMessage:
              error instanceof Error
                ? error.message
                : String(error ?? "native_latest_view_url_failed"),
            fallbackUsed: true,
            extra: {
              owner: "root_layout",
            },
          });
        })
        .finally(() => {
          if (nativeReadInFlightStartedAt === readStartedAt) {
            nativeReadInFlightStartedAt = null;
          }
        });
    };

    const subscription = RNLinking.addEventListener("url", ({ url }) => {
      if (active) openPublicRequestDeepLink(url, "url_event");
    });
    const nativeSubscription = addNativeViewUrlListener((url) => {
      if (active) openPublicRequestDeepLink(url, "native_view_intent");
    });
    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") drainLatestNativeViewUrl();
    });
    const nativeDrainInterval =
      Platform.OS === "android"
        ? setInterval(drainLatestNativeViewUrl, 1_000)
        : null;

    drainLatestNativeViewUrl();

    void RNLinking.getInitialURL()
      .then((url) => {
        if (active) openPublicRequestDeepLink(url, "initial_url");
      })
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
      nativeSubscription.remove();
      appStateSubscription.remove();
      if (nativeDrainInterval) clearInterval(nativeDrainInterval);
    };
  }, [openPublicRequestDeepLink]);

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
    if (!shouldWarmOfficeRouteAfterStartup(pathname)) return undefined;

    let active = true;
    const warmOfficeRoute = () => {
      if (active) void import("./(tabs)/office/index");
    };

    if (Platform.OS === "web") {
      const warmupTimeout = setTimeout(warmOfficeRoute, 0);
      return () => {
        active = false;
        clearTimeout(warmupTimeout);
      };
    }

    const task = InteractionManager.runAfterInteractions(warmOfficeRoute);

    return () => {
      active = false;
      task.cancel?.();
    };
  }, [pathname]);

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
                  name="add"
                  options={{
                    headerShown: false,
                  }}
                />
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
