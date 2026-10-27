import { resolveExternalIntelPolicy } from "./externalIntelPolicy";
import type { ExternalIntelDomain } from "./externalIntelTypes";

export type ExternalIntelDecision = {
  allowed: boolean;
  internalDataChecked: boolean;
  marketplaceChecked: boolean;
  internalEvidenceRefs: string[];
  sourcePolicyIds: string[];
  reason: string;
  requiresCitation: true;
  forbiddenForFinalAction: true;
};

export function resolveInternalFirstExternalGate(params: {
  domain: ExternalIntelDomain;
  internalDataChecked: boolean;
  marketplaceChecked?: boolean;
  internalEvidenceRefs: readonly string[];
  sourcePolicyIds: readonly string[];
}): ExternalIntelDecision {
  const internalEvidenceRefs = params.internalEvidenceRefs.filter((ref) => ref.trim().length > 0);
  const policy = resolveExternalIntelPolicy({
    domain: params.domain,
    sourcePolicyIds: params.sourcePolicyIds,
  });
  const sourcePolicyIds = policy.policies.map((sourcePolicy) => sourcePolicy.sourceId);

  if (params.internalDataChecked !== true) {
    return {
      allowed: false,
      internalDataChecked: false,
      marketplaceChecked: params.marketplaceChecked === true,
      internalEvidenceRefs,
      sourcePolicyIds,
      reason: "internal_data_check_required",
      requiresCitation: true,
      forbiddenForFinalAction: true,
    };
  }

  if (internalEvidenceRefs.length === 0) {
    return {
      allowed: false,
      internalDataChecked: true,
      marketplaceChecked: params.marketplaceChecked === true,
      internalEvidenceRefs,
      sourcePolicyIds,
      reason: "internal_evidence_required",
      requiresCitation: true,
      forbiddenForFinalAction: true,
    };
  }

  if (params.domain === "procurement" && params.marketplaceChecked !== true) {
    return {
      allowed: false,
      internalDataChecked: true,
      marketplaceChecked: false,
      internalEvidenceRefs,
      sourcePolicyIds,
      reason: "marketplace_check_required_for_procurement",
      requiresCitation: true,
      forbiddenForFinalAction: true,
    };
  }

  if (!policy.allowed || sourcePolicyIds.length === 0) {
    return {
      allowed: false,
      internalDataChecked: true,
      marketplaceChecked: params.marketplaceChecked === true,
      internalEvidenceRefs,
      sourcePolicyIds,
      reason: "domain_not_allowlisted_for_external_source",
      requiresCitation: true,
      forbiddenForFinalAction: true,
    };
  }

  return {
    allowed: true,
    internalDataChecked: true,
    marketplaceChecked: params.marketplaceChecked === true,
    internalEvidenceRefs,
    sourcePolicyIds,
    reason: "external_lookup_allowed_after_internal_and_marketplace_evidence",
    requiresCitation: true,
    forbiddenForFinalAction: true,
  };
}
