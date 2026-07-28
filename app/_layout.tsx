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
import { getSessionSafe } from "../src/lib/supabaseClient";
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
  RequestEstimateLaunchPayloadError,
  resolveRequestEstimateLaunchTargetV1,
  type RequestEstimateLaunchTargetV1,
} from "../src/lib/navigation/requestEstimateLaunchPayload";
import { recordRequestEstimateLaunchStage } from "../src/lib/navigation/requestEstimateLaunchObservability";
import {
  requestEstimateIntentLifecycle,
} from "../src/lib/navigation/requestEstimateLaunchLifecycle";
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
  target: PublicRequestDeepLinkTarget | RequestEstimateLaunchTargetV1,
  allowTabNavigation = true,
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

  if (!allowTabNavigation) {
    try {
      router.replace(routeTarget);
      logAndroidPublicRequestDeepLink("route", {
        method: "replace_object_fallback",
        normalizedPath: target.normalizedPath,
      });
      return "replace_object_fallback";
    } catch {
      // Continue through the href and navigate fallbacks below.
    }
  }

  if (allowTabNavigation && navigatePublicRequestTab(target)) {
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
  const previousAuthenticatedUserIdRef = useRef<string | null>(null);
  const requestEstimateTargetCacheRef = useRef(
    new Map<string, RequestEstimateLaunchTargetV1>(),
  );
  const scheduledRequestEstimateLaunchIdsRef = useRef(new Set<string>());
  const pendingIntentAuthRecoveryLaunchIdRef = useRef<string | null>(null);
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

  const recoverReadableSessionForPendingIntent = useCallback(
    (target: RequestEstimateLaunchTargetV1) => {
      const launchId = target.payload.launchId;
      if (
        authState.authSessionState.status === "authenticated" ||
        pendingIntentAuthRecoveryLaunchIdRef.current === launchId
      ) {
        return;
      }
      pendingIntentAuthRecoveryLaunchIdRef.current = launchId;
      void getSessionSafe({
        caller: "request_estimate_pending_intent",
      })
        .then(({ session, degraded }) => {
          const pending = requestEstimateIntentLifecycle.getPending();
          if (
            degraded ||
            !session?.user ||
            pending?.target.payload.launchId !== launchId
          ) {
            return;
          }
          authState.setAuthSessionState({
            status: "authenticated",
            reason: "auth_event_authenticated",
          });
          void authState.loadRoleForCurrentSession(session.user);
        })
        .catch((error: unknown) => {
          recordPlatformObservability({
            screen: "request",
            surface: "auth_session_gate",
            category: "fetch",
            event: "pending_intent_session_recovery_failed",
            result: "error",
            errorStage: "get_session_safe",
            errorClass: error instanceof Error ? error.name : "Unknown",
            errorMessage:
              error instanceof Error ? error.message : String(error),
            fallbackUsed: true,
            extra: {
              owner: "root_layout",
              launchId,
            },
          });
        })
        .finally(() => {
          if (pendingIntentAuthRecoveryLaunchIdRef.current === launchId) {
            pendingIntentAuthRecoveryLaunchIdRef.current = null;
          }
        });
    },
    [
      authState.authSessionState.status,
      authState.loadRoleForCurrentSession,
      authState.setAuthSessionState,
    ],
  );

  const openPublicRequestDeepLink = useCallback((
    url: string | null | undefined,
    source: PublicRequestDeepLinkSource,
  ) => {
    const resolvedUrl = String(url ?? "");
    let requestEstimateTarget: RequestEstimateLaunchTargetV1 | null = null;
    if (resolvedUrl) {
      requestEstimateTarget =
        requestEstimateTargetCacheRef.current.get(resolvedUrl) ?? null;
      if (!requestEstimateTarget) {
        try {
          const candidate = resolveRequestEstimateLaunchTargetV1(resolvedUrl);
          if (candidate?.payload.route === "/request") {
            requestEstimateTarget = candidate;
            requestEstimateTargetCacheRef.current.set(resolvedUrl, candidate);
          }
        } catch (error) {
          if (
            !(
              error instanceof RequestEstimateLaunchPayloadError &&
              error.code === "REQUEST_ESTIMATE_LAUNCH_WORK_INTENT_REQUIRED"
            )
          ) {
            const errorCode =
              error instanceof RequestEstimateLaunchPayloadError
                ? error.code
                : "REQUEST_ESTIMATE_LAUNCH_PAYLOAD_CORRUPT";
            if (rootNavigationReady) {
              router.replace({
                pathname: "/(tabs)/request",
                params: { launchError: errorCode },
              });
            }
            return true;
          }
        }
      }
    }
    const target =
      requestEstimateTarget ?? resolvePublicRequestDeepLinkTarget(url);
    if (!target) return false;
    const pendingKey = requestEstimateTarget?.payload.launchId ?? target.href;
    if (requestEstimateTarget) {
      const received = requestEstimateIntentLifecycle.receive(
        requestEstimateTarget,
        source,
      );
      if (
        received.kind === "duplicate_acknowledged" ||
        received.kind === "duplicate_superseded" ||
        received.kind === "ignored_stale_snapshot"
      ) {
        return true;
      }
      if (received.kind === "accepted") {
        if (
          pendingPublicRequestDeepLinkRef.current?.key !== pendingKey
        ) {
          pendingPublicRequestDeepLinkRef.current = null;
        }
        recordRequestEstimateLaunchStage({
          stage: "INTENT_RECEIVED",
          payload: requestEstimateTarget.payload,
          source,
          detail: {
            replacedLaunchId: received.replacedLaunchId,
          },
        });
        recordRequestEstimateLaunchStage({
          stage: "URL_PARSED",
          payload: requestEstimateTarget.payload,
          source,
        });
        requestEstimateIntentLifecycle.markStage(
          requestEstimateTarget.payload.launchId,
          "URL_PARSED",
        );
      }
      if (
        !authState.sessionLoaded ||
        authState.authSessionState.status !== "authenticated"
      ) {
        if (
          requestEstimateIntentLifecycle.markStage(
            requestEstimateTarget.payload.launchId,
            "AUTH_PENDING",
          )
        ) {
          recordRequestEstimateLaunchStage({
            stage: "AUTH_PENDING",
            payload: requestEstimateTarget.payload,
            source,
          });
        }
        pendingPublicRequestDeepLinkRef.current = {
          key: pendingKey,
          source,
          url: requestEstimateTarget.href,
          routedSources: [],
        };
        recoverReadableSessionForPendingIntent(requestEstimateTarget);
        return true;
      }
      const lifecyclePending = requestEstimateIntentLifecycle.getPending();
      if (
        lifecyclePending?.stage === "AUTH_PENDING" ||
        lifecyclePending?.stage === "URL_PARSED"
      ) {
        requestEstimateIntentLifecycle.markStage(
          requestEstimateTarget.payload.launchId,
          "AUTH_RESOLVED",
        );
        recordRequestEstimateLaunchStage({
          stage: "AUTH_RESOLVED",
          payload: requestEstimateTarget.payload,
          source,
          detail: {
            authenticated: true,
            publicRoute: true,
          },
        });
      }
    }
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
          url: requestEstimateTarget?.href ?? resolvedUrl,
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

    if (requestEstimateTarget) {
      if (
        !requestEstimateIntentLifecycle.shouldApply(
          requestEstimateTarget.payload.launchId,
        )
      ) {
        return true;
      }
    }

    const previousPending = pendingPublicRequestDeepLinkRef.current;
    const routedSources =
      previousPending?.key === pendingKey ? previousPending.routedSources : [];
    if (routedSources.includes(source)) return true;

    pendingPublicRequestDeepLinkRef.current = {
      key: pendingKey,
      source,
      url: requestEstimateTarget?.href ?? resolvedUrl,
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
    const requestRouteAlreadyMounted = isPublicRequestRoutePathname(pathname);
    const applyNavigation = (allowTabNavigation: boolean): boolean => {
      try {
        const method = routePublicRequestDeepLink(target, allowTabNavigation);
        if (requestEstimateTarget) {
          if (
            requestEstimateIntentLifecycle.markStage(
              requestEstimateTarget.payload.launchId,
              "INTENT_APPLIED",
            )
          ) {
            recordRequestEstimateLaunchStage({
              stage: "INTENT_APPLIED",
              payload: requestEstimateTarget.payload,
              source,
            });
          }
        }
        if (requestRouteAlreadyMounted) {
          pendingPublicRequestDeepLinkRef.current = null;
          clearLatestNativeViewUrl(resolvedUrl);
        }
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
        return true;
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
    };

    if (requestEstimateTarget) {
      const launchId = requestEstimateTarget.payload.launchId;
      if (!scheduledRequestEstimateLaunchIdsRef.current.has(launchId)) {
        scheduledRequestEstimateLaunchIdsRef.current.add(launchId);
        logAndroidPublicRequestDeepLink("route_scheduled", {
          launchId,
          normalizedPath: target.normalizedPath,
        });
        setImmediate(() => {
          scheduledRequestEstimateLaunchIdsRef.current.delete(launchId);
          if (!requestEstimateIntentLifecycle.shouldApply(launchId)) return;
          applyNavigation(true);
        });
      }
      return true;
    }

    return applyNavigation(
      !normalizeWarmupPathname(pathname).startsWith("/auth"),
    );
  }, [
    authState.authSessionState.status,
    authState.sessionLoaded,
    pathname,
    recoverReadableSessionForPendingIntent,
    rootNavigationReady,
  ]);

  const openRequestEstimateDeepLink = useCallback((
    url: string | null | undefined,
    source: PublicRequestDeepLinkSource,
  ) => {
    const resolvedUrl = String(url ?? "");
    if (!resolvedUrl) return false;
    let target =
      requestEstimateTargetCacheRef.current.get(resolvedUrl) ?? null;
    try {
      target ??= resolveRequestEstimateLaunchTargetV1(resolvedUrl);
    } catch (error) {
      if (
        error instanceof RequestEstimateLaunchPayloadError &&
        error.code === "REQUEST_ESTIMATE_LAUNCH_WORK_INTENT_REQUIRED"
      ) {
        return openPublicRequestDeepLink(url, source);
      }
      const errorCode =
        error instanceof RequestEstimateLaunchPayloadError
          ? error.code
          : "REQUEST_ESTIMATE_LAUNCH_PAYLOAD_CORRUPT";
      if (rootNavigationReady) {
        const route = resolvedUrl.includes("/ai")
          ? "/(tabs)/ai"
          : "/(tabs)/request";
        router.replace({ pathname: route, params: { launchError: errorCode } });
      }
      return true;
    }
    if (!target) return false;
    requestEstimateTargetCacheRef.current.set(resolvedUrl, target);
    if (target.payload.route === "/request") {
      return openPublicRequestDeepLink(target.href, source);
    }

    const received = requestEstimateIntentLifecycle.receive(target, source);
    if (
      received.kind === "duplicate_acknowledged" ||
      received.kind === "duplicate_superseded" ||
      received.kind === "ignored_stale_snapshot"
    ) {
      return true;
    }
    if (received.kind === "accepted") {
      pendingPublicRequestDeepLinkRef.current = null;
      recordRequestEstimateLaunchStage({
        stage: "INTENT_RECEIVED",
        payload: target.payload,
        source,
        detail: { replacedLaunchId: received.replacedLaunchId },
      });
      recordRequestEstimateLaunchStage({
        stage: "URL_PARSED",
        payload: target.payload,
        source,
      });
      requestEstimateIntentLifecycle.markStage(
        target.payload.launchId,
        "URL_PARSED",
      );
    }
    if (
      !authState.sessionLoaded ||
      authState.authSessionState.status !== "authenticated"
    ) {
      if (
        requestEstimateIntentLifecycle.markStage(
          target.payload.launchId,
          "AUTH_PENDING",
        )
      ) {
        recordRequestEstimateLaunchStage({
          stage: "AUTH_PENDING",
          payload: target.payload,
          source,
        });
      }
      recoverReadableSessionForPendingIntent(target);
      return true;
    }
    const lifecyclePending = requestEstimateIntentLifecycle.getPending();
    if (
      lifecyclePending?.stage === "AUTH_PENDING" ||
      lifecyclePending?.stage === "URL_PARSED"
    ) {
      requestEstimateIntentLifecycle.markStage(
        target.payload.launchId,
        "AUTH_RESOLVED",
      );
      recordRequestEstimateLaunchStage({
        stage: "AUTH_RESOLVED",
        payload: target.payload,
        source,
        detail: { authenticated: true, publicRoute: false },
      });
    }
    if (
      !rootNavigationReady ||
      !requestEstimateIntentLifecycle.shouldApply(target.payload.launchId)
    ) {
      return true;
    }
    if (
      requestEstimateIntentLifecycle.markStage(
        target.payload.launchId,
        "INTENT_APPLIED",
      )
    ) {
      recordRequestEstimateLaunchStage({
        stage: "INTENT_APPLIED",
        payload: target.payload,
        source,
      });
    }
    const aiTabNavigationApplied = navigatePublicRequestTab(target);
    if (!aiTabNavigationApplied) {
      router.replace(target.href as Href);
    }
    logAndroidPublicRequestDeepLink("ai_route_applied", {
      launchId: target.payload.launchId,
      method: aiTabNavigationApplied ? "tab_navigation" : "replace_href",
      normalizedPath: target.normalizedPath,
    });
    return true;
  }, [
    authState.authSessionState.status,
    authState.sessionLoaded,
    openPublicRequestDeepLink,
    recoverReadableSessionForPendingIntent,
    rootNavigationReady,
  ]);

  useEffect(() => {
    const pending = requestEstimateIntentLifecycle.getPending();
    if (
      !pending ||
      !rootNavigationReady ||
      !authState.sessionLoaded ||
      authState.authSessionState.status !== "authenticated"
    ) {
      return;
    }
    openRequestEstimateDeepLink(
      pending.target.href,
      pending.source as PublicRequestDeepLinkSource,
    );
  }, [
    authState.authSessionState.status,
    authState.sessionLoaded,
    openRequestEstimateDeepLink,
    rootNavigationReady,
  ]);

  useEffect(() => {
    if (
      authState.authSessionState.status !== "unauthenticated" ||
      authState.authSessionState.reason !== "terminal_sign_out"
    ) {
      return;
    }
    requestEstimateIntentLifecycle.clearSessionBoundary();
    pendingPublicRequestDeepLinkRef.current = null;
    requestEstimateTargetCacheRef.current.clear();
    scheduledRequestEstimateLaunchIdsRef.current.clear();
  }, [
    authState.authSessionState.reason,
    authState.authSessionState.status,
  ]);

  useEffect(() => {
    const currentUserId = authState.authenticatedUserId;
    const previousUserId = previousAuthenticatedUserIdRef.current;
    previousAuthenticatedUserIdRef.current = currentUserId;
    if (!currentUserId || !previousUserId || currentUserId === previousUserId) {
      return;
    }
    requestEstimateIntentLifecycle.clearSessionBoundary();
    pendingPublicRequestDeepLinkRef.current = null;
    requestEstimateTargetCacheRef.current.clear();
    scheduledRequestEstimateLaunchIdsRef.current.clear();
  }, [authState.authenticatedUserId]);

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
    if (Platform.OS !== "android") {
      openRequestEstimateDeepLink(expoLinkingUrl, "expo_linking_url");
      return;
    }
    let active = true;
    void getLatestNativeViewUrl()
      .then((nativeUrl) => {
        if (!active) return;
        openRequestEstimateDeepLink(
          nativeUrl ?? expoLinkingUrl,
          nativeUrl ? "native_view_intent" : "expo_linking_url",
        );
      })
      .catch((error: unknown) => {
        if (!active) return;
        recordPlatformObservability({
          screen: "request",
          surface: "startup_bootstrap",
          category: "ui",
          event: "request_estimate_linking_url_native_confirmation_failed",
          result: "error",
          errorStage: "native_latest_view_url",
          errorClass: error instanceof Error ? error.name : "Unknown",
          errorMessage:
            error instanceof Error ? error.message : String(error),
          fallbackUsed: true,
        });
        openRequestEstimateDeepLink(expoLinkingUrl, "expo_linking_url");
      });
    return () => {
      active = false;
    };
  }, [expoLinkingUrl, openRequestEstimateDeepLink]);

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
          if (active) openRequestEstimateDeepLink(url, "native_view_intent");
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
      if (active) openRequestEstimateDeepLink(url, "url_event");
    });
    const nativeSubscription = addNativeViewUrlListener((url) => {
      if (active) openRequestEstimateDeepLink(url, "native_view_intent");
    });
    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") drainLatestNativeViewUrl();
    });
    drainLatestNativeViewUrl();

    void RNLinking.getInitialURL()
      .then((url) => {
        if (active) openRequestEstimateDeepLink(url, "initial_url");
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
    };
  }, [openRequestEstimateDeepLink]);

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
              {authState.sessionLoaded &&
              authState.authSessionState.status === "authenticated" &&
              authState.authenticatedUserId ? (
                <RouteReadyMarker
                  marker={ROUTE_PROOF_MARKERS.authenticatedSession}
                />
              ) : null}
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
