import { supabase } from "../../lib/supabaseClient";
import { listAccountantInbox } from "../../lib/catalog_api";
import { normalizeAccountantInboxRpcTab } from "../../lib/api/accountant";
import {
  beginPlatformObservability,
  recordPlatformObservability,
} from "../../lib/observability/platformObservability";
import type { AccountantInboxUiRow, Tab } from "./types";
import { computePayStatus } from "./accountant.payment";
import { filterRowsByTab, sortRowsByTab } from "./accountant.tabFilter";

type ProposalLiteRaw = {
  id: string | number;
  proposal_no?: string | number | null;
  display_no?: string | number | null;
  id_short?: string | number | null;
  status?: string | null;
  payment_status?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  invoice_amount?: number | null;
  invoice_currency?: string | null;
  supplier?: string | null;
  sent_to_accountant_at?: string | null;
};

type ProposalPaymentAggRaw = {
  proposal_id: string | number;
  amount?: number | null;
  paid_at?: string | null;
  created_at?: string | null;
};

type ProposalItemRaw = {
  proposal_id: string | number;
  qty?: number | null;
  price?: number | null;
};

type ProposalAttachmentRaw = {
  proposal_id: string | number;
};

type AccountantInboxScopeRow = {
  proposal_id?: string | null;
  proposal_no?: string | null;
  id_short?: string | null;
  supplier?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  invoice_amount?: number | string | null;
  invoice_currency?: string | null;
  payment_status?: string | null;
  total_paid?: number | string | null;
  payments_count?: number | string | null;
  has_invoice?: boolean | null;
  sent_to_accountant_at?: string | null;
  last_paid_at?: number | string | null;
};

type AccountantInboxScopeEnvelope = {
  rows: AccountantInboxUiRow[];
  meta: Record<string, unknown>;
};

export type AccountantInboxWindowMeta = {
  offsetRows: number;
  limitRows: number;
  returnedRowCount: number;
  totalRowCount: number;
  hasMore: boolean;
  tab: string | null;
};

export type AccountantInboxWindowLoadResult = {
  rows: AccountantInboxUiRow[];
  meta: AccountantInboxWindowMeta;
  sourceMeta: {
    primaryOwner: "rpc_scope_v1" | "legacy_client_window";
    fallbackUsed: boolean;
    sourceKind: string;
    parityStatus: "not_checked";
    backendFirstPrimary: boolean;
  };
  nextTriedRpcOk: boolean;
};

const ACCOUNTANT_INBOX_RPC_SOURCE_KIND = "rpc:accountant_inbox_scope_v1";
const ACCOUNTANT_INBOX_LEGACY_SOURCE_KIND = "rpc:list_accountant_inbox_fact+client_window";

const toInt = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : fallback;
};

const toNumberOrNull = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toMaybeText = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text || null;
};

export const adaptAccountantInboxScopeEnvelope = (value: unknown): AccountantInboxScopeEnvelope => {
  const envelope = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const rowsRaw = Array.isArray(envelope.rows) ? envelope.rows : [];
  const rows: AccountantInboxUiRow[] = [];
  for (const row of rowsRaw) {
    if (!row || typeof row !== "object") continue;
    const item = row as AccountantInboxScopeRow;
    const proposalId = toMaybeText(item.proposal_id);
    if (!proposalId) continue;
    rows.push({
      proposal_id: proposalId,
      proposal_no: toMaybeText(item.proposal_no),
      id_short: toMaybeText(item.id_short),
      supplier: toMaybeText(item.supplier),
      invoice_number: toMaybeText(item.invoice_number),
      invoice_date: toMaybeText(item.invoice_date),
      invoice_amount: toNumberOrNull(item.invoice_amount),
      invoice_currency: toMaybeText(item.invoice_currency) ?? "KGS",
      payment_status: toMaybeText(item.payment_status),
      total_paid: toNumberOrNull(item.total_paid) ?? 0,
      payments_count: toInt(item.payments_count, 0),
      has_invoice: Boolean(item.has_invoice),
      sent_to_accountant_at: toMaybeText(item.sent_to_accountant_at),
      last_paid_at: toNumberOrNull(item.last_paid_at),
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

const shouldDisableInboxRpc = (msg: string) =>
  msg.includes("Could not find") || msg.includes("/rpc/list_accountant_inbox") || msg.includes("404");

const errorMessage = (e: unknown) => {
  const x = e as { message?: string };
  return x?.message ?? String(e);
};

export async function loadAccountantInboxViaRpc(params: {
  tab: Tab;
  triedRpcOk: boolean;
}): Promise<{ data: AccountantInboxUiRow[]; rpcFailed: boolean; nextTriedRpcOk: boolean }> {
  const { tab, triedRpcOk } = params;
  if (!triedRpcOk) {
    return { data: [], rpcFailed: false, nextTriedRpcOk: false };
  }

  const observation = beginPlatformObservability({
    screen: "accountant",
    surface: "inbox_legacy_rpc",
    category: "fetch",
    event: "load_inbox",
    sourceKind: "rpc:list_accountant_inbox",
  });

  try {
    const list = await listAccountantInbox(tab);
    const result = {
      data: Array.isArray(list) ? list : [],
      rpcFailed: false,
      nextTriedRpcOk: true,
    };
    observation.success({
      rowCount: result.data.length,
      extra: {
        tab: normalizeAccountantInboxRpcTab(tab),
      },
    });
    return result;
  } catch (e: unknown) {
    const msg = errorMessage(e);
    const nextTriedRpcOk = shouldDisableInboxRpc(msg) ? false : triedRpcOk;
    observation.error(e, {
      rowCount: 0,
      fallbackUsed: true,
      errorStage: "list_accountant_inbox",
      extra: {
        tab: normalizeAccountantInboxRpcTab(tab),
        nextTriedRpcOk,
        mode: "fallback",
      },
    });
    return {
      data: [],
      rpcFailed: true,
      nextTriedRpcOk,
    };
  }
}

export async function loadAccountantInboxLegacyData(params: {
  tab: Tab;
  triedRpcOk: boolean;
}): Promise<{
  rows: AccountantInboxUiRow[];
  sourceKind: string;
  nextTriedRpcOk: boolean;
}> {
  const { tab, triedRpcOk } = params;
  const rpc = await loadAccountantInboxViaRpc({ tab, triedRpcOk });
  let rows = rpc.data;
  let sourceKind = "rpc:list_accountant_inbox";

  if (rpc.rpcFailed || !rpc.nextTriedRpcOk) {
    sourceKind = "fallback:proposals";
    const { data: props } = await supabase
      .from("proposals")
      .select("id, proposal_no, display_no, id_short, status, payment_status, invoice_number, invoice_date, invoice_amount, invoice_currency, supplier, sent_to_accountant_at")
      .not("sent_to_accountant_at", "is", null)
      .order("sent_to_accountant_at", { ascending: false, nullsFirst: false });
    rows = await mapAccountantFallbackPropsToInboxRows(props);
  }

  const filtered = filterRowsByTab(rows || [], tab);
  const sorted = sortRowsByTab(filtered, tab);

  return {
    rows: sorted,
    sourceKind,
    nextTriedRpcOk: rpc.nextTriedRpcOk,
  };
}

const sliceAccountantInboxRowsWindow = (params: {
  rows: AccountantInboxUiRow[];
  tab: Tab;
  offsetRows: number;
  limitRows: number;
  sourceKind: string;
  nextTriedRpcOk: boolean;
}): AccountantInboxWindowLoadResult => {
  const { rows, tab, offsetRows, limitRows, sourceKind, nextTriedRpcOk } = params;
  const normalizedOffset = Math.max(0, offsetRows);
  const normalizedLimit = Math.max(1, limitRows);
  const pageRows = rows.slice(normalizedOffset, normalizedOffset + normalizedLimit);

  return {
    rows: pageRows,
    meta: {
      offsetRows: normalizedOffset,
      limitRows: normalizedLimit,
      returnedRowCount: pageRows.length,
      totalRowCount: rows.length,
      hasMore: normalizedOffset + pageRows.length < rows.length,
      tab: normalizeAccountantInboxRpcTab(tab),
    },
    sourceMeta: {
      primaryOwner: "legacy_client_window",
      fallbackUsed: false,
      sourceKind: `${sourceKind}+client_window`,
      parityStatus: "not_checked",
      backendFirstPrimary: false,
    },
    nextTriedRpcOk,
  };
};

export async function loadAccountantInboxWindowData(params: {
  tab: Tab;
  triedRpcOk: boolean;
  offsetRows: number;
  limitRows: number;
}): Promise<AccountantInboxWindowLoadResult> {
  const { tab, triedRpcOk, offsetRows, limitRows } = params;
  const observation = beginPlatformObservability({
    screen: "accountant",
    surface: "inbox_window",
    category: "fetch",
    event: "load_inbox",
    sourceKind: ACCOUNTANT_INBOX_RPC_SOURCE_KIND,
  });

  try {
    const { data, error } = await supabase.rpc("accountant_inbox_scope_v1", {
      p_tab: normalizeAccountantInboxRpcTab(tab),
      p_offset: Math.max(0, offsetRows),
      p_limit: Math.max(1, limitRows),
    });
    if (error) throw error;

    const envelope = adaptAccountantInboxScopeEnvelope(data);
    const totalRowCount = toInt(envelope.meta.total_row_count, 0);
    const returnedRowCount = toInt(envelope.meta.returned_row_count, envelope.rows.length);

    const result: AccountantInboxWindowLoadResult = {
      rows: envelope.rows,
      meta: {
        offsetRows: toInt(envelope.meta.offset_rows, Math.max(0, offsetRows)),
        limitRows: toInt(envelope.meta.limit_rows, Math.max(1, limitRows)),
        returnedRowCount,
        totalRowCount,
        hasMore:
          typeof envelope.meta.has_more === "boolean"
            ? Boolean(envelope.meta.has_more)
            : Math.max(0, offsetRows) + returnedRowCount < totalRowCount,
        tab: toMaybeText(envelope.meta.tab),
      },
      sourceMeta: {
        primaryOwner: "rpc_scope_v1",
        fallbackUsed: false,
        sourceKind: ACCOUNTANT_INBOX_RPC_SOURCE_KIND,
        parityStatus: "not_checked",
        backendFirstPrimary: true,
      },
      nextTriedRpcOk: triedRpcOk,
    };
    observation.success({
      rowCount: result.rows.length,
      sourceKind: ACCOUNTANT_INBOX_RPC_SOURCE_KIND,
      fallbackUsed: false,
      extra: {
        tab: result.meta.tab,
        returnedRowCount: result.meta.returnedRowCount,
        totalRowCount: result.meta.totalRowCount,
      },
    });
    return result;
  } catch (error) {
    const fallbackReason = errorMessage(error);
    recordPlatformObservability({
      screen: "accountant",
      surface: "inbox_window",
      category: "fetch",
      event: "load_inbox_primary_rpc",
      result: "error",
      sourceKind: ACCOUNTANT_INBOX_RPC_SOURCE_KIND,
      fallbackUsed: true,
      errorStage: "accountant_inbox_scope_v1",
      errorClass: error instanceof Error ? error.name : undefined,
      errorMessage: fallbackReason || undefined,
      extra: {
        tab: normalizeAccountantInboxRpcTab(tab),
        offsetRows: Math.max(0, offsetRows),
        limitRows: Math.max(1, limitRows),
        mode: "fallback",
      },
    });
    const legacy = await loadAccountantInboxLegacyData({ tab, triedRpcOk });
    const fallback = sliceAccountantInboxRowsWindow({
      rows: legacy.rows,
      tab,
      offsetRows,
      limitRows,
      sourceKind: legacy.sourceKind,
      nextTriedRpcOk: legacy.nextTriedRpcOk,
    });
    const result: AccountantInboxWindowLoadResult = {
      ...fallback,
      sourceMeta: {
        ...fallback.sourceMeta,
        fallbackUsed: true,
        sourceKind: ACCOUNTANT_INBOX_LEGACY_SOURCE_KIND,
      },
    };
    observation.success({
      rowCount: result.rows.length,
      sourceKind: result.sourceMeta.sourceKind,
      fallbackUsed: true,
      extra: {
        tab: result.meta.tab,
        returnedRowCount: result.meta.returnedRowCount,
        totalRowCount: result.meta.totalRowCount,
        mode: "fallback",
      },
    });
    return result;
  }
}

export async function mapAccountantFallbackPropsToInboxRows(
  props: unknown[] | null | undefined,
): Promise<AccountantInboxUiRow[]> {
  if (!Array.isArray(props) || !props.length) return [];

  const rowsRaw = props as ProposalLiteRaw[];
  const ids = rowsRaw.map((p) => String(p.id));

  const paidMap = new Map<string, { total_paid: number; payments_count: number }>();
  const lastPaidAtMap = new Map<string, number>();
  const itemsSumMap = new Map<string, number>();

  if (ids.length) {
    const { data: pays, error: paysErr } = await supabase
      .from("proposal_payments")
      .select("proposal_id, amount, paid_at, created_at")
      .in("proposal_id", ids);
    if (!paysErr && Array.isArray(pays)) {
      for (const pay of pays as ProposalPaymentAggRaw[]) {
        const k = String(pay.proposal_id);
        const prev = paidMap.get(k) ?? { total_paid: 0, payments_count: 0 };
        prev.total_paid += Number(pay.amount ?? 0);
        prev.payments_count += 1;
        paidMap.set(k, prev);

        const tt = Date.parse(String(pay.paid_at ?? pay.created_at ?? "")) || 0;
        const old = lastPaidAtMap.get(k) ?? 0;
        if (tt > old) lastPaidAtMap.set(k, tt);
      }
    }

    const { data: items, error: itemsErr } = await supabase
      .from("proposal_items")
      .select("proposal_id, qty, price")
      .in("proposal_id", ids);
    if (!itemsErr && Array.isArray(items)) {
      for (const it of items as ProposalItemRaw[]) {
        const pid = String(it.proposal_id);
        const qty = Number(it.qty ?? 0);
        const price = Number(it.price ?? 0);
        itemsSumMap.set(pid, (itemsSumMap.get(pid) ?? 0) + qty * price);
      }
    }
  }

  let haveInvoice = new Set<string>();
  if (ids.length) {
    const q = await supabase
      .from("proposal_attachments")
      .select("proposal_id")
      .eq("group_key", "invoice")
      .in("proposal_id", ids);
    if (!q.error && Array.isArray(q.data)) {
      haveInvoice = new Set((q.data as ProposalAttachmentRaw[]).map((r) => String(r.proposal_id)));
    }
  }

  return rowsRaw.map((p) => {
    const pid = String(p.id);
    const agg = paidMap.get(pid);
    const calcSum = itemsSumMap.get(pid) ?? 0;
    const invoiceSum = Number(p.invoice_amount ?? 0) > 0 ? Number(p.invoice_amount) : calcSum;
    const paid = agg ? agg.total_paid : 0;
    const payStatus = computePayStatus(p.payment_status ?? p.status, invoiceSum, paid);

    return {
      proposal_id: pid,
      proposal_no: p.proposal_no == null ? null : String(p.proposal_no),
      id_short: p.id_short == null ? null : String(p.id_short),
      supplier: p.supplier ?? null,
      invoice_number: p.invoice_number ?? null,
      invoice_date: p.invoice_date ?? null,
      invoice_amount: p.invoice_amount ?? (calcSum > 0 ? calcSum : null),
      invoice_currency: p.invoice_currency ?? "KGS",
      payment_status: payStatus,
      total_paid: agg ? agg.total_paid : 0,
      payments_count: agg ? agg.payments_count : 0,
      has_invoice: haveInvoice.has(pid),
      sent_to_accountant_at: p.sent_to_accountant_at ?? null,
      last_paid_at: lastPaidAtMap.get(pid) ?? 0,
    };
  });
}
