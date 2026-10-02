import { canReuseConsumerRepairCanonicalDraft } from "../../src/features/consumerRepair/consumerRepairCanonicalDraftReuse";

const unchanged = {
  existingReleaseId: "release-current",
  currentReleaseId: "release-current",
  existingCatalogId: "catalog-formwork",
  requestedCatalogId: "catalog-formwork",
  existingSourceRequestText: "formwork area 100 m2",
  requestedSourceRequestText: "formwork area 100 m2",
};

describe("consumer repair canonical draft reuse", () => {
  test("reuses only the unchanged current calculation intent", () => {
    expect(canReuseConsumerRepairCanonicalDraft(unchanged)).toBe(true);
    expect(canReuseConsumerRepairCanonicalDraft({
      ...unchanged,
      requestedSourceRequestText: "  formwork   area 100 m2  ",
    })).toBe(true);
  });

  test("does not swallow a changed request behind an existing revision", () => {
    expect(canReuseConsumerRepairCanonicalDraft({
      ...unchanged,
      requestedSourceRequestText: "formwork area 120 m2",
    })).toBe(false);
  });

  test("does not reuse a different catalog or release", () => {
    expect(canReuseConsumerRepairCanonicalDraft({
      ...unchanged,
      requestedCatalogId: "catalog-concrete",
    })).toBe(false);
    expect(canReuseConsumerRepairCanonicalDraft({
      ...unchanged,
      currentReleaseId: "release-successor",
    })).toBe(false);
    expect(canReuseConsumerRepairCanonicalDraft({
      ...unchanged,
      requestedCatalogId: null,
    })).toBe(false);
  });

  test("treats a short selected-work key as the same canonical backend catalog", () => {
    expect(canReuseConsumerRepairCanonicalDraft({
      ...unchanged,
      existingCatalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_pour_high_load",
      requestedCatalogId: "concrete_foundation_interior_anchor_group_pour_high_load",
    })).toBe(true);
    expect(canReuseConsumerRepairCanonicalDraft({
      ...unchanged,
      existingCatalogId: "concrete_foundation_interior_anchor_group_pour_high_load",
      requestedCatalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_pour_high_load",
    })).toBe(true);
  });

  test("does not collapse two canonical namespaces with the same work key", () => {
    expect(canReuseConsumerRepairCanonicalDraft({
      ...unchanged,
      existingCatalogId: "canonical-work:base:catalog-formwork",
      requestedCatalogId: "canonical-work:master:catalog-formwork",
    })).toBe(false);
  });
});
