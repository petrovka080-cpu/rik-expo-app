import { stableEstimateRevisionHash } from "../estimateRevisions";
import type { PhotoMaterialCandidate, PhotoMaterialConfirmationPayload } from "./photoMaterialExistingRowTypes";

export function photoMaterialCandidatePayloadHash(
  candidate: Omit<PhotoMaterialCandidate, "payloadHash">,
): string {
  return stableEstimateRevisionHash({
    productId: candidate.productId,
    catalogItemId: candidate.catalogItemId ?? null,
    visibleName: candidate.visibleName,
    packageLabel: candidate.packageLabel ?? null,
    packageQuantity: candidate.packageQuantity ?? null,
    packageUnit: candidate.packageUnit ?? null,
    barcode: candidate.barcode ?? null,
    materialKey: candidate.materialKey,
    unit: candidate.unit,
    unitLabel: candidate.unitLabel,
    confidence: candidate.confidence,
    source: candidate.source,
    photoUnitPrice: candidate.photoUnitPrice ?? null,
    governedUnitPrice: candidate.governedUnitPrice ?? null,
    governedPriceSourceId: candidate.governedPriceSourceId ?? null,
    currency: candidate.currency,
  });
}

export function photoMaterialConfirmationPayloadHash(payload: PhotoMaterialConfirmationPayload): string {
  return stableEstimateRevisionHash({
    scanId: payload.scanId,
    candidateId: payload.candidateId,
    candidatePayloadHash: payload.candidatePayloadHash,
    targetRowId: payload.targetRowId,
    baseRevisionId: payload.baseRevisionId,
    priceDecision: payload.priceDecision,
    quantityDecision: payload.quantityDecision,
    confirmedByUserId: payload.confirmedByUserId,
  });
}
