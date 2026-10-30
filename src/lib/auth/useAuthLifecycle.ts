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
import type { Session, User } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import { useMfaSessionAssuranceGate, type MfaAuthAcceptedReason, type MfaSessionCheckStatus } from "./useMfaSessionAssuranceGate";

import { getSessionSafe, hasPersistedAuthSessionHint } from "../supabaseClient";
import { warmCurrentSessionProfile } from "../sessionRole";
import { recordPlatformObservability } from "../observability/platformObservability";
import { resetSessionBoundary, observeSessionBoundaryPrincipal } from "../session/sessionBoundary";
import {
  POST_AUTH_ENTRY_ROUTE,
  type PostAuthEntryPath,
} from "../authRouting";
import { isPublicRequestRoutePathname } from "../navigation/coreRoutes";
import {
  hasAuthLifecycleClient,
  subscribeAuthLifecycleStateChange,
} from "./useAuthLifecycle.auth.transport";

function isTimeoutLikeAuthError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("timed out") ||
    message.includes("aborted") ||
    message.includes("AbortError") ||
    message.includes("network request failed")
  );
}

export function authPrincipalFingerprint(session: Session | null): string | null {
  if (!session?.user?.id) return null;
  const metadata = session.user.app_metadata ?? {};
  return JSON.stringify([
    session.user.id,
    String(metadata.role ?? "").trim().toLowerCase(),
    String(
      metadata.tenant_id ??
        metadata.organization_id ??
        metadata.company_id ??
        "",
    ),
    String(metadata.membership_id ?? ""),
    String(metadata.capability_id ?? ""),
  ]);
}

export type AuthLifecycleState = {
  assuranceStatus: MfaSessionCheckStatus;
  acceptSessionAfterAssurance: (session: Session, reason: MfaAuthAcceptedReason) => Promise<boolean>;
  retryAuthAssurance: () => Promise<boolean>;
  authSessionState: AuthSessionState;
  authenticatedUserId: string | null;
  authenticatedRole: string | null;
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
  | { status: "mfa_required"; reason: "mfa_verification_required" }
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
      type: "redirect_mfa";
      target: "/auth/mfa";
      reason: "mfa_verification_required";
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
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(
    null,
  );
  const [authenticatedRole, setAuthenticatedRole] = useState<string | null>(null);

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
  const authPrincipalFingerprintRef = useRef<string | null>(null);
  const sessionBoundaryActorRef = useRef<string | null>(null);
  const authEventGenerationRef = useRef(0);
  const sessionReadEpochRef = useRef(0);

  const setAuthSessionState = useCallback((next: AuthSessionState) => {
    if (
      authSessionStateRef.current.status === next.status &&
      authSessionStateRef.current.reason === next.reason
    ) {
      return;
    }
    authSessionStateRef.current = next;
    const nextHasSession =
      (next.status === "authenticated" || next.status === "mfa_required")
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
    (reason: string) => {
      sessionBoundaryActorRef.current = null;
      authPrincipalFingerprintRef.current = null;
      observeSessionBoundaryPrincipal(null);
      setAuthenticatedUserId(null);
      setAuthenticatedRole(null);
      return resetSessionBoundary(reason);
    },
    [],
  );

  // --- Role profile warming (background, non-blocking) ---
  const loadRoleForCurrentSession = useCallback(async (user?: User | null) => {
    setAuthenticatedUserId(user?.id ?? null);
    const providerRole = String(user?.app_metadata?.role ?? "").trim().toLowerCase();
    setAuthenticatedRole(providerRole || null);
    if (!hasAuthLifecycleClient()) return;
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

  const { status: assuranceStatus, checkSession, cancel: cancelAssurance, markUnavailable, beginSessionRead } = useMfaSessionAssuranceGate({
    onAllowed: (session, context) => {
      // Principal observation/reset precedes the asynchronous assurance check.
      // A result may never silently install a different actor at settlement.
      if (sessionBoundaryActorRef.current !== session.user.id) return;
      observeSessionBoundaryPrincipal(session.user.id);
      setAuthenticatedUserId(session.user.id);
      setAuthSessionState({ status: "authenticated", reason: context.reason });
      if (context.warmRole) void loadRoleForCurrentSession(session.user);
    },
    onRequired: (session) => {
      if (sessionBoundaryActorRef.current !== session.user.id) return;
      setAuthenticatedUserId(session.user.id);
      setAuthenticatedRole(null);
      setAuthSessionState({ status: "mfa_required", reason: "mfa_verification_required" });
    },
    onUnavailable: () => recordAuthGateEvent("auth_assurance_unavailable", "error"),
  });

  const acceptSessionAfterAssurance = useCallback((session: Session, reason: MfaAuthAcceptedReason, warmRole = true) => {
    if (sessionBoundaryActorRef.current && sessionBoundaryActorRef.current !== session.user.id) {
      // resetSessionBoundary advances the generation and clears delivered
      // sessions synchronously, before its first cache-purge await.
      void resetSessionBoundary("principal_replaced");
      setAuthenticatedUserId(null);
      setAuthenticatedRole(null);
    }
    if (sessionBoundaryActorRef.current !== session.user.id) {
      authEventGenerationRef.current += 1;
      sessionReadEpochRef.current += 1;
    }
    sessionBoundaryActorRef.current = session.user.id;
    observeSessionBoundaryPrincipal(session.user.id);
    resetPendingAuthExitSessionProbe();
    authPrincipalFingerprintRef.current = authPrincipalFingerprint(session);
    return checkSession(session, { reason, warmRole });
  }, [checkSession, resetPendingAuthExitSessionProbe]);

  const retryAuthAssurance = useCallback(async () => {
    const generation = authEventGenerationRef.current;
    const readEpoch = ++sessionReadEpochRef.current;
    const isCurrentRead = () => generation === authEventGenerationRef.current && readEpoch === sessionReadEpochRef.current;
    beginSessionRead();
    try {
      const result = await getSessionSafe({ caller: "root_layout_assurance_retry" });
      if (!isCurrentRead()) return false;
      setSessionLoaded(true);
      if (result.degraded) { markUnavailable(); return false; }
      if (result.session) return acceptSessionAfterAssurance(result.session, "auth_event_authenticated");
      cancelAssurance();
      authPrincipalFingerprintRef.current = null;
      setAuthSessionState({ status: "unauthenticated", reason: "bootstrap_no_session" });
      await clearSessionBoundaryState("bootstrap_no_session");
    } catch {
      if (isCurrentRead()) markUnavailable();
    }
    return false;
  }, [acceptSessionAfterAssurance, beginSessionRead, cancelAssurance, clearSessionBoundaryState, markUnavailable, setAuthSessionState]);

  // Resume uses the same gate and subscriber. A focus transfer to/from an iframe
  // can blur the window while the document still has focus; that is not an app
  // return. Only that observed internal pair, or duplicate signals for one
  // in-flight return, are coalesced. Unknown/unpaired focus still checks MFA.
  useEffect(() => {
    const web = Platform.OS === "web";
    const documentActivity = () => {
      let visible: boolean | null = null;
      let focusWithin: boolean | null = null;
      if (typeof document !== "undefined") {
        try {
          const visibility = document.visibilityState;
          visible = visibility === "visible" ? true : visibility === "hidden" ? false : null;
        } catch { /* Missing browser facts must not authorize a focus skip. */ }
        try {
          const focused = document.hasFocus();
          focusWithin = typeof focused === "boolean" ? focused : null;
        } catch { /* Recheck on an ambiguous activation. */ }
      }
      return { visible, focusWithin };
    };
    const isDocumentActive = (activity: ReturnType<typeof documentActivity>) =>
      activity.visible === true && activity.focusWithin === true;
    let returnPending = web ? !isDocumentActive(documentActivity()) : AppState.currentState !== "active";
    let activationHandled = false;
    let internalFocusPending = false;
    let coalescedFocusPending = false;
    let activationEpoch = 0;
    const depart = () => {
      activationEpoch += 1;
      returnPending = true;
      activationHandled = false;
      internalFocusPending = false;
      coalescedFocusPending = false;
    };
    const resume = () => authPrincipalFingerprintRef.current !== null ? retryAuthAssurance() : undefined;
    const activateDocument = (source: "focus" | "visibility" | "app_state") => {
      const activity = documentActivity();
      if (activity.visible === false || (source !== "focus" && activity.focusWithin === false)) {
        depart();
        return;
      }
      const active = isDocumentActive(activity);
      if (source === "focus") {
        const internalOrDuplicate = active && !returnPending && (internalFocusPending || coalescedFocusPending);
        internalFocusPending = false;
        coalescedFocusPending = false;
        if (internalOrDuplicate) return;
      } else if (active && !returnPending && activationHandled) return;
      // Do not turn missing/contradictory document facts into a known activation.
      returnPending = !active;
      activationHandled = active;
      if (active && source !== "focus") coalescedFocusPending = true;
      const epoch = ++activationEpoch;
      const pending = resume();
      if (coalescedFocusPending) {
        const clearDuplicate = () => { if (activationEpoch === epoch) coalescedFocusPending = false; };
        if (pending) void pending.then(clearDuplicate, clearDuplicate);
        else clearDuplicate();
      }
    };
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") { depart(); return; }
      if (web) activateDocument("app_state");
      else if (returnPending || !activationHandled) { returnPending = false; activationHandled = true; resume(); }
    });
    const blur = () => {
      if (isDocumentActive(documentActivity()) && !returnPending) {
        internalFocusPending = true;
        coalescedFocusPending = false;
      } else depart();
    };
    const focus = () => activateDocument("focus");
    const visibility = () => activateDocument("visibility");
    if (web && typeof window !== "undefined") {
      window.addEventListener("blur", blur);
      window.addEventListener("focus", focus);
    }
    if (web && typeof document !== "undefined") document.addEventListener("visibilitychange", visibility);
    return () => {
      subscription.remove();
      if (web && typeof window !== "undefined") {
        window.removeEventListener("blur", blur);
        window.removeEventListener("focus", focus);
      }
      if (web && typeof document !== "undefined") document.removeEventListener("visibilitychange", visibility);
    };
  }, [retryAuthAssurance]);

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
    if (initStartedRef.current) return;

    if (!hasAuthLifecycleClient()) return;
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
    const bootstrapGeneration = authEventGenerationRef.current;
    const isCurrentBootstrap = () => active && bootstrapGeneration === authEventGenerationRef.current;

    (async () => {
      try {
        recordAuthCheckEvent("auth_check_start", "skipped", {
          caller: "root_layout",
        });
        const { session, degraded } = await getSessionSafe({
          caller: "root_layout",
        });
        if (!isCurrentBootstrap()) return;

        recordAuthCheckEvent("auth_check_result", "success", {
          caller: "root_layout",
          degraded,
          hasSession: Boolean(session),
        });

        if (degraded) {
          const persistedHint = await hasPersistedAuthSessionHint({
            caller: "root_layout",
            reason: "bootstrap_degraded",
          });
          if (!isCurrentBootstrap()) return;

          if (!persistedHint.hasStoredSession && !persistedHint.degraded) {
            recordAuthGateEvent("auth_degraded_without_persisted_session", "success", {
              caller: "root_layout",
              reason: "bootstrap_degraded_without_persisted_auth",
            });
            setAuthSessionState({
              status: "unauthenticated",
              reason: "bootstrap_no_session",
            });
            setSessionLoaded(true);
            await clearSessionBoundaryState("bootstrap_no_session");
            return;
          }

          recordAuthCheckEvent("auth_check_timeout", "skipped", {
            caller: "root_layout",
            degraded: true,
            reason: "degraded_session_read",
            hasPersistedAuthSessionHint: persistedHint.hasStoredSession,
            authSessionHintDegraded: persistedHint.degraded,
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
              hasPersistedAuthSessionHint: persistedHint.hasStoredSession,
              authSessionHintDegraded: persistedHint.degraded,
            },
          });
          setAuthSessionState({
            status: "unknown",
            reason: "bootstrap_degraded",
          });
          markUnavailable();
          setSessionLoaded(true);
          return;
        }

        const has = Boolean(session);
        authPrincipalFingerprintRef.current = authPrincipalFingerprint(session);
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
          const persistedHint = await hasPersistedAuthSessionHint({
            caller: "root_layout",
            reason: "bootstrap_no_session_on_protected_route",
          });
          if (!isCurrentBootstrap()) return;

          if (persistedHint.hasStoredSession || persistedHint.degraded) {
            recordAuthRedirectBlocked("protected_app_route_session_unknown", {
              caller: "root_layout",
              reason: "bootstrap_no_session_on_protected_route",
              hasPersistedAuthSessionHint: persistedHint.hasStoredSession,
              authSessionHintDegraded: persistedHint.degraded,
            });
            setAuthSessionState({
              status: "unknown",
              reason: "bootstrap_protected_route_unknown",
            });
            markUnavailable();
            setSessionLoaded(true);
            return;
          }

          recordAuthGateEvent("auth_protected_route_no_session_without_persisted_hint", "success", {
            caller: "root_layout",
            reason: "bootstrap_no_session_on_protected_route",
          });
        }

        setSessionLoaded(true);
        if (session) void acceptSessionAfterAssurance(session, "bootstrap_authenticated");
        else {
          cancelAssurance();
          setAuthSessionState({ status: "unauthenticated", reason: "bootstrap_no_session" });
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
        if (!isCurrentBootstrap()) return;

        const persistedHint = await hasPersistedAuthSessionHint({
          caller: "root_layout",
          reason: "bootstrap_error",
        });
        if (!isCurrentBootstrap()) return;

        if (!persistedHint.hasStoredSession && !persistedHint.degraded) {
          recordAuthGateEvent("auth_bootstrap_error_without_persisted_session", "success", {
            caller: "root_layout",
            reason: "bootstrap_error_without_persisted_auth",
            timeoutLike,
          });
          setAuthSessionState({
            status: "unauthenticated",
            reason: "bootstrap_no_session",
          });
          setSessionLoaded(true);
          await clearSessionBoundaryState("bootstrap_no_session");
          return;
        }

        // 🔥 НЕ считаем это logout
        setAuthSessionState({
          status: "unknown",
          reason: "bootstrap_error",
        });
        markUnavailable();

        // ❌ НЕ ЧИСТИМ состояние при timeout
        // clearDocumentSessions();
        // clearCurrentSessionRoleCache();

        setSessionLoaded(true);
      }
    })();

    const { data: listener } = subscribeAuthLifecycleStateChange(
      (event, session) => {
        if (!active) return;
        const has = Boolean(session);
        const isTerminalSignOut =
          event === "SIGNED_OUT" || String(event) === "USER_DELETED";
        if (has || isTerminalSignOut) authEventGenerationRef.current += 1;
        const nextPrincipalFingerprint = authPrincipalFingerprint(session);
        const duplicatePrincipalRefresh =
          event === "TOKEN_REFRESHED" &&
          nextPrincipalFingerprint !== null &&
          nextPrincipalFingerprint === authPrincipalFingerprintRef.current;

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

        if (duplicatePrincipalRefresh) {
          recordAuthGateEvent("auth_token_refresh_principal_state_deduplicated", "skipped", {
            authEvent: event,
            reason: "same_principal_fingerprint",
          });
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
            markUnavailable();
            return;
          }

          resetPendingAuthExitSessionProbe();
          cancelAssurance();
          authPrincipalFingerprintRef.current = null;
          setAuthSessionState({
            status: "unauthenticated",
            reason: "terminal_sign_out",
          });
          void clearSessionBoundaryState("terminal_sign_out");
          return;
        }

        if (session) void acceptSessionAfterAssurance(
          session,
          "auth_event_authenticated",
          !duplicatePrincipalRefresh || authSessionStateRef.current.status !== "authenticated",
        );
      },
    );

    return () => {
      active = false;
      initStartedRef.current = false;
      authEventGenerationRef.current += 1;
      cancelAssurance();
      listener?.subscription?.unsubscribe();
    };
  }, [
    clearSessionBoundaryState,
    acceptSessionAfterAssurance,
    cancelAssurance,
    checkSession,
    markUnavailable,
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
    assuranceStatus,
    acceptSessionAfterAssurance,
    retryAuthAssurance,
    authSessionState,
    authenticatedUserId,
    authenticatedRole,
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
  isMfaRoute?: boolean;
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

  if (params.sessionState.status === "mfa_required") {
    return params.isMfaRoute
      ? { type: "none", reason: "session_present_on_app_route" }
      : { type: "redirect_mfa", target: "/auth/mfa", reason: "mfa_verification_required" };
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

function isAuthPath(pathname: string | null | undefined) {
  const normalized = String(pathname ?? "").split("?")[0];
  return normalized === "/auth" || normalized.startsWith("/auth/");
}

function isRootEntryPath(pathname: string | null | undefined) {
  return !pathname || pathname === "/" || pathname === "/index";
}

function isPublicRequestEstimatePath(pathname: string | null | undefined) {
  return isPublicRequestRoutePathname(pathname);
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

function shouldApplyLocalDeveloperFullAccess(input: {
  isAllowed: boolean;
  pathname: string | null | undefined;
  segments: readonly string[] | undefined;
}) {
  return (
    input.isAllowed === true &&
    isProtectedAppRoute(input.pathname, input.segments) &&
    !isPublicRequestEstimatePath(input.pathname)
  );
}

export {
  resolveRouteFromAuth,
  isAuthStackRoute,
  isAuthPath,
  isRootEntryPath,
  isPublicRequestEstimatePath,
  isProtectedAppRoute,
  shouldApplyLocalDeveloperFullAccess,
};
