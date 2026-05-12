import { resolveExternalIntelPolicy } from "./externalIntelPolicy";
import type { ExternalIntelResolveInput, ExternalIntelResolveOutput } from "./externalIntelTypes";

export function resolveExternalIntel(
  input: ExternalIntelResolveInput,
): ExternalIntelResolveOutput {
  const policy = resolveExternalIntelPolicy({
    domain: input.domain,
    sourcePolicyIds: input.sourcePolicyIds,
  });
  const evidenceRefs = input.internalEvidenceRefs.filter((ref) => ref.trim().length > 0);

  if (!policy.allowed) {
    return {
      status: "blocked",
      externalLiveFetchEnabled: false,
      externalUsed: false,
      policies: [],
      citations: [],
      evidenceRefs,
      reason: policy.reason,
      mutationCount: 0,
      providerCalled: false,
    };
  }

  return {
    status: "disabled",
    externalLiveFetchEnabled: false,
    externalUsed: false,
    policies: policy.policies,
    citations: [],
    evidenceRefs,
    reason: "Internal data was checked. External live lookup is disabled until a cited source connector is approved.",
    mutationCount: 0,
    providerCalled: false,
  };
}
