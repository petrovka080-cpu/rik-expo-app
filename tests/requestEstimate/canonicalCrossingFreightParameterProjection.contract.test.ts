import { buildMasterParameterCalculationConsumers } from "../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1";
import { buildRoadCrossingSleevesComponentsR1, ROAD_CROSSING_SLEEVES_FREIGHT_MODES_R1 as modes, ROAD_CROSSING_SLEEVES_FREIGHT_COST_BASIS_R1 as basis,
  ROAD_CROSSING_SLEEVES_SOIL_MODES_R1 as soilModes, ROAD_CROSSING_SLEEVES_SOIL_REUSE_ORIGINS_R1 as soilOrigins,
  ROAD_CROSSING_SLEEVES_SOIL_DESTINATIONS_R1 as destinations, ROAD_CROSSING_SLEEVES_SOIL_RECEIVING_MODES_R1 as receivingModes,
  ROAD_CROSSING_SLEEVES_SOIL_RECEIVING_COST_BASIS_R1 as receivingBasis } from "../../src/lib/estimate/v4/roadCrossingSleevesComponentsR1";
import { ROAD_CROSSING_SLEEVES_CIVIL_METHODS_R1 as methods } from "../../src/lib/estimate/v4/roadCrossingSleevesCivilGeometryR1";
import { ROAD_CROSSING_SLEEVES_TRENCH_FILL_MODES_R1 as fillModes } from "../../src/lib/estimate/v4/roadCrossingSleevesPitFillMaterialR1";
import { buildConsumerCanonicalPrecompileParameterSession } from "../../src/features/consumerRepair/consumerCanonicalParameterEditor";
import { buildCanonicalParameterCards } from "../../src/lib/estimatePresentation/buildCanonicalParameterCards";
import type { CanonicalEstimateCatalogItem, CanonicalEstimateParameterGuide, CanonicalEstimateParameterInputValue } from "../../src/lib/estimate/backendPlatform/contracts";

// The actual assembly and publisher enrichment feed the common editor. No DB
// release, invented consumer IDs, generic norm defaults or approval is used.
const { definition } = buildRoadCrossingSleevesComponentsR1({ source_title: "Owned synthetic freight/editor fixture",
  source_document_version: "test", definition_hash: "a".repeat(64), artifact_sha256: "a".repeat(64), exact_locator: "owned test" });
const consumers = buildMasterParameterCalculationConsumers(definition);
const catalog: CanonicalEstimateCatalogItem = {
  catalogId: "canonical-work:expanded:road_crossing_sleeves", releaseId: "owned-test-not-published", namespace: "global", domain: "roadworks",
  workKey: "road_crossing_sleeves", titleRu: "Футляр", definitionVersion: 1, applicability: {}, professionalMetadata: {},
  parameterSchema: definition.parameters.map(p => {
    const guide = p.truth_metadata.guide as Record<string, unknown>;
    return { parameterId: p.parameter_id, ordinal: p.ordinal,
      valueType: p.value_type as CanonicalEstimateCatalogItem["parameterSchema"][number]["valueType"], unitId: p.unit_id, titleRu: p.title_ru,
      required: p.required, defaultValue: p.default_value, constraints: p.constraints_json ?? {}, visibilityRole: "USER_INPUT",
      valueSourceRole: p.truth_metadata.value_source_role as CanonicalEstimateCatalogItem["parameterSchema"][number]["valueSourceRole"],
      preliminaryCompilationAllowed: p.truth_metadata.preliminary_compilation_allowed === true,
      formulaConsumers: consumers.formulaConsumers[p.parameter_id], resourceBranchConsumers: consumers.resourceConsumers[p.parameter_id],
      guide: { guideKind: guide.guide_kind as CanonicalEstimateParameterGuide["guideKind"], guideShortRu: String(guide.guide_short_ru),
        guideValidationPolicy: guide.guide_validation_policy as CanonicalEstimateParameterGuide["guideValidationPolicy"],
        sourceRole: guide.source_role as CanonicalEstimateParameterGuide["sourceRole"], sourceDocument: String(guide.source_document),
        sourceLocator: String(guide.source_locator), guideVersion: String(guide.guide_version), sourceSnapshotHash: String(guide.source_snapshot_hash),
        applicability: String(guide.applicability), verifiedAt: String(guide.verified_at) },
    };
  }),
};
const fixture: Record<string, CanonicalEstimateParameterInputValue> = {
  rcs_crossing_length_m: 35, rcs_planned_physical_section_length_m: 12, rcs_compatible_stock_section_count: 0,
  rcs_retained_spare_section_count: 1, rcs_supplier_bundle_section_count: 2,
  rcs_freight_casing_new_mode: modes.separate, rcs_freight_casing_new_allocation_reference: "TEST actual dedicated load/route allocation",
  rcs_freight_casing_new_vehicle_designation: "TEST actual vehicle", rcs_freight_casing_new_shipping_kg_per_unit: 1000,
  rcs_freight_casing_new_payload_kg: 2500, rcs_freight_casing_new_max_units_per_trip: 5,
  rcs_freight_casing_new_max_section_length_m: 12, rcs_freight_casing_new_cost_basis: basis,
};
const session = (parameters = fixture, missingParameterIds: string[] = []) => buildConsumerCanonicalPrecompileParameterSession({
  catalog, draftId: "owned-freight-editor", parameters, missingParameterIds, userExplicitParameterIds: Object.keys(parameters), textExtractedParameterIds: [],
});

describe("actual soil-state facts through the same canonical publisher/editor", () => {
  const soil: Record<string, CanonicalEstimateParameterInputValue> = { ...fixture,
    rcs_civil_installation_method: methods.openCut, rcs_open_cut_excavation_width_m: 1.5, rcs_open_cut_excavation_depth_m: 2,
    rcs_trench_fill_material_mode: fillModes.sameGranular, rcs_trench_fill_approved_reused_finished_m3: 20,
    rcs_soil_trench_scope: soilModes.uniform, rcs_soil_trench_batch_reference: "TEST actual single homogeneous batch",
    rcs_soil_trench_loose_per_bank_m3: 1.25, rcs_soil_trench_allocation_reference: "TEST actual disjoint reuse and retained allocation",
    rcs_soil_trench_retained_loose_m3: 10, rcs_soil_trench_reuse_origin: soilOrigins.current,
    rcs_soil_trench_reuse_loose_per_finished_m3: 1.2,
    rcs_soil_trench_destination: destinations.disposal, rcs_soil_trench_destination_reference: "TEST actual material classification and receiver",
    rcs_soil_trench_haul_mode: modes.separate, rcs_soil_trench_haul_reference: "TEST dedicated route and full trips",
    rcs_soil_trench_vehicle_designation: "TEST actual compatible vehicle", rcs_soil_trench_shipping_density_kg_m3: 1800,
    rcs_soil_trench_vehicle_payload_kg: 10000, rcs_soil_trench_vehicle_loose_capacity_m3: 8, rcs_soil_trench_haul_cost_basis: basis,
    rcs_soil_trench_receiving_mode: receivingModes.mass, rcs_soil_trench_receiving_cost_basis: receivingBasis,
  };
  it("keeps supplied original soil facts editable with guides, units and no calculated-volume questions", () => {
    for (const [key, value] of Object.entries(soil).filter(([key]) => key.startsWith("rcs_soil_trench_"))) {
      expect(cards(soil).find(c => c.key === key)).toMatchObject({ value, editable: true, missing: false });
      expect(cards(soil).find(c => c.key === key)?.guideShortRu).toBeTruthy();
    }
    expect(cards(soil).find(c => c.key === "rcs_soil_trench_shipping_density_kg_m3")?.unitRu).toBe("кг/м³");
    expect(catalog.parameterSchema.some(p => /(?:excavated_loose|excess_loose|trip_count|effective_loose)/u.test(p.parameterId))).toBe(false);
  });
  it("preserves unavailable original reuse conversion as an editable missing fact instead of assuming zero", () => {
    const input = { ...soil }; delete input.rcs_soil_trench_reuse_loose_per_finished_m3;
    expect(cards(input).find(c => c.key === "rcs_soil_trench_reuse_loose_per_finished_m3")).toMatchObject({ value: null, missing: true, editable: true });
    expect(session(input, ["rcs_soil_trench_reuse_loose_per_finished_m3"]).blockingMissingParameterIds).toContain("rcs_soil_trench_reuse_loose_per_finished_m3");
  });
  it("asks a partial original allocation only for actual partial origin and retains inactive earlier conversion", () => {
    const external = session({ ...soil, rcs_soil_trench_reuse_origin: soilOrigins.external });
    expect(external.parameters.some(p => p.parameterId === "rcs_soil_trench_reuse_loose_per_finished_m3")).toBe(false);
    expect(external.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_soil_trench_reuse_loose_per_finished_m3")).toMatchObject({ value: 1.2 });
    expect(cards({ ...soil, rcs_soil_trench_reuse_origin: soilOrigins.partial }).find(c => c.key === "rcs_soil_trench_reuse_current_finished_m3")).toMatchObject({ value: null, missing: true, editable: true });
  });
  it("zero reuse and zero calculated excess hide all destination/transport/receiving questions while retaining their values", () => {
    const result = session({ ...soil, rcs_trench_fill_approved_reused_finished_m3: 0, rcs_soil_trench_retained_loose_m3: 131.25 });
    for (const suffix of ["reuse_origin", "reuse_loose_per_finished_m3", "destination", "shipping_density_kg_m3", "vehicle_payload_kg", "receiving_mode"]) {
      expect(result.parameters.some(p => p.parameterId === `rcs_soil_trench_${suffix}`)).toBe(false);
    }
    expect(result.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_soil_trench_vehicle_payload_kg")).toMatchObject({ value: 10000 });
  });
  it("other-party haul keeps a tonne receiver's original shipping density active but disables vehicle-only facts", () => {
    const result = session({ ...soil, rcs_soil_trench_haul_mode: modes.otherParty });
    expect(result.parameters.find(p => p.parameterId === "rcs_soil_trench_shipping_density_kg_m3")).toBeDefined();
    expect(result.parameters.some(p => p.parameterId === "rcs_soil_trench_vehicle_payload_kg")).toBe(false);
    const volume = session({ ...soil, rcs_soil_trench_haul_mode: modes.otherParty, rcs_soil_trench_receiving_mode: receivingModes.looseVolume });
    expect(volume.parameters.some(p => p.parameterId === "rcs_soil_trench_shipping_density_kg_m3")).toBe(false);
  });
});
const cards = (parameters = fixture) => buildCanonicalParameterCards({ session: session(parameters), revision: null });

describe("actual crossing freight through common metadata and editor", () => {
  it("keeps every supplied freight fact editable, including a reference and a punctuated cost basis", () => {
    for (const [key, value] of Object.entries(fixture).filter(([key]) => key.startsWith("rcs_freight_casing_new_"))) {
      expect(cards().map(c => c.key)).toContain(key);
      expect(cards().find(c => c.key === key)).toMatchObject({ value, editable: true, missing: false });
      expect(cards().find(c => c.key === key)?.guideShortRu).toBeTruthy();
    }
    expect(cards().find(c => c.key === "rcs_freight_casing_new_shipping_kg_per_unit")?.unitRu).toBe("кг/шт.");
  });
  it("retains a missing actual shipping mass as one primary fact and never substitutes geometric steel mass", () => {
    const input = { ...fixture }; delete input.rcs_freight_casing_new_shipping_kg_per_unit;
    expect(cards(input).find(c => c.key === "rcs_freight_casing_new_shipping_kg_per_unit")).toMatchObject({ value: null, missing: true, editable: true });
    expect(session(input, ["rcs_freight_casing_new_shipping_kg_per_unit"]).blockingMissingParameterIds).toContain("rcs_freight_casing_new_shipping_kg_per_unit");
  });
  it("automatically makes all new shipment fields inactive at zero order while retaining earlier values", () => {
    const result = session({ ...fixture, rcs_compatible_stock_section_count: 4, rcs_freight_casing_offsite_stock_units: 0 });
    expect(result.parameters.some(p => p.parameterId.startsWith("rcs_freight_casing_new_"))).toBe(false);
    expect(result.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_freight_casing_new_payload_kg")).toMatchObject({ value: 2500 });
  });
  it("keeps explicit other-party delivery and its proof active, retaining inactive vehicle facts for switching back", () => {
    const result = session({ ...fixture, rcs_freight_casing_new_mode: modes.otherParty });
    expect(result.parameters.find(p => p.parameterId === "rcs_freight_casing_new_allocation_reference")).toBeDefined();
    expect(result.parameters.some(p => p.parameterId === "rcs_freight_casing_new_payload_kg")).toBe(false);
    expect(result.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_freight_casing_new_payload_kg")).toMatchObject({ value: 2500 });
    expect(cards().find(c => c.key === "rcs_freight_casing_new_payload_kg")).toMatchObject({ value: 2500, editable: true });
    expect(definition.runtimeInput).toEqual({});
  });
});
