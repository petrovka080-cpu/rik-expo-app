// src/screens/warehouse/warehouse.issue.ts
import type { ReqItemUiRow, ReqPickLine, StockPickLine } from "./warehouse.types";
import type { AppSupabaseClient } from "../../lib/dbContract.types";
import { ensureRequestItemsBelongToRequest } from "../../lib/api/integrity.guards";
import { normMatCode, normUomId } from "./warehouse.utils";
import {
  issueWarehouseFreeAtomic,
  issueWarehouseRequestAtomic,
} from "./warehouse.issue.repo";

export type IssueMsg = { kind: "error" | "ok" | null; text: string };

const ensureWarehouseRpcData = <T,>(value: T | null | undefined, message: string): T => {
  if (value == null) throw new Error(message);
  return value;
};

const DUPLICATE_ISSUE_SUBMIT_MESSAGE =
  "\u041e\u043f\u0435\u0440\u0430\u0446\u0438\u044f \u0443\u0436\u0435 \u0432\u044b\u043f\u043e\u043b\u043d\u044f\u0435\u0442\u0441\u044f. \u0414\u043e\u0436\u0434\u0438\u0442\u0435\u0441\u044c \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u044f.";

const buildWarehouseIssueMutationId = (kind: "req_pick" | "stock_pick" | "request_item"): string => {
  const cryptoLike =
    typeof globalThis !== "undefined"
      ? (globalThis as typeof globalThis & {
          crypto?: {
            randomUUID?: () => string;
            getRandomValues?: (array: Uint8Array) => Uint8Array;
          };
        }).crypto
      : undefined;

  if (typeof cryptoLike?.randomUUID === "function") {
    return cryptoLike.randomUUID();
  }

  if (typeof cryptoLike?.getRandomValues === "function") {
    const bytes = cryptoLike.getRandomValues(new Uint8Array(8));
    const suffix = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `warehouse-issue:${kind}:${Date.now().toString(36)}:${suffix}`;
  }

  return `warehouse-issue:${kind}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
};

export function makeWarehouseIssueActions(args: {
  supabase: AppSupabaseClient;

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
  const getObjName = () => toNull(getObjectLabel?.());
  const getWorkName = () => toNull(getWorkLabel?.());
  let reqPickInFlight = false;
  let stockPickInFlight = false;
  let requestItemInFlight = false;

  const tryBeginIssueSubmit = (kind: "req_pick" | "stock_pick" | "request_item") => {
    const busy =
      kind === "req_pick"
        ? reqPickInFlight
        : kind === "stock_pick"
          ? stockPickInFlight
          : requestItemInFlight;
    if (busy) {
      setIssueMsg({ kind: "error", text: DUPLICATE_ISSUE_SUBMIT_MESSAGE });
      return false;
    }

    if (kind === "req_pick") reqPickInFlight = true;
    else if (kind === "stock_pick") stockPickInFlight = true;
    else requestItemInFlight = true;
    return true;
  };

  const endIssueSubmit = (kind: "req_pick" | "stock_pick" | "request_item") => {
    if (kind === "req_pick") reqPickInFlight = false;
    else if (kind === "stock_pick") stockPickInFlight = false;
    else requestItemInFlight = false;
  };

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

    if (!tryBeginIssueSubmit("req_pick")) return false;
    setIssueBusy(true);
    setIssueMsg({ kind: null, text: "" });

    try {
      await ensureRequestItemsBelongToRequest(
        supabase,
        rid,
        lines.map((line) => String(line.request_item_id ?? "").trim()),
        {
          screen: "warehouse",
          surface: "issue_req_pick",
          sourceKind: "mutation:warehouse_issue",
        },
      );

      const note = [
        "Выдача по заявке",
        input.requestDisplayNo ? `Заявка: ${input.requestDisplayNo}` : null,
        getWarehousemanFio() ? `Кладовщик: ${getWarehousemanFio()}` : null
      ]
        .filter(Boolean)
        .join(" · ");
      const byId: Record<string, ReqItemUiRow> = {};
      const issueLines: {
        rik_code: string;
        uom_id: string;
        qty: number;
        request_item_id: string | null;
      }[] = [];
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
          issueLines.push({
            rik_code: ln.rik_code,
            uom_id: uomCode,
            qty: qtyInReq,
            request_item_id: ln.request_item_id,
          });
        }

        if (qtyOver > 0) {
          issueLines.push({
            rik_code: ln.rik_code,
            uom_id: uomCode,
            qty: qtyOver,
            request_item_id: null,
          });
        }
      }

      const r = await issueWarehouseRequestAtomic(supabase, {
        p_who: who,
        p_note: note,
        p_request_id: rid,
        p_object_name: getObjName(),
        p_work_name: getWorkName(),
        p_lines: issueLines,
        p_client_mutation_id: buildWarehouseIssueMutationId("req_pick"),
      });
      if (r.error) throw r.error;
      ensureWarehouseRpcData(r.data ?? true, "Сервер не подтвердил выдачу по заявке");

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
      endIssueSubmit("req_pick");
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

    if (!tryBeginIssueSubmit("stock_pick")) return false;
    setIssueBusy(true);
    setIssueMsg({ kind: null, text: "" });

    try {
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
        p_client_mutation_id: buildWarehouseIssueMutationId("stock_pick"),
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
      ensureWarehouseRpcData(r.data ?? true, "Сервер не подтвердил выдачу со склада");

      await fetchStock();
      clearStockPick();

      setIssueMsg({ kind: "ok", text: `✓ Выдано позиций: ${lines.length}` });
      return true;
    } catch (e: unknown) {
      setIssueMsg({ kind: "error", text: pickErr(e) });
      return false;
    } finally {
      endIssueSubmit("stock_pick");
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

    if (!tryBeginIssueSubmit("request_item")) return false;
    setIssueBusy(true);
    setIssueMsg({ kind: null, text: "" });

    try {
      await ensureRequestItemsBelongToRequest(
        supabase,
        requestId,
        [requestItemId],
        {
          screen: "warehouse",
          surface: "issue_request_item",
          sourceKind: "mutation:warehouse_issue",
        },
      );

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

      const uomCode = String((row )?.uom ?? "").trim();
      if (!uomCode) throw new Error(`Пустой uom у ${(row )?.rik_code}`);

      const r = await issueWarehouseRequestAtomic(supabase, {
        p_who: who,
        p_note: note,
        p_request_id: requestId,
        p_object_name: getObjName(),
        p_work_name: getWorkName(),
        p_lines: [
          {
            rik_code: (row ).rik_code,
            uom_id: uomCode,
            qty,
            request_item_id: requestItemId,
          },
        ],
        p_client_mutation_id: buildWarehouseIssueMutationId("request_item"),
      });
      if (r.error) throw r.error;
      ensureWarehouseRpcData(r.data ?? true, "Сервер не подтвердил точечную выдачу");

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
      endIssueSubmit("request_item");
      setIssueBusy(false);
    }
  }

  return { submitReqPick, submitStockPick, issueByRequestItem };
}

