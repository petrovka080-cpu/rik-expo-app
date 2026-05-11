import { supabase } from "../../lib/supabaseClient";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import { listBuyerInbox } from "../../lib/catalog_api";
import { loadDirectorFinanceScreenScope } from "../../lib/api/directorFinanceScope.service";
import {
  loadBuyerBucketsData,
  loadBuyerInboxWindowData,
} from "../../screens/buyer/buyer.fetchers";
import { fetchDirectorPendingProposalWindow } from "../../screens/director/director.proposals.repo";
import type { AssistantContext, AssistantRole } from "./assistant.types";
import { redactAiContextSummaryText } from "./context/aiContextRedaction";
import { resolveAiScreenIdForAssistantContext } from "./context/aiScreenContext";
import { buildAiKnowledgePromptBlock } from "./knowledge/aiKnowledgeResolver";
import { normalizeAssistantRoleToAiUserRole } from "./schemas/aiRoleSchemas";

export type AssistantScopedFacts = {
  summary: string;
  scopeKey: string;
  sourceKinds: string[];
  factCount: number;
};

const recordAssistantScopeFallback = (
  event: string,
  error: unknown,
  extra?: Record<string, unknown>,
) =>
  recordPlatformObservability({
    screen: "ai",
    surface: "assistant_scope",
    category: "ui",
    event,
    result: "error",
    fallbackUsed: true,
    errorClass: error instanceof Error ? error.name : undefined,
    errorMessage: error instanceof Error ? error.message : String(error ?? "assistant_scope_failed"),
    extra: {
      module: "ai.assistantScopeContext",
      route: "/ai",
      role: "ai",
      owner: "assistant_scope",
      severity: "error",
      ...extra,
    },
  });

const formatAmount = (value: number): string =>
  Number(value || 0).toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const toLineList = (lines: (string | null | undefined)[]): string[] =>
  lines.map((line) => String(line ?? "").trim()).filter(Boolean);

const formatOptionalDate = (value: string | null | undefined): string =>
  String(value ?? "").trim() ? String(value).slice(0, 10) : "default";

const applyAssistantScopeRedaction = (
  facts: AssistantScopedFacts,
  role: AssistantRole,
  context: AssistantContext,
): AssistantScopedFacts => ({
  ...facts,
  summary: redactAiContextSummaryText(facts.summary, {
    role: normalizeAssistantRoleToAiUserRole(role),
    screenId: resolveAiScreenIdForAssistantContext(context),
  }),
});

const buildAssistantKnowledgeScopedFacts = (
  role: AssistantRole,
  context: AssistantContext,
): AssistantScopedFacts => {
  const aiRole = normalizeAssistantRoleToAiUserRole(role);
  const screenId = resolveAiScreenIdForAssistantContext(context);
  return {
    summary: buildAiKnowledgePromptBlock({
      role: aiRole,
      screenId,
    }),
    scopeKey: `ai_knowledge:${screenId}:${aiRole}`,
    sourceKinds: ["ai_knowledge_registry"],
    factCount: 1,
  };
};

const mergeAssistantKnowledgeWithFacts = (
  knowledgeFacts: AssistantScopedFacts,
  facts: AssistantScopedFacts | null,
): AssistantScopedFacts => {
  if (!facts) return knowledgeFacts;
  return {
    summary: `${knowledgeFacts.summary}\n\nREAD_ONLY_FACTS\n${facts.summary}`,
    scopeKey: `${knowledgeFacts.scopeKey}+${facts.scopeKey}`,
    sourceKinds: [...knowledgeFacts.sourceKinds, ...facts.sourceKinds],
    factCount: knowledgeFacts.factCount + facts.factCount,
  };
};

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
    `РЎРЅР°Р±Р¶РµРЅРёРµ: РІС…РѕРґСЏС‰РёС… РіСЂСѓРїРї ${inbox.meta.totalGroupCount}, РЅР° СЌРєСЂР°РЅРµ ${inbox.meta.returnedGroupCount}.`,
    `РџСЂРµРґР»РѕР¶РµРЅРёСЏ: pending ${buckets.pending.length}, approved ${buckets.approved.length}, rejected ${buckets.rejected.length}.`,
    nextActionRows.length
      ? `РџРµСЂРІС‹Рµ РІС…РѕРґСЏС‰РёРµ РїРѕР·РёС†РёРё: ${nextActionRows
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

  const summary = financeScope.panelScope?.canonical.summary;
  const supplierRows = financeScope.panelScope?.canonical.suppliers ?? [];
  const financeFilters = financeScope.panelScope?.meta.filtersEcho;
  const topSuppliers = supplierRows.slice(0, 3);
  const proposalHeads = proposalWindow.heads.slice(0, 3);

  void financeFilters;

  const factLines = toLineList([
    summary
      ? `Р¤РёРЅР°РЅСЃС‹: payable ${formatAmount(summary.approvedTotal)}, debt ${formatAmount(summary.debtTotal)}, overdue ${formatAmount(summary.overdueAmount)}, critical ${formatAmount(summary.criticalAmount)}.`
      : null,
    summary
      ? `РџРѕСЃС‚Р°РІС‰РёРєРѕРІ РІ СЃСЂРµР·Рµ ${supplierRows.length}, СЃС‚СЂРѕРє РІ РїР°РЅРµР»Рё ${financeScope.panelScope?.pagination.total ?? 0}.`
      : null,
    topSuppliers.length
      ? `РўРѕРї РґРѕР»Р¶РЅРёРєРё: ${topSuppliers
          .map((row) => `${row.supplierName} ${formatAmount(row.debtTotal)}`)
          .join("; ")}.`
      : null,
    `РћР¶РёРґР°СЋС‰РёС… РїСЂРµРґР»РѕР¶РµРЅРёР№ ${proposalWindow.meta.totalHeadCount}, РїРѕР·РёС†РёР№ ${proposalWindow.meta.totalPositionsCount}.`,
    proposalHeads.length
      ? `Р‘Р»РёР¶Р°Р№С€РёРµ РїСЂРµРґР»РѕР¶РµРЅРёСЏ: ${proposalHeads
          .map((head) => head.pretty || head.id)
          .join(", ")}.`
      : null,
  ]);

  if (!factLines.length) return null;

  return {
    summary: factLines.join("\n"),
    scopeKey: "director:finance_panel_v4+pending_proposals_v1",
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

  const summary = financeScope.panelScope?.canonical.summary;
  const supplierRows =
    financeScope.panelScope?.canonical.suppliers.map((row) => ({
      supplierName: row.supplierName,
      debt: row.debtTotal,
      overdueAmount: row.overdueAmount,
      criticalAmount: row.criticalAmount,
      overpayment: row.overpaymentTotal,
    })) ?? [];
  const financeFilters = financeScope.panelScope?.meta.filtersEcho;
  const topSuppliers = supplierRows.slice(0, 3);
  const proposalHeads = proposalWindow.heads.slice(0, 3);

  const factLines = toLineList([
    summary
      ? `Finance: payable ${formatAmount(summary.approvedTotal)}, paid ${formatAmount(summary.paidTotal)}, debt ${formatAmount(summary.debtTotal)}, overpayment ${formatAmount(summary.overpaymentTotal)}, overdue ${formatAmount(summary.overdueAmount)}, critical ${formatAmount(summary.criticalAmount)}.`
      : null,
    summary
      ? `Risk counts: suppliers ${supplierRows.length}, rows ${financeScope.panelScope?.pagination.total ?? 0}, debtCount ${summary.debtCount}, overdueCount ${summary.overdueCount}, criticalCount ${summary.criticalCount}.`
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
    scopeKey: "director:finance_panel_v4+pending_proposals_v1",
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
  const knowledgeFacts = buildAssistantKnowledgeScopedFacts(role, context);

  if (role === "buyer" || context === "buyer") {
    const facts = await loadBuyerScopedFacts().catch((error) => {
      recordAssistantScopeFallback("load_buyer_scoped_facts_failed", error, {
        action: "loadBuyerScopedFacts",
        scopeRole: role,
        scopeContext: context,
      });
      return null;
    });
    return mergeAssistantKnowledgeWithFacts(
      knowledgeFacts,
      facts ? applyAssistantScopeRedaction(facts, role, context) : null,
    );
  }

  if (role === "director" || context === "director" || context === "reports") {
    const facts = await loadDirectorScopedFactsGrounded().catch((error) => {
      recordAssistantScopeFallback("load_director_scoped_facts_failed", error, {
        action: "loadDirectorScopedFactsGrounded",
        scopeRole: role,
        scopeContext: context,
      });
      return null;
    });
    return mergeAssistantKnowledgeWithFacts(
      knowledgeFacts,
      facts ? applyAssistantScopeRedaction(facts, role, context) : null,
    );
  }

  return knowledgeFacts;
}
