import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { router, type Href } from "expo-router";
import { getDocumentSession } from "../documents/pdfDocumentSessions";
import { clearPendingAndroidPdfReturn, readPendingAndroidPdfReturn } from "./androidPdfHandoff";
import { parseAndroidPdfReturnCheckpoint, recoverAndroidPdfCaller } from "./androidPdfReturnRecovery";
import { recordPlatformObservability } from "../observability/platformObservability";
import { getMountedAndroidPdfCaller, subscribeMountedAndroidPdfCaller } from "./androidPdfCallerReadiness";

/** Only an authenticated, ready root can consume a native return checkpoint.
 * Reading an exact draft uses the existing bounded durable hydration path. */
export function useAndroidPdfReturnRecovery(args: {
  ready: boolean; ownerUserId: string | null; terminalSignOut: boolean;
  pathname: string; draftId: string | null;
}) {
  const current = useRef(args);
  current.current = args;
  const awaiting = useRef<{ nonce: string; ownerUserId: string; href: string; epoch: number } | null>(null);
  const epoch = useRef(0);
  const authIdentity = `${args.ready}:${args.ownerUserId}:${args.terminalSignOut}`;
  const lastAuthIdentity = useRef(authIdentity);
  if (lastAuthIdentity.current !== authIdentity) {
    lastAuthIdentity.current = authIdentity;
    epoch.current += 1;
    awaiting.current = null;
  }
  useEffect(() => {
    const acknowledge = () => {
      const pending = awaiting.current;
      const actual = current.current;
      const caller = getMountedAndroidPdfCaller();
      if (!pending || !actual.ready || pending.ownerUserId !== actual.ownerUserId
        || pending.epoch !== epoch.current || caller?.ownerUserId !== actual.ownerUserId) return;
      const observed = actual.pathname === "/request" && caller.draftId === actual.draftId
        ? actual.draftId ? `/request?draftId=${actual.draftId}` : "/request" : null;
      if (observed !== pending.href) return;
      void clearPendingAndroidPdfReturn(pending.nonce).then(cleared => {
        if (cleared && awaiting.current === pending) awaiting.current = null;
      }).catch(() => undefined);
    };
    const unsubscribe = subscribeMountedAndroidPdfCaller(acknowledge);
    acknowledge();
    return unsubscribe;
  });
  useEffect(() => {
    if (Platform.OS !== "android") return;
    if (args.terminalSignOut) {
      let active = true;
      const startedEpoch = epoch.current;
      void readPendingAndroidPdfReturn().then(raw => {
        if (!active || epoch.current !== startedEpoch || !current.current.terminalSignOut) return;
        const checkpoint = parseAndroidPdfReturnCheckpoint(raw, Date.now());
        if (checkpoint) return clearPendingAndroidPdfReturn(checkpoint.nonce);
      }).catch(() => undefined);
      return () => { active = false; };
    }
    if (!args.ready || !args.ownerUserId) return;
    let active = true;
    let inFlight = false;
    const ownerUserId = args.ownerUserId;
    const startedEpoch = epoch.current;
    const isCurrent = () => active && current.current.ready && current.current.ownerUserId === ownerUserId
      && epoch.current === startedEpoch;
    const drain = async () => {
      if (inFlight || !isCurrent()) return;
      inFlight = true;
      try {
        const location = `${current.current.pathname}:${current.current.draftId ?? ""}`;
        const isCurrentLocation = () => isCurrent()
          && location === `${current.current.pathname}:${current.current.draftId ?? ""}`;
        const raw = await readPendingAndroidPdfReturn();
        if (!raw || !isCurrentLocation()) return;
        const checkpoint = parseAndroidPdfReturnCheckpoint(raw, Date.now());
        if (!checkpoint) return; // Native also expires malformed/stale metadata.
        await recoverAndroidPdfCaller({
          checkpoint, ownerUserId, isCurrent: isCurrentLocation,
          hasLiveSession: id => Boolean(getDocumentSession(id)),
          isPending: async nonce => {
            const latest = parseAndroidPdfReturnCheckpoint(await readPendingAndroidPdfReturn(), Date.now());
            return isCurrentLocation() && latest?.nonce === nonce && latest.phase === "returned";
          },
          readExactDraft: async id => {
            // Metro's lazy require keeps the large archive repository out of
            // ordinary startup execution; only an exact cold caller loads it.
            const repository = require("../consumerRequests/consumerRequestRepository") as
              typeof import("../consumerRequests/consumerRequestRepository");
            if (!isCurrent()) return null;
            await repository.hydrateTransactionalConsumerRepairRequestStore(id, { retryUnrecoveredExact: true });
            if (!isCurrentLocation()) return null;
            const draft = repository.findConsumerRepairBundle(id)?.draft;
            // Compatibility hydration swallows read errors; null cannot prove
            // deletion or absence, so keep the marker for a foreground retry.
            if (!draft) throw new Error("ANDROID_PDF_CALLER_DRAFT_RECOVERY_UNAVAILABLE");
            return draft;
          },
          navigate: href => {
            const pending = { nonce: checkpoint.nonce, ownerUserId, href, epoch: startedEpoch };
            awaiting.current = pending;
            try { router.replace(href as Href); } catch (error) {
              if (awaiting.current === pending) awaiting.current = null;
              throw error;
            }
          },
          consume: clearPendingAndroidPdfReturn,
        });
      } catch (error) {
        // A temporary hydration/navigation failure must keep the durable marker
        // for a subsequent foreground retry, without a second external Intent.
        recordPlatformObservability({ screen: "startup", surface: "pdf_return", category: "ui",
          event: "android_pdf_caller_recovery_failed", result: "error",
          errorStage: "restore_caller", errorClass: error instanceof Error ? error.name : "Unknown",
          fallbackUsed: false });
      } finally { inFlight = false; }
    };
    const subscription = AppState.addEventListener("change", state => { if (state === "active") void drain(); });
    void drain();
    return () => { active = false; subscription.remove(); };
  }, [args.ready, args.ownerUserId, args.terminalSignOut]);
}
