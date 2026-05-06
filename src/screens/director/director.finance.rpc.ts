import { trackRpcLatency } from "../../lib/observability/rpcLatencyMetrics";
import {
  isRpcNonEmptyString,
  isRpcNumberLike,
  isRpcRecord,
  isRpcRecordArray,
  validateRpcResponse,
} from "../../lib/api/queryBoundary";
import { supabase } from "../../lib/supabaseClient";
import type {
  DirectorFinanceFetchSummaryV1Args,
  DirectorFinancePanelScopeV1Args,
  DirectorFinancePanelScopeV2Args,
  DirectorFinancePanelScopeV3Args,
  DirectorFinancePanelScopeV4Args,
  DirectorFinanceSummaryV2Args,
  DirectorFinanceSupplierScopeV1Args,
  DirectorFinanceSupplierScopeV2Args,
} from "../../types/contracts/director";
import type {
  DirectorFinancePanelScope,
  DirectorFinancePanelScopeV2,
  DirectorFinancePanelScopeV3,
  DirectorFinancePanelScopeV4,
  DirectorFinanceSummaryV2,
  FinSupplierPanelState,
  FinRep,
} from "./director.finance.types";
import {
  DASH,
  adaptDirectorFinancePanelScopePayload,
  adaptDirectorFinancePanelScopeV2Payload,
  adaptDirectorFinancePanelScopeV3Payload,
  adaptDirectorFinancePanelScopeV4Payload,
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
const FINANCE_PANEL_SCOPE_V4_RPC_NAME = "director_finance_panel_scope_v4";
const FINANCE_SUMMARY_V2_RPC_NAME = "director_finance_summary_v2";
const FINANCE_SUPPLIER_SCOPE_RPC_NAME = "director_finance_supplier_scope_v1";
const FINANCE_SUPPLIER_SCOPE_V2_RPC_NAME = "director_finance_supplier_scope_v2";
const FINANCE_SUMMARY_FAILED_COOLDOWN_MS = 10 * 60 * 1000;

type DirectorFinanceRpcName =
  | typeof FINANCE_SUMMARY_RPC_NAME
  | typeof FINANCE_PANEL_SCOPE_RPC_NAME
  | typeof FINANCE_PANEL_SCOPE_V2_RPC_NAME
  | typeof FINANCE_PANEL_SCOPE_V3_RPC_NAME
  | typeof FINANCE_PANEL_SCOPE_V4_RPC_NAME
  | typeof FINANCE_SUMMARY_V2_RPC_NAME
  | typeof FINANCE_SUPPLIER_SCOPE_RPC_NAME
  | typeof FINANCE_SUPPLIER_SCOPE_V2_RPC_NAME;

type DirectorFinanceRpcArgs =
  | DirectorFinanceFetchSummaryV1Args
  | DirectorFinancePanelScopeV1Args
  | DirectorFinancePanelScopeV2Args
  | DirectorFinancePanelScopeV3Args
  | DirectorFinancePanelScopeV4Args
  | DirectorFinanceSummaryV2Args
  | DirectorFinanceSupplierScopeV1Args
  | DirectorFinanceSupplierScopeV2Args;

type RuntimeProcessEnv = { process?: { env?: Record<string, unknown> } };
type FinanceRpcStatus = "unknown" | "available" | "missing" | "failed";
type FinanceRpcMeta = { status: FinanceRpcStatus; updatedAt: number };

const readRuntimeEnvFlag = (key: string, fallback: string): string =>
  String(((globalThis as unknown as RuntimeProcessEnv).process?.env ?? {})[key] ?? fallback).trim();

const DIRECTOR_FINANCE_SUMMARY_RPC_ENABLED =
  readRuntimeEnvFlag("EXPO_PUBLIC_DIRECTOR_FINANCE_SUMMARY_RPC", "1") !== "0";

const financeSummaryRpcMeta: FinanceRpcMeta = {
  status: "unknown",
  updatedAt: 0,
};
const financePanelScopeRpcMeta: FinanceRpcMeta = {
  status: "unknown",
  updatedAt: 0,
};
const financePanelScopeV2RpcMeta: FinanceRpcMeta = {
  status: "unknown",
  updatedAt: 0,
};
const financePanelScopeV3RpcMeta: FinanceRpcMeta = {
  status: "unknown",
  updatedAt: 0,
};
const financePanelScopeV4RpcMeta: FinanceRpcMeta = {
  status: "unknown",
  updatedAt: 0,
};
const financeSummaryV2RpcMeta: FinanceRpcMeta = {
  status: "unknown",
  updatedAt: 0,
};
const financeSupplierScopeRpcMeta: FinanceRpcMeta = {
  status: "unknown",
  updatedAt: 0,
};
const financeSupplierScopeV2RpcMeta: FinanceRpcMeta = {
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

const hasOwn = (value: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const hasAnyOwn = (value: Record<string, unknown>, keys: readonly string[]): boolean =>
  keys.some((key) => hasOwn(value, key));

const isOptionalRpcRecordArray = (
  value: unknown,
): value is Record<string, unknown>[] | null | undefined =>
  value == null || isRpcRecordArray(value);

const isFinanceReportPayload = (value: unknown): value is Record<string, unknown> =>
  isRpcRecord(value) && isOptionalRpcRecordArray(value.suppliers);

const isFinancePaginationPayload = (value: unknown): value is Record<string, unknown> =>
  isRpcRecord(value) &&
  isRpcNumberLike(value.limit) &&
  isRpcNumberLike(value.offset) &&
  isRpcNumberLike(value.total);

const isDirectorFinanceRowsPayload = (value: unknown): value is Record<string, unknown>[] =>
  isRpcRecordArray(value);

export const isDirectorFinanceSummaryRpcResponse = (
  value: unknown,
): value is Record<string, unknown> =>
  isRpcRecord(value) && isRpcRecord(value.summary) && isFinanceReportPayload(value.report);

export const isDirectorFinanceSummaryV2RpcResponse = (
  value: unknown,
): value is Record<string, unknown> => {
  if (!isRpcRecord(value)) return false;
  const bySupplier = value.by_supplier ?? value.bySupplier;
  return (
    isOptionalRpcRecordArray(bySupplier) &&
    hasAnyOwn(value, [
      "total_amount",
      "totalAmount",
      "total_paid",
      "totalPaid",
      "total_debt",
      "totalDebt",
      "overdue_amount",
      "overdueAmount",
      "by_supplier",
      "bySupplier",
    ])
  );
};

export const isDirectorFinancePanelScopeRpcResponse = (
  value: unknown,
): value is Record<string, unknown> =>
  isDirectorFinanceSummaryRpcResponse(value) && isRpcRecord(value.spend);

export const isDirectorFinancePanelScopeV2RpcResponse = (
  value: unknown,
): value is Record<string, unknown> =>
  isDirectorFinancePanelScopeRpcResponse(value) &&
  isDirectorFinanceRowsPayload(value.rows) &&
  isFinancePaginationPayload(value.pagination);

export const isDirectorFinancePanelScopeV3RpcResponse = (
  value: unknown,
): value is Record<string, unknown> => {
  if (!isDirectorFinancePanelScopeV2RpcResponse(value)) return false;
  const supplierRows = value.supplierRows ?? value.supplier_rows;
  const summaryV3 = value.summaryV3 ?? value.summary_v3;
  return isOptionalRpcRecordArray(supplierRows) && (summaryV3 == null || isRpcRecord(summaryV3));
};

export const isDirectorFinancePanelScopeV4RpcResponse = (
  value: unknown,
): value is Record<string, unknown> => {
  if (!isRpcRecord(value)) return false;
  const canonical = value.canonical;
  if (!isRpcRecord(canonical)) return false;
  return (
    (value.document_type === "director_finance_panel_scope" ||
      value.documentType === "director_finance_panel_scope") &&
    value.version === "v4" &&
    isRpcRecord(canonical.summary) &&
    isOptionalRpcRecordArray(canonical.suppliers) &&
    isOptionalRpcRecordArray(canonical.objects) &&
    isRpcRecord(canonical.spend) &&
    isDirectorFinanceRowsPayload(value.rows) &&
    isFinancePaginationPayload(value.pagination)
  );
};

export const isDirectorFinanceSupplierScopeRpcResponse = (
  value: unknown,
): value is Record<string, unknown> => {
  if (!isRpcRecord(value) || !isOptionalRpcRecordArray(value.invoices)) return false;
  return (
    isRpcNonEmptyString(value.supplier) ||
    isRpcNonEmptyString(value.supplierName) ||
    isRpcNonEmptyString(value.supplier_name) ||
    isRpcRecord(value.summary) ||
    hasAnyOwn(value, ["amount", "count", "approved", "paid", "toPay", "to_pay"])
  );
};

const validateDirectorFinanceRpcResponse = <T extends Record<string, unknown>>(
  value: unknown,
  validator: (candidate: unknown) => candidate is T,
  rpcName: string,
  caller: string,
  meta: FinanceRpcMeta,
): T => {
  try {
    return validateRpcResponse(value, validator, {
      rpcName,
      caller,
      domain: "director",
    });
  } catch (error) {
    markFinanceRpcStatus(meta, "failed");
    throw error;
  }
};

const callDirectorFinanceRpc = async (
  rpcName: DirectorFinanceRpcName,
  args: DirectorFinanceRpcArgs,
) => supabase.rpc(rpcName, args);

export async function fetchDirectorFinanceSummaryViaRpc(opts?: {
  periodFromIso?: string | null;
  periodToIso?: string | null;
  dueDaysDefault?: number;
  criticalDays?: number;
}): Promise<FinRep | null> {
  if (!canUseFinanceRpc(financeSummaryRpcMeta)) return null;

  const args: DirectorFinanceFetchSummaryV1Args = {
    p_from: pickIso10(opts?.periodFromIso) ?? undefined,
    p_to: pickIso10(opts?.periodToIso) ?? undefined,
    p_due_days: normalizeFinanceRpcInteger(opts?.dueDaysDefault, 7),
    p_critical_days: normalizeFinanceRpcInteger(opts?.criticalDays, 14),
  };

  const { data, error } = await callDirectorFinanceRpc(FINANCE_SUMMARY_RPC_NAME, args);
  if (error) {
    markFinanceRpcStatus(
      financeSummaryRpcMeta,
      isMissingFinanceRpcError(error, FINANCE_SUMMARY_RPC_NAME) ? "missing" : "failed",
    );
    throw error;
  }

  const validated = validateDirectorFinanceRpcResponse(
    data,
    isDirectorFinanceSummaryRpcResponse,
    FINANCE_SUMMARY_RPC_NAME,
    "src/screens/director/director.finance.rpc.fetchDirectorFinanceSummaryViaRpc",
    financeSummaryRpcMeta,
  );
  const result = adaptDirectorFinanceSummaryPayload(validated);
  markFinanceRpcStatus(financeSummaryRpcMeta, "available");
  return result;
}

export async function fetchDirectorFinanceSummaryV2ViaRpc(opts?: {
  objectId?: string | null;
  periodFromIso?: string | null;
  periodToIso?: string | null;
}): Promise<DirectorFinanceSummaryV2 | null> {
  if (!canUseFinanceRpc(financeSummaryV2RpcMeta)) return null;

  const args: DirectorFinanceSummaryV2Args = {
    p_object_id: financeText(opts?.objectId) || undefined,
    p_date_from: pickIso10(opts?.periodFromIso) ?? undefined,
    p_date_to: pickIso10(opts?.periodToIso) ?? undefined,
  };

  const { data, error } = await callDirectorFinanceRpc(FINANCE_SUMMARY_V2_RPC_NAME, args);
  if (error) {
    markFinanceRpcStatus(
      financeSummaryV2RpcMeta,
      isMissingFinanceRpcError(error, FINANCE_SUMMARY_V2_RPC_NAME) ? "missing" : "failed",
    );
    throw error;
  }

  const validated = validateDirectorFinanceRpcResponse(
    data,
    isDirectorFinanceSummaryV2RpcResponse,
    FINANCE_SUMMARY_V2_RPC_NAME,
    "src/screens/director/director.finance.rpc.fetchDirectorFinanceSummaryV2ViaRpc",
    financeSummaryV2RpcMeta,
  );
  const result = adaptDirectorFinanceSummaryV2Payload(validated);
  markFinanceRpcStatus(financeSummaryV2RpcMeta, "available");
  return result;
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

  const args: DirectorFinancePanelScopeV3Args = {
    p_object_id: financeText(opts?.objectId) || undefined,
    p_date_from: pickIso10(opts?.periodFromIso) ?? undefined,
    p_date_to: pickIso10(opts?.periodToIso) ?? undefined,
    p_due_days: normalizeFinanceRpcInteger(opts?.dueDaysDefault, 7),
    p_critical_days: normalizeFinanceRpcInteger(opts?.criticalDays, 14),
    p_limit: normalizeFinanceRpcInteger(opts?.limit, 50),
    p_offset: Math.max(0, nnum(opts?.offset)),
  };

  const { data, error } = await callDirectorFinanceRpc(FINANCE_PANEL_SCOPE_V3_RPC_NAME, args);
  if (error) {
    markFinanceRpcStatus(
      financePanelScopeV3RpcMeta,
      isMissingFinanceRpcError(error, FINANCE_PANEL_SCOPE_V3_RPC_NAME) ? "missing" : "failed",
    );
    throw error;
  }

  const validated = validateDirectorFinanceRpcResponse(
    data,
    isDirectorFinancePanelScopeV3RpcResponse,
    FINANCE_PANEL_SCOPE_V3_RPC_NAME,
    "src/screens/director/director.finance.rpc.fetchDirectorFinancePanelScopeV3ViaRpc",
    financePanelScopeV3RpcMeta,
  );
  const result = adaptDirectorFinancePanelScopeV3Payload(validated);
  markFinanceRpcStatus(financePanelScopeV3RpcMeta, "available");
  return result;
}

export async function fetchDirectorFinancePanelScopeV4ViaRpc(opts?: {
  objectId?: string | null;
  periodFromIso?: string | null;
  periodToIso?: string | null;
  dueDaysDefault?: number;
  criticalDays?: number;
  limit?: number;
  offset?: number;
}): Promise<DirectorFinancePanelScopeV4 | null> {
  if (!canUseFinanceRpc(financePanelScopeV4RpcMeta)) return null;

  const args: DirectorFinancePanelScopeV4Args = {
    p_object_id: financeText(opts?.objectId) || undefined,
    p_date_from: pickIso10(opts?.periodFromIso) ?? undefined,
    p_date_to: pickIso10(opts?.periodToIso) ?? undefined,
    p_due_days: normalizeFinanceRpcInteger(opts?.dueDaysDefault, 7),
    p_critical_days: normalizeFinanceRpcInteger(opts?.criticalDays, 14),
    p_limit: normalizeFinanceRpcInteger(opts?.limit, 50),
    p_offset: Math.max(0, nnum(opts?.offset)),
  };

  const startedAt = Date.now();
  const { data, error } = await callDirectorFinanceRpc(FINANCE_PANEL_SCOPE_V4_RPC_NAME, args);
  if (error) {
    markFinanceRpcStatus(
      financePanelScopeV4RpcMeta,
      isMissingFinanceRpcError(error, FINANCE_PANEL_SCOPE_V4_RPC_NAME) ? "missing" : "failed",
    );
    trackRpcLatency({
      name: FINANCE_PANEL_SCOPE_V4_RPC_NAME,
      screen: "director",
      surface: "finance_panel",
      durationMs: Date.now() - startedAt,
      status: "error",
      error,
      extra: {
        objectScoped: Boolean(args.p_object_id),
        limit: args.p_limit,
        offset: args.p_offset,
      },
    });
    throw error;
  }

  const validated = validateDirectorFinanceRpcResponse(
    data,
    isDirectorFinancePanelScopeV4RpcResponse,
    FINANCE_PANEL_SCOPE_V4_RPC_NAME,
    "src/screens/director/director.finance.rpc.fetchDirectorFinancePanelScopeV4ViaRpc",
    financePanelScopeV4RpcMeta,
  );
  const result = adaptDirectorFinancePanelScopeV4Payload(validated);
  markFinanceRpcStatus(financePanelScopeV4RpcMeta, "available");
  trackRpcLatency({
    name: FINANCE_PANEL_SCOPE_V4_RPC_NAME,
    screen: "director",
    surface: "finance_panel",
    durationMs: Date.now() - startedAt,
    status: "success",
    rowCount:
      (result?.canonical.suppliers.length ?? 0) +
      (result?.canonical.objects.length ?? 0) +
      (result?.spend.kindRows.length ?? 0),
    extra: {
      objectScoped: Boolean(args.p_object_id),
      limit: args.p_limit,
      offset: args.p_offset,
      totalCount: result?.pagination.total ?? null,
    },
  });
  return result;
}

export async function fetchDirectorFinancePanelScopeV2ViaRpc(opts?: {
  objectId?: string | null;
  periodFromIso?: string | null;
  periodToIso?: string | null;
  limit?: number;
  offset?: number;
}): Promise<DirectorFinancePanelScopeV2 | null> {
  if (!canUseFinanceRpc(financePanelScopeV2RpcMeta)) return null;

  const args: DirectorFinancePanelScopeV2Args = {
    p_object_id: financeText(opts?.objectId) || undefined,
    p_date_from: pickIso10(opts?.periodFromIso) ?? undefined,
    p_date_to: pickIso10(opts?.periodToIso) ?? undefined,
    p_limit: normalizeFinanceRpcInteger(opts?.limit, 50),
    p_offset: Math.max(0, nnum(opts?.offset)),
  };

  const { data, error } = await callDirectorFinanceRpc(FINANCE_PANEL_SCOPE_V2_RPC_NAME, args);
  if (error) {
    markFinanceRpcStatus(
      financePanelScopeV2RpcMeta,
      isMissingFinanceRpcError(error, FINANCE_PANEL_SCOPE_V2_RPC_NAME) ? "missing" : "failed",
    );
    throw error;
  }

  const validated = validateDirectorFinanceRpcResponse(
    data,
    isDirectorFinancePanelScopeV2RpcResponse,
    FINANCE_PANEL_SCOPE_V2_RPC_NAME,
    "src/screens/director/director.finance.rpc.fetchDirectorFinancePanelScopeV2ViaRpc",
    financePanelScopeV2RpcMeta,
  );
  const result = adaptDirectorFinancePanelScopeV2Payload(validated);
  markFinanceRpcStatus(financePanelScopeV2RpcMeta, "available");
  return result;
}

export async function fetchDirectorFinancePanelScopeViaRpc(opts?: {
  periodFromIso?: string | null;
  periodToIso?: string | null;
  dueDaysDefault?: number;
  criticalDays?: number;
}): Promise<DirectorFinancePanelScope | null> {
  if (!canUseFinanceRpc(financePanelScopeRpcMeta)) return null;

  const args: DirectorFinancePanelScopeV1Args = {
    p_from: pickIso10(opts?.periodFromIso) ?? undefined,
    p_to: pickIso10(opts?.periodToIso) ?? undefined,
    p_due_days: normalizeFinanceRpcInteger(opts?.dueDaysDefault, 7),
    p_critical_days: normalizeFinanceRpcInteger(opts?.criticalDays, 14),
  };

  const { data, error } = await callDirectorFinanceRpc(FINANCE_PANEL_SCOPE_RPC_NAME, args);
  if (error) {
    markFinanceRpcStatus(
      financePanelScopeRpcMeta,
      isMissingFinanceRpcError(error, FINANCE_PANEL_SCOPE_RPC_NAME) ? "missing" : "failed",
    );
    throw error;
  }

  const validated = validateDirectorFinanceRpcResponse(
    data,
    isDirectorFinancePanelScopeRpcResponse,
    FINANCE_PANEL_SCOPE_RPC_NAME,
    "src/screens/director/director.finance.rpc.fetchDirectorFinancePanelScopeViaRpc",
    financePanelScopeRpcMeta,
  );
  const result = adaptDirectorFinancePanelScopePayload(validated);
  markFinanceRpcStatus(financePanelScopeRpcMeta, "available");
  return result;
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

  const args: DirectorFinanceSupplierScopeV1Args = {
    p_supplier: supplier,
    p_kind_name: financeText(opts.kindName) || undefined,
    p_from: pickIso10(opts.periodFromIso) ?? undefined,
    p_to: pickIso10(opts.periodToIso) ?? undefined,
    p_due_days: normalizeFinanceRpcInteger(opts.dueDaysDefault, 7),
    p_critical_days: normalizeFinanceRpcInteger(opts.criticalDays, 14),
  };

  const { data, error } = await callDirectorFinanceRpc(FINANCE_SUPPLIER_SCOPE_RPC_NAME, args);
  if (error) {
    markFinanceRpcStatus(
      financeSupplierScopeRpcMeta,
      isMissingFinanceRpcError(error, FINANCE_SUPPLIER_SCOPE_RPC_NAME) ? "missing" : "failed",
    );
    throw error;
  }

  const validated = validateDirectorFinanceRpcResponse(
    data,
    isDirectorFinanceSupplierScopeRpcResponse,
    FINANCE_SUPPLIER_SCOPE_RPC_NAME,
    "src/screens/director/director.finance.rpc.fetchDirectorFinanceSupplierScopeViaRpc",
    financeSupplierScopeRpcMeta,
  );
  const payload = asFinanceRecord(validated);
  markFinanceRpcStatus(financeSupplierScopeRpcMeta, "available");
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

  const args: DirectorFinanceSupplierScopeV2Args = {
    p_supplier: supplier,
    p_kind_name: financeText(opts.kindName) || null,
    p_object_id: financeText(opts.objectId) || undefined,
    p_from: pickIso10(opts.periodFromIso) ?? null,
    p_to: pickIso10(opts.periodToIso) ?? null,
    p_due_days: normalizeFinanceRpcInteger(opts.dueDaysDefault, 7),
    p_critical_days: normalizeFinanceRpcInteger(opts.criticalDays, 14),
  };

  const { data, error } = await callDirectorFinanceRpc(FINANCE_SUPPLIER_SCOPE_V2_RPC_NAME, args);
  if (error) {
    markFinanceRpcStatus(
      financeSupplierScopeV2RpcMeta,
      isMissingFinanceRpcError(error, FINANCE_SUPPLIER_SCOPE_V2_RPC_NAME) ? "missing" : "failed",
    );
    throw error;
  }

  const validated = validateDirectorFinanceRpcResponse(
    data,
    isDirectorFinanceSupplierScopeRpcResponse,
    FINANCE_SUPPLIER_SCOPE_V2_RPC_NAME,
    "src/screens/director/director.finance.rpc.fetchDirectorFinanceSupplierScopeV2ViaRpc",
    financeSupplierScopeV2RpcMeta,
  );
  const payload = asFinanceRecord(validated);
  markFinanceRpcStatus(financeSupplierScopeV2RpcMeta, "available");
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
