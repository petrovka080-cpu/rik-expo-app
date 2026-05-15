import type { AiUserRole } from "../policy/aiRolePolicy";
import {
  buildAiDirectorApprovalCandidate,
  type AiDirectorApprovalCandidate,
} from "./aiDirectorApprovalCandidate";
import type {
  AiDirectorCrossDomainEvidenceResult,
  AiDirectorExecutiveDomain,
} from "./aiDirectorCrossDomainEvidence";
import type {
  AiDirectorDomainRiskPriorityScore,
  AiDirectorRiskLevel,
  AiDirectorRiskPriorityScoringResult,
} from "./aiDirectorRiskPriorityScoring";

export type AiDirectorNextActionPriority = "critical" | "high" | "normal" | "low";

export type AiDirectorNextActionCard = {
  cardId: string;
  domain: AiDirectorExecutiveDomain;
  title: string;
  summary: string;
  priority: AiDirectorNextActionPriority;
  riskLevel: AiDirectorRiskLevel;
  priorityScore: number;
  evidenceRefs: readonly string[];
  approvalCandidate: AiDirectorApprovalCandidate;
  suggestedMode: "approval_required";
  approvalRequired: true;
  safeReadOnly: true;
  evidenceBacked: boolean;
  directExecuteAllowed: false;
  directMutationAllowed: false;
  procurementMutationAllowed: false;
  warehouseMutationAllowed: false;
  financeMutationAllowed: false;
  fieldFinalSubmitAllowed: false;
  providerCalled: false;
  dbWrites: 0;
  finalExecution: 0;
  mutationCount: 0;
};

export type AiDirectorNextActionSelectorResult = {
  status: "selected" | "empty" | "blocked";
  cards: readonly AiDirectorNextActionCard[];
  selectedDomains: readonly AiDirectorExecutiveDomain[];
  topCard: AiDirectorNextActionCard | null;
  approvalActionIds: readonly string[];
  coversProcurement: boolean;
  coversWarehouse: boolean;
  coversFinance: boolean;
  coversForeman: boolean;
  allCardsHaveEvidence: boolean;
  allCardsHaveApprovalCandidates: boolean;
  approvalRequiredOnly: true;
  safeReadOnly: true;
  noDirectExecute: true;
  noDirectFinanceProcurementWarehouseMutation: true;
  providerCalled: false;
  rawRowsReturned: false;
  rawPromptReturned: false;
  rawProviderPayloadReturned: false;
  dbWrites: 0;
  finalExecution: 0;
  mutationCount: 0;
  fakeNextActions: false;
  exactReason: string | null;
};

export const AI_DIRECTOR_NEXT_ACTION_SELECTOR_CONTRACT = Object.freeze({
  contractId: "ai_director_next_action_selector_v1",
  suggestedMode: "approval_required",
  requiredDomains: ["procurement", "warehouse", "finance", "foreman"],
  approvalRequiredOnly: true,
  safeReadOnly: true,
  noDirectExecute: true,
  noDirectFinanceProcurementWarehouseMutation: true,
  providerCalled: false,
  dbWrites: 0,
  finalExecution: 0,
  mutationCount: 0,
  fakeNextActions: false,
} as const);

const DOMAIN_TITLE: Readonly<Record<AiDirectorExecutiveDomain, string>> = Object.freeze({
  procurement: "Procurement next action",
  warehouse: "Warehouse next action",
  finance: "Finance next action",
  foreman: "Field closeout next action",
});

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function priority(level: AiDirectorRiskLevel): AiDirectorNextActionPriority {
  if (level === "critical") return "critical";
  if (level === "high") return "high";
  if (level === "medium") return "normal";
  return "low";
}

function cardId(score: AiDirectorDomainRiskPriorityScore): string {
  return `director:next_action:${score.domain}:${score.rank}`;
}

function buildCard(params: {
  auth: { userId: string; role: AiUserRole } | null;
  evidence: AiDirectorCrossDomainEvidenceResult;
  score: AiDirectorDomainRiskPriorityScore;
}): AiDirectorNextActionCard {
  const approvalCandidate = buildAiDirectorApprovalCandidate(params);
  const evidenceRefs = unique([...params.score.evidenceRefs, ...approvalCandidate.evidenceRefs]);

  return {
    cardId: cardId(params.score),
    domain: params.score.domain,
    title: DOMAIN_TITLE[params.score.domain],
    summary: `${params.score.summary} Route candidate: ${approvalCandidate.actionId}.`,
    priority: priority(params.score.riskLevel),
    riskLevel: params.score.riskLevel,
    priorityScore: params.score.priorityScore,
    evidenceRefs,
    approvalCandidate,
    suggestedMode: "approval_required",
    approvalRequired: true,
    safeReadOnly: true,
    evidenceBacked: params.score.evidenceBacked && evidenceRefs.length > 0 && approvalCandidate.status === "ready",
    directExecuteAllowed: false,
    directMutationAllowed: false,
    procurementMutationAllowed: false,
    warehouseMutationAllowed: false,
    financeMutationAllowed: false,
    fieldFinalSubmitAllowed: false,
    providerCalled: false,
    dbWrites: 0,
    finalExecution: 0,
    mutationCount: 0,
  };
}

export function selectAiDirectorNextActions(params: {
  auth: { userId: string; role: AiUserRole } | null;
  evidence: AiDirectorCrossDomainEvidenceResult;
  scoring: AiDirectorRiskPriorityScoringResult;
  limit?: number;
}): AiDirectorNextActionSelectorResult {
  if (params.evidence.status === "blocked" || params.scoring.status === "blocked") {
    return {
      status: "blocked",
      cards: [],
      selectedDomains: [],
      topCard: null,
      approvalActionIds: [],
      coversProcurement: false,
      coversWarehouse: false,
      coversFinance: false,
      coversForeman: false,
      allCardsHaveEvidence: false,
      allCardsHaveApprovalCandidates: false,
      approvalRequiredOnly: true,
      safeReadOnly: true,
      noDirectExecute: true,
      noDirectFinanceProcurementWarehouseMutation: true,
      providerCalled: false,
      rawRowsReturned: false,
      rawPromptReturned: false,
      rawProviderPayloadReturned: false,
      dbWrites: 0,
      finalExecution: 0,
      mutationCount: 0,
      fakeNextActions: false,
      exactReason: params.evidence.exactReason ?? params.scoring.exactReason,
    };
  }

  const limit = Math.max(1, Math.min(params.limit ?? 4, 8));
  const cards = params.scoring.domainScores
    .slice(0, limit)
    .map((score) => buildCard({ auth: params.auth, evidence: params.evidence, score }));
  const selectedDomains = cards.map((card) => card.domain);
  const domainSet = new Set(selectedDomains);
  const allCardsHaveEvidence = cards.length > 0 && cards.every((card) => card.evidenceBacked);
  const allCardsHaveApprovalCandidates =
    cards.length > 0 &&
    cards.every(
      (card) =>
        card.approvalCandidate.status === "ready" &&
        card.approvalCandidate.route?.routeStatus === "ready" &&
        card.approvalCandidate.directExecuteAllowed === false,
    );

  return {
    status: cards.length > 0 ? "selected" : "empty",
    cards,
    selectedDomains,
    topCard: cards[0] ?? null,
    approvalActionIds: unique(cards.map((card) => card.approvalCandidate.actionId)),
    coversProcurement: domainSet.has("procurement"),
    coversWarehouse: domainSet.has("warehouse"),
    coversFinance: domainSet.has("finance"),
    coversForeman: domainSet.has("foreman"),
    allCardsHaveEvidence,
    allCardsHaveApprovalCandidates,
    approvalRequiredOnly: true,
    safeReadOnly: true,
    noDirectExecute: true,
    noDirectFinanceProcurementWarehouseMutation: true,
    providerCalled: false,
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
    dbWrites: 0,
    finalExecution: 0,
    mutationCount: 0,
    fakeNextActions: false,
    exactReason:
      allCardsHaveEvidence && allCardsHaveApprovalCandidates
        ? null
        : "Director next-action selector requires evidence-backed approval candidates.",
  };
}
