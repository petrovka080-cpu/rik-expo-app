import { supabase } from "../../lib/supabaseClient";
import { listBuyerInbox } from "../../lib/catalog_api";
import { loadDirectorFinanceScreenScope } from "../../lib/api/directorFinanceScope.service";
import {
  loadBuyerBucketsData,
  loadBuyerInboxWindowData,
} from "../../screens/buyer/buyer.fetchers";
import { fetchDirectorPendingProposalWindow } from "../../screens/director/director.proposals.repo";
import type { AssistantContext, AssistantRole } from "./assistant.types";

export type AssistantScopedFacts = {
  summary: string;
  scopeKey: string;
  sourceKinds: string[];
  factCount: number;
};

const formatAmount = (value: number): string =>
  Number(value || 0).toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const toLineList = (lines: (string | null | undefined)[]): string[] =>
  lines.map((line) => String(line ?? "").trim()).filter(Boolean);

const formatOptionalDate = (value: string | null | undefined): string =>
  String(value ?? "").trim() ? String(value).slice(0, 10) : "default";

const buildDirectorFinanceSupplierLine = (
  rows: {
    supplierName: string;
    debt: number;
    overdueAmount: number;
    criticalAmount: number;
    overpayment: number;
  }[],
  field: "debt" | "criticalAmount" | "overpayment",
  label: string,
): string | null => {
  const filtered = rows
    .filter((row) => Number(row[field] ?? 0) > 0)
    .sort((left, right) => Number(right[field] ?? 0) - Number(left[field] ?? 0))
    .slice(0, 3);

  if (!filtered.length) return null;

  return `${label}: ${filtered
    .map((row) => {
      if (field === "debt") {
        return `${row.supplierName} debt ${formatAmount(row.debt)}, overdue ${formatAmount(row.overdueAmount)}, critical ${formatAmount(row.criticalAmount)}`;
      }
      if (field === "criticalAmount") {
        return `${row.supplierName} critical ${formatAmount(row.criticalAmount)}`;
      }
      return `${row.supplierName} overpayment ${formatAmount(row.overpayment)}`;
    })
    .join("; ")}.`;
};

async function loadBuyerScopedFacts(): Promise<AssistantScopedFacts | null> {
  const [buckets, inbox] = await Promise.all([
    loadBuyerBucketsData({ supabase }),
    loadBuyerInboxWindowData({
      supabase,
      listBuyerInbox,
      offsetGroups: 0,
      limitGroups: 5,
      search: null,
    }),
  ]);

  const nextActionRows = inbox.rows.slice(0, 3);
  const factLines = toLineList([
    `Снабжение: входящих групп ${inbox.meta.totalGroupCount}, на экране ${inbox.meta.returnedGroupCount}.`,
    `Предложения: pending ${buckets.pending.length}, approved ${buckets.approved.length}, rejected ${buckets.rejected.length}.`,
    nextActionRows.length
      ? `Первые входящие позиции: ${nextActionRows
        .map((row) => `${row.name_human || row.rik_code || row.request_id} x${Number(row.qty ?? 0)}`)
        .join("; ")}.`
      : null,
  ]);

  if (!factLines.length) return null;

  return {
    summary: factLines.join("\n"),
    scopeKey: "buyer:summary_inbox+summary_buckets",
    sourceKinds: [buckets.sourceMeta.sourceKind, inbox.sourceMeta.sourceKind],
    factCount: factLines.length,
  };
}

async function _loadDirectorScopedFactsLegacy(): Promise<AssistantScopedFacts | null> {
  const [financeScope, proposalWindow] = await Promise.all([
    loadDirectorFinanceScreenScope({}),
    fetchDirectorPendingProposalWindow({
      supabase,
      offsetHeads: 0,
      limitHeads: 5,
    }),
  ]);

  const summary = financeScope.panelScope?.summaryV3;
  const _supplierRows = financeScope.panelScope?.supplierRows ?? [];
  const _financeFilters = financeScope.panelScope?.meta.filtersEcho;
  void _supplierRows;
  void _financeFilters;
  const topSuppliers = financeScope.panelScope?.supplierRows.slice(0, 3) ?? [];
  const proposalHeads = proposalWindow.heads.slice(0, 3);

  const factLines = toLineList([
    summary
      ? `Финансы: payable ${formatAmount(summary.totalPayable)}, debt ${formatAmount(summary.totalDebt)}, overdue ${formatAmount(summary.overdueAmount)}, critical ${formatAmount(summary.criticalAmount)}.`
      : null,
    summary
      ? `Поставщиков в срезе ${summary.supplierRowCount}, строк в панели ${summary.rowCount}.`
      : null,
    topSuppliers.length
      ? `Топ должники: ${topSuppliers
        .map((row) => `${row.supplierName} ${formatAmount(row.debt)}`)
        .join("; ")}.`
      : null,
    `Ожидающих предложений ${proposalWindow.meta.totalHeadCount}, позиций ${proposalWindow.meta.totalPositionsCount}.`,
    proposalHeads.length
      ? `Ближайшие предложения: ${proposalHeads
        .map((head) => head.pretty || head.id)
        .join(", ")}.`
      : null,
  ]);

  if (!factLines.length) return null;

  return {
    summary: factLines.join("\n"),
    scopeKey: "director:finance_panel+pending_proposals",
    sourceKinds: [financeScope.sourceMeta.panelScope, proposalWindow.sourceMeta.sourceKind],
    factCount: factLines.length,
  };
}
void _loadDirectorScopedFactsLegacy;

async function loadDirectorScopedFactsGrounded(): Promise<AssistantScopedFacts | null> {
  const [financeScope, proposalWindow] = await Promise.all([
    loadDirectorFinanceScreenScope({}),
    fetchDirectorPendingProposalWindow({
      supabase,
      offsetHeads: 0,
      limitHeads: 5,
    }),
  ]);

  const summary = financeScope.panelScope?.summaryV3;
  const supplierRows = financeScope.panelScope?.supplierRows ?? [];
  const financeFilters = financeScope.panelScope?.meta.filtersEcho;
  const topSuppliers = supplierRows.slice(0, 3);
  const proposalHeads = proposalWindow.heads.slice(0, 3);

  const factLines = toLineList([
    summary
      ? `Finance: payable ${formatAmount(summary.totalPayable)}, paid ${formatAmount(summary.totalPaid)}, debt ${formatAmount(summary.totalDebt)}, overpayment ${formatAmount(summary.totalOverpayment)}, overdue ${formatAmount(summary.overdueAmount)}, critical ${formatAmount(summary.criticalAmount)}.`
      : null,
    summary
      ? `Risk counts: suppliers ${summary.supplierRowCount}, rows ${summary.rowCount}, debtCount ${summary.debtCount}, overdueCount ${summary.overdueCount}, criticalCount ${summary.criticalCount}.`
      : null,
    financeFilters
      ? `Finance scope: object ${financeFilters.objectId || "all"}, from ${formatOptionalDate(financeFilters.dateFrom)}, to ${formatOptionalDate(financeFilters.dateTo)}, dueDays ${financeFilters.dueDays}, criticalDays ${financeFilters.criticalDays}.`
      : null,
    topSuppliers.length
      ? `Top debtors: ${topSuppliers.map((row) => `${row.supplierName} ${formatAmount(row.debt)}`).join("; ")}.`
      : null,
    buildDirectorFinanceSupplierLine(supplierRows, "criticalAmount", "Critical suppliers"),
    buildDirectorFinanceSupplierLine(supplierRows, "overpayment", "Overpayments"),
    `Pending proposals ${proposalWindow.meta.totalHeadCount}, positions ${proposalWindow.meta.totalPositionsCount}.`,
    proposalHeads.length
      ? `Closest proposals: ${proposalHeads.map((head) => head.pretty || head.id).join(", ")}.`
      : null,
  ]);

  if (!factLines.length) return null;

  return {
    summary: factLines.join("\n"),
    scopeKey: "director:finance_panel_v3+pending_proposals_v1",
    sourceKinds: [financeScope.sourceMeta.panelScope, proposalWindow.sourceMeta.sourceKind],
    factCount: factLines.length,
  };
}

export async function loadAssistantScopedFacts(params: {
  role: AssistantRole;
  context: AssistantContext;
}): Promise<AssistantScopedFacts | null> {
  const role = params.role;
  const context = params.context;

  if (role === "buyer" || context === "buyer") {
    return await loadBuyerScopedFacts().catch(() => null);
  }

  if (role === "director" || context === "director" || context === "reports") {
    return await loadDirectorScopedFactsGrounded().catch(() => null);
  }

  return null;
}
