import type { Database } from "../../lib/database.types";
import { supabase } from "../../lib/supabaseClient";
import type {
  DirectorFinancePanelScope,
  DirectorFinancePanelScopeV2,
  DirectorFinancePanelScopeV3,
  DirectorFinanceSummaryV2,
  FinSupplierPanelState,
  FinRep,
} from "./director.finance.types";
import {
  DASH,
  adaptDirectorFinancePanelScopePayload,
  adaptDirectorFinancePanelScopeV2Payload,
  adaptDirectorFinancePanelScopeV3Payload,
  adaptDirectorFinanceSummaryPayload,
  adaptDirectorFinanceSummaryV2Payload,
  asFinanceRecord,
  financeText,
  financeTextOrFallback,
  nnum,
  pickIso10,
} from "./director.finance.shared";

const FINANCE_SUMMARY_RPC_NAME = "director_finance_fetch_summary_v1";
const FINANCE_PANEL_SCOPE_RPC_NAME = "director_finance_panel_scope_v1";
const FINANCE_PANEL_SCOPE_V2_RPC_NAME = "director_finance_panel_scope_v2";
const FINANCE_PANEL_SCOPE_V3_RPC_NAME = "director_finance_panel_scope_v3";
const FINANCE_SUMMARY_V2_RPC_NAME = "director_finance_summary_v2";
const FINANCE_SUPPLIER_SCOPE_RPC_NAME = "director_finance_supplier_scope_v1";
const FINANCE_SUPPLIER_SCOPE_V2_RPC_NAME = "director_finance_supplier_scope_v2";
const FINANCE_SUMMARY_FAILED_COOLDOWN_MS = 10 * 60 * 1000;

type RuntimeProcessEnv = { process?: { env?: Record<string, unknown> } };
type FinanceRpcStatus = "unknown" | "available" | "missing" | "failed";

const readRuntimeEnvFlag = (key: string, fallback: string): string =>
  String(((globalThis as unknown as RuntimeProcessEnv).process?.env ?? {})[key] ?? fallback).trim();

const DIRECTOR_FINANCE_SUMMARY_RPC_ENABLED =
  readRuntimeEnvFlag("EXPO_PUBLIC_DIRECTOR_FINANCE_SUMMARY_RPC", "1") !== "0";

const financeSummaryRpcMeta: { status: FinanceRpcStatus; updatedAt: number } = {
  status: "unknown",
  updatedAt: 0,
};
const financePanelScopeRpcMeta: { status: FinanceRpcStatus; updatedAt: number } = {
  status: "unknown",
  updatedAt: 0,
};
const financePanelScopeV2RpcMeta: { status: FinanceRpcStatus; updatedAt: number } = {
  status: "unknown",
  updatedAt: 0,
};
const financePanelScopeV3RpcMeta: { status: FinanceRpcStatus; updatedAt: number } = {
  status: "unknown",
  updatedAt: 0,
};
const financeSummaryV2RpcMeta: { status: FinanceRpcStatus; updatedAt: number } = {
  status: "unknown",
  updatedAt: 0,
};
const financeSupplierScopeRpcMeta: { status: FinanceRpcStatus; updatedAt: number } = {
  status: "unknown",
  updatedAt: 0,
};
const financeSupplierScopeV2RpcMeta: { status: FinanceRpcStatus; updatedAt: number } = {
  status: "unknown",
  updatedAt: 0,
};

const markFinanceRpcStatus = (
  meta: { status: FinanceRpcStatus; updatedAt: number },
  status: FinanceRpcStatus,
) => {
  meta.status = status;
  meta.updatedAt = Date.now();
};

const isMissingFinanceRpcError = (error: unknown, fnName: string): boolean => {
  const errorRecord = asFinanceRecord(error);
  const message = String(errorRecord.message ?? error ?? "").toLowerCase();
  const details = String(errorRecord.details ?? "").toLowerCase();
  const hint = String(errorRecord.hint ?? "").toLowerCase();
  const code = String(errorRecord.code ?? "").toLowerCase();
  const text = `${message} ${details} ${hint}`;
  return (
    text.includes(`function public.${fnName.toLowerCase()}`) ||
    text.includes("could not find the function") ||
    code === "pgrst202"
  );
};

const canUseFinanceRpc = (meta: { status: FinanceRpcStatus; updatedAt: number }): boolean => {
  if (!DIRECTOR_FINANCE_SUMMARY_RPC_ENABLED) return false;
  if (meta.status === "missing") return false;
  if (
    meta.status === "failed" &&
    Date.now() - meta.updatedAt < FINANCE_SUMMARY_FAILED_COOLDOWN_MS
  ) {
    return false;
  }
  return true;
};

const normalizeFinanceRpcInteger = (value: unknown, fallback: number): number => {
  const numeric = Number(value ?? fallback);
  if (!Number.isFinite(numeric) || numeric === 0) return fallback;
  return Math.trunc(numeric);
};

export async function fetchDirectorFinanceSummaryViaRpc(opts?: {
  periodFromIso?: string | null;
  periodToIso?: string | null;
  dueDaysDefault?: number;
  criticalDays?: number;
}): Promise<FinRep | null> {
  if (!canUseFinanceRpc(financeSummaryRpcMeta)) return null;

  const args: Database["public"]["Functions"]["director_finance_fetch_summary_v1"]["Args"] = {
    p_from: pickIso10(opts?.periodFromIso),
    p_to: pickIso10(opts?.periodToIso),
    p_due_days: normalizeFinanceRpcInteger(opts?.dueDaysDefault, 7),
    p_critical_days: normalizeFinanceRpcInteger(opts?.criticalDays, 14),
  };

  const { data, error } = await supabase.rpc(FINANCE_SUMMARY_RPC_NAME, args);
  if (error) {
    markFinanceRpcStatus(
      financeSummaryRpcMeta,
      isMissingFinanceRpcError(error, FINANCE_SUMMARY_RPC_NAME) ? "missing" : "failed",
    );
    throw error;
  }

  markFinanceRpcStatus(financeSummaryRpcMeta, "available");
  return adaptDirectorFinanceSummaryPayload(data);
}

export async function fetchDirectorFinanceSummaryV2ViaRpc(opts?: {
  objectId?: string | null;
  periodFromIso?: string | null;
  periodToIso?: string | null;
}): Promise<DirectorFinanceSummaryV2 | null> {
  if (!canUseFinanceRpc(financeSummaryV2RpcMeta)) return null;

  const args: Database["public"]["Functions"]["director_finance_summary_v2"]["Args"] = {
    p_object_id: financeText(opts?.objectId) || undefined,
    p_date_from: pickIso10(opts?.periodFromIso) ?? undefined,
    p_date_to: pickIso10(opts?.periodToIso) ?? undefined,
  };

  const { data, error } = await supabase.rpc(FINANCE_SUMMARY_V2_RPC_NAME, args);
  if (error) {
    markFinanceRpcStatus(
      financeSummaryV2RpcMeta,
      isMissingFinanceRpcError(error, FINANCE_SUMMARY_V2_RPC_NAME) ? "missing" : "failed",
    );
    throw error;
  }

  markFinanceRpcStatus(financeSummaryV2RpcMeta, "available");
  return adaptDirectorFinanceSummaryV2Payload(data);
}

export async function fetchDirectorFinancePanelScopeV3ViaRpc(opts?: {
  objectId?: string | null;
  periodFromIso?: string | null;
  periodToIso?: string | null;
  dueDaysDefault?: number;
  criticalDays?: number;
  limit?: number;
  offset?: number;
}): Promise<DirectorFinancePanelScopeV3 | null> {
  if (!canUseFinanceRpc(financePanelScopeV3RpcMeta)) return null;

  const args: Database["public"]["Functions"]["director_finance_panel_scope_v3"]["Args"] = {
    p_object_id: financeText(opts?.objectId) || undefined,
    p_date_from: pickIso10(opts?.periodFromIso) ?? undefined,
    p_date_to: pickIso10(opts?.periodToIso) ?? undefined,
    p_due_days: normalizeFinanceRpcInteger(opts?.dueDaysDefault, 7),
    p_critical_days: normalizeFinanceRpcInteger(opts?.criticalDays, 14),
    p_limit: normalizeFinanceRpcInteger(opts?.limit, 50),
    p_offset: Math.max(0, nnum(opts?.offset)),
  };

  const { data, error } = await supabase.rpc(FINANCE_PANEL_SCOPE_V3_RPC_NAME, args);
  if (error) {
    markFinanceRpcStatus(
      financePanelScopeV3RpcMeta,
      isMissingFinanceRpcError(error, FINANCE_PANEL_SCOPE_V3_RPC_NAME) ? "missing" : "failed",
    );
    throw error;
  }

  markFinanceRpcStatus(financePanelScopeV3RpcMeta, "available");
  return adaptDirectorFinancePanelScopeV3Payload(data);
}

export async function fetchDirectorFinancePanelScopeV2ViaRpc(opts?: {
  objectId?: string | null;
  periodFromIso?: string | null;
  periodToIso?: string | null;
  limit?: number;
  offset?: number;
}): Promise<DirectorFinancePanelScopeV2 | null> {
  if (!canUseFinanceRpc(financePanelScopeV2RpcMeta)) return null;

  const args: Database["public"]["Functions"]["director_finance_panel_scope_v2"]["Args"] = {
    p_object_id: financeText(opts?.objectId) || undefined,
    p_date_from: pickIso10(opts?.periodFromIso) ?? undefined,
    p_date_to: pickIso10(opts?.periodToIso) ?? undefined,
    p_limit: normalizeFinanceRpcInteger(opts?.limit, 50),
    p_offset: Math.max(0, nnum(opts?.offset)),
  };

  const { data, error } = await supabase.rpc(FINANCE_PANEL_SCOPE_V2_RPC_NAME, args);
  if (error) {
    markFinanceRpcStatus(
      financePanelScopeV2RpcMeta,
      isMissingFinanceRpcError(error, FINANCE_PANEL_SCOPE_V2_RPC_NAME) ? "missing" : "failed",
    );
    throw error;
  }

  markFinanceRpcStatus(financePanelScopeV2RpcMeta, "available");
  return adaptDirectorFinancePanelScopeV2Payload(data);
}

export async function fetchDirectorFinancePanelScopeViaRpc(opts?: {
  periodFromIso?: string | null;
  periodToIso?: string | null;
  dueDaysDefault?: number;
  criticalDays?: number;
}): Promise<DirectorFinancePanelScope | null> {
  if (!canUseFinanceRpc(financePanelScopeRpcMeta)) return null;

  const args: Database["public"]["Functions"]["director_finance_panel_scope_v1"]["Args"] = {
    p_from: pickIso10(opts?.periodFromIso),
    p_to: pickIso10(opts?.periodToIso),
    p_due_days: normalizeFinanceRpcInteger(opts?.dueDaysDefault, 7),
    p_critical_days: normalizeFinanceRpcInteger(opts?.criticalDays, 14),
  };

  const { data, error } = await supabase.rpc(FINANCE_PANEL_SCOPE_RPC_NAME, args);
  if (error) {
    markFinanceRpcStatus(
      financePanelScopeRpcMeta,
      isMissingFinanceRpcError(error, FINANCE_PANEL_SCOPE_RPC_NAME) ? "missing" : "failed",
    );
    throw error;
  }

  markFinanceRpcStatus(financePanelScopeRpcMeta, "available");
  return adaptDirectorFinancePanelScopePayload(data);
}

export async function fetchDirectorFinanceSupplierScopeViaRpc(opts: {
  supplier: string;
  kindName?: string | null;
  periodFromIso?: string | null;
  periodToIso?: string | null;
  dueDaysDefault?: number;
  criticalDays?: number;
}): Promise<FinSupplierPanelState | null> {
  const supplier = financeText(opts.supplier);
  if (!supplier) return null;
  if (!canUseFinanceRpc(financeSupplierScopeRpcMeta)) return null;

  const args: Database["public"]["Functions"]["director_finance_supplier_scope_v1"]["Args"] = {
    p_supplier: supplier,
    p_kind_name: financeText(opts.kindName) || null,
    p_from: pickIso10(opts.periodFromIso),
    p_to: pickIso10(opts.periodToIso),
    p_due_days: normalizeFinanceRpcInteger(opts.dueDaysDefault, 7),
    p_critical_days: normalizeFinanceRpcInteger(opts.criticalDays, 14),
  };

  const { data, error } = await supabase.rpc(FINANCE_SUPPLIER_SCOPE_RPC_NAME, args);
  if (error) {
    markFinanceRpcStatus(
      financeSupplierScopeRpcMeta,
      isMissingFinanceRpcError(error, FINANCE_SUPPLIER_SCOPE_RPC_NAME) ? "missing" : "failed",
    );
    throw error;
  }

  markFinanceRpcStatus(financeSupplierScopeRpcMeta, "available");
  const payload = asFinanceRecord(data);
  return {
    supplier: financeTextOrFallback(payload.supplier, supplier),
    amount: nnum(payload.amount),
    count: nnum(payload.count),
    approved: nnum(payload.approved),
    paid: nnum(payload.paid),
    toPay: nnum(payload.toPay),
    overdueCount: nnum(payload.overdueCount),
    criticalCount: nnum(payload.criticalCount),
    _kindName: financeText(payload.kindName) || null,
    kindName: financeText(payload.kindName) || null,
    invoices: Array.isArray(payload.invoices)
      ? payload.invoices.map((item) => {
          const row = asFinanceRecord(item);
          return {
            id: financeTextOrFallback(row.id, DASH),
            title: financeTextOrFallback(row.title, "\u0421\u0447\u0451\u0442"),
            amount: nnum(row.amount),
            paid: nnum(row.paid),
            rest: nnum(row.rest),
            isOverdue: !!row.isOverdue,
            isCritical: !!row.isCritical,
            approvedIso: pickIso10(row.approvedIso),
            invoiceIso: pickIso10(row.invoiceIso),
            dueIso: pickIso10(row.dueIso),
          };
        })
      : [],
  };
}

export async function fetchDirectorFinanceSupplierScopeV2ViaRpc(opts: {
  supplier: string;
  kindName?: string | null;
  objectId?: string | null;
  periodFromIso?: string | null;
  periodToIso?: string | null;
  dueDaysDefault?: number;
  criticalDays?: number;
}): Promise<FinSupplierPanelState | null> {
  const supplier = financeText(opts.supplier);
  if (!supplier) return null;
  if (!canUseFinanceRpc(financeSupplierScopeV2RpcMeta)) return null;

  const args: Database["public"]["Functions"]["director_finance_supplier_scope_v2"]["Args"] = {
    p_supplier: supplier,
    p_kind_name: financeText(opts.kindName) || null,
    p_object_id: financeText(opts.objectId) || undefined,
    p_from: pickIso10(opts.periodFromIso),
    p_to: pickIso10(opts.periodToIso),
    p_due_days: normalizeFinanceRpcInteger(opts.dueDaysDefault, 7),
    p_critical_days: normalizeFinanceRpcInteger(opts.criticalDays, 14),
  };

  const { data, error } = await supabase.rpc(FINANCE_SUPPLIER_SCOPE_V2_RPC_NAME, args);
  if (error) {
    markFinanceRpcStatus(
      financeSupplierScopeV2RpcMeta,
      isMissingFinanceRpcError(error, FINANCE_SUPPLIER_SCOPE_V2_RPC_NAME) ? "missing" : "failed",
    );
    throw error;
  }

  markFinanceRpcStatus(financeSupplierScopeV2RpcMeta, "available");
  const payload = asFinanceRecord(data);
  const supplierName =
    financeText(payload.supplierName ?? payload.supplier_name ?? payload.supplier) || supplier;
  const summary = asFinanceRecord(payload.summary);
  const amount = nnum(payload.amount ?? summary.debt);
  const count = nnum(payload.count ?? summary.invoiceCount ?? summary.invoice_count);
  const overdueCount = nnum(payload.overdueCount ?? summary.overdueCount ?? summary.overdue_count);
  const criticalCount = nnum(
    payload.criticalCount ?? summary.criticalCount ?? summary.critical_count,
  );
  return {
    supplier: supplierName,
    amount,
    count,
    approved: nnum(payload.approved ?? summary.payable),
    paid: nnum(payload.paid ?? summary.paid),
    toPay: nnum(payload.toPay ?? summary.debt),
    overdueCount,
    criticalCount,
    _kindName: financeText(payload.kindName ?? payload.kind_name) || null,
    kindName: financeText(payload.kindName ?? payload.kind_name) || null,
    invoices: Array.isArray(payload.invoices)
      ? payload.invoices.map((item) => {
          const row = asFinanceRecord(item);
          return {
            id: financeTextOrFallback(row.id, DASH),
            title: financeTextOrFallback(row.title, "\u0421\u0447\u0451\u0442"),
            amount: nnum(row.amount),
            paid: nnum(row.paid),
            rest: nnum(row.rest),
            isOverdue: !!row.isOverdue,
            isCritical: !!row.isCritical,
            approvedIso: pickIso10(row.approvedIso),
            invoiceIso: pickIso10(row.invoiceIso),
            dueIso: pickIso10(row.dueIso),
          };
        })
      : [],
  };
}
