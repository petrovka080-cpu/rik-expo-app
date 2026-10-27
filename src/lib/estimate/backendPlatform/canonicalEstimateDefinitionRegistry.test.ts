import {
  buildCanonicalEstimateRegistryEntry,
  CanonicalEstimateDefinitionRegistry,
} from "./canonicalEstimateDefinitionRegistry";

function entry(overrides: Record<string, unknown> = {}) {
  return buildCanonicalEstimateRegistryEntry({
    catalogId: "work.a",
    manifestPresent: true,
    definitionPresent: true,
    searchDocumentPresent: true,
    definitionVersionId: "definition-a",
    definitionReleaseId: "release-a",
    searchDefinitionVersionId: "definition-a",
    searchReleaseId: "search-a",
    adjudicationClass: "EFFECTIVE_WORK",
    selectable: true,
    canonicalTargetCatalogId: null,
    replacementCatalogId: null,
    sourceMetadata: { domain: "finishes", family: "walls", operation: "install", variant: "standard" },
    ...overrides,
  });
}

describe("CanonicalEstimateDefinitionRegistry", () => {
  it("registers one selectable current successor with semantic identity", () => {
    const registry = new CanonicalEstimateDefinitionRegistry([entry()]);
    expect(registry.requireSelectable("work.a")).toMatchObject({
      disposition: "REAL_WORK",
      currentSuccessorCatalogId: "work.a",
      domain: "finishes",
      family: "walls",
      operation: "install",
      variant: "standard",
    });
  });

  it("fails closed for redirects, quarantine, unknown IDs, and duplicate catalog IDs", () => {
    const redirect = entry({ catalogId: "work.old", canonicalTargetCatalogId: "work.a" });
    const quarantine = entry({ catalogId: "work.bad", selectable: false, adjudicationClass: "QUARANTINE" });
    const registry = new CanonicalEstimateDefinitionRegistry([redirect, quarantine]);
    expect(() => registry.requireSelectable("work.old")).toThrow("CANONICAL_REGISTRY_NONSELECTABLE");
    expect(() => registry.requireSelectable("missing")).toThrow("CANONICAL_REGISTRY_NONSELECTABLE");
    expect(() => new CanonicalEstimateDefinitionRegistry([entry(), entry()])).toThrow("CANONICAL_REGISTRY_DUPLICATE_CATALOG_ID");
  });
});
