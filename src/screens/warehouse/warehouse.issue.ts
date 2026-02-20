// src/screens/warehouse/warehouse.issue.ts
import type { ReqItemUiRow, ReqPickLine, StockPickLine } from "./warehouse.types";
import { normMatCode, normUomId } from "./warehouse.utils";

export type IssueMsg = { kind: "error" | "ok" | null; text: string };

export function makeWarehouseIssueActions(args: {
  supabase: any;

  nz: (v: any, d?: number) => number;
  pickErr: (e: any) => string;

  // данные/контекст
  getRecipient: () => string; // rec.recipientText.trim()
  getObjectLabel?: () => string;
  getWorkLabel?: () => string;

  // обновления экрана после выдачи
  fetchStock: () => Promise<void>;
  fetchReqItems: (rid: string) => Promise<void>;
  fetchReqHeads: () => Promise<void>;

  getAvailableByCode: (code: string) => number;

  // UI callbacks
  setIssueBusy: (v: boolean) => void;
  setIssueMsg: (m: IssueMsg) => void;

  // очистки UI
  clearStockPick: () => void;
  clearReqPick: () => void;
  clearReqQtyInput?: (requestItemId: string) => void;
}) {
  const {
    supabase,
    nz,
    pickErr,

    getRecipient,
    getObjectLabel,
    getWorkLabel,

    fetchStock,
    fetchReqItems,
    fetchReqHeads,

    getAvailableByCode,

    setIssueBusy,
    setIssueMsg,

    clearStockPick,
    clearReqPick,
    clearReqQtyInput,
  } = args;

  const toNull = (v: any) => {
    const s = String(v ?? "").trim();
    return s ? s : null;
  };

  const getObjName = () => toNull(getObjectLabel?.());
  const getWorkName = () => toNull(getWorkLabel?.());

  async function submitReqPick(input: {
    requestId: string;
    requestDisplayNo?: string | null;
    reqPick: Record<string, ReqPickLine>;
    reqItems: ReqItemUiRow[];
  }) {
    const who = String(getRecipient() ?? "").trim();
    if (!who) {
      setIssueMsg({ kind: "error", text: "Укажите получателя" });
      return;
    }

    const rid = String(input.requestId ?? "").trim();
    if (!rid) {
      setIssueMsg({ kind: "error", text: "Заявка не выбрана" });
      return;
    }

    const lines = Object.values(input.reqPick || {});
    if (!lines.length) {
      setIssueMsg({ kind: "error", text: "Корзина пуста" });
      return;
    }

    setIssueBusy(true);
    setIssueMsg({ kind: null, text: "" });

    try {
      const note = ["Выдача по заявке", input.requestDisplayNo ? `Заявка: ${input.requestDisplayNo}` : null]
        .filter(Boolean)
        .join(" · ");
     
      const r1 = await supabase.rpc("issue_via_ui" as any, {
        p_who: who,
        p_note: note,
        p_request_id: rid,
        p_object_name: getObjName(),
        p_work_name: getWorkName(),
      } as any);
      if (r1.error || !r1.data) throw r1.error;
      const issueId = Number(r1.data);
      const byId: Record<string, ReqItemUiRow> = {};
      for (const it of input.reqItems || []) byId[String(it.request_item_id)] = it;

      for (const ln of lines) {
        const src = byId[String(ln.request_item_id)];
        const canByReq = nz((src as any)?.qty_left, 0);
        const canByStock = nz((src as any)?.qty_available, 0);

        const want = nz(ln.qty, 0);
        if (want <= 0) continue;

        if (want > canByStock) {
          throw new Error(`На складе меньше, чем выбрано: ${ln.name_human} (доступно ${canByStock})`);
        }

        const uomCode = String(ln.uom ?? (src as any)?.uom ?? "").trim();
        if (!uomCode) throw new Error(`Пустой uom у ${ln.rik_code}`);

        const qtyInReq = Math.min(want, canByReq);
        const qtyOver = Math.max(0, want - qtyInReq);

        if (qtyInReq > 0) {
          const rA = await supabase.rpc("issue_add_item_via_ui" as any, {
            p_issue_id: issueId,
            p_rik_code: ln.rik_code,
            p_uom_id: uomCode,
            p_qty: qtyInReq,
            p_request_item_id: ln.request_item_id,
          } as any);
          if (rA.error) throw rA.error;
        }

        if (qtyOver > 0) {
          const rB = await supabase.rpc("issue_add_item_via_ui" as any, {
            p_issue_id: issueId,
            p_rik_code: ln.rik_code,
            p_uom_id: uomCode,
            p_qty: qtyOver,
            p_request_item_id: null,
          } as any);
          if (rB.error) throw rB.error;
        }
      }

      const r3 = await supabase.rpc("acc_issue_commit_ledger" as any, { p_issue_id: issueId } as any);
      if (r3.error) throw r3.error;

      clearReqPick();

      // ✅ PROD: очистить инпуты количества по строкам, которые были в корзине
      for (const ln of lines) {
        const id = String(ln.request_item_id ?? "").trim();
        if (id) clearReqQtyInput?.(id);
      }

      await fetchStock();
      await fetchReqItems(rid);
      await fetchReqHeads();

      setIssueMsg({ kind: "ok", text: `✓ Выдано по заявке: позиций ${lines.length}` });

    } catch (e: any) {
      setIssueMsg({ kind: "error", text: pickErr(e) });
    } finally {
      setIssueBusy(false);
    }
  }

 async function submitStockPick(input: { stockPick: Record<string, StockPickLine> }) {
  const who = String(getRecipient() ?? "").trim();
  if (!who) {
    setIssueMsg({ kind: "error", text: "Укажите получателя" });
    return;
  }

  const lines = Object.values(input.stockPick || {}).filter(
    (x) => x && x.code && nz(x.qty, 0) > 0
  );

  if (!lines.length) {
    setIssueMsg({ kind: "error", text: "Ничего не выбрано" });
    return;
  }

  setIssueBusy(true);
  setIssueMsg({ kind: null, text: "" });

  try {
    const payloadLines = lines.map((l) => ({
  rik_code: normMatCode(l.code),
  uom_id: normUomId((l as any).uom_id ?? null),
  qty: nz(l.qty, 0),
}));

    const r = await supabase.rpc("wh_issue_free_atomic_v4" as any, {
      p_who: who,
      p_object_name: getObjName(),
      p_work_name: getWorkName(),
      p_note: null,
      p_lines: payloadLines,
    } as any);

    if (r.error) throw r.error;

    await fetchStock();
    clearStockPick();

    setIssueMsg({ kind: "ok", text: `✓ Выдано позиций: ${lines.length}` });
  } catch (e: any) {
    setIssueMsg({ kind: "error", text: pickErr(e) });
  } finally {
    setIssueBusy(false);
  }
}

  async function issueByRequestItem(input: { row: ReqItemUiRow; qty: number }) {
    const who = String(getRecipient() ?? "").trim();
    if (!who) {
      setIssueMsg({ kind: "error", text: "Укажите получателя" });
      return;
    }

    const row = input.row;
    const requestItemId = String((row as any)?.request_item_id ?? "").trim();
    const requestId = String((row as any)?.request_id ?? "").trim();
    if (!requestItemId || !requestId) {
      setIssueMsg({ kind: "error", text: "Пустые ID заявки/строки" });
      return;
    }

    const qty = Number(input.qty);
    if (!Number.isFinite(qty) || qty <= 0) {
      setIssueMsg({ kind: "error", text: "Введите количество > 0" });
      return;
    }

    const canNow = nz((row as any)?.qty_can_issue_now, 0);
    if (qty > canNow) {
      setIssueMsg({ kind: "error", text: `Нельзя больше, чем можно выдать сейчас: ${canNow}` });
      return;
    }

    setIssueBusy(true);
    setIssueMsg({ kind: null, text: "" });

    try {
      const note = [
        "Выдача по заявке",
        (row as any)?.display_no ? `Заявка: ${(row as any).display_no}` : null,
        (row as any)?.object_name ? `Объект: ${(row as any).object_name}` : null,
        (row as any)?.level_code ? `Этаж: ${(row as any).level_code}` : null,
        (row as any)?.system_code ? `Система: ${(row as any).system_code}` : null,
        (row as any)?.zone_code ? `Зона: ${(row as any).zone_code}` : null,
      ]
        .filter(Boolean)
        .join(" · ");

      const r1 = await supabase.rpc("issue_via_ui" as any, {
        p_who: who,
        p_note: note,
        p_request_id: requestId,
        p_object_name: getObjName(),
        p_work_name: getWorkName(),
      } as any);
      if (r1.error || !r1.data) throw r1.error;
      const issueId = Number(r1.data);

      const uomCode = String((row as any)?.uom ?? "").trim();
      if (!uomCode) throw new Error(`Пустой uom у ${(row as any)?.rik_code}`);

      const r2 = await supabase.rpc("issue_add_item_via_ui" as any, {
        p_issue_id: issueId,
        p_rik_code: (row as any).rik_code,
        p_uom_id: uomCode,
        p_qty: qty,
        p_request_item_id: requestItemId,
      } as any);
      if (r2.error) throw r2.error;

      const r3 = await supabase.rpc("acc_issue_commit_ledger" as any, { p_issue_id: issueId } as any);
      if (r3.error) throw r3.error;

      await fetchStock();
      await fetchReqItems(requestId);
      await fetchReqHeads();

      const uomLabel = String((row as any)?.uom ?? "—");
      setIssueMsg({
        kind: "ok",
        text: `✓ Выдано по заявке: ${qty} ${uomLabel} — ${(row as any)?.name_human ?? ""}`,
      });

      clearReqQtyInput?.(requestItemId);
    } catch (e: any) {
      setIssueMsg({ kind: "error", text: pickErr(e) });
    } finally {
      setIssueBusy(false);
    }
  }

  return { submitReqPick, submitStockPick, issueByRequestItem };
}
