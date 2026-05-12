import {
  EXTERNAL_INTEL_PROVIDER_DEFAULT,
  EXTERNAL_LIVE_FETCH_ENABLED,
  EXTERNAL_SOURCE_REGISTRY,
  PROCUREMENT_EXTERNAL_SOURCE_POLICY_IDS,
} from "../../src/features/ai/externalIntel/externalSourceRegistry";

const REQUIRED_CATEGORIES = [
  "supplier_public_catalog",
  "market_price_reference",
  "construction_norm_reference",
  "real_estate_listing_reference",
  "company_public_profile",
  "regulatory_reference",
  "currency_or_macro_reference",
] as const;

describe("external source registry", () => {
  it("registers approved source policy metadata with disabled live fetch by default", () => {
    expect(EXTERNAL_LIVE_FETCH_ENABLED).toBe(false);
    expect(EXTERNAL_INTEL_PROVIDER_DEFAULT).toBe("disabled");
    expect(new Set(EXTERNAL_SOURCE_REGISTRY.map((source) => source.category))).toEqual(
      new Set(REQUIRED_CATEGORIES),
    );
    expect(EXTERNAL_SOURCE_REGISTRY.every((source) => source.requiresCitation === true)).toBe(true);
    expect(EXTERNAL_SOURCE_REGISTRY.every((source) => source.requiresCheckedAt === true)).toBe(true);
    expect(EXTERNAL_SOURCE_REGISTRY.every((source) => source.forbiddenForFinalAction === true)).toBe(true);
    expect(EXTERNAL_SOURCE_REGISTRY.every((source) => source.allowedForDecision === false)).toBe(true);
    expect(EXTERNAL_SOURCE_REGISTRY.every((source) => source.maxResults > 0 && source.maxResults <= 5)).toBe(true);
  });

  it("keeps procurement external policy ids inside the registry and preview-only", () => {
    const registryIds = new Set(EXTERNAL_SOURCE_REGISTRY.map((source) => source.sourceId));
    expect(PROCUREMENT_EXTERNAL_SOURCE_POLICY_IDS.every((sourceId) => registryIds.has(sourceId))).toBe(true);
    expect(
      EXTERNAL_SOURCE_REGISTRY.filter((source) =>
        PROCUREMENT_EXTERNAL_SOURCE_POLICY_IDS.includes(source.sourceId as never),
      ).every((source) => source.allowedDomains.includes("procurement") && source.forbiddenForFinalAction),
    ).toBe(true);
  });
});
