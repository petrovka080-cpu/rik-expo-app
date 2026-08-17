import {
  emptyConsumerRepairCanonicalWorkSearchState,
  mergeConsumerRepairCanonicalWorkSearchPage,
  searchConsumerRepairWorkSuggestions,
  shouldShowConsumerRepairWorkSuggestions,
} from "../../src/features/consumerRepair/requestEstimateScreenActions";
import type {
  CanonicalEstimateSearchItem,
  CanonicalEstimateSearchPage,
} from "../../src/lib/estimate/backendPlatform/contracts";

function item(catalogId: string, canonicalNameRu: string): CanonicalEstimateSearchItem {
  return {
    catalogId,
    canonicalNameRu,
    groupId: "masonry",
    groupNameRu: "Кладка",
    domainId: "concrete",
    systemId: "building",
    subsystemId: "wall",
    assemblyId: "masonry",
    workFamilyId: "masonry",
    elementType: "wall",
    operationKind: "NEW_INSTALLATION",
    technologyVariant: "base",
    primaryUom: "m2",
    publicationState: "ADMITTED_BACKEND",
    catalogOrigin: "GLOBAL",
    shortScopeRu: canonicalNameRu,
    keyDistinguishingParameters: [],
    requiredInputsCount: 1,
    clarificationFields: [],
    includedBoundaries: [],
    excludedBoundaries: [],
    replacementCatalogId: null,
    matchTier: 5,
    matchType: "T5_NORMALIZED_SUBSTRING",
    matchedTerm: "ла",
    matchedField: "canonical_name_ru",
    rankingReasonRu: "Буквальное вхождение",
    selectableMode: "PROFESSIONAL",
    nonselectableReasonRu: null,
  };
}

function page(items: CanonicalEstimateSearchItem[], nextCursor: string | null): CanonicalEstimateSearchPage {
  return {
    apiVersion: "2026-08-14.r2",
    searchIndexReleaseId: "11111111-1111-1111-1111-111111111111",
    searchIndexSnapshotSha256: "a".repeat(64),
    taxonomyVersion: "r4",
    groupRelationVersion: "r4",
    rankingContractVersion: "T1-T6-r4",
    resultSetSha256: "b".repeat(64),
    normalizedQuery: "ла",
    filters: {},
    literalTotalCount: 3523,
    globalLiteralTotalCount: 3485,
    externalLiteralTotalCount: 38,
    suggestionTotalCount: 0,
    shownCount: items.length,
    items,
    nextCursor,
  };
}

describe("request estimate work suggestion visibility", () => {
  it("routes a full estimate prompt through canonical work-intent search", () => {
    const prompt = "водоснабжение села 5 км труба ПЭ100 d110 траншея колодцы";

    expect(shouldShowConsumerRepairWorkSuggestions(prompt)).toBe(true);
    expect(searchConsumerRepairWorkSuggestions(prompt, null)).toHaveLength(0);
  });

  it("keeps suggestions available for short catalog-style searches", () => {
    const prompt = "гидроизоляция кровли";

    expect(shouldShowConsumerRepairWorkSuggestions(prompt)).toBe(true);
    expect(searchConsumerRepairWorkSuggestions(prompt, null)).toHaveLength(0);
  });

  it("merges every canonical page without the old 12/15-card cutoff", () => {
    const first = mergeConsumerRepairCanonicalWorkSearchPage({
      query: "ла",
      page: page([item("work-1", "Армирование кладки")], "cursor-1"),
      append: false,
    });
    const second = mergeConsumerRepairCanonicalWorkSearchPage({
      query: "ла",
      page: page([item("work-2", "Кладка стен")], null),
      previous: first,
      append: true,
    });

    expect(first.literalTotalCount).toBe(3523);
    expect(second.suggestions.map((entry) => entry.workKey)).toEqual(["work-1", "work-2"]);
    expect(second.shownCount).toBe(2);
    expect(emptyConsumerRepairCanonicalWorkSearchState().suggestions).toEqual([]);
  });

  it("fails closed when a cursor repeats a catalog item", () => {
    const first = mergeConsumerRepairCanonicalWorkSearchPage({
      query: "ла",
      page: page([item("work-1", "Армирование кладки")], "cursor-1"),
      append: false,
    });
    expect(() => mergeConsumerRepairCanonicalWorkSearchPage({
      query: "ла",
      page: page([item("work-1", "Армирование кладки")], null),
      previous: first,
      append: true,
    })).toThrow("CANONICAL_SEARCH_CURSOR_DUPLICATE");
  });
});
