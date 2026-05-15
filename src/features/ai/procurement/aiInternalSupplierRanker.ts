import { previewProcurementSupplierMatch } from "./procurementSupplierMatchEngine";
import type {
  ProcurementAuthContext,
  ProcurementCatalogReader,
  ProcurementRequestContext,
  ProcurementSupplierReader,
  SupplierMatchPreviewOutput,
} from "./procurementContextTypes";
import { evidenceRefIds, mergeEvidenceRefIds } from "./procurementEvidenceBuilder";
import { clampProcurementLimit, uniqueProcurementRefs } from "./procurementRedaction";
import {
  buildAiProcurementRiskSignals,
  type AiProcurementRiskLevel,
  type AiProcurementRiskSignal,
} from "./aiProcurementRiskSignals";

export type AiInternalSupplierRankedCandidate = {
  rank: number;
  supplierLabel: string;
  score: number;
  priceBucket?: SupplierMatchPreviewOutput["supplierCards"][number]["priceBucket"];
  deliveryBucket?: SupplierMatchPreviewOutput["supplierCards"][number]["deliveryBucket"];
  availabilityBucket?: SupplierMatchPreviewOutput["supplierCards"][number]["availabilityBucket"];
  riskFlags: readonly string[];
  evidenceRefs: readonly string[];
  supplierConfirmed: false;
  orderCreated: false;
};

export type AiInternalSupplierRankRequest = {
  auth: ProcurementAuthContext | null;
  context: ProcurementRequestContext;
  location?: string;
  limit?: number;
  searchCatalogItems?: ProcurementCatalogReader;
  listSuppliers?: ProcurementSupplierReader;
};

export type AiInternalSupplierRankResult = {
  status: SupplierMatchPreviewOutput["status"];
  requestIdHash: string;
  internalFirst: true;
  internal_first: true;
  internalDataChecked: true;
  marketplaceChecked: true;
  externalFetch: false;
  external_fetch: false;
  supplierConfirmed: false;
  supplier_confirmed: false;
  orderCreated: false;
  order_created: false;
  warehouseMutated: false;
  warehouse_mutated: false;
  paymentCreated: false;
  payment_created: false;
  rankedSuppliers: readonly AiInternalSupplierRankedCandidate[];
  supplierCards: SupplierMatchPreviewOutput["supplierCards"];
  riskLevel: AiProcurementRiskLevel;
  riskSignals: readonly AiProcurementRiskSignal[];
  missingData: readonly string[];
  nextAction: SupplierMatchPreviewOutput["nextAction"];
  evidenceRefs: readonly string[];
  requiresApproval: true;
  mutationCount: 0;
};

export const AI_INTERNAL_SUPPLIER_RANKER_CONTRACT = Object.freeze({
  contractId: "ai_internal_supplier_ranker_v1",
  internalFirst: true,
  internal_first: true,
  externalFetch: false,
  external_fetch: false,
  supplierConfirmed: false,
  supplier_confirmed: false,
  orderCreated: false,
  order_created: false,
  warehouseMutated: false,
  warehouse_mutated: false,
  paymentCreated: false,
  payment_created: false,
  mutationCount: 0,
  noFakeSuppliers: true,
} as const);

const DEFAULT_RANK_LIMIT = 5;
const MAX_RANK_LIMIT = 10;

function bucketScore(params: {
  priceBucket?: AiInternalSupplierRankedCandidate["priceBucket"];
  deliveryBucket?: AiInternalSupplierRankedCandidate["deliveryBucket"];
  availabilityBucket?: AiInternalSupplierRankedCandidate["availabilityBucket"];
  riskFlags: readonly string[];
}): number {
  const price = params.priceBucket === "low" ? 12 : params.priceBucket === "medium" ? 8 : 4;
  const delivery =
    params.deliveryBucket === "fast" ? 12 : params.deliveryBucket === "normal" ? 8 : 4;
  const availability =
    params.availabilityBucket === "available"
      ? 12
      : params.availabilityBucket === "limited"
        ? 6
        : 4;
  const riskPenalty = Math.min(params.riskFlags.length * 4, 16);
  return Math.max(0, price + delivery + availability - riskPenalty);
}

function rankSupplierCards(
  cards: SupplierMatchPreviewOutput["supplierCards"],
): AiInternalSupplierRankedCandidate[] {
  return [...cards]
    .map((card) => ({
      supplierLabel: card.supplierLabel,
      score: bucketScore(card),
      priceBucket: card.priceBucket,
      deliveryBucket: card.deliveryBucket,
      availabilityBucket: card.availabilityBucket,
      riskFlags: uniqueProcurementRefs(card.riskFlags),
      evidenceRefs: uniqueProcurementRefs(card.evidenceRefs),
      supplierConfirmed: false as const,
      orderCreated: false as const,
    }))
    .sort((left, right) => right.score - left.score || left.supplierLabel.localeCompare(right.supplierLabel))
    .map((card, index) => ({
      ...card,
      rank: index + 1,
    }));
}

export async function rankAiInternalSuppliers(
  request: AiInternalSupplierRankRequest,
): Promise<AiInternalSupplierRankResult> {
  const limit = clampProcurementLimit(request.limit, DEFAULT_RANK_LIMIT, MAX_RANK_LIMIT);
  const supplierMatch = await previewProcurementSupplierMatch({
    auth: request.auth,
    context: request.context,
    input: {
      requestIdHash: request.context.requestIdHash,
      items: request.context.requestedItems.map((item) => ({
        materialLabel: item.materialLabel,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
      })),
      location: request.location ?? request.context.projectSummary.locationBucket,
      limit,
    },
    externalRequested: false,
    searchCatalogItems: request.searchCatalogItems,
    listSuppliers: request.listSuppliers,
  });
  const risk = buildAiProcurementRiskSignals({
    context: request.context,
    supplierMatch: supplierMatch.output,
  });
  const evidenceRefs = mergeEvidenceRefIds(
    evidenceRefIds(request.context.internalEvidenceRefs),
    [...supplierMatch.output.evidenceRefs],
    [...risk.evidenceRefs],
  );
  const rankedSuppliers = rankSupplierCards(supplierMatch.output.supplierCards);

  return {
    status: supplierMatch.output.status,
    requestIdHash: request.context.requestIdHash,
    internalFirst: true,
    internal_first: true,
    internalDataChecked: true,
    marketplaceChecked: true,
    externalFetch: false,
    external_fetch: false,
    supplierConfirmed: false,
    supplier_confirmed: false,
    orderCreated: false,
    order_created: false,
    warehouseMutated: false,
    warehouse_mutated: false,
    paymentCreated: false,
    payment_created: false,
    rankedSuppliers,
    supplierCards: supplierMatch.output.supplierCards,
    riskLevel: risk.riskLevel,
    riskSignals: risk.riskSignals,
    missingData: supplierMatch.output.missingData,
    nextAction: supplierMatch.output.nextAction,
    evidenceRefs,
    requiresApproval: true,
    mutationCount: 0,
  };
}
