import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { openInvoicePickerWebAction, pickInvoiceFileAction } from "../buyer.attachments.mutation";
import { sendToAccountingAction } from "../buyer.status.mutation";
import type { Attachment } from "../buyer.types";

type AlertFn = (title: string, message?: string) => void;
type FileLike = File | Blob | { name?: string | null; uri?: string | null; mimeType?: string | null; size?: number | null };
export function useBuyerAccountingSend<TApproved extends { id?: string | number | null }>(params: {
  acctProposalId: string | number | null;
  invNumber: string;
  invDate: string;
  invAmount: string;
  invCurrency: string;
  invFile: Attachment["file"] | null;
  invoiceUploadedName: string;
  buildProposalPdfHtml: (proposalId: string) => Promise<string>;
  proposalSendToAccountant: (payload: {
    proposalId: string;
    invoiceNumber: string;
    invoiceDate: string;
    invoiceAmount: number;
    invoiceCurrency: string;
  }) => Promise<void>;
  uploadProposalAttachment: (proposalId: string, file: FileLike, fileName: string, groupKey: string) => Promise<void>;
  ensureAccountingFlags: (proposalId: string, invoiceAmountNum?: number) => Promise<void>;
  supabase: SupabaseClient;
  fetchBuckets: () => Promise<void>;
  closeSheet: () => void;
  setApproved: Dispatch<SetStateAction<TApproved[]>>;
  setAcctBusy: (v: boolean) => void;
  setInvoiceUploadedName: (name: string) => void;
  alertUser: AlertFn;
}) {
  const {
    acctProposalId,
    invNumber,
    invDate,
    invAmount,
    invCurrency,
    invFile,
    invoiceUploadedName,
    buildProposalPdfHtml,
    proposalSendToAccountant,
    uploadProposalAttachment,
    ensureAccountingFlags,
    supabase,
    fetchBuckets,
    closeSheet,
    setApproved,
    setAcctBusy,
    setInvoiceUploadedName,
    alertUser,
  } = params;

  const openInvoicePickerWeb = useCallback(async () => {
    await openInvoicePickerWebAction({
      proposalId: String(acctProposalId || ""),
      uploadProposalAttachment: async (proposalId, file, fileName, groupKey) => {
        await uploadProposalAttachment(proposalId, file, fileName, groupKey);
      },
      setInvoiceUploadedName,
      alert: alertUser,
    });
  }, [acctProposalId, uploadProposalAttachment, setInvoiceUploadedName, alertUser]);

  const pickInvoiceFile = useCallback(async (): Promise<Attachment["file"] | null> => {
    const file = await pickInvoiceFileAction();
    if (!file) return null;
    return file;
  }, []);

  const sendToAccounting = useCallback(async () => {
    if (!acctProposalId) return;

    await sendToAccountingAction<TApproved>({
      acctProposalId: String(acctProposalId),
      invNumber,
      invDate,
      invAmount,
      invCurrency,
      invFile,
      invoiceUploadedName,
      buildProposalPdfHtml,
      proposalSendToAccountant: async (payload) => {
        await proposalSendToAccountant(payload);
      },
      uploadProposalAttachment: async (proposalId, file, fileName, groupKey) => {
        await uploadProposalAttachment(proposalId, file, fileName, groupKey);
      },
      ensureAccountingFlags,
      supabase,
      fetchBuckets,
      closeSheet,
      setApproved,
      setBusy: setAcctBusy,
      alert: alertUser,
    });
  }, [
    acctProposalId,
    invNumber,
    invDate,
    invAmount,
    invCurrency,
    invFile,
    invoiceUploadedName,
    buildProposalPdfHtml,
    proposalSendToAccountant,
    uploadProposalAttachment,
    ensureAccountingFlags,
    supabase,
    fetchBuckets,
    closeSheet,
    setApproved,
    setAcctBusy,
    alertUser,
  ]);

  return { openInvoicePickerWeb, pickInvoiceFile, sendToAccounting };
}
