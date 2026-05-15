import type { ExternalIntelCitation } from "../externalIntel/externalIntelTypes";
import type { ExternalSupplierCandidatesOutput } from "./procurementContextTypes";
import type { AiInternalSupplierRankResult } from "./aiInternalSupplierRanker";
import { uniqueProcurementRefs } from "./procurementRedaction";

export type AiProcurementExternalFallbackReason =
  | "internal_supplier_evidence_available"
  | "internal_supplier_candidates_missing"
  | "internal_request_data_missing"
  | "internal_rank_blocked";

export type AiProcurementInternalExternalBoundaryInput = {
  supplierRank: AiInternalSupplierRankResult;
  externalPreview?: ExternalSupplierCandidatesOutput | null;
};

export type AiProcurementInternalExternalBoundary = {
  status: "internal_only" | "fallback_context" | "blocked";
  fallbackReason: AiProcurementExternalFallbackReason;
  internalFirst: true;
  internalDataChecked: true;
  marketplaceChecked: true;
  externalPreviewUsed: boolean;
  externalCitedPreviewOnly: true;
  externalFetchStarted: false;
  uncontrolledExternalFetch: false;
  externalResultCanFinalize: false;
  externalCandidatesConsidered: number;
  externalEvidenceRefs: readonly string[];
  citations: readonly ExternalIntelCitation[];
  supplierConfirmationAllowed: false;
  orderCreationAllowed: false;
  warehouseMutationAllowed: false;
  paymentCreationAllowed: false;
  finalActionAllowed: false;
  mutationCount: 0;
};

export const AI_PROCUREMENT_INTERNAL_EXTERNAL_BOUNDARY_CONTRACT = Object.freeze({
  contractId: "ai_procurement_internal_external_boundary_v1",
  internalFirst: true,
  internalDataChecked: true,
  marketplaceChecked: true,
  externalCitedPreviewOnly: true,
  externalFetchStarted: false,
  uncontrolledExternalFetch: false,
  externalResultCanFinalize: false,
  supplierConfirmationAllowed: false,
  orderCreationAllowed: false,
  warehouseMutationAllowed: false,
  paymentCreationAllowed: false,
  finalActionAllowed: false,
  mutationCount: 0,
} as const);

function fallbackReason(
  supplierRank: AiInternalSupplierRankResult,
): AiProcurementExternalFallbackReason {
  if (supplierRank.status === "blocked") return "internal_rank_blocked";
  if (supplierRank.missingData.length > 0) return "internal_request_data_missing";
  if (supplierRank.rankedSuppliers.length === 0) return "internal_supplier_candidates_missing";
  return "internal_supplier_evidence_available";
}

export function shouldUseAiProcurementExternalCitedPreview(
  supplierRank: AiInternalSupplierRankResult,
): boolean {
  return (
    supplierRank.status !== "loaded" ||
    supplierRank.rankedSuppliers.length === 0 ||
    supplierRank.missingData.length > 0
  );
}

export function resolveAiProcurementInternalExternalBoundary(
  input: AiProcurementInternalExternalBoundaryInput,
): AiProcurementInternalExternalBoundary {
  const useExternalPreview =
    shouldUseAiProcurementExternalCitedPreview(input.supplierRank) &&
    Boolean(input.externalPreview);
  const externalPreview = useExternalPreview ? input.externalPreview ?? null : null;
  const externalEvidenceRefs = uniqueProcurementRefs(
    externalPreview?.candidates.flatMap((candidate) => candidate.evidenceRefs) ?? [],
  );
  const status =
    input.supplierRank.status === "blocked"
      ? "blocked"
      : externalPreview
        ? "fallback_context"
        : "internal_only";

  return {
    status,
    fallbackReason: fallbackReason(input.supplierRank),
    internalFirst: true,
    internalDataChecked: true,
    marketplaceChecked: true,
    externalPreviewUsed: Boolean(externalPreview),
    externalCitedPreviewOnly: true,
    externalFetchStarted: false,
    uncontrolledExternalFetch: false,
    externalResultCanFinalize: false,
    externalCandidatesConsidered: externalPreview?.candidates.length ?? 0,
    externalEvidenceRefs,
    citations: externalPreview?.citations ?? [],
    supplierConfirmationAllowed: false,
    orderCreationAllowed: false,
    warehouseMutationAllowed: false,
    paymentCreationAllowed: false,
    finalActionAllowed: false,
    mutationCount: 0,
  };
}
