import { useCallback, useMemo } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";
import { makeWarehouseIssueActions, type IssueMsg } from "../warehouse.issue";
import type {
  ReqItemUiRow,
  ReqPickLine,
  StockPickLine,
} from "../warehouse.types";
import { nz, pickErr } from "../warehouse.utils";
import {
  isWarehouseScreenActive,
  useWarehouseFallbackActiveRef,
  type WarehouseScreenActiveRef,
} from "./useWarehouseScreenActivity";

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
  screenActiveRef?: WarehouseScreenActiveRef;
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
    screenActiveRef: externalScreenActiveRef,
  } = params;
  const screenActiveRef = useWarehouseFallbackActiveRef(
    externalScreenActiveRef,
  );

  const setIssueBusyIfActive = useCallback(
    (value: boolean) => {
      if (isWarehouseScreenActive(screenActiveRef)) setIssueBusy(value);
    },
    [screenActiveRef, setIssueBusy],
  );
  const setIssueMsgIfActive = useCallback(
    (value: IssueMsg) => {
      if (isWarehouseScreenActive(screenActiveRef)) setIssueMsg(value);
    },
    [screenActiveRef, setIssueMsg],
  );
  const clearStockPickIfActive = useCallback(() => {
    if (isWarehouseScreenActive(screenActiveRef)) clearStockPick();
  }, [clearStockPick, screenActiveRef]);
  const clearReqPickIfActive = useCallback(() => {
    if (isWarehouseScreenActive(screenActiveRef)) clearReqPick();
  }, [clearReqPick, screenActiveRef]);
  const clearReqQtyInputIfActive = useCallback(
    (requestItemId: string) => {
      if (isWarehouseScreenActive(screenActiveRef))
        clearReqQtyInput(requestItemId);
    },
    [clearReqQtyInput, screenActiveRef],
  );

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
      setIssueBusy: setIssueBusyIfActive,
      setIssueMsg: setIssueMsgIfActive,
      clearStockPick: clearStockPickIfActive,
      clearReqPick: clearReqPickIfActive,
      clearReqQtyInput: (requestItemId: string) =>
        clearReqQtyInputIfActive(String(requestItemId)),
    });
  }, [
    clearReqPickIfActive,
    clearReqQtyInputIfActive,
    clearStockPickIfActive,
    fetchReqHeads,
    fetchReqItems,
    fetchStock,
    getAvailableByCode,
    getAvailableByCodeUom,
    getMaterialNameByCode,
    objectLabel,
    recipientText,
    setIssueBusyIfActive,
    setIssueMsgIfActive,
    scopeLabel,
    supabase,
    warehousemanFio,
  ]);

  const submitReqPick = useCallback(async () => {
    const rid = String(reqModalRequestId ?? "").trim();
    if (!isWarehouseScreenActive(screenActiveRef)) return false;
    if (!rid) {
      setIssueMsg({ kind: "error", text: "Заявка не выбрана" });
      return;
    }

    if (!recipientText.trim()) {
      if (!isWarehouseScreenActive(screenActiveRef)) return false;
      setIsRecipientModalVisible(true);
      return;
    }

    const ok = await issueActions.submitReqPick({
      requestId: rid,
      requestDisplayNo: reqModalDisplayNo ?? null,
      reqPick,
      reqItems,
    });

    if (ok && isWarehouseScreenActive(screenActiveRef)) closeReq();
  }, [
    closeReq,
    issueActions,
    recipientText,
    reqItems,
    reqModalDisplayNo,
    reqModalRequestId,
    reqPick,
    screenActiveRef,
    setIssueMsg,
    setIsRecipientModalVisible,
  ]);

  const submitStockPick = useCallback(async () => {
    if (!isWarehouseScreenActive(screenActiveRef)) return false;
    if (!recipientText.trim()) {
      setIsRecipientModalVisible(true);
      return;
    }
    await issueActions.submitStockPick({ stockPick });
  }, [
    issueActions,
    recipientText,
    screenActiveRef,
    setIsRecipientModalVisible,
    stockPick,
  ]);

  return {
    submitReqPick,
    submitStockPick,
  };
}
