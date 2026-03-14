import { useCallback, useEffect } from "react";
import { Platform } from "react-native";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProposalHeadLite, ProposalViewLine } from "../buyer.types";
import { openProposalViewAction } from "../buyer.actions";

const warnBuyerProposalDetails = (...args: unknown[]) => {
  if (__DEV__) {
    console.warn(...args);
  }
};

export function useBuyerProposalDetailsFlow(params: {
  supabase: SupabaseClient;
  isPropDetailsOpen: boolean;
  preloadProposalNosByIds: (ids: string[]) => Promise<void> | void;
  loadProposalAttachments: (proposalId: string) => Promise<void>;
  openPropDetailsSheet: (proposalId: string) => void;
  setPropViewId: (v: string | null) => void;
  setPropViewHead: (v: ProposalHeadLite | null) => void;
  setPropViewLines: (v: ProposalViewLine[]) => void;
  setPropViewBusy: (v: boolean) => void;
}) {
  const {
    supabase,
    isPropDetailsOpen,
    preloadProposalNosByIds,
    loadProposalAttachments,
    openPropDetailsSheet,
    setPropViewId,
    setPropViewHead,
    setPropViewLines,
    setPropViewBusy,
  } = params;

  const openProposalView = useCallback(
    async (pidStr: string, head: ProposalHeadLite) => {
      const pid = String(pidStr || "").trim();
      if (pid) {
        await preloadProposalNosByIds([pid]);
      }

      await openProposalViewAction({
        pidStr: String(pidStr),
        head,
        supabase,
        openPropDetailsSheet,
        setPropViewId,
        setPropViewHead,
        setPropViewLines,
        setPropViewBusy,
        log: warnBuyerProposalDetails,
      });
    },
    [
      preloadProposalNosByIds,
      supabase,
      openPropDetailsSheet,
      setPropViewId,
      setPropViewHead,
      setPropViewLines,
      setPropViewBusy,
    ]
  );

  const openProposalDetails = useCallback(
    async (pidStr: string, head: ProposalHeadLite) => {
      await loadProposalAttachments(String(pidStr));
      await openProposalView(pidStr, head);
    },
    [loadProposalAttachments, openProposalView]
  );

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!isPropDetailsOpen) return;
    const raf = requestAnimationFrame(() => {
      try {
        const el = document.getElementById("propAttachmentsAnchor");
        el?.scrollIntoView?.({ behavior: "smooth", block: "start" });
      } catch {
        // no-op
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [isPropDetailsOpen]);

  return {
    openProposalDetailsLines: openProposalDetails,
    openProposalDetailsAttachments: openProposalDetails,
  };
}
