import { buildMasterParameterCalculationConsumers } from "../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1";
import { buildAutomaticConstructionOwnerR1 } from "../../src/lib/estimate/v4/automaticConstructionOwnerR1";
import { ROAD_CROSSING_SLEEVES_QUANTITY_PARAMETERS_R1 as quantity } from "../../src/lib/estimate/v4/roadCrossingSleevesQuantityModelR1";
import { ROAD_CROSSING_SLEEVES_INTERNAL_FILL_PARAMETERS_R1 as fill, ROAD_CROSSING_SLEEVES_INTERNAL_FILL_ROWS_R1 as fillRows,
  ROAD_CROSSING_SLEEVES_INTERNAL_FILL_MODES_R1 as modes, ROAD_CROSSING_SLEEVES_INTERNAL_WATER_PARAMETERS_R1 as water,
  ROAD_CROSSING_SLEEVES_INTERNAL_WATER_ROWS_R1 as waterRows, ROAD_CROSSING_SLEEVES_INTERNAL_WATER_MODES_R1 as waterModes,
  ROAD_CROSSING_SLEEVES_INTERNAL_WATER_COST_BASIS_R1 as waterBasis } from "../../src/lib/estimate/v4/roadCrossingSleevesInternalFillR1";
import { buildConsumerCanonicalPrecompileParameterSession, consumerCanonicalPrecompileParameterOverrides } from "../../src/features/consumerRepair/consumerCanonicalParameterEditor";
import { isCanonicalEstimateUserEditableParameter, isCanonicalEstimateVisibleUserResourceSelectionParameter } from "../../src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics";
import { buildCanonicalParameterCards } from "../../src/lib/estimatePresentation/buildCanonicalParameterCards";
import type { CanonicalEstimateCatalogItem, CanonicalEstimateParameterGuide, CanonicalEstimateParameterInputValue } from "../../src/lib/estimate/backendPlatform/contracts";

const MODE = "rcs_internal_fill_mode";
const PRODUCT = "rcs_internal_fill_dry_product_designation";
const STOCK = "rcs_internal_fill_compatible_dry_stock_kg";
const RATE = "rcs_internal_fill_gross_dry_mass_ratio";
const geometry = ["rcs_crossing_length_m", "rcs_casing_inside_diameter_mm", "rcs_carrier_outside_diameter_mm"];
const definition = buildAutomaticConstructionOwnerR1({
  contract: "owned-internal-fill-editor-test", semanticOwner: "rcs-editor-test", sourceId: "owned-project-fixture-not-approved", normId: "no-universal-dry-grout-norm",
  sourceMetadata: { source_title: "Synthetic editor projection, not a project approval", source_document_version: "test",
    definition_hash: "a".repeat(64), artifact_sha256: "a".repeat(64), exact_locator: "owned test fixture" },
  applicabilityRu: "Подтверждённый полный внутренний зазор одного футляра",
  ordinary: [...quantity.filter(p => geometry.includes(p.id)), ...fill.filter(p => p.kind === "ordinary")], profile: [],
  conditional: [...fill.filter(p => p.kind === "conditional"), ...water], rows: [...fillRows, ...waterRows], excludedUnownedAssumptions: ["No full crossing or actual project approval"],
});
const consumers = buildMasterParameterCalculationConsumers({ parameters: definition.parameters, formulas: definition.formulas, resources: definition.resources });
// Real factory -> real publisher metadata -> common catalogue editor. No
// invented consumers/defaults and no selected-product or source-authority bypass.
const catalog: CanonicalEstimateCatalogItem = {
  catalogId: "canonical-work:expanded:road_crossing_sleeves", releaseId: "owned-test-not-published", namespace: "global", domain: "roadworks",
  workKey: "road_crossing_sleeves", titleRu: "Футляр", definitionVersion: 1, applicability: {}, professionalMetadata: {},
  parameterSchema: definition.parameters.map(p => {
    const guide = p.truth_metadata.guide as Record<string, unknown>;
    return {
      parameterId: p.parameter_id, ordinal: p.ordinal, valueType: p.value_type as CanonicalEstimateCatalogItem["parameterSchema"][number]["valueType"], unitId: p.unit_id, titleRu: p.title_ru,
      required: p.required, defaultValue: p.default_value, constraints: p.constraints_json ?? {},
      visibilityRole: p.truth_metadata.visibility_role as "USER_INPUT",
      valueSourceRole: p.truth_metadata.value_source_role as CanonicalEstimateCatalogItem["parameterSchema"][number]["valueSourceRole"],
      preliminaryCompilationAllowed: p.truth_metadata.preliminary_compilation_allowed === true,
      formulaConsumers: consumers.formulaConsumers[p.parameter_id], resourceBranchConsumers: consumers.resourceConsumers[p.parameter_id],
      guide: {
        guideKind: guide.guide_kind as CanonicalEstimateParameterGuide["guideKind"], guideShortRu: String(guide.guide_short_ru),
        guideValidationPolicy: guide.guide_validation_policy as CanonicalEstimateParameterGuide["guideValidationPolicy"],
        sourceRole: guide.source_role as CanonicalEstimateParameterGuide["sourceRole"], sourceDocument: String(guide.source_document),
        sourceLocator: String(guide.source_locator), guideVersion: String(guide.guide_version), sourceSnapshotHash: String(guide.source_snapshot_hash),
        applicability: String(guide.applicability), verifiedAt: String(guide.verified_at),
      },
    };
  }),
};
const fixture: Record<string, CanonicalEstimateParameterInputValue> = {
  rcs_crossing_length_m: 5, rcs_casing_inside_diameter_mm: 500, rcs_carrier_outside_diameter_mm: 100,
  [MODE]: modes.dryGrout, [PRODUCT]: "Сухая смесь по выбранной согласованной спецификации", rcs_internal_fill_permanent_occupied_m3: 0.042477797,
  [RATE]: 1000, [STOCK]: 0, rcs_internal_fill_retained_dry_reserve_kg: 0,
  rcs_internal_fill_supplier_bag_net_kg: 50, rcs_internal_fill_mixing_water_l_for_selected_bag: 5,
  rcs_internal_fill_water_supply_mode: waterModes.customerSupplied,
};
function session(parameters = fixture, missingParameterIds: string[] = []) {
  return buildConsumerCanonicalPrecompileParameterSession({ catalog, draftId: "owned-internal-fill-editor-draft", parameters, missingParameterIds,
    userExplicitParameterIds: Object.keys(parameters), textExtractedParameterIds: [] });
}
const cards = (parameters = fixture, missing: string[] = []) => buildCanonicalParameterCards({ session: session(parameters, missing), revision: null });

describe("actual internal-fill facts through the common editable parameter adapter", () => {
  it("retains every filled selected fact, including the product, actual dry yield and supplied zero, with guidance", () => {
    const result = cards();
    // Product names use the existing explicit conditional resource-selection
    // admission, not a fake arithmetic operand or an unowned document field.
    const admitted = (key: string) => {
      const schema = catalog.parameterSchema.find(p => p.parameterId === key)!;
      return isCanonicalEstimateUserEditableParameter(schema) || isCanonicalEstimateVisibleUserResourceSelectionParameter(schema);
    };
    expect(fill.filter(fact => !admitted(fact.id)).map(fact => fact.id)).toEqual([]);
    for (const fact of fill) {
      expect(admitted(fact.id)).toBe(true);
      expect(result.find(c => c.key === fact.id)).toMatchObject({ value: fixture[fact.id], editable: true, missing: false });
      expect(result.find(c => c.key === fact.id)?.guideShortRu).toBeTruthy();
    }
    expect(consumers.formulaConsumers[PRODUCT]).toEqual([]);
    expect(consumers.resourceConsumers[PRODUCT]).toEqual(["rcs:internal-fill:ordered_dry_kg", "rcs:internal-water:ordered_m3"]);
    expect(session().contractMissingParameterIds).toEqual([]);
    expect(session().blockingMissingParameterIds).toEqual([]);
    expect(result.find(c => c.key === STOCK)?.displayValueRu).not.toBe("нужно уточнить");
  });
  it.each([PRODUCT, STOCK, RATE])("a missing selected fact %s is visible without being replaced by a placeholder/default", key => {
    const input = { ...fixture }; delete input[key];
    expect(cards(input).find(c => c.key === key)).toMatchObject({ value: null, editable: true, missing: true });
    expect(session(input).contractMissingParameterIds).toContain(key);
    expect(session(input, [key]).blockingMissingParameterIds).toContain(key);
  });
  it("submits edits of known material, dry yield, zero stock and selected mode through the same patch path", () => {
    const patched = consumerCanonicalPrecompileParameterOverrides({ session: session(), patches: [
      { operation: "update_param", paramKey: PRODUCT, rawValue: "Уточнённая совместимая сухая смесь" },
      { operation: "update_param", paramKey: RATE, rawValue: "1200" },
      { operation: "update_param", paramKey: STOCK, rawValue: "10" },
    ] });
    expect(patched[PRODUCT]).toBe("Уточнённая совместимая сухая смесь");
    expect(patched[RATE]).toBe("1200"); expect(patched[STOCK]).toBe("10");
    expect(fixture[RATE]).toBe(1000); expect(fixture[STOCK]).toBe(0);
    const modePatch = consumerCanonicalPrecompileParameterOverrides({ session: session(), patches: [
      { operation: "update_param", paramKey: MODE, rawValue: modes.none },
    ] });
    expect(modePatch[MODE]).toBe(modes.none);
  });
  it.each([modes.none, modes.other])("known excluded branch %s retains history without active questions or material inputs", mode => {
    const result = session({ ...fixture, [MODE]: mode }, [PRODUCT, RATE, STOCK]);
    expect(result.parameters.some(p => p.parameterId === PRODUCT || p.parameterId === RATE || p.parameterId === STOCK)).toBe(false);
    expect(result.inactiveConditionalParameters?.find(p => p.parameterId === PRODUCT)).toMatchObject({ value: fixture[PRODUCT] });
    expect(result.inactiveConditionalParameters?.find(p => p.parameterId === STOCK)).toMatchObject({ value: 0 });
    expect(result.blockingMissingParameterIds).toEqual([]);
    expect(cards().find(c => c.key === STOCK)).toMatchObject({ value: 0, editable: true, missing: false });
  });
  it("unknown mode stays undecided, not an invented confirmed no-fill choice", () => {
    const input = { ...fixture }; delete input[MODE]; delete input[PRODUCT];
    expect(session(input, [MODE, PRODUCT]).blockingMissingParameterIds).toEqual(expect.arrayContaining([MODE, PRODUCT]));
    expect(cards(input, [MODE, PRODUCT]).find(c => c.key === PRODUCT)).toMatchObject({ value: null, editable: true, missing: true });
  });
  it("shows distinct human choices, explicit units and gray-guidance content without installing a universal grout norm", () => {
    expect(cards().find(c => c.key === MODE)?.choices?.map(option => option.labelRu)).toEqual(Object.values(modes));
    expect(catalog.parameterSchema.find(p => p.parameterId === RATE)?.unitId).toBe("kg_per_m3");
    expect(cards().find(c => c.key === RATE)?.unitRu).toBe("кг/м³");
    expect(catalog.parameterSchema.find(p => p.parameterId === "rcs_internal_fill_mixing_water_l_for_selected_bag")?.unitId).toBe("l");
    expect(cards().find(c => c.key === RATE)?.guideShortRu).toContain("фиксированная числовая норма не установлена");
    expect(catalog.parameterSchema.every(p => p.defaultValue == null)).toBe(true); expect(definition.runtimeInput).toEqual({});
  });
  it("retains selected water compatibility, material, cost boundary and supplied zeros as real editable fields", () => {
    const parameters: Record<string, CanonicalEstimateParameterInputValue> = { ...fixture, rcs_internal_fill_water_supply_mode: waterModes.separatePurchase,
      rcs_internal_fill_water_product_designation: "Выбранная совместимая вода", rcs_internal_fill_water_compatibility_reference: "Согласованная спецификация воды и смеси",
      rcs_internal_fill_water_cost_basis: waterBasis, rcs_internal_fill_water_compatible_stock_m3: 0,
      rcs_internal_fill_water_retained_reserve_m3: 0, rcs_internal_fill_water_supplier_multiple_m3: 0.05 };
    const result = cards(parameters);
    expect(water.filter(fact => !result.some(card => card.key === fact.id)).map(fact => fact.id)).toEqual([]);
    for (const fact of water) expect(result.find(card => card.key === fact.id)).toMatchObject({ value: parameters[fact.id], editable: true, missing: false });
    expect(session(parameters).blockingMissingParameterIds).toEqual([]);
    const patched = consumerCanonicalPrecompileParameterOverrides({ session: session(parameters), patches: [
      { operation: "update_param", paramKey: "rcs_internal_fill_water_compatible_stock_m3", rawValue: "0.1" },
      { operation: "update_param", paramKey: "rcs_internal_fill_water_compatibility_reference", rawValue: "Уточнённая спецификация совместимой воды" },
    ] });
    expect(patched.rcs_internal_fill_water_compatible_stock_m3).toBe("0.1");
    expect(patched.rcs_internal_fill_water_compatibility_reference).toBe("Уточнённая спецификация совместимой воды");
  });
  it("customer-supplied water keeps retained separate-purchase facts inactive; unknown supply stays a local primary question", () => {
    const stock = "rcs_internal_fill_water_compatible_stock_m3";
    const inactive = session({ ...fixture, [stock]: 0.2 }, [stock]);
    expect(inactive.parameters.some(parameter => parameter.parameterId === stock)).toBe(false);
    expect(inactive.inactiveConditionalParameters?.find(parameter => parameter.parameterId === stock)).toMatchObject({ value: 0.2 });
    expect(inactive.blockingMissingParameterIds).toEqual([]);
    const input = { ...fixture }; delete input.rcs_internal_fill_water_supply_mode;
    expect(cards(input, ["rcs_internal_fill_water_supply_mode"]).find(card => card.key === "rcs_internal_fill_water_supply_mode")).toMatchObject({ value: null, editable: true, missing: true });
    expect(session(input, ["rcs_internal_fill_water_supply_mode"]).blockingMissingParameterIds).toContain("rcs_internal_fill_water_supply_mode");
  });
});
