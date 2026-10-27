import { buildAiFinanceDebtCards } from "./aiDebtSummaryBuilder";
import type {
  AiFinanceCopilotRiskLevel,
  AiFinanceDebtCard,
} from "./aiFinanceCopilotTypes";
import type {
  AiFinanceEvidenceResolverResult,
} from "./aiFinanceEvidenceResolver";

export type AiPaymentRiskSignalKind =
  | "debt_present"
  | "overdue_payment"
  | "critical_debt_bucket"
  | "document_gap"
  | "history_review"
  | "watch";

export type AiPaymentRiskSignal = {
  kind: AiPaymentRiskSignalKind;
  level: AiFinanceCopilotRiskLevel;
  summary: string;
  evidenceRefs: readonly string[];
  approvalRequiredForPayment: true;
  directPaymentAllowed: false;
  directPostingAllowed: false;
};

export type AiPaymentRiskClassifierResult = {
  status: "classified" | "empty" | "blocked";
  riskLevel: AiFinanceCopilotRiskLevel;
  debtCards: readonly AiFinanceDebtCard[];
  riskSignals: readonly AiPaymentRiskSignal[];
  evidenceBacked: boolean;
  paymentRiskClassified: boolean;
  approvalRequiredForPayment: true;
  draftOnly: true;
  directPaymentAllowed: false;
  directFinancePostingAllowed: false;
  ledgerBypassAllowed: false;
  paymentCreated: false;
  postingCreated: false;
  invoiceMutated: false;
  mutationCount: 0;
  dbWrites: 0;
  rawRowsReturned: false;
  rawPromptReturned: false;
  rawProviderPayloadReturned: false;
  providerCalled: false;
  fakeRiskSignals: false;
  exactReason: string | null;
};

export const AI_PAYMENT_RISK_CLASSIFIER_CONTRACT = Object.freeze({
  contractId: "ai_payment_risk_classifier_v1",
  riskKinds: ["debt_present", "overdue_payment", "critical_debt_bucket", "document_gap", "history_review", "watch"],
  approvalRequiredForPayment: true,
  draftOnly: true,
  directPaymentAllowed: false,
  directFinancePostingAllowed: false,
  ledgerBypassAllowed: false,
  paymentCreated: false,
  postingCreated: false,
  invoiceMutated: false,
  mutationCount: 0,
  dbWrites: 0,
  rawRowsReturned: false,
  rawPromptReturned: false,
  rawProviderPayloadReturned: false,
  providerCalled: false,
  fakeRiskSignals: false,
} as const);

function evidenceIds(result: AiFinanceEvidenceResolverResult): string[] {
  return result.evidenceRefs.map((ref) => `${ref.type}:${ref.ref}`);
}

function signal(params: {
  kind: AiPaymentRiskSignalKind;
  level: AiFinanceCopilotRiskLevel;
  summary: string;
  evidenceRefs: readonly string[];
}): AiPaymentRiskSignal {
  return {
    kind: params.kind,
    level: params.level,
    summary: params.summary,
    evidenceRefs: [...params.evidenceRefs],
    approvalRequiredForPayment: true,
    directPaymentAllowed: false,
    directPostingAllowed: false,
  };
}

function riskLevelForEvidence(result: AiFinanceEvidenceResolverResult): AiFinanceCopilotRiskLevel {
  const summary = result.financeSummary;
  if (!summary) return "low";
  if (summary.debt_buckets.critical > 0 || summary.totals.overdue > 0 || summary.overdue_count > 0) {
    return "high";
  }
  if (summary.totals.debt > 0 || summary.document_gaps.length > 0) return "medium";
  return "low";
}

function buildSignals(
  result: AiFinanceEvidenceResolverResult,
  riskLevel: AiFinanceCopilotRiskLevel,
): AiPaymentRiskSignal[] {
  const summary = result.financeSummary;
  const refs = evidenceIds(result);
  if (!summary || refs.length === 0) return [];

  const signals: AiPaymentRiskSignal[] = [];
  if (summary.totals.debt > 0) {
    signals.push(signal({
      kind: "debt_present",
      level: riskLevel === "high" ? "high" : "medium",
      summary: "Redacted finance summary shows outstanding debt requiring accountant review.",
      evidenceRefs: refs,
    }));
  }
  if (summary.totals.overdue > 0 || summary.overdue_count > 0) {
    signals.push(signal({
      kind: "overdue_payment",
      level: "high",
      summary: "Overdue payment evidence is present in the bounded finance summary.",
      evidenceRefs: refs,
    }));
  }
  if (summary.debt_buckets.critical > 0) {
    signals.push(signal({
      kind: "critical_debt_bucket",
      level: "high",
      summary: "Critical debt bucket is nonzero and requires approval-only payment handling.",
      evidenceRefs: refs,
    }));
  }
  if (summary.document_gaps.length > 0) {
    signals.push(signal({
      kind: "document_gap",
      level: riskLevel === "high" ? "medium" : "low",
      summary: "Finance document gaps must be resolved before payment execution.",
      evidenceRefs: refs,
    }));
  }
  if (result.screenId === "accountant.history") {
    signals.push(signal({
      kind: "history_review",
      level: riskLevel,
      summary: "Payment history review should remain safe-read and evidence-backed.",
      evidenceRefs: refs,
    }));
  }

  if (signals.length === 0) {
    signals.push(signal({
      kind: "watch",
      level: riskLevel,
      summary: "No blocking finance risk was detected; continue evidence-backed monitoring.",
      evidenceRefs: refs,
    }));
  }

  return signals;
}

function blockedResult(reason: string | null): AiPaymentRiskClassifierResult {
  return {
    status: "blocked",
    riskLevel: "low",
    debtCards: [],
    riskSignals: [],
    evidenceBacked: false,
    paymentRiskClassified: false,
    approvalRequiredForPayment: true,
    draftOnly: true,
    directPaymentAllowed: false,
    directFinancePostingAllowed: false,
    ledgerBypassAllowed: false,
    paymentCreated: false,
    postingCreated: false,
    invoiceMutated: false,
    mutationCount: 0,
    dbWrites: 0,
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
    providerCalled: false,
    fakeRiskSignals: false,
    exactReason: reason,
  };
}

export function classifyAiPaymentRisk(
  result: AiFinanceEvidenceResolverResult,
): AiPaymentRiskClassifierResult {
  if (result.status === "blocked") {
    return blockedResult(result.exactReason);
  }

  const riskLevel = riskLevelForEvidence(result);
  const debtCards = buildAiFinanceDebtCards(result.financeSummary);
  const riskSignals = buildSignals(result, riskLevel);
  const evidenceBacked = result.evidenceBacked && riskSignals.every((entry) => entry.evidenceRefs.length > 0);
  const status = evidenceBacked ? "classified" : "empty";

  return {
    status,
    riskLevel,
    debtCards,
    riskSignals,
    evidenceBacked,
    paymentRiskClassified: status === "classified",
    approvalRequiredForPayment: true,
    draftOnly: true,
    directPaymentAllowed: false,
    directFinancePostingAllowed: false,
    ledgerBypassAllowed: false,
    paymentCreated: false,
    postingCreated: false,
    invoiceMutated: false,
    mutationCount: 0,
    dbWrites: 0,
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
    providerCalled: false,
    fakeRiskSignals: false,
    exactReason: status === "classified" ? null : "Payment risk classifier requires redacted finance evidence.",
  };
}
