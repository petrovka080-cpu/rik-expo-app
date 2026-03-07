import { useCallback, useMemo } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";
import { makeWarehouseIssueActions, type IssueMsg } from "../warehouse.issue";
import type { ReqItemUiRow, ReqPickLine, StockPickLine } from "../warehouse.types";
import { nz, pickErr } from "../warehouse.utils";

export function useWarehouseIssueFlow(params: {
  supabase: SupabaseClient;
  recipientText: string;
  objectLabel: string;
  scopeLabel: string;
  warehousemanFio: string;
  fetchStock: () => Promise<void>;
  fetchReqItems: (rid: string) => Promise<void>;
  fetchReqHeads: () => Promise<void>;
  getAvailableByCode: (code: string) => number;
  getAvailableByCodeUom: (code: string, uomId: string | null) => number;
  getMaterialNameByCode: (code: string) => string | null;
  clearStockPick: () => void;
  clearReqPick: () => void;
  clearReqQtyInput: (requestItemId: string) => void;
  reqModalRequestId: string | null | undefined;
  reqModalDisplayNo: string | null | undefined;
  reqPick: Record<string, ReqPickLine>;
  reqItems: ReqItemUiRow[];
  stockPick: Record<string, StockPickLine>;
  closeReq: () => void;
  setIsRecipientModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setIssueBusy: React.Dispatch<React.SetStateAction<boolean>>;
  setIssueMsg: React.Dispatch<React.SetStateAction<IssueMsg>>;
}) {
  const {
    supabase,
    recipientText,
    objectLabel,
    scopeLabel,
    warehousemanFio,
    fetchStock,
    fetchReqItems,
    fetchReqHeads,
    getAvailableByCode,
    getAvailableByCodeUom,
    getMaterialNameByCode,
    clearStockPick,
    clearReqPick,
    clearReqQtyInput,
    reqModalRequestId,
    reqModalDisplayNo,
    reqPick,
    reqItems,
    stockPick,
    closeReq,
    setIsRecipientModalVisible,
    setIssueBusy,
    setIssueMsg,
  } = params;

  const issueActions = useMemo(() => {
    return makeWarehouseIssueActions({
      supabase,
      nz,
      pickErr,
      getRecipient: () => recipientText.trim(),
      getObjectLabel: () => String(objectLabel ?? ""),
      getWorkLabel: () => scopeLabel,
      getWarehousemanFio: () => warehousemanFio,
      fetchStock,
      fetchReqItems,
      fetchReqHeads,
      getAvailableByCode,
      getAvailableByCodeUom,
      getMaterialNameByCode,
      setIssueBusy,
      setIssueMsg,
      clearStockPick: () => clearStockPick(),
      clearReqPick: () => clearReqPick(),
      clearReqQtyInput: (requestItemId: string) => clearReqQtyInput(String(requestItemId)),
    });
  }, [
    clearReqPick,
    clearReqQtyInput,
    clearStockPick,
    fetchReqHeads,
    fetchReqItems,
    fetchStock,
    getAvailableByCode,
    getAvailableByCodeUom,
    getMaterialNameByCode,
    objectLabel,
    recipientText,
    setIssueBusy,
    setIssueMsg,
    scopeLabel,
    supabase,
    warehousemanFio,
  ]);

  const submitReqPick = useCallback(async () => {
    const rid = String(reqModalRequestId ?? "").trim();
    if (!rid) {
      setIssueMsg({ kind: "error", text: "Заявка не выбрана" });
      return;
    }

    if (!recipientText.trim()) {
      setIsRecipientModalVisible(true);
      return;
    }

    const ok = await issueActions.submitReqPick({
      requestId: rid,
      requestDisplayNo: reqModalDisplayNo ?? null,
      reqPick,
      reqItems,
    });

    if (ok) closeReq();
  }, [
    closeReq,
    issueActions,
    recipientText,
    reqItems,
    reqModalDisplayNo,
    reqModalRequestId,
    reqPick,
    setIssueMsg,
    setIsRecipientModalVisible,
  ]);

  const submitStockPick = useCallback(async () => {
    if (!recipientText.trim()) {
      setIsRecipientModalVisible(true);
      return;
    }
    await issueActions.submitStockPick({ stockPick });
  }, [issueActions, recipientText, setIsRecipientModalVisible, stockPick]);

  return {
    submitReqPick,
    submitStockPick,
  };
}
