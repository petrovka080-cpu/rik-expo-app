/**
 * useAuthGuard — route-coupled auth redirect decision hook.
 *
 * AUTH-LIFECYCLE: Extracted from app/_layout.tsx. This hook IS route-coupled
 * (depends on segments/pathname) but receives auth state from useAuthLifecycle
 * instead of owning it. Handles:
 *  - Auth → app redirect (session present in auth stack)
 *  - App → auth redirect (confirmed no session)
 *  - Post-auth exit session settle window
 *  - Queue worker start/stop
 *  - First usable UI marker
 *  - Auth exit tracking
 */

import { useEffect, useRef } from "react";
import { router } from "expo-router";

import { getSessionSafe } from "../supabaseClient";
import {
  ensureQueueWorker,
  stopQueueWorker,
} from "../../workers/queueBootstrap";
import { recordPlatformObservability } from "../observability/platformObservability";
import { POST_AUTH_ENTRY_ROUTE } from "../authRouting";
import {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isAuthStackRoute,
  isProtectedAppRoute,
  type AuthLifecycleState,
} from "./useAuthLifecycle";

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

export function useAuthGuard(
  auth: AuthLifecycleState & {
    segments: readonly string[];
    pathname: string;
  },
) {
  const {
    hasSession,
    sessionLoaded,
    setHasSession,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    hasSessionRef,
    isPdfViewerRouteRef,
    resetPendingAuthExitSessionProbe,
    recordAuthCheckEvent,
    recordAuthGateEvent,
    recordAuthRedirectBlocked,
    recordAuthRedirectTriggered,
    authExitAtRef,
    authExitSessionProbeTokenRef,
    authExitSessionProbeInFlightRef,
    segments,
    pathname,
  } = auth;

  const previousInAuthStackRef = useRef(segments?.[0] === "auth");
  const usableUiMarkerRef = useRef(false);

  // --- Track auth stack exit for session settle window ---
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
  }, [recordAuthGateEvent, segments, authExitAtRef, authExitSessionProbeInFlightRef, authExitSessionProbeTokenRef]);

  // --- Main auth guard / redirect logic ---
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO(P1): review deps
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
    isPdfViewerRouteRef,
    authExitAtRef,
    authExitSessionProbeTokenRef,
    authExitSessionProbeInFlightRef,
  ]);

  // --- First usable UI marker ---
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

  // --- Queue worker lifecycle ---
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
}
