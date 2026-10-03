import { buildMasterParameterCalculationConsumers } from "../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1";
import { buildRoadCrossingSleevesComponentsR1, ROAD_CROSSING_SLEEVES_FREIGHT_MODES_R1 as modes, ROAD_CROSSING_SLEEVES_FREIGHT_COST_BASIS_R1 as basis,
  ROAD_CROSSING_SLEEVES_SOIL_MODES_R1 as soilModes, ROAD_CROSSING_SLEEVES_SOIL_REUSE_ORIGINS_R1 as soilOrigins,
  ROAD_CROSSING_SLEEVES_SOIL_DESTINATIONS_R1 as destinations, ROAD_CROSSING_SLEEVES_SOIL_RECEIVING_MODES_R1 as receivingModes,
  ROAD_CROSSING_SLEEVES_SOIL_RECEIVING_COST_BASIS_R1 as receivingBasis,
  ROAD_CROSSING_SLEEVES_INSPECTION_MODES_R1 as inspectionModes, ROAD_CROSSING_SLEEVES_INSPECTION_COUPLANT_COST_BASIS_R1 as couplantBasis,
  ROAD_CROSSING_SLEEVES_PREPARATION_MODES_R1 as preparationModes, ROAD_CROSSING_SLEEVES_PREPARATION_MATERIAL_COST_BASIS_R1 as preparationBasis,
  ROAD_CROSSING_SLEEVES_COMPACTION_WATER_MODES_R1 as compactionWaterModes, ROAD_CROSSING_SLEEVES_COMPACTION_WATER_COST_BASIS_R1 as compactionWaterBasis,
  ROAD_CROSSING_SLEEVES_JACKING_LOADING_MODES_R1 as loadingModes,
  ROAD_CROSSING_SLEEVES_CASING_PREP_MATERIAL_MODES_R1 as casingPrepModes, ROAD_CROSSING_SLEEVES_CASING_PREP_MATERIAL_COST_BASIS_R1 as casingPrepBasis,
  ROAD_CROSSING_SLEEVES_COATING_MODES_R1 as coatingModes, ROAD_CROSSING_SLEEVES_COATING_KIT_COST_BASIS_R1 as coatingKitBasis,
  ROAD_CROSSING_SLEEVES_CARRIER_CONNECTION_MODES_R1 as connectionModes,
  ROAD_CROSSING_SLEEVES_WATER_CONTROL_MODES_R1 as waterControlModes,
  ROAD_CROSSING_SLEEVES_WATER_RECEIVING_MODES_R1 as waterReceivingModes,
  ROAD_CROSSING_SLEEVES_WATER_RECEIVING_COST_BASIS_R1 as waterReceivingBasis,
  ROAD_CROSSING_SLEEVES_WATER_TREATMENT_MODES_R1 as waterTreatmentModes,
  ROAD_CROSSING_SLEEVES_WATER_TREATMENT_RENTAL_BASIS_R1 as waterTreatmentRentalBasis,
  ROAD_CROSSING_SLEEVES_WATER_TREATMENT_BAG_BASIS_R1 as waterTreatmentBagBasis,
  ROAD_CROSSING_SLEEVES_WATER_TREATMENT_WASTE_MODES_R1 as waterWasteModes,
  ROAD_CROSSING_SLEEVES_WATER_TREATMENT_WASTE_TRIP_BASIS_R1 as waterWasteTripBasis,
  ROAD_CROSSING_SLEEVES_WATER_TREATMENT_WASTE_RECEIVING_MODES_R1 as waterWasteReceivingModes,
  ROAD_CROSSING_SLEEVES_WATER_TREATMENT_WASTE_RECEIVING_BASIS_R1 as waterWasteReceivingBasis,
  ROAD_CROSSING_SLEEVES_EQUIPMENT_MOBILIZATION_MODES_R1 as equipmentMobilizationModes } from "../../src/lib/estimate/v4/roadCrossingSleevesComponentsR1";
import { ROAD_CROSSING_SLEEVES_CIVIL_METHODS_R1 as methods } from "../../src/lib/estimate/v4/roadCrossingSleevesCivilGeometryR1";
import { ROAD_CROSSING_SLEEVES_SHORING_MODES_R1 as shoringModes, ROAD_CROSSING_SLEEVES_SHORING_RENTAL_BASIS_R1 as shoringRentalBasis,
  ROAD_CROSSING_SLEEVES_SHORING_WORK_BASES_R1 as shoringWorkBases } from "../../src/lib/estimate/v4/roadCrossingSleevesShoringR1";
import { ROAD_CROSSING_SLEEVES_SHORING_CONSUMABLE_MODES_R1 as shoringMaterialModes, ROAD_CROSSING_SLEEVES_SHORING_CONSUMABLE_BASIS_R1 as shoringMaterialBasis } from "../../src/lib/estimate/v4/roadCrossingSleevesShoringConsumablesR1";
import { ROAD_CROSSING_SLEEVES_SHORING_GAP_MODES_R1 as gapModes, ROAD_CROSSING_SLEEVES_SHORING_GAP_SUPPLY_MODES_R1 as gapSupplyModes,
  ROAD_CROSSING_SLEEVES_SHORING_GAP_WORK_MODES_R1 as gapWorkModes, ROAD_CROSSING_SLEEVES_SHORING_GAP_BASES_R1 as gapBases } from "../../src/lib/estimate/v4/roadCrossingSleevesShoringGapFillR1";
import { ROAD_CROSSING_SLEEVES_REACTION_MODES_R1 as reactionModes, ROAD_CROSSING_SLEEVES_REACTION_RENTAL_BASIS_R1 as reactionRentalBasis } from "../../src/lib/estimate/v4/roadCrossingSleevesReactionR1";
import { ROAD_CROSSING_SLEEVES_SERVICE_WASTE_MODES_R1 as serviceWasteModes, ROAD_CROSSING_SLEEVES_SERVICE_WASTE_TRIP_BASIS_R1 as serviceWasteTripBasis,
  ROAD_CROSSING_SLEEVES_SERVICE_WASTE_RECEIVING_MODES_R1 as serviceWasteReceivingModes } from "../../src/lib/estimate/v4/roadCrossingSleevesServiceWasteR1";
import { ROAD_CROSSING_SLEEVES_TRENCH_FILL_MODES_R1 as fillModes } from "../../src/lib/estimate/v4/roadCrossingSleevesPitFillMaterialR1";
import { ROAD_CROSSING_SLEEVES_CARRIER_SUPPLY_MODES_R1 as carrierSupplyModes } from "../../src/lib/estimate/v4/roadCrossingSleevesCasingMaterialR1";
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

describe("actual permanent rectangular contact-gap facts in the common editable parameter session", () => {
  const gap: Record<string, CanonicalEstimateParameterInputValue> = { ...fixture, rcs_civil_installation_method: methods.pipeJacking,
    rcs_shoring_thrust_mode: shoringModes.completeRental, rcs_shoring_thrust_complete_kit_count: 1, rcs_shoring_thrust_placement_cycle_count: 1,
    rcs_shoring_thrust_installed_outer_length_m: 4, rcs_shoring_thrust_installed_outer_width_m: 3,
    rcs_jacking_thrust_excavation_length_m: 6, rcs_jacking_thrust_excavation_width_m: 4, rcs_jacking_thrust_excavation_depth_m: 3,
    rcs_jacking_thrust_permanent_occupied_volume_m3: 40,
    rcs_shoring_gap_thrust_mode: gapModes.retainedRectangular,
    rcs_shoring_gap_thrust_program_and_allocation_reference: "TEST actual permanent preplaced gap included in original permanent occupied volume once, no duplicate installation/final fill/water",
    rcs_shoring_gap_thrust_rectangular_contact_reference: "TEST actual full rectangular four-sided contact, one kit/position/full depth/uniform gap, no protrusions/other occupants",
    rcs_shoring_gap_thrust_granular_gross_loose_per_finished_m3: 1.2, rcs_shoring_gap_thrust_water_gross_l_per_finished_m3: 80,
    rcs_shoring_gap_thrust_granular_supply_mode: gapSupplyModes.separate, rcs_shoring_gap_thrust_water_supply_mode: gapSupplyModes.separate,
    rcs_shoring_gap_thrust_granular_product_designation: "TEST compatible loose granular material",
    rcs_shoring_gap_thrust_granular_compatibility_reference: "TEST actual quality/state/loss/source allocation",
    rcs_shoring_gap_thrust_granular_compatible_stock_m3: 5, rcs_shoring_gap_thrust_granular_retained_reserve_m3: 2,
    rcs_shoring_gap_thrust_granular_supplier_multiple_m3: 5, rcs_shoring_gap_thrust_granular_cost_basis: gapBases.material,
    rcs_shoring_gap_thrust_water_product_designation: "TEST compatible exclusively allocated water", rcs_shoring_gap_thrust_water_supplier_multiple_m3: 1,
    rcs_shoring_gap_thrust_work_mode: gapWorkModes.separate, rcs_shoring_gap_thrust_work_method_reference: "TEST actual whole disjoint gap placing/watering/compaction",
    rcs_shoring_gap_thrust_crew_designation: "TEST all gap crew including operators", rcs_shoring_gap_thrust_crew_h_per_finished_m3: 0.6,
    rcs_shoring_gap_thrust_crew_cost_basis: gapBases.crew,
  };
  it("keeps original dimensions/contact/allocation/stock/rates already filled and editable without requesting derived gap volume or orders", () => {
    const actual = cards(gap);
    for (const [key, value] of Object.entries(gap).filter(([key]) => key.startsWith("rcs_shoring_gap_") || key.includes("installed_outer_") || key === "rcs_jacking_thrust_permanent_occupied_volume_m3")) {
      expect(actual.find(c => c.key === key)).toMatchObject({ value, editable: true, missing: false });
      expect(catalog.parameterSchema.find(p => p.parameterId === key)?.guide?.sourceSnapshotHash).toBe("a".repeat(64));
    }
    expect(actual.find(c => c.key === "rcs_shoring_gap_thrust_granular_supplier_multiple_m3")?.unitRu).toBe("м³");
    expect(actual.find(c => c.key === "rcs_shoring_gap_thrust_water_gross_l_per_finished_m3")?.unitRu).toBe("л/м³");
    expect(actual.find(c => c.key === "rcs_shoring_gap_thrust_crew_h_per_finished_m3")?.unitRu).toBe("чел.-ч/м³");
    expect(catalog.parameterSchema.some(p => /shoring_gap.*(?:permanently_preplaced|gap_volume|ordered_m3|trip_count)$/u.test(p.parameterId))).toBe(false);
  });
  it("distinguishes unknown added water from explicit zero and retains inactive facts for technology edits", () => {
    const input = { ...gap }; delete input.rcs_shoring_gap_thrust_water_gross_l_per_finished_m3;
    expect(cards(input).find(c => c.key === "rcs_shoring_gap_thrust_water_gross_l_per_finished_m3")).toMatchObject({ value: null, missing: true, editable: true });
    const zero = session({ ...gap, rcs_shoring_gap_thrust_water_gross_l_per_finished_m3: 0 });
    expect(zero.parameters.some(p => p.parameterId === "rcs_shoring_gap_thrust_water_supplier_multiple_m3")).toBe(false);
    expect(zero.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_shoring_gap_thrust_water_supplier_multiple_m3")).toMatchObject({ value: 1 });
    const other = session({ ...gap, rcs_shoring_gap_thrust_mode: gapModes.other });
    expect(other.parameters.find(p => p.parameterId === "rcs_shoring_gap_thrust_program_and_allocation_reference")).toBeDefined();
    expect(other.parameters.some(p => p.parameterId === "rcs_shoring_gap_thrust_granular_supplier_multiple_m3")).toBe(false);
    expect(other.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_shoring_gap_thrust_rectangular_contact_reference")).toMatchObject({ value: gap.rcs_shoring_gap_thrust_rectangular_contact_reference });
  });
});

describe("actual complete service-waste programme in common parameter cards", () => {
  const waste: Record<string, CanonicalEstimateParameterInputValue> = { ...fixture,
    rcs_civil_installation_method: methods.openCut, rcs_shoring_trench_mode: shoringModes.completeRental,
    rcs_shoring_trench_complete_kit_count: 2, rcs_shoring_trench_placement_cycle_count: 5, rcs_shoring_trench_calendar_hours: 24,
    rcs_shoring_material_trench_wipes_gross_per_initial_kit: 2, rcs_shoring_material_trench_wipes_gross_per_placement_cycle: 1,
    rcs_shoring_material_trench_wipes_gross_per_group_calendar_hour: 0,
    rcs_service_waste_trench_mode: serviceWasteModes.complete, rcs_service_waste_trench_program_reference: "TEST actual full homogeneous waste inventory including all spent wipes and real discarded product packaging",
    rcs_service_waste_trench_net_waste_kg: 4, rcs_service_waste_trench_dry_kg_per_original_wipe: 0.1,
    rcs_service_waste_trench_wipe_mass_reference: "TEST actual same wipe SKU minimum dry mass and all original wipes in party",
    rcs_service_waste_trench_contents_and_compatibility_reference: "TEST actual classification/full party/handling/whole closed container compatibility",
    rcs_service_waste_trench_container_designation: "TEST actual full compatible closed collector place",
    rcs_service_waste_trench_effective_net_kg_per_container: 2.5, rcs_service_waste_trench_container_tare_kg: 0.2,
    rcs_service_waste_trench_certified_max_shipping_kg_per_container: 3, rcs_service_waste_trench_route_payload_kg: 5,
    rcs_service_waste_trench_vehicle_container_places: 3, rcs_service_waste_trench_trip_cost_basis: serviceWasteTripBasis,
    rcs_service_waste_trench_receiving_mode: serviceWasteReceivingModes.tonnes,
    rcs_service_waste_trench_receiver_designation: "TEST actual compatible receiver", rcs_service_waste_trench_receiving_reference: "TEST actual permitted full party and disposed container receiving",
  };
  it("fills editable real mass/contents/source/packing/route/receiver facts with correct dimensions and no derived packaging question", () => {
    const actualCards = cards(waste);
    for (const [key, value] of Object.entries(waste).filter(([key]) => key.startsWith("rcs_service_waste_"))) {
      expect(actualCards.find(c => c.key === key)).toMatchObject({ value, editable: true, missing: false });
      expect(actualCards.find(c => c.key === key)?.guideShortRu).toBeTruthy();
    }
    expect(actualCards.find(c => c.key === "rcs_service_waste_trench_net_waste_kg")?.unitRu).toBe("кг");
    expect(actualCards.find(c => c.key === "rcs_service_waste_trench_certified_max_shipping_kg_per_container")?.unitRu).toBe("кг/шт.");
    expect(catalog.parameterSchema.some(p => /service_waste.*(?:closed_container_count|receiving_tonnes|gross_shipping_kg|full_service_trip_count)$/u.test(p.parameterId))).toBe(false);
  });
  it("retains missing real net mass and genuine zero/other-party inactive values without substituting consumption or density", () => {
    const input = { ...waste }; delete input.rcs_service_waste_trench_net_waste_kg;
    expect(cards(input).find(c => c.key === "rcs_service_waste_trench_net_waste_kg")).toMatchObject({ value: null, missing: true, editable: true });
    const zero = session({ ...waste, rcs_service_waste_trench_net_waste_kg: 0, rcs_shoring_material_trench_wipes_gross_per_initial_kit: 0,
      rcs_shoring_material_trench_wipes_gross_per_placement_cycle: 0 });
    expect(zero.parameters.some(p => p.parameterId === "rcs_service_waste_trench_route_payload_kg")).toBe(false);
    expect(zero.parameters.some(p => p.parameterId === "rcs_service_waste_trench_dry_kg_per_original_wipe")).toBe(false);
    expect(zero.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_service_waste_trench_route_payload_kg")).toMatchObject({ value: 5 });
    const other = session({ ...waste, rcs_service_waste_trench_mode: serviceWasteModes.otherParty });
    expect(other.parameters.find(p => p.parameterId === "rcs_service_waste_trench_program_reference")).toBeDefined();
    expect(other.parameters.some(p => p.parameterId === "rcs_service_waste_trench_net_waste_kg")).toBe(false);
    expect(other.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_service_waste_trench_net_waste_kg")).toMatchObject({ value: 4 });
  });
});

describe("actual portable reaction parameters and unchanged common editor", () => {
  const reaction: Record<string, CanonicalEstimateParameterInputValue> = { ...fixture, rcs_civil_installation_method: methods.pipeJacking,
    rcs_reaction_mode: reactionModes.portableRental, rcs_reaction_allocation_reference: "TEST actual reaction excluded from paid drive and all other resource owners",
    rcs_reaction_program_and_design_reference: "TEST actual one complete portable backstop and removable compatible interface/ground/design/conditions/return",
    rcs_reaction_kit_designation: "TEST complete actual portable kit", rcs_reaction_kit_product_reference: "TEST full compatible BOM/passports/tackle",
    rcs_reaction_calendar_hours: 24, rcs_reaction_rental_cost_basis: reactionRentalBasis,
    rcs_reaction_kit_reusable_alignment_sets_count: 2, rcs_reaction_kit_removable_restraint_sets_count: 0,
    rcs_reaction_configuration_and_force_reference: "TEST actual complete entire backstop/interface/ground force and useful placement envelope",
    rcs_reaction_installed_required_width_m: 2.5, rcs_reaction_available_working_width_m: 3,
    rcs_reaction_required_full_reaction_kn: 300, rcs_reaction_admissible_full_reaction_kn: 350,
  };
  it("fills actual whole-kit/force/programme/geometry inputs with source guides, dimensions and editable values", () => {
    const actualCards = cards(reaction);
    for (const [key, value] of Object.entries(reaction).filter(([key]) => key.startsWith("rcs_reaction_"))) {
      expect(actualCards.find(c => c.key === key)).toMatchObject({ value, editable: true, missing: false });
      expect(actualCards.find(c => c.key === key)?.guideShortRu).toBeTruthy();
    }
    expect(actualCards.find(c => c.key === "rcs_reaction_admissible_full_reaction_kn")?.unitRu).toBe("кН");
    expect(catalog.parameterSchema.some(p => /reaction_(?:complete_kit_count|force_margin|rental_set_hours)$/u.test(p.parameterId))).toBe(false);
    expect(catalog.parameterSchema.some(p => p.parameterId === "1")).toBe(false);
  });
  it("keeps missing actual force editable and deactivates old kit facts by real method/technology while preserving earlier values", () => {
    const input = { ...reaction }; delete input.rcs_reaction_admissible_full_reaction_kn;
    expect(cards(input).find(c => c.key === "rcs_reaction_admissible_full_reaction_kn")).toMatchObject({ value: null, missing: true, editable: true });
    const open = session({ ...reaction, rcs_civil_installation_method: methods.openCut });
    expect(open.parameters.some(p => p.parameterId.startsWith("rcs_reaction_"))).toBe(false);
    expect(open.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_reaction_admissible_full_reaction_kn")).toMatchObject({ value: 350 });
    const supplied = session({ ...reaction, rcs_reaction_mode: reactionModes.otherParty });
    expect(supplied.parameters.find(p => p.parameterId === "rcs_reaction_allocation_reference")).toBeDefined();
    expect(supplied.parameters.some(p => p.parameterId === "rcs_reaction_calendar_hours")).toBe(false);
    expect(supplied.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_reaction_calendar_hours")).toMatchObject({ value: 24 });
  });
});

describe("actual full shoring programme through the common publisher and editable parameter session", () => {
  const shoring: Record<string, CanonicalEstimateParameterInputValue> = { ...fixture, rcs_civil_installation_method: methods.openCut,
    rcs_shoring_trench_mode: shoringModes.completeRental, rcs_shoring_trench_program_reference: "TEST actual source-bounded whole programme/allocation",
    rcs_shoring_trench_kit_designation: "TEST full compatible kit", rcs_shoring_trench_kit_product_reference: "TEST actual complete passport/BOM",
    rcs_shoring_trench_complete_kit_count: 2, rcs_shoring_trench_calendar_hours: 24, rcs_shoring_trench_placement_cycle_count: 5,
    rcs_shoring_trench_rental_cost_basis: shoringRentalBasis, rcs_shoring_trench_kit_top_panels_per_complete_kit: 0,
    rcs_shoring_trench_geometry_and_load_reference: "TEST actual dimensional/structural/method proof, not outside excavation inferred from useful width",
    rcs_shoring_trench_installed_outer_width_m: 1.4, rcs_shoring_trench_usable_width_m: 1,
    rcs_shoring_trench_installation_crew_h_per_unit: 2, rcs_shoring_trench_installation_crew_cost_basis: shoringWorkBases.crew,
    rcs_shoring_trench_monitoring_equipment_h_per_unit: 0, rcs_shoring_trench_monitoring_equipment_cost_basis: shoringWorkBases.equipment,
  };
  it("shows actual kit/programme/geometry/BOM/rates with filled editable values, source guides and correct units", () => {
    const actualCards = cards(shoring);
    for (const [key, value] of Object.entries(shoring).filter(([key]) => key.startsWith("rcs_shoring_"))) {
      expect(actualCards.find(c => c.key === key)).toMatchObject({ value, editable: true, missing: false });
      expect(actualCards.find(c => c.key === key)?.guideShortRu).toBeTruthy();
    }
    expect(actualCards.find(c => c.key === "rcs_shoring_trench_installation_crew_h_per_unit")?.unitRu).toBe("чел.-ч/шт.");
    expect(actualCards.find(c => c.key === "rcs_shoring_trench_calendar_hours")?.unitRu).toBe("ч");
    expect(catalog.parameterSchema.some(p => /shoring.*(?:rental_set_hours|trip_count|height_margin|remaining_m3)/u.test(p.parameterId))).toBe(false);
  });
  const material: Record<string, CanonicalEstimateParameterInputValue> = { ...shoring,
    rcs_shoring_material_trench_cleaner_program_and_compatibility_reference: "TEST actual exclusive all-stage consumption, compatible unused stock and losses",
    rcs_shoring_material_trench_cleaner_gross_per_initial_kit: 0.2, rcs_shoring_material_trench_cleaner_gross_per_placement_cycle: 0.1,
    rcs_shoring_material_trench_cleaner_gross_per_group_calendar_hour: 0.01, rcs_shoring_material_trench_cleaner_mode: shoringMaterialModes.separate,
    rcs_shoring_material_trench_cleaner_product_designation: "TEST actual compatible cleaner", rcs_shoring_material_trench_cleaner_cost_basis: shoringMaterialBasis,
    rcs_shoring_material_trench_cleaner_compatible_unused_stock: 0.5, rcs_shoring_material_trench_cleaner_retained_reserve: 0.2,
    rcs_shoring_material_trench_cleaner_supplier_pack_net: 1,
  };
  it("fills actual consumable programme rates and stock/order sources as editable facts with correct dimensions", () => {
    const actualCards = cards(material);
    for (const [key, value] of Object.entries(material).filter(([key]) => key.startsWith("rcs_shoring_material_"))) {
      expect(actualCards.find(c => c.key === key)).toMatchObject({ value, editable: true, missing: false });
      expect(actualCards.find(c => c.key === key)?.guideShortRu).toBeTruthy();
    }
    expect(actualCards.find(c => c.key === "rcs_shoring_material_trench_cleaner_gross_per_group_calendar_hour")?.unitRu).toBe("л/ч");
    expect(catalog.parameterSchema.some(p => /shoring_material.*(?:consumed|ordered|remaining_unused|trip_count)$/u.test(p.parameterId))).toBe(false);
  });
  it("deactivates zero-consumption/other-party stock and freight while retaining earlier values; missing original rate stays editable", () => {
    const zero = session({ ...material, rcs_shoring_material_trench_cleaner_gross_per_initial_kit: 0,
      rcs_shoring_material_trench_cleaner_gross_per_placement_cycle: 0, rcs_shoring_material_trench_cleaner_gross_per_group_calendar_hour: 0 });
    expect(zero.parameters.some(p => p.parameterId === "rcs_shoring_material_trench_cleaner_supplier_pack_net")).toBe(false);
    expect(zero.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_shoring_material_trench_cleaner_supplier_pack_net")).toMatchObject({ value: 1 });
    const supplied = session({ ...material, rcs_shoring_material_trench_cleaner_mode: shoringMaterialModes.otherParty });
    expect(supplied.parameters.find(p => p.parameterId === "rcs_shoring_material_trench_cleaner_program_and_compatibility_reference")).toBeDefined();
    expect(supplied.parameters.some(p => p.parameterId === "rcs_shoring_material_trench_cleaner_compatible_unused_stock")).toBe(false);
    const input = { ...material }; delete input.rcs_shoring_material_trench_cleaner_gross_per_placement_cycle;
    expect(cards(input).find(c => c.key === "rcs_shoring_material_trench_cleaner_gross_per_placement_cycle")).toMatchObject({ value: null, missing: true, editable: true });
  });
  it("retains a missing actual kit count as an editable original fact without deriving it from excavation volume", () => {
    const input = { ...shoring }; delete input.rcs_shoring_trench_complete_kit_count;
    expect(cards(input).find(c => c.key === "rcs_shoring_trench_complete_kit_count")).toMatchObject({ value: null, missing: true, editable: true });
    expect(session(input, ["rcs_shoring_trench_complete_kit_count"]).blockingMissingParameterIds).toContain("rcs_shoring_trench_complete_kit_count");
  });
  it("switches method and technology using real conditions while retaining earlier inactive values for reopening", () => {
    const pits = session({ ...shoring, rcs_civil_installation_method: methods.pipeJacking });
    expect(pits.parameters.some(p => p.parameterId.startsWith("rcs_shoring_trench_"))).toBe(false);
    expect(pits.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_shoring_trench_complete_kit_count")).toMatchObject({ value: 2 });
    expect(pits.parameters.find(p => p.parameterId === "rcs_shoring_thrust_mode")).toBeDefined();
    const none = session({ ...shoring, rcs_shoring_trench_mode: shoringModes.notRequired });
    expect(none.parameters.find(p => p.parameterId === "rcs_shoring_trench_program_reference")).toBeDefined();
    expect(none.parameters.some(p => p.parameterId === "rcs_shoring_trench_calendar_hours")).toBe(false);
    expect(none.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_shoring_trench_calendar_hours")).toMatchObject({ value: 24 });
    expect(definition.runtimeInput).toEqual({});
  });
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

describe("actual initial inspection through common metadata/editor", () => {
  const inspection: Record<string, CanonicalEstimateParameterInputValue> = { ...fixture,
    rcs_inspection_mode: inspectionModes.visualUt, rcs_inspection_program_reference: "TEST actual initial visual/UT program",
    rcs_inspection_ut_joint_fraction: 0.5, rcs_inspection_ut_method_reference: "TEST actual compatible inspection procedure",
    rcs_inspection_ut_crew_designation: "TEST all inspectors", rcs_inspection_ut_crew_h_per_joint: 0.6,
    rcs_inspection_couplant_product_designation: "TEST actual couplant", rcs_inspection_couplant_product_reference: "TEST product and gross consumption",
    rcs_inspection_couplant_gross_kg_per_joint: 0.3, rcs_inspection_couplant_compatible_stock_kg: 0.1,
    rcs_inspection_couplant_retained_reserve_kg: 0.2, rcs_inspection_couplant_supplier_pack_net_kg: 0.5, rcs_inspection_couplant_cost_basis: couplantBasis,
  };
  it("shows actual inspection/couplant facts already filled and editable with their shared guides and units", () => {
    for (const [key, value] of Object.entries(inspection).filter(([key]) => key.startsWith("rcs_inspection_"))) {
      expect(cards(inspection).map(c => c.key)).toContain(key);
      expect(cards(inspection).find(c => c.key === key)).toMatchObject({ value, editable: true, missing: false });
    }
    expect(cards(inspection).find(c => c.key === "rcs_inspection_couplant_gross_kg_per_joint")?.unitRu).toBe("кг/шт.");
    expect(catalog.parameterSchema.some(p => /(?:initial_joint_count|couplant_ordered|couplant_consumed)/u.test(p.parameterId))).toBe(false);
  });
  it("zero UT selection disables its crew/equipment/material fields without discarding prior values", () => {
    const result = session({ ...inspection, rcs_inspection_ut_joint_fraction: 0 });
    expect(result.parameters.find(p => p.parameterId === "rcs_inspection_ut_joint_fraction")).toBeDefined();
    expect(result.parameters.some(p => p.parameterId === "rcs_inspection_couplant_gross_kg_per_joint")).toBe(false);
    expect(result.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_inspection_couplant_gross_kg_per_joint")).toMatchObject({ value: 0.3 });
    expect(cards(inspection).find(c => c.key === "rcs_inspection_couplant_gross_kg_per_joint")).toMatchObject({ value: 0.3, editable: true });
  });
  it("no site joints disables the entire inspection scope while another-party program keeps its real reference", () => {
    const single = session({ ...inspection, rcs_crossing_length_m: 12 });
    expect(single.parameters.some(p => p.parameterId.startsWith("rcs_inspection_"))).toBe(false);
    const other = session({ ...inspection, rcs_inspection_mode: inspectionModes.otherParty });
    expect(other.parameters.find(p => p.parameterId === "rcs_inspection_program_reference")).toBeDefined();
    expect(other.parameters.some(p => p.parameterId === "rcs_inspection_ut_joint_fraction")).toBe(false);
  });
});
const cards = (parameters = fixture) => buildCanonicalParameterCards({ session: session(parameters), revision: null });

describe("actual coating programme and original inputs through the same publisher/editor", () => {
  const coating: Record<string, CanonicalEstimateParameterInputValue> = { ...fixture,
    rcs_casing_outside_diameter_mm: 530, rcs_coating_mode: coatingModes.wholeKitBrush,
    rcs_coating_program_reference: "TEST actual disjoint single-batch compatible coating programme",
    rcs_coating_joint_band_width_m: 0.4, rcs_coating_damage_area_m2: 3,
    rcs_coating_damage_allocation_reference: "TEST exclusive actual zone allocation",
    rcs_coating_damage_kit_designation: "TEST paired A+B kit", rcs_coating_damage_kit_product_reference: "TEST actual compatibility and climate/cure/inspection",
    rcs_coating_damage_gross_mixed_l_per_m2: 0.6, rcs_coating_damage_kit_net_mixed_l: 2,
    rcs_coating_damage_confirmed_single_batch_max_mixed_l: 10,
    rcs_coating_damage_compatible_unmixed_kit_stock: 1, rcs_coating_damage_retained_kit_reserve: 1,
    rcs_coating_damage_supplier_pack_kit_count: 2, rcs_coating_damage_kit_cost_basis: coatingKitBasis,
    rcs_coating_damage_preparation_crew_h_per_m2: 0.5, rcs_coating_damage_inspection_equipment_h_per_m2: 0.25,
    rcs_coating_damage_cleaner_gross_per_m2: 0.2, rcs_coating_damage_cleaner_product_reference: "TEST actual compatible cleaner and gross use programme",
  };
  it("keeps supplied source-bound coating facts editable with correct units and guides, including actual references", () => {
    const visible = cards(coating);
    for (const [key, value] of Object.entries(coating).filter(([key]) => key.startsWith("rcs_coating_"))) {
      expect(visible.find(c => c.key === key)).toMatchObject({ value, editable: true, missing: false });
      expect(visible.find(c => c.key === key)?.guideShortRu).toBeTruthy();
    }
    for (const [key, unitRu] of [["gross_mixed_l_per_m2", "л/м²"], ["preparation_crew_h_per_m2", "чел.-ч/м²"], ["inspection_equipment_h_per_m2", "маш.-ч/м²"]]) {
      expect(cards(coating).find(c => c.key === `rcs_coating_damage_${key}`)?.unitRu).toBe(unitRu);
    }
    expect(catalog.parameterSchema.some(p => /(?:activated_kit_count|ordered_kit_count|activated_surplus_l|remaining_unmixed)/u.test(p.parameterId))).toBe(false);
  });
  it("missing joint width stays editable while the independent damage resource inputs remain active", () => {
    const input = { ...coating }; delete input.rcs_coating_joint_band_width_m;
    expect(cards(input).find(c => c.key === "rcs_coating_joint_band_width_m")).toMatchObject({ value: null, missing: true, editable: true });
    expect(session(input).parameters.find(p => p.parameterId === "rcs_coating_damage_kit_net_mixed_l")).toBeDefined();
  });
  it("zero damage or zero cleaner use disables only dependent facts and retains earlier filled values", () => {
    const zero = session({ ...coating, rcs_coating_damage_area_m2: 0 });
    expect(zero.parameters.some(p => p.parameterId === "rcs_coating_damage_kit_net_mixed_l")).toBe(false);
    expect(zero.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_coating_damage_kit_net_mixed_l")).toMatchObject({ value: 2 });
    const noCleaner = session({ ...coating, rcs_coating_damage_cleaner_gross_per_m2: 0 });
    expect(noCleaner.parameters.some(p => p.parameterId === "rcs_coating_damage_cleaner_product_reference")).toBe(false);
    expect(noCleaner.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_coating_damage_cleaner_product_reference")).toMatchObject({ value: coating.rcs_coating_damage_cleaner_product_reference });
    expect(noCleaner.parameters.some(p => p.parameterId === "rcs_coating_damage_kit_net_mixed_l")).toBe(true);
  });
  it("other-party or explicitly not-required programme keeps its reference without inventing executor coating costs", () => {
    for (const mode of [coatingModes.otherParty, coatingModes.notRequired]) {
      const result = session({ ...coating, rcs_coating_mode: mode });
      expect(result.parameters.find(p => p.parameterId === "rcs_coating_program_reference")).toBeDefined();
      expect(result.parameters.some(p => p.parameterId === "rcs_coating_damage_gross_mixed_l_per_m2")).toBe(false);
      expect(result.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_coating_joint_band_width_m")).toMatchObject({ value: 0.4 });
    }
  });
});

describe("actual carrier connection facts through the common publisher/editor", () => {
  const input: Record<string, CanonicalEstimateParameterInputValue> = { ...fixture,
    rcs_carrier_supply_mode: carrierSupplyModes.newSections,
    rcs_carrier_connection_mode: connectionModes.electrofusion, rcs_carrier_connection_program_reference: "TEST actual separate PE internal and end connection programme",
    rcs_carrier_total_end_extension_m: 2, rcs_carrier_physical_supply_section_length_m: 6,
    rcs_carrier_connection_end_tie_in_count: 2, rcs_carrier_connection_internal_allocation_reference: "TEST actual exclusive group allocation",
    rcs_carrier_connection_internal_pipe_wall_thickness_mm: 10, rcs_carrier_connection_internal_coupler_outside_envelope_mm: 190,
    rcs_carrier_connection_internal_couplers_preinstall_unusable_count: 1,
    rcs_carrier_connection_internal_couplers_product_reference: "TEST actual fitting/pipe/pressure/SDR/envelope compatibility",
    rcs_carrier_connection_internal_joining_method_reference: "TEST actual compatible full procedure including cool-down",
    rcs_carrier_connection_internal_joining_crew_h_per_joint: 2,
    rcs_carrier_connection_internal_cleaner_gross_per_joint: 0.25,
    rcs_carrier_connection_ends_couplers_product_reference: "TEST actual distinct end-tie compatible fitting",
  };
  it("makes already supplied original connection facts editable with source guides and correct units; no derived joint/order questions", () => {
    const visible = cards(input);
    for (const [key, value] of Object.entries(input).filter(([key]) => key.startsWith("rcs_carrier_connection_"))) {
      expect(visible.map(c => c.key)).toContain(key);
      expect(visible.find(c => c.key === key)).toMatchObject({ value, missing: false, editable: true });
      expect(visible.find(c => c.key === key)?.guideShortRu).toBeTruthy();
    }
    expect(cards(input).find(c => c.key === "rcs_carrier_connection_internal_joining_crew_h_per_joint")?.unitRu).toBe("чел.-ч/шт.");
    expect(cards(input).find(c => c.key === "rcs_carrier_connection_internal_cleaner_gross_per_joint")?.unitRu).toBe("л/шт.");
    expect(catalog.parameterSchema.some(p => /carrier_connection.*(?:ordered|joint_count|remaining)/u.test(p.parameterId))).toBe(false);
  });
  it("unknown end tie count stays editable while internal actual connection fields remain active", () => {
    const unknown = { ...input }; delete unknown.rcs_carrier_connection_end_tie_in_count;
    expect(cards(unknown).find(c => c.key === "rcs_carrier_connection_end_tie_in_count")).toMatchObject({ value: null, missing: true, editable: true });
    expect(session(unknown).parameters.find(p => p.parameterId === "rcs_carrier_connection_internal_joining_crew_h_per_joint")).toBeDefined();
  });
  it("known connection scope keeps the real coupler passport active with unknown additional unusable units", () => {
    const unknown = { ...input }; delete unknown.rcs_carrier_connection_internal_couplers_preinstall_unusable_count;
    expect(cards(unknown).find(c => c.key === "rcs_carrier_connection_internal_couplers_preinstall_unusable_count")).toMatchObject({ value: null, missing: true, editable: true });
    expect(cards(unknown).find(c => c.key === "rcs_carrier_connection_internal_couplers_product_reference")).toMatchObject({ value: input.rcs_carrier_connection_internal_couplers_product_reference, missing: false, editable: true });
    expect(cards(unknown).find(c => c.key === "rcs_carrier_connection_internal_joining_crew_h_per_joint")).toMatchObject({ value: 2, editable: true });
  });
  it("zero end ties and an explicitly prejoined boundary disable only their dependent facts while preserving values", () => {
    const zero = session({ ...input, rcs_carrier_connection_end_tie_in_count: 0 });
    expect(zero.parameters.some(p => p.parameterId === "rcs_carrier_connection_ends_couplers_product_reference")).toBe(false);
    expect(zero.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_carrier_connection_ends_couplers_product_reference")).toMatchObject({ value: input.rcs_carrier_connection_ends_couplers_product_reference });
    expect(zero.parameters.some(p => p.parameterId === "rcs_carrier_connection_internal_joining_crew_h_per_joint")).toBe(true);
    const prejoined = session({ ...input, rcs_carrier_connection_mode: connectionModes.prejoined });
    expect(prejoined.parameters.find(p => p.parameterId === "rcs_carrier_connection_program_reference")).toBeDefined();
    expect(prejoined.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_carrier_connection_internal_joining_crew_h_per_joint")).toMatchObject({ value: 2 });
  });
});

describe("actual pump deployment and fuel facts through the common editor", () => {
  const water: Record<string, CanonicalEstimateParameterInputValue> = { ...fixture,
    rcs_water_control_mode: waterControlModes.hydraulicRental, rcs_water_control_program_reference: "TEST actual uniform whole hydraulic kit group and discharge programme",
    rcs_water_control_allocation_reference: "TEST exclusively allocated complete kits and whole period",
    rcs_water_control_kit_product_reference: "TEST full actual kit BOM and separate component passports",
    rcs_water_control_working_set_count: 2, rcs_water_control_standby_set_count: 1, rcs_water_control_calendar_hours: 24,
    rcs_water_control_working_duty_fraction: 0.5, rcs_water_control_actual_system_head_m: 12, rcs_water_control_flow_at_actual_head_m3_h: 5,
    rcs_water_control_gross_fuel_l_per_deployed_set_hour: 0.2, rcs_water_control_fuel_product_reference: "TEST fuel compatibility and weighted whole group profile",
    rcs_water_control_kit_discharge_hose_m: 30, rcs_water_control_kit_coupling_count: 6,
    rcs_water_control_operation_all_crew_h_per_calendar_hour: 0.5,
  };
  it("shows known actual water/kit/fuel/whole-group labor facts filled and editable with units and source guides", () => {
    const visible = cards(water);
    for (const [key, value] of Object.entries(water).filter(([key]) => key.startsWith("rcs_water_control_"))) {
      expect(visible.find(c => c.key === key)).toMatchObject({ value, missing: false, editable: true });
      expect(visible.find(c => c.key === key)?.guideShortRu).toBeTruthy();
    }
    expect(visible.find(c => c.key === "rcs_water_control_flow_at_actual_head_m3_h")?.unitRu).toBe("м³/ч");
    expect(visible.find(c => c.key === "rcs_water_control_gross_fuel_l_per_deployed_set_hour")?.unitRu).toBe("л/ч");
    expect(catalog.parameterSchema.some(p => /water_control.*(?:pumped_water|operating_pump_hours|rental_set_hours|fuel_ordered)/u.test(p.parameterId))).toBe(false);
  });
  it("unknown duty stays an editable actual fact, while deployed kit/source facts remain active", () => {
    const input = { ...water }; delete input.rcs_water_control_working_duty_fraction;
    expect(cards(input).find(c => c.key === "rcs_water_control_working_duty_fraction")).toMatchObject({ value: null, missing: true, editable: true });
    expect(cards(input).find(c => c.key === "rcs_water_control_kit_product_reference")).toMatchObject({ value: water.rcs_water_control_kit_product_reference, editable: true });
  });
  it("idle-only zero fuel and explicit no-water-control keep previously supplied inactive facts durable", () => {
    const zero = session({ ...water, rcs_water_control_working_duty_fraction: 0, rcs_water_control_gross_fuel_l_per_deployed_set_hour: 0 });
    expect(zero.parameters.some(p => p.parameterId === "rcs_water_control_fuel_product_reference")).toBe(false);
    expect(zero.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_water_control_fuel_product_reference")).toMatchObject({ value: water.rcs_water_control_fuel_product_reference });
    const none = session({ ...water, rcs_water_control_mode: waterControlModes.notRequired });
    expect(none.parameters.find(p => p.parameterId === "rcs_water_control_program_reference")).toBeDefined();
    expect(none.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_water_control_calendar_hours")).toMatchObject({ value: 24 });
  });
  it("shows actual water receiving allocation filled/editable and retains paid receiver facts when the selected stream becomes zero", () => {
    const receiving = { ...water, rcs_water_receiving_mode: waterReceivingModes.separate, rcs_water_receiving_excluded_water_m3: 8,
      rcs_water_receiving_allocation_reference: "TEST actual quality/classification/route and one receiver of remaining whole stream",
      rcs_water_receiving_receiver_designation: "TEST actual receiving service", rcs_water_receiving_receiver_reference: "TEST actual receiving capacity/quality/unit-account and complete separate service",
      rcs_water_receiving_cost_basis: waterReceivingBasis };
    const visible = cards(receiving);
    for (const [key, value] of Object.entries(receiving).filter(([key]) => key.startsWith("rcs_water_receiving_"))) {
      expect(visible.find(c => c.key === key)).toMatchObject({ value, editable: true, missing: false });
      expect(visible.find(c => c.key === key)?.guideShortRu).toBeTruthy();
    }
    expect(visible.find(c => c.key === "rcs_water_receiving_excluded_water_m3")?.unitRu).toBe("м³");
    const zero = session({ ...receiving, rcs_water_receiving_excluded_water_m3: 120 });
    expect(zero.parameters.some(p => p.parameterId === "rcs_water_receiving_receiver_reference")).toBe(false);
    expect(zero.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_water_receiving_receiver_reference")).toMatchObject({ value: receiving.rcs_water_receiving_receiver_reference });
    expect(catalog.parameterSchema.some(p => /water_receiving.*(?:allocated_water|separate_receiving)/u.test(p.parameterId))).toBe(false);
  });
  const treatment: Record<string, CanonicalEstimateParameterInputValue> = { ...water,
    rcs_water_treatment_waste_mode: waterWasteModes.otherParty, rcs_water_treatment_waste_program_reference: "TEST all actual waste resources provided by separate party",
    rcs_water_treatment_mode: waterTreatmentModes.singleBag, rcs_water_treatment_program_reference: "TEST actual homogeneous once-through common single-bag programme",
    rcs_water_treatment_allocation_reference: "TEST exclusive common kit/full period and separately paid bags/disjoint operators",
    rcs_water_treatment_kit_product_reference: "TEST actual complete kit/service BOM, water/flow/pressure compatibility, filter losses already in pump head",
    rcs_water_treatment_confirmed_max_flow_m3_h: 15, rcs_water_treatment_actual_max_housing_pressure_bar: 2, rcs_water_treatment_rated_max_housing_pressure_bar: 4,
    rcs_water_treatment_kit_service_gasket_count: 10, rcs_water_treatment_kit_service_cleaner_l: 0.2,
    rcs_water_treatment_rental_cost_basis: waterTreatmentRentalBasis, rcs_water_treatment_bag_product_reference: "TEST actual whole-bag capacity before required pressure/condition change",
    rcs_water_treatment_bag_effective_capacity_m3: 50, rcs_water_treatment_bag_actual_preinstall_unusable_count: 1, rcs_water_treatment_bag_compatible_stock_count: 1,
    rcs_water_treatment_bag_retained_reserve_count: 2, rcs_water_treatment_bag_supplier_pack_count: 4, rcs_water_treatment_bag_cost_basis: waterTreatmentBagBasis,
    rcs_water_treatment_bag_cycle_crew_h_per_unit: 0.4, rcs_water_treatment_monitoring_equipment_h_per_unit: 0,
  };
  it("fills actual whole filter and bag programme facts in editable controls with source guidance and physical units", () => {
    const visible = cards(treatment);
    for (const [key, value] of Object.entries(treatment).filter(([key]) => key.startsWith("rcs_water_treatment_"))) {
      expect(visible.find(c => c.key === key)).toMatchObject({ value, editable: true, missing: false });
      expect(visible.find(c => c.key === key)?.guideShortRu).toBeTruthy();
    }
    expect(visible.find(c => c.key === "rcs_water_treatment_bag_effective_capacity_m3")?.unitRu).toBe("м³/шт.");
    expect(visible.find(c => c.key === "rcs_water_treatment_actual_max_housing_pressure_bar")?.unitRu).toBe("бар");
    expect(visible.find(c => c.key === "rcs_water_treatment_monitoring_equipment_h_per_unit")?.unitRu).toBe("маш.-ч/ч");
    expect(catalog.parameterSchema.some(p => /water_treatment.*(?:filtered_water|used_count|ordered_count|rental_set_hours)/u.test(p.parameterId))).toBe(false);
  });
  it("unknown effective bag capacity is an editable local need while known filter compatibility remains filled", () => {
    const input = { ...treatment }; delete input.rcs_water_treatment_bag_effective_capacity_m3;
    const visible = cards(input);
    expect(visible.find(c => c.key === "rcs_water_treatment_bag_effective_capacity_m3")).toMatchObject({ value: null, missing: true, editable: true });
    expect(visible.find(c => c.key === "rcs_water_treatment_confirmed_max_flow_m3_h")).toMatchObject({ value: 15, missing: false, editable: true });
  });
  it("idle zero water retains the deployed common kit while saved bag facts are inactive and durable", () => {
    const idle = session({ ...treatment, rcs_water_control_working_duty_fraction: 0 });
    expect(idle.parameters.find(p => p.parameterId === "rcs_water_treatment_rental_cost_basis")).toMatchObject({ value: waterTreatmentRentalBasis });
    expect(idle.parameters.some(p => p.parameterId === "rcs_water_treatment_bag_effective_capacity_m3")).toBe(false);
    expect(idle.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_water_treatment_bag_effective_capacity_m3")).toMatchObject({ value: 50 });
    const noFilter = session({ ...treatment, rcs_water_treatment_mode: waterTreatmentModes.notRequired });
    expect(noFilter.parameters.find(p => p.parameterId === "rcs_water_treatment_program_reference")).toBeDefined();
    expect(noFilter.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_water_treatment_kit_product_reference")).toMatchObject({ value: treatment.rcs_water_treatment_kit_product_reference });
  });
  it("shows actual waste mass/max-pack/retained-water and full service boundary facts editable, while zero rejects/idle keep inactive values durable", () => {
    const waste = { ...treatment, rcs_water_treatment_waste_mode: waterWasteModes.dedicated,
      rcs_water_treatment_waste_program_reference: "TEST actual compatible wet/dry bag waste party, whole closed one-bag places with certified common upper load plan",
      rcs_water_treatment_waste_allocation_reference: "TEST exclusive full party and retained-water/receiver allocation",
      rcs_water_treatment_waste_container_product_reference: "TEST actual full sealed disposable bag place net/tare/upper shipping certificate",
      rcs_water_treatment_waste_receiver_reference: "TEST actual classification/receiver/route and full accepting service",
      rcs_water_treatment_waste_certified_max_shipping_kg_per_pack: 3.5, rcs_water_treatment_waste_wet_average_net_kg_per_used_bag: 2,
      rcs_water_treatment_waste_dry_average_net_kg_per_preinstall_reject: 0.2, rcs_water_treatment_waste_retained_water_l_per_used_bag: 0.5,
      rcs_water_treatment_waste_trip_cost_basis: waterWasteTripBasis, rcs_water_treatment_waste_receiving_mode: waterWasteReceivingModes.mass,
      rcs_water_treatment_waste_receiving_cost_basis: waterWasteReceivingBasis };
    const visible = cards(waste);
    for (const [key, value] of Object.entries(waste).filter(([key]) => key.startsWith("rcs_water_treatment_waste_"))) {
      expect(visible.find(c => c.key === key)).toMatchObject({ value, editable: true, missing: false });
      expect(visible.find(c => c.key === key)?.guideShortRu).toBeTruthy();
    }
    expect(visible.find(c => c.key === "rcs_water_treatment_waste_retained_water_l_per_used_bag")?.unitRu).toBe("л/шт.");
    const noReject = session({ ...waste, rcs_water_treatment_bag_actual_preinstall_unusable_count: 0 });
    expect(noReject.parameters.some(p => p.parameterId === "rcs_water_treatment_waste_dry_average_net_kg_per_preinstall_reject")).toBe(false);
    expect(noReject.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_water_treatment_waste_dry_average_net_kg_per_preinstall_reject")).toMatchObject({ value: 0.2 });
    const idle = session({ ...waste, rcs_water_control_working_duty_fraction: 0 });
    expect(idle.parameters.some(p => p.parameterId === "rcs_water_treatment_waste_receiver_reference")).toBe(false);
    expect(idle.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_water_treatment_waste_receiver_reference")).toMatchObject({ value: waste.rcs_water_treatment_waste_receiver_reference });
  });
  it("shows original equipment delivery/return route and complete-unit capacity facts editable without asking for derived trips or equipment counts", () => {
    const equipment = { ...treatment,
      rcs_equipment_mobilization_water_pump_kits_inbound_mode: equipmentMobilizationModes.separate,
      rcs_equipment_mobilization_water_pump_kits_inbound_allocation_reference: "TEST full actual exclusive original complete kits and this inbound direction only, no other cargos/return/setup charge",
      rcs_equipment_mobilization_water_pump_kits_inbound_condition_and_load_reference: "TEST actual full kit/parts/packing/condition/route/wholeunit certified loading/handling plan",
      rcs_equipment_mobilization_water_pump_kits_inbound_vehicle_designation: "TEST actual compatible full transport/handling service",
      rcs_equipment_mobilization_water_pump_kits_inbound_shipping_kg_per_complete_unit: 200,
      rcs_equipment_mobilization_water_pump_kits_inbound_route_payload_kg: 500,
      rcs_equipment_mobilization_water_pump_kits_inbound_max_complete_units_per_trip: 3,
      rcs_equipment_mobilization_water_pump_kits_inbound_cost_basis: basis,
      rcs_equipment_mobilization_water_filter_kit_return_mode: equipmentMobilizationModes.separate,
      rcs_equipment_mobilization_water_filter_kit_return_allocation_reference: "TEST original one common filter return after removal, actual different drained condition, exclusively bounded full separate trip",
      rcs_equipment_mobilization_water_filter_kit_return_condition_and_load_reference: "TEST actual full filter parts/packing/drain/return route and load plan",
      rcs_equipment_mobilization_water_filter_kit_return_shipping_kg_per_complete_unit: 80,
    };
    const visible = cards(equipment);
    for (const [key, value] of Object.entries(equipment).filter(([key]) => key.startsWith("rcs_equipment_mobilization_"))) {
      expect(visible.find(c => c.key === key)).toMatchObject({ value, editable: true, missing: false });
      expect(visible.find(c => c.key === key)?.guideShortRu).toBeTruthy();
    }
    expect(visible.find(c => c.key === "rcs_equipment_mobilization_water_pump_kits_inbound_shipping_kg_per_complete_unit")?.unitRu).toBe("кг/шт.");
    expect(catalog.parameterSchema.some(p => /equipment_mobilization.*(?:trip_count|complete_unit_count|shipping_mass)/u.test(p.parameterId))).toBe(false);
    const noFilter = session({ ...equipment, rcs_water_treatment_mode: waterTreatmentModes.notRequired });
    expect(noFilter.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_equipment_mobilization_water_filter_kit_return_shipping_kg_per_complete_unit")).toMatchObject({ value: 80 });
    const onSite = session({ ...equipment, rcs_equipment_mobilization_water_pump_kits_inbound_mode: equipmentMobilizationModes.noMovement });
    expect(onSite.parameters.find(p => p.parameterId === "rcs_equipment_mobilization_water_pump_kits_inbound_allocation_reference")).toBeDefined();
    expect(onSite.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_equipment_mobilization_water_pump_kits_inbound_shipping_kg_per_complete_unit")).toMatchObject({ value: 200 });
  });
});

describe("actual casing-preparation material program through shared parameter semantics", () => {
  const material: Record<string, CanonicalEstimateParameterInputValue> = { ...fixture,
    rcs_casing_prep_material_mode: casingPrepModes.abrasive, rcs_casing_prep_material_program_reference: "TEST actual compatible preparation/discard program",
    rcs_casing_prep_material_cleaner_gross_per_installed_section: 0.2, rcs_casing_prep_material_cleaner_product_designation: "TEST actual compatible cleaner",
    rcs_casing_prep_material_cleaner_product_reference: "TEST actual cleaner/material/tool compatibility and preparation method",
    rcs_casing_prep_material_cleaner_compatible_stock: 0.1, rcs_casing_prep_material_cleaner_retained_reserve: 0.2,
    rcs_casing_prep_material_cleaner_supplier_pack_net: 0.5, rcs_casing_prep_material_cleaner_cost_basis: casingPrepBasis,
  };
  it("keeps real program/product/rate/stock facts filled and editable, using litres per physical unit", () => {
    for (const [key, value] of Object.entries(material).filter(([key]) => key.startsWith("rcs_casing_prep_material_"))) {
      expect(cards(material).find(c => c.key === key)).toMatchObject({ value, editable: true, missing: false });
      expect(cards(material).find(c => c.key === key)?.guideShortRu).toBeTruthy();
    }
    expect(cards(material).find(c => c.key === "rcs_casing_prep_material_cleaner_gross_per_installed_section")?.unitRu).toBe("л/шт.");
    expect(catalog.parameterSchema.some(p => /casing_prep_material.*(?:ordered|consumed)/u.test(p.parameterId))).toBe(false);
  });
  it("retains a missing original gross consumption as one editable fact rather than deriving it from supplier packaging", () => {
    const input = { ...material }; delete input.rcs_casing_prep_material_cleaner_gross_per_installed_section;
    expect(cards(input).find(c => c.key === "rcs_casing_prep_material_cleaner_gross_per_installed_section")).toMatchObject({ value: null, missing: true, editable: true });
  });
  it("zero use and explicit other-party scope keep inactive prior values without new supply questions", () => {
    const zero = session({ ...material, rcs_casing_prep_material_cleaner_gross_per_installed_section: 0 });
    expect(zero.parameters.some(p => p.parameterId === "rcs_casing_prep_material_cleaner_supplier_pack_net")).toBe(false);
    expect(zero.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_casing_prep_material_cleaner_supplier_pack_net")).toMatchObject({ value: 0.5 });
    const other = session({ ...material, rcs_casing_prep_material_mode: casingPrepModes.otherParty });
    expect(other.parameters.find(p => p.parameterId === "rcs_casing_prep_material_program_reference")).toBeDefined();
    expect(other.parameters.some(p => p.parameterId === "rcs_casing_prep_material_cleaner_gross_per_installed_section")).toBe(false);
  });
});

describe("actual jacking loading boundaries and editable equipment facts", () => {
  const loading: Record<string, CanonicalEstimateParameterInputValue> = { ...fixture, rcs_civil_installation_method: methods.pipeJacking,
    rcs_jacking_section_loading_cost_mode: loadingModes.separate, rcs_jacking_section_loading_allocation_reference: "TEST loading excluded from advance rates, no double charge",
    rcs_mechanical_casing_jacking_loading_method_reference: "TEST actual compatible rigging/crane radius/mass and guide plan",
    rcs_mechanical_casing_jacking_loading_equipment_designation: "TEST actual compatible lifting equipment", rcs_mechanical_casing_jacking_loading_equipment_h_per_unit: 0.2,
  };
  it("shows actual separate-loading facts filled and editable, without asking derived section counts", () => {
    for (const [key, value] of Object.entries(loading).filter(([key]) => key.startsWith("rcs_jacking_section_loading_") || key.startsWith("rcs_mechanical_casing_jacking_loading_"))) {
      expect(cards(loading).find(c => c.key === key)).toMatchObject({ value, editable: true, missing: false });
    }
    expect(cards(loading).find(c => c.key === "rcs_mechanical_casing_jacking_loading_equipment_h_per_unit")?.unitRu).toBe("маш.-ч/шт.");
    expect(catalog.parameterSchema.some(p => /jacking_loading.*(?:scope_section_count|installed_section_count)/u.test(p.parameterId))).toBe(false);
  });
  it("included loading preserves its equipment/rate values inactive and keeps the actual disjoint allocation reference", () => {
    const included = session({ ...loading, rcs_jacking_section_loading_cost_mode: loadingModes.included });
    expect(included.parameters.find(p => p.parameterId === "rcs_jacking_section_loading_allocation_reference")).toBeDefined();
    expect(included.parameters.some(p => p.parameterId === "rcs_mechanical_casing_jacking_loading_equipment_h_per_unit")).toBe(false);
    expect(included.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_mechanical_casing_jacking_loading_equipment_h_per_unit")).toMatchObject({ value: 0.2 });
    const open = session({ ...loading, rcs_civil_installation_method: methods.openCut });
    expect(open.parameters.some(p => p.parameterId === "rcs_jacking_section_loading_cost_mode")).toBe(false);
  });
});

describe("actual compaction-water facts through the same publisher/editor", () => {
  const water: Record<string, CanonicalEstimateParameterInputValue> = { ...fixture,
    rcs_civil_installation_method: methods.openCut, rcs_open_cut_excavation_width_m: 1.5, rcs_open_cut_full_width_bedding_thickness_m: 0.1,
    rcs_compaction_water_bedding_gross_l_per_finished_m3: 80, rcs_compaction_water_bedding_supply_mode: compactionWaterModes.separate,
    rcs_compaction_water_bedding_allocation_reference: "TEST actual exclusive allocation", rcs_compaction_water_bedding_product_designation: "TEST compatible water",
    rcs_compaction_water_bedding_compatibility_reference: "TEST quality and actual gross addition", rcs_compaction_water_bedding_compatible_stock_m3: 0.1,
    rcs_compaction_water_bedding_retained_reserve_m3: 0.08, rcs_compaction_water_bedding_supplier_multiple_m3: 0.25,
    rcs_compaction_water_bedding_cost_basis: compactionWaterBasis,
  };
  it("shows known gross addition and exclusive water/source/supply facts filled and editable with proper units", () => {
    for (const [key, value] of Object.entries(water).filter(([key]) => key.startsWith("rcs_compaction_water_"))) {
      expect(cards(water).find(c => c.key === key)).toMatchObject({ value, editable: true, missing: false });
      expect(cards(water).find(c => c.key === key)?.guideShortRu).toBeTruthy();
    }
    expect(cards(water).find(c => c.key === "rcs_compaction_water_bedding_gross_l_per_finished_m3")?.unitRu).toBe("л/м³");
    expect(catalog.parameterSchema.some(p => /compaction_water.*(?:consumed_m3|ordered_m3|trip_count)/u.test(p.parameterId))).toBe(false);
  });
  it("missing added-water rate is editable and stays missing instead of a hidden zero", () => {
    const input = { ...water }; delete input.rcs_compaction_water_bedding_gross_l_per_finished_m3;
    expect(cards(input).find(c => c.key === "rcs_compaction_water_bedding_gross_l_per_finished_m3")).toMatchObject({ value: null, missing: true, editable: true });
  });
  it("explicit zero disables all dependent water/supply/freight facts, retaining values for later reactivation", () => {
    const zero = session({ ...water, rcs_compaction_water_bedding_gross_l_per_finished_m3: 0 });
    expect(zero.parameters.find(p => p.parameterId === "rcs_compaction_water_bedding_gross_l_per_finished_m3")).toBeDefined();
    expect(zero.parameters.some(p => p.parameterId === "rcs_compaction_water_bedding_supply_mode")).toBe(false);
    expect(zero.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_compaction_water_bedding_supplier_multiple_m3")).toMatchObject({ value: 0.25 });
    const other = session({ ...water, rcs_compaction_water_bedding_supply_mode: compactionWaterModes.otherParty });
    expect(other.parameters.find(p => p.parameterId === "rcs_compaction_water_bedding_compatibility_reference")).toBeDefined();
    expect(other.parameters.some(p => p.parameterId === "rcs_compaction_water_bedding_supplier_multiple_m3")).toBe(false);
  });
});

describe("actual survey program and resources through the common editor", () => {
  const preparation: Record<string, CanonicalEstimateParameterInputValue> = { ...fixture,
    rcs_preparation_mode: preparationModes.straightAxis, rcs_preparation_program_reference: "TEST actual survey/control/maintenance/removal program",
    rcs_preparation_axis_marker_pitch_m: 10, rcs_preparation_additional_marker_count: 2, rcs_preparation_marker_replacement_count: 3,
    rcs_preparation_initial_method_reference: "TEST actual initial survey/installation method",
    rcs_preparation_initial_crew_designation: "TEST all actual survey crew", rcs_preparation_initial_crew_h_per_marker: 0.4,
    rcs_preparation_replacement_method_reference: "TEST replacement includes removal of damaged marker",
    rcs_preparation_replacement_crew_h_per_marker: 0.6,
    rcs_preparation_paint_gross_kg_per_marker: 0.02, rcs_preparation_paint_product_designation: "TEST actual compatible paint",
    rcs_preparation_paint_product_reference: "TEST actual paint and process consumption", rcs_preparation_paint_compatible_stock: 0.1,
    rcs_preparation_paint_retained_reserve: 0.05, rcs_preparation_paint_supplier_pack_net: 0.1, rcs_preparation_paint_cost_basis: preparationBasis,
  };
  it("keeps filled actual layout, material and program facts editable with guides and original units", () => {
    for (const [key, value] of Object.entries(preparation).filter(([key]) => key.startsWith("rcs_preparation_"))) {
      expect(cards(preparation).find(c => c.key === key)).toMatchObject({ value, editable: true, missing: false });
      expect(cards(preparation).find(c => c.key === key)?.guideShortRu).toBeTruthy();
    }
    expect(cards(preparation).find(c => c.key === "rcs_preparation_paint_gross_kg_per_marker")?.unitRu).toBe("кг/шт.");
    expect(catalog.parameterSchema.some(p => /(?:axis_marker_count|initial_marker_count|marker_installation_events)/u.test(p.parameterId))).toBe(false);
  });
  it("unknown pitch remains an editable missing original fact, with no derived marker-count question", () => {
    const input = { ...preparation }; delete input.rcs_preparation_axis_marker_pitch_m;
    expect(cards(input).find(c => c.key === "rcs_preparation_axis_marker_pitch_m")).toMatchObject({ value: null, missing: true, editable: true });
    expect(session(input, ["rcs_preparation_axis_marker_pitch_m"]).blockingMissingParameterIds).toContain("rcs_preparation_axis_marker_pitch_m");
  });
  it("zero replacements and other-party programs hide only inactive facts and retain them for switching back", () => {
    const zero = session({ ...preparation, rcs_preparation_marker_replacement_count: 0 });
    expect(zero.parameters.some(p => p.parameterId === "rcs_preparation_replacement_crew_h_per_marker")).toBe(false);
    expect(zero.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_preparation_replacement_crew_h_per_marker")).toMatchObject({ value: 0.6 });
    expect(zero.parameters.find(p => p.parameterId === "rcs_preparation_initial_crew_h_per_marker")).toBeDefined();
    const other = session({ ...preparation, rcs_preparation_mode: preparationModes.otherParty });
    expect(other.parameters.find(p => p.parameterId === "rcs_preparation_program_reference")).toBeDefined();
    expect(other.parameters.some(p => p.parameterId === "rcs_preparation_paint_gross_kg_per_marker")).toBe(false);
    expect(other.inactiveConditionalParameters?.find(p => p.parameterId === "rcs_preparation_paint_gross_kg_per_marker")).toMatchObject({ value: 0.02 });
  });
});

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
