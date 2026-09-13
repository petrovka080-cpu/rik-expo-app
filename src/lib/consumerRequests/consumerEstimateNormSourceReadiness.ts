import {
  classifyProfessionalNormSourceAdmission,
  type ProfessionalNormSourceAdmission,
} from "../estimate/professionalNormSourceAdmission";
import type {
  ConsumerRepairDraftBundle,
  ConsumerRepairRequestItem,
} from "./consumerRequestTypes";

export type ConsumerEstimateNormSourceGap = {
  item: ConsumerRepairRequestItem;
  reason: ProfessionalNormSourceAdmission["reason"];
};

export type ConsumerEstimateNormSourceAdmissionReport = {
  evaluatedActiveCalculatedRows: number;
  admittedRows: number;
  gaps: ConsumerEstimateNormSourceGap[];
  status: "SOURCE_BACKED" | "SOURCE_GAPS";
};

function isIncludedCalculatedItem(item: ConsumerRepairRequestItem): boolean {
  if (item.sourceParameters?.includedInEstimate === false) return false;
  if (item.sourceParameters?.canonicalPreliminaryNeed === true) return false;
  if (item.itemType === "document") return false;
  if (item.addedBy === "user" || item.source === "user_added") return false;

  return item.addedBy === "ai" ||
    item.addedBy === "system" ||
    item.source === "ai_suggested" ||
    item.source === "reference_price_book" ||
    Boolean(
      item.normId ||
      item.normSourceId ||
      item.normVersion ||
      item.formulaId ||
      item.quantityFormula ||
      item.templateId,
    );
}

/**
 * Finds active generated rows whose normative identity cannot be proven by the
 * same admission contract used by audits, PDF and procurement. Manually added
 * consumer rows are object facts and do not masquerade as catalog norms.
 */
export function consumerEstimateUnadmittedNormSourceItems(
  bundle: ConsumerRepairDraftBundle | null | undefined,
): ConsumerEstimateNormSourceGap[] {
  return consumerEstimateNormSourceAdmissionReport(bundle).gaps;
}

export function consumerEstimateNormSourceAdmissionReport(
  bundle: ConsumerRepairDraftBundle | null | undefined,
): ConsumerEstimateNormSourceAdmissionReport {
  const evaluatedItems = bundle?.items.filter(isIncludedCalculatedItem) ?? [];
  const gaps = evaluatedItems.flatMap((item): ConsumerEstimateNormSourceGap[] => {
    if (!isIncludedCalculatedItem(item)) return [];
    const admission = classifyProfessionalNormSourceAdmission({
      normSourceId: item.normSourceId,
      normId: item.normId,
      normVersion: item.normVersion,
      sourceParameters: item.sourceParameters,
    });
    return admission.admitted ? [] : [{ item, reason: admission.reason }];
  });
  return {
    evaluatedActiveCalculatedRows: evaluatedItems.length,
    admittedRows: evaluatedItems.length - gaps.length,
    gaps,
    status: gaps.length === 0 ? "SOURCE_BACKED" : "SOURCE_GAPS",
  };
}
