import { buildMasterParameterCalculationConsumers } from "../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1";
import { buildRoadCrossingSleevesComponentsR1, ROAD_CROSSING_SLEEVES_FREIGHT_MODES_R1 as modes, ROAD_CROSSING_SLEEVES_FREIGHT_COST_BASIS_R1 as basis } from "../../src/lib/estimate/v4/roadCrossingSleevesComponentsR1";
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
