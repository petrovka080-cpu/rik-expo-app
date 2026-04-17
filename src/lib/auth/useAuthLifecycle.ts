/**
 * useAuthLifecycle — centralized auth bootstrap + event subscription owner.
 *
 * AUTH-LIFECYCLE: Extracted from app/_layout.tsx to isolate auth state
 * from route churn. This hook has NO route dependencies (useSegments,
 * usePathname). The onAuthStateChange listener subscribes exactly once
 * and is never re-subscribed due to navigation changes.
 *
 * Owns:
 *  - Single onAuthStateChange subscription (stable)
 *  - Bootstrap getSessionSafe call (once-only via initStartedRef)
 *  - hasSession / sessionLoaded state
 *  - hasSessionRef for stale-safe access
 *  - Role profile warming via warmCurrentSessionProfile
 *  - Session boundary reset via resetSessionBoundary
 *  - Auth observability callbacks
 *
 * Does NOT own: route decisions, redirects, useSegments, usePathname.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { router } from "expo-router";

import { getSessionSafe, supabase } from "../supabaseClient";
import { warmCurrentSessionProfile } from "../sessionRole";
import { recordPlatformObservability } from "../observability/platformObservability";
import { resetSessionBoundary } from "../session/sessionBoundary";

function isTimeoutLikeAuthError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("timed out") ||
    message.includes("aborted") ||
    message.includes("AbortError") ||
    message.includes("network request failed")
  );
}

export type AuthLifecycleState = {
  hasSession: boolean | null;
  sessionLoaded: boolean;
  setHasSession: React.Dispatch<React.SetStateAction<boolean | null>>;
  hasSessionRef: React.MutableRefObject<boolean | null>;
  isPdfViewerRouteRef: React.MutableRefObject<boolean>;
  resetPendingAuthExitSessionProbe: () => void;
  loadRoleForCurrentSession: (user?: User | null) => void;
  clearSessionBoundaryState: (reason: string) => Promise<void>;
  recordAuthCheckEvent: (
    event: string,
    result: "success" | "error" | "skipped",
    extra?: Record<string, unknown>,
  ) => void;
  recordAuthGateEvent: (
    event: string,
    result: "success" | "error" | "skipped",
    extra?: Record<string, unknown>,
  ) => void;
  recordAuthRedirectBlocked: (
    reason: string,
    extra?: Record<string, unknown>,
  ) => void;
  recordAuthRedirectTriggered: (
    reason: string,
    extra?: Record<string, unknown>,
  ) => void;
  authExitAtRef: React.MutableRefObject<number | null>;
  authExitSessionProbeTokenRef: React.MutableRefObject<number>;
  authExitSessionProbeInFlightRef: React.MutableRefObject<boolean>;
};

export function useAuthLifecycle(deps: {
  /** Current pathname from usePathname() — stored in ref, NOT used as effect dep */
  pathname: string;
  /** Whether the current route is /pdf-viewer */
  isPdfViewerRoute: boolean;
  /** Current segments from useSegments() — only for initial protected route check */
  segments: readonly string[];
}): AuthLifecycleState {
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  const initStartedRef = useRef(false);
  const launchMarkerRef = useRef(false);
  const hasSessionRef = useRef<boolean | null>(null);
  hasSessionRef.current = hasSession;
  const pathnameRef = useRef(deps.pathname);
  pathnameRef.current = deps.pathname;
  const isPdfViewerRouteRef = useRef(deps.isPdfViewerRoute);
  isPdfViewerRouteRef.current = deps.isPdfViewerRoute;
  const previousInAuthStackRef = useRef(deps.segments?.[0] === "auth");
  const authExitAtRef = useRef<number | null>(null);
  const authExitSessionProbeTokenRef = useRef(0);
  const authExitSessionProbeInFlightRef = useRef(false);

  // --- Stable segments ref for use inside the init effect (NOT as dep) ---
  const segmentsRef = useRef(deps.segments);
  segmentsRef.current = deps.segments;

  // --- Observability helpers (stable callbacks) ---
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

  // --- Role profile warming (background, non-blocking) ---
  const loadRoleForCurrentSession = useCallback(async (user?: User | null) => {
    if (!supabase) return;
    try {
      await warmCurrentSessionProfile("root_layout", user);
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

  // --- App launch marker (once) ---
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

  // --- INIT: bootstrap session + auth listener (ONCE, stable deps) ---
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

        if (!has && isProtectedAppRoute(pathnameRef.current, segmentsRef.current)) {
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

        if (has) loadRoleForCurrentSession(session?.user ?? null);
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
        loadRoleForCurrentSession(session?.user ?? null);
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
    // NAV-P0: NO route deps here. The init effect MUST have stable deps only.
    // Adding segments/pathname would cause re-subscribe on every navigation,
    // killing the auth listener → stale hasSession → SIGABRT on back nav.
  ]);

  return {
    hasSession,
    sessionLoaded,
    setHasSession,
    hasSessionRef,
    isPdfViewerRouteRef,
    resetPendingAuthExitSessionProbe,
    loadRoleForCurrentSession,
    clearSessionBoundaryState,
    recordAuthCheckEvent,
    recordAuthGateEvent,
    recordAuthRedirectBlocked,
    recordAuthRedirectTriggered,
    authExitAtRef,
    authExitSessionProbeTokenRef,
    authExitSessionProbeInFlightRef,
  };
}

// --- Pure helper functions (shared with useAuthGuard) ---

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

export { isAuthStackRoute, isRootEntryPath, isProtectedAppRoute };
