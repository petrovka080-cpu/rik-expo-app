import { resolveInternalFirstExternalGate } from "./internalFirstExternalGate";
import { resolveExternalIntelPolicy } from "./externalIntelPolicy";
import { resolveExternalIntelProviderFlags } from "./externalIntelProviderFlags";
import { resolveAiExternalProviderCapability } from "./aiExternalProviderRegistry";
import type {
  ExternalIntelProviderFlags,
  ExternalIntelSearchPreviewInput,
  ExternalSourcePolicy,
} from "./externalIntelTypes";

export type AiExternalSearchPolicyDecision = {
  allowed: boolean;
  status:
    | "ready_for_preview"
    | "blocked_internal_first"
    | "blocked_source_policy"
    | "external_live_fetch_disabled"
    | "external_provider_not_configured";
  internalFirstRequired: true;
  marketplaceCheckRequired: true;
  citationsRequired: true;
  externalLiveFetchDefault: false;
  finalActionForbidden: true;
  mutationCount: 0;
  providerCalled: false;
  policies: readonly ExternalSourcePolicy[];
  blockers: string[];
};

export function resolveAiExternalSearchPolicy(
  input: ExternalIntelSearchPreviewInput,
  flags: ExternalIntelProviderFlags = resolveExternalIntelProviderFlags(),
): AiExternalSearchPolicyDecision {
  const policy = resolveExternalIntelPolicy({
    domain: input.domain,
    sourcePolicyIds: input.sourcePolicyIds,
  });
  if (!policy.allowed) {
    return {
      allowed: false,
      status: "blocked_source_policy",
      internalFirstRequired: true,
      marketplaceCheckRequired: true,
      citationsRequired: true,
      externalLiveFetchDefault: false,
      finalActionForbidden: true,
      mutationCount: 0,
      providerCalled: false,
      policies: [],
      blockers: ["BLOCKED_EXTERNAL_SOURCE_POLICY"],
    };
  }

  const gate = resolveInternalFirstExternalGate({
    domain: input.domain,
    internalDataChecked: input.internalEvidenceRefs.length > 0,
    marketplaceChecked: input.marketplaceChecked === true,
    internalEvidenceRefs: input.internalEvidenceRefs,
    sourcePolicyIds: policy.policies.map((entry) => entry.sourceId),
  });
  if (!gate.allowed) {
    return {
      allowed: false,
      status: "blocked_internal_first",
      internalFirstRequired: true,
      marketplaceCheckRequired: true,
      citationsRequired: true,
      externalLiveFetchDefault: false,
      finalActionForbidden: true,
      mutationCount: 0,
      providerCalled: false,
      policies: policy.policies,
      blockers: ["BLOCKED_EXTERNAL_INTERNAL_FIRST_REQUIRED"],
    };
  }

  if (!flags.externalLiveFetchEnabled) {
    return {
      allowed: true,
      status: "external_live_fetch_disabled",
      internalFirstRequired: true,
      marketplaceCheckRequired: true,
      citationsRequired: true,
      externalLiveFetchDefault: false,
      finalActionForbidden: true,
      mutationCount: 0,
      providerCalled: false,
      policies: policy.policies,
      blockers: [],
    };
  }

  const provider = resolveAiExternalProviderCapability(flags.provider);
  if (!provider || provider.provider !== "approved_search_api" || !flags.approvedProviderConfigured) {
    return {
      allowed: true,
      status: "external_provider_not_configured",
      internalFirstRequired: true,
      marketplaceCheckRequired: true,
      citationsRequired: true,
      externalLiveFetchDefault: false,
      finalActionForbidden: true,
      mutationCount: 0,
      providerCalled: false,
      policies: policy.policies,
      blockers: [],
    };
  }

  return {
    allowed: true,
    status: "ready_for_preview",
    internalFirstRequired: true,
    marketplaceCheckRequired: true,
    citationsRequired: true,
    externalLiveFetchDefault: false,
    finalActionForbidden: true,
    mutationCount: 0,
    providerCalled: false,
    policies: policy.policies,
    blockers: [],
  };
}
