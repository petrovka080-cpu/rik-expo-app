/**
 * useAuthGuard вЂ” route-coupled auth redirect decision hook.
 *
 * AUTH-LIFECYCLE: Extracted from app/_layout.tsx. This hook IS route-coupled
 * (depends on segments/pathname) but receives auth state from useAuthLifecycle
 * instead of owning it. Handles:
 *  - Auth в†’ app redirect (session present in auth stack)
 *  - App в†’ auth redirect (confirmed no session)
 *  - Post-auth exit session settle window
 *  - Queue worker start/stop
 *  - First usable UI marker
 *  - Auth exit tracking
 */

import { useCallback, useEffect, useRef } from "react";
import { router } from "expo-router";

import { getSessionSafe } from "../supabaseClient";
import {
  ensureQueueWorker,
  stopQueueWorker,
} from "../../workers/queueBootstrap";
import { recordPlatformObservability } from "../observability/platformObservability";
import { POST_AUTH_ENTRY_ROUTE } from "../authRouting";
import {
  resolveRouteFromAuth,
  type AuthRouteDecision,
  isProtectedAppRoute,
  type AuthLifecycleState,
} from "./useAuthLifecycle";

const AUTH_EXIT_SESSION_SETTLE_WINDOW_MS = 2500;

function isTimeoutLikeAuthError(error: unknown) {
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
    authSessionState,
    sessionLoaded,
    setAuthSessionState,
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
  const lastRouteDecisionKeyRef = useRef<string | null>(null);

  const performRouteTransition = useCallback(
    (args: {
      decision: Extract<
        AuthRouteDecision,
        { type: "redirect_login" | "redirect_post_auth_entry" }
      >;
    }): "replace" | "navigate_fallback" | "failed" => {
      try {
        router.replace(args.decision.target);
        return "replace";
      } catch (replaceError) {
        recordPlatformObservability({
          screen: "request",
          surface: "auth_session_gate",
          category: "ui",
          event: "auth_navigation_failed",
          result: "error",
          errorStage: "router_replace",
          errorClass:
            replaceError instanceof Error ? replaceError.name : undefined,
          errorMessage:
            replaceError instanceof Error
              ? replaceError.message
              : String(replaceError ?? "router_replace_failed"),
          fallbackUsed: true,
          extra: {
            owner: "root_layout",
            pathname,
            target: args.decision.target,
            decision: args.decision.type,
            reason: args.decision.reason,
          },
        });
        if (__DEV__) {
          console.warn(
            "[RootLayout] auth route transition replace failed:",
            replaceError instanceof Error ? replaceError.message : replaceError,
          );
        }

        try {
          router.navigate(args.decision.target);
          recordAuthGateEvent("auth_navigation_fallback_used", "success", {
            target: args.decision.target,
            reason: args.decision.reason,
            method: "router_navigate",
          });
          return "navigate_fallback";
        } catch (navigateError) {
          recordPlatformObservability({
            screen: "request",
            surface: "auth_session_gate",
            category: "ui",
            event: "auth_navigation_failed",
            result: "error",
            errorStage: "router_navigate_fallback",
            errorClass:
              navigateError instanceof Error ? navigateError.name : undefined,
            errorMessage:
              navigateError instanceof Error
                ? navigateError.message
                : String(navigateError ?? "router_navigate_failed"),
            extra: {
              owner: "root_layout",
              pathname,
              target: args.decision.target,
              decision: args.decision.type,
              reason: args.decision.reason,
              replaceErrorMessage:
                replaceError instanceof Error
                  ? replaceError.message
                  : String(replaceError ?? "router_replace_failed"),
            },
          });
          if (__DEV__) {
            console.warn(
              "[RootLayout] auth route transition fallback failed:",
              navigateError instanceof Error
                ? navigateError.message
                : navigateError,
            );
          }
          return "failed";
        }
      }
    },
    [pathname, recordAuthGateEvent],
  );

  const executeRouteDecision = useCallback(
    (
      decision: Extract<
        AuthRouteDecision,
        { type: "redirect_login" | "redirect_post_auth_entry" }
      >,
      extra?: Record<string, unknown>,
    ) => {
      const decisionKey = `${decision.type}:${decision.target}:${decision.reason}:${pathname}`;
      if (lastRouteDecisionKeyRef.current === decisionKey) {
        recordAuthGateEvent("auth_route_decision_deduped", "skipped", {
          decision: decision.type,
          target: decision.target,
          reason: decision.reason,
        });
        return;
      }

      const transitionMethod = performRouteTransition({ decision });
      if (transitionMethod === "failed") return;

      lastRouteDecisionKeyRef.current = decisionKey;

      if (decision.type === "redirect_login") {
        recordAuthRedirectTriggered(decision.reason, {
          ...(extra ?? {}),
          target: decision.target,
          method: transitionMethod,
        });
        return;
      }

      recordPlatformObservability({
        screen: "request",
        surface: "startup_bootstrap",
        category: "ui",
        event: "route_resolution_result",
        result: "success",
        extra: {
          owner: "root_layout",
          target: decision.target,
          reason: decision.reason,
          method: transitionMethod,
          ...(extra ?? {}),
        },
      });
    },
    [
      pathname,
      performRouteTransition,
      recordAuthGateEvent,
      recordAuthRedirectTriggered,
    ],
  );

  // --- Track auth stack exit for session settle window ---
  useEffect(() => {
    const inAuthStack = segments?.[0] === "auth";
    const wasInAuthStack = previousInAuthStackRef.current;

    if (wasInAuthStack && !inAuthStack) {
      authExitAtRef.current = Date.now();
      authExitSessionProbeInFlightRef.current = false;
      authExitSessionProbeTokenRef.current += 1;
      lastRouteDecisionKeyRef.current = null;
      recordAuthGateEvent("post_auth_route_decision", "skipped", {
        reason: "auth_stack_exit_session_settle_pending",
        target: POST_AUTH_ENTRY_ROUTE,
      });
    } else if (inAuthStack) {
      authExitAtRef.current = null;
      authExitSessionProbeInFlightRef.current = false;
      lastRouteDecisionKeyRef.current = null;
    }

    previousInAuthStackRef.current = inAuthStack;
  }, [
    recordAuthGateEvent,
    segments,
    authExitAtRef,
    authExitSessionProbeInFlightRef,
    authExitSessionProbeTokenRef,
  ]);

  // --- Main auth guard / redirect logic ---
  useEffect(() => {
    if (!sessionLoaded) return;

    const inAuthStack = segments?.[0] === "auth";
    const authExitAgeMs =
      authExitAtRef.current == null ? null : Date.now() - authExitAtRef.current;
    const decision = resolveRouteFromAuth({
      sessionLoaded,
      sessionState: authSessionState,
      inAuthStack,
      isPdfViewerRoute: isPdfViewerRouteRef.current,
      hasRecentAuthExit:
        authSessionState.status === "unauthenticated" &&
        authExitAgeMs != null &&
        authExitAgeMs <= AUTH_EXIT_SESSION_SETTLE_WINDOW_MS,
    });

    if (decision.type === "wait_for_post_auth_settle") {
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

            recordAuthCheckEvent("auth_check_result", "success", {
              caller: "root_layout_post_auth_exit",
              degraded: result.degraded,
              hasSession: Boolean(result.session),
              settleDelayMs: AUTH_EXIT_SESSION_SETTLE_WINDOW_MS,
            });

            if (result.degraded) {
              recordAuthCheckEvent("auth_check_timeout", "skipped", {
                caller: "root_layout_post_auth_exit",
                degraded: true,
                reason: "degraded_session_read",
                settleDelayMs: AUTH_EXIT_SESSION_SETTLE_WINDOW_MS,
              });
            }

            authExitSessionProbeInFlightRef.current = false;
            authExitAtRef.current = null;

            if (result.session) {
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
              lastRouteDecisionKeyRef.current = null;
              setAuthSessionState({
                status: "authenticated",
                reason: "post_auth_settle_authenticated",
              });
              return;
            }

            if (result.degraded) {
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
              lastRouteDecisionKeyRef.current = null;
              setAuthSessionState({
                status: "unknown",
                reason: "post_auth_settle_degraded",
              });
              return;
            }

            const settledNoSessionDecision: Extract<
              AuthRouteDecision,
              { type: "redirect_login" }
            > = {
              type: "redirect_login",
              target: "/auth/login",
              reason: "post_auth_session_absent_after_settle",
            };
            setAuthSessionState({
              status: "unauthenticated",
              reason: "post_auth_session_absent_after_settle",
            });
            executeRouteDecision(settledNoSessionDecision, {
              settleDelayMs: AUTH_EXIT_SESSION_SETTLE_WINDOW_MS,
            });
          } catch (error) {
            if (probeToken !== authExitSessionProbeTokenRef.current) return;

            const timeoutLike = isTimeoutLikeAuthError(error);
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
                errorClass: error instanceof Error ? error.name : undefined,
                errorMessage:
                  error instanceof Error
                    ? error.message
                    : String(error ?? "post_auth_session_read_failed"),
              },
            );
            recordPlatformObservability({
              screen: "request",
              surface: "auth_session_gate",
              category: "fetch",
              event: "auth_gate_session_settle_result",
              result: "error",
              errorStage: "post_auth_session_read",
              errorClass: error instanceof Error ? error.name : undefined,
              errorMessage:
                error instanceof Error
                  ? error.message
                  : String(error ?? "post_auth_session_read_failed"),
              fallbackUsed: true,
              extra: {
                owner: "root_layout",
                reason: "post_auth_session_read_failed",
              },
            });
            lastRouteDecisionKeyRef.current = null;
            setAuthSessionState({
              status: "unknown",
              reason: "post_auth_settle_error",
            });
          }
        })();
      }

      recordAuthGateEvent("auth_gate_login_redirect_suppressed", "skipped", {
        target: "/auth/login",
        reason: "post_auth_session_settle_inflight",
      });
      return;
    }

    if (decision.type === "redirect_login") {
      executeRouteDecision(decision, {
        hasSession: false,
      });
      return;
    }

    if (decision.type === "redirect_post_auth_entry") {
      resetPendingAuthExitSessionProbe();
      executeRouteDecision(decision, {
        hasSession: true,
      });
      return;
    }

    if (
      decision.reason === "session_unknown_on_route" &&
      !inAuthStack &&
      !isPdfViewerRouteRef.current &&
      isProtectedAppRoute(pathname, segments)
    ) {
      recordAuthRedirectBlocked("protected_app_route_session_unknown", {
        source: "auth_route_resolver",
        authSessionReason: authSessionState.reason,
      });
    }
    lastRouteDecisionKeyRef.current = null;
  }, [
    authSessionState,
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
    executeRouteDecision,
    setAuthSessionState,
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
        hasSession: authSessionState.status === "authenticated",
        pathname,
      },
    });
  }, [authSessionState.status, pathname, sessionLoaded]);

  // --- Queue worker lifecycle ---
  useEffect(() => {
    if (!sessionLoaded) return;

    if (authSessionState.status === "authenticated") {
      ensureQueueWorker();
      return;
    }

    if (authSessionState.status === "unauthenticated") {
      stopQueueWorker();
    }
  }, [authSessionState.status, sessionLoaded]);
}
