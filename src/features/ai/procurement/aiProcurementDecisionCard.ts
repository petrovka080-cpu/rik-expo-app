import type {
  ProcurementDraftPreviewInput,
  ProcurementDraftPreviewOutput,
  ProcurementRequestContext,
} from "./procurementContextTypes";
import { buildProcurementDraftPreview } from "./procurementDraftPlanBuilder";
import { evidenceRefIds, mergeEvidenceRefIds } from "./procurementEvidenceBuilder";
import { uniqueProcurementRefs } from "./procurementRedaction";
import type { AiProcurementRequestUnderstanding } from "./aiProcurementRequestUnderstanding";
import type { AiInternalSupplierRankResult } from "./aiInternalSupplierRanker";
import {
  buildAiProcurementRiskSignals,
  type AiProcurementRiskLevel,
  type AiProcurementRiskSignal,
} from "./aiProcurementRiskSignals";

export type AiProcurementDecisionAction =
  | "search_catalog"
  | "compare_suppliers"
  | "draft_request"
  | "submit_for_approval";

export type AiProcurementForbiddenAction =
  | "external_live_fetch"
  | "supplier_confirmation"
  | "order_creation"
  | "warehouse_mutation"
  | "payment_creation";

export type AiProcurementDecisionCard = {
  status: "ready" | "empty" | "blocked";
  requestIdHash: string;
  situationSummary: string;
  professionalAssessment: string;
  riskLevel: AiProcurementRiskLevel;
  riskSignals: readonly AiProcurementRiskSignal[];
  safeActions: readonly AiProcurementDecisionAction[];
  draftActions: readonly AiProcurementDecisionAction[];
  approvalRequiredActions: readonly AiProcurementDecisionAction[];
  forbiddenActions: readonly AiProcurementForbiddenAction[];
  evidenceRefs: readonly string[];
  rankedSupplierCount: number;
  missingData: readonly string[];
  internalFirst: true;
  internal_first: true;
  internalDataChecked: true;
  marketplaceChecked: boolean;
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
  requiresApproval: true;
  mutationCount: 0;
};

export type AiProcurementDecisionCardInput = {
  context: ProcurementRequestContext;
  understanding: AiProcurementRequestUnderstanding;
  supplierRank: AiInternalSupplierRankResult | null;
};

export type AiProcurementDecisionCardWithDraft = {
  card: AiProcurementDecisionCard;
  draftPreview: ProcurementDraftPreviewOutput | null;
  draftPreviewCreated: boolean;
  finalExecution: 0;
  mutationCount: 0;
};

export const AI_PROCUREMENT_DECISION_CARD_CONTRACT = Object.freeze({
  contractId: "ai_procurement_decision_card_v1",
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
  requiresApproval: true,
  mutationCount: 0,
} as const);

function cardStatus(input: AiProcurementDecisionCardInput): AiProcurementDecisionCard["status"] {
  if (input.context.status === "blocked" || input.supplierRank?.status === "blocked") return "blocked";
  if (input.context.status === "empty" || input.supplierRank?.status === "empty") return "empty";
  return "ready";
}

function buildSituationSummary(input: AiProcurementDecisionCardInput): string {
  const itemCount = input.context.requestedItems.length;
  const supplierCount = input.supplierRank?.rankedSuppliers.length ?? 0;
  return `Procurement request has ${itemCount} material item(s) and ${supplierCount} internal supplier candidate(s).`;
}

function buildProfessionalAssessment(input: AiProcurementDecisionCardInput): string {
  if (input.context.status === "blocked") {
    return "Role or request scope blocks procurement intelligence for this request.";
  }
  if (input.context.requestedItems.length === 0) {
    return "Request data is incomplete; internal supplier ranking cannot be finalized.";
  }
  if ((input.supplierRank?.rankedSuppliers.length ?? 0) === 0) {
    return "Internal supplier evidence is empty; keep the result as explanation or missing-data follow-up.";
  }
  return "Internal supplier evidence is available for a draft preview, with approval required before execution.";
}

function draftInputFromCard(
  input: AiProcurementDecisionCardInput,
): ProcurementDraftPreviewInput {
  const topSupplier = input.supplierRank?.rankedSuppliers[0]?.supplierLabel;
  const evidenceRefs = mergeEvidenceRefIds(
    evidenceRefIds(input.context.internalEvidenceRefs),
    [...(input.supplierRank?.evidenceRefs ?? [])],
  );

  return {
    requestIdHash: input.context.requestIdHash,
    projectIdHash: input.context.projectSummary.projectIdHash,
    title: input.context.projectSummary.title,
    supplierLabel: topSupplier,
    items: input.context.requestedItems.map((item) => ({
      materialLabel: item.materialLabel,
      quantity: item.quantity,
      unit: item.unit,
      supplierLabel: topSupplier,
    })),
    evidenceRefs,
  };
}

export function buildAiProcurementDecisionCard(
  input: AiProcurementDecisionCardInput,
): AiProcurementDecisionCard {
  const fallbackRisk = buildAiProcurementRiskSignals({
    context: input.context,
    supplierMatch: null,
  });
  const riskLevel = input.supplierRank?.riskLevel ?? fallbackRisk.riskLevel;
  const riskSignals = input.supplierRank?.riskSignals ?? fallbackRisk.riskSignals;
  const evidenceRefs = uniqueProcurementRefs([
    ...input.understanding.evidenceRefs,
    ...(input.supplierRank?.evidenceRefs ?? []),
    ...fallbackRisk.evidenceRefs,
  ]);
  const status = cardStatus(input);

  return {
    status,
    requestIdHash: input.context.requestIdHash,
    situationSummary: buildSituationSummary(input),
    professionalAssessment: buildProfessionalAssessment(input),
    riskLevel,
    riskSignals,
    safeActions: status === "blocked" ? [] : ["search_catalog", "compare_suppliers"],
    draftActions: status === "ready" ? ["draft_request"] : [],
    approvalRequiredActions: status === "ready" ? ["submit_for_approval"] : [],
    forbiddenActions: [
      "external_live_fetch",
      "supplier_confirmation",
      "order_creation",
      "warehouse_mutation",
      "payment_creation",
    ],
    evidenceRefs,
    rankedSupplierCount: input.supplierRank?.rankedSuppliers.length ?? 0,
    missingData: uniqueProcurementRefs([
      ...input.context.missingFields,
      ...(input.supplierRank?.missingData ?? []),
    ]),
    internalFirst: true,
    internal_first: true,
    internalDataChecked: true,
    marketplaceChecked: input.supplierRank?.marketplaceChecked ?? false,
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
    requiresApproval: true,
    mutationCount: 0,
  };
}

export async function buildAiProcurementDecisionCardWithDraftPreview(
  input: AiProcurementDecisionCardInput & {
    auth: Parameters<typeof buildProcurementDraftPreview>[0]["auth"];
  },
): Promise<AiProcurementDecisionCardWithDraft> {
  const card = buildAiProcurementDecisionCard(input);
  if (card.status !== "ready") {
    return {
      card,
      draftPreview: null,
      draftPreviewCreated: false,
      finalExecution: 0,
      mutationCount: 0,
    };
  }

  const draft = await buildProcurementDraftPreview({
    auth: input.auth,
    input: draftInputFromCard(input),
  });

  return {
    card,
    draftPreview: draft.output,
    draftPreviewCreated: draft.output.status === "draft_ready",
    finalExecution: 0,
    mutationCount: 0,
  };
}
