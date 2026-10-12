import type {
  ConsumerRepairDraftBundle,
  ConsumerRepairRequestItem,
} from "./consumerRequestTypes";
import { canonicalScopeRequirementDecisionV1, groupCanonicalScopeRequirementsV1 } from '../estimate/backendPlatform/canonicalScopeRequirementV1';

const NON_PAYABLE_COST_TREATMENTS = new Set([
  "INCLUDED_IN_RESOURCE_ROWS",
  "INFORMATIONAL_SCOPE",
  "CONTROL_OR_DOCUMENT",
]);

type ConsumerEstimateCompositionCarrier = {
  quantity?: number | null;
  includedInEstimate?: boolean | null;
  sourceParameters?: Readonly<Record<string, unknown>> | null;
};

export function isConsumerEstimateCompositionVisibleItem(
  item: ConsumerEstimateCompositionCarrier,
): boolean {
  const source = item.sourceParameters;
  const includedInEstimate = source?.includedInEstimate ?? item.includedInEstimate;
  return source?.canonicalPhysicalScopeExcludedV1 != null
    || (item.quantity != null && typeof source?.canonicalBackendRevisionId === 'string')
    || includedInEstimate !== false
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
    consumerEstimateScopeDecision(item) == null
    &&
    (isConsumerEstimateIncludedItem(item)
      || NON_PAYABLE_COST_TREATMENTS.has(String(item.sourceParameters?.canonicalCostTreatment ?? '')))
      && item.sourceParameters?.canonicalPreliminaryNeed === true
      && item.quantity == null
  );
}

/** Informational obligations have no quantity to be entered. Their saved
 * disposition, rather than the old null quantity, determines readiness. */
export function consumerEstimateScopeDecision(item: ConsumerRepairRequestItem) {
  const decision = canonicalScopeRequirementDecisionV1(item.sourceParameters?.canonicalScopeRequirementDecisionV1);
  return decision?.rowId === String(item.sourceParameters?.rowCode ?? '') ? decision : null;
}

export function consumerEstimateOpenScopeGroups(bundle: ConsumerRepairDraftBundle | null | undefined) {
  return groupCanonicalScopeRequirementsV1((bundle?.items ?? []).flatMap(item => {
    const decision = consumerEstimateScopeDecision(item);
    return decision ? [decision] : [];
  })).filter(group => group.statuses.some(status => ['PROJECT_SCOPE_OPEN', 'PARTLY_INCLUDED',
    'OBJECT_FACT_REQUIRED', 'LEGACY_SOURCE_REQUIRED', 'SCOPE_UNVERIFIED','REQUIRED_RESOURCE_EXCLUDED'].includes(status)));
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
