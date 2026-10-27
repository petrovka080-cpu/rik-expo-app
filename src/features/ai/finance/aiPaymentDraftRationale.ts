import { draftAiFinanceSummary } from "./aiFinanceDraftSummary";
import type {
  AiFinanceCopilotAuthContext,
  AiFinanceDraftSummary,
} from "./aiFinanceCopilotTypes";
import type {
  AiFinanceEvidenceResolverResult,
} from "./aiFinanceEvidenceResolver";
import type {
  AiPaymentRiskClassifierResult,
} from "./aiPaymentRiskClassifier";

export type AiPaymentDraftRationaleKind =
  | "explain_finance_summary"
  | "draft_payment_rationale"
  | "draft_history_review"
  | "draft_director_finance_summary";

export type AiPaymentDraftRationaleItem = {
  kind: AiPaymentDraftRationaleKind;
  title: string;
  summary: string;
  evidenceRefs: readonly string[];
  approvalCandidateExpected: boolean;
  draftOnly: true;
  directExecutionAllowed: false;
  paymentExecutionAllowed: false;
  financePostingAllowed: false;
  ledgerBypassAllowed: false;
};

export type AiPaymentDraftRationaleResult = {
  status: "planned" | "empty" | "blocked";
  draftSummary: AiFinanceDraftSummary | null;
  rationaleItems: readonly AiPaymentDraftRationaleItem[];
  evidenceBacked: boolean;
  draftOnly: true;
  approvalCandidateExpected: boolean;
  directExecutionAllowed: false;
  paymentExecutionAllowed: false;
  financePostingAllowed: false;
  ledgerBypassAllowed: false;
  paymentCreated: false;
  postingCreated: false;
  invoiceMutated: false;
  mutationCount: 0;
  dbWrites: 0;
  providerCalled: false;
  rawRowsReturned: false;
  rawPromptReturned: false;
  rawProviderPayloadReturned: false;
  fakeDraftCreated: false;
  exactReason: string | null;
};

export const AI_PAYMENT_DRAFT_RATIONALE_CONTRACT = Object.freeze({
  contractId: "ai_payment_draft_rationale_v1",
  draftOnly: true,
  approvalCandidateExpected: true,
  directExecutionAllowed: false,
  paymentExecutionAllowed: false,
  financePostingAllowed: false,
  ledgerBypassAllowed: false,
  paymentCreated: false,
  postingCreated: false,
  invoiceMutated: false,
  mutationCount: 0,
  dbWrites: 0,
  providerCalled: false,
  rawRowsReturned: false,
  rawPromptReturned: false,
  rawProviderPayloadReturned: false,
  fakeDraftCreated: false,
} as const);

function evidenceIds(result: AiFinanceEvidenceResolverResult): string[] {
  return result.evidenceRefs.map((ref) => `${ref.type}:${ref.ref}`);
}

function rationaleItem(params: {
  kind: AiPaymentDraftRationaleKind;
  title: string;
  summary: string;
  evidenceRefs: readonly string[];
  approvalCandidateExpected?: boolean;
}): AiPaymentDraftRationaleItem {
  return {
    kind: params.kind,
    title: params.title,
    summary: params.summary,
    evidenceRefs: [...params.evidenceRefs],
    approvalCandidateExpected: params.approvalCandidateExpected ?? true,
    draftOnly: true,
    directExecutionAllowed: false,
    paymentExecutionAllowed: false,
    financePostingAllowed: false,
    ledgerBypassAllowed: false,
  };
}

function rationaleItemsForScreen(params: {
  evidence: AiFinanceEvidenceResolverResult;
  risk: AiPaymentRiskClassifierResult;
}): AiPaymentDraftRationaleItem[] {
  const refs = evidenceIds(params.evidence);
  if (refs.length === 0) return [];

  const explainSummary = rationaleItem({
    kind: "explain_finance_summary",
    title: "Explain finance summary",
    summary: params.evidence.evidenceSummary.accountantSummary,
    evidenceRefs: refs,
    approvalCandidateExpected: false,
  });
  if (params.evidence.screenId === "accountant.payment") {
    return [
      explainSummary,
      rationaleItem({
        kind: "draft_payment_rationale",
        title: "Draft payment rationale",
        summary: params.evidence.evidenceSummary.paymentSummary,
        evidenceRefs: refs,
      }),
    ];
  }
  if (params.evidence.screenId === "accountant.history") {
    return [
      explainSummary,
      rationaleItem({
        kind: "draft_history_review",
        title: "Draft payment history review",
        summary: params.evidence.evidenceSummary.historySummary,
        evidenceRefs: refs,
      }),
    ];
  }
  if (params.evidence.screenId === "director.finance") {
    return [
      explainSummary,
      rationaleItem({
        kind: "draft_director_finance_summary",
        title: "Draft director finance summary",
        summary: params.evidence.evidenceSummary.directorFinanceSummary,
        evidenceRefs: refs,
      }),
    ];
  }
  return [
    explainSummary,
    rationaleItem({
      kind: "draft_payment_rationale",
      title: "Draft accountant payment rationale",
      summary:
        params.risk.riskLevel === "low"
          ? "Draft a watch note from redacted finance evidence."
          : "Draft an approval-only payment rationale from finance risk evidence.",
      evidenceRefs: refs,
    }),
  ];
}

function blockedResult(reason: string): AiPaymentDraftRationaleResult {
  return {
    status: "blocked",
    draftSummary: null,
    rationaleItems: [],
    evidenceBacked: false,
    draftOnly: true,
    approvalCandidateExpected: true,
    directExecutionAllowed: false,
    paymentExecutionAllowed: false,
    financePostingAllowed: false,
    ledgerBypassAllowed: false,
    paymentCreated: false,
    postingCreated: false,
    invoiceMutated: false,
    mutationCount: 0,
    dbWrites: 0,
    providerCalled: false,
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
    fakeDraftCreated: false,
    exactReason: reason,
  };
}

export async function buildAiPaymentDraftRationale(params: {
  auth: AiFinanceCopilotAuthContext | null;
  evidence: AiFinanceEvidenceResolverResult;
  risk: AiPaymentRiskClassifierResult;
}): Promise<AiPaymentDraftRationaleResult> {
  if (!params.auth || params.auth.userId.trim().length === 0 || params.auth.role !== params.evidence.role) {
    return blockedResult("Payment draft rationale requires the original authenticated role context.");
  }
  if (params.evidence.status === "blocked" || params.risk.status === "blocked") {
    return blockedResult(params.evidence.exactReason ?? params.risk.exactReason ?? "Payment draft rationale is blocked.");
  }

  const rationaleItems = rationaleItemsForScreen(params);
  if (rationaleItems.length === 0 || !params.evidence.financeSummary) {
    return {
      ...blockedResult("No redacted finance evidence is available for payment draft rationale."),
      status: "empty",
      rationaleItems,
    };
  }

  const draftSummary = await draftAiFinanceSummary({
    auth: params.auth,
    input: {
      scope: params.evidence.financeSummary.redacted_breakdown.scope,
      financeSummary: params.evidence.financeSummary,
    },
  });
  const evidenceBacked =
    rationaleItems.every((entry) => entry.evidenceRefs.length > 0) &&
    draftSummary.evidenceBacked === true;
  const status = evidenceBacked && draftSummary.status !== "blocked" ? "planned" : "empty";

  return {
    status,
    draftSummary,
    rationaleItems,
    evidenceBacked,
    draftOnly: true,
    approvalCandidateExpected: rationaleItems.some((entry) => entry.approvalCandidateExpected),
    directExecutionAllowed: false,
    paymentExecutionAllowed: false,
    financePostingAllowed: false,
    ledgerBypassAllowed: false,
    paymentCreated: false,
    postingCreated: false,
    invoiceMutated: false,
    mutationCount: 0,
    dbWrites: 0,
    providerCalled: false,
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
    fakeDraftCreated: false,
    exactReason: status === "planned" ? null : "Payment draft rationale requires evidence-backed draft summary output.",
  };
}
