// src/screens/warehouse/warehouse.stockPick.ts
import { useCallback, useMemo, useState } from "react";
import type { StockRow, StockPickLine, Option } from "./warehouse.types";
import { normMatCode, normUomId } from "./warehouse.utils";

export type IssueMsg = { kind: "error" | "ok" | null; text: string };

const buildPickKey = (code: string, uomId: string | null) => {
  const c = normMatCode(code);
  const u = normUomId(uomId ?? "");
  return `${c}::${u || "-"}`;
};

export function useWarehouseStockPick(args: {
  nz: (v: any, d?: number) => number;

  rec: { recipientText: string };
  objectOpt: Option | null;
  workTypeOpt: Option | null;

  setIssueMsg: (m: IssueMsg) => void;
}) {
  const { nz, rec, objectOpt, workTypeOpt, setIssueMsg } = args;

  const [stockPick, setStockPick] = useState<Record<string, StockPickLine>>({});
  const [stockIssueModal, setStockIssueModal] = useState<{
    code: string;
    name: string;
    uom_id: string | null;
    qty_available: number;
  } | null>(null);
  const [stockIssueQty, setStockIssueQty] = useState<string>("");

  const openStockIssue = useCallback(
    (r: StockRow) => {
      const code = String(r.code ?? "").trim();
      if (!code) return;

      const hasLedgerAvail = r.qty_available != null && Number.isFinite(Number(r.qty_available));
      const avail = hasLedgerAvail ? nz(r.qty_available, 0) : 0;

      if (!hasLedgerAvail) {
        setIssueMsg({
          kind: "error",
          text: "Остаток не из ledger. Обновите склад (данные не серверная истина).",
        });
        return;
      }
      setStockIssueModal({
        code,
        name: String(r.name ?? code).trim() || code,
        uom_id: r.uom_id ? String(r.uom_id).trim() : null,
        qty_available: avail,
      });
      setStockIssueQty("");
    },
    [nz, setIssueMsg],
  );

  const closeStockIssue = useCallback(() => {
    setStockIssueModal(null);
    setStockIssueQty("");
  }, []);

  const clearStockPick = useCallback(() => {
    setStockPick({});
  }, []);

  const removeStockPickLine = useCallback((pickKey: string) => {
    const k = String(pickKey ?? "").trim();
    if (!k) return;
    setStockPick((prev) => {
      const next = { ...(prev || {}) };
      delete next[k];
      return next;
    });
  }, []);

  const addStockPickLine = useCallback(() => {
    if (!stockIssueModal) return;

    const who = String(rec.recipientText ?? "").trim();
    if (!who) {
      setIssueMsg({ kind: "error", text: "Укажите получателя" });
      return;
    }
    if (!objectOpt?.id) {
      setIssueMsg({ kind: "error", text: "Выберите объект" });
      return;
    }
    if (!workTypeOpt?.id) {
      setIssueMsg({ kind: "error", text: "Выберите этаж/уровень" });
      return;
    }

    const raw = String(stockIssueQty ?? "").trim().replace(",", ".");
    const qty = Number(raw);
    if (!Number.isFinite(qty) || qty <= 0) {
      setIssueMsg({ kind: "error", text: "Введите количество > 0" });
      return;
    }

    const can = nz(stockIssueModal.qty_available, 0);

    const uomText = String(stockIssueModal.uom_id ?? "").trim();
    if (!uomText) {
      setIssueMsg({ kind: "error", text: `Пустой uom у позиции ${stockIssueModal.code}` });
      return;
    }

    const code = stockIssueModal.code;
    const pickKey = buildPickKey(code, uomText);

    let blocked = false;
    let nextTotal = 0;
    setStockPick((prev) => {
      const exist = prev[pickKey];
      nextTotal = nz(exist?.qty, 0) + qty;

      // Critical guard: validate cumulative qty in cart, not only single add.
      if (nextTotal > can) {
        blocked = true;
        return prev;
      }

      return {
        ...prev,
        [pickKey]: {
          pick_key: pickKey,
          code,
          name: stockIssueModal.name,
          uom_id: uomText,
          qty: nextTotal,
        },
      };
    });

    if (blocked) {
      setIssueMsg({
        kind: "error",
        text: `Нельзя выдать больше, чем доступно: ${stockIssueModal.name} доступно ${can}, в корзине было ${Math.max(
          0,
          nextTotal - qty,
        )}, пытаетесь добавить ${qty}`,
      });
      return;
    }

    setIssueMsg({ kind: "ok", text: `Добавлено: ${stockIssueModal.name} × ${qty}` });
    closeStockIssue();
  }, [stockIssueModal, stockIssueQty, rec.recipientText, objectOpt?.id, workTypeOpt?.id, nz, setIssueMsg, closeStockIssue]);

  const pickedCount = useMemo(() => Object.keys(stockPick || {}).length, [stockPick]);

  const pickedQtyByCodeUom = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const ln of Object.values(stockPick || {})) {
      const key = buildPickKey(String(ln.code ?? ""), ln.uom_id ?? null);
      acc[key] = nz(acc[key], 0) + nz((ln as any).qty, 0);
    }
    return acc;
  }, [stockPick, nz]);

  const getPickedQty = useCallback(
    (code: string, uomId: string | null) => {
      const key = buildPickKey(code, uomId);
      return nz(pickedQtyByCodeUom[key], 0);
    },
    [pickedQtyByCodeUom, nz],
  );

  return {
    // state
    stockPick,
    stockIssueModal,
    stockIssueQty,

    // setters
    setStockIssueQty,

    // actions
    openStockIssue,
    closeStockIssue,
    addStockPickLine,
    removeStockPickLine,
    clearStockPick,
    getPickedQty,

    // derived
    pickedCount,
  };
}
