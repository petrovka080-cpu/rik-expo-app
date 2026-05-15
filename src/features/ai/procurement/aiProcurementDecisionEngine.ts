import type {
  ExternalSupplierCandidatesOutput,
  ProcurementAuthContext,
  ProcurementCatalogReader,
  ProcurementRequestContext,
  ProcurementSafeRequestSnapshot,
  ProcurementSupplierReader,
} from "./procurementContextTypes";
import { resolveProcurementRequestContext } from "./procurementRequestContextResolver";
import {
  buildAiProcurementRequestUnderstandingFromContext,
  type AiProcurementRequestUnderstanding,
} from "./aiProcurementRequestUnderstanding";
import {
  rankAiInternalSuppliers,
  type AiInternalSupplierRankResult,
} from "./aiInternalSupplierRanker";
import { buildAiProcurementDecisionCard, type AiProcurementDecisionCard } from "./aiProcurementDecisionCard";
import {
  buildAiProcurementApprovalCandidate,
  type AiProcurementApprovalCandidate,
} from "./aiProcurementApprovalCandidate";
import {
  buildAiProcurementEvidenceCards,
  type AiProcurementEvidenceCardSet,
} from "./aiProcurementEvidenceCard";
import {
  resolveAiProcurementInternalExternalBoundary,
  type AiProcurementInternalExternalBoundary,
} from "./aiProcurementInternalExternalBoundary";
import { uniqueProcurementRefs } from "./procurementRedaction";

export type AiProcurementDecisionEngineFinalStatus =
  | "GREEN_AI_PROCUREMENT_INTERNAL_FIRST_DECISION_ENGINE_READY"
  | "BLOCKED_AI_PROCUREMENT_INTERNAL_EVIDENCE_MISSING"
  | "BLOCKED_AI_PROCUREMENT_APPROVAL_ROUTE_MISSING"
  | "BLOCKED_AI_PROCUREMENT_RUNTIME_TARGETABILITY";

export type AiProcurementDecisionEngineInput = {
  auth: ProcurementAuthContext | null;
  requestId: string;
  screenId: string;
  organizationId?: string;
  cursor?: string | null;
  location?: string;
  limit?: number;
  requestSnapshot?: ProcurementSafeRequestSnapshot | null;
  searchCatalogItems?: ProcurementCatalogReader;
  listSuppliers?: ProcurementSupplierReader;
  externalPreview?: ExternalSupplierCandidatesOutput | null;
};

export type AiProcurementDecisionEngineResult = {
  finalStatus: AiProcurementDecisionEngineFinalStatus;
  exactReason: string | null;
  context: ProcurementRequestContext;
  understanding: AiProcurementRequestUnderstanding;
  supplierRank: AiInternalSupplierRankResult;
  decisionCard: AiProcurementDecisionCard;
  evidenceCards: AiProcurementEvidenceCardSet;
  externalBoundary: AiProcurementInternalExternalBoundary;
  approvalCandidate: AiProcurementApprovalCandidate;
  recommendedInternalOptionReady: boolean;
  evidenceCardsReady: boolean;
  riskSignalsReady: boolean;
  missingDataTracked: boolean;
  approvalActionCandidateReady: boolean;
  internalFirst: true;
  internalDataChecked: true;
  marketplaceChecked: true;
  externalFetch: false;
  external_fetch: false;
  externalPreviewOnly: boolean;
  supplierConfirmed: false;
  supplier_confirmed: false;
  orderCreated: false;
  order_created: false;
  warehouseMutated: false;
  warehouse_mutated: false;
  paymentCreated: false;
  payment_created: false;
  fakeSuppliersCreated: false;
  fakeExternalResultsCreated: false;
  rawRowsReturned: false;
  rawPromptReturned: false;
  rawProviderPayloadReturned: false;
  approvalRequired: true;
  mutationCount: 0;
  finalExecution: 0;
};

export const AI_PROCUREMENT_DECISION_ENGINE_CONTRACT = Object.freeze({
  contractId: "ai_procurement_internal_first_decision_engine_v1",
  finalStatusGreen: "GREEN_AI_PROCUREMENT_INTERNAL_FIRST_DECISION_ENGINE_READY",
  internalFirst: true,
  internalDataChecked: true,
  marketplaceChecked: true,
  externalFetch: false,
  external_fetch: false,
  externalPreviewOnly: true,
  supplierConfirmed: false,
  supplier_confirmed: false,
  orderCreated: false,
  order_created: false,
  warehouseMutated: false,
  warehouse_mutated: false,
  paymentCreated: false,
  payment_created: false,
  fakeSuppliersCreated: false,
  fakeExternalResultsCreated: false,
  rawRowsReturned: false,
  rawPromptReturned: false,
  rawProviderPayloadReturned: false,
  approvalRequired: true,
  mutationCount: 0,
  finalExecution: 0,
} as const);

function finalStatus(params: {
  supplierRank: AiInternalSupplierRankResult;
  decisionCard: AiProcurementDecisionCard;
  evidenceCards: AiProcurementEvidenceCardSet;
  approvalCandidate: AiProcurementApprovalCandidate;
}): {
  finalStatus: AiProcurementDecisionEngineFinalStatus;
  exactReason: string | null;
} {
  if (
    params.supplierRank.status === "blocked" ||
    params.supplierRank.evidenceRefs.length === 0 ||
    params.decisionCard.evidenceRefs.length === 0 ||
    !params.evidenceCards.allCardsHaveEvidence
  ) {
    return {
      finalStatus: "BLOCKED_AI_PROCUREMENT_INTERNAL_EVIDENCE_MISSING",
      exactReason: "Internal procurement request evidence is missing; no fake decision card was created.",
    };
  }
  if (params.approvalCandidate.status !== "ready") {
    return {
      finalStatus: "BLOCKED_AI_PROCUREMENT_APPROVAL_ROUTE_MISSING",
      exactReason: params.approvalCandidate.blocker ?? "Procurement approval action route is not ready.",
    };
  }
  return {
    finalStatus: "GREEN_AI_PROCUREMENT_INTERNAL_FIRST_DECISION_ENGINE_READY",
    exactReason: null,
  };
}

export async function runAiProcurementDecisionEngine(
  input: AiProcurementDecisionEngineInput,
): Promise<AiProcurementDecisionEngineResult> {
  const context = resolveProcurementRequestContext({
    auth: input.auth,
    requestId: input.requestId,
    screenId: input.screenId,
    organizationId: input.organizationId,
    cursor: input.cursor,
    requestSnapshot: input.requestSnapshot,
  });
  const understanding = buildAiProcurementRequestUnderstandingFromContext(context);
  const supplierRank = await rankAiInternalSuppliers({
    auth: input.auth,
    context,
    location: input.location,
    limit: input.limit,
    searchCatalogItems: input.searchCatalogItems,
    listSuppliers: input.listSuppliers,
  });
  const decisionCard = buildAiProcurementDecisionCard({
    context,
    understanding,
    supplierRank,
  });
  const externalBoundary = resolveAiProcurementInternalExternalBoundary({
    supplierRank,
    externalPreview: input.externalPreview,
  });
  const evidenceRefs = uniqueProcurementRefs([
    ...understanding.evidenceRefs,
    ...supplierRank.evidenceRefs,
    ...decisionCard.evidenceRefs,
    ...externalBoundary.externalEvidenceRefs,
  ]);
  const approvalCandidate = buildAiProcurementApprovalCandidate({
    auth: input.auth,
    context,
    recommendedSupplier: supplierRank.rankedSuppliers[0] ?? null,
    evidenceRefs,
  });
  const evidenceCards = buildAiProcurementEvidenceCards({
    context,
    understanding,
    supplierRank,
    externalBoundary,
    approvalCandidate,
  });
  const status = finalStatus({
    supplierRank,
    decisionCard,
    evidenceCards,
    approvalCandidate,
  });

  return {
    finalStatus: status.finalStatus,
    exactReason: status.exactReason,
    context,
    understanding,
    supplierRank,
    decisionCard,
    evidenceCards,
    externalBoundary,
    approvalCandidate,
    recommendedInternalOptionReady: supplierRank.rankedSuppliers.length > 0,
    evidenceCardsReady: evidenceCards.allCardsHaveEvidence,
    riskSignalsReady: supplierRank.riskSignals.length > 0,
    missingDataTracked: Array.isArray(decisionCard.missingData),
    approvalActionCandidateReady: approvalCandidate.status === "ready",
    internalFirst: true,
    internalDataChecked: true,
    marketplaceChecked: true,
    externalFetch: false,
    external_fetch: false,
    externalPreviewOnly: externalBoundary.externalCitedPreviewOnly,
    supplierConfirmed: false,
    supplier_confirmed: false,
    orderCreated: false,
    order_created: false,
    warehouseMutated: false,
    warehouse_mutated: false,
    paymentCreated: false,
    payment_created: false,
    fakeSuppliersCreated: false,
    fakeExternalResultsCreated: false,
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
    approvalRequired: true,
    mutationCount: 0,
    finalExecution: 0,
  };
}
