import type { Dispatch, SetStateAction } from "react";

import type { BusyLike } from "../../lib/pdfRunner";
import type { AccountantInboxUiRow } from "./types";
import { useAccountantAttachments } from "./useAccountantAttachments";
import { useAccountantCardFlow } from "./useAccountantCardFlow";
import { useAccountantDocuments } from "./useAccountantDocuments";

type AllocRow = { proposal_item_id: string; amount: number };
type PayKind = "bank" | "cash";

type AccountantCompositionCardDocumentsParams = {
  current: AccountantInboxUiRow | null;
  currentPaymentId: number | null;
  setCurrentPaymentId: Dispatch<SetStateAction<number | null>>;
  runAction: (key: string, fn: () => Promise<void>) => Promise<void>;
  load: (force?: boolean) => Promise<void>;
  setCurrent: Dispatch<SetStateAction<AccountantInboxUiRow | null>>;
  setCardOpen: Dispatch<SetStateAction<boolean>>;
  setFreezeWhileOpen: Dispatch<SetStateAction<boolean>>;
  setInvoiceNo: Dispatch<SetStateAction<string>>;
  setInvoiceDate: Dispatch<SetStateAction<string>>;
  setSupplierName: Dispatch<SetStateAction<string>>;
  setAmount: Dispatch<SetStateAction<string>>;
  setNote: Dispatch<SetStateAction<string>>;
  setAllocRows: Dispatch<SetStateAction<AllocRow[]>>;
  setAllocOk: Dispatch<SetStateAction<boolean>>;
  setAllocSum: Dispatch<SetStateAction<number>>;
  setPayKind: Dispatch<SetStateAction<PayKind>>;
  setAccountantFio: Dispatch<SetStateAction<string>>;
  supplierName: string;
  invoiceNo: string;
  invoiceDate: string;
  bankName: string;
  bik: string;
  rs: string;
  inn: string;
  kpp: string;
  gbusy?: BusyLike;
  safeAlert: (title: string, msg: string) => void;
  getErrorText: (error: unknown) => string;
};

export function useAccountantCompositionCardDocuments({
  current,
  currentPaymentId,
  setCurrentPaymentId,
  runAction,
  load,
  setCurrent,
  setCardOpen,
  setFreezeWhileOpen,
  setInvoiceNo,
  setInvoiceDate,
  setSupplierName,
  setAmount,
  setNote,
  setAllocRows,
  setAllocOk,
  setAllocSum,
  setPayKind,
  setAccountantFio,
  supplierName,
  invoiceNo,
  invoiceDate,
  bankName,
  bik,
  rs,
  inn,
  kpp,
  gbusy,
  safeAlert,
  getErrorText,
}: AccountantCompositionCardDocumentsParams) {
  const attachments = useAccountantAttachments({
    current,
    runAction,
    safeAlert,
    reloadList: () => load(true),
  });

  const { openCard, closeCard } = useAccountantCardFlow({
    load: () => load(),
    onOpenAttachments: attachments.onOpenAttachments,
    attPidRef: attachments.attPidRef,
    attCacheRef: attachments.attCacheRef,
    setAttRows: attachments.setAttRows,
    setAttState: attachments.setAttState,
    setAttMessage: attachments.setAttMessage,
    setCurrent,
    setCardOpen,
    setCurrentPaymentId,
    setFreezeWhileOpen,
    setInvoiceNo,
    setInvoiceDate,
    setSupplierName,
    setAmount,
    setNote,
    setAllocRows,
    setAllocOk,
    setAllocSum,
    setPayKind,
    setAccountantFio,
  });

  const documents = useAccountantDocuments({
    current,
    currentPaymentId,
    setCurrentPaymentId,
    supplierName,
    invoiceNo,
    invoiceDate,
    bankName,
    bik,
    rs,
    inn,
    kpp,
    gbusy,
    safeAlert,
    getErrorText,
    onBeforeNavigate: closeCard,
  });

  return {
    ...attachments,
    openCard,
    closeCard,
    onOpenProposalPdf: documents.onOpenProposalPdf,
    onOpenInvoiceDoc: documents.onOpenInvoiceDoc,
    onOpenPaymentReport: documents.onOpenPaymentReport,
  };
}
