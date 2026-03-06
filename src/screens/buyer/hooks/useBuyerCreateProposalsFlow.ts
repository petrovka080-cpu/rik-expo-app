import { useCallback, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { handleCreateProposalsBySupplierAction } from "../buyer.actions";

type AlertFn = (title: string, message?: string) => void;
type FileLike = File | Blob | { name?: string | null; uri?: string | null; mimeType?: string | null; size?: number | null };

export function useBuyerCreateProposalsFlow(params: {
  pickedIdsRef: { current: string[] };
  metaRef: { current: Record<string, { supplier?: string; price?: number | string | null; note?: string | null }> };
  attachmentsRef: { current: Record<string, { file?: FileLike; name?: string }> };
  buyerFioRef: { current: string };

  needAttachWarn: boolean;
  kbOpen: boolean;

  validatePicked: () => boolean;
  confirmSendWithoutAttachments: () => Promise<boolean>;

  apiCreateProposalsBySupplier: (
    payload: import("../../../lib/catalog_api").ProposalBucketInput[],
    opts?: import("../../../lib/catalog_api").CreateProposalsOptions
  ) => Promise<import("../../../lib/catalog_api").CreateProposalsResult>;
  supabase: SupabaseClient;
  uploadProposalAttachment: (proposalId: string, file: FileLike, fileName: string, groupKey: string) => Promise<void>;

  setAttachments: (v: Record<string, never>) => void;
  removeFromInboxLocally: (ids: string[]) => void;
  clearPick: () => void;
  fetchInbox: () => Promise<void>;
  fetchBuckets: () => Promise<void>;
  setTab: (tab: "pending") => void;
  closeSheet: () => void;

  setShowAttachBlock: (v: boolean) => void;
  showToast: (msg: string) => void;
  alertUser: AlertFn;
}) {
  const {
    pickedIdsRef,
    metaRef,
    attachmentsRef,
    buyerFioRef,
    needAttachWarn,
    kbOpen,
    validatePicked,
    confirmSendWithoutAttachments,
    apiCreateProposalsBySupplier,
    supabase,
    uploadProposalAttachment,
    setAttachments,
    removeFromInboxLocally,
    clearPick,
    fetchInbox,
    fetchBuckets,
    setTab,
    closeSheet,
    setShowAttachBlock,
    showToast,
    alertUser,
  } = params;

  const [creating, setCreating] = useState(false);
  const sendingRef = useRef(false);

  const handleCreateProposalsBySupplier = useCallback(async () => {
    if (creating) return;
    setCreating(true);

    try {
      await handleCreateProposalsBySupplierAction({
        creating,
        sendingRef,
        pickedIds: pickedIdsRef.current || [],
        metaNow: metaRef.current || {},
        attachmentsNow: attachmentsRef.current || {},
        buyerFio: (buyerFioRef.current || "").trim(),
        needAttachWarn,
        kbOpen,
        validatePicked,
        confirmSendWithoutAttachments,
        apiCreateProposalsBySupplier,
        supabase,
        uploadProposalAttachment,
        setAttachments,
        removeFromInboxLocally,
        clearPick,
        fetchInbox,
        fetchBuckets,
        setTab,
        closeSheet,
        setShowAttachBlock,
        showToast,
        alert: alertUser,
      });
    } finally {
      setCreating(false);
    }
  }, [
    creating,
    pickedIdsRef,
    metaRef,
    attachmentsRef,
    buyerFioRef,
    needAttachWarn,
    kbOpen,
    validatePicked,
    confirmSendWithoutAttachments,
    apiCreateProposalsBySupplier,
    supabase,
    uploadProposalAttachment,
    setAttachments,
    removeFromInboxLocally,
    clearPick,
    fetchInbox,
    fetchBuckets,
    setTab,
    closeSheet,
    setShowAttachBlock,
    showToast,
    alertUser,
  ]);

  return { creating, handleCreateProposalsBySupplier };
}

