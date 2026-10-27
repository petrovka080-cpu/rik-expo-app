import type { AiUserRole } from "../policy/aiRolePolicy";
import type {
  FinanceSummaryReader,
  GetFinanceSummaryToolInput,
  GetFinanceSummaryToolOutput,
} from "../tools/getFinanceSummaryTool";

export type AiFinanceCopilotRiskLevel = "low" | "medium" | "high";

export type AiFinanceCopilotMode =
  | "safe_read"
  | "draft_only"
  | "approval_required"
  | "forbidden";

export type AiFinanceCopilotStatus = "loaded" | "empty" | "blocked";

export type AiFinanceCopilotClassification =
  | "FINANCE_SAFE_READ_RECOMMENDATION"
  | "FINANCE_DRAFT_SUMMARY_RECOMMENDATION"
  | "FINANCE_APPROVAL_REQUIRED_BLOCKED"
  | "FINANCE_INSUFFICIENT_EVIDENCE_BLOCKED"
  | "FINANCE_ROLE_FORBIDDEN_BLOCKED";

export type AiFinanceCopilotAuthContext = {
  userId: string;
  role: AiUserRole;
};

export type AiFinanceEvidenceType =
  | "finance_summary"
  | "finance_debt_bucket"
  | "finance_document_gap"
  | "finance_draft_summary";

export type AiFinanceEvidenceRef = {
  type: AiFinanceEvidenceType;
  ref: string;
  source: "get_finance_summary" | "finance_copilot_policy";
  redacted: true;
  rawRowsReturned: false;
  rawPromptReturned: false;
  rawProviderPayloadReturned: false;
};

export type AiFinanceCopilotInput = {
  scope?: GetFinanceSummaryToolInput["scope"];
  entityId?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  financeSummary?: GetFinanceSummaryToolOutput | null;
  readFinanceSummary?: FinanceSummaryReader;
};

export type AiFinanceDebtCard = {
  debtId: string;
  title: string;
  summary: string;
  riskLevel: AiFinanceCopilotRiskLevel;
  urgency: "today" | "week" | "watch";
  amount: number;
  overdueAmount: number;
  criticalAmount: number;
  overdueCount: number;
  documentGaps: readonly string[];
  evidenceRefs: readonly AiFinanceEvidenceRef[];
  suggestedToolId: "get_finance_summary";
  suggestedMode: "safe_read" | "draft_only";
  approvalRequired: false;
  mutationCount: 0;
  paymentCreated: false;
  postingCreated: false;
  invoiceMutated: false;
  rawRowsReturned: false;
};

export type AiFinanceEmptyState = {
  reason: string;
  honestEmptyState: true;
  fakeFinanceCards: false;
  mutationCount: 0;
};

export type AiFinanceCopilotSummaryResult = {
  status: AiFinanceCopilotStatus;
  role: AiUserRole;
  summary: GetFinanceSummaryToolOutput | null;
  debtCards: readonly AiFinanceDebtCard[];
  emptyState: AiFinanceEmptyState | null;
  blockedReason: string | null;
  evidenceRefs: readonly AiFinanceEvidenceRef[];
  roleScoped: true;
  developerControlFullAccess: boolean;
  roleIsolationE2eClaimed: false;
  evidenceRequired: true;
  allCardsHaveEvidence: boolean;
  allCardsHaveRiskPolicy: boolean;
  allCardsHaveKnownTool: boolean;
  readOnly: true;
  mutationCount: 0;
  dbWrites: 0;
  directSupabaseFromUi: false;
  mobileExternalFetch: false;
  externalLiveFetch: false;
  finalExecution: 0;
  providerCalled: false;
  rawRowsReturned: false;
  rawPromptReturned: false;
  rawProviderPayloadReturned: false;
  paymentCreated: false;
  postingCreated: false;
  invoiceMutated: false;
  fakeFinanceCards: false;
  hardcodedAiAnswer: false;
};

export type AiFinanceRiskPreview = {
  status: "preview" | "empty" | "blocked";
  classification: AiFinanceCopilotClassification;
  riskLevel: AiFinanceCopilotRiskLevel;
  title: string;
  summary: string;
  debtCards: readonly AiFinanceDebtCard[];
  evidenceRefs: readonly AiFinanceEvidenceRef[];
  suggestedToolId: "get_finance_summary" | null;
  suggestedMode: AiFinanceCopilotMode;
  approvalRequired: boolean;
  roleScoped: true;
  evidenceBacked: boolean;
  mutationCount: 0;
  dbWrites: 0;
  externalLiveFetch: false;
  finalExecution: 0;
  providerCalled: false;
  rawRowsReturned: false;
  paymentCreated: false;
  postingCreated: false;
  invoiceMutated: false;
  fakeFinanceCards: false;
};

export type AiFinanceDraftSummary = {
  status: "draft" | "empty" | "blocked";
  title: string;
  executiveSummary: string;
  bulletPoints: readonly string[];
  evidenceRefs: readonly AiFinanceEvidenceRef[];
  suggestedToolId: "draft_report" | null;
  suggestedMode: "draft_only" | "forbidden";
  approvalRequired: false;
  deterministic: true;
  roleScoped: true;
  evidenceBacked: boolean;
  mutationCount: 0;
  dbWrites: 0;
  externalLiveFetch: false;
  finalExecution: 0;
  providerCalled: false;
  rawRowsReturned: false;
  rawPromptReturned: false;
  rawProviderPayloadReturned: false;
  paymentCreated: false;
  postingCreated: false;
  invoiceMutated: false;
  fakeFinanceCards: false;
  hardcodedAiAnswer: false;
};
