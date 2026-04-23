// src/screens/warehouse/warehouse.reqPick.ts
import { useCallback, useMemo, useState } from "react";
import type { ReqItemUiRow, ReqPickLine } from "./warehouse.types";

export type IssueMsg = { kind: "error" | "ok" | null; text: string };

export function useWarehouseReqPick(args: {
  nz: (v: unknown, d?: number) => number;
  setIssueMsg: (m: IssueMsg) => void;
}) {
  const { nz, setIssueMsg } = args;

  const [reqPick, setReqPick] = useState<Record<string, ReqPickLine>>({});
  const [reqQtyInputByItem, setReqQtyInputByItem] = useState<Record<string, string>>({});

  const setQtyInput = useCallback((requestItemId: string, text: string) => {
    const id = String(requestItemId || "").trim();
    if (!id) return;
    setReqQtyInputByItem((p) => ({ ...(p || {}), [id]: String(text ?? "") }));
  }, []);

  const getQtyInput = useCallback(
    (requestItemId: string) => {
      const id = String(requestItemId || "").trim();
      return id ? String(reqQtyInputByItem?.[id] ?? "") : "";
    },
    [reqQtyInputByItem],
  );

  const clearQtyInput = useCallback((requestItemId: string) => {
    const id = String(requestItemId || "").trim();
    if (!id) return;
    setReqQtyInputByItem((p) => ({ ...(p || {}), [id]: "" }));
  }, []);

  const addReqPickLine = useCallback(
    (item: ReqItemUiRow) => {
      const id = String(item.request_item_id || "").trim();
      if (!id) return;
      const rikCode = String(item.rik_code ?? "").trim();
      if (!rikCode) {
        setIssueMsg({ kind: "error", text: "Cannot add request item without RIK code" });
        return;
      }

      // Сколько можно выдать по заявке и по факту на складе.
      const canByReq = nz(item.qty_can_issue_now, 0);
      const canByStock = nz(item.qty_available, 0);

      if (canByStock <= 0) {
        setIssueMsg({ kind: "error", text: "Нельзя добавить: на складе 0" });
        return;
      }

      const raw = String(reqQtyInputByItem?.[id] ?? "").trim().replace(",", ".");
      const qty = Number(raw);

      if (!Number.isFinite(qty) || qty <= 0) {
        setIssueMsg({ kind: "error", text: "Введите количество > 0" });
        return;
      }

      if (qty > canByStock) {
        setIssueMsg({ kind: "error", text: `На складе доступно только: ${canByStock}` });
        return;
      }

      // Сообщение о превышении заявки.
      if (qty > canByReq && canByReq > 0) {
        setIssueMsg({
          kind: "ok",
          text: `Будет перерасход: по заявке ${canByReq}, сверх ${qty - canByReq}. Вы зафиксируете в отчёте.`,
        });
      } else if (canByReq === 0) {
        setIssueMsg({
          kind: "ok",
          text: `Будет перерасход: по заявке 0, выдать ${qty} позиций как сверх заявки.`,
        });
      } else {
        setIssueMsg({ kind: "ok", text: `Добавлено: ${String(item.name_human ?? "")} × ${qty}` });
      }

      setReqPick((prev) => ({
        ...(prev || {}),
        [id]: {
          request_item_id: id,
          rik_code: rikCode,
          name_human: item.name_human,
          uom: item.uom ?? null,
          qty,
        },
      }));

      // Чистим инпут после добавления.
      setReqQtyInputByItem((p) => ({ ...(p || {}), [id]: "" }));
    },
    [nz, reqQtyInputByItem, setIssueMsg],
  );

  const removeReqPickLine = useCallback((requestItemId: string) => {
    const id = String(requestItemId || "").trim();
    if (!id) return;
    setReqPick((prev) => {
      const next = { ...(prev || {}) };
      delete next[id];
      return next;
    });
  }, []);

  const clearReqPick = useCallback(() => setReqPick({}), []);

  const lines = useMemo(() => Object.values(reqPick || {}), [reqPick]);

  return {
    reqPick,
    reqQtyInputByItem,

    setReqQtyInputByItem,
    setQtyInput,
    getQtyInput,
    clearQtyInput,

    addReqPickLine,
    removeReqPickLine,
    clearReqPick,

    lines,
  };
}
