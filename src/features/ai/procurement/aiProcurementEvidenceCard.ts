import type { AiProcurementApprovalCandidate } from "./aiProcurementApprovalCandidate";
import type { AiInternalSupplierRankResult } from "./aiInternalSupplierRanker";
import type { AiProcurementInternalExternalBoundary } from "./aiProcurementInternalExternalBoundary";
import type { AiProcurementRiskLevel, AiProcurementRiskSignal } from "./aiProcurementRiskSignals";
import type { AiProcurementRequestUnderstanding } from "./aiProcurementRequestUnderstanding";
import type { ProcurementRequestContext } from "./procurementContextTypes";
import { evidenceRefIds } from "./procurementEvidenceBuilder";
import { uniqueProcurementRefs } from "./procurementRedaction";

export type AiProcurementEvidenceCardKind =
  | "recommended_internal_option"
  | "evidence"
  | "risk"
  | "missing_data"
  | "approval_action_candidate";

export type AiProcurementEvidenceCard = {
  cardId: string;
  kind: AiProcurementEvidenceCardKind;
  title: string;
  summary: string;
  supplierLabel: string | null;
  riskLevel: AiProcurementRiskLevel | null;
  riskSignals: readonly AiProcurementRiskSignal[];
  missingData: readonly string[];
  evidenceRefs: readonly string[];
  approvalCandidate: AiProcurementApprovalCandidate | null;
  internalFirst: true;
  evidenceBacked: boolean;
  approvalRequired: true;
  externalPreviewOnly: boolean;
  rawRowsReturned: false;
  rawPromptReturned: false;
  rawProviderPayloadReturned: false;
  mutationCount: 0;
};

export type AiProcurementEvidenceCardSet = {
  cards: readonly AiProcurementEvidenceCard[];
  recommendedInternalOption: AiProcurementEvidenceCard;
  evidence: AiProcurementEvidenceCard;
  risk: AiProcurementEvidenceCard;
  missingData: AiProcurementEvidenceCard;
  approvalActionCandidate: AiProcurementEvidenceCard;
  allCardsHaveEvidence: boolean;
  rawRowsReturned: false;
  rawPromptReturned: false;
  rawProviderPayloadReturned: false;
  mutationCount: 0;
};

export const AI_PROCUREMENT_EVIDENCE_CARD_CONTRACT = Object.freeze({
  contractId: "ai_procurement_evidence_card_v1",
  requiredCards: [
    "recommended_internal_option",
    "evidence",
    "risk",
    "missing_data",
    "approval_action_candidate",
  ],
  internalFirst: true,
  approvalRequired: true,
  rawRowsReturned: false,
  rawPromptReturned: false,
  rawProviderPayloadReturned: false,
  mutationCount: 0,
} as const);

function card(params: {
  requestIdHash: string;
  kind: AiProcurementEvidenceCardKind;
  title: string;
  summary: string;
  supplierLabel?: string | null;
  riskLevel?: AiProcurementRiskLevel | null;
  riskSignals?: readonly AiProcurementRiskSignal[];
  missingData?: readonly string[];
  evidenceRefs: readonly string[];
  approvalCandidate?: AiProcurementApprovalCandidate | null;
  externalPreviewOnly?: boolean;
}): AiProcurementEvidenceCard {
  const evidenceRefs = uniqueProcurementRefs([...params.evidenceRefs]);
  return {
    cardId: `procurement:${params.kind}:${params.requestIdHash}`,
    kind: params.kind,
    title: params.title,
    summary: params.summary,
    supplierLabel: params.supplierLabel ?? null,
    riskLevel: params.riskLevel ?? null,
    riskSignals: params.riskSignals ?? [],
    missingData: params.missingData ?? [],
    evidenceRefs,
    approvalCandidate: params.approvalCandidate ?? null,
    internalFirst: true,
    evidenceBacked: evidenceRefs.length > 0,
    approvalRequired: true,
    externalPreviewOnly: params.externalPreviewOnly ?? false,
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
    mutationCount: 0,
  };
}

export function buildAiProcurementEvidenceCards(params: {
  context: ProcurementRequestContext;
  understanding: AiProcurementRequestUnderstanding;
  supplierRank: AiInternalSupplierRankResult;
  externalBoundary: AiProcurementInternalExternalBoundary;
  approvalCandidate: AiProcurementApprovalCandidate;
}): AiProcurementEvidenceCardSet {
  const topSupplier = params.supplierRank.rankedSuppliers[0] ?? null;
  const internalEvidenceRefs = evidenceRefIds(params.context.internalEvidenceRefs);
  const supplierEvidenceRefs = uniqueProcurementRefs([
    ...params.supplierRank.evidenceRefs,
    ...(topSupplier?.evidenceRefs ?? []),
  ]);
  const evidenceRefs = uniqueProcurementRefs([
    ...params.understanding.evidenceRefs,
    ...internalEvidenceRefs,
    ...supplierEvidenceRefs,
  ]);
  const missingData = uniqueProcurementRefs([
    ...params.understanding.missingFields,
    ...params.supplierRank.missingData,
  ]);
  const recommendedInternalOption = card({
    requestIdHash: params.context.requestIdHash,
    kind: "recommended_internal_option",
    title: "Recommended internal option",
    summary: topSupplier
      ? `${topSupplier.supplierLabel} is the highest-ranked internal supplier candidate.`
      : "No internal supplier candidate is available for recommendation.",
    supplierLabel: topSupplier?.supplierLabel ?? null,
    riskLevel: params.supplierRank.riskLevel,
    riskSignals: params.supplierRank.riskSignals,
    missingData,
    evidenceRefs: supplierEvidenceRefs.length > 0 ? supplierEvidenceRefs : evidenceRefs,
  });
  const evidence = card({
    requestIdHash: params.context.requestIdHash,
    kind: "evidence",
    title: "Evidence",
    summary: `Decision uses ${evidenceRefs.length} redacted internal evidence reference(s).`,
    evidenceRefs,
    externalPreviewOnly: params.externalBoundary.externalPreviewUsed,
  });
  const risk = card({
    requestIdHash: params.context.requestIdHash,
    kind: "risk",
    title: "Risk",
    summary: `Procurement risk is ${params.supplierRank.riskLevel}.`,
    riskLevel: params.supplierRank.riskLevel,
    riskSignals: params.supplierRank.riskSignals,
    evidenceRefs,
  });
  const missing = card({
    requestIdHash: params.context.requestIdHash,
    kind: "missing_data",
    title: "Missing data",
    summary:
      missingData.length === 0
        ? "No blocking missing data was detected for the internal-first recommendation."
        : `${missingData.length} missing data item(s) must be resolved before execution.`,
    missingData,
    evidenceRefs,
  });
  const approvalActionCandidate = card({
    requestIdHash: params.context.requestIdHash,
    kind: "approval_action_candidate",
    title: "Approval action candidate",
    summary: params.approvalCandidate.approvalSummary,
    supplierLabel: params.approvalCandidate.recommendedSupplierLabel,
    evidenceRefs: params.approvalCandidate.evidenceRefs,
    approvalCandidate: params.approvalCandidate,
  });
  const cards = [
    recommendedInternalOption,
    evidence,
    risk,
    missing,
    approvalActionCandidate,
  ];

  return {
    cards,
    recommendedInternalOption,
    evidence,
    risk,
    missingData: missing,
    approvalActionCandidate,
    allCardsHaveEvidence: cards.every((entry) => entry.evidenceBacked),
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
    mutationCount: 0,
  };
}
