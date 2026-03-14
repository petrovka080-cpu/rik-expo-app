// src/screens/warehouse/warehouse.issue.ts
import type { ReqItemUiRow, ReqPickLine, StockPickLine } from "./warehouse.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normMatCode, normUomId } from "./warehouse.utils";
import {
  addWarehouseIssueItem,
  commitWarehouseIssue,
  createWarehouseIssue,
  issueWarehouseFreeAtomic,
} from "./warehouse.issue.repo";

export type IssueMsg = { kind: "error" | "ok" | null; text: string };

export function makeWarehouseIssueActions(args: {
  supabase: SupabaseClient;

  nz: (v: unknown, d?: number) => number;
  pickErr: (e: unknown) => string;

  // данные/контекст
  getRecipient: () => string; // rec.recipientText.trim()
  getObjectLabel?: () => string;
  getWorkLabel?: () => string;
  getWarehousemanFio: () => string;

  // обновления экрана после выдачи
  fetchStock: () => Promise<void>;
  fetchReqItems: (rid: string) => Promise<void>;
  fetchReqHeads: () => Promise<void>;

  getAvailableByCode: (code: string) => number;
  getAvailableByCodeUom?: (code: string, uomId: string | null) => number;
  getMaterialNameByCode?: (code: string) => string | null;

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
    getWarehousemanFio,

    fetchStock,
    fetchReqItems,
    fetchReqHeads,

    getAvailableByCode,
    getAvailableByCodeUom,
    getMaterialNameByCode,

    setIssueBusy,
    setIssueMsg,

    clearStockPick,
    clearReqPick,
    clearReqQtyInput,
  } = args;

  const toNull = (v: unknown) => {
    const s = String(v ?? "").trim();
    return s ? s : null;
  };
  const buildCodeUomKey = (code: string, uomId: string | null) =>
    `${normMatCode(code)}::${normUomId(uomId ?? "") || "-"}`;

  const getObjName = () => toNull(getObjectLabel?.());
  const getWorkName = () => toNull(getWorkLabel?.());
  const refreshAfterIssueCommit = async (requestId?: string | null) => {
    const refreshTasks: Promise<unknown>[] = [fetchStock(), fetchReqHeads()];
    const rid = String(requestId ?? "").trim();
    if (rid) {
      refreshTasks.push(fetchReqItems(rid));
    }

    const results = await Promise.allSettled(refreshTasks);
    const rejected = results.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (rejected) throw rejected.reason;
  };

  async function submitReqPick(input: {
    requestId: string;
    requestDisplayNo?: string | null;
    reqPick: Record<string, ReqPickLine>;
    reqItems: ReqItemUiRow[];
  }): Promise<boolean> {
    const who = String(getRecipient() ?? "").trim();
    if (!who) {
      setIssueMsg({ kind: "error", text: "Укажите получателя" });
      return false;
    }

    const rid = String(input.requestId ?? "").trim();
    if (!rid) {
      setIssueMsg({ kind: "error", text: "Заявка не выбрана" });
      return false;
    }

    const lines = Object.values(input.reqPick || {});
    if (!lines.length) {
      setIssueMsg({ kind: "error", text: "Корзина пуста" });
      return false;
    }

    setIssueBusy(true);
    setIssueMsg({ kind: null, text: "" });

    try {
      const note = [
        "Выдача по заявке",
        input.requestDisplayNo ? `Заявка: ${input.requestDisplayNo}` : null,
        getWarehousemanFio() ? `Кладовщик: ${getWarehousemanFio()}` : null
      ]
        .filter(Boolean)
        .join(" · ");

      const r1 = await createWarehouseIssue(supabase, {
        p_who: who,
        p_note: note,
        p_request_id: rid,
        p_object_name: getObjName(),
        p_work_name: getWorkName(),
      });
      if (r1.error || !r1.data) throw r1.error;
      const issueId = Number(r1.data);
      const byId: Record<string, ReqItemUiRow> = {};
      for (const it of input.reqItems || []) byId[String(it.request_item_id)] = it;

      for (const ln of lines) {
        const src = byId[String(ln.request_item_id)];
        const canByReq = nz((src )?.qty_left, 0);
        const canByStock = nz((src )?.qty_available, 0);

        const want = nz(ln.qty, 0);
        if (want <= 0) continue;

        if (want > canByStock) {
          throw new Error(`На складе меньше, чем выбрано: ${ln.name_human} (доступно ${canByStock})`);
        }

        const uomCode = String(ln.uom ?? (src )?.uom ?? "").trim();
        if (!uomCode) throw new Error(`Пустой uom у ${ln.rik_code}`);

        const qtyInReq = Math.min(want, canByReq);
        const qtyOver = Math.max(0, want - qtyInReq);

        if (qtyInReq > 0) {
          const rA = await addWarehouseIssueItem(supabase, {
            p_issue_id: issueId,
            p_rik_code: ln.rik_code,
            p_uom_id: uomCode,
            p_qty: qtyInReq,
            p_request_item_id: ln.request_item_id,
          });
          if (rA.error) throw rA.error;
        }

        if (qtyOver > 0) {
          const rB = await addWarehouseIssueItem(supabase, {
            p_issue_id: issueId,
            p_rik_code: ln.rik_code,
            p_uom_id: uomCode,
            p_qty: qtyOver,
            p_request_item_id: null,
          });
          if (rB.error) throw rB.error;
        }
      }

      const r3 = await commitWarehouseIssue(supabase, issueId);
      if (r3.error) throw r3.error;

      clearReqPick();

      // ✅ PROD: очистить инпуты количества по строкам, которые были в корзине
      for (const ln of lines) {
        const id = String(ln.request_item_id ?? "").trim();
        if (id) clearReqQtyInput?.(id);
      }

      await refreshAfterIssueCommit(rid);

      setIssueMsg({ kind: "ok", text: `✓ Выдано по заявке: позиций ${lines.length}` });
      return true;

    } catch (e: unknown) {
      setIssueMsg({ kind: "error", text: pickErr(e) });
      return false;
    } finally {
      setIssueBusy(false);
    }
  }

  async function submitStockPick(input: { stockPick: Record<string, StockPickLine> }): Promise<boolean> {
    const who = String(getRecipient() ?? "").trim();
    if (!who) {
      setIssueMsg({ kind: "error", text: "Укажите получателя" });
      return false;
    }

    const lines = Object.values(input.stockPick || {}).filter(
      (x) => x && x.code && nz(x.qty, 0) > 0
    );

    if (!lines.length) {
      setIssueMsg({ kind: "error", text: "Ничего не выбрано" });
      return false;
    }

    setIssueBusy(true);
    setIssueMsg({ kind: null, text: "" });

    try {
      // Validate cumulative quantity by code+uom before sending batch to RPC.
      const groupedQty: Record<string, number> = {};
      const groupedName: Record<string, string> = {};
      for (const ln of lines) {
        const code = normMatCode(String(ln.code ?? ""));
        const uom = normUomId((ln ).uom_id ?? null);
        const k = buildCodeUomKey(code, uom);
        groupedQty[k] = nz(groupedQty[k], 0) + nz(ln.qty, 0);
        groupedName[k] =
          String((ln ).name ?? "").trim() ||
          String(getMaterialNameByCode?.(code) ?? "").trim() ||
          code;
      }

      for (const k of Object.keys(groupedQty)) {
        const [code, uomRaw] = k.split("::");
        const uom = uomRaw && uomRaw !== "-" ? uomRaw : null;
        const want = nz(groupedQty[k], 0);
        const can =
          typeof getAvailableByCodeUom === "function"
            ? nz(getAvailableByCodeUom(code, uom), 0)
            : nz(getAvailableByCode(code), 0);
        if (want > can) {
          setIssueMsg({
            kind: "error",
            text: `Недостаточно на складе: ${groupedName[k]} (доступно ${can}, выбрано ${want})`,
          });
          return false;
        }
      }

      const payloadLines = lines.map((l) => ({
        rik_code: normMatCode(l.code),
        uom_id: normUomId((l ).uom_id ?? null),
        qty: nz(l.qty, 0),
      }));

      const r = await issueWarehouseFreeAtomic(supabase, {
        p_who: who,
        p_object_name: getObjName(),
        p_work_name: getWorkName(),
        p_note: getWarehousemanFio() ? `Кладовщик: ${getWarehousemanFio()}` : null,
        p_lines: payloadLines,
      });

      if (r.error) {
        const rawMsg = String((r.error )?.message ?? "");
        // Normalize common DB message to user-facing text.
        if (rawMsg.includes("Нельзя выдать больше, чем доступно")) {
          const matCode = String(rawMsg.match(/(MAT-[A-Z0-9\-\._]+)/i)?.[1] ?? "").trim();
          const matName =
            (matCode ? String(getMaterialNameByCode?.(matCode) ?? "").trim() : "") ||
            lines.find((x) => normMatCode(String(x.code ?? "")) === normMatCode(matCode))?.name ||
            matCode;
          const qtyAvail = String(rawMsg.match(/доступно\s+([0-9.,]+)/i)?.[1] ?? "").trim();
          const qtyNeed = String(rawMsg.match(/пытаетесь\s+([0-9.,]+)/i)?.[1] ?? "").trim();
          const details =
            qtyAvail || qtyNeed
              ? ` (доступно ${qtyAvail || "0"}${qtyNeed ? `, запрошено ${qtyNeed}` : ""})`
              : "";
          throw new Error(`Недостаточно на складе: ${matName}${details}`);
        }
        throw r.error;
      }

      await fetchStock();
      clearStockPick();

      setIssueMsg({ kind: "ok", text: `✓ Выдано позиций: ${lines.length}` });
      return true;
    } catch (e: unknown) {
      setIssueMsg({ kind: "error", text: pickErr(e) });
      return false;
    } finally {
      setIssueBusy(false);
    }
  }

  async function issueByRequestItem(input: { row: ReqItemUiRow; qty: number }): Promise<boolean> {
    const who = String(getRecipient() ?? "").trim();
    if (!who) {
      setIssueMsg({ kind: "error", text: "Укажите получателя" });
      return false;
    }

    const row = input.row;
    const requestItemId = String((row )?.request_item_id ?? "").trim();
    const requestId = String((row )?.request_id ?? "").trim();
    if (!requestItemId || !requestId) {
      setIssueMsg({ kind: "error", text: "Пустые ID заявки/строки" });
      return false;
    }

    const qty = Number(input.qty);
    if (!Number.isFinite(qty) || qty <= 0) {
      setIssueMsg({ kind: "error", text: "Введите количество > 0" });
      return false;
    }

    const canNow = nz((row )?.qty_can_issue_now, 0);
    if (qty > canNow) {
      setIssueMsg({ kind: "error", text: `Нельзя больше, чем можно выдать сейчас: ${canNow}` });
      return false;
    }

    setIssueBusy(true);
    setIssueMsg({ kind: null, text: "" });

    try {
      const note = [
        "Выдача по заявке",
        (row )?.display_no ? `Заявка: ${(row ).display_no}` : null,
        (row )?.object_name ? `Объект: ${(row ).object_name}` : null,
        (row )?.level_code ? `Этаж: ${(row ).level_code}` : null,
        (row )?.system_code ? `Система: ${(row ).system_code}` : null,
        (row )?.zone_code ? `Зона: ${(row ).zone_code}` : null,
        getWarehousemanFio() ? `Кладовщик: ${getWarehousemanFio()}` : null,
      ]
        .filter(Boolean)
        .join(" · ");

      const r1 = await createWarehouseIssue(supabase, {
        p_who: who,
        p_note: note,
        p_request_id: requestId,
        p_object_name: getObjName(),
        p_work_name: getWorkName(),
      });
      if (r1.error || !r1.data) throw r1.error;
      const issueId = Number(r1.data);

      const uomCode = String((row )?.uom ?? "").trim();
      if (!uomCode) throw new Error(`Пустой uom у ${(row )?.rik_code}`);

      const r2 = await addWarehouseIssueItem(supabase, {
        p_issue_id: issueId,
        p_rik_code: (row ).rik_code,
        p_uom_id: uomCode,
        p_qty: qty,
        p_request_item_id: requestItemId,
      });
      if (r2.error) throw r2.error;

      const r3 = await commitWarehouseIssue(supabase, issueId);
      if (r3.error) throw r3.error;

      await refreshAfterIssueCommit(requestId);

      const uomLabel = String((row )?.uom ?? "—");
      setIssueMsg({
        kind: "ok",
        text: `✓ Выдано по заявке: ${qty} ${uomLabel} — ${(row )?.name_human ?? ""}`,
      });

      clearReqQtyInput?.(requestItemId);
      return true;
    } catch (e: unknown) {
      setIssueMsg({ kind: "error", text: pickErr(e) });
      return false;
    } finally {
      setIssueBusy(false);
    }
  }

  return { submitReqPick, submitStockPick, issueByRequestItem };
}

