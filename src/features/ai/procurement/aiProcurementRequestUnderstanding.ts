import type {
  EvidenceRef,
  ProcurementRequestContext,
  ProcurementRequestContextResolverInput,
  ProcurementRequestedItem,
  ProcurementSourceCheck,
} from "./procurementContextTypes";
import { buildProcurementInternalFirstPlan } from "./procurementInternalFirstEngine";
import { resolveProcurementRequestContext } from "./procurementRequestContextResolver";
import { evidenceRefIds } from "./procurementEvidenceBuilder";

export type AiProcurementMaterialUnderstanding = {
  materialLabel: string;
  category?: string;
  quantity?: number;
  unit?: string;
  urgency?: ProcurementRequestedItem["urgency"];
  internalCatalogCheckRequired: true;
  internalSupplierRankRequired: true;
};

export type AiProcurementRequestUnderstanding = {
  status: ProcurementRequestContext["status"];
  requestIdHash: string;
  role: ProcurementRequestContext["role"];
  screenId: string;
  projectSummary: ProcurementRequestContext["projectSummary"];
  materials: readonly AiProcurementMaterialUnderstanding[];
  missingFields: readonly string[];
  internalEvidenceRefs: readonly EvidenceRef[];
  evidenceRefs: readonly string[];
  sourceOrder: readonly ProcurementSourceCheck[];
  internalFirst: true;
  internalDataChecked: true;
  marketplaceChecked: boolean;
  externalFetch: false;
  externalChecked: false;
  supplierConfirmed: false;
  orderCreated: false;
  warehouseMutated: false;
  paymentCreated: false;
  mutationCount: 0;
  approvalRequired: true;
  recommendedNextStep:
    | "internal_supplier_rank"
    | "request_missing_data"
    | "blocked";
};

export const AI_PROCUREMENT_REQUEST_UNDERSTANDING_CONTRACT = Object.freeze({
  contractId: "ai_procurement_request_understanding_v1",
  sourceOrder: ["internal_app", "marketplace", "external_policy"],
  internalFirst: true,
  externalFetch: false,
  supplierConfirmed: false,
  orderCreated: false,
  warehouseMutated: false,
  paymentCreated: false,
  mutationCount: 0,
} as const);

function mapMaterials(
  items: readonly ProcurementRequestedItem[],
): AiProcurementMaterialUnderstanding[] {
  return items.map((item) => ({
    materialLabel: item.materialLabel,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    urgency: item.urgency,
    internalCatalogCheckRequired: true,
    internalSupplierRankRequired: true,
  }));
}

function nextStep(context: ProcurementRequestContext): AiProcurementRequestUnderstanding["recommendedNextStep"] {
  if (context.status === "blocked") return "blocked";
  if (context.requestedItems.length === 0 || context.missingFields.length > 0) {
    return "request_missing_data";
  }
  return "internal_supplier_rank";
}

export function buildAiProcurementRequestUnderstandingFromContext(
  context: ProcurementRequestContext,
): AiProcurementRequestUnderstanding {
  const internalFirstPlan = buildProcurementInternalFirstPlan({
    context,
    marketplaceEvidenceRefs: [],
    externalRequested: false,
  });

  return {
    status: context.status,
    requestIdHash: context.requestIdHash,
    role: context.role,
    screenId: context.screenId,
    projectSummary: context.projectSummary,
    materials: mapMaterials(context.requestedItems),
    missingFields: [...context.missingFields],
    internalEvidenceRefs: [...context.internalEvidenceRefs],
    evidenceRefs: evidenceRefIds(context.internalEvidenceRefs),
    sourceOrder: [...internalFirstPlan.sourceOrder],
    internalFirst: true,
    internalDataChecked: true,
    marketplaceChecked: internalFirstPlan.marketplaceChecked,
    externalFetch: false,
    externalChecked: false,
    supplierConfirmed: false,
    orderCreated: false,
    warehouseMutated: false,
    paymentCreated: false,
    mutationCount: 0,
    approvalRequired: true,
    recommendedNextStep: nextStep(context),
  };
}

export function understandAiProcurementRequest(
  input: ProcurementRequestContextResolverInput,
): AiProcurementRequestUnderstanding {
  return buildAiProcurementRequestUnderstandingFromContext(
    resolveProcurementRequestContext(input),
  );
}
