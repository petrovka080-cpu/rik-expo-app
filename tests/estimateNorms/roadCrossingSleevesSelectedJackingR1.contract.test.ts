import { buildRoadCrossingSleevesSelectedJackingR1, assertRoadCrossingSleevesSelectedJackingPublicationR1 } from "../../src/lib/estimate/v4/roadCrossingSleevesSelectedJackingR1";
import { buildRoadCrossingSleevesComponentsR1 } from "../../src/lib/estimate/v4/roadCrossingSleevesComponentsR1";
import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import { compileAutomaticConstructionOwnerR1 } from "../../src/lib/estimate/v4/automaticConstructionOwnerR1";
import { isCanonicalEstimateConsumerSuppliedParameter, isCanonicalEstimateSourceManagedParameter, isCanonicalEstimateVisibleUserResourceSelectionParameter } from "../../src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import { ROAD_CROSSING_SLEEVES_CIVIL_METHODS_R1 as methods } from "../../src/lib/estimate/v4/roadCrossingSleevesCivilGeometryR1";
import { parseRoadCrossingSleevesSelectedJackingPromptR1 } from "../../src/lib/estimate/v4/roadCrossingSleevesSelectedJackingPromptR1";
const metadata = { source_title: "VALIDATION_FIXTURE, not project approval", source_document_version: "test-only", definition_hash: "a".repeat(64), artifact_sha256: "b".repeat(64), exact_locator: "test synthetic source" };
const selected = buildRoadCrossingSleevesSelectedJackingR1(metadata);
const definition = selected.definition;
const resourceConsumers = definition.resources.map(resource => ({ rowId: resource.row_id, graphText: JSON.stringify(resource.resource_graph) }));
// The immutable publication metadata and actual formula/resource consumers
// used by the ordinary catalog response. This fixture supplies no defaults.
const catalog: CanonicalEstimateCatalogItem = { catalogId: selected.scope.catalogId, releaseId: "validation-only", namespace: "global", domain: "civil", workKey: "road_crossing_sleeves", titleRu: "Переход продавливанием", definitionVersion: 1, applicability: {}, professionalMetadata: {},
  parameterSchema: definition.parameters.map(p => {
    const truth = p.truth_metadata, guide = truth.guide as Record<string, string>;
    return { parameterId: p.parameter_id, ordinal: p.ordinal, valueType: p.value_type, unitId: p.unit_id, titleRu: p.title_ru, required: p.required, defaultValue: p.default_value,
      constraints: p.constraints_json ?? {}, visibilityRole: truth.visibility_role, valueSourceRole: truth.value_source_role, preliminaryCompilationAllowed: truth.preliminary_compilation_allowed,
      formulaConsumers: definition.formulas.filter(f => f.input_parameter_ids?.includes(p.parameter_id)).map(f => f.formula_id),
      resourceBranchConsumers: resourceConsumers.filter(r => r.graphText.includes(`"${p.parameter_id}"`)).map(r => r.rowId),
      guide: { guideKind: guide.guide_kind, guideShortRu: guide.guide_short_ru, sourceRole: guide.source_role, sourceDocument: guide.source_document, sourceLocator: guide.source_locator, sourceSnapshotHash: guide.source_snapshot_hash, guideValidationPolicy: guide.guide_validation_policy } } as CanonicalEstimateCatalogItem["parameterSchema"][number];
  }) };
const prompt = "переход продавливанием, длина футляра 24 м, наружный диаметр 720 мм, внутренний 700 мм, рабочая труба 110 мм";
const compile = (submittedParameters: Record<string, unknown>) => compileAutomaticConstructionOwnerR1({ compilerVersion: "selected-contract", catalogId: selected.scope.catalogId, primaryMeasureParameterId: "rcs_crossing_length_m", definition, submittedParameters });
describe("selected full jacking ordinary ingress and immutable ownership", () => {
  it("opens the first composition with only explicit prompt facts and original local missing inputs", async () => {
    const plan = buildCanonicalBaselinePlan({ catalog, prompt });
    expect(plan.primaryMeasureParameterId).toBe("rcs_crossing_length_m");
    expect(plan.parameters).toEqual({ rcs_civil_installation_method: methods.pipeJacking, rcs_crossing_length_m: "24", rcs_casing_outside_diameter_mm: "720", rcs_casing_inside_diameter_mm: "700", rcs_carrier_outside_diameter_mm: "110" });
    const result = await compile(plan.parameters);
    expect(result.preliminaryNeeds.length).toBeGreaterThan(0);
    expect(result.preliminaryNeeds.flatMap(n => n.missing_parameter_ids)).toContain("rcs_completion_site_mode");
    expect(result.preliminaryNeeds.flatMap(n => n.missing_parameter_ids).some(id => id.startsWith("effective_resource_quantity_"))).toBe(false);
    expect(result.rows.some(row => row.quantity != null)).toBe(true);
    expect(definition.runtimeInput).toEqual({});
  });
  it("retains editable actual conditional rates, source references and unconditional project inventory", () => {
    for (const id of ["rcs_completion_site_crew_hours_per_unit", "rcs_completion_site_programme_reference", "rcs_raci_selected_elements_per_ring", "rcs_steel_density_kg_m3"]) {
      const schema = catalog.parameterSchema.find(p => p.parameterId === id)!;
      expect(schema.preliminaryCompilationAllowed).toBe(true);
      expect(isCanonicalEstimateSourceManagedParameter(schema)).toBe(false);
      if (schema.valueType !== "text") expect(isCanonicalEstimateConsumerSuppliedParameter(schema)).toBe(true);
      // The ordinary editor admits bounded text through its existing resource
      // selection seam; numeric ownership and text selection are distinct.
      expect(isCanonicalEstimateVisibleUserResourceSelectionParameter(schema)).toBe(true);
    }
    const internal = catalog.parameterSchema.find(p => p.visibilityRole === "INTERNAL_ONLY")!;
    expect(isCanonicalEstimateConsumerSuppliedParameter(internal)).toBe(false);
    for (const role of ["MANDATORY_NORM_VALUE", "MANUFACTURER_CONFIRMED", "SELECTED_EQUIPMENT_PASSPORT", "BACKEND_DERIVED"] as const) {
      expect(isCanonicalEstimateConsumerSuppliedParameter({ ...catalog.parameterSchema[0], valueSourceRole: role })).toBe(false);
    }
    expect(buildRoadCrossingSleevesComponentsR1(metadata).definition.parameters.find(p => p.parameter_id === "rcs_crossing_length_m")?.truth_metadata.preliminary_compilation_allowed).toBe(false);
  });
  it("rejects supplied invalid dimensions while missing dimensions remain deferred", async () => {
    expect(() => buildCanonicalBaselinePlan({ catalog, prompt, parameterOverrides: { rcs_crossing_length_m: "-1" } })).toThrow();
    await expect(compile({ ...parseRoadCrossingSleevesSelectedJackingPromptR1(prompt), rcs_casing_inside_diameter_mm: 730 })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
  it("cannot promote open cut or unsupported resource programmes through the publication boundary", () => {
    expect(() => assertRoadCrossingSleevesSelectedJackingPublicationR1(selected)).not.toThrow();
    expect(catalog.parameterSchema.find(p => p.parameterId === "rcs_civil_installation_method")?.constraints.values).toEqual([methods.pipeJacking]);
    for (const parameter of catalog.parameterSchema) expect((parameter.constraints.values as string[] | undefined)?.some(value => selected.scope.unsupportedValues.includes(value))).not.toBe(true);
    expect(() => buildCanonicalBaselinePlan({ catalog, prompt, parameterOverrides: { rcs_civil_installation_method: methods.openCut } })).toThrow();
    const mutated = { ...selected, definition: { ...definition, parameters: [...definition.parameters, { ...definition.parameters[0], constraints_json: { values: [methods.openCut] } }] } };
    expect(() => assertRoadCrossingSleevesSelectedJackingPublicationR1(mutated)).toThrow("UNSUPPORTED_SCOPE");
    expect(() => assertRoadCrossingSleevesSelectedJackingPublicationR1({ ...selected, definition: { ...definition, resources: definition.resources.slice(0, 1) } })).toThrow("INCOMPLETE_RESOURCE_COVERAGE");
    expect(() => assertRoadCrossingSleevesSelectedJackingPublicationR1({ ...selected, definition: { ...definition, formulas: definition.formulas.slice(0, 1) } })).toThrow("INCOMPLETE_RESOURCE_COVERAGE");
    expect(selected.scope.engineeringAccepted).toBe(false);
    expect(definition.resources.length).toBeLessThanOrEqual(2000);
    expect(definition.resources.some(row => row.row_id === "rcs:civil:open_cut_excavation_m3")).toBe(false);
    expect(definition.resources.some(row => row.row_id === "rcs:civil:jacking_thrust_pit_excavation_m3")).toBe(true);
  });
  it("does not infer a measured carrier outside diameter from DN or borrow it as casing diameter", () => {
    expect(parseRoadCrossingSleevesSelectedJackingPromptR1("продавливание, рабочая труба DN110")).toEqual({ rcs_civil_installation_method: methods.pipeJacking });
    expect(parseRoadCrossingSleevesSelectedJackingPromptR1("продавливание, рабочая труба наружный диаметр 110 мм").rcs_casing_outside_diameter_mm).toBeUndefined();
  });
  it("does not convert a negated or contradictory method into supported jacking", () => {
    expect(parseRoadCrossingSleevesSelectedJackingPromptR1("переход не продавливанием, длина футляра 24 м").rcs_civil_installation_method).toBeUndefined();
    expect(() => buildCanonicalBaselinePlan({ catalog, prompt: "Переход открытым способом, без продавливания, длина футляра 24 м" })).toThrow();
    expect(() => buildCanonicalBaselinePlan({ catalog, prompt: "Открытым способом и продавливанием, длина футляра 24 м" })).toThrow();
    expect(parseRoadCrossingSleevesSelectedJackingPromptR1(prompt).rcs_civil_installation_method).toBe(methods.pipeJacking);
    expect(parseRoadCrossingSleevesSelectedJackingPromptR1("Не открытым способом, а продавливанием, длина футляра 24 м").rcs_civil_installation_method).toBe(methods.pipeJacking);
  });
});
