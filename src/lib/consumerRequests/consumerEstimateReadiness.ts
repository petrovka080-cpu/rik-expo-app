import { canonicalPurchaseSupplyBlocksV1 } from "../estimate/backendPlatform/canonicalPurchaseSupplyReadinessV1";
import type {
  ConsumerRepairDraftBundle,
  ConsumerRepairRequestItem,
} from "./consumerRequestTypes";
import { canonicalScopeRequirementDecisionV1, groupCanonicalScopeRequirementsV1, canonicalScopeRequirementStatusIsOpenV1, type CanonicalScopeRequirementStatusV1 } from '../estimate/backendPlatform/canonicalScopeRequirementV1';
import {consumerMachineHourPriceNeedsConfirmation} from './consumerMachineHourPriceCoverage';
import {resolvedEstimateIdentityChecksum} from '../estimate/resolvedEstimateIdentityChecksum';
import {canonicalScopeRequirementHasAdditionalObligationsV1,canonicalScopeRequirementDecisionsEqualV1,
  canonicalScopeRequirementWithIntegrityHoldV1,type CanonicalScopeRequirementDecisionV1} from '../estimate/backendPlatform/canonicalScopeRequirementV1';

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
  return canonicalPurchaseSupplyBlocksV1(source?.canonicalPurchaseSupplyBlocksV1).length > 0
    || source?.canonicalPhysicalScopeExcludedV1 != null
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
  return canonicalPurchaseSupplyBlocksV1(item.sourceParameters?.canonicalPurchaseSupplyBlocksV1).length === 0
    && item.sourceParameters?.includedInEstimate !== false;
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
    canonicalPurchaseSupplyBlocksV1(item.sourceParameters?.canonicalPurchaseSupplyBlocksV1).length > 0
    || consumerEstimateScopeDecision(item) == null
    &&
    (isConsumerEstimateIncludedItem(item)
      || NON_PAYABLE_COST_TREATMENTS.has(String(item.sourceParameters?.canonicalCostTreatment ?? '')))
      && item.sourceParameters?.canonicalPreliminaryNeed === true
      && item.quantity == null
  );
}

/** A saved manual number and an accepted calculation source are independent.
 * This is display evidence, never permission to clear a source/supply gate. */
export function consumerEstimateManualPreliminaryItems(
  bundle: ConsumerRepairDraftBundle | null | undefined,
): ConsumerRepairRequestItem[] {
  return (bundle?.items ?? []).filter(item => item.sourceParameters?.canonicalPreliminaryNeed === true
    && item.sourceParameters?.manualQuantityOverride === true
    && item.quantity != null && Number.isFinite(item.quantity) && item.quantity >= 0
    && consumerEstimateScopeDecision(item) == null);
}

/** Informational obligations have no quantity to be entered. Their saved
 * disposition, rather than the old null quantity, determines readiness. */
export function consumerEstimateScopeDecision(item: ConsumerRepairRequestItem) {
  const decision = canonicalScopeRequirementDecisionV1(item.sourceParameters?.canonicalScopeRequirementDecisionV1);
  return decision?.rowId === String(item.sourceParameters?.rowCode ?? '') ? decision : null;
}

export function consumerEstimateScopeStatusIsOpen(status: CanonicalScopeRequirementStatusV1): boolean {
  return canonicalScopeRequirementStatusIsOpenV1(status);
}

export function consumerEstimateOpenScopeGroups(bundle: ConsumerRepairDraftBundle | null | undefined) {
  const decisions = (bundle?.items ?? []).flatMap(item => {
    const decision = consumerEstimateScopeDecision(item);
    return decision ? [decision] : [];
  });
  const backend = bundle?.structuredEstimatePayload?.canonicalBackend ?? bundle?.canonicalBackendApprovalEvidence;
  const state = bundle?.estimateDraftRevisionState;
  const current = state?.revisions.find(revision=>revision.revisionId===state.currentRevisionId);
  const identity = current?.resolvedIdentity;
  // Read only the current exact backend identity. Foreign/old approved revisions
  // are never merged or recalculated here; their existing approval reader stays
  // unchanged. This extra reconciliation is activated only by the new fields.
  if (bundle && backend && backend.compilerOwner==='backend' && current && identity
    && /^[a-f0-9]{64}$/iu.test(backend.checksumSha256)
    && current.revisionId===backend.revisionId && state?.revisions.at(-1)?.revisionId===backend.revisionId
    && identity.canonicalModelVersion===backend.releaseId && identity.canonicalModelId==='canonical-estimate-backend'
    && identity.compilerVersion==='canonical-estimate-backend-projection.v1'
    && current.applicableBoqSignature===backend.checksumSha256
    && identity.sourceBindingVersions.some(source=>source.sourceId===backend.releaseId&&source.version===backend.checksumSha256)
    && bundle.items.every(item=>item.sourceParameters?.canonicalBackendRevisionId===backend.revisionId
      && item.sourceParameters?.canonicalBackendReleaseId===backend.releaseId)) {
    const {checksum,...identityBody} = identity;
    if (checksum===resolvedEstimateIdentityChecksum(identityBody)) {
      const object = (v:unknown):Record<string,unknown>|null => v!=null&&typeof v==='object'&&!Array.isArray(v) ? v as Record<string,unknown> : null;
      for (const need of backend.preliminaryNeeds ?? []) {
        const traceRaw = object(need.calculationTrace?.resourceGraph)?.scopeRequirementDecisionV1;
        const compactRaw = need.scopeRequirementDecision;
        if (!canonicalScopeRequirementHasAdditionalObligationsV1(compactRaw)
          && !canonicalScopeRequirementHasAdditionalObligationsV1(traceRaw)) continue;
        const compact = canonicalScopeRequirementDecisionV1(compactRaw), trace = canonicalScopeRequirementDecisionV1(traceRaw);
        let saved:CanonicalScopeRequirementDecisionV1|null = compact?.rowId===need.rowId ? compact
          : trace?.rowId===need.rowId ? trace : null;
        const items = bundle.items.filter(item=>item.sourceParameters?.rowCode===need.rowId);
        const itemDecision = items.length===1 ? consumerEstimateScopeDecision(items[0]!) : null;
        // A valid primary survives malformed children and disagreement. Raw child
        // values/quantities are not copied into the bounded integrity diagnostic.
        if (!saved) saved = itemDecision;
        if (!saved) continue; // invalid historical primary retains existing gates
        if ((compactRaw!=null && (!compact || compact.rowId!==need.rowId))
          || (traceRaw!=null && (!trace || trace.rowId!==need.rowId))
          || (compact && trace && !canonicalScopeRequirementDecisionsEqualV1(compact,trace))
          || !itemDecision || !canonicalScopeRequirementDecisionsEqualV1(saved,itemDecision))
          saved = canonicalScopeRequirementWithIntegrityHoldV1(saved);
        decisions.push(saved);
      }
    }
  }
  return groupCanonicalScopeRequirementsV1(decisions).filter(group=>group.statuses.some(consumerEstimateScopeStatusIsOpen));
}

export function consumerEstimateUnpricedPayableItems(
  bundle: ConsumerRepairDraftBundle | null | undefined,
): ConsumerRepairRequestItem[] {
  if (!bundle) return [];
  return bundle.items.filter((item) =>
    item.sourceParameters?.canonicalPreliminaryNeed !== true
      && isConsumerEstimatePayableItem(item)
      && (item.unitPrice == null || item.totalPrice == null || consumerMachineHourPriceNeedsConfirmation(item))
  );
}
