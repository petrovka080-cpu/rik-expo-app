import { useCallback, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { apiFetchReqItems } from "../warehouse.requests.read";
import type { ReqHeadRow, ReqItemUiRow } from "../warehouse.types";
import {
  isWarehouseScreenActive,
  useWarehouseFallbackActiveRef,
  type WarehouseScreenActiveRef,
} from "./useWarehouseScreenActivity";

type ReqPickUiLike = {
  setReqQtyInputByItem: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  clearReqPick: () => void;
};

export function useWarehouseReqModalFlow(params: {
  supabase: SupabaseClient;
  reqPickUi: ReqPickUiLike;
  setReqModal: React.Dispatch<React.SetStateAction<ReqHeadRow | null>>;
  setReqItems: React.Dispatch<React.SetStateAction<ReqItemUiRow[]>>;
  setReqItemsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  screenActiveRef?: WarehouseScreenActiveRef;
  onError: (e: unknown) => void;
}) {
  const {
    supabase,
    reqPickUi,
    setReqModal,
    setReqItems,
    setReqItemsLoading,
    onError,
  } = params;
  const screenActiveRef = useWarehouseFallbackActiveRef(params.screenActiveRef);
  const reqOpenSeqRef = useRef(0);

  const openReq = useCallback(
    async (h: ReqHeadRow) => {
      const rid = String(h?.request_id ?? "").trim();
      if (!rid) return;
      if (!isWarehouseScreenActive(screenActiveRef)) return;
      const seq = ++reqOpenSeqRef.current;

      setReqModal(h);
      reqPickUi.setReqQtyInputByItem({});
      reqPickUi.clearReqPick();
      setReqItems([]);

      setReqItemsLoading(true);
      try {
        const rows = await apiFetchReqItems(supabase, rid);
        if (
          seq !== reqOpenSeqRef.current ||
          !isWarehouseScreenActive(screenActiveRef)
        )
          return;
        setReqItems(Array.isArray(rows) ? rows : []);
      } catch (e) {
        if (
          seq === reqOpenSeqRef.current &&
          isWarehouseScreenActive(screenActiveRef)
        ) {
          setReqItems([]);
          onError(e);
        }
      } finally {
        if (
          seq === reqOpenSeqRef.current &&
          isWarehouseScreenActive(screenActiveRef)
        ) {
          setReqItemsLoading(false);
        }
      }
    },
    [
      reqPickUi,
      screenActiveRef,
      setReqItems,
      setReqItemsLoading,
      setReqModal,
      supabase,
      onError,
    ],
  );

  const closeReq = useCallback(() => {
    if (!isWarehouseScreenActive(screenActiveRef)) return;
    reqOpenSeqRef.current += 1;
    setReqModal(null);
    setReqItems([]);
    setReqItemsLoading(false);

    reqPickUi.setReqQtyInputByItem({});
    reqPickUi.clearReqPick();
  }, [
    reqPickUi,
    screenActiveRef,
    setReqItems,
    setReqItemsLoading,
    setReqModal,
  ]);

  return { openReq, closeReq };
}
