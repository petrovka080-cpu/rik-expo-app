import { supabase } from "../../lib/supabaseClient";
import { normalizeAccountantInboxRpcTab } from "../../lib/api/accountant";
import { filterProposalLinkedRowsByExistingProposalLinks } from "../../lib/api/integrity.guards";
import {
  isRpcRecord,
  isRpcRowsEnvelope,
  validateRpcResponse,
} from "../../lib/api/queryBoundary";
import {
  beginPlatformObservability,
  recordPlatformObservability,
} from "../../lib/observability/platformObservability";
import { trackRpcLatency } from "../../lib/observability/rpcLatencyMetrics";
import {
  callAccountantInboxScopeRpc,
  type AccountantInboxScopeRpcArgs,
} from "./accountant.inbox.transport";
import type { AccountantInboxUiRow, Tab } from "./types";

type AccountantInboxScopeRow = {
  proposal_id?: string | null;
  proposal_no?: string | null;
  id_short?: string | null;
  supplier?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  invoice_amount?: number | string | null;
  outstanding_amount?: number | string | null;
  invoice_currency?: string | null;
  payment_status?: string | null;
  total_paid?: number | string | null;
  payments_count?: number | string | null;
  has_invoice?: boolean | null;
  sent_to_accountant_at?: string | null;
  payment_eligible?: boolean | null;
  failure_code?: string | null;
  last_paid_at?: number | string | null;
};

type AccountantInboxScopeEnvelope = {
  rows: AccountantInboxUiRow[];
  meta: Record<string, unknown>;
};

export type AccountantInboxRpcTabContract =
  | { status: "ready"; rpcTab: string }
  | { status: "missing" };

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
    primaryOwner: "rpc_scope_v1";
    fallbackUsed: boolean;
    sourceKind: string;
    parityStatus: "not_checked";
    backendFirstPrimary: boolean;
  };
};

const ACCOUNTANT_INBOX_RPC_SOURCE_KIND = "rpc:accountant_inbox_scope_v1";

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

const toBooleanOrFalse = (value: unknown): boolean => value === true;

const isAccountantInboxScopeRow = (
  value: unknown,
): value is AccountantInboxScopeRow => isRpcRecord(value);

export const resolveAccountantInboxRpcTabContract = (
  tab: Tab,
): AccountantInboxRpcTabContract => {
  const rpcTab = normalizeAccountantInboxRpcTab(tab);
  if (!rpcTab) {
    return { status: "missing" };
  }
  return { status: "ready", rpcTab };
};

export const buildAccountantInboxScopeRpcArgs = (params: {
  tab: Tab;
  offsetRows: number;
  limitRows: number;
}): AccountantInboxScopeRpcArgs => {
  const tabContract = resolveAccountantInboxRpcTabContract(params.tab);
  return {
    p_tab: tabContract.status === "ready" ? tabContract.rpcTab : undefined,
    p_offset: Math.max(0, params.offsetRows),
    p_limit: Math.max(1, params.limitRows),
  };
};

export const adaptAccountantInboxScopeEnvelope = (value: unknown): AccountantInboxScopeEnvelope => {
  const envelope = isRpcRecord(value) ? value : {};
  const rowsRaw = Array.isArray(envelope.rows) ? envelope.rows : [];
  const rows: AccountantInboxUiRow[] = [];
  for (const row of rowsRaw) {
    if (!isAccountantInboxScopeRow(row)) continue;
    const item = row;
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
      outstanding_amount: toNumberOrNull(item.outstanding_amount),
      invoice_currency: toMaybeText(item.invoice_currency) ?? "KGS",
      payment_status: toMaybeText(item.payment_status),
      total_paid: toNumberOrNull(item.total_paid) ?? 0,
      payments_count: toInt(item.payments_count, 0),
      has_invoice: toBooleanOrFalse(item.has_invoice),
      sent_to_accountant_at: toMaybeText(item.sent_to_accountant_at),
      payment_eligible:
        typeof item.payment_eligible === "boolean" ? item.payment_eligible : null,
      failure_code: toMaybeText(item.failure_code),
      last_paid_at: toNumberOrNull(item.last_paid_at),
    });
  }

  return {
    rows,
    meta: isRpcRecord(envelope.meta) ? envelope.meta : {},
  };
};

const errorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (isRpcRecord(error) && typeof error.message === "string") return error.message;
  return String(error);
};

export async function loadAccountantInboxWindowData(params: {
  tab: Tab;
  offsetRows: number;
  limitRows: number;
}): Promise<AccountantInboxWindowLoadResult> {
  const { tab, offsetRows, limitRows } = params;
  const rpcArgs = buildAccountantInboxScopeRpcArgs({
    tab,
    offsetRows,
    limitRows,
  });
  const observation = beginPlatformObservability({
    screen: "accountant",
    surface: "inbox_window",
    category: "fetch",
    event: "load_inbox",
    sourceKind: ACCOUNTANT_INBOX_RPC_SOURCE_KIND,
  });

  try {
    const startedAt = Date.now();
    const { data, error } = await callAccountantInboxScopeRpc(rpcArgs);
    if (error) {
      trackRpcLatency({
        name: "accountant_inbox_scope_v1",
        screen: "accountant",
        surface: "inbox_window",
        durationMs: Date.now() - startedAt,
        status: "error",
        error,
        extra: {
          tab: rpcArgs.p_tab,
          offsetRows: rpcArgs.p_offset,
          limitRows: rpcArgs.p_limit,
        },
      });
      throw error;
    }

    const validated = validateRpcResponse(data, isRpcRowsEnvelope, {
      rpcName: "accountant_inbox_scope_v1",
      caller: "loadAccountantInboxWindowData",
      domain: "accountant",
    });
    const envelope = adaptAccountantInboxScopeEnvelope(validated);
    trackRpcLatency({
      name: "accountant_inbox_scope_v1",
      screen: "accountant",
      surface: "inbox_window",
      durationMs: Date.now() - startedAt,
      status: "success",
      rowCount: envelope.rows.length,
      extra: {
        tab: rpcArgs.p_tab,
        offsetRows: rpcArgs.p_offset,
        limitRows: rpcArgs.p_limit,
      },
    });
    const guarded = await filterProposalLinkedRowsByExistingProposalLinks(supabase, envelope.rows, {
      screen: "accountant",
      surface: "inbox_window",
      sourceKind: ACCOUNTANT_INBOX_RPC_SOURCE_KIND,
      relation: "accountant_inbox.proposal_id->proposals.id",
    });
    const totalRowCount = toInt(envelope.meta.total_row_count, 0);
    const returnedRowCount = toInt(envelope.meta.returned_row_count, guarded.rows.length);

    const result: AccountantInboxWindowLoadResult = {
      rows: guarded.rows,
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
    recordPlatformObservability({
      screen: "accountant",
      surface: "inbox_window",
      category: "fetch",
      event: "load_inbox_primary_rpc",
      result: "error",
      sourceKind: ACCOUNTANT_INBOX_RPC_SOURCE_KIND,
      fallbackUsed: false,
      errorStage: "accountant_inbox_scope_v1",
      errorClass: error instanceof Error ? error.name : undefined,
      errorMessage: errorMessage(error) || undefined,
      extra: {
        tab: rpcArgs.p_tab,
        offsetRows: rpcArgs.p_offset,
        limitRows: rpcArgs.p_limit,
        mode: "primary_fail",
      },
    });
    observation.error(error, {
      rowCount: 0,
      sourceKind: ACCOUNTANT_INBOX_RPC_SOURCE_KIND,
      fallbackUsed: false,
      errorStage: "accountant_inbox_scope_v1",
      extra: {
        tab: rpcArgs.p_tab,
        offsetRows: rpcArgs.p_offset,
        limitRows: rpcArgs.p_limit,
        mode: "primary_fail",
      },
    });
    throw error;
  }
}
