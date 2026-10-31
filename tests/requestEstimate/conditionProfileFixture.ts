import type {
  CanonicalEstimateConditionProfileV1,
  CanonicalEstimateSearchItem,
  CanonicalEstimateSearchPage,
} from "../../src/lib/estimate/backendPlatform/contracts";

export const CONDITION_WORK = "canonical-work:base:plumbing_interior_mixer_install";
export const CONDITION_RELEASE = "33333333-3333-5333-8333-333333333333";

export function conditionProfile(
  conditionId: string,
  overrides: Partial<CanonicalEstimateConditionProfileV1> = {},
): CanonicalEstimateConditionProfileV1 {
  const catalogId = `${CONDITION_WORK}_${conditionId}`;
  const definitionVersionId = conditionId === "standard"
    ? "11111111-1111-5111-8111-111111111111"
    : "22222222-2222-5222-8222-222222222222";
  return {
    catalogId, definitionVersionId, definitionReleaseId: CONDITION_RELEASE,
    conditionId, titleRu: `Монтаж смесителя — ${conditionId === "wet_zone" ? "влажная зона" : "обычные условия"}`,
    technologyVariant: `EXACT_${conditionId}`, primaryUom: "point", operationKind: "NEW_INSTALLATION",
    publicationState: "ADMITTED_BACKEND", estimateReady: true,
    contentAdmission: {
      allowed: true, mode: "isolated_candidate_test", releaseId: CONDITION_RELEASE,
      definitionVersionId, catalogId, reasons: [], evaluatedAt: "2026-10-22T01:00:00.000Z",
      contractVersion: "estimate-admission-r3",
    },
    selectableMode: "PROFESSIONAL", nonselectableReasonRu: null, ...overrides,
  };
}

export function groupedConditionWork(
  overrides: Partial<CanonicalEstimateSearchItem> = {},
): CanonicalEstimateSearchItem {
  const standard = conditionProfile("standard");
  const wet = conditionProfile("wet_zone", { primaryUom: "set" });
  return {
    catalogId: standard.catalogId, definitionVersionId: standard.definitionVersionId,
    definitionReleaseId: CONDITION_RELEASE, canonicalNameRu: "Монтаж смесителя",
    groupId: "plumbing", groupNameRu: "Сантехника", domainId: "plumbing", systemId: "building",
    subsystemId: "water", assemblyId: "mixer", workFamilyId: "mixer", elementType: "mixer",
    operationKind: standard.operationKind, technologyVariant: "EXACT_standard", primaryUom: "point",
    publicationState: "ADMITTED_BACKEND", catalogOrigin: "GLOBAL", adjudicationClass: "EFFECTIVE_WORK",
    estimateReady: true, contentAdmission: standard.contentAdmission, shortScopeRu: "Монтаж смесителя",
    keyDistinguishingParameters: [], requiredInputsCount: 1, clarificationFields: [],
    includedBoundaries: [], excludedBoundaries: [], replacementCatalogId: null,
    matchTier: 1, matchType: "T1_EXACT", matchedTerm: "монтаж смесителя", matchedField: "canonical_name_ru",
    rankingReasonRu: "Точное название", selectableMode: "PROFESSIONAL", nonselectableReasonRu: null,
    publicWorkKey: CONDITION_WORK, publicCatalogId: standard.catalogId,
    matchedConditionCatalogId: null, conditionProfiles: [standard, wet], ...overrides,
  };
}

export function conditionSearchPage(overrides: Partial<CanonicalEstimateSearchPage> = {}): CanonicalEstimateSearchPage {
  return {
    apiVersion: "2026-08-14.r2", catalogVisibilityVersion: "single-work-with-internal-conditions-v2",
    searchIndexReleaseId: CONDITION_RELEASE, searchIndexSnapshotSha256: "a".repeat(64),
    taxonomyVersion: "r4", groupRelationVersion: "r4",
    rankingContractVersion: "T1-T6-r4+exact-id-coverage-single-work-conditions-v2", resultSetSha256: "b".repeat(64),
    rawQuery: "монтаж смесителя", normalizedQuery: "монтаж смесителя", searchText: "монтаж смесителя",
    searchMode: "PHRASE", searchTokens: ["монтаж смесителя"], parsedQuantity: null, parsedUnit: null,
    filters: {}, scope: "WORKS", resultLevel: "LITERAL", literalTotalCount: 1, inventoryLiteralTotalCount: 2,
    globalLiteralTotalCount: 1, externalLiteralTotalCount: 0, groupTotalCount: 0, fuzzyTotalCount: 0,
    suggestionTotalCount: 0, shownCount: 1, items: [groupedConditionWork()], nextCursor: null, durationMs: 1,
    ...overrides,
  };
}
