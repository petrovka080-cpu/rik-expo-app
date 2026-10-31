import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { readMfaAssuranceForSessionToken } from "./mfaAssurance.auth.transport";

export type MfaAuthAcceptedReason =
  | "bootstrap_authenticated"
  | "auth_event_authenticated"
  | "post_auth_settle_authenticated";
export type MfaSessionCheckContext = Readonly<{
  reason: MfaAuthAcceptedReason;
  warmRole: boolean;
}>;
export type MfaSessionGateCallbacks = {
  onAllowed: (session: Session, context: MfaSessionCheckContext) => void;
  onRequired: (session: Session) => void;
  onUnavailable?: () => void;
};
export type MfaSessionCheckStatus = "idle" | "checking" | "unavailable";

/** The existing lifecycle remains the only auth subscriber. Checks are deferred
 * outside its synchronous callback, and old sessions cannot settle a newer one. */
export function useMfaSessionAssuranceGate(callbacks: MfaSessionGateCallbacks) {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;
  const active = useRef(true);
  const epoch = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ epoch: number; resolve: (allowed: boolean) => void } | null>(null);
  const [status, setStatus] = useState<MfaSessionCheckStatus>("idle");

  const cancel = useCallback(() => {
    epoch.current += 1;
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    pending.current?.resolve(false);
    pending.current = null;
    if (active.current) setStatus("idle");
  }, []);

  const markUnavailable = useCallback(() => {
    cancel();
    if (active.current) setStatus("unavailable");
  }, [cancel]);
  const beginSessionRead = useCallback(() => {
    cancel();
    if (active.current) setStatus("checking");
  }, [cancel]);

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; cancel(); };
  }, [cancel]);

  const checkSession = useCallback((session: Session, context: MfaSessionCheckContext): Promise<boolean> => {
    if (!active.current) return Promise.resolve(false);
    const currentEpoch = ++epoch.current;
    if (timer.current !== null) clearTimeout(timer.current);
    pending.current?.resolve(false);
    const snapshot: Session = {
      ...session,
      user: {
        ...session.user,
        app_metadata: { ...session.user.app_metadata },
        user_metadata: { ...session.user.user_metadata },
      },
    };
    const checkContext = { ...context };
    setStatus("checking");
    return new Promise<boolean>((resolve) => {
      pending.current = { epoch: currentEpoch, resolve };
      const isCurrent = () => active.current && epoch.current === currentEpoch;
      const settle = (allowed: boolean, nextStatus: MfaSessionCheckStatus) => {
        if (isCurrent()) {
          if (pending.current?.epoch === currentEpoch) pending.current = null;
          setStatus(nextStatus);
          resolve(allowed);
        } else resolve(false);
      };
      timer.current = setTimeout(() => {
        timer.current = null;
        void (async () => {
          try {
            const decision = await readMfaAssuranceForSessionToken(snapshot.access_token);
            if (!isCurrent()) { resolve(false); return; }
            if (decision.status === "challenge_required") {
              callbacksRef.current.onRequired(snapshot);
              settle(false, "idle");
            } else {
              callbacksRef.current.onAllowed(snapshot, checkContext);
              // A callback may start the next session check synchronously.
              settle(true, "idle");
            }
          } catch {
            if (!isCurrent()) { resolve(false); return; }
            try { callbacksRef.current.onUnavailable?.(); } catch { /* Keep the gate closed if reporting fails. */ }
            settle(false, "unavailable");
          }
        })();
      }, 0);
    });
  }, []);

  return { status, checkSession, cancel, markUnavailable, beginSessionRead };
}
