import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Attachment } from "../buyer.types";
import { pickInvoiceFileAction } from "../buyer.attachments.mutation";
import {
  openReworkAction,
  rwSaveItemsAction,
  rwSendToDirectorAction,
  rwSendToAccountingAction,
  type RwItem,
} from "../buyer.rework.mutation";

type AlertFn = (title: string, message?: string) => void;
type FileLike = File | Blob | { name?: string | null; uri?: string | null; mimeType?: string | null; size?: number | null };

export function useBuyerReworkFlow<TRejected extends { id?: string | number | null }>(params: {
  supabase: SupabaseClient;
  openReworkSheet: (proposalId?: string | number | null) => void;
  proposalSubmit: (proposalId: string) => Promise<unknown>;
  fetchInbox: () => Promise<void>;
  fetchBuckets: () => Promise<void>;
  setRejected: Dispatch<SetStateAction<TRejected[]>>;
  closeSheet: () => void;
  buildProposalPdfHtml: (proposalId: string) => Promise<string>;
  uploadProposalAttachment: (
    proposalId: string,
    file: FileLike,
    fileName: string,
    groupKey: string
  ) => Promise<void>;
  proposalSendToAccountant: (payload: {
    proposalId: string;
    invoiceNumber: string;
    invoiceDate: string;
    invoiceAmount: number;
    invoiceCurrency: string;
  }) => Promise<void>;
  ensureAccountingFlags: (proposalId: string, invoiceAmountNum?: number) => Promise<void>;
  alertUser: AlertFn;
}) {
  const {
    supabase,
    openReworkSheet,
    proposalSubmit,
    fetchInbox,
    fetchBuckets,
    setRejected,
    closeSheet,
    buildProposalPdfHtml,
    uploadProposalAttachment,
    proposalSendToAccountant,
    ensureAccountingFlags,
    alertUser,
  } = params;

  const [rwBusy, setRwBusy] = useState(false);
  const [rwPid, setRwPid] = useState<string | null>(null);
  const [rwReason, setRwReason] = useState<string>("");
  const [rwItems, setRwItems] = useState<RwItem[]>([]);
  const [rwInvNumber, setRwInvNumber] = useState("");
  const [rwInvDate, setRwInvDate] = useState(new Date().toISOString().slice(0, 10));
  const [rwInvAmount, setRwInvAmount] = useState("");
  const [rwInvCurrency, setRwInvCurrency] = useState("KGS");
  const [rwInvFile, setRwInvFile] = useState<Attachment["file"] | null>(null);
  const [rwInvUploadedName, setRwInvUploadedName] = useState("");
  const [rwSource, setRwSource] = useState<"director" | "accountant">("director");

  const openRework = useCallback(
    async (proposalId: string) => {
      await openReworkAction({
        pid: String(proposalId),
        supabase,
        openReworkSheet,
        setRwBusy,
        setRwPid,
        setRwReason,
        setRwItems,
        setRwInvNumber,
        setRwInvDate,
        setRwInvAmount,
        setRwInvCurrency,
        setRwInvFile,
        setRwInvUploadedName,
        setRwSource,
        alert: alertUser,
      });
    },
    [supabase, openReworkSheet, alertUser]
  );

  const rwSaveItems = useCallback(async () => {
    if (!rwPid) return;
    await rwSaveItemsAction({
      pid: rwPid,
      items: rwItems,
      supabase,
      setBusy: setRwBusy,
      alert: alertUser,
    });
  }, [rwPid, rwItems, supabase, alertUser]);

  const rwPickInvoiceNative = useCallback(async () => {
    const file = await pickInvoiceFileAction();
    if (!file) return;
    setRwInvFile(file || null);
    if (file?.name) setRwInvUploadedName(file.name);
  }, []);

  const rwSendToDirector = useCallback(async () => {
    if (!rwPid) return;
    await rwSendToDirectorAction<TRejected>({
      pid: rwPid,
      items: rwItems,
      supabase,
      proposalSubmit: async (pid) => {
        await proposalSubmit(pid);
      },
      fetchInbox,
      fetchBuckets,
      setRejected,
      closeSheet,
      setBusy: setRwBusy,
      alert: alertUser,
    });
  }, [rwPid, rwItems, supabase, proposalSubmit, fetchInbox, fetchBuckets, setRejected, closeSheet, alertUser]);

  const rwSendToAccounting = useCallback(async () => {
    if (!rwPid) return;

    await rwSendToAccountingAction<TRejected>({
      pid: rwPid,
      items: rwItems,
      invNumber: rwInvNumber,
      invDate: rwInvDate,
      invAmount: rwInvAmount,
      invCurrency: rwInvCurrency,
      invFile: rwInvFile,
      supabase,
      buildProposalPdfHtml,
      uploadProposalAttachment: async (proposalId, file, fileName, groupKey) => {
        await uploadProposalAttachment(proposalId, file, fileName, groupKey);
      },
      proposalSendToAccountant: async (payload) => {
        await proposalSendToAccountant(payload);
      },
      ensureAccountingFlags,
      fetchBuckets,
      setRejected,
      closeSheet,
      setBusy: setRwBusy,
      alert: alertUser,
    });
  }, [
    rwPid,
    rwItems,
    rwInvNumber,
    rwInvDate,
    rwInvAmount,
    rwInvCurrency,
    rwInvFile,
    supabase,
    buildProposalPdfHtml,
    uploadProposalAttachment,
    proposalSendToAccountant,
    ensureAccountingFlags,
    fetchBuckets,
    setRejected,
    closeSheet,
    alertUser,
  ]);

  return {
    rwBusy,
    rwPid,
    rwReason,
    rwItems,
    setRwItems,
    rwInvNumber,
    setRwInvNumber,
    rwInvDate,
    setRwInvDate,
    rwInvAmount,
    setRwInvAmount,
    rwInvCurrency,
    setRwInvCurrency,
    rwInvFile,
    setRwInvFile,
    rwInvUploadedName,
    rwSource,
    openRework,
    rwSaveItems,
    rwPickInvoiceNative,
    rwSendToDirector,
    rwSendToAccounting,
  };
}
