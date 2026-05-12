import { EXTERNAL_LIVE_FETCH_ENABLED, getExternalSourcePolicy } from "./externalSourceRegistry";
import type { ExternalIntelDomain, ExternalSourcePolicy } from "./externalIntelTypes";

export type ExternalIntelPolicyDecision = {
  allowed: boolean;
  externalLiveFetchEnabled: false;
  policies: readonly ExternalSourcePolicy[];
  citationsRequired: true;
  checkedAtRequired: true;
  redactionRequired: true;
  domainAllowlistRequired: true;
  finalActionForbidden: true;
  reason: string;
};

export function resolveExternalIntelPolicy(params: {
  domain: ExternalIntelDomain | string;
  sourcePolicyIds: readonly string[];
}): ExternalIntelPolicyDecision {
  const domain = params.domain as ExternalIntelDomain;
  const policies = params.sourcePolicyIds
    .map((sourceId) => getExternalSourcePolicy(sourceId))
    .filter((policy): policy is ExternalSourcePolicy => policy !== null)
    .filter((policy) => policy.allowedDomains.includes(domain));

  return {
    allowed: policies.length > 0,
    externalLiveFetchEnabled: EXTERNAL_LIVE_FETCH_ENABLED,
    policies,
    citationsRequired: true,
    checkedAtRequired: true,
    redactionRequired: true,
    domainAllowlistRequired: true,
    finalActionForbidden: true,
    reason:
      policies.length > 0
        ? "External policy exists, but live fetch is disabled for this wave."
        : "External source is not registered for this domain.",
  };
}
