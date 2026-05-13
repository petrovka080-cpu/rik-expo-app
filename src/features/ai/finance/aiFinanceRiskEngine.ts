import {
  canUseAiCapability,
  hasDirectorFullAiAccess,
  type AiUserRole,
} from "../policy/aiRolePolicy";
import type {
  GetFinanceSummaryToolInput,
  GetFinanceSummaryToolOutput,
} from "../tools/getFinanceSummaryTool";
import { aiFinanceDebtCardsHaveEvidence, buildAiFinanceEvidenceRefs } from "./aiAccountingEvidence";
import { buildAiFinanceDebtCards } from "./aiDebtSummaryBuilder";
import type {
  AiFinanceCopilotAuthContext,
  AiFinanceCopilotClassification,
  AiFinanceCopilotInput,
  AiFinanceCopilotRiskLevel,
  AiFinanceCopilotStatus,
  AiFinanceCopilotSummaryResult,
  AiFinanceDebtCard,
  AiFinanceEvidenceRef,
  AiFinanceRiskPreview,
} from "./aiFinanceCopilotTypes";

export const AI_FINANCE_RISK_ENGINE_CONTRACT = Object.freeze({
  contractId: "ai_finance_risk_engine_v1",
  sourceTool: "get_finance_summary",
  backendFirst: true,
  roleScoped: true,
  safeReadOnly: true,
  evidenceRequired: true,
  knownToolRequired: true,
  mutationCount: 0,
  dbWrites: 0,
  directSupabaseFromUi: false,
  mobileExternalFetch: false,
  externalLiveFetch: false,
  providerCalled: false,
  finalExecution: 0,
  paymentCreated: false,
  postingCreated: false,
  invoiceMutated: false,
  fakeFinanceCards: false,
  hardcodedAiAnswer: false,
} as const);

function isAuthenticated(auth: AiFinanceCopilotAuthContext | null): auth is AiFinanceCopilotAuthContext {
  return Boolean(auth && auth.userId.trim().length > 0 && auth.role !== "unknown");
}

function canReadFinance(role: AiUserRole): boolean {
  return canUseAiCapability({ role, domain: "finance", capability: "read_context" });
}

function financeInput(input: AiFinanceCopilotInput | undefined): GetFinanceSummaryToolInput {
  return {
    scope: input?.scope ?? "company",
    entityId: input?.entityId ?? undefined,
    periodStart: input?.periodStart ?? undefined,
    periodEnd: input?.periodEnd ?? undefined,
  };
}

function emptyState(reason: string) {
  return {
    reason,
    honestEmptyState: true as const,
    fakeFinanceCards: false as const,
    mutationCount: 0 as const,
  };
}

function riskLevelForCards(cards: readonly AiFinanceDebtCard[]): AiFinanceCopilotRiskLevel {
  if (cards.some((card) => card.riskLevel === "high")) return "high";
  if (cards.some((card) => card.riskLevel === "medium")) return "medium";
  return "low";
}

function classificationForStatus(
  status: AiFinanceCopilotStatus,
  riskLevel: AiFinanceCopilotRiskLevel,
): AiFinanceCopilotClassification {
  if (status === "blocked") return "FINANCE_ROLE_FORBIDDEN_BLOCKED";
  if (status === "empty") return "FINANCE_INSUFFICIENT_EVIDENCE_BLOCKED";
  return riskLevel === "high"
    ? "FINANCE_SAFE_READ_RECOMMENDATION"
    : "FINANCE_DRAFT_SUMMARY_RECOMMENDATION";
}

function baseResult(params: {
  status: AiFinanceCopilotStatus;
  role: AiUserRole;
  summary?: GetFinanceSummaryToolOutput | null;
  debtCards?: readonly AiFinanceDebtCard[];
  evidenceRefs?: readonly AiFinanceEvidenceRef[];
  blockedReason?: string | null;
  emptyReason?: string | null;
}): AiFinanceCopilotSummaryResult {
  const summary = params.summary ?? null;
  const debtCards = params.debtCards ?? [];
  const evidenceRefs = params.evidenceRefs ?? [];

  return {
    status: params.status,
    role: params.role,
    summary,
    debtCards,
    emptyState:
      params.status === "empty"
        ? emptyState(params.emptyReason ?? "No eligible redacted finance risk evidence is available.")
        : null,
    blockedReason: params.blockedReason ?? null,
    evidenceRefs,
    roleScoped: true,
    developerControlFullAccess: hasDirectorFullAiAccess(params.role),
    roleIsolationE2eClaimed: false,
    evidenceRequired: true,
    allCardsHaveEvidence: aiFinanceDebtCardsHaveEvidence(debtCards),
    allCardsHaveRiskPolicy: debtCards.every((card) => card.riskLevel.length > 0),
    allCardsHaveKnownTool: debtCards.every((card) => card.suggestedToolId === "get_finance_summary"),
    readOnly: true,
    mutationCount: 0,
    dbWrites: 0,
    directSupabaseFromUi: false,
    mobileExternalFetch: false,
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

export async function buildAiFinanceCopilotSummary(params: {
  auth: AiFinanceCopilotAuthContext | null;
  input?: AiFinanceCopilotInput;
}): Promise<AiFinanceCopilotSummaryResult> {
  const role = params.auth?.role ?? "unknown";
  if (!isAuthenticated(params.auth)) {
    return baseResult({
      status: "blocked",
      role,
      blockedReason: "AI finance copilot requires authenticated role context.",
    });
  }

  if (!canReadFinance(params.auth.role)) {
    return baseResult({
      status: "blocked",
      role: params.auth.role,
      blockedReason: "AI finance copilot is not visible for this role.",
    });
  }

  let summary = params.input?.financeSummary ?? null;
  if (!summary) {
    const { runGetFinanceSummaryToolSafeRead } = await import("../tools/getFinanceSummaryTool");
    const envelope = await runGetFinanceSummaryToolSafeRead({
      auth: params.auth,
      input: financeInput(params.input),
      readFinanceSummary: params.input?.readFinanceSummary,
    });

    if (!envelope.ok) {
      return baseResult({
        status: "blocked",
        role: params.auth.role,
        blockedReason: envelope.error.code,
      });
    }
    summary = envelope.data;
  }

  const evidenceRefs = buildAiFinanceEvidenceRefs(summary);
  if (evidenceRefs.length === 0) {
    return baseResult({
      status: "empty",
      role: params.auth.role,
      summary,
      emptyReason: "Finance summary safe-read returned no redacted evidence refs.",
    });
  }

  const debtCards = buildAiFinanceDebtCards(summary);
  return baseResult({
    status: "loaded",
    role: params.auth.role,
    summary,
    debtCards,
    evidenceRefs,
  });
}

export async function previewAiFinanceRisk(params: {
  auth: AiFinanceCopilotAuthContext | null;
  input?: AiFinanceCopilotInput;
}): Promise<AiFinanceRiskPreview> {
  const result = await buildAiFinanceCopilotSummary(params);
  const riskLevel = riskLevelForCards(result.debtCards);
  const hasEvidence = result.evidenceRefs.length > 0;
  const previewStatus =
    result.status === "blocked" ? "blocked" : result.debtCards.length > 0 && hasEvidence ? "preview" : "empty";

  return {
    status: previewStatus,
    classification: classificationForStatus(result.status === "loaded" && previewStatus === "empty" ? "empty" : result.status, riskLevel),
    riskLevel,
    title:
      previewStatus === "preview"
        ? "Finance risk preview"
        : previewStatus === "blocked"
          ? "Finance risk preview blocked"
          : "No finance risk preview available",
    summary:
      previewStatus === "preview"
        ? `${result.debtCards.length} evidence-backed finance card(s) are ready for accountant review.`
        : result.blockedReason ?? result.emptyState?.reason ?? "No eligible redacted finance risk evidence is available.",
    debtCards: result.debtCards,
    evidenceRefs: result.evidenceRefs,
    suggestedToolId: previewStatus === "blocked" ? null : "get_finance_summary",
    suggestedMode: previewStatus === "blocked" ? "forbidden" : "safe_read",
    approvalRequired: false,
    roleScoped: true,
    evidenceBacked: hasEvidence,
    mutationCount: 0,
    dbWrites: 0,
    externalLiveFetch: false,
    finalExecution: 0,
    providerCalled: false,
    rawRowsReturned: false,
    paymentCreated: false,
    postingCreated: false,
    invoiceMutated: false,
    fakeFinanceCards: false,
  };
}
