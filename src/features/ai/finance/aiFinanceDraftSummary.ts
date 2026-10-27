import {
  canUseAiCapability,
  type AiUserRole,
} from "../policy/aiRolePolicy";
import { buildAiFinanceDraftEvidenceRefs } from "./aiAccountingEvidence";
import { buildAiFinanceCopilotSummary } from "./aiFinanceRiskEngine";
import type {
  AiFinanceCopilotAuthContext,
  AiFinanceCopilotInput,
  AiFinanceDraftSummary,
} from "./aiFinanceCopilotTypes";

export const AI_FINANCE_DRAFT_SUMMARY_CONTRACT = Object.freeze({
  contractId: "ai_finance_draft_summary_v1",
  deterministic: true,
  sourceTool: "get_finance_summary",
  targetTool: "draft_report",
  draftOnly: true,
  evidenceRequired: true,
  mutationCount: 0,
  dbWrites: 0,
  externalLiveFetch: false,
  providerCalled: false,
  finalExecution: 0,
  paymentCreated: false,
  postingCreated: false,
  invoiceMutated: false,
  fakeFinanceCards: false,
  hardcodedAiAnswer: false,
} as const);

function canDraftFinanceSummary(role: AiUserRole): boolean {
  return canUseAiCapability({ role, domain: "finance", capability: "summarize" }) &&
    canUseAiCapability({ role, domain: "reports", capability: "draft" });
}

function formatAmount(value: number): string {
  return `${Math.round(value).toLocaleString("en-US")} KGS`;
}

function blockedDraft(reason: string): AiFinanceDraftSummary {
  return {
    status: "blocked",
    title: "Finance draft summary blocked",
    executiveSummary: reason,
    bulletPoints: [],
    evidenceRefs: [],
    suggestedToolId: null,
    suggestedMode: "forbidden",
    approvalRequired: false,
    deterministic: true,
    roleScoped: true,
    evidenceBacked: false,
    mutationCount: 0,
    dbWrites: 0,
    externalLiveFetch: false,
    finalExecution: 0,
    providerCalled: false,
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
    paymentCreated: false,
    postingCreated: false,
    invoiceMutated: false,
    fakeFinanceCards: false,
    hardcodedAiAnswer: false,
  };
}

export async function draftAiFinanceSummary(params: {
  auth: AiFinanceCopilotAuthContext | null;
  input?: AiFinanceCopilotInput;
}): Promise<AiFinanceDraftSummary> {
  if (!params.auth || params.auth.userId.trim().length === 0 || params.auth.role === "unknown") {
    return blockedDraft("AI finance draft summary requires authenticated role context.");
  }
  if (!canDraftFinanceSummary(params.auth.role)) {
    return blockedDraft("AI finance draft summary is not visible for this role.");
  }

  const summaryResult = await buildAiFinanceCopilotSummary(params);
  if (summaryResult.status === "blocked") {
    return blockedDraft(summaryResult.blockedReason ?? "Finance summary safe-read is blocked.");
  }
  if (!summaryResult.summary || summaryResult.evidenceRefs.length === 0) {
    return {
      ...blockedDraft("No redacted finance evidence is available for a draft summary."),
      status: "empty",
      title: "Finance draft summary empty",
      suggestedMode: "draft_only",
      suggestedToolId: "draft_report",
    };
  }

  const totals = summaryResult.summary.totals;
  const evidenceRefs = buildAiFinanceDraftEvidenceRefs(summaryResult.summary);
  const bulletPoints = [
    `Payable: ${formatAmount(totals.payable)}.`,
    `Paid: ${formatAmount(totals.paid)}.`,
    `Debt: ${formatAmount(totals.debt)}; overdue: ${formatAmount(totals.overdue)}.`,
    `Document gaps: ${summaryResult.summary.document_gaps.length}.`,
  ];

  return {
    status: "draft",
    title: "Director finance summary draft",
    executiveSummary:
      summaryResult.debtCards.length > 0
        ? "Redacted finance evidence shows debt or document risks that can be summarized for review."
        : "Redacted finance evidence is available; no actionable debt card was produced.",
    bulletPoints,
    evidenceRefs,
    suggestedToolId: "draft_report",
    suggestedMode: "draft_only",
    approvalRequired: false,
    deterministic: true,
    roleScoped: true,
    evidenceBacked: evidenceRefs.length > 0,
    mutationCount: 0,
    dbWrites: 0,
    externalLiveFetch: false,
    finalExecution: 0,
    providerCalled: false,
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
    paymentCreated: false,
    postingCreated: false,
    invoiceMutated: false,
    fakeFinanceCards: false,
    hardcodedAiAnswer: false,
  };
}
