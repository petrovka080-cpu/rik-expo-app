// src/screens/director/director.finance.ts
// Logic-only finance helpers and normalized row contracts for the director layer.

import type { Database } from "../../lib/database.types";
import { supabase } from "../../lib/supabaseClient";

const FINANCE_SUMMARY_RPC_NAME = "director_finance_fetch_summary_v1";
const FINANCE_SUMMARY_FAILED_COOLDOWN_MS = 10 * 60 * 1000;
type RuntimeProcessEnv = { process?: { env?: Record<string, unknown> } };
type FinanceSummaryRpcStatus = "unknown" | "available" | "missing" | "failed";
const readRuntimeEnvFlag = (key: string, fallback: string): string =>
  String(((globalThis as unknown as RuntimeProcessEnv).process?.env ?? {})[key] ?? fallback).trim();
const DIRECTOR_FINANCE_SUMMARY_RPC_ENABLED =
  readRuntimeEnvFlag("EXPO_PUBLIC_DIRECTOR_FINANCE_SUMMARY_RPC", "1") !== "0";
const financeSummaryRpcMeta: { status: FinanceSummaryRpcStatus; updatedAt: number } = {
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

export type FinanceSummary = FinRep["summary"];

const DASH = "—";

const asFinanceRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const markFinanceSummaryRpcStatus = (status: FinanceSummaryRpcStatus) => {
  financeSummaryRpcMeta.status = status;
  financeSummaryRpcMeta.updatedAt = Date.now();
};

const isMissingFinanceSummaryRpcError = (error: unknown): boolean => {
  const errorRecord = asFinanceRecord(error);
  const message = String(errorRecord.message ?? error ?? "").toLowerCase();
  const details = String(errorRecord.details ?? "").toLowerCase();
  const hint = String(errorRecord.hint ?? "").toLowerCase();
  const code = String(errorRecord.code ?? "").toLowerCase();
  const text = `${message} ${details} ${hint}`;
  return (
    text.includes(`function public.${FINANCE_SUMMARY_RPC_NAME}`) ||
    text.includes("could not find the function") ||
    code === "pgrst202"
  );
};

const canUseFinanceSummaryRpc = (): boolean => {
  if (!DIRECTOR_FINANCE_SUMMARY_RPC_ENABLED) return false;
  if (financeSummaryRpcMeta.status === "missing") return false;
  if (
    financeSummaryRpcMeta.status === "failed" &&
    Date.now() - financeSummaryRpcMeta.updatedAt < FINANCE_SUMMARY_FAILED_COOLDOWN_MS
  ) {
    return false;
  }
  return true;
};

export const financeText = (value: unknown): string => String(value ?? "").trim();

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

  suppliers.sort((left, right) => right.toPay - left.toPay);

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

export async function fetchDirectorFinanceSummaryViaRpc(opts?: {
  periodFromIso?: string | null;
  periodToIso?: string | null;
  dueDaysDefault?: number;
  criticalDays?: number;
}): Promise<FinRep | null> {
  if (!canUseFinanceSummaryRpc()) return null;

  const args: Database["public"]["Functions"]["director_finance_fetch_summary_v1"]["Args"] = {
    p_from: pickIso10(opts?.periodFromIso),
    p_to: pickIso10(opts?.periodToIso),
    p_due_days: normalizeFinanceRpcInteger(opts?.dueDaysDefault, 7),
    p_critical_days: normalizeFinanceRpcInteger(opts?.criticalDays, 14),
  };

  const { data, error } = await supabase.rpc(FINANCE_SUMMARY_RPC_NAME, args);
  if (error) {
    markFinanceSummaryRpcStatus(isMissingFinanceSummaryRpcError(error) ? "missing" : "failed");
    throw error;
  }

  markFinanceSummaryRpcStatus("available");
  return adaptDirectorFinanceSummaryPayload(data);
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
