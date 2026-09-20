import type {
  ConsumerRepairDraftBundle,
  ConsumerRepairRequestItem,
} from "./consumerRequestTypes";

const NON_PAYABLE_COST_TREATMENTS = new Set([
  "INCLUDED_IN_RESOURCE_ROWS",
  "INFORMATIONAL_SCOPE",
  "CONTROL_OR_DOCUMENT",
]);

export function isConsumerEstimateIncludedItem(
  item: ConsumerRepairRequestItem,
): boolean {
  return item.sourceParameters?.includedInEstimate !== false;
}

export function isConsumerEstimatePayableItem(
  item: ConsumerRepairRequestItem,
): boolean {
  if (!isConsumerEstimateIncludedItem(item)) return false;
  if (item.sourceParameters?.payable === false) return false;
  return !NON_PAYABLE_COST_TREATMENTS.has(
    String(item.sourceParameters?.canonicalCostTreatment ?? ""),
  );
}

export function consumerEstimateUnresolvedQuantityItems(
  bundle: ConsumerRepairDraftBundle | null | undefined,
): ConsumerRepairRequestItem[] {
  if (!bundle) return [];
  return bundle.items.filter((item) =>
    isConsumerEstimateIncludedItem(item)
      && item.sourceParameters?.canonicalPreliminaryNeed === true
  );
}

export function consumerEstimateUnpricedPayableItems(
  bundle: ConsumerRepairDraftBundle | null | undefined,
): ConsumerRepairRequestItem[] {
  if (!bundle) return [];
  return bundle.items.filter((item) =>
    item.sourceParameters?.canonicalPreliminaryNeed !== true
      && isConsumerEstimatePayableItem(item)
      && (item.unitPrice == null || item.totalPrice == null)
  );
}
