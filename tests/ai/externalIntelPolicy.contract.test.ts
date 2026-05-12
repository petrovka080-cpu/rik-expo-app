import { resolveExternalIntelPolicy } from "../../src/features/ai/externalIntel/externalIntelPolicy";
import { resolveExternalIntel } from "../../src/features/ai/externalIntel/externalIntelResolver";
import { resolveExternalIntelProviderFlags } from "../../src/features/ai/externalIntel/externalIntelProviderFlags";
import { EXTERNAL_LIVE_FETCH_ENABLED, EXTERNAL_SOURCE_REGISTRY } from "../../src/features/ai/externalIntel/externalSourceRegistry";

describe("AI external intelligence policy foundation", () => {
  it("keeps external live fetch disabled by default", () => {
    expect(EXTERNAL_LIVE_FETCH_ENABLED).toBe(false);
    expect(resolveExternalIntel({
      domain: "procurement",
      query: "cement suppliers",
      sourcePolicyIds: ["supplier_public_catalog.default"],
      internalEvidenceRefs: ["internal:request:1"],
    })).toMatchObject({
      status: "disabled",
      externalLiveFetchEnabled: false,
      externalUsed: false,
      mutationCount: 0,
      providerCalled: false,
    });
  });

  it("requires citations and forbids final actions for every source category", () => {
    expect(EXTERNAL_SOURCE_REGISTRY.length).toBeGreaterThanOrEqual(7);
    expect(EXTERNAL_SOURCE_REGISTRY.every((policy) => policy.requiresCitation === true)).toBe(true);
    expect(EXTERNAL_SOURCE_REGISTRY.every((policy) => policy.forbiddenForFinalAction === true)).toBe(true);
    expect(EXTERNAL_SOURCE_REGISTRY.every((policy) => policy.maxResults > 0)).toBe(true);
    expect(EXTERNAL_SOURCE_REGISTRY.every((policy) => policy.freshnessWindowDays > 0)).toBe(true);
  });

  it("blocks unregistered external source policies for a domain", () => {
    expect(resolveExternalIntelPolicy({
      domain: "warehouse",
      sourcePolicyIds: ["supplier_public_catalog.default"],
    })).toMatchObject({
      allowed: false,
      externalLiveFetchEnabled: false,
      citationsRequired: true,
      finalActionForbidden: true,
    });
  });

  it("does not enable live external lookup without explicit approved env policy", () => {
    expect(resolveExternalIntelProviderFlags({})).toMatchObject({
      externalLiveFetchEnabled: false,
      provider: "disabled",
      requireInternalEvidence: true,
      requireMarketplaceCheck: true,
      requireCitations: true,
      approvedProviderConfigured: false,
    });
    expect(
      resolveExternalIntelProviderFlags({
        AI_EXTERNAL_INTEL_LIVE_ENABLED: "true",
        AI_EXTERNAL_INTEL_PROVIDER: "approved_search_api",
        AI_EXTERNAL_INTEL_REQUIRE_INTERNAL_EVIDENCE: "true",
        AI_EXTERNAL_INTEL_REQUIRE_CITATIONS: "true",
      }),
    ).toMatchObject({
      externalLiveFetchEnabled: true,
      provider: "approved_search_api",
      approvedProviderConfigured: false,
    });
  });
});
