// src/screens/director/director.finance.ts
// Logic-only finance helpers and normalized row contracts for the director layer.

import type { Database } from "../../lib/database.types";
import { supabase } from "../../lib/supabaseClient";

const FINANCE_SUMMARY_RPC_NAME = "director_finance_fetch_summary_v1";
const FINANCE_PANEL_SCOPE_RPC_NAME = "director_finance_panel_scope_v1";
const FINANCE_PANEL_SCOPE_V2_RPC_NAME = "director_finance_panel_scope_v2";
const FINANCE_SUMMARY_V2_RPC_NAME = "director_finance_summary_v2";
const FINANCE_SUPPLIER_SCOPE_RPC_NAME = "director_finance_supplier_scope_v1";
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
const financeSummaryV2RpcMeta: { status: FinanceRpcStatus; updatedAt: number } = {
  status: "unknown",
  updatedAt: 0,
};
const financeSupplierScopeRpcMeta: { status: FinanceRpcStatus; updatedAt: number } = {
  status: "unknown",
  updatedAt: 0,
};

export type FinanceRow = {
  id: string;
  supplier: string;
  amount: number;
  paidAmount: number;
  currency?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  approvedAtIso?: string | null;
  dueDate?: string | null;
  paid_first_at?: string | null;
  paid_last_at?: string | null;
  proposalId?: string | null;
  proposal_id?: string | null;
  proposal_no?: string | null;
  pretty?: string | null;
  raw?: Record<string, unknown> | null;
};

type FinanceSourceRow = Record<string, unknown> & {
  row?: Record<string, unknown> | null;
  list_accountant_inbox_fact?: Record<string, unknown> | null;
  data?: Record<string, unknown> | null;
  raw?: Record<string, unknown> | null;
};

export type FinSpendRow = {
  supplier?: string | null;
  kind_code?: string | null;
  kind_name?: string | null;
  proposal_id?: string | null;
  proposal_no?: string | null;
  pretty?: string | null;
  director_approved_at?: string | null;
  approved_at?: string | null;
  approvedAtIso?: string | null;
  approved_alloc?: number | string | null;
  paid_alloc?: number | string | null;
  paid_alloc_cap?: number | string | null;
  overpay_alloc?: number | string | null;
};

export type FinSupplierDebt = {
  supplier: string;
  count: number;
  approved: number;
  paid: number;
  toPay: number;
  overdueCount: number;
  criticalCount: number;
};

export type FinSupplierInvoice = {
  id: string;
  title: string;
  amount: number;
  paid: number;
  rest: number;
  isOverdue: boolean;
  isCritical: boolean;
  approvedIso: string | null;
  invoiceIso: string | null;
  dueIso: string | null;
};

export type FinKindSupplierRow = {
  supplier: string;
  approved: number;
  paid: number;
  overpay: number;
  count: number;
};

export type FinSpendSummaryRow = {
  kind: string;
  approved: number;
  paid: number;
  overpay: number;
  toPay: number;
  suppliers: FinKindSupplierRow[];
};

export type FinSpendSummary = {
  header: {
    approved: number;
    paid: number;
    toPay: number;
    overpay: number;
  };
  kindRows: FinSpendSummaryRow[];
  overpaySuppliers: FinKindSupplierRow[];
};

export type FinSupplierPanelState = FinSupplierDebt & {
  amount?: number;
  _kindName?: string | null;
  kindName?: string | null;
  invoices: FinSupplierInvoice[];
};

export type FinSupplierInput =
  | FinSupplierDebt
  | FinSupplierPanelState
  | {
      supplier?: unknown;
      name?: unknown;
      _kindName?: unknown;
      kindName?: unknown;
      amount?: unknown;
      count?: unknown;
      overdueCount?: unknown;
      criticalCount?: unknown;
      invoices?: unknown;
    };

export type FinSupplierViewModel = {
  supplier: string;
  name?: string | null;
  _kindName?: string | null;
  kindName?: string | null;
  amount?: number;
  count?: number;
  overdueCount?: number;
  criticalCount?: number;
  invoices?: FinSupplierInvoice[];
};

export type FinRep = {
  summary: {
    approved: number;
    paid: number;
    partialPaid: number;
    toPay: number;
    overdueCount: number;
    overdueAmount: number;
    criticalCount: number;
    criticalAmount: number;
    partialCount: number;
    debtCount: number;
  };
  report: {
    suppliers: FinSupplierDebt[];
  };
};

export type DirectorFinancePanelScope = FinRep & {
  spend: FinSpendSummary;
};

export type DirectorFinanceStatus = "pending" | "approved" | "paid" | "overdue";

export type DirectorFinanceRowV2 = {
  requestId: string | null;
  objectId: string | null;
  supplierId: string;
  supplierName: string;
  proposalId: string | null;
  invoiceNumber: string | null;
  amountTotal: number;
  amountPaid: number;
  amountDebt: number;
  dueDate: string | null;
  isOverdue: boolean;
  overdueDays: number | null;
  status: DirectorFinanceStatus;
};

export type DirectorFinanceSummaryV2Supplier = {
  supplierId: string;
  supplierName: string;
  debt: number;
};

export type DirectorFinanceSummaryV2 = {
  totalAmount: number;
  totalPaid: number;
  totalDebt: number;
  overdueAmount: number;
  bySupplier: DirectorFinanceSummaryV2Supplier[];
};

export type DirectorFinancePagination = {
  limit: number;
  offset: number;
  total: number;
};

export type DirectorFinancePanelScopeV2 = DirectorFinancePanelScope & {
  rows: DirectorFinanceRowV2[];
  pagination: DirectorFinancePagination;
  summaryV2: DirectorFinanceSummaryV2;
};

export type FinanceSummary = FinRep["summary"];

const DASH = "—";

const CP1251_EXTRA_BYTES = new Map<number, number>([
  [0x0401, 0xa8], [0x0402, 0x80], [0x0403, 0x81], [0x0404, 0xaa], [0x0405, 0xbd], [0x0406, 0xb2],
  [0x0407, 0xaf], [0x0408, 0xa3], [0x0409, 0x8a], [0x040a, 0x8c], [0x040b, 0x8e], [0x040c, 0x8d],
  [0x040e, 0xa1], [0x040f, 0x8f], [0x0451, 0xb8], [0x0452, 0x90], [0x0453, 0x83], [0x0454, 0xba],
  [0x0455, 0xbe], [0x0456, 0xb3], [0x0457, 0xbf], [0x0458, 0xbc], [0x0459, 0x9a], [0x045a, 0x9c],
  [0x045b, 0x9e], [0x045c, 0x9d], [0x045e, 0xa2], [0x045f, 0x9f], [0x0490, 0xa5], [0x0491, 0xb4],
  [0x00a0, 0xa0], [0x00a4, 0xa4], [0x00a6, 0xa6], [0x00a7, 0xa7], [0x00a9, 0xa9], [0x00ab, 0xab],
  [0x00ac, 0xac], [0x00ad, 0xad], [0x00ae, 0xae], [0x00b0, 0xb0], [0x00b1, 0xb1], [0x00b5, 0xb5],
  [0x00b6, 0xb6], [0x00b7, 0xb7], [0x00bb, 0xbb], [0x2013, 0x96], [0x2014, 0x97], [0x2018, 0x91],
  [0x2019, 0x92], [0x201a, 0x82], [0x201c, 0x93], [0x201d, 0x94], [0x201e, 0x84], [0x2020, 0x86],
  [0x2021, 0x87], [0x2022, 0x95], [0x2026, 0x85], [0x2030, 0x89], [0x2039, 0x8b], [0x203a, 0x9b],
  [0x20ac, 0x88], [0x2116, 0xb9], [0x2122, 0x99],
]);

const looksLikeFinanceMojibake = (value: string): boolean =>
  /[¤¦§Ё©«¬®°±¶·ЂЃ‚„…†‡€‰Љ‹ЊЋЏђ‘’“”•–—™љ›њћџ]|вЂ|в–/.test(value);

const encodeCp1251Byte = (char: string): number | null => {
  const code = char.codePointAt(0);
  if (code == null) return null;
  if (code <= 0x7f) return code;
  if (code >= 0x0410 && code <= 0x042f) return 0xc0 + (code - 0x0410);
  if (code >= 0x0430 && code <= 0x044f) return 0xe0 + (code - 0x0430);
  return CP1251_EXTRA_BYTES.get(code) ?? null;
};

const decodeFinanceMojibake = (value: string): string => {
  if (!value || !looksLikeFinanceMojibake(value) || typeof TextDecoder === "undefined") {
    return value;
  }

  const bytes: number[] = [];
  for (const char of value) {
    const byte = encodeCp1251Byte(char);
    if (byte == null) return value;
    bytes.push(byte);
  }

  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bytes)).trim();
    if (!decoded) return value;
    if (looksLikeFinanceMojibake(decoded) && decoded !== value) return value;
    return decoded;
  } catch {
    return value;
  }
};

const asFinanceRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

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

export const financeText = (value: unknown): string => decodeFinanceMojibake(String(value ?? "").trim());

export const financeTextOrFallback = (value: unknown, fallback: string): string =>
  financeText(value) || fallback;

const optionalNumber = (value: unknown): number | undefined => {
  if (value == null) return undefined;
  if (typeof value === "string" && !value.trim()) return undefined;
  const numberValue = nnum(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
};

const numericSourceValue = (value: unknown): number | string | null => {
  if (value == null) return null;
  if (typeof value === "number" || typeof value === "string") return value;
  return String(value);
};

export const nnum = (value: unknown): number => {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const raw = String(value).trim();
  if (!raw) return 0;

  const normalized = raw
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.\-]/g, "");

  const parts = normalized.split(".");
  const collapsed = parts.length <= 2 ? normalized : `${parts[0]}.${parts.slice(1).join("")}`;
  const parsed = Number(collapsed);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const money = (value: unknown): string => {
  const numberValue = Number(value ?? 0);
  if (!Number.isFinite(numberValue)) return "0";
  return Math.round(numberValue).toLocaleString("ru-RU");
};

export const mid = (value: unknown): number => {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  const date = new Date(String(value));
  const ts = date.getTime();
  return Number.isNaN(ts) ? 0 : ts;
};

export const parseMid = (value: unknown): number => mid(value);

export const addDaysIso = (iso: string, days: number) => {
  const base = String(iso ?? "").slice(0, 10);
  const date = new Date(base);
  if (Number.isNaN(date.getTime())) return base;
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
};

const pickIso10 = (...values: unknown[]) => {
  for (const value of values) {
    const text = financeText(value);
    if (!text || text === DASH) continue;
    return text.slice(0, 10);
  }
  return null;
};

export { pickIso10 };

export const pickApprovedIso = (row: FinanceSourceRow) =>
  pickIso10(
    row.approvedAtIso,
    row.director_approved_at,
    row.approved_at,
    row.approvedAt,
    row.approved_at_iso,
  );

export const pickInvoiceIso = (row: FinanceSourceRow) =>
  pickIso10(row.invoiceDate, row.invoice_date, row.invoiceIso, row.invoice_at, row.created_at, row.raw?.created_at);

export const pickFinanceAmount = (row: FinanceSourceRow) =>
  nnum(row.amount ?? row.invoice_amount ?? row.invoiceAmount ?? row.approved_amount ?? 0);

export const pickFinancePaid = (row: FinanceSourceRow) =>
  nnum(row.paidAmount ?? row.total_paid ?? row.totalPaid ?? row.paid_amount ?? 0);

const asFinanceSourceRow = (value: unknown): FinanceSourceRow => {
  if (!value || typeof value !== "object") return {};
  return value as FinanceSourceRow;
};

const normalizeFinanceSource = (value: unknown): FinanceSourceRow => {
  const row = asFinanceSourceRow(value);
  const nested = row.row ?? row.list_accountant_inbox_fact ?? row.data;
  return nested && typeof nested === "object" ? asFinanceSourceRow(nested) : row;
};

export const mapToFinanceRow = (value: unknown): FinanceRow => {
  const source = normalizeFinanceSource(value);
  const supplier = financeTextOrFallback(source.supplier, DASH);
  const proposalId = financeText(source.proposal_id ?? source.proposalId ?? source.id) || null;
  const invoiceNumber = financeText(source.invoice_number ?? source.invoiceNumber) || null;
  const amount = nnum(source.invoice_amount ?? source.amount ?? 0);
  const paidAmount = nnum(source.total_paid ?? source.totalPaid ?? source.paid_amount ?? 0);
  const invoiceDate = pickIso10(
    source.invoice_date,
    source.invoiceDate,
    source.invoice_at,
    source.invoice_created_at,
    source.created_at,
  );
  const approvedAtIso = pickIso10(
    source.director_approved_at,
    source.approved_at,
    source.approvedAtIso,
    source.approvedAt,
    source.sent_to_accountant_at,
    source.sentToAccountantAt,
    source.raw?.sent_to_accountant_at,
    source.raw?.sentToAccountantAt,
  );
  const dueDate = pickIso10(source.due_date, source.dueDate, source.due_at);
  const paidFirstAt = pickIso10(source.paid_first_at, source.paidFirstAt, source.raw?.paid_first_at, source.raw?.paidFirstAt);
  const paidLastAt = pickIso10(source.paid_last_at, source.paidLastAt, source.raw?.paid_last_at, source.raw?.paidLastAt);
  const proposalNo = financeText(source.proposal_no ?? source.proposalNo ?? source.pretty) || null;

  return {
    id: proposalId || `${supplier}:${invoiceNumber || "no-inv"}`,
    supplier,
    amount,
    paidAmount,
    currency: financeText(source.invoice_currency ?? source.currency) || "KGS",
    invoiceNumber,
    invoiceDate,
    approvedAtIso,
    dueDate,
    paid_first_at: paidFirstAt,
    paid_last_at: paidLastAt,
    proposalId,
    proposal_id: proposalId,
    proposal_no: proposalNo,
    pretty: proposalNo,
    raw: source,
  };
};

export const normalizeFinSpendRow = (value: unknown): FinSpendRow => {
  const row = asFinanceRecord(value);
  return {
    supplier: financeText(row.supplier) || null,
    kind_code: financeText(row.kind_code) || null,
    kind_name: financeText(row.kind_name) || null,
    proposal_id: financeText(row.proposal_id) || null,
    proposal_no: financeText(row.proposal_no) || null,
    pretty: financeText(row.pretty) || null,
    director_approved_at: financeText(row.director_approved_at) || null,
    approved_at: financeText(row.approved_at) || null,
    approvedAtIso: financeText(row.approvedAtIso) || null,
    approved_alloc: numericSourceValue(row.approved_alloc),
    paid_alloc: numericSourceValue(row.paid_alloc),
    paid_alloc_cap: numericSourceValue(row.paid_alloc_cap),
    overpay_alloc: numericSourceValue(row.overpay_alloc),
  };
};

export const normalizeFinSpendRows = (values: unknown): FinSpendRow[] =>
  Array.isArray(values) ? values.map(normalizeFinSpendRow) : [];

const normalizeFinanceSummarySupplier = (value: unknown): FinSupplierDebt => {
  const row = asFinanceRecord(value);
  return {
    supplier: financeTextOrFallback(row.supplier, DASH),
    count: nnum(row.count),
    approved: nnum(row.approved),
    paid: nnum(row.paid),
    toPay: nnum(row.toPay),
    overdueCount: nnum(row.overdueCount),
    criticalCount: nnum(row.criticalCount),
  };
};

const adaptDirectorFinanceSummaryPayload = (value: unknown): FinRep => {
  const payload = asFinanceRecord(value);
  const summary = asFinanceRecord(payload.summary);
  const report = asFinanceRecord(payload.report);
  const suppliers = Array.isArray(report.suppliers)
    ? report.suppliers.map(normalizeFinanceSummarySupplier)
    : [];

  return {
    summary: {
      approved: nnum(summary.approved),
      paid: nnum(summary.paid),
      partialPaid: nnum(summary.partialPaid),
      toPay: nnum(summary.toPay),
      overdueCount: nnum(summary.overdueCount),
      overdueAmount: nnum(summary.overdueAmount),
      criticalCount: nnum(summary.criticalCount),
      criticalAmount: nnum(summary.criticalAmount),
      partialCount: nnum(summary.partialCount),
      debtCount: nnum(summary.debtCount),
    },
    report: { suppliers },
  };
};

const normalizeFinanceRpcInteger = (value: unknown, fallback: number): number => {
  const numeric = Number(value ?? fallback);
  if (!Number.isFinite(numeric) || numeric === 0) return fallback;
  return Math.trunc(numeric);
};

const normalizeDirectorFinanceStatus = (value: unknown): DirectorFinanceStatus => {
  const status = financeText(value).toLowerCase();
  if (status === "paid" || status === "overdue" || status === "approved") return status;
  return "pending";
};

const normalizeDirectorFinanceRowV2 = (value: unknown): DirectorFinanceRowV2 => {
  const row = asFinanceRecord(value);
  return {
    requestId: financeText(row.requestId) || null,
    objectId: financeText(row.objectId) || null,
    supplierId: financeTextOrFallback(row.supplierId, DASH),
    supplierName: financeTextOrFallback(row.supplierName, DASH),
    proposalId: financeText(row.proposalId) || null,
    invoiceNumber: financeText(row.invoiceNumber) || null,
    amountTotal: nnum(row.amountTotal),
    amountPaid: nnum(row.amountPaid),
    amountDebt: nnum(row.amountDebt),
    dueDate: pickIso10(row.dueDate),
    isOverdue: row.isOverdue === true,
    overdueDays: optionalNumber(row.overdueDays) ?? null,
    status: normalizeDirectorFinanceStatus(row.status),
  };
};

const normalizeDirectorFinanceSummaryV2Supplier = (
  value: unknown,
): DirectorFinanceSummaryV2Supplier => {
  const row = asFinanceRecord(value);
  return {
    supplierId: financeTextOrFallback(row.supplier_id ?? row.supplierId, DASH),
    supplierName: financeTextOrFallback(row.supplier_name ?? row.supplierName, DASH),
    debt: nnum(row.debt),
  };
};

const adaptDirectorFinanceSummaryV2Payload = (value: unknown): DirectorFinanceSummaryV2 => {
  const payload = asFinanceRecord(value);
  const bySupplierPayload = payload.by_supplier ?? payload.bySupplier;
  return {
    totalAmount: nnum(payload.total_amount ?? payload.totalAmount),
    totalPaid: nnum(payload.total_paid ?? payload.totalPaid),
    totalDebt: nnum(payload.total_debt ?? payload.totalDebt),
    overdueAmount: nnum(payload.overdue_amount ?? payload.overdueAmount),
    bySupplier: Array.isArray(bySupplierPayload)
      ? bySupplierPayload.map(normalizeDirectorFinanceSummaryV2Supplier)
      : [],
  };
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

const pickSupplierText = (value: unknown): string => {
  const row = asFinanceRecord(value);
  if (typeof row.supplier === "string") return row.supplier.trim();
  if (row.supplier && typeof row.supplier === "object") {
    return financeText(asFinanceRecord(row.supplier).supplier);
  }
  return financeText(row.name);
};

export const normalizeFinSupplierInput = (value: FinSupplierInput | string): FinSupplierViewModel => {
  if (typeof value === "string") {
    return { supplier: value.trim() || DASH, _kindName: "" };
  }

  const row = asFinanceRecord(value);
  return {
    supplier: pickSupplierText(value) || DASH,
    name: financeText(row.name) || null,
    _kindName: financeText(row._kindName) || null,
    kindName: financeText(row.kindName) || null,
    amount: optionalNumber(row.amount),
    count: optionalNumber(row.count),
    overdueCount: optionalNumber(row.overdueCount),
    criticalCount: optionalNumber(row.criticalCount),
    invoices: Array.isArray(row.invoices) ? (row.invoices as FinSupplierInvoice[]) : undefined,
  };
};

export const computeFinanceRep = (
  rows: FinanceRow[],
  opts?: {
    dueDaysDefault?: number;
    criticalDays?: number;
    periodFromIso?: string | null;
    periodToIso?: string | null;
  },
): FinRep => {
  const list = Array.isArray(rows) ? rows : [];
  const dueDaysDefault = Number(opts?.dueDaysDefault ?? 7) || 7;
  const criticalDays = Number(opts?.criticalDays ?? 14) || 14;
  const from = String(opts?.periodFromIso ?? "").slice(0, 10);
  const to = String(opts?.periodToIso ?? "").slice(0, 10);

  const inPeriod = (iso?: string | null) => {
    const date = String(iso ?? "").slice(0, 10);
    if (!date) return true;
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  };

  const now = mid(new Date());
  let sumApproved = 0;
  let sumPaid = 0;
  let sumToPay = 0;
  let sumOverdue = 0;
  let sumOverdueAmount = 0;
  let sumCritical = 0;
  let sumCriticalAmount = 0;
  let sumPartial = 0;
  let sumPartialPaid = 0;
  let debtCount = 0;

  const bySupplier = new Map<
    string,
    { approved: number; paid: number; toPay: number; count: number; overdueCount: number; criticalCount: number }
  >();

  for (const row of list) {
    const approvedIso = row.approvedAtIso ?? row.invoiceDate ?? null;
    if (!inPeriod(approvedIso)) continue;

    const amount = nnum(row.amount);
    const paid = nnum(row.paidAmount);
    const rest = Math.max(amount - paid, 0);

    sumApproved += amount;
    sumPaid += paid;
    sumToPay += rest;

    const isPartial = paid > 0 && rest > 0;
    if (isPartial) {
      sumPartial += 1;
      sumPartialPaid += paid;
    }
    if (rest > 0) debtCount += 1;

    const dueIso =
      row.dueDate ??
      (row.invoiceDate ? addDaysIso(String(row.invoiceDate), dueDaysDefault) : null) ??
      (row.approvedAtIso ? addDaysIso(String(row.approvedAtIso), dueDaysDefault) : null);

    const dueMid = parseMid(dueIso);
    const isOverdue = rest > 0 && dueMid > 0 && dueMid < now;

    let isCritical = false;
    if (isOverdue) {
      const daysOverdue = Math.floor((now - dueMid) / (24 * 3600 * 1000));
      isCritical = daysOverdue >= criticalDays;
    }

    if (isOverdue) {
      sumOverdue += 1;
      sumOverdueAmount += rest;
      if (isCritical) {
        sumCritical += 1;
        sumCriticalAmount += rest;
      }
    }

    const supplier = financeTextOrFallback(row.supplier, DASH);
    const current = bySupplier.get(supplier) ?? {
      approved: 0,
      paid: 0,
      toPay: 0,
      count: 0,
      overdueCount: 0,
      criticalCount: 0,
    };

    current.approved += amount;
    current.paid += paid;
    current.toPay += rest;
    current.count += 1;
    if (isOverdue) current.overdueCount += 1;
    if (isCritical) current.criticalCount += 1;

    bySupplier.set(supplier, current);
  }

  const suppliers: FinSupplierDebt[] = Array.from(bySupplier.entries()).map(([supplier, totals]) => ({
    supplier,
    count: totals.count,
    approved: totals.approved,
    paid: totals.paid,
    toPay: totals.toPay,
    overdueCount: totals.overdueCount,
    criticalCount: totals.criticalCount,
  }));

  suppliers.sort((left, right) => right.toPay - left.toPay);

  return {
    summary: {
      approved: sumApproved,
      paid: sumPaid,
      partialPaid: sumPartialPaid,
      toPay: sumToPay,
      overdueCount: sumOverdue,
      overdueAmount: sumOverdueAmount,
      criticalCount: sumCritical,
      criticalAmount: sumCriticalAmount,
      partialCount: sumPartial,
      debtCount,
    },
    report: { suppliers },
  };
};

export type FinKindSummary = {
  kind_name: string;
  count: number;
  approved: number;
  paid: number;
  toPay: number;
};

export const computeFinanceByKind = (spendRows: FinSpendRow[]): FinKindSummary[] => {
  const list = Array.isArray(spendRows) ? spendRows : [];
  const byKind = new Map<string, { count: number; approved: number; paid: number }>();

  for (const row of list) {
    const kind = financeText(row.kind_name) || "Прочее";
    const approved = nnum(row.approved_alloc);
    const paid = nnum(row.paid_alloc ?? row.paid_alloc_cap);
    const current = byKind.get(kind) ?? { count: 0, approved: 0, paid: 0 };
    current.count += 1;
    current.approved += approved;
    current.paid += paid;
    byKind.set(kind, current);
  }

  return Array.from(byKind.entries())
    .map(([kind_name, totals]) => ({
      kind_name,
      count: totals.count,
      approved: totals.approved,
      paid: totals.paid,
      toPay: Math.max(totals.approved - totals.paid, 0),
    }))
    .sort((left, right) => right.approved - left.approved);
};

const FINANCE_KIND_FALLBACK = "\u0414\u0440\u0443\u0433\u043e\u0435";
const FINANCE_KIND_ORDER = [
  "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b",
  "\u0420\u0430\u0431\u043e\u0442\u044b",
  "\u0423\u0441\u043b\u0443\u0433\u0438",
  FINANCE_KIND_FALLBACK,
];

const normalizeFinKindSupplierRow = (value: unknown): FinKindSupplierRow => {
  const row = asFinanceRecord(value);
  return {
    supplier: financeTextOrFallback(row.supplier, DASH),
    approved: nnum(row.approved),
    paid: nnum(row.paid),
    overpay: nnum(row.overpay),
    count: nnum(row.count),
  };
};

const normalizeFinSpendSummaryRow = (value: unknown): FinSpendSummaryRow => {
  const row = asFinanceRecord(value);
  return {
    kind: financeTextOrFallback(row.kind, FINANCE_KIND_FALLBACK),
    approved: nnum(row.approved),
    paid: nnum(row.paid),
    overpay: nnum(row.overpay),
    toPay: nnum(row.toPay),
    suppliers: Array.isArray(row.suppliers) ? row.suppliers.map(normalizeFinKindSupplierRow) : [],
  };
};

const adaptDirectorFinancePanelScopePayload = (value: unknown): DirectorFinancePanelScope => {
  const payload = asFinanceRecord(value);
  const summaryPayload = adaptDirectorFinanceSummaryPayload({
    summary: payload.summary,
    report: payload.report,
  });
  const spend = asFinanceRecord(payload.spend);
  const header = asFinanceRecord(spend.header);
  return {
    ...summaryPayload,
    spend: {
      header: {
        approved: nnum(header.approved),
        paid: nnum(header.paid),
        toPay: nnum(header.toPay),
        overpay: nnum(header.overpay),
      },
      kindRows: Array.isArray(spend.kinds) ? spend.kinds.map(normalizeFinSpendSummaryRow) : [],
      overpaySuppliers: Array.isArray(spend.overpaySuppliers)
        ? spend.overpaySuppliers.map(normalizeFinKindSupplierRow)
        : [],
    },
  };
};

const adaptDirectorFinancePanelScopeV2Payload = (value: unknown): DirectorFinancePanelScopeV2 => {
  const payload = asFinanceRecord(value);
  const pagination = asFinanceRecord(payload.pagination);
  return {
    ...adaptDirectorFinancePanelScopePayload(payload),
    rows: Array.isArray(payload.rows) ? payload.rows.map(normalizeDirectorFinanceRowV2) : [],
    pagination: {
      limit: nnum(pagination.limit),
      offset: nnum(pagination.offset),
      total: nnum(pagination.total),
    },
    summaryV2: adaptDirectorFinanceSummaryV2Payload(payload.summary_v2 ?? payload.summaryV2),
  };
};

export const computeFinanceSpendSummary = (spendRows: FinSpendRow[]): FinSpendSummary => {
  const rows = Array.isArray(spendRows) ? spendRows : [];
  let approved = 0;
  let paid = 0;
  let overpay = 0;
  const byProposal = new Map<string, { approved: number; paid: number }>();
  const totalsByKind = new Map<string, { approved: number; paid: number; overpay: number }>();
  const suppliersByKind = new Map<string, Map<string, FinKindSupplierRow>>();
  const overpayBySupplier = new Map<string, FinKindSupplierRow>();

  for (const row of rows) {
    const proposalId = financeText(row.proposal_id);
    const kindName = financeText(row.kind_name) || FINANCE_KIND_FALLBACK;
    const supplierName = financeText(row.supplier) || DASH;
    const approvedValue = nnum(row.approved_alloc);
    const paidValue = nnum(row.paid_alloc_cap ?? row.paid_alloc);
    const overpayValue = nnum(row.overpay_alloc);

    approved += approvedValue;
    paid += paidValue;
    overpay += overpayValue;

    if (proposalId) {
      const proposalTotals = byProposal.get(proposalId) ?? { approved: 0, paid: 0 };
      proposalTotals.approved += approvedValue;
      proposalTotals.paid += paidValue;
      byProposal.set(proposalId, proposalTotals);
    }

    const kindTotals = totalsByKind.get(kindName) ?? { approved: 0, paid: 0, overpay: 0 };
    kindTotals.approved += approvedValue;
    kindTotals.paid += paidValue;
    kindTotals.overpay += overpayValue;
    totalsByKind.set(kindName, kindTotals);

    const kindSuppliers = suppliersByKind.get(kindName) ?? new Map<string, FinKindSupplierRow>();
    const supplierTotals = kindSuppliers.get(supplierName) ?? {
      supplier: supplierName,
      approved: 0,
      paid: 0,
      overpay: 0,
      count: 0,
    };
    supplierTotals.approved += approvedValue;
    supplierTotals.paid += paidValue;
    supplierTotals.overpay += overpayValue;
    supplierTotals.count += 1;
    kindSuppliers.set(supplierName, supplierTotals);
    suppliersByKind.set(kindName, kindSuppliers);

    if (overpayValue > 0) {
      const overpayTotals = overpayBySupplier.get(supplierName) ?? {
        supplier: supplierName,
        approved: 0,
        paid: 0,
        overpay: 0,
        count: 0,
      };
      overpayTotals.overpay += overpayValue;
      overpayTotals.count += 1;
      overpayBySupplier.set(supplierName, overpayTotals);
    }
  }

  let toPay = 0;
  for (const proposalTotals of byProposal.values()) {
    toPay += Math.max(proposalTotals.approved - proposalTotals.paid, 0);
  }

  const orderedKinds = [
    ...FINANCE_KIND_ORDER.filter((kind) => totalsByKind.has(kind)),
    ...Array.from(totalsByKind.keys()).filter((kind) => !FINANCE_KIND_ORDER.includes(kind)),
  ];

  const kindRows = orderedKinds
    .map<FinSpendSummaryRow | null>((kind) => {
      const totals = totalsByKind.get(kind);
      if (!totals) return null;
      if (totals.approved === 0 && totals.paid === 0 && totals.overpay === 0) return null;

      const suppliers = Array.from((suppliersByKind.get(kind) ?? new Map()).values()).sort(
        (left, right) => right.approved - left.approved,
      );

      return {
        kind,
        approved: totals.approved,
        paid: totals.paid,
        overpay: totals.overpay,
        toPay: Math.max(totals.approved - totals.paid, 0),
        suppliers,
      };
    })
    .filter((row): row is FinSpendSummaryRow => row != null);

  return {
    header: {
      approved,
      paid,
      toPay,
      overpay,
    },
    kindRows,
    overpaySuppliers: Array.from(overpayBySupplier.values()).sort((left, right) => right.overpay - left.overpay),
  };
};

const makeFinancePeriodFilter = (periodFromIso?: string | null, periodToIso?: string | null) => {
  const from = pickIso10(periodFromIso);
  const to = pickIso10(periodToIso);
  return (iso?: string | null) => {
    const date = pickIso10(iso);
    if (!date) return true;
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  };
};

export const computeFinanceSupplierPanel = (args: {
  selection:
    | {
        supplier: string;
        kindName?: string | null;
      }
    | null
    | undefined;
  rows: FinanceRow[];
  spendRows: FinSpendRow[];
  periodFromIso?: string | null;
  periodToIso?: string | null;
  dueDaysDefault?: number;
  criticalDays?: number;
}): FinSupplierPanelState | null => {
  const supplierName = financeText(args.selection?.supplier);
  const kindName = financeText(args.selection?.kindName);
  if (!supplierName) return null;

  const inPeriod = makeFinancePeriodFilter(args.periodFromIso, args.periodToIso);
  const normalizedSpendRows = normalizeFinSpendRows(args.spendRows).map((row) => ({
    ...row,
    supplierName: financeText(row.supplier),
    kindName: financeText(row.kind_name),
    proposalId: financeText(row.proposal_id),
    proposalNo: financeText(row.proposal_no),
    approvedIso: pickIso10(row.director_approved_at, row.approved_at, row.approvedAtIso),
  }));

  const supplierSpendRows = normalizedSpendRows.filter((row) => row.supplierName === supplierName);
  const supplierFinanceRows = (Array.isArray(args.rows) ? args.rows : []).filter(
    (row) => financeText(row?.supplier) === supplierName,
  );

  let allowedProposalIds: Set<string> | null = null;
  const proposalNoById: Record<string, string> = {};

  if (kindName) {
    const spend = supplierSpendRows
      .filter((row) => row.kindName === kindName)
      .filter((row) => inPeriod(row.approvedIso));

    allowedProposalIds = new Set(spend.map((row) => row.proposalId).filter(Boolean));

    for (const row of spend) {
      if (row.proposalId && row.proposalNo) proposalNoById[row.proposalId] = row.proposalNo;
    }
  }

  const financeRows = supplierFinanceRows
    .filter((row) => inPeriod(pickIso10(row?.approvedAtIso, row?.raw?.approved_at, row?.raw?.director_approved_at)))
    .filter((row) => {
      if (!allowedProposalIds) return true;
      const proposalId = financeText(row?.proposalId ?? row?.proposal_id);
      return proposalId && allowedProposalIds.has(proposalId);
    });

  const dueDays = Number(args.dueDaysDefault ?? 7) || 7;
  const criticalDays = Number(args.criticalDays ?? 14) || 14;
  const now = mid(new Date());

  const invoices = financeRows
    .map((row, index) => {
      const amount = pickFinanceAmount(row);
      const paid = pickFinancePaid(row);
      const rest = Math.max(amount - paid, 0);
      const proposalId = financeText(row?.proposalId ?? row?.proposal_id);
      const invoiceNumber = financeText(row?.invoiceNumber ?? row?.raw?.invoice_number);
      const approvedIso =
        pickApprovedIso(row) ??
        pickIso10(row?.raw?.director_approved_at, row?.raw?.approved_at, row?.raw?.approvedAtIso);
      const invoiceIso =
        pickInvoiceIso(row) ??
        pickIso10(row?.raw?.invoice_date, row?.raw?.invoice_at, row?.raw?.created_at);
      const proposalNo = proposalId ? financeText(proposalNoById[proposalId] ?? row?.proposal_no) : "";
      const title =
        invoiceNumber
          ? `\u0421\u0447\u0451\u0442 \u2116${invoiceNumber}`
          : proposalNo
            ? `\u041f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u0435 ${proposalNo}`
            : proposalId
              ? `\u041f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u0435 #${proposalId.slice(0, 8)}`
              : "\u0421\u0447\u0451\u0442";
      const dueIso =
        row?.dueDate ??
        row?.raw?.due_date ??
        (invoiceIso ? addDaysIso(String(invoiceIso).slice(0, 10), dueDays) : null) ??
        (approvedIso ? addDaysIso(String(approvedIso).slice(0, 10), dueDays) : null);
      const dueMid = parseMid(dueIso) ?? 0;
      const isOverdue = rest > 0 && !!dueMid && dueMid < now;

      let isCritical = false;
      if (isOverdue && dueMid) {
        const days = Math.floor((now - dueMid) / (24 * 3600 * 1000));
        isCritical = days >= criticalDays;
      }

      return {
        id: [proposalId || "", invoiceNumber || "", String(invoiceIso ?? ""), String(approvedIso ?? ""), String(index)].join("|"),
        title,
        amount,
        paid,
        rest,
        isOverdue,
        isCritical,
        approvedIso: approvedIso ? String(approvedIso) : null,
        invoiceIso: invoiceIso ? String(invoiceIso) : null,
        dueIso: dueIso ? String(dueIso) : null,
      };
    })
    .filter((row) => row.amount > 0 || row.rest > 0);

  const debtAmount = invoices.reduce((sum, row) => sum + Math.max(nnum(row.rest), 0), 0);
  const debtCount = invoices.filter((row) => Math.max(nnum(row.rest), 0) > 0).length;
  const overdueCount = invoices.filter((row) => row.isOverdue && Math.max(nnum(row.rest), 0) > 0).length;
  const criticalCount = invoices.filter((row) => row.isCritical && Math.max(nnum(row.rest), 0) > 0).length;

  return {
    supplier: supplierName,
    amount: debtAmount,
    count: debtCount,
    approved: debtAmount,
    paid: 0,
    toPay: debtAmount,
    overdueCount,
    criticalCount,
    _kindName: kindName || "",
    kindName: kindName || "",
    invoices,
  };
};

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
