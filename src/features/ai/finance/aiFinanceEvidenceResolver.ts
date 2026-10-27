import type { AiUserRole } from "../policy/aiRolePolicy";
import type { GetFinanceSummaryToolOutput } from "../tools/getFinanceSummaryTool";
import {
  aiFinanceEvidenceComplete,
  buildAiFinanceEvidenceRefs,
} from "./aiAccountingEvidence";
import {
  buildAiFinanceCopilotSummary,
} from "./aiFinanceRiskEngine";
import type {
  AiFinanceCopilotAuthContext,
  AiFinanceCopilotInput,
  AiFinanceEvidenceRef,
} from "./aiFinanceCopilotTypes";

export type AiFinanceCopilotScreenId =
  | "accountant.main"
  | "accountant.payment"
  | "accountant.history"
  | "director.finance";

export type AiFinanceEvidenceResolverFinalStatus =
  | "loaded"
  | "empty"
  | "blocked";

export type AiFinanceEvidenceSummary = {
  accountantSummary: string;
  paymentSummary: string;
  historySummary: string;
  directorFinanceSummary: string;
};

export type AiFinanceEvidenceResolverResult = {
  status: AiFinanceEvidenceResolverFinalStatus;
  screenId: AiFinanceCopilotScreenId;
  role: AiUserRole;
  financeSummary: GetFinanceSummaryToolOutput | null;
  evidenceSummary: AiFinanceEvidenceSummary;
  evidenceRefs: readonly AiFinanceEvidenceRef[];
  evidenceBacked: boolean;
  roleScoped: true;
  coversAccountantMain: boolean;
  coversAccountantPayment: boolean;
  coversAccountantHistory: boolean;
  coversDirectorFinance: boolean;
  paymentHistoryExplained: boolean;
  paymentRiskExplained: boolean;
  financeSummaryExplained: boolean;
  safeReadOnly: true;
  draftOnly: true;
  approvalRequiredForPayment: true;
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
  fakeFinanceEvidence: false;
  exactReason: string | null;
};

export const AI_FINANCE_EVIDENCE_RESOLVER_CONTRACT = Object.freeze({
  contractId: "ai_finance_evidence_resolver_v1",
  screens: ["accountant.main", "accountant.payment", "accountant.history", "director.finance"],
  sourceTool: "get_finance_summary",
  safeReadOnly: true,
  draftOnly: true,
  approvalRequiredForPayment: true,
  directPaymentAllowed: false,
  directFinancePostingAllowed: false,
  ledgerBypassAllowed: false,
  mutationCount: 0,
  dbWrites: 0,
  rawRowsReturned: false,
  rawPromptReturned: false,
  rawProviderPayloadReturned: false,
  providerCalled: false,
  fakeFinanceEvidence: false,
} as const);

const FINANCE_COPILOT_SCREENS: readonly AiFinanceCopilotScreenId[] = [
  "accountant.main",
  "accountant.payment",
  "accountant.history",
  "director.finance",
];

function isFinanceCopilotScreenId(value: string): value is AiFinanceCopilotScreenId {
  return FINANCE_COPILOT_SCREENS.includes(value as AiFinanceCopilotScreenId);
}

function money(value: number): string {
  return `${Math.round(value).toLocaleString("en-US")} KGS`;
}

function summaryText(summary: GetFinanceSummaryToolOutput | null): AiFinanceEvidenceSummary {
  if (!summary) {
    return {
      accountantSummary: "Finance summary is not available.",
      paymentSummary: "Payment rationale evidence is not available.",
      historySummary: "Finance history evidence is not available.",
      directorFinanceSummary: "Director finance summary is not available.",
    };
  }

  return {
    accountantSummary:
      `Payable ${money(summary.totals.payable)}, paid ${money(summary.totals.paid)}, debt ${money(summary.totals.debt)}.`,
    paymentSummary:
      `Payment review sees ${money(summary.totals.debt)} debt and ${money(summary.totals.overdue)} overdue.`,
    historySummary:
      `${summary.overdue_count} overdue document(s), ${summary.document_gaps.length} redacted document gap(s).`,
    directorFinanceSummary:
      `Finance scope ${summary.redacted_breakdown.scope} has ${summary.redacted_breakdown.document_count} redacted document(s).`,
  };
}

function baseResult(params: {
  status: AiFinanceEvidenceResolverFinalStatus;
  screenId: AiFinanceCopilotScreenId;
  role: AiUserRole;
  financeSummary?: GetFinanceSummaryToolOutput | null;
  evidenceRefs?: readonly AiFinanceEvidenceRef[];
  exactReason?: string | null;
}): AiFinanceEvidenceResolverResult {
  const financeSummary = params.financeSummary ?? null;
  const evidenceRefs = params.evidenceRefs ?? [];
  const evidenceBacked = aiFinanceEvidenceComplete({ evidenceRefs });

  return {
    status: params.status,
    screenId: params.screenId,
    role: params.role,
    financeSummary,
    evidenceSummary: summaryText(financeSummary),
    evidenceRefs,
    evidenceBacked,
    roleScoped: true,
    coversAccountantMain: true,
    coversAccountantPayment: true,
    coversAccountantHistory: true,
    coversDirectorFinance: true,
    paymentHistoryExplained: financeSummary !== null && evidenceBacked,
    paymentRiskExplained: financeSummary !== null && evidenceBacked,
    financeSummaryExplained: financeSummary !== null && evidenceBacked,
    safeReadOnly: true,
    draftOnly: true,
    approvalRequiredForPayment: true,
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
    fakeFinanceEvidence: false,
    exactReason: params.exactReason ?? null,
  };
}

export async function resolveAiFinanceEvidence(params: {
  auth: AiFinanceCopilotAuthContext | null;
  screenId: string;
  input?: AiFinanceCopilotInput;
}): Promise<AiFinanceEvidenceResolverResult> {
  const screenId = isFinanceCopilotScreenId(params.screenId)
    ? params.screenId
    : "accountant.main";
  const role = params.auth?.role ?? "unknown";
  if (!isFinanceCopilotScreenId(params.screenId)) {
    return baseResult({
      status: "blocked",
      screenId,
      role,
      exactReason:
        "Finance evidence resolver only covers accountant.main, accountant.payment, accountant.history, and director.finance.",
    });
  }

  const summaryResult = await buildAiFinanceCopilotSummary({
    auth: params.auth,
    input: params.input,
  });
  if (summaryResult.status === "blocked") {
    return baseResult({
      status: "blocked",
      screenId,
      role: summaryResult.role,
      exactReason: summaryResult.blockedReason ?? "Finance safe-read evidence route is blocked.",
    });
  }

  const financeSummary = summaryResult.summary;
  const evidenceRefs = buildAiFinanceEvidenceRefs(financeSummary);
  if (!financeSummary || evidenceRefs.length === 0) {
    return baseResult({
      status: "empty",
      screenId,
      role: summaryResult.role,
      financeSummary,
      evidenceRefs,
      exactReason: summaryResult.emptyState?.reason ?? "No redacted finance evidence refs were returned.",
    });
  }

  return baseResult({
    status: "loaded",
    screenId,
    role: summaryResult.role,
    financeSummary,
    evidenceRefs,
  });
}
