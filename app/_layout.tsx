// app/_layout.tsx  (PROD — Stack root for native iOS navigation support)

import "../src/lib/runtime/installWeakRefPolyfill";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, LogBox } from "react-native";
import { Stack, router, usePathname, useSegments } from "expo-router";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Host } from "react-native-portalize";

import { clearAppCache } from "../src/lib/cache/clearAppCache";
import { getSessionSafe, supabase } from "../src/lib/supabaseClient";
import {
  warmCurrentSessionProfile,
} from "../src/lib/sessionRole";
import {
  ensureQueueWorker,
  stopQueueWorker,
} from "../src/workers/queueBootstrap";
import { recordPlatformObservability } from "../src/lib/observability/platformObservability";
import { GlobalBusyProvider } from "../src/ui/GlobalBusy";
import PlatformOfflineStatusHost from "../src/components/PlatformOfflineStatusHost";
import { POST_AUTH_ENTRY_ROUTE } from "../src/lib/authRouting";
import { applyRootLayoutWebContainerStyle } from "../src/lib/entry/rootLayoutWebContainer";
import { AppQueryProvider } from "../src/lib/query/queryClient";
import { resetSessionBoundary } from "../src/lib/session/sessionBoundary";

const AUTH_EXIT_SESSION_SETTLE_WINDOW_MS = 2500;

function isTimeoutLikeAuthError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("timed out") ||
    message.includes("aborted") ||
    message.includes("AbortError") ||
    message.includes("network request failed")
  );
}

function isAuthStackRoute(segments: readonly string[] | undefined) {
  return segments?.[0] === "auth";
}

function isRootEntryPath(pathname: string | null | undefined) {
  return !pathname || pathname === "/" || pathname === "/index";
}

function isProtectedAppRoute(
  pathname: string | null | undefined,
  segments: readonly string[] | undefined,
) {
  if (isRootEntryPath(pathname)) return false;
  if (isAuthStackRoute(segments)) return false;
  if (String(pathname ?? "").startsWith("/auth")) return false;
  return true;
}
// --- WEB: тихо глушим шумные предупреждения (только в браузере) ---
if (Platform.OS === "web") {
  LogBox.ignoreLogs([
    "props.pointerEvents is deprecated. Use style.pointerEvents",
    '"shadow*" style props are deprecated. Use "boxShadow".',
  ]);

  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const msg = String(args?.[0] ?? "");
    if (
      msg.includes("props.pointerEvents is deprecated") ||
      msg.includes('"shadow*" style props are deprecated')
    ) {
      return;
    }
    originalWarn.apply(console, args as unknown as []);
  };
}

export default function RootLayout() {
  const segments = useSegments();
  const pathname = usePathname();
  const isPdfViewerRoute = pathname === "/pdf-viewer";

  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  // роль сейчас напрямую не используется в _layout, но оставляем фоновой прогрев
  const initStartedRef = useRef(false);
  const launchMarkerRef = useRef(false);
  const usableUiMarkerRef = useRef(false);
  const hasSessionRef = useRef<boolean | null>(null);
  hasSessionRef.current = hasSession;
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const isPdfViewerRouteRef = useRef(isPdfViewerRoute);
  isPdfViewerRouteRef.current = isPdfViewerRoute;
  const previousInAuthStackRef = useRef(segments?.[0] === "auth");
  const authExitAtRef = useRef<number | null>(null);
  const authExitSessionProbeTokenRef = useRef(0);
  const authExitSessionProbeInFlightRef = useRef(false);
  const recordAuthCheckEvent = useCallback(
    (
      event: string,
      result: "success" | "error" | "skipped",
      extra?: Record<string, unknown>,
    ) => {
      recordPlatformObservability({
        screen: "request",
        surface: "auth_session_gate",
        category: "fetch",
        event,
        result,
        extra: {
          owner: "root_layout",
          pathname: pathnameRef.current,
          inAuthStack: previousInAuthStackRef.current,
          ...(extra ?? {}),
        },
      });
    },
    [],
  );
  const recordAuthGateEvent = useCallback(
    (
      event: string,
      result: "success" | "error" | "skipped",
      extra?: Record<string, unknown>,
    ) => {
      recordPlatformObservability({
        screen: "request",
        surface: "auth_session_gate",
        category: "ui",
        event,
        result,
        extra: {
          owner: "root_layout",
          pathname: pathnameRef.current,
          inAuthStack: previousInAuthStackRef.current,
          ...(extra ?? {}),
        },
      });
    },
    [],
  );
  const recordAuthRedirectBlocked = useCallback(
    (reason: string, extra?: Record<string, unknown>) => {
      recordAuthGateEvent("auth_redirect_blocked", "skipped", {
        target: "/auth/login",
        reason,
        ...(extra ?? {}),
      });
    },
    [recordAuthGateEvent],
  );
  const recordAuthRedirectTriggered = useCallback(
    (reason: string, extra?: Record<string, unknown>) => {
      const payload = {
        target: "/auth/login",
        reason,
        ...(extra ?? {}),
      };
      recordAuthGateEvent("auth_redirect_triggered", "success", payload);
      recordAuthGateEvent("auth_gate_login_redirect", "success", payload);
    },
    [recordAuthGateEvent],
  );
  const resetPendingAuthExitSessionProbe = useCallback(() => {
    authExitAtRef.current = null;
    authExitSessionProbeInFlightRef.current = false;
    authExitSessionProbeTokenRef.current += 1;
  }, []);
  const clearSessionBoundaryState = useCallback(
    (reason: string) => resetSessionBoundary(reason),
    [],
  );
  useEffect(() => {
    if (launchMarkerRef.current) return;
    launchMarkerRef.current = true;
    recordPlatformObservability({
      screen: "request",
      surface: "startup_bootstrap",
      category: "ui",
      event: "app_launch_start",
      result: "success",
      extra: {
        owner: "root_layout",
      },
    });
  }, []);
  // --- WEB: нормальный контейнер/скролл ---
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const result = applyRootLayoutWebContainerStyle(document);
    if (result.ok === false) {
      recordAuthGateEvent("web_root_container_style_failed", "error", {
        caller: "root_layout",
        errorStage: "web_root_container_setup",
        errorClass: result.errorClass,
        errorMessage: result.errorMessage,
        fallbackUsed: true,
      });
    }
  }, [recordAuthGateEvent]);

  useEffect(() => {
    void clearAppCache();
  }, []);

  useEffect(() => {
    const inAuthStack = segments?.[0] === "auth";
    const wasInAuthStack = previousInAuthStackRef.current;

    if (wasInAuthStack && !inAuthStack) {
      authExitAtRef.current = Date.now();
      authExitSessionProbeInFlightRef.current = false;
      authExitSessionProbeTokenRef.current += 1;
      recordAuthGateEvent("post_auth_route_decision", "skipped", {
        reason: "auth_stack_exit_session_settle_pending",
        target: POST_AUTH_ENTRY_ROUTE,
      });
    } else if (inAuthStack) {
      authExitAtRef.current = null;
      authExitSessionProbeInFlightRef.current = false;
    }

    previousInAuthStackRef.current = inAuthStack;
  }, [recordAuthGateEvent, segments]);

  // --- роль/профиль грузим в фоне, НЕ блокируя вход ---
  const loadRoleForCurrentSession = useCallback(async () => {
    if (!supabase) return;
    try {
      await warmCurrentSessionProfile("root_layout");
    } catch (e: unknown) {
      recordAuthCheckEvent("role_profile_warm_failed", "error", {
        caller: "root_layout",
        errorStage: "warm_current_session_profile",
        errorClass: e instanceof Error ? e.name : undefined,
        errorMessage:
          e instanceof Error ? e.message : String(e ?? "role_profile_warm_failed"),
        fallbackUsed: true,
      });
      if (__DEV__) {
        console.warn(
          "[RootLayout] role load failed:",
          e instanceof Error ? e.message : e,
        );
      }
    }
  }, [recordAuthCheckEvent]);

  // --- INIT: читаем session один раз, роль — фоном ---
  useEffect(() => {
    if (!supabase) return;
    if (initStartedRef.current) return;
    initStartedRef.current = true;
    recordPlatformObservability({
      screen: "request",
      surface: "startup_bootstrap",
      category: "ui",
      event: "bootstrap_enter",
      result: "success",
      extra: {
        owner: "root_layout",
        pathname: pathnameRef.current,
      },
    });

    let active = true;

    (async () => {
      try {
        recordAuthCheckEvent("auth_check_start", "skipped", {
          caller: "root_layout",
        });
        const { session, degraded } = await getSessionSafe({
          caller: "root_layout",
        });
        if (!active) return;

        recordAuthCheckEvent("auth_check_result", "success", {
          caller: "root_layout",
          degraded,
          hasSession: Boolean(session),
        });

        if (degraded) {
          recordAuthCheckEvent("auth_check_timeout", "skipped", {
            caller: "root_layout",
            degraded: true,
            reason: "degraded_session_read",
          });
          recordPlatformObservability({
            screen: "request",
            surface: "startup_bootstrap",
            category: "fetch",
            event: "auth_restore_result",
            result: "success",
            fallbackUsed: true,
            extra: {
              owner: "root_layout",
              degraded: true,
              hasSession: false,
            },
          });
          setHasSession(null);
          setSessionLoaded(true);
          return;
        }

        const has = Boolean(session);
        recordPlatformObservability({
          screen: "request",
          surface: "startup_bootstrap",
          category: "fetch",
          event: "auth_restore_result",
          result: "success",
          extra: {
            owner: "root_layout",
            degraded: false,
            hasSession: has,
          },
        });

        if (!has && isProtectedAppRoute(pathnameRef.current, segments)) {
          recordAuthRedirectBlocked("protected_app_route_session_unknown", {
            caller: "root_layout",
            reason: "bootstrap_no_session_on_protected_route",
          });
          setHasSession(null);
          setSessionLoaded(true);
          return;
        }

        setHasSession(has);
        setSessionLoaded(true);

        if (has) loadRoleForCurrentSession();
        else {
          await clearSessionBoundaryState("bootstrap_no_session");
        }
      } catch (e: unknown) {
        const timeoutLike = isTimeoutLikeAuthError(e);
        recordAuthCheckEvent(
          timeoutLike ? "auth_check_timeout" : "auth_check_result",
          timeoutLike ? "skipped" : "error",
          {
            caller: "root_layout",
            degraded: true,
            errorClass: e instanceof Error ? e.name : undefined,
            errorMessage:
              e instanceof Error
                ? e.message
                : String(e ?? "startup_bootstrap_failed"),
          },
        );
        recordPlatformObservability({
          screen: "request",
          surface: "startup_bootstrap",
          category: "fetch",
          event: "auth_restore_result",
          result: "error",
          errorStage: "get_session_safe",
          errorClass: e instanceof Error ? e.name : undefined,
          errorMessage:
            e instanceof Error
              ? e.message
              : String(e ?? "startup_bootstrap_failed"),
          fallbackUsed: true,
          extra: {
            owner: "root_layout",
          },
        });
        if (__DEV__) {
          console.warn(
            "[RootLayout] session load failed:",
            e instanceof Error ? e.message : e,
          );
        }
        if (!active) return;

        // 🔥 НЕ считаем это logout
        setHasSession(null);

        // ❌ НЕ ЧИСТИМ состояние при timeout
        // clearDocumentSessions();
        // clearCurrentSessionRoleCache();

        setSessionLoaded(true);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const has = Boolean(session);
        const isTerminalSignOut =
          event === "SIGNED_OUT" || String(event) === "USER_DELETED";

        recordPlatformObservability({
          screen: "request",
          surface: "startup_bootstrap",
          category: "ui",
          event: "auth_state_change_event",
          result: "success",
          extra: {
            owner: "root_layout",
            authEvent: event,
            hasSession: has,
          },
        });

        if (__DEV__) {
          console.info(
            `[RootLayout] onAuthStateChange: ${event}, hasSession=${has}`,
          );
        }

        setSessionLoaded(true);

        if (!has) {
          if (!isTerminalSignOut) {
            recordAuthGateEvent("auth_gate_transient_no_session", "skipped", {
              authEvent: event,
              hadSession: hasSessionRef.current === true,
              reason: "non_terminal_auth_event",
            });
            recordAuthRedirectBlocked("non_terminal_auth_event", {
              authEvent: event,
              hadSession: hasSessionRef.current === true,
            });
            setHasSession(null);
            return;
          }

          resetPendingAuthExitSessionProbe();
          setHasSession(false);
          await clearSessionBoundaryState("terminal_sign_out");
          if (!isPdfViewerRouteRef.current) {
            recordAuthRedirectTriggered("terminal_sign_out", {
              authEvent: event,
            });
            router.replace("/auth/login");
          }
          return;
        }

        resetPendingAuthExitSessionProbe();
        setHasSession(true);
        loadRoleForCurrentSession();
      },
    );

    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
    };
  }, [
    clearSessionBoundaryState,
    loadRoleForCurrentSession,
    recordAuthCheckEvent,
    recordAuthGateEvent,
    recordAuthRedirectBlocked,
    recordAuthRedirectTriggered,
    resetPendingAuthExitSessionProbe,
    segments,
  ]);

  useEffect(() => {
    if (!sessionLoaded) return;

    const inAuthStack = segments?.[0] === "auth";
    const authExitAgeMs =
      authExitAtRef.current == null ? null : Date.now() - authExitAtRef.current;
    const shouldSettlePostAuthSession =
      hasSession === false &&
      !inAuthStack &&
      !isPdfViewerRouteRef.current &&
      authExitAgeMs != null &&
      authExitAgeMs <= AUTH_EXIT_SESSION_SETTLE_WINDOW_MS;

    if (shouldSettlePostAuthSession) {
      if (!authExitSessionProbeInFlightRef.current) {
        authExitSessionProbeInFlightRef.current = true;
        const probeToken = authExitSessionProbeTokenRef.current + 1;
        authExitSessionProbeTokenRef.current = probeToken;
        recordPlatformObservability({
          screen: "request",
          surface: "auth_session_gate",
          category: "fetch",
          event: "auth_gate_session_settle_start",
          result: "skipped",
          extra: {
            owner: "root_layout",
            pathname,
            target: POST_AUTH_ENTRY_ROUTE,
            reason: "recent_auth_stack_exit",
          },
        });

        void (async () => {
          let settledSession: Awaited<
            ReturnType<typeof getSessionSafe>
          >["session"] = null;
          let degraded = false;

          try {
            recordAuthCheckEvent("auth_check_start", "skipped", {
              caller: "root_layout_post_auth_exit",
              reason: "recent_auth_stack_exit",
              settleDelayMs: AUTH_EXIT_SESSION_SETTLE_WINDOW_MS,
            });

            await new Promise((resolve) =>
              setTimeout(resolve, AUTH_EXIT_SESSION_SETTLE_WINDOW_MS),
            );

            if (probeToken !== authExitSessionProbeTokenRef.current) return;

            const result = await getSessionSafe({
              caller: "root_layout_post_auth_exit",
            });

            if (probeToken !== authExitSessionProbeTokenRef.current) return;

            settledSession = result.session;
            degraded = result.degraded;

            recordAuthCheckEvent("auth_check_result", "success", {
              caller: "root_layout_post_auth_exit",
              degraded,
              hasSession: Boolean(settledSession),
              settleDelayMs: AUTH_EXIT_SESSION_SETTLE_WINDOW_MS,
            });

            if (degraded) {
              recordAuthCheckEvent("auth_check_timeout", "skipped", {
                caller: "root_layout_post_auth_exit",
                degraded: true,
                reason: "degraded_session_read",
                settleDelayMs: AUTH_EXIT_SESSION_SETTLE_WINDOW_MS,
              });
            }

            authExitSessionProbeInFlightRef.current = false;

            if (settledSession) {
              authExitAtRef.current = null;
              recordPlatformObservability({
                screen: "request",
                surface: "auth_session_gate",
                category: "fetch",
                event: "auth_gate_session_settle_result",
                result: "success",
                extra: {
                  owner: "root_layout",
                  hasSession: true,
                  reason: "session_visible_after_auth_exit",
                },
              });
              setHasSession(true);
              return;
            }

            authExitAtRef.current = null;

            if (degraded) {
              recordPlatformObservability({
                screen: "request",
                surface: "auth_session_gate",
                category: "fetch",
                event: "auth_gate_degraded_path",
                result: "skipped",
                extra: {
                  owner: "root_layout",
                  reason: "post_auth_session_read_degraded",
                },
              });
              setHasSession(null);
              return;
            }

            recordAuthRedirectTriggered("post_auth_session_absent_after_settle");
            router.replace("/auth/login");
          } catch (e: unknown) {
            if (probeToken !== authExitSessionProbeTokenRef.current) return;

            const timeoutLike = isTimeoutLikeAuthError(e);
            authExitSessionProbeInFlightRef.current = false;
            authExitAtRef.current = null;
            recordAuthCheckEvent(
              timeoutLike ? "auth_check_timeout" : "auth_check_result",
              timeoutLike ? "skipped" : "error",
              {
                caller: "root_layout_post_auth_exit",
                degraded: true,
                reason: "post_auth_session_read_failed",
                settleDelayMs: AUTH_EXIT_SESSION_SETTLE_WINDOW_MS,
                errorClass: e instanceof Error ? e.name : undefined,
                errorMessage:
                  e instanceof Error
                    ? e.message
                    : String(e ?? "post_auth_session_read_failed"),
              },
            );
            recordPlatformObservability({
              screen: "request",
              surface: "auth_session_gate",
              category: "fetch",
              event: "auth_gate_session_settle_result",
              result: "error",
              errorStage: "post_auth_session_read",
              errorClass: e instanceof Error ? e.name : undefined,
              errorMessage:
                e instanceof Error
                  ? e.message
                  : String(e ?? "post_auth_session_read_failed"),
              fallbackUsed: true,
              extra: {
                owner: "root_layout",
                reason: "post_auth_session_read_failed",
              },
            });
            setHasSession(null);
          }
        })();
      }

      recordAuthGateEvent("auth_gate_login_redirect_suppressed", "skipped", {
        target: "/auth/login",
        reason: "post_auth_session_settle_inflight",
      });
      return;
    }

    if (hasSession === false && !inAuthStack && !isPdfViewerRouteRef.current) {
      if (isProtectedAppRoute(pathname, segments)) {
        recordAuthRedirectBlocked("protected_app_route_session_unknown", {
          hasSession,
          source: "confirmed_no_session_guard",
        });
        setHasSession(null);
        return;
      }

      recordAuthRedirectTriggered("confirmed_no_session", {
        hasSession,
      });
      router.replace("/auth/login");
      return;
    }

    if (hasSession === true && inAuthStack) {
      recordPlatformObservability({
        screen: "request",
        surface: "startup_bootstrap",
        category: "ui",
        event: "route_resolution_result",
        result: "success",
        extra: {
          owner: "root_layout",
          target: POST_AUTH_ENTRY_ROUTE,
          hasSession,
          reason: "session_present_in_auth_stack",
        },
      });
      resetPendingAuthExitSessionProbe();
      router.replace(POST_AUTH_ENTRY_ROUTE);
    }
  }, [
    hasSession,
    pathname,
    recordAuthCheckEvent,
    recordAuthRedirectBlocked,
    recordAuthRedirectTriggered,
    recordAuthGateEvent,
    resetPendingAuthExitSessionProbe,
    sessionLoaded,
    segments,
  ]);

  useEffect(() => {
    if (!sessionLoaded || usableUiMarkerRef.current) return;
    usableUiMarkerRef.current = true;
    recordPlatformObservability({
      screen: "request",
      surface: "startup_bootstrap",
      category: "ui",
      event: "first_usable_ui_ready",
      result: "success",
      extra: {
        owner: "root_layout",
        hasSession,
        pathname,
      },
    });
  }, [hasSession, pathname, sessionLoaded]);

  useEffect(() => {
    if (!sessionLoaded) return;

    if (hasSession === true) {
      ensureQueueWorker();
      return;
    }

    if (hasSession === false) {
      stopQueueWorker();
    }
  }, [hasSession, sessionLoaded]);

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
          <GlobalBusyProvider theme={UI}>
            <SafeAreaView
              style={{ flex: 1, backgroundColor: APP_BG, paddingTop: 0 }}
              edges={Platform.OS === "web" ? [] : ["top"]}
            >
              <PlatformOfflineStatusHost />
              <Stack screenOptions={{ headerShown: false }} />
            </SafeAreaView>
          </GlobalBusyProvider>
        </Host>
      </SafeAreaProvider>
    </AppQueryProvider>
  );
}
