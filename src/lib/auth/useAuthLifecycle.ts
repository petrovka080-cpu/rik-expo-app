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

import { getSessionSafe, supabase } from "../supabaseClient";
import { warmCurrentSessionProfile } from "../sessionRole";
import { recordPlatformObservability } from "../observability/platformObservability";
import { resetSessionBoundary } from "../session/sessionBoundary";
import {
  POST_AUTH_ENTRY_ROUTE,
  type PostAuthEntryPath,
} from "../authRouting";

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
  authSessionState: AuthSessionState;
  authSessionStateRef: React.MutableRefObject<AuthSessionState>;
  setAuthSessionState: (next: AuthSessionState) => void;
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

export type AuthSessionState =
  | {
      status: "unknown";
      reason:
        | "bootstrap_pending"
        | "bootstrap_protected_route_unknown"
        | "bootstrap_degraded"
        | "bootstrap_error"
        | "non_terminal_auth_event"
        | "post_auth_settle_degraded"
        | "post_auth_settle_error";
    }
  | {
      status: "authenticated";
      reason:
        | "bootstrap_authenticated"
        | "auth_event_authenticated"
        | "post_auth_settle_authenticated";
    }
  | {
      status: "unauthenticated";
      reason:
        | "bootstrap_no_session"
        | "terminal_sign_out"
        | "post_auth_session_absent_after_settle";
    };

export type AuthRouteDecision =
  | {
      type: "none";
      reason:
        | "session_not_loaded"
        | "session_present_on_app_route"
        | "session_unknown_on_route"
        | "session_absent_in_auth_stack"
        | "session_absent_on_pdf_viewer";
    }
  | {
      type: "wait_for_post_auth_settle";
      reason: "recent_auth_stack_exit";
    }
  | {
      type: "redirect_login";
      target: "/auth/login";
      reason: AuthSessionState["reason"];
    }
  | {
      type: "redirect_post_auth_entry";
      target: PostAuthEntryPath;
      reason: AuthSessionState["reason"];
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
  const [authSessionState, setAuthSessionStateState] = useState<AuthSessionState>({
    status: "unknown",
    reason: "bootstrap_pending",
  });

  const initStartedRef = useRef(false);
  const launchMarkerRef = useRef(false);
  const hasSessionRef = useRef<boolean | null>(null);
  hasSessionRef.current = hasSession;
  const authSessionStateRef = useRef<AuthSessionState>(authSessionState);
  authSessionStateRef.current = authSessionState;
  const pathnameRef = useRef(deps.pathname);
  pathnameRef.current = deps.pathname;
  const isPdfViewerRouteRef = useRef(deps.isPdfViewerRoute);
  isPdfViewerRouteRef.current = deps.isPdfViewerRoute;
  const previousInAuthStackRef = useRef(deps.segments?.[0] === "auth");
  const authExitAtRef = useRef<number | null>(null);
  const authExitSessionProbeTokenRef = useRef(0);
  const authExitSessionProbeInFlightRef = useRef(false);

  const setAuthSessionState = useCallback((next: AuthSessionState) => {
    authSessionStateRef.current = next;
    const nextHasSession =
      next.status === "authenticated"
        ? true
        : next.status === "unauthenticated"
          ? false
          : null;
    hasSessionRef.current = nextHasSession;
    setAuthSessionStateState(next);
    setHasSession(nextHasSession);
  }, []);

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
          setAuthSessionState({
            status: "unknown",
            reason: "bootstrap_degraded",
          });
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
          setAuthSessionState({
            status: "unknown",
            reason: "bootstrap_protected_route_unknown",
          });
          setSessionLoaded(true);
          return;
        }

        setAuthSessionState(
          has
            ? {
                status: "authenticated",
                reason: "bootstrap_authenticated",
              }
            : {
                status: "unauthenticated",
                reason: "bootstrap_no_session",
              },
        );
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
        setAuthSessionState({
          status: "unknown",
          reason: "bootstrap_error",
        });

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
            setAuthSessionState({
              status: "unknown",
              reason: "non_terminal_auth_event",
            });
            return;
          }

          resetPendingAuthExitSessionProbe();
          setAuthSessionState({
            status: "unauthenticated",
            reason: "terminal_sign_out",
          });
          await clearSessionBoundaryState("terminal_sign_out");
          return;
        }

        resetPendingAuthExitSessionProbe();
        setAuthSessionState({
          status: "authenticated",
          reason: "auth_event_authenticated",
        });
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
    setAuthSessionState,
    // NAV-P0: NO route deps here. The init effect MUST have stable deps only.
    // Adding segments/pathname would cause re-subscribe on every navigation,
    // killing the auth listener → stale hasSession → SIGABRT on back nav.
  ]);

  return {
    authSessionState,
    authSessionStateRef,
    setAuthSessionState,
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

function resolveRouteFromAuth(params: {
  sessionLoaded: boolean;
  sessionState: AuthSessionState;
  inAuthStack: boolean;
  isPdfViewerRoute: boolean;
  hasRecentAuthExit: boolean;
}): AuthRouteDecision {
  if (!params.sessionLoaded) {
    return {
      type: "none",
      reason: "session_not_loaded",
    };
  }

  if (params.sessionState.status === "authenticated") {
    if (params.inAuthStack) {
      return {
        type: "redirect_post_auth_entry",
        target: POST_AUTH_ENTRY_ROUTE,
        reason: params.sessionState.reason,
      };
    }

    return {
      type: "none",
      reason: "session_present_on_app_route",
    };
  }

  if (params.sessionState.status === "unknown") {
    return {
      type: "none",
      reason: "session_unknown_on_route",
    };
  }

  if (params.inAuthStack) {
    return {
      type: "none",
      reason: "session_absent_in_auth_stack",
    };
  }

  if (params.isPdfViewerRoute) {
    return {
      type: "none",
      reason: "session_absent_on_pdf_viewer",
    };
  }

  if (params.hasRecentAuthExit) {
    return {
      type: "wait_for_post_auth_settle",
      reason: "recent_auth_stack_exit",
    };
  }

  return {
    type: "redirect_login",
    target: "/auth/login",
    reason: params.sessionState.reason,
  };
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

export {
  resolveRouteFromAuth,
  isAuthStackRoute,
  isRootEntryPath,
  isProtectedAppRoute,
};
