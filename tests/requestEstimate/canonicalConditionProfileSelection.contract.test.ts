import {
  canonicalEstimateConditionProfileReadyV1,
  canonicalEstimateSelectedConditionProfileV1,
  canonicalPrimaryUomToGlobalUnitV1,
  canonicalEstimateCatalogPublicTitleRuV1,
  resolveCanonicalEstimateConditionSearchItemV1,
} from "../../src/lib/estimate/backendPlatform/canonicalEstimateConditionProfilesV1";
import { resolveGlobalWorkConditionSuggestionV1 } from "../../src/lib/ai/globalEstimate/globalWorkSmartSearch";
import {
  buildConsumerRepairExactCatalogLaunchSelectedWork,
  buildMultiDomainReferenceSelectedWorkBinding,
  buildSelectedWorkFromSuggestion,
  canonicalSearchItemToConsumerRepairSuggestion,
  consumerRepairCanonicalWorkSearchQuery,
  mergeConsumerRepairCanonicalWorkSearchPage,
} from "../../src/features/consumerRepair/requestEstimateScreenActions";
import { canReuseConsumerRepairCanonicalDraft } from "../../src/features/consumerRepair/consumerRepairCanonicalDraftReuse";
import { canonicalEstimateInitialParameterInputs } from "../../src/lib/estimate/backendPlatform/canonicalEstimatePromptParameters";
import {buildCanonicalBaselinePlan} from "../../src/lib/estimate/backendPlatform/canonicalConsumerPromptPlanServerR1";
import { validateCanonicalEstimateParameterInputs } from "../../src/lib/estimate/backendPlatform/canonicalEstimateParameterValidation";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import { CONDITION_RELEASE, CONDITION_WORK, conditionProfile, conditionSearchPage, groupedConditionWork } from "./conditionProfileFixture";

describe("one public work, exact condition profiles", () => {
  it("requires a condition choice even when one public card is an exact title match", () => {
    const item = groupedConditionWork();
    const suggestion = canonicalSearchItemToConsumerRepairSuggestion(item);
    expect(canonicalEstimateSelectedConditionProfileV1(item)).toBeNull();
    expect(resolveCanonicalEstimateConditionSearchItemV1(item)).toBeNull();
    expect(resolveGlobalWorkConditionSuggestionV1(suggestion)).toBeNull();
    expect(() => buildSelectedWorkFromSuggestion(suggestion, "Монтаж смесителя 2 шт"))
      .toThrow("CANONICAL_CONDITION_PROFILE_SELECTION_REQUIRED");
    expect(suggestion.conditionProfiles).toBe(item.conditionProfiles);
    expect(suggestion.publicWorkKey).toBe(CONDITION_WORK);
  });

  it("selects wet's own ID, model, UOM and admission without mutating the representative", () => {
    const item = groupedConditionWork();
    const before = JSON.stringify(item);
    const wet = item.conditionProfiles![1];
    const selected = resolveCanonicalEstimateConditionSearchItemV1(item, wet.catalogId)!;
    expect(selected).toMatchObject({ catalogId: wet.catalogId, definitionVersionId: wet.definitionVersionId,
      definitionReleaseId: CONDITION_RELEASE, canonicalNameRu: "Монтаж смесителя — Влажная зона", primaryUom: "set",
      technologyVariant: "EXACT_wet_zone", contentAdmission: wet.contentAdmission, estimateReady: true });
    const consumer = resolveGlobalWorkConditionSuggestionV1(canonicalSearchItemToConsumerRepairSuggestion(item), wet.catalogId)!;
    expect(consumer.defaultMeasureUnit).toBe("set");
    expect(consumer.titleRu).toContain("Монтаж смесителя");
    expect(consumer.titleRu.toLocaleLowerCase("ru-RU")).toContain("влажная зона");
    expect(consumer.titleRu).not.toBe("Влажная зона");
    expect(buildSelectedWorkFromSuggestion(consumer, "Монтаж смесителя 2 шт").selectedWorkKey).toBe(wet.catalogId);
    expect(JSON.stringify(item)).toBe(before);
  });

  it("uses a server-listed exact wet match, and resolves a genuinely single profile", () => {
    const wet = conditionProfile("wet_zone");
    const matched = groupedConditionWork({ matchedConditionCatalogId: wet.catalogId });
    expect(resolveCanonicalEstimateConditionSearchItemV1(matched)?.catalogId).toBe(wet.catalogId);
    expect(resolveGlobalWorkConditionSuggestionV1(canonicalSearchItemToConsumerRepairSuggestion(matched))?.workKey)
      .toBe(wet.catalogId);
    expect(canonicalEstimateSelectedConditionProfileV1({ conditionProfiles: [wet] })).toBe(wet);
  });

  it("shows the authored generic work and physical choice while retaining exact branded source internally", () => {
    const profile = conditionProfile("standard");
    profile.conditionId = profile.catalogId;
    profile.conditionTitleRu = "Плитка 300 × 300 мм, шов 3 мм";
    profile.titleRu = "Затирка пола Ceresit CE40 Aquastatic — плитка 300 × 300 мм, шов 3 мм";
    const sourceTitle = profile.titleRu;
    const item = groupedConditionWork({ canonicalNameRu: "Затирка швов плиточного пола", conditionProfiles: [profile] });
    const foreman = resolveCanonicalEstimateConditionSearchItemV1(item)!;
    const consumer = resolveGlobalWorkConditionSuggestionV1(canonicalSearchItemToConsumerRepairSuggestion(item))!;
    const expected = "Затирка швов плиточного пола — Плитка 300 × 300 мм, шов 3 мм";
    expect(foreman.canonicalNameRu).toBe(expected);
    expect(consumer.titleRu).toBe(expected);
    expect(consumer.visibleText).not.toMatch(/Ceresit|CE40|Aquastatic/iu);
    expect(resolveCanonicalEstimateConditionSearchItemV1(foreman)?.canonicalNameRu).toBe(expected);
    expect(resolveGlobalWorkConditionSuggestionV1(consumer)?.titleRu).toBe(expected);
    expect(foreman.catalogId).toBe(profile.catalogId);
    expect(foreman.conditionProfiles![0].titleRu).toBe(sourceTitle);
    expect(consumer.conditionProfiles![0].titleRu).toBe(sourceTitle);
    expect(buildSelectedWorkFromSuggestion(consumer, "Мой исходный запрос").selectedTitleRu).toBe(expected);
    expect(canonicalEstimateCatalogPublicTitleRuV1({ catalogId: profile.catalogId, titleRu: sourceTitle }, foreman)).toBe(expected);
    expect(canonicalEstimateCatalogPublicTitleRuV1({ catalogId: "another-exact-catalog", titleRu: "Монтаж смесителя" }, foreman))
      .toBe("Монтаж смесителя");
    expect(canonicalEstimateCatalogPublicTitleRuV1({ catalogId: profile.catalogId,
      titleRu: "Гипсовая шпаклёвка Ceresit CT126 SUPER START вручную по готовой цементно-известковой стене, 2–10 мм" }, null))
      .toBe("Ручное выравнивание гипсовой шпаклёвкой по цементно-известковой стене, 2–10 мм");
    const custom = { ...consumer, titleRu: "Моё название Ceresit", conditionProfiles: undefined };
    expect(resolveGlobalWorkConditionSuggestionV1(custom)).toBe(custom);
  });

  it("keeps repair's own operation kind and rejects a representative admission on its child", () => {
    const item = groupedConditionWork();
    const repair = conditionProfile("repair", { primaryUom: "m", operationKind: "REPAIR" });
    const withRepair = { ...item, conditionProfiles: [...item.conditionProfiles!, repair] };
    expect(resolveCanonicalEstimateConditionSearchItemV1(withRepair, repair.catalogId))
      .toMatchObject({ primaryUom: "m", operationKind: "REPAIR" });
    const inherited = { ...repair, contentAdmission: item.contentAdmission };
    expect(canonicalEstimateConditionProfileReadyV1(inherited)).toBe(false);
    const blocked = resolveCanonicalEstimateConditionSearchItemV1({ ...item, conditionProfiles: [inherited] })!;
    expect(blocked.estimateReady).toBe(false);
    const denied = { ...repair, contentAdmission: { ...repair.contentAdmission!, allowed: false } };
    expect(canonicalEstimateConditionProfileReadyV1(denied)).toBe(false);
    expect(canonicalEstimateConditionProfileReadyV1({ ...repair, contentAdmission: undefined })).toBe(false);
    expect(canonicalEstimateConditionProfileReadyV1({ ...repair,
      contentAdmission: { ...repair.contentAdmission!, releaseId: "foreign-release" } })).toBe(false);
    expect(canonicalEstimateConditionProfileReadyV1({ ...repair,
      contentAdmission: { ...repair.contentAdmission!, definitionVersionId: "foreign-definition" } })).toBe(false);
  });

  it("fails closed for a foreign profile or inconsistent matched identity", () => {
    const item = groupedConditionWork();
    expect(() => resolveCanonicalEstimateConditionSearchItemV1(item, "canonical-work:base:other_wet_zone"))
      .toThrow("CANONICAL_CONDITION_PROFILE_NOT_OFFERED");
    expect(() => resolveCanonicalEstimateConditionSearchItemV1({ ...item, matchedConditionCatalogId: "foreign" }))
      .toThrow("CANONICAL_CONDITION_PROFILE_NOT_OFFERED");
    expect(() => canonicalEstimateSelectedConditionProfileV1({ conditionProfiles: [item.conditionProfiles![0], item.conditionProfiles![0]] }))
      .toThrow("CANONICAL_CONDITION_PROFILE_ID_AMBIGUOUS");
  });

  it("keeps old exact deep links and saved profile identities addressable", () => {
    const wetId = `${CONDITION_WORK}_wet_zone`;
    const exact = buildConsumerRepairExactCatalogLaunchSelectedWork({ catalogWorkId: wetId, rawInput: "Монтаж смесителя" });
    expect(exact.selectedWorkKey).toBe(wetId);
    const unchanged = groupedConditionWork({ conditionProfiles: undefined });
    expect(resolveCanonicalEstimateConditionSearchItemV1(unchanged)).toBe(unchanged);
    const saved = { existingReleaseId: CONDITION_RELEASE, currentReleaseId: CONDITION_RELEASE,
      existingCatalogId: wetId, existingSourceRequestText: "Монтаж смесителя 2 шт", requestedSourceRequestText: "Монтаж смесителя 2 шт" };
    expect(canReuseConsumerRepairCanonicalDraft({ ...saved, requestedCatalogId: wetId })).toBe(true);
    expect(canReuseConsumerRepairCanonicalDraft({ ...saved, requestedCatalogId: `${CONDITION_WORK}_standard` })).toBe(false);
    expect(canReuseConsumerRepairCanonicalDraft({ ...saved, requestedCatalogId: CONDITION_WORK })).toBe(false);
  });

  it("leaves an incompatible parsed quantity empty in the selected exact schema", () => {
    const wet = conditionProfile("wet_zone", { primaryUom: "set" });
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId: wet.catalogId, releaseId: CONDITION_RELEASE, namespace: "global", domain: "plumbing",
      workKey: "mixer_install_wet_zone", titleRu: wet.titleRu, definitionVersion: 1,
      applicability: {}, professionalMetadata: {}, parameterSchema: [{ parameterId: "kit_count", ordinal: 0,
        valueType: "integer", unitId: "set", titleRu: "Количество комплектов", required: true,
        defaultValue: null, constraints: { min: 1 }, visibilityRole: "USER_INPUT", valueSourceRole: "USER_MEASURED" }],
    };
    expect(canonicalEstimateInitialParameterInputs({ catalog, parsedQuantity: 23, parsedUnit: "м²" }))
      .toEqual({ kit_count: "" });
  });

  it.each(["set", "m2", "point"])("consumer parser does not turn a stated item count into selected profile unit %s", unitId => {
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId: `${CONDITION_WORK}_wet_zone`, releaseId: CONDITION_RELEASE, namespace: "global", domain: "plumbing",
      workKey: "mixer_install_wet_zone", titleRu: "Монтаж смесителя", definitionVersion: 1,
      applicability: {}, professionalMetadata: {}, parameterSchema: [{ parameterId: "installation_count", ordinal: 0,
        valueType: "integer", unitId, titleRu: "Количество монтажей", required: true,
        defaultValue: null, constraints: { min: 1 }, visibilityRole: "USER_INPUT", valueSourceRole: "USER_INPUT",
        provenance: { consumer_input_role_v1: "OBJECT_FACT" }, formulaConsumers: ["installation_quantity"] }],
    };
    const preliminary = buildCanonicalBaselinePlan({ catalog, prompt: "Монтаж смесителя 23 шт" });
    expect(preliminary.primaryMeasureParameterId).toBe("installation_count");
    expect(preliminary.parameters).not.toHaveProperty("installation_count");
    expect(validateCanonicalEstimateParameterInputs({ schema: catalog.parameterSchema, rawInputs: preliminary.parameters }).issues)
      .toContainEqual({ code: "REQUIRED", parameterId: "installation_count" });
    const itemCatalog = { ...catalog, parameterSchema: catalog.parameterSchema.map(parameter => ({ ...parameter, unitId: "item" })) };
    expect(buildCanonicalBaselinePlan({ catalog: itemCatalog, prompt: "Монтаж смесителя 23 шт" }))
      .toMatchObject({ parameters: { installation_count: "23" }, primaryMeasureParameterId: "installation_count" });
  });

  it.each([
    ["м²", "sq_m"], ["м3", "m3"], ["м³", "m3"], ["м", "linear_m"], ["кг", "kg"], ["т", "ton"],
    ["шт.", "pcs"], ["точка", "pcs"], ["item", "pcs"], ["piece", "pcs"], ["компл.", "set"],
  ] as const)("projects an actual catalog UOM without changing its dimension: %s", (source, expected) => {
    expect(canonicalPrimaryUomToGlobalUnitV1(source)).toBe(expected);
    const wet = conditionProfile("wet_zone", { primaryUom: source });
    const selected = resolveGlobalWorkConditionSuggestionV1(canonicalSearchItemToConsumerRepairSuggestion(
      groupedConditionWork({ conditionProfiles: [wet] })))!;
    expect(selected.primaryUom).toBe(source);
    expect(selected.defaultMeasureUnit).toBe(expected);
  });

  it.each(["kW", "км", "system", "test", "м² поверхности и м геометрии потолочного короба", "unknown_unit"])(
    "retains an exact unsupported/mixed measure instead of inventing pcs: %s", source => {
      const wet = conditionProfile("wet_zone", { primaryUom: source });
      const selected = resolveGlobalWorkConditionSuggestionV1(canonicalSearchItemToConsumerRepairSuggestion(
        groupedConditionWork({ conditionProfiles: [wet] })))!;
      expect(selected.primaryUom).toBe(source);
      expect(selected.defaultMeasureUnit).toBeNull();
      expect(selected.workKey).toBe(wet.catalogId);
      expect(selected.estimateReady).toBe(true);
    },
  );

  it("keeps one grouped search row and rejects pages from a different policy on the same release", () => {
    const page = conditionSearchPage();
    const first = mergeConsumerRepairCanonicalWorkSearchPage({ query: page.rawQuery, page, append: false });
    expect(first.suggestions).toHaveLength(1);
    expect(first.suggestions[0].conditionProfiles).toHaveLength(2);
    expect(first.literalTotalCount).toBe(1);
    expect(first.rankingContractVersion).toBe(page.rankingContractVersion);
    for (const next of [
      { ...page, rankingContractVersion: "old-policy" },
      { ...page, catalogVisibilityVersion: "old-visibility" },
    ]) {
      expect(() => mergeConsumerRepairCanonicalWorkSearchPage({ query: page.rawQuery,
        page: next, previous: first, append: true })).toThrow("CANONICAL_SEARCH_POLICY_CHANGED_DURING_PAGINATION");
      expect(mergeConsumerRepairCanonicalWorkSearchPage({ query: page.rawQuery,
        page: next, previous: first, append: false }).rankingContractVersion).toBe(next.rankingContractVersion);
    }
  });

  it.each([
    "водоотвод асфальтированного покрытия во влажной зоне 20 м",
    "водоотвод асфальтированного покрытия технического помещения 20 м",
    "ремонт водоотвода асфальтированного покрытия 20 м",
    "водоотвод асфальтированного покрытия при высокой нагрузке 20 м",
  ])("keeps explicitly stated conditions out of the old standard reference shortcut: %s", text => {
    expect(buildMultiDomainReferenceSelectedWorkBinding(text)).toBeNull();
    expect(consumerRepairCanonicalWorkSearchQuery(text)).not.toBe("Устройство системы водоотвода асфальтированного покрытия");
  });
});
