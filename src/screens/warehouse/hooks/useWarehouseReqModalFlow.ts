import { useCallback, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { apiFetchReqItems } from "../warehouse.api";
import { parseReqHeaderContext } from "../warehouse.utils";
import type { ReqHeadRow, ReqItemUiRow, ReqItemUiRowWithNote } from "../warehouse.types";
import { fetchWarehouseRequestMeta } from "./useWarehouseRequestMeta";

type ReqPickUiLike = {
  setReqQtyInputByItem: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  clearReqPick: () => void;
};

export function useWarehouseReqModalFlow(params: {
  supabase: SupabaseClient;
  reqPickUi: ReqPickUiLike;
  setReqModal: React.Dispatch<React.SetStateAction<ReqHeadRow | null>>;
  setReqItems: React.Dispatch<React.SetStateAction<ReqItemUiRow[]>>;
  setReqItemsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  onError: (e: unknown) => void;
}) {
  const { supabase, reqPickUi, setReqModal, setReqItems, setReqItemsLoading, onError } = params;
  const reqOpenSeqRef = useRef(0);

  const openReq = useCallback(
    async (h: ReqHeadRow) => {
      const rid = String(h?.request_id ?? "").trim();
      if (!rid) return;
      const seq = ++reqOpenSeqRef.current;

      setReqModal(h);
      reqPickUi.setReqQtyInputByItem({});
      reqPickUi.clearReqPick();
      setReqItems([]);

      setReqItemsLoading(true);
      try {
        const meta = await fetchWarehouseRequestMeta(supabase, rid);
        if (meta) {
          setReqModal((prev) => {
            if (!prev || String(prev.request_id) !== rid) return prev;

            return {
              ...prev,
              note: meta.note ?? prev.note ?? null,
              comment: meta.comment ?? prev.comment ?? null,
              contractor_name: meta.contractor_name || prev.contractor_name || null,
              contractor_phone: meta.contractor_phone || prev.contractor_phone || null,
              planned_volume: meta.planned_volume || prev.planned_volume || null,
            };
          });
        }

        const rows = await apiFetchReqItems(supabase, rid);
        if (seq !== reqOpenSeqRef.current) return;
        setReqItems(Array.isArray(rows) ? rows : []);

        const fromItemNotes = parseReqHeaderContext(
          Array.isArray(rows) ? rows.map((r: ReqItemUiRowWithNote) => String(r?.note ?? "")) : [],
        );
        if (fromItemNotes.contractor || fromItemNotes.phone || fromItemNotes.volume) {
          setReqModal((prev) =>
            prev && String(prev.request_id) === rid
              ? {
                ...prev,
                contractor_name: prev.contractor_name || fromItemNotes.contractor || null,
                contractor_phone: prev.contractor_phone || fromItemNotes.phone || null,
                planned_volume: prev.planned_volume || fromItemNotes.volume || null,
              }
              : prev,
          );
        }
      } catch (e) {
        if (seq === reqOpenSeqRef.current) {
          setReqItems([]);
        }
        onError(e);
      } finally {
        if (seq === reqOpenSeqRef.current) {
          setReqItemsLoading(false);
        }
      }
    },
    [reqPickUi, setReqItems, setReqItemsLoading, setReqModal, supabase, onError],
  );

  const closeReq = useCallback(() => {
    reqOpenSeqRef.current += 1;
    setReqModal(null);
    setReqItems([]);
    setReqItemsLoading(false);

    reqPickUi.setReqQtyInputByItem({});
    reqPickUi.clearReqPick();
  }, [reqPickUi, setReqItems, setReqItemsLoading, setReqModal]);

  return { openReq, closeReq };
}
