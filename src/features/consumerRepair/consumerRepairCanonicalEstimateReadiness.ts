import type { CanonicalParameterSession } from "../../lib/estimate/canonicalParameters";
import { canonicalParameterAffectsEstimateCalculation } from "../../lib/estimate/canonicalParameters";
import type { ConsumerRepairDraftBundle } from "../../lib/consumerRequests";
import {
  consumerEstimateUnpricedPayableItems,
  consumerEstimateUnresolvedQuantityItems,
} from "../../lib/consumerRequests/consumerEstimateReadiness";

export function consumerRepairCanonicalMissingParameterCount(
  session: CanonicalParameterSession | null | undefined,
): number {
  if (!session) return 0;
  const requirementIds = consumerRepairCanonicalCalculationRequirementIds(session);
  return new Set([
    ...requirementIds.blockingMissingParameterIds,
    ...requirementIds.contractMissingParameterIds,
    ...requirementIds.invalidParameterIds,
  ]).size;
}

export function consumerRepairCanonicalCalculationRequirementIds(
  session: CanonicalParameterSession,
): {
  blockingMissingParameterIds: readonly string[];
  contractMissingParameterIds: readonly string[];
  invalidParameterIds: readonly string[];
} {
  const parameters = Array.isArray(session.parameters) ? session.parameters : [];
  const parameterById = new Map(parameters.map((parameter) => [parameter.parameterId, parameter]));
  const calculationRelevantIds = (ids: readonly string[]): string[] => ids.filter((parameterId) => {
    const parameter = parameterById.get(parameterId);
    // Missing DTO detail is treated fail-closed. Only a persisted parameter
    // that explicitly proves it has no consumer is removed from readiness.
    return !parameter || canonicalParameterAffectsEstimateCalculation(parameter);
  });
  return {
    blockingMissingParameterIds: calculationRelevantIds(session.blockingMissingParameterIds),
    contractMissingParameterIds: calculationRelevantIds(session.contractMissingParameterIds),
    invalidParameterIds: calculationRelevantIds(session.invalidParameterIds),
  };
}

export function consumerRepairCanonicalEstimateBlocksApproval(
  session: CanonicalParameterSession | null | undefined,
): boolean {
  if (!session) return false;
  const requirementIds = consumerRepairCanonicalCalculationRequirementIds(session);
  if (
    requirementIds.blockingMissingParameterIds.length > 0
    || requirementIds.invalidParameterIds.length > 0
  ) return true;
  const declaredBlockingIds = session.blockingMissingParameterIds.length
    + session.invalidParameterIds.length;
  // An inconsistent payload that declares a blocking status without naming
  // the affected parameter remains fail-closed. A complete old payload whose
  // named blockers all prove zero calculation impact is safely non-blocking.
  return declaredBlockingIds === 0
    && (session.status === "BLOCKING_REQUIRED" || session.status === "INVALID");
}

/**
 * A parameter session can be complete while selected BOQ rows are still
 * waiting for a catalogue norm, equipment passport or another source-owned
 * value. Those rows are deliberately persisted as preliminary needs and must
 * not be mistaken for a confirmable estimate.
 */
export function consumerRepairCanonicalUnresolvedRowCount(
  bundle: ConsumerRepairDraftBundle | null | undefined,
): number {
  return consumerEstimateUnresolvedQuantityItems(bundle).length;
}

export function consumerRepairCanonicalUnpricedPayableRowCount(
  bundle: ConsumerRepairDraftBundle | null | undefined,
): number {
  return consumerEstimateUnpricedPayableItems(bundle).length;
}
