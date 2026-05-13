import type { GetFinanceSummaryToolOutput } from "../tools/getFinanceSummaryTool";
import { buildAiFinanceEvidenceRefs } from "./aiAccountingEvidence";
import type {
  AiFinanceCopilotRiskLevel,
  AiFinanceDebtCard,
  AiFinanceEvidenceRef,
} from "./aiFinanceCopilotTypes";

export const AI_DEBT_SUMMARY_BUILDER_CONTRACT = Object.freeze({
  contractId: "ai_debt_summary_builder_v1",
  sourceTool: "get_finance_summary",
  safeReadOnly: true,
  evidenceRequired: true,
  knownToolRequired: true,
  mutationCount: 0,
  dbWrites: 0,
  paymentCreated: false,
  postingCreated: false,
  invoiceMutated: false,
  fakeFinanceCards: false,
} as const);

function money(value: number): string {
  return `${Math.round(value).toLocaleString("en-US")} KGS`;
}

function riskForSummary(summary: GetFinanceSummaryToolOutput): AiFinanceCopilotRiskLevel {
  if (summary.debt_buckets.critical > 0 || (summary.totals.overdue > 0 && summary.overdue_count > 0)) {
    return "high";
  }
  if (summary.totals.debt > 0 || summary.document_gaps.length > 0) return "medium";
  return "low";
}

function evidenceByRefs(
  refs: readonly AiFinanceEvidenceRef[],
  wanted: readonly AiFinanceEvidenceRef["type"][],
): AiFinanceEvidenceRef[] {
  const filtered = refs.filter((ref) => wanted.includes(ref.type));
  return filtered.length > 0 ? filtered : [...refs];
}

function baseCard(params: {
  debtId: string;
  title: string;
  summary: string;
  amount: number;
  summaryDto: GetFinanceSummaryToolOutput;
  evidenceRefs: readonly AiFinanceEvidenceRef[];
  riskLevel?: AiFinanceCopilotRiskLevel;
}): AiFinanceDebtCard {
  const riskLevel = params.riskLevel ?? riskForSummary(params.summaryDto);
  return {
    debtId: params.debtId,
    title: params.title,
    summary: params.summary,
    riskLevel,
    urgency: riskLevel === "high" ? "today" : riskLevel === "medium" ? "week" : "watch",
    amount: params.amount,
    overdueAmount: params.summaryDto.totals.overdue,
    criticalAmount: params.summaryDto.debt_buckets.critical,
    overdueCount: params.summaryDto.overdue_count,
    documentGaps: params.summaryDto.document_gaps,
    evidenceRefs: params.evidenceRefs,
    suggestedToolId: "get_finance_summary",
    suggestedMode: "safe_read",
    approvalRequired: false,
    mutationCount: 0,
    paymentCreated: false,
    postingCreated: false,
    invoiceMutated: false,
    rawRowsReturned: false,
  };
}

export function buildAiFinanceDebtCards(
  summary: GetFinanceSummaryToolOutput | null,
): AiFinanceDebtCard[] {
  if (!summary) return [];

  const refs = buildAiFinanceEvidenceRefs(summary);
  const cards: AiFinanceDebtCard[] = [];

  if (summary.totals.debt > 0) {
    cards.push(
      baseCard({
        debtId: "finance.debt.total",
        title: "Total payable debt needs review",
        summary: `Redacted finance summary shows ${money(summary.totals.debt)} outstanding debt.`,
        amount: summary.totals.debt,
        summaryDto: summary,
        evidenceRefs: evidenceByRefs(refs, ["finance_summary", "finance_debt_bucket"]),
      }),
    );
  }

  if (summary.totals.overdue > 0 || summary.overdue_count > 0) {
    cards.push(
      baseCard({
        debtId: "finance.debt.overdue",
        title: "Overdue finance bucket needs attention",
        summary: `Overdue bucket is ${money(summary.totals.overdue)} across ${summary.overdue_count} redacted documents.`,
        amount: summary.totals.overdue,
        summaryDto: summary,
        riskLevel: "high",
        evidenceRefs: evidenceByRefs(refs, ["finance_debt_bucket"]),
      }),
    );
  }

  if (summary.document_gaps.length > 0) {
    cards.push(
      baseCard({
        debtId: "finance.documents.gaps",
        title: "Finance documents have closing gaps",
        summary: `${summary.document_gaps.length} redacted document gap(s) need accountant review.`,
        amount: 0,
        summaryDto: summary,
        riskLevel: summary.totals.debt > 0 ? "medium" : "low",
        evidenceRefs: evidenceByRefs(refs, ["finance_document_gap", "finance_summary"]),
      }),
    );
  }

  return cards.filter((card) => card.evidenceRefs.length > 0);
}
