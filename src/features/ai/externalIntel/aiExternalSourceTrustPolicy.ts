import { resolveInternalFirstExternalGate } from "./internalFirstExternalGate";
import { resolveExternalIntelPolicy } from "./externalIntelPolicy";
import { resolveExternalIntelProviderFlags } from "./externalIntelProviderFlags";
import type {
  ExternalIntelProviderFlags,
  ExternalIntelSearchPreviewInput,
  ExternalSourcePolicy,
} from "./externalIntelTypes";

export const AI_EXTERNAL_SOURCE_TRUST_POLICY_CONTRACT = Object.freeze({
  contractId: "ai_external_source_trust_policy_v1",
  internalFirstRequired: true,
  marketplaceCheckRequired: true,
  citationsRequired: true,
  citations_required: true,
  externalLiveFetchDefault: false,
  external_live_fetch_default: false,
  externalResultConfidenceRequired: true,
  external_result_confidence_required: true,
  rawHtmlReturned: false,
  raw_html_returned: false,
  previewOnly: true,
  finalActionAllowed: false,
  mutationCount: 0,
  mutation_count: 0,
  uncontrolledExternalFetch: false,
  noFakeSuppliers: true,
} as const);

export type AiExternalSourceTrustPolicyStatus =
  | "ready_for_cited_preview"
  | "preview_ready_live_fetch_disabled"
  | "preview_ready_provider_not_configured"
  | "blocked_source_policy"
  | "blocked_internal_first";

export type AiExternalSourceTrustPolicyDecision = {
  contractId: typeof AI_EXTERNAL_SOURCE_TRUST_POLICY_CONTRACT.contractId;
  status: AiExternalSourceTrustPolicyStatus;
  allowed: boolean;
  policies: readonly ExternalSourcePolicy[];
  internalFirstRequired: true;
  marketplaceCheckRequired: true;
  citationsRequired: true;
  citations_required: true;
  externalLiveFetchDefault: false;
  external_live_fetch_default: false;
  externalResultConfidenceRequired: true;
  external_result_confidence_required: true;
  rawHtmlReturned: false;
  raw_html_returned: false;
  previewOnly: true;
  finalActionAllowed: false;
  finalActionForbidden: true;
  mutationCount: 0;
  mutation_count: 0;
  providerCalled: false;
  controlledExternalFetchRequired: true;
  uncontrolledExternalFetch: false;
  blockers: readonly string[];
};

function decision(params: {
  status: AiExternalSourceTrustPolicyStatus;
  allowed: boolean;
  policies?: readonly ExternalSourcePolicy[];
  blockers?: readonly string[];
}): AiExternalSourceTrustPolicyDecision {
  return {
    contractId: AI_EXTERNAL_SOURCE_TRUST_POLICY_CONTRACT.contractId,
    status: params.status,
    allowed: params.allowed,
    policies: params.policies ?? [],
    internalFirstRequired: true,
    marketplaceCheckRequired: true,
    citationsRequired: true,
    citations_required: true,
    externalLiveFetchDefault: false,
    external_live_fetch_default: false,
    externalResultConfidenceRequired: true,
    external_result_confidence_required: true,
    rawHtmlReturned: false,
    raw_html_returned: false,
    previewOnly: true,
    finalActionAllowed: false,
    finalActionForbidden: true,
    mutationCount: 0,
    mutation_count: 0,
    providerCalled: false,
    controlledExternalFetchRequired: true,
    uncontrolledExternalFetch: false,
    blockers: params.blockers ?? [],
  };
}

export function resolveAiExternalSourceTrustPolicy(
  input: ExternalIntelSearchPreviewInput,
  flags: ExternalIntelProviderFlags = resolveExternalIntelProviderFlags(),
): AiExternalSourceTrustPolicyDecision {
  const sourcePolicy = resolveExternalIntelPolicy({
    domain: input.domain,
    sourcePolicyIds: input.sourcePolicyIds,
  });
  if (!sourcePolicy.allowed) {
    return decision({
      status: "blocked_source_policy",
      allowed: false,
      blockers: ["BLOCKED_EXTERNAL_SOURCE_POLICY"],
    });
  }

  const internalFirst = resolveInternalFirstExternalGate({
    domain: input.domain,
    internalDataChecked: input.internalEvidenceRefs.length > 0,
    marketplaceChecked: input.marketplaceChecked === true,
    internalEvidenceRefs: input.internalEvidenceRefs,
    sourcePolicyIds: sourcePolicy.policies.map((policy) => policy.sourceId),
  });
  if (!internalFirst.allowed) {
    return decision({
      status: "blocked_internal_first",
      allowed: false,
      policies: sourcePolicy.policies,
      blockers: ["BLOCKED_EXTERNAL_INTERNAL_FIRST_REQUIRED"],
    });
  }

  if (!flags.externalLiveFetchEnabled) {
    return decision({
      status: "preview_ready_live_fetch_disabled",
      allowed: true,
      policies: sourcePolicy.policies,
    });
  }

  if (flags.provider !== "approved_search_api" || !flags.approvedProviderConfigured) {
    return decision({
      status: "preview_ready_provider_not_configured",
      allowed: true,
      policies: sourcePolicy.policies,
    });
  }

  return decision({
    status: "ready_for_cited_preview",
    allowed: true,
    policies: sourcePolicy.policies,
  });
}
