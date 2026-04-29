import { supabase } from "../../lib/supabaseClient";
import { filterPaymentRowsByExistingPaymentProposalLinks } from "../../lib/api/integrity.guards";
import {
  isRpcArrayResponse,
  isRpcRowsEnvelope,
  validateRpcResponse,
} from "../../lib/api/queryBoundary";
import type { AccountantInboxUiRow, HistoryRow } from "./types";

type AccountantHistoryScopeRow = {
  payment_id?: number | string | null;
  paid_at?: string | null;
  proposal_id?: string | null;
  supplier?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  invoice_amount?: number | string | null;
  invoice_currency?: string | null;
  amount?: number | string | null;
  method?: string | null;
  note?: string | null;
  has_invoice?: boolean | null;
  accountant_fio?: string | null;
  purpose?: string | null;
};

type AccountantHistoryScopeEnvelope = {
  rows: HistoryRow[];
  meta: Record<string, unknown>;
};

export type AccountantHistoryWindowMeta = {
  offsetRows: number;
  limitRows: number;
  returnedRowCount: number;
  totalRowCount: number;
  totalAmount: number;
  hasMore: boolean;
  dateFrom: string | null;
  dateTo: string | null;
  search: string | null;
};

export type AccountantHistoryWindowLoadResult = {
  rows: HistoryRow[];
  meta: AccountantHistoryWindowMeta;
  sourceMeta: {
    primaryOwner: "rpc_scope_v1";
    fallbackUsed: boolean;
    sourceKind: string;
    parityStatus: "not_checked";
    backendFirstPrimary: boolean;
  };
};

const ACCOUNTANT_HISTORY_RPC_SOURCE_KIND = "rpc:accountant_history_scope_v1";

const toInt = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : fallback;
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toMaybeText = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text || null;
};

const toRpcOptionalDate = (value: string, toRpcDateOrNull: (v: string) => string | null) =>
  toRpcDateOrNull(value) ?? undefined;

const toRpcOptionalSearch = (value: string) => {
  const search = value?.trim();
  return search || undefined;
};

export const adaptAccountantHistoryScopeEnvelope = (value: unknown): AccountantHistoryScopeEnvelope => {
  const envelope = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const rowsRaw = Array.isArray(envelope.rows) ? envelope.rows : [];
  const rows: HistoryRow[] = [];
  for (const row of rowsRaw) {
    if (!row || typeof row !== "object") continue;
    const item = row as AccountantHistoryScopeRow;
    const paymentId = Number(item.payment_id);
    const proposalId = toMaybeText(item.proposal_id);
    if (!Number.isFinite(paymentId) || !proposalId) continue;
    rows.push({
      payment_id: paymentId,
      paid_at: toMaybeText(item.paid_at) ?? "",
      proposal_id: proposalId,
      supplier: toMaybeText(item.supplier),
      invoice_number: toMaybeText(item.invoice_number),
      invoice_date: toMaybeText(item.invoice_date),
      invoice_amount: Number.isFinite(Number(item.invoice_amount)) ? Number(item.invoice_amount) : null,
      invoice_currency: toMaybeText(item.invoice_currency) ?? "KGS",
      amount: toNumber(item.amount),
      method: toMaybeText(item.method),
      note: toMaybeText(item.note),
      has_invoice: Boolean(item.has_invoice),
      accountant_fio: toMaybeText(item.accountant_fio),
      purpose: toMaybeText(item.purpose),
    });
  }

  return {
    rows,
    meta:
      typeof envelope.meta === "object" && envelope.meta !== null
        ? (envelope.meta as Record<string, unknown>)
        : {},
  };
};

export async function loadAccountantHistoryRows(params: {
  dateFrom: string;
  dateTo: string;
  histSearch: string;
  toRpcDateOrNull: (v: string) => string | null;
}): Promise<HistoryRow[]> {
  const { dateFrom, dateTo, histSearch, toRpcDateOrNull } = params;
  const { data, error } = await supabase.rpc("list_accountant_payments_history_v2", {
    p_date_from: toRpcOptionalDate(dateFrom, toRpcDateOrNull),
    p_date_to: toRpcOptionalDate(dateTo, toRpcDateOrNull),
    p_search: toRpcOptionalSearch(histSearch),
    p_limit: 300,
  });
  if (error) throw error;

  const arr = validateRpcResponse(data, isRpcArrayResponse, {
    rpcName: "list_accountant_payments_history_v2",
    caller: "loadAccountantHistoryRows",
    domain: "accountant",
  }) as HistoryRow[];
  arr.sort((a, b) => {
    const ta = Date.parse(String((a as { paid_at?: string; created_at?: string }).paid_at ?? (a as { created_at?: string }).created_at ?? 0)) || 0;
    const tb = Date.parse(String((b as { paid_at?: string; created_at?: string }).paid_at ?? (b as { created_at?: string }).created_at ?? 0)) || 0;
    return tb - ta;
  });
  return arr;
}

export async function loadAccountantHistoryWindowData(params: {
  dateFrom: string;
  dateTo: string;
  histSearch: string;
  offsetRows: number;
  limitRows: number;
  toRpcDateOrNull: (v: string) => string | null;
}): Promise<AccountantHistoryWindowLoadResult> {
  const { dateFrom, dateTo, histSearch, offsetRows, limitRows, toRpcDateOrNull } = params;

  try {
    const { data, error } = await supabase.rpc("accountant_history_scope_v1", {
      p_date_from: toRpcOptionalDate(dateFrom, toRpcDateOrNull),
      p_date_to: toRpcOptionalDate(dateTo, toRpcDateOrNull),
      p_search: toRpcOptionalSearch(histSearch),
      p_offset: Math.max(0, offsetRows),
      p_limit: Math.max(1, limitRows),
    });
    if (error) throw error;

    const validated = validateRpcResponse(data, isRpcRowsEnvelope, {
      rpcName: "accountant_history_scope_v1",
      caller: "loadAccountantHistoryWindowData",
      domain: "accountant",
    });
    const envelope = adaptAccountantHistoryScopeEnvelope(validated);
    const guarded = await filterPaymentRowsByExistingPaymentProposalLinks(
      supabase,
      envelope.rows,
      {
        screen: "accountant",
        surface: "history_window",
        sourceKind: ACCOUNTANT_HISTORY_RPC_SOURCE_KIND,
        relation: "proposal_payments.id+proposal_id",
      },
    );
    const totalRowCount = toInt(envelope.meta.total_row_count, 0);
    const returnedRowCount = toInt(envelope.meta.returned_row_count, guarded.rows.length);

    return {
      rows: guarded.rows,
      meta: {
        offsetRows: toInt(envelope.meta.offset_rows, Math.max(0, offsetRows)),
        limitRows: toInt(envelope.meta.limit_rows, Math.max(1, limitRows)),
        returnedRowCount,
        totalRowCount,
        totalAmount: toNumber(envelope.meta.total_amount, 0),
        hasMore:
          typeof envelope.meta.has_more === "boolean"
            ? Boolean(envelope.meta.has_more)
            : Math.max(0, offsetRows) + returnedRowCount < totalRowCount,
        dateFrom: toMaybeText(envelope.meta.date_from),
        dateTo: toMaybeText(envelope.meta.date_to),
        search: toMaybeText(envelope.meta.search),
      },
      sourceMeta: {
        primaryOwner: "rpc_scope_v1",
        fallbackUsed: false,
        sourceKind: ACCOUNTANT_HISTORY_RPC_SOURCE_KIND,
        parityStatus: "not_checked",
        backendFirstPrimary: true,
      },
    };
  } catch (error) {
    throw error;
  }
}

export function mapHistoryRowToCurrentRow(params: {
  item: HistoryRow;
  totalPaid: number;
  paymentsCount: number;
  paymentStatus: string;
}): AccountantInboxUiRow {
  const { item, totalPaid, paymentsCount, paymentStatus } = params;
  return {
    proposal_id: String(item.proposal_id),
    supplier: item.supplier,
    invoice_number: item.invoice_number,
    invoice_date: item.invoice_date,
    invoice_amount: item.invoice_amount,
    invoice_currency: item.invoice_currency,
    payment_status: paymentStatus,
    total_paid: Number(totalPaid ?? 0),
    payments_count: Number(paymentsCount ?? 0),
    has_invoice: !!item.has_invoice,
    sent_to_accountant_at: null,
  };
}
