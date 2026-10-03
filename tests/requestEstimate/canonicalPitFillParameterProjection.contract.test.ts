import { buildMasterParameterCalculationConsumers } from "../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1";
import { buildAutomaticConstructionOwnerR1 } from "../../src/lib/estimate/v4/automaticConstructionOwnerR1";
import { ROAD_CROSSING_SLEEVES_CIVIL_PARAMETERS_R1 as civil, ROAD_CROSSING_SLEEVES_CIVIL_METHODS_R1 as methods } from "../../src/lib/estimate/v4/roadCrossingSleevesCivilGeometryR1";
import { ROAD_CROSSING_SLEEVES_PIT_RETURN_PARAMETERS_R1 as pit, ROAD_CROSSING_SLEEVES_PIT_RETURN_ROWS_R1 as pitRows } from "../../src/lib/estimate/v4/roadCrossingSleevesPitReturnFillR1";
import { ROAD_CROSSING_SLEEVES_PIT_FILL_PARAMETERS_R1 as fill, ROAD_CROSSING_SLEEVES_PIT_FILL_ROWS_R1 as fillRows, ROAD_CROSSING_SLEEVES_PIT_FILL_MODES_R1 as modes } from "../../src/lib/estimate/v4/roadCrossingSleevesPitFillMaterialR1";
import { buildConsumerCanonicalPrecompileParameterSession, consumerCanonicalPrecompileParameterOverrides, isConsumerMeaningfulCanonicalParameter } from "../../src/features/consumerRepair/consumerCanonicalParameterEditor";
import { isCanonicalEstimateSourceManagedParameter, isCanonicalEstimateUserEditableParameter } from "../../src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics";
import { buildCanonicalParameterCards } from "../../src/lib/estimatePresentation/buildCanonicalParameterCards";
import type { CanonicalEstimateCatalogItem, CanonicalEstimateParameterGuide, CanonicalEstimateParameterInputValue } from "../../src/lib/estimate/backendPlatform/contracts";

const METHOD = "rcs_civil_installation_method";
const MODE = "rcs_pit_fill_material_mode";
const PRODUCT = "rcs_pit_fill_granular_product_designation";
const STOCK = "rcs_pit_fill_compatible_loose_stock_m3";
const definition = buildAutomaticConstructionOwnerR1({
  contract: "owned-pit-fill-editor-test", semanticOwner: "rcs-editor-test", sourceId: "owned-project-fixture-not-approved", normId: "no-universal-pit-fill-norm",
  sourceMetadata: { source_title: "Synthetic editor projection, not a project approval", source_document_version: "test",
    definition_hash: "a".repeat(64), artifact_sha256: "a".repeat(64), exact_locator: "owned test fixture" },
  applicabilityRu: "Только подтверждённый материал прямоугольных котлованов",
  ordinary: civil.filter(p => p.kind === "ordinary"), profile: [],
  conditional: [...civil.filter(p => p.id.startsWith("rcs_jacking_") && p.unitId === "m"), ...pit, ...fill],
  rows: [...pitRows, ...fillRows], excludedUnownedAssumptions: ["No full crossing or actual project approval"],
});
const consumers = buildMasterParameterCalculationConsumers({ parameters: definition.parameters, formulas: definition.formulas, resources: definition.resources });
// Catalogue wire-shape projection of the real definition and publisher metadata;
// no invented formula/row consumers or fixture-derived runtime defaults.
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
  [METHOD]: methods.pipeJacking, [MODE]: modes.sameGranular, [PRODUCT]: "Песок выбранной проектной спецификации",
  rcs_jacking_thrust_excavation_length_m: 6, rcs_jacking_thrust_excavation_width_m: 4, rcs_jacking_thrust_excavation_depth_m: 3,
  rcs_jacking_reception_excavation_length_m: 4, rcs_jacking_reception_excavation_width_m: 3, rcs_jacking_reception_excavation_depth_m: 2.5,
  rcs_jacking_thrust_permanent_occupied_volume_m3: 12, rcs_jacking_reception_permanent_occupied_volume_m3: 7,
  rcs_pit_fill_approved_reused_finished_m3: 20, rcs_pit_fill_gross_supplied_volume_ratio: 1.2,
  [STOCK]: 0, rcs_pit_fill_retained_loose_reserve_m3: 0, rcs_pit_fill_supplier_loose_multiple_m3: 5,
};
function session(parameters = fixture, missingParameterIds: string[] = []) {
  return buildConsumerCanonicalPrecompileParameterSession({ catalog, draftId: "owned-pit-fill-editor-draft", parameters, missingParameterIds,
    userExplicitParameterIds: Object.keys(parameters), textExtractedParameterIds: [] });
}
const cards = (parameters = fixture, missing: string[] = []) => buildCanonicalParameterCards({ session: session(parameters, missing), revision: null });

describe("actual pit-fill publisher metadata through the common editable editor", () => {
  it("retains the filled conditional product after its missing backend need disappears", () => {
    expect(consumers.formulaConsumers[PRODUCT]).toEqual([]);
    expect(consumers.resourceConsumers[PRODUCT]).toEqual(["rcs:pit-fill:ordered_loose_m3"]);
    expect(cards().find(c => c.key === PRODUCT)).toMatchObject({ value: fixture[PRODUCT], editable: true, missing: false, inputKind: "text" });
    expect(consumerCanonicalPrecompileParameterOverrides({ session: session(), patches: [] })[PRODUCT]).toBe(fixture[PRODUCT]);
  });
  it("keeps a missing selected product visible even before a backend need is supplied", () => {
    const { [PRODUCT]: omitted, ...parameters } = fixture;
    expect(omitted).toBe(fixture[PRODUCT]);
    expect(cards(parameters).find(c => c.key === PRODUCT)).toMatchObject({ value: null, editable: true, missing: true });
    expect(session(parameters).contractMissingParameterIds).toContain(PRODUCT);
    expect(session(parameters, [PRODUCT]).blockingMissingParameterIds).toContain(PRODUCT);
  });
  it("submits edits of the retained product and explicit zero through the existing patch path", () => {
    const overrides = consumerCanonicalPrecompileParameterOverrides({ session: session(), patches: [
      { operation: "update_param", paramKey: PRODUCT, rawValue: "Щебень выбранной совместимой спецификации" },
      { operation: "update_param", paramKey: STOCK, rawValue: "10" },
    ] });
    expect(overrides[PRODUCT]).toBe("Щебень выбранной совместимой спецификации");
    expect(overrides[STOCK]).toBe("10");
    expect(fixture[STOCK]).toBe(0);
    expect(fixture[PRODUCT]).toBe("Песок выбранной проектной спецификации");
  });
  it("keeps all seven selected facts editable and supplied zero distinct from missing", () => {
    const result = cards();
    const reuse = catalog.parameterSchema.find(p => p.parameterId === "rcs_pit_fill_approved_reused_finished_m3")!;
    expect({ consumers: reuse.formulaConsumers?.length, managed: isCanonicalEstimateSourceManagedParameter(reuse),
      userEditable: isCanonicalEstimateUserEditableParameter(reuse), meaningful: isConsumerMeaningfulCanonicalParameter(reuse) })
      .toMatchObject({ consumers: expect.any(Number), managed: false, userEditable: true, meaningful: true });
    expect(fill.filter(fact => !result.some(c => c.key === fact.id)).map(fact => fact.id)).toEqual([]);
    for (const fact of fill) expect(result.find(c => c.key === fact.id)).toMatchObject({ value: fixture[fact.id], editable: true, missing: false });
    expect(result.find(c => c.key === STOCK)?.displayValueRu).not.toBe("нужно уточнить");
    const { [STOCK]: omitted, ...unknown } = fixture;
    expect(omitted).toBe(0);
    expect(cards(unknown, [STOCK]).find(c => c.key === STOCK)).toMatchObject({ value: null, editable: true, missing: true });
  });
  it.each([methods.openCut, methods.pipeJacking])("a known false fill branch never revives a stale need: %s", method => {
    const parameters = { ...fixture, [METHOD]: method, [MODE]: modes.other };
    const result = session(parameters, [PRODUCT, STOCK]);
    expect(result.blockingMissingParameterIds).not.toContain(PRODUCT);
    expect(result.parameters.some(p => p.parameterId === PRODUCT)).toBe(false);
    expect(result.inactiveConditionalParameters?.find(p => p.parameterId === PRODUCT)).toMatchObject({ value: fixture[PRODUCT] });
    expect(result.inactiveConditionalParameters?.find(p => p.parameterId === STOCK)).toMatchObject({ value: 0 });
  });
  it("reactivates retained material and zero stock without turning them into new questions", () => {
    expect(cards({ ...fixture, [MODE]: modes.sameGranular }).find(c => c.key === PRODUCT)).toMatchObject({ value: fixture[PRODUCT], editable: true, missing: false });
    expect(session().blockingMissingParameterIds).toEqual([]);
  });
  it("unknown mode remains an undecided need, not a confirmed other-material branch", () => {
    const { [MODE]: omitted, [PRODUCT]: product, ...unknown } = fixture;
    expect(omitted).toBe(modes.sameGranular);
    expect(product).toBe(fixture[PRODUCT]);
    const result = session(unknown, [MODE, PRODUCT]);
    expect(result.blockingMissingParameterIds).toEqual(expect.arrayContaining([MODE, PRODUCT]));
    expect(buildCanonicalParameterCards({ session: result, revision: null }).find(c => c.key === PRODUCT)).toMatchObject({ value: null, editable: true, missing: true });
  });
  it("shows distinct Russian choices and input guidance without inventing a numeric norm", () => {
    const mode = cards().find(c => c.key === MODE);
    expect(mode?.choices?.map(option => option.labelRu)).toEqual(Object.values(modes));
    expect(cards().find(c => c.key === STOCK)?.guideShortRu).toContain("фиксированная числовая норма не установлена");
    expect(catalog.parameterSchema.every(p => p.defaultValue == null)).toBe(true);
    expect(definition.runtimeInput).toEqual({});
  });
});
