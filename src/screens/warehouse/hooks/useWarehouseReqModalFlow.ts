import { useCallback, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { apiFetchReqItems } from "../warehouse.api";
import { parseReqHeaderContext } from "../warehouse.utils";
import type { ReqHeadRow, ReqItemUiRow, ReqItemUiRowWithNote } from "../warehouse.types";

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
      const normalizePhone = (raw: unknown): string => {
        const src = String(raw ?? "").trim();
        if (!src) return "";
        if (/^\d{4}-\d{2}-\d{2}$/.test(src)) return "";
        if (/^\d{4}[./]\d{2}[./]\d{2}$/.test(src)) return "";
        const m = src.match(/(\+?\d[\d\s()\-]{7,}\d)/);
        if (!m) return "";
        const candidate = String(m[1] || "").trim();
        const digits = candidate.replace(/[^\d]/g, "");
        if (digits.length < 9) return "";
        return candidate.replace(/\s+/g, "");
      };

      setReqModal(h);
      reqPickUi.setReqQtyInputByItem({});
      reqPickUi.clearReqPick();
      setReqItems([]);

      setReqItemsLoading(true);
      try {
        const metaQ = await supabase
          .from("requests")
          .select("*")
          .eq("id", rid)
          .maybeSingle();
        if (!metaQ.error && metaQ.data) {
          const meta = metaQ.data as Record<string, unknown>;
          setReqModal((prev) => {
            if (!prev || String(prev.request_id) !== rid) return prev;
            const contractor =
              String(
                meta?.contractor_name ??
                meta?.contractor_org ??
                meta?.subcontractor_name ??
                meta?.subcontractor_org ??
                "",
              ).trim() || null;
            const phone = normalizePhone(
              meta?.contractor_phone ??
              meta?.subcontractor_phone ??
              meta?.phone_number ??
              meta?.phone ??
              meta?.tel ??
              "",
            ) || null;
            const volume =
              String(
                meta?.planned_volume ??
                meta?.qty_planned ??
                meta?.planned_qty ??
                meta?.volume ??
                meta?.qty_plan ??
                "",
              ).trim() || null;

            return {
              ...prev,
              note: (meta?.note as string | null) ?? prev.note ?? null,
              comment: (meta?.comment as string | null) ?? prev.comment ?? null,
              contractor_name: contractor || prev.contractor_name || null,
              contractor_phone: phone || prev.contractor_phone || null,
              planned_volume: volume || prev.planned_volume || null,
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

