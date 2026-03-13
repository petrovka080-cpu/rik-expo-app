import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { seedEnsureIncomingItems } from "../warehouse.seed";
import { nz, parseQtySelected, pickErr } from "../warehouse.utils";
import type { RpcReceiveApplyResult } from "../warehouse.types";
import { applyWarehouseReceive } from "./useWarehouseReceiveApply";

export function useWarehouseReceiveFlow(params: {
  supabase: SupabaseClient;
  itemsModalIncomingId: string | null | undefined;
  loadItemsForHead: (incomingId: string, force?: boolean) => Promise<
    {
      incoming_item_id?: string | null;
      purchase_item_id?: string | number | null;
      qty_expected?: number | string | null;
      qty_received?: number | string | null;
    }[]
  >;
  fetchToReceive: () => Promise<void>;
  fetchStock: () => Promise<void>;
  warehousemanFio: string;
  setReceivingHeadId: React.Dispatch<React.SetStateAction<string | null>>;
  setIsFioConfirmVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setItemsModal: React.Dispatch<
    React.SetStateAction<{
      incomingId: string;
      purchaseId: string;
      poNo: string | null;
      status: string;
    } | null>
  >;
  notifyInfo: (title: string, message?: string) => void;
  notifyError: (title: string, message?: string) => void;
  onError: (e: unknown) => void;
}) {
  const {
    supabase,
    itemsModalIncomingId,
    loadItemsForHead,
    fetchToReceive,
    fetchStock,
    warehousemanFio,
    setReceivingHeadId,
    setIsFioConfirmVisible,
    setItemsModal,
    notifyInfo,
    notifyError,
    onError,
  } = params;

  const [qtyInputByItem, setQtyInputByItem] = useState<Record<string, string>>({});

  useEffect(() => {
    const incomingId = String(itemsModalIncomingId ?? "").trim();
    if (!incomingId) return;

    (async () => {
      await seedEnsureIncomingItems({ supabase, incomingId });
      await loadItemsForHead(incomingId, true);
    })().catch((e) => onError(e));
  }, [itemsModalIncomingId, loadItemsForHead, onError, supabase]);

  const receiveSelectedForHead = useCallback(
    async (incomingIdRaw: string) => {
      try {
        const incomingId = String(incomingIdRaw ?? "").trim();
        if (!incomingId) return;

        const freshRows = await loadItemsForHead(incomingId, true);
        if (!freshRows.length) {
          return notifyError(
            "Нет материалов",
            "В этой поставке нет материалов для склада. Работы/услуги смотри в «Подрядчики».",
          );
        }

        const toApply: { purchase_item_id: string; qty: number }[] = [];
        for (const r of freshRows) {
          const exp = nz(r.qty_expected, 0);
          const rec = nz(r.qty_received, 0);
          const left = Math.max(0, exp - rec);
          if (!left) continue;

          const inputKey = String(r.incoming_item_id ?? r.purchase_item_id ?? "");
          const raw = qtyInputByItem[inputKey];
          if (raw == null || String(raw).trim() === "") continue;

          const qty = parseQtySelected(raw, left);
          if (qty > 0) toApply.push({ purchase_item_id: String(r.purchase_item_id), qty });
        }

        if (!toApply.length) {
          return notifyInfo("Нечего оприходовать", "Введите количество > 0 для нужных строк.");
        }

        setReceivingHeadId(incomingId);

        if (!warehousemanFio.trim()) {
          setIsFioConfirmVisible(true);
          return;
        }

        const { data, error } = await applyWarehouseReceive({
          supabase,
          incomingId,
          items: toApply,
          warehousemanFio,
        });

        if (error) {
          console.warn("[wh_receive_apply_ui] error:", error.message);
          return notifyError("Ошибка прихода", pickErr(error));
        }

        await Promise.all([
          fetchToReceive(),
          fetchStock(),
          loadItemsForHead(incomingId, true),
        ]);

        setQtyInputByItem((prev) => {
          const next = { ...(prev || {}) };
          for (const r of freshRows) {
            const k = String(r.incoming_item_id ?? r.purchase_item_id ?? "");
            delete next[k];
          }
          return next;
        });

        const d = (data as RpcReceiveApplyResult | null) ?? null;
        const ok = Number(d?.ok ?? 0);
        const fail = Number(d?.fail ?? 0);
        const leftAfter = nz(d?.left_after, 0);

        if (leftAfter <= 0) setItemsModal(null);

        notifyInfo(
          "Готово",
          `Принято позиций: ${ok}${fail ? `, ошибок: ${fail}` : ""} \nОсталось: ${leftAfter} `,
        );
      } catch (e) {
        onError(e);
      } finally {
        setReceivingHeadId(null);
      }
    },
    [
      fetchStock,
      fetchToReceive,
      loadItemsForHead,
      notifyError,
      notifyInfo,
      onError,
      qtyInputByItem,
      setIsFioConfirmVisible,
      setItemsModal,
      setReceivingHeadId,
      supabase,
      warehousemanFio,
    ],
  );

  return {
    qtyInputByItem,
    setQtyInputByItem,
    receiveSelectedForHead,
  };
}
