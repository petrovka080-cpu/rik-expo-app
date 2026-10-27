import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CreateProposalsOptions,
  CreateProposalsResult,
  ProposalBucketInput,
} from "../../../lib/catalog/catalog.proposalCreation.service";
import { handleCreateProposalsBySupplierAction } from "../buyer.submit.mutation";
import type { DraftAttachmentMap } from "../buyer.types";

type AlertFn = (title: string, message?: string) => void;
type FileLike = File | Blob | { name?: string | null; uri?: string | null; mimeType?: string | null; size?: number | null };
type DraftAttachmentSetter = Dispatch<SetStateAction<DraftAttachmentMap>>;

function mapBuyerDraftAttachmentsForSubmit(
  attachments: DraftAttachmentMap,
): Record<string, { file?: FileLike; name?: string }> {
  const next: Record<string, { file?: FileLike; name?: string }> = {};

  for (const [key, attachment] of Object.entries(attachments || {})) {
    if (!attachment) continue;
    next[key] = {
      file: attachment.file,
      name: attachment.name,
    };
  }

  return next;
}

export function useBuyerCreateProposalsFlow(params: {
  pickedIdsRef: { current: string[] };
  metaRef: { current: Record<string, { supplier?: string; price?: number | string | null; note?: string | null }> };
  attachmentsRef: { current: DraftAttachmentMap };
  buyerFioRef: { current: string };

  needAttachWarn: boolean;
  kbOpen: boolean;

  validatePicked: () => boolean;
  confirmSendWithoutAttachments: () => Promise<boolean>;

  apiCreateProposalsBySupplier: (
    payload: ProposalBucketInput[],
    opts?: CreateProposalsOptions
  ) => Promise<CreateProposalsResult>;
  supabase: SupabaseClient;
  uploadProposalAttachment: (proposalId: string, file: FileLike, fileName: string, groupKey: string) => Promise<void>;

  setAttachments: DraftAttachmentSetter;
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
        attachmentsNow: mapBuyerDraftAttachmentsForSubmit(attachmentsRef.current || {}),
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
