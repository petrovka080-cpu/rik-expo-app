import type {
  ConsumerRepairDraftBundle,
  ConsumerRepairRequestItem,
} from "./consumerRequestTypes";

const NON_PAYABLE_COST_TREATMENTS = new Set([
  "INCLUDED_IN_RESOURCE_ROWS",
  "INFORMATIONAL_SCOPE",
  "CONTROL_OR_DOCUMENT",
]);

type ConsumerEstimateCompositionCarrier = {
  includedInEstimate?: boolean | null;
  sourceParameters?: Readonly<Record<string, unknown>> | null;
};

export function isConsumerEstimateCompositionVisibleItem(
  item: ConsumerEstimateCompositionCarrier,
): boolean {
  const source = item.sourceParameters;
  const includedInEstimate = source?.includedInEstimate ?? item.includedInEstimate;
  return includedInEstimate !== false
    || source?.canonicalPreliminaryNeed === true
    || NON_PAYABLE_COST_TREATMENTS.has(
      String(source?.canonicalCostTreatment ?? ""),
    );
}

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
    (isConsumerEstimateIncludedItem(item)
      || NON_PAYABLE_COST_TREATMENTS.has(String(item.sourceParameters?.canonicalCostTreatment ?? '')))
      && item.sourceParameters?.canonicalPreliminaryNeed === true
      && item.quantity == null
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
