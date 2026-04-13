import { Keyboard } from "react-native";
import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";

import { supabase } from "../../lib/supabaseClient";
import { runNextTick } from "./helpers";
import type { AccountantInboxUiRow, AttachmentRow, AttachmentState } from "./types";

type AttachmentCacheEntry = {
  ts: number;
  rows: AttachmentRow[];
  state: AttachmentState;
  message: string;
};

type Params = {
  load: () => Promise<void>;
  onOpenAttachments: (proposalId?: string, opts?: { silent?: boolean; force?: boolean }) => Promise<void>;
  attPidRef: { current: string | null };
  attCacheRef: { current: Record<string, AttachmentCacheEntry> };
  setAttRows: Dispatch<SetStateAction<AttachmentRow[]>>;
  setAttState: Dispatch<SetStateAction<AttachmentState>>;
  setAttMessage: Dispatch<SetStateAction<string>>;
  setCurrent: Dispatch<SetStateAction<AccountantInboxUiRow | null>>;
  setCardOpen: Dispatch<SetStateAction<boolean>>;
  setCurrentPaymentId: Dispatch<SetStateAction<number | null>>;
  setFreezeWhileOpen: Dispatch<SetStateAction<boolean>>;
  setInvoiceNo: Dispatch<SetStateAction<string>>;
  setInvoiceDate: Dispatch<SetStateAction<string>>;
  setSupplierName: Dispatch<SetStateAction<string>>;
  setAmount: Dispatch<SetStateAction<string>>;
  setNote: Dispatch<SetStateAction<string>>;
  setAllocRows: Dispatch<SetStateAction<Array<{ proposal_item_id: string; amount: number }>>>;
  setAllocOk: Dispatch<SetStateAction<boolean>>;
  setAllocSum: Dispatch<SetStateAction<number>>;
  setPayKind: Dispatch<SetStateAction<"bank" | "cash">>;
  setAccountantFio: Dispatch<SetStateAction<string>>;
};

export function useAccountantCardFlow(params: Params) {
  const {
    load,
    onOpenAttachments,
    attPidRef,
    attCacheRef,
    setAttRows,
    setAttState,
    setAttMessage,
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
  } = params;

  const closeCard = useCallback(() => {
    Keyboard.dismiss();
    setCardOpen(false);
    setCurrent(null);
    setCurrentPaymentId(null);
    setFreezeWhileOpen(false);
    attPidRef.current = null;

    runNextTick(() => {
      void load();
    });
  }, [attPidRef, load, setCardOpen, setCurrent, setCurrentPaymentId, setFreezeWhileOpen]);

  const openCard = useCallback(
    (row: AccountantInboxUiRow) => {
      const pid = String(row?.proposal_id ?? "").trim();

      setCurrent(row);
      setCardOpen(true);
      setInvoiceNo(String(row?.invoice_number ?? "").trim());
      setInvoiceDate(String(row?.invoice_date ?? "").trim());
      setSupplierName(String(row?.supplier ?? "").trim());

      setAmount("");
      setNote("");
      setAllocRows([]);
      setAllocOk(true);
      setAllocSum(0);
      setPayKind("bank");
      setFreezeWhileOpen(true);
      attPidRef.current = pid;

      const cached = pid ? attCacheRef.current[pid] : null;
      setAttRows(cached?.rows ?? []);
      setAttState(cached?.state ?? "empty");
      setAttMessage(cached?.message ?? "Вложения отсутствуют.");

      if (pid) {
        runNextTick(() => {
          void onOpenAttachments(pid, { silent: true, force: false });
        });
      }

      (async () => {
        try {
          const { data } = await supabase.auth.getUser();
          const fio = String(data?.user?.user_metadata?.full_name ?? data?.user?.user_metadata?.name ?? "").trim();
          if (fio) setAccountantFio((prev) => (prev?.trim() ? prev : fio));
        } catch (e) {
          if (__DEV__) console.warn("[useAccountantCardFlow] auth.getUser failed", e);
        }
      })();
    },
    [
      attCacheRef,
      attPidRef,
      onOpenAttachments,
      setAccountantFio,
      setAllocOk,
      setAllocRows,
      setAllocSum,
      setAmount,
      setAttMessage,
      setAttRows,
      setAttState,
      setCardOpen,
      setCurrent,
      setFreezeWhileOpen,
      setInvoiceDate,
      setInvoiceNo,
      setNote,
      setPayKind,
      setSupplierName,
    ],
  );

  return { openCard, closeCard };
}
