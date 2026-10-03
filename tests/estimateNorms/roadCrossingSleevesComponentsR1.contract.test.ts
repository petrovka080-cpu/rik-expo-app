import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { buildRoadCrossingSleevesComponentsR1, ROAD_CROSSING_SLEEVES_COMPONENT_PARAMETERS_R1 as parameters,
  ROAD_CROSSING_SLEEVES_CIVIL_EXECUTION_COST_BASES_R1 as executionBases,
  ROAD_CROSSING_SLEEVES_MECHANICAL_COST_BASES_R1 as mechanicalBases,
  ROAD_CROSSING_SLEEVES_FREIGHT_MODES_R1 as freightModes,
  ROAD_CROSSING_SLEEVES_FREIGHT_COST_BASIS_R1 as freightBasis,
  ROAD_CROSSING_SLEEVES_SOIL_MODES_R1 as soilModes, ROAD_CROSSING_SLEEVES_SOIL_REUSE_ORIGINS_R1 as soilOrigins,
  ROAD_CROSSING_SLEEVES_SOIL_DESTINATIONS_R1 as soilDestinations, ROAD_CROSSING_SLEEVES_SOIL_RECEIVING_MODES_R1 as receivingModes,
  ROAD_CROSSING_SLEEVES_SOIL_RECEIVING_COST_BASIS_R1 as receivingBasis,
  ROAD_CROSSING_SLEEVES_INSPECTION_MODES_R1 as inspectionModes, ROAD_CROSSING_SLEEVES_INSPECTION_COUPLANT_COST_BASIS_R1 as couplantBasis,
  ROAD_CROSSING_SLEEVES_PREPARATION_MODES_R1 as preparationModes, ROAD_CROSSING_SLEEVES_PREPARATION_MATERIAL_COST_BASIS_R1 as preparationBasis,
  ROAD_CROSSING_SLEEVES_COMPACTION_WATER_MODES_R1 as compactionWaterModes, ROAD_CROSSING_SLEEVES_COMPACTION_WATER_COST_BASIS_R1 as compactionWaterBasis,
  ROAD_CROSSING_SLEEVES_JACKING_LOADING_MODES_R1 as loadingModes,
  ROAD_CROSSING_SLEEVES_CASING_PREP_MATERIAL_MODES_R1 as casingPrepModes, ROAD_CROSSING_SLEEVES_CASING_PREP_MATERIAL_COST_BASIS_R1 as casingPrepBasis,
  ROAD_CROSSING_SLEEVES_COATING_MODES_R1 as coatingModes, ROAD_CROSSING_SLEEVES_COATING_KIT_COST_BASIS_R1 as coatingKitBasis,
  ROAD_CROSSING_SLEEVES_COATING_CONSUMABLE_COST_BASIS_R1 as coatingConsumableBasis,
  ROAD_CROSSING_SLEEVES_CARRIER_CONNECTION_MODES_R1 as connectionModes, ROAD_CROSSING_SLEEVES_CARRIER_CONNECTION_MATERIAL_COST_BASIS_R1 as connectionBasis,
  ROAD_CROSSING_SLEEVES_WATER_CONTROL_MODES_R1 as waterControlModes, ROAD_CROSSING_SLEEVES_WATER_CONTROL_RENTAL_BASIS_R1 as waterControlRentalBasis,
  ROAD_CROSSING_SLEEVES_WATER_CONTROL_FUEL_BASIS_R1 as waterControlFuelBasis,
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
import { ROAD_CROSSING_SLEEVES_CARRIER_SUPPLY_MODES_R1 as carrierModes, ROAD_CROSSING_SLEEVES_CARRIER_COST_BASIS_R1 as carrierBasis } from "../../src/lib/estimate/v4/roadCrossingSleevesCasingMaterialR1";
import { ROAD_CROSSING_SLEEVES_CIVIL_METHODS_R1 as methods } from "../../src/lib/estimate/v4/roadCrossingSleevesCivilGeometryR1";
import { ROAD_CROSSING_SLEEVES_SHORING_MODES_R1 as shoringModes, ROAD_CROSSING_SLEEVES_SHORING_RENTAL_BASIS_R1 as shoringRentalBasis,
  ROAD_CROSSING_SLEEVES_SHORING_WORK_BASES_R1 as shoringWorkBases } from "../../src/lib/estimate/v4/roadCrossingSleevesShoringR1";
import { ROAD_CROSSING_SLEEVES_SHORING_CONSUMABLE_MODES_R1 as shoringMaterialModes, ROAD_CROSSING_SLEEVES_SHORING_CONSUMABLE_BASIS_R1 as shoringMaterialBasis } from "../../src/lib/estimate/v4/roadCrossingSleevesShoringConsumablesR1";
import { ROAD_CROSSING_SLEEVES_SHORING_GAP_MODES_R1 as gapModes, ROAD_CROSSING_SLEEVES_SHORING_GAP_SUPPLY_MODES_R1 as gapSupplyModes,
  ROAD_CROSSING_SLEEVES_SHORING_GAP_WORK_MODES_R1 as gapWorkModes, ROAD_CROSSING_SLEEVES_SHORING_GAP_BASES_R1 as gapBases } from "../../src/lib/estimate/v4/roadCrossingSleevesShoringGapFillR1";
import { ROAD_CROSSING_SLEEVES_REACTION_MODES_R1 as reactionModes, ROAD_CROSSING_SLEEVES_REACTION_RENTAL_BASIS_R1 as reactionRentalBasis,
  ROAD_CROSSING_SLEEVES_REACTION_WORK_BASES_R1 as reactionWorkBases } from "../../src/lib/estimate/v4/roadCrossingSleevesReactionR1";
import { ROAD_CROSSING_SLEEVES_SERVICE_WASTE_MODES_R1 as serviceWasteModes, ROAD_CROSSING_SLEEVES_SERVICE_WASTE_TRIP_BASIS_R1 as serviceWasteTripBasis,
  ROAD_CROSSING_SLEEVES_SERVICE_WASTE_RECEIVING_MODES_R1 as serviceWasteReceivingModes, ROAD_CROSSING_SLEEVES_SERVICE_WASTE_RECEIVING_BASIS_R1 as serviceWasteReceivingBasis } from "../../src/lib/estimate/v4/roadCrossingSleevesServiceWasteR1";
import { ROAD_CROSSING_SLEEVES_JOINT_RESOURCE_PARAMETERS_R1 as jointParameters, ROAD_CROSSING_SLEEVES_JOINT_COST_BASES_R1 as bases } from "../../src/lib/estimate/v4/roadCrossingSleevesJointResourcesR1";
import { ROAD_CROSSING_SLEEVES_PIT_FILL_MODES_R1 as fillModes,
  ROAD_CROSSING_SLEEVES_TRENCH_FILL_MODES_R1 as trenchModes } from "../../src/lib/estimate/v4/roadCrossingSleevesPitFillMaterialR1";
import { ROAD_CROSSING_SLEEVES_INTERNAL_FILL_MODES_R1 as internalModes,
  ROAD_CROSSING_SLEEVES_INTERNAL_WATER_MODES_R1 as waterModes, ROAD_CROSSING_SLEEVES_INTERNAL_WATER_COST_BASIS_R1 as waterBasis } from "../../src/lib/estimate/v4/roadCrossingSleevesInternalFillR1";
import { evaluateInclusionGraph } from "../../src/lib/estimate/backendPlatform/inclusionGraph";
import { aiEstimateRuUnitForParameter } from "../../src/lib/estimate/aiEstimateRuParameterDictionary";

const components = buildRoadCrossingSleevesComponentsR1({ source_title: "Owned integration fixture for source-bounded components, not a full crossing",
  source_document_version: "test-2026-10-03", definition_hash: "a".repeat(64), artifact_sha256: "a".repeat(64),
  exact_locator: "data/estimate-benchmarks/source-packs/road-crossing-sleeves-automatic-s27-28.json" });
const definition = components.definition;
// Synthetic actual-fact/price fixtures ONLY, never a published default or WPS approval.
const fixture: Record<string, unknown> = {
  ...Object.fromEntries(["thrust", "reception"].flatMap(key => [
    [`rcs_shoring_gap_${key}_mode`, gapModes.other],
    [`rcs_shoring_gap_${key}_program_and_allocation_reference`, "TEST actual other contact/fill/seal resources separately allocated and excluded from paid shoring installation, excavation and final fill; permanent original occupied volume includes retained preplaced fill once"],
  ])),
  ...Object.fromEntries(["trench", "thrust", "reception", "reaction"].flatMap(key => [
    [`rcs_service_waste_${key}_mode`, serviceWasteModes.otherParty],
    [`rcs_service_waste_${key}_program_reference`, "TEST actual entire service waste collection/packaging/handling/receiving by other party without executor cost, no hidden zero waste or duplicate service"],
  ])),
  rcs_reaction_mode: reactionModes.otherParty, rcs_reaction_allocation_reference: "TEST actual entire separate reaction arrangement supplied by another party and excluded from all paid jacking/excavation/fill/other packages",
  ...Object.fromEntries(parameters.filter(parameter => parameter.id.startsWith("rcs_shoring_material_") && /(?:_gross_per_|_program_and_compatibility_reference$)/u.test(parameter.id)).map(parameter => [parameter.id,
    parameter.id.endsWith("_reference") ? "TEST actual complete programme confirms no separate gross consumption of this material in any stage; explicit zeros, not a product default" : 0])),
  ...Object.fromEntries(["trench", "thrust", "reception"].flatMap(key => [
    [`rcs_shoring_${key}_mode`, shoringModes.otherParty],
    [`rcs_shoring_${key}_program_reference`, "TEST actual applicable complete shoring resources supplied separately, no executor charge"],
  ])),
  ...Object.fromEntries(parameters.filter(parameter => parameter.id.startsWith("rcs_equipment_mobilization_") && /(?:_mode|_allocation_reference)$/u.test(parameter.id)).map(parameter => [parameter.id,
    parameter.id.endsWith("_mode") ? equipmentMobilizationModes.otherParty : "TEST actual entire equipment direction provided by separate party with complete allocation/source, no executor cost or duplicate trip"])),
  rcs_water_control_mode: waterControlModes.otherParty, rcs_water_control_program_reference: "TEST actual separate party supplies all water control resources, no executor charge",
  rcs_carrier_connection_mode: connectionModes.otherParty, rcs_carrier_connection_program_reference: "TEST actual compatible carrier connections by another party, no duplicate executor charge",
  rcs_coating_mode: coatingModes.otherParty, rcs_coating_program_reference: "TEST actual compatible field coating resources provided by other party, no executor charge",
  rcs_casing_prep_material_mode: casingPrepModes.otherParty, rcs_casing_prep_material_program_reference: "TEST actual compatible preparation consumables provided by other party, no executor purchase",
  rcs_jacking_section_loading_cost_mode: loadingModes.included, rcs_jacking_section_loading_allocation_reference: "TEST whole section loading is included once in actual advance rates, disjoint from excavation and other mechanical work",
  // Explicit synthetic project evidence of no added compaction water; never a default.
  rcs_compaction_water_bedding_gross_l_per_finished_m3: 0, rcs_compaction_water_pits_gross_l_per_finished_m3: 0, rcs_compaction_water_trench_gross_l_per_finished_m3: 0,
  rcs_preparation_mode: preparationModes.otherParty, rcs_preparation_program_reference: "TEST actual staking/maintenance/removal provided by other party, no executor charge",
  rcs_inspection_mode: inspectionModes.otherParty, rcs_inspection_program_reference: "TEST actual separate inspector supplies its own resources, no executor charge",
  rcs_soil_trench_scope: soilModes.other, rcs_soil_jacking_scope: soilModes.other,
  ...Object.fromEntries(parameters.filter(parameter => parameter.id.startsWith("rcs_freight_")
    && /(?:_mode|_allocation_reference|_offsite_stock_units)$/u.test(parameter.id)).map(parameter => [parameter.id,
      parameter.id.endsWith("_mode") ? freightModes.otherParty : parameter.id.endsWith("_allocation_reference")
        ? "TEST actual separate supplier delivery included elsewhere, no second freight payment" : 0])),
  ...Object.fromEntries(["casing_preparation", "casing_lowering", "supports", "carrier_insertion", "end_seals"].flatMap(key => Object.entries({
    method_reference: "TEST agreed disjoint installation scope and compatible equipment/access/load plan",
    crew_designation: "TEST all operation personnel including operators", crew_h_per_unit: 1, crew_cost_basis: mechanicalBases.crew,
    equipment_designation: "TEST compatible operation equipment with energy", equipment_h_per_unit: 0.25, equipment_cost_basis: mechanicalBases.equipment,
  }).map(([suffix, value]) => [`rcs_mechanical_${key}_${suffix}`, value]))),
  rcs_carrier_supply_mode: carrierModes.customerSupplied, rcs_carrier_product_designation: "TEST actual compatible carrier and connection specification",
  rcs_carrier_total_end_extension_m: 0,
  ...Object.fromEntries(["bedding", "pits", "trench", "internal"].flatMap(key => Object.entries({
    method_reference: "TEST selected placing/compaction method; synthetic rates only",
    crew_designation: "TEST all placing crew including operators", crew_h_per_finished_m3: 0.6, crew_cost_basis: executionBases.crew,
    equipment_designation: "TEST selected placing/compaction equipment with energy", equipment_h_per_finished_m3: 0.2, equipment_cost_basis: executionBases.equipment,
  }).map(([suffix, value]) => [`rcs_fill_${key}_${suffix}`, value]))),
  rcs_crossing_length_m: 35, rcs_casing_outside_diameter_mm: 530, rcs_casing_inside_diameter_mm: 510,
  rcs_carrier_outside_diameter_mm: 160, rcs_planned_physical_section_length_m: 12,
  rcs_compatible_stock_section_count: 0, rcs_retained_spare_section_count: 1, rcs_supplier_bundle_section_count: 2,
  rcs_steel_density_kg_m3: 7850, rcs_raci_approved_ring_pitch_m: 2.5, rcs_raci_selected_elements_per_ring: 4,
  rcs_maximum_joint_envelope_diameter_mm: 200, rcs_raci_selected_element_height_mm: 100,
  rcs_casing_product_designation: "TEST-OWNED compatible casing with 12m sections",
  rcs_raci_element_designation: "TEST-OWNED RACI element", rcs_element_technological_loss_count: 2,
  rcs_element_retained_spare_count: 4, rcs_element_compatible_stock_count: 10, rcs_element_supplier_pack_count: 10,
  rcs_end_seal_kit_designation: "TEST-OWNED kit with included straps", rcs_end_seal_technological_loss_count: 0,
  rcs_end_seal_retained_spare_count: 1, rcs_end_seal_compatible_stock_count: 1, rcs_end_seal_supplier_pack_count: 2,
  rcs_contact_tape_designation: "TEST-OWNED compatible full-width tape", rcs_raci_ring_width_mm: 40, rcs_contact_tape_width_mm: 50,
  rcs_tape_provided_m_per_element_pack: 1, rcs_tape_technological_loss_m: 0.25,
  rcs_tape_retained_spare_m: 1, rcs_tape_compatible_stock_m: 0.5, rcs_tape_supplier_roll_length_m: 5,
  rcs_civil_installation_method: methods.openCut, rcs_open_cut_excavation_width_m: 1.5,
  rcs_open_cut_excavation_depth_m: 2, rcs_open_cut_full_width_bedding_thickness_m: 0.1,
  rcs_bedding_granular_product_designation: "TEST-OWNED compatible granular material", rcs_bedding_gross_supplied_volume_ratio: 1.2,
  rcs_bedding_compatible_loose_stock_m3: 1, rcs_bedding_retained_loose_reserve_m3: 0.5, rcs_bedding_supplier_loose_multiple_m3: 2,
  rcs_jacking_thrust_excavation_length_m: 6, rcs_jacking_thrust_excavation_width_m: 4, rcs_jacking_thrust_excavation_depth_m: 3,
  rcs_jacking_reception_excavation_length_m: 4, rcs_jacking_reception_excavation_width_m: 3, rcs_jacking_reception_excavation_depth_m: 2.5,
  rcs_jacking_confirmed_excavation_diameter_mm: 580,
  rcs_jacking_thrust_permanent_occupied_volume_m3: 12, rcs_jacking_reception_permanent_occupied_volume_m3: 7,
  rcs_pit_fill_material_mode: fillModes.other,
  rcs_trench_fill_material_mode: trenchModes.other,
  rcs_internal_fill_mode: internalModes.none,
  rcs_internal_fill_water_supply_mode: waterModes.customerSupplied,
  rcs_joint_wps_reference: "TEST-OWNED applicable MMA WPS", rcs_joint_welding_process: bases.process,
  rcs_joint_electrode_designation: "TEST-OWNED compatible electrode", rcs_joint_gross_electrode_kg_per_joint: 2,
  rcs_joint_electrode_retained_spare_kg: 1, rcs_joint_electrode_compatible_stock_kg: 0.5, rcs_joint_electrode_supplier_pack_kg: 2.5,
  rcs_joint_crew_designation: "TEST-OWNED all joint crew", rcs_joint_total_crew_person_hours_per_joint: 3,
  rcs_joint_crew_cost_basis: bases.labor, rcs_joint_equipment_designation: "TEST-OWNED welding equipment",
  rcs_joint_equipment_hours_per_joint: 4, rcs_joint_equipment_cost_basis: bases.equipment,
  rcs_civil_open_cut_method_reference: "TEST selected excavation technology, synthetic rates only",
  rcs_civil_open_cut_crew_designation: "TEST whole excavation crew including operators", rcs_civil_open_cut_crew_h_per_unit: 0.5,
  rcs_civil_open_cut_crew_cost_basis: executionBases.crew, rcs_civil_open_cut_equipment_designation: "TEST selected excavator with energy",
  rcs_civil_open_cut_equipment_h_per_unit: 0.2, rcs_civil_open_cut_equipment_cost_basis: executionBases.equipment,
  rcs_civil_jacking_pits_method_reference: "TEST selected pit excavation technology, synthetic rates only",
  rcs_civil_jacking_pits_crew_designation: "TEST whole pit crew including operators", rcs_civil_jacking_pits_crew_h_per_unit: 0.4,
  rcs_civil_jacking_pits_crew_cost_basis: executionBases.crew, rcs_civil_jacking_pits_equipment_designation: "TEST pit excavator with energy",
  rcs_civil_jacking_pits_equipment_h_per_unit: 0.1, rcs_civil_jacking_pits_equipment_cost_basis: executionBases.equipment,
  rcs_civil_jacking_advance_method_reference: "TEST selected jacking technology, synthetic rates only",
  rcs_civil_jacking_advance_crew_designation: "TEST whole advance crew including operators", rcs_civil_jacking_advance_crew_h_per_unit: 2,
  rcs_civil_jacking_advance_crew_cost_basis: executionBases.crew, rcs_civil_jacking_advance_equipment_designation: "TEST jacking system with excavation and energy",
  rcs_civil_jacking_advance_equipment_h_per_unit: 1.5, rcs_civil_jacking_advance_equipment_cost_basis: executionBases.equipment,
};
const owners = ["rcs:casing:ordered_casing_length_m", "rcs:raci-elements:ordered", "rcs:end-seal-kits:ordered", "rcs:contact-tape:ordered",
  "rcs:joint:electrode_ordered", "rcs:joint:crew_person_hours", "rcs:joint:equipment_hours"];
const beddingOwner = "rcs:bedding:ordered_loose_m3";
const executionOwners = (method: string) => (method === methods.openCut ? ["open_cut"] : ["jacking_pits", "jacking_advance"])
  .flatMap(key => [`rcs:civil-execution:${key}:crew_hours`, `rcs:civil-execution:${key}:equipment_hours`]);
const fillExecutionOwners = (key: string) => [`rcs:fill-execution:${key}:crew_hours`, `rcs:fill-execution:${key}:equipment_hours`];
const mechanicalOwners = (method?: string) => ["casing_preparation", ...(method === methods.openCut ? ["casing_lowering"] : []), "supports", "carrier_insertion", "end_seals"]
  .flatMap(key => [`rcs:mechanical:${key}:crew_hours`, `rcs:mechanical:${key}:equipment_hours`]);
const applicableOwners = (method: string) => [...owners, ...(method === methods.openCut ? [beddingOwner] : []), ...executionOwners(method),
  ...(method === methods.openCut ? fillExecutionOwners("bedding") : []), ...mechanicalOwners(method)];
const selectedTrench: Record<string, unknown> = { ...fixture, rcs_trench_fill_material_mode: trenchModes.sameGranular,
  rcs_trench_fill_granular_product_designation: "TEST actual trench product", rcs_trench_fill_other_permanent_occupied_volume_m3: 2,
  rcs_trench_fill_approved_reused_finished_m3: 20, rcs_trench_fill_gross_supplied_volume_ratio: 1.2,
  rcs_trench_fill_compatible_loose_stock_m3: 10, rcs_trench_fill_retained_loose_reserve_m3: 2, rcs_trench_fill_supplier_loose_multiple_m3: 5 };
const selectedInternal: Record<string, unknown> = { ...fixture, rcs_internal_fill_mode: internalModes.dryGrout, rcs_internal_fill_permanent_occupied_m3: 0.1,
  rcs_internal_fill_dry_product_designation: "TEST selected internal dry grout", rcs_internal_fill_gross_dry_mass_ratio: 1000,
  rcs_internal_fill_compatible_dry_stock_kg: 100, rcs_internal_fill_retained_dry_reserve_kg: 25,
  rcs_internal_fill_supplier_bag_net_kg: 50, rcs_internal_fill_mixing_water_l_for_selected_bag: 5 };
const provenance = { kind: "manual", reason: "owned integration override" };
function compile(submittedParameters: Record<string, unknown> = fixture, rowOverrides?: Record<string, Record<string, unknown>>) {
  return compileCanonicalEstimateCore({ operation: rowOverrides ? "recalculate" : "compile", compilerVersion: "rcs-components-test",
    catalogId: components.scope.catalogId, primaryMeasureParameterId: "rcs_crossing_length_m", parameterDefinitions: [...definition.parameters],
    formulaDefinitions: [...definition.formulas], resourceDefinitions: [...definition.resources], submittedParameters, confirmedParameters: {},
    priceItems: [], currencyCode: "KGS", maximumResourceRows: definition.resources.length, rowOverrides, hashJson: value => estimateDeterministicHash(value),
  });
}
const q = (result: Awaited<ReturnType<typeof compile>>, id: string) => Number(result.rows.find(row => row.row_id === id)?.quantity);

describe("actual one complete portable reaction assembly and its own resources", () => {
  const row = (key: string) => `rcs:reaction:${key}`;
  const reaction: Record<string, unknown> = { ...fixture, rcs_civil_installation_method: methods.pipeJacking,
    rcs_reaction_mode: reactionModes.portableRental, rcs_reaction_allocation_reference: "TEST entire portable backstop resources excluded from actual paid advance/jacks/shaft shoring/excavation/fill; no double costs",
    ...Object.fromEntries(Object.entries({
      program_and_design_reference: "TEST one actual compatible approved complete portable backstop, stable removable interface, actual ground/load/geometry/method, no retained concrete/piles/anchors; all whole kit returned",
      kit_designation: "TEST complete compatible portable backstop", kit_product_reference: "TEST full actual BOM/passports and compatible complete removable interface/tackle",
      calendar_hours: 24, rental_cost_basis: reactionRentalBasis, kit_reaction_panels_count: 1, kit_beams_braces_count: 2,
      kit_removable_restraint_sets_count: 0, kit_fastener_sets_count: 4, kit_reusable_alignment_sets_count: 2, kit_special_tackle_count: 1,
      configuration_and_force_reference: "TEST actual entire backstop/interface/ground permissible reaction vs required design force and useful occupied workspace after all other parts; not jack steel capacity",
      installed_required_length_m: 1, installed_required_width_m: 2.5, installed_required_height_m: 2,
      available_working_length_m: 1.5, available_working_width_m: 3, available_working_height_m: 2.5,
      required_full_reaction_kn: 300, admissible_full_reaction_kn: 350,
    }).map(([key, value]) => [`rcs_reaction_${key}`, value])),
    ...Object.fromEntries(["installation", "monitoring", "removal"].flatMap((operation, index) => Object.entries({
      method_reference: "TEST actual full separate compatible operation sequence/handling/control/all crew/equipment, no drive/excavation/fill/lease/materials repeated",
      crew_designation: "TEST all actual operation personnel", crew_h_per_unit: [4, 0.25, 3][index], crew_cost_basis: reactionWorkBases.crew,
      equipment_designation: "TEST actual compatible operation machinery with energy without crew", equipment_h_per_unit: [1.5, 0, 1][index], equipment_cost_basis: reactionWorkBases.equipment,
    }).map(([suffix, value]) => [`rcs_reaction_${operation}_${suffix}`, value]))),
    ...Object.fromEntries(["inbound", "return"].flatMap((direction, index) => Object.entries({
      mode: equipmentMobilizationModes.separate, allocation_reference: "TEST original entire portable backstop actual disjoint direction, all parts with no double empty return",
      condition_and_load_reference: "TEST full original complete backstop BOM, actual direction packing/state/mass/tackle/placement/route",
      vehicle_designation: "TEST actual compatible hauling/handling means", shipping_kg_per_complete_unit: [700, 680][index], route_payload_kg: 800,
      max_complete_units_per_trip: 1, cost_basis: freightBasis,
    }).map(([key, value]) => [`rcs_equipment_mobilization_reaction_kit_${direction}_${key}`, value]))),
    ...Object.fromEntries(Object.entries({
      program_and_compatibility_reference: "TEST actual compatible disjoint total cleaner consumption per initial kit service + full installation/extraction cycle + calendar service; unused source stock",
      gross_per_initial_kit: 0.2, gross_per_placement_cycle: 0.1, gross_per_group_calendar_hour: 0.01,
      mode: shoringMaterialModes.separate, product_designation: "TEST actual compatible backstop cleaner", compatible_unused_stock: 0.1,
      retained_reserve: 0.1, supplier_pack_net: 0.5, cost_basis: shoringMaterialBasis,
    }).map(([key, value]) => [`rcs_shoring_material_reaction_cleaner_${key}`, value])),
  };
  it("owns one full original kit, all distinct site work and complete direction trips without multiplying by drive length or rental hours", async () => {
    const result = await compile(reaction); expect(result.preliminaryNeeds).toEqual([]);
    expect(q(result, row("complete_kit_count"))).toBe(1); expect(q(result, row("rental_set_hours"))).toBe(24);
    expect(q(result, row("installation:crew_hours"))).toBe(4); expect(q(result, row("installation:equipment_hours"))).toBe(1.5);
    expect(q(result, row("monitoring:crew_hours"))).toBe(6); expect(q(result, row("monitoring:equipment_hours"))).toBe(0);
    expect(q(result, row("removal:crew_hours"))).toBe(3); expect(q(result, row("removal:equipment_hours"))).toBe(1);
    expect(q(result, "rcs:equipment-mobilization:reaction_kit_inbound:shipping_mass_kg")).toBe(700);
    expect(q(result, "rcs:equipment-mobilization:reaction_kit_return:shipping_mass_kg")).toBe(680);
    expect(q(result, "rcs:equipment-mobilization:reaction_kit_inbound:trip_count")).toBe(1);
    expect(q(result, "rcs:equipment-mobilization:reaction_kit_return:trip_count")).toBe(1);
    const changed = await compile({ ...reaction, rcs_crossing_length_m: 70 });
    expect(q(changed, row("installation:crew_hours"))).toBe(4); expect(q(changed, row("rental_set_hours"))).toBe(24);
    expect(q(changed, "rcs:civil-execution:jacking_advance:crew_hours")).toBe(140);
  });
  it("counts rented included braces/shims/fasteners once, uses actual consumable balances and does not deduct the temporary kit from permanent fill", async () => {
    const result = await compile(reaction);
    expect(q(result, row("included:beams_braces"))).toBe(2); expect(q(result, row("included:reusable_alignment_sets"))).toBe(2);
    expect(result.rows.filter(r => r.row_id.startsWith("rcs:reaction:included:")).every(r => !r.included_in_estimate && !r.included_in_procurement)).toBe(true);
    expect(q(result, "rcs:shoring-material:reaction:cleaner:consumed")).toBeCloseTo(0.54, 8);
    expect(q(result, "rcs:shoring-material:reaction:cleaner:ordered")).toBe(1);
    expect(q(result, "rcs:shoring-material:reaction:cleaner:remaining_unused")).toBeCloseTo(0.56, 8);
    expect(q(result, "rcs:shoring-material:reaction:cleaner:free_unused_beyond_reserve")).toBeCloseTo(0.46, 8);
    expect(q(result, "rcs:pit-return:total_remaining_space_m3")).toBe(83);
    expect(definition.parameters.some(p => p.parameter_id === "1")).toBe(false);
    expect(definition.runtimeInput).toEqual({}); expect(components.scope.fullOwner).toBe(false);
  });
  it.each([ ["admissible_full_reaction_kn", 299], ["installed_required_width_m", 3.1], ["installed_required_length_m", 1.6],
    ["installed_required_height_m", 2.6], ["available_working_width_m", 4.1] ] as const)("rejects incompatible actual %s=%s before manual work or lease quantities", async (fact, value) => {
    await expect(compile({ ...reaction, [`rcs_reaction_${fact}`]: value }, { [row("installation:crew_hours")]: { quantity: "999", provenance },
      [row("rental_set_hours")]: { quantity: "999", provenance } })).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
  });
  it("preserves unknown original thrust depth on dependent site work while keeping known rent, hardware, freight, materials and other geometry", async () => {
    const input = { ...reaction }; delete input.rcs_jacking_thrust_excavation_depth_m;
    const result = await compile(input, { [row("installation:crew_hours")]: { quantity: "999", provenance } });
    expect(result.preliminaryNeeds.find(n => n.row_id === row("installation:crew_hours"))?.missing_parameter_ids).toContain("rcs_jacking_thrust_excavation_depth_m");
    expect(q(result, row("rental_set_hours"))).toBe(24); expect(q(result, row("included:fastener_sets"))).toBe(4);
    expect(q(result, "rcs:equipment-mobilization:reaction_kit_return:trip_count")).toBe(1);
    expect(q(result, "rcs:shoring-material:reaction:cleaner:ordered")).toBe(1);
    expect(q(result, "rcs:civil:jacking_reception_pit_excavation_m3")).toBe(30);
  });
  it.each(["allocation_reference", "program_and_design_reference", "kit_product_reference", "kit_fastener_sets_count"])("does not bypass original complete kit %s with manual rent", async fact => {
    const input = { ...reaction }; delete input[`rcs_reaction_${fact}`];
    const result = await compile(input, { [row("rental_set_hours")]: { quantity: "999", provenance } });
    expect(result.preliminaryNeeds.find(n => n.row_id === row("rental_set_hours"))?.missing_parameter_ids).toContain(`rcs_reaction_${fact}`);
    expect(q(result, "rcs:casing:ordered_casing_length_m")).toBe(48);
  });
  it("requires explicit reaction allocation before separately paid advance, including after a manual advance override", async () => {
    const input: Record<string, unknown> = { ...fixture, rcs_civil_installation_method: methods.pipeJacking }; delete input.rcs_reaction_allocation_reference;
    const result = await compile(input, { "rcs:civil-execution:jacking_advance:crew_hours": { quantity: "999", provenance } });
    expect(result.preliminaryNeeds.find(n => n.row_id === "rcs:civil-execution:jacking_advance:crew_hours")?.missing_parameter_ids).toContain("rcs_reaction_allocation_reference");
    expect(q(result, "rcs:civil-execution:jacking_pits:crew_hours")).toBeCloseTo(40.8, 8);
  });
  it("does not bypass the original monitoring calendar with manual reaction hours while one-time work remains known", async () => {
    const input = { ...reaction }; delete input.rcs_reaction_calendar_hours;
    const result = await compile(input, { [row("monitoring:crew_hours")]: { quantity: "999", provenance },
      [row("monitoring:equipment_hours")]: { quantity: "999", provenance } });
    expect(result.preliminaryNeeds.find(n => n.row_id === row("monitoring:crew_hours"))?.missing_parameter_ids).toContain("rcs_reaction_calendar_hours");
    expect(result.preliminaryNeeds.find(n => n.row_id === row("monitoring:equipment_hours"))?.missing_parameter_ids).toContain("rcs_reaction_calendar_hours");
    expect(q(result, row("installation:crew_hours"))).toBe(4); expect(q(result, row("removal:crew_hours"))).toBe(3);
    expect(q(result, "rcs:equipment-mobilization:reaction_kit_return:trip_count")).toBe(1);
  });
  it("deactivates obsolete portable kit/work/material/freight charges for open-cut or a different actual reaction programme", async () => {
    for (const patch of [{ rcs_civil_installation_method: methods.openCut }, { rcs_reaction_mode: reactionModes.otherParty }, { rcs_reaction_mode: reactionModes.other }]) {
      const result = await compile({ ...reaction, ...patch }, { [row("rental_set_hours")]: { quantity: "999", unitPrice: "3", provenance } });
      expect(result.rows.some(r => r.row_id.startsWith("rcs:reaction:") || r.row_id.startsWith("rcs:shoring-material:reaction:") || r.row_id.startsWith("rcs:equipment-mobilization:reaction_kit_"))).toBe(false);
      expect(q(result, "rcs:joint:crew_person_hours")).toBe(6);
    }
  });
  it("assigns the actual resource owners to installation and completion exactly once", () => {
    expect(components.stageMatrix.filter(s => s.ownResourceIds.includes(row("rental_set_hours"))).map(s => s.stageId)).toEqual(["installation"]);
    expect(components.stageMatrix.filter(s => s.ownResourceIds.includes(row("removal:crew_hours"))).map(s => s.stageId)).toEqual(["completion"]);
    expect(components.stageMatrix.find(s => s.stageId === "completion")?.ownResourceIds).toContain("rcs:equipment-mobilization:reaction_kit_return:trip_count");
  });
});

describe("actual full temporary shoring kits, disjoint programme resources and mobilisation", () => {
  const p = (key: string) => `rcs_shoring_trench_${key}`;
  const row = (key: string) => `rcs:shoring:trench:${key}`;
  const selected: Record<string, unknown> = { ...fixture,
    ...Object.fromEntries(Object.entries({ mode: shoringModes.completeRental,
      program_reference: "TEST actual approved two identical kits, five complete placement/extraction cycles; separate site operations, no excavation/fill/reaction overlap",
      kit_designation: "TEST full compatible kit", kit_product_reference: "TEST complete actual BOM, original kit passports, all parts and removal/return",
      complete_kit_count: 2, calendar_hours: 24, placement_cycle_count: 5, rental_cost_basis: shoringRentalBasis,
      kit_base_panels_per_complete_kit: 2, kit_top_panels_per_complete_kit: 0, kit_struts_frames_per_complete_kit: 2,
      kit_extensions_per_complete_kit: 0, kit_connectors_per_complete_kit: 0, kit_fastener_sets_per_complete_kit: 8, kit_special_tackle_per_complete_kit: 1,
      geometry_and_load_reference: "TEST actual permissible assembly/load/design/method; outside excavation distinct from usable working dimensions",
      installed_outer_length_m: 4, installed_outer_width_m: 1.4, installed_height_m: 2.2, required_projection_m: 0.1,
      usable_width_m: 1, usable_length_m: 3.2, required_usable_width_m: 0.8, required_usable_length_m: 3,
    }).map(([key, value]) => [p(key), value])),
    ...Object.fromEntries(["assembly", "installation", "monitoring", "extraction", "disassembly"].flatMap((key, index) => Object.entries({
      method_reference: "TEST complete separate operation and actual compatible load/handling/sequence; no second earthwork/fill/transport",
      crew_designation: "TEST all operation personnel", crew_h_per_unit: [3, 2, 0.25, 1.2, 0.5][index], crew_cost_basis: shoringWorkBases.crew,
      equipment_designation: "TEST compatible equipment with energy without crew", equipment_h_per_unit: [0.5, 1.5, 0, 0.75, 0][index], equipment_cost_basis: shoringWorkBases.equipment,
    }).map(([suffix, value]) => [p(`${key}_${suffix}`), value]))),
    ...Object.fromEntries(["inbound", "return"].flatMap((direction, index) => Object.entries({
      mode: equipmentMobilizationModes.separate, allocation_reference: "TEST dedicated complete kits actual direction/site/route, no double empty return",
      condition_and_load_reference: "TEST original full homogeneous BOM with actual condition/packing/load masses and route",
      vehicle_designation: "TEST compatible complete hauling/handling means", shipping_kg_per_complete_unit: [500, 480][index],
      route_payload_kg: 900, max_complete_units_per_trip: 3, cost_basis: freightBasis,
    }).map(([key, value]) => [`rcs_equipment_mobilization_shoring_trench_kits_${direction}_${key}`, value]))),
  };
  const mp = (material: string, suffix: string) => `rcs_shoring_material_trench_${material}_${suffix}`;
  const mr = (material: string, suffix: string) => `rcs:shoring-material:trench:${material}:${suffix}`;
  const gp = (suffix: string) => `rcs_shoring_gap_thrust_${suffix}`;
  const gr = (suffix: string) => `rcs:shoring-gap:thrust:${suffix}`;
  const gap: Record<string, unknown> = { ...fixture, rcs_civil_installation_method: methods.pipeJacking,
    ...Object.fromEntries(Object.entries(selected).filter(([key]) => key.startsWith("rcs_shoring_trench_")).map(([key, value]) => [key.replace("_trench_", "_thrust_"), value])),
    rcs_shoring_thrust_complete_kit_count: 1, rcs_shoring_thrust_placement_cycle_count: 1,
    rcs_shoring_thrust_installed_outer_width_m: 3, rcs_shoring_thrust_installed_height_m: 3.2,
    rcs_jacking_thrust_permanent_occupied_volume_m3: 40,
    [gp("mode")]: gapModes.retainedRectangular,
    [gp("program_and_allocation_reference")]: "TEST all 36 finished m3 remain permanently preplaced in original occupied total 40, separate from 4 other m3; no duplicate installation/final-fill/water consumption or reuse",
    [gp("rectangular_contact_reference")]: "TEST actual full four-sided rectangular contact 4x3m full 3m depth, one original kit/position, uniform complete gap, no protrusions/other occupants/unfilled parts",
    [gp("granular_gross_loose_per_finished_m3")]: 1.2, [gp("water_gross_l_per_finished_m3")]: 80,
    ...Object.fromEntries(["granular", "water"].flatMap((material, index) => Object.entries({
      supply_mode: gapSupplyModes.separate, product_designation: `TEST actual compatible ${material}`,
      compatibility_reference: "TEST actual exclusively allocated compatible material in stated condition/gross loss basis, no reuse or other operation allocation",
      compatible_stock_m3: [5, 0.5][index], retained_reserve_m3: [2, 0.2][index], supplier_multiple_m3: [5, 1][index], cost_basis: gapBases.material,
    }).map(([key, value]) => [gp(`${material}_${key}`), value]))),
    [gp("work_mode")]: gapWorkModes.separate,
    [gp("work_method_reference")]: "TEST all separate gap placing/watering/compaction, no double parent installation/excavation/final fill, material and freight separate",
    ...Object.fromEntries(["crew", "equipment"].flatMap((owner, index) => Object.entries({
      designation: `TEST all disjoint ${owner}`, h_per_finished_m3: [0.6, 0.2][index], cost_basis: gapBases[owner as "crew" | "equipment"],
    }).map(([key, value]) => [gp(`${owner}_${key}`), value]))),
    rcs_pit_fill_material_mode: fillModes.sameGranular, rcs_pit_fill_granular_product_designation: "TEST compatible separate FINAL return fill",
    rcs_pit_fill_approved_reused_finished_m3: 0, rcs_pit_fill_gross_supplied_volume_ratio: 1.2,
    rcs_pit_fill_compatible_loose_stock_m3: 0, rcs_pit_fill_retained_loose_reserve_m3: 0, rcs_pit_fill_supplier_loose_multiple_m3: 1,
  };
  it("preplaces the derived 36m3 gap once, with separate same-state material/water balances and all work, leaving 55m3 final return fill", async () => {
    const result = await compile(gap, { [gr("granular:ordered_m3")]: { unitPrice: "2", provenance }, [gr("crew_hours")]: { unitPrice: "3", provenance } });
    expect(result.preliminaryNeeds).toEqual([]); expect(q(result, gr("permanently_preplaced_finished_m3"))).toBe(36);
    expect(q(result, gr("already_allocated_permanent_volume_margin_m3"))).toBe(4);
    expect(q(result, gr("granular:consumed_m3"))).toBeCloseTo(43.2, 8); expect(q(result, gr("granular:ordered_m3"))).toBe(45);
    expect(q(result, gr("granular:remaining_unused_m3"))).toBeCloseTo(6.8, 8); expect(q(result, gr("granular:free_unused_beyond_reserve_m3"))).toBeCloseTo(4.8, 8);
    expect(q(result, gr("water:consumed_m3"))).toBeCloseTo(2.88, 8); expect(q(result, gr("water:ordered_m3"))).toBe(3);
    expect(q(result, gr("water:remaining_unused_m3"))).toBeCloseTo(0.62, 8); expect(q(result, gr("water:free_unused_beyond_reserve_m3"))).toBeCloseTo(0.42, 8);
    expect(q(result, gr("crew_hours"))).toBeCloseTo(21.6, 8); expect(q(result, gr("equipment_hours"))).toBeCloseTo(7.2, 8);
    expect(q(result, "rcs:shoring:thrust:installation:crew_hours")).toBe(2);
    expect(q(result, "rcs:pit-return:total_remaining_space_m3")).toBe(55); expect(q(result, "rcs:pit-fill:ordered_loose_m3")).toBe(66);
    expect(q(result, "rcs:fill-execution:pits:crew_hours")).toBe(33); expect(Number(result.totals.amount)).toBeCloseTo(154.8, 8);
    expect(result.rows.filter(r => r.row_id.startsWith("rcs:shoring-gap:") && r.included_in_estimate).map(r => r.row_id)).toEqual([gr("granular:ordered_m3"), gr("water:ordered_m3"), gr("crew_hours"), gr("equipment_hours")]);
  });
  it("uses original finished geometry for final water and gap work regardless of changed supplier stock/reserve/multiple", async () => {
    const result = await compile({ ...gap, [gp("granular_supplier_multiple_m3")]: 50, [gp("granular_retained_reserve_m3")]: 20,
      rcs_compaction_water_pits_gross_l_per_finished_m3: 100, rcs_compaction_water_pits_supply_mode: compactionWaterModes.otherParty,
      rcs_compaction_water_pits_allocation_reference: "TEST entire separate FINAL fill water excludes permanent preplaced gap water",
      rcs_compaction_water_pits_product_designation: "TEST compatible FINAL fill water",
      rcs_compaction_water_pits_compatibility_reference: "TEST exclusive final 55 finished m3 only, no preplaced gap water" });
    expect(result.preliminaryNeeds).toEqual([]); expect(q(result, gr("granular:ordered_m3"))).toBe(100);
    expect(q(result, gr("permanently_preplaced_finished_m3"))).toBe(36); expect(q(result, gr("crew_hours"))).toBeCloseTo(21.6, 8);
    expect(q(result, "rcs:compaction-water:pits:allocated_consumed_m3")).toBeCloseTo(5.5, 8);
  });
  it.each([ ["rcs_shoring_thrust_complete_kit_count", 2], ["rcs_shoring_thrust_placement_cycle_count", 2],
    ["rcs_jacking_thrust_permanent_occupied_volume_m3", 35.9], ["rcs_shoring_thrust_installed_outer_width_m", 4.1] ] as const)("rejects incompatible original %s=%s before manual gap order/final fill/work", async (fact, value) => {
    await expect(compile({ ...gap, [fact]: value }, { [gr("granular:ordered_m3")]: { quantity: "1", provenance },
      [gr("crew_hours")]: { quantity: "1", provenance }, "rcs:pit-fill:ordered_loose_m3": { quantity: "1", provenance } })).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
  });
  it("keeps an unknown pit depth local even with a manual gap order, retaining rent, assembly, casing and joints", async () => {
    const input = { ...gap }; delete input.rcs_jacking_thrust_excavation_depth_m;
    const result = await compile(input, { [gr("granular:ordered_m3")]: { quantity: "999", provenance } });
    expect(result.preliminaryNeeds.find(n => n.row_id === gr("granular:ordered_m3"))?.missing_parameter_ids).toContain("rcs_jacking_thrust_excavation_depth_m");
    expect(q(result, "rcs:shoring:thrust:rental_set_hours")).toBe(24); expect(q(result, "rcs:shoring:thrust:assembly:crew_hours")).toBe(3);
    expect(q(result, "rcs:casing:ordered_casing_length_m")).toBe(48); expect(q(result, "rcs:joint:crew_person_hours")).toBe(6);
  });
  it("an unknown total permanent occupation preserves known gap resources while final return fill and allocation control await that original fact", async () => {
    const input = { ...gap }; delete input.rcs_jacking_thrust_permanent_occupied_volume_m3;
    const result = await compile(input);
    expect(result.preliminaryNeeds.find(n => n.row_id === gr("already_allocated_permanent_volume_margin_m3"))?.missing_parameter_ids).toContain("rcs_jacking_thrust_permanent_occupied_volume_m3");
    expect(result.preliminaryNeeds.find(n => n.row_id === "rcs:pit-fill:ordered_loose_m3")?.missing_parameter_ids).toContain("rcs_jacking_thrust_permanent_occupied_volume_m3");
    expect(q(result, gr("granular:ordered_m3"))).toBe(45); expect(q(result, gr("crew_hours"))).toBeCloseTo(21.6, 8);
  });
  it.each(["rectangular_contact_reference", "program_and_allocation_reference", "granular_compatibility_reference", "granular_supplier_multiple_m3"])("requires original %s before a manual gap order", async fact => {
    const input = { ...gap }; delete input[gp(fact)];
    const result = await compile(input, { [gr("granular:ordered_m3")]: { quantity: "999", provenance } });
    expect(result.preliminaryNeeds.find(n => n.row_id === gr("granular:ordered_m3"))?.missing_parameter_ids).toContain(gp(fact));
    expect(q(result, "rcs:shoring:thrust:rental_set_hours")).toBe(24);
  });
  it("requires gap allocation for paid parent installation under a manual override while preserving independent rent and assembly", async () => {
    const input = { ...gap }; delete input[gp("program_and_allocation_reference")];
    const result = await compile(input, { "rcs:shoring:thrust:installation:crew_hours": { quantity: "999", provenance } });
    expect(result.preliminaryNeeds.find(n => n.row_id === "rcs:shoring:thrust:installation:crew_hours")?.missing_parameter_ids).toContain(gp("program_and_allocation_reference"));
    expect(q(result, "rcs:shoring:thrust:assembly:crew_hours")).toBe(3); expect(q(result, "rcs:shoring:thrust:rental_set_hours")).toBe(24);
  });
  it("explicit zero added water removes only dependent water supply/freight; other-party material/work removes only its own costs", async () => {
    const input = { ...gap, [gp("water_gross_l_per_finished_m3")]: 0 }; delete input[gp("water_product_designation")];
    const zero = await compile(input); expect(zero.preliminaryNeeds).toEqual([]);
    expect(zero.rows.some(r => r.row_id.startsWith(gr("water:")) || r.row_id.startsWith("rcs:freight:shoring_gap_thrust_water_"))).toBe(false);
    expect(q(zero, gr("granular:ordered_m3"))).toBe(45); expect(q(zero, gr("crew_hours"))).toBeCloseTo(21.6, 8);
    const supplied = await compile({ ...gap, [gp("granular_supply_mode")]: gapSupplyModes.otherParty, [gp("work_mode")]: gapWorkModes.otherParty }, {
      [gr("granular:ordered_m3")]: { quantity: "999", unitPrice: "50", provenance }, [gr("crew_hours")]: { quantity: "999", unitPrice: "50", provenance } });
    expect(supplied.preliminaryNeeds).toEqual([]); expect(q(supplied, gr("granular:consumed_m3"))).toBeCloseTo(43.2, 8);
    expect(supplied.rows.some(r => [gr("granular:ordered_m3"), gr("crew_hours"), gr("equipment_hours")].includes(r.row_id))).toBe(false);
    expect(q(supplied, gr("water:ordered_m3"))).toBe(3); expect(q(supplied, "rcs:pit-fill:ordered_loose_m3")).toBe(66);
  });
  it("delivers the new actual bulk order without treating a supplier volume multiple as indivisible packaging", async () => {
    const result = await compile({ ...gap, ...Object.fromEntries(Object.entries({ mode: freightModes.separate,
      allocation_reference: "TEST actual separate BULK loose volume route/placing, supplier multiple is not an indivisible container",
      vehicle_designation: "TEST compatible bulk delivery", shipping_kg_per_unit: 1000, payload_kg: 2500, max_units_per_trip: 2.5, cost_basis: freightBasis,
    }).map(([key, value]) => [`rcs_freight_shoring_gap_thrust_granular_new_${key}`, value])) });
    expect(result.preliminaryNeeds).toEqual([]); expect(q(result, "rcs:freight:shoring_gap_thrust_granular_new:cargo_units")).toBe(45);
    expect(q(result, "rcs:freight:shoring_gap_thrust_granular_new:effective_units_per_trip")).toBe(2.5);
    expect(q(result, "rcs:freight:shoring_gap_thrust_granular_new:trip_count")).toBe(18);
  });
  it.each([gapModes.other, gapModes.notRequired])("deactivates unsupported/no-gap resources for %s but preserves actual parent installation and rent", async mode => {
    const result = await compile({ ...gap, [gp("mode")]: mode }, { [gr("granular:ordered_m3")]: { quantity: "999", unitPrice: "50", provenance } });
    expect(result.preliminaryNeeds).toEqual([]); expect(result.rows.some(r => r.row_id.startsWith("rcs:shoring-gap:thrust:") || r.row_id.startsWith("rcs:freight:shoring_gap_thrust_"))).toBe(false);
    expect(q(result, "rcs:shoring:thrust:installation:crew_hours")).toBe(2); expect(q(result, "rcs:shoring:thrust:rental_set_hours")).toBe(24);
  });
  it("places permanent gap resource rows exactly once in installation and keeps original measures free of derived gap-volume questions", () => {
    for (const suffix of ["permanently_preplaced_finished_m3", "granular:ordered_m3", "crew_hours", "equipment_hours"]) {
      expect(components.stageMatrix.filter(s => s.ownResourceIds.includes(gr(suffix))).map(s => s.stageId)).toEqual(["installation"]);
    }
    expect(parameters.some(p => p.id.startsWith("rcs_shoring_gap_") && /(?:finished_volume|gap_volume|permanently_preplaced)/u.test(p.id))).toBe(false);
  });
  const withConsumables: Record<string, unknown> = { ...selected,
    ...Object.fromEntries(["lubricant", "cleaner", "wipes"].flatMap((material, index) => Object.entries({
      program_and_compatibility_reference: "TEST actual complete disjoint gross consumption in initial kits, full cycles and whole-group calendar service; compatible unused stock, no other equipment fuel/materials",
      gross_per_initial_kit: [0.05, 0.2, 2][index], gross_per_placement_cycle: [0.02, 0.1, 1][index], gross_per_group_calendar_hour: [0, 0.01, 0][index],
      mode: shoringMaterialModes.separate, product_designation: `TEST actual compatible ${material}`,
      compatible_unused_stock: [0.1, 0.5, 3][index], retained_reserve: [0.05, 0.2, 2][index], supplier_pack_net: [0.25, 1, 5][index], cost_basis: shoringMaterialBasis,
    }).map(([key, value]) => [mp(material, key), value]))),
    ...Object.fromEntries(Object.entries({ mode: freightModes.separate, allocation_reference: "TEST actual dedicated sealed whole-package wipes delivery",
      vehicle_designation: "TEST compatible carrier", shipping_kg_per_unit: 0.1, payload_kg: 0.8, max_units_per_trip: 8, cost_basis: freightBasis,
    }).map(([key, value]) => [`rcs_freight_shoring_trench_wipes_new_${key}`, value])),
  };
  const wr = (suffix: string) => `rcs:service-waste:trench:${suffix}`;
  const wp = (suffix: string) => `rcs_service_waste_trench_${suffix}`;
  const withWaste: Record<string, unknown> = { ...withConsumables,
    ...Object.fromEntries(Object.entries({
      mode: serviceWasteModes.complete, program_reference: "TEST actual all compatible homogeneous service residues/ALL consumed wipes/discarded initial product packaging, complete disjoint full service; all collector places single-use disposed",
      net_waste_kg: 4, dry_kg_per_original_wipe: 0.1, wipe_mass_reference: "TEST actual original compatible wipe SKU mass and all nine disposable original wipes remain in party",
      contents_and_compatibility_reference: "TEST actual FULL homogeneous permitted contents, compatibility, classification/packing/closing/placement and each certified max shipping mass, no foreign defaults",
      container_designation: "TEST complete compatible single-use closed collection container", effective_net_kg_per_container: 2.5,
      container_tare_kg: 0.2, certified_max_shipping_kg_per_container: 3,
      vehicle_designation: "TEST full compatible hauling and handling means with all crew/energy",
      route_and_handling_reference: "TEST actual route/rights/contents/supply of exactly needed containers/all collection and closure after paid cleaning, no duplicate kit service or other freight",
      route_payload_kg: 5, vehicle_container_places: 3, trip_cost_basis: serviceWasteTripBasis,
      receiving_mode: serviceWasteReceivingModes.tonnes, receiver_designation: "TEST actual approved whole-party receiver",
      receiving_reference: "TEST actual admissible receiving/classification of ALL waste and new disposed collection containers, no second receiving/haul",
      receiving_cost_basis: serviceWasteReceivingBasis,
    }).map(([key, value]) => [wp(key), value])),
  };
  it("owns all actual service-waste packaging/full handling trips and gross receiving mass without pricing original consumables or containers twice", async () => {
    const result = await compile(withWaste, { [wr("full_service_trip_count")]: { unitPrice: "10", provenance }, [wr("receiving_tonnes")]: { unitPrice: "100", provenance } });
    expect(result.preliminaryNeeds).toEqual([]); expect(q(result, wr("net_waste_kg"))).toBe(4);
    expect(q(result, wr("all_original_wipes_count"))).toBe(9); expect(q(result, wr("wipe_mass_margin_kg"))).toBeCloseTo(3.1, 8);
    expect(q(result, wr("closed_container_count"))).toBe(2); expect(q(result, wr("container_mass_margin_kg"))).toBeCloseTo(0.3, 8);
    expect(q(result, wr("gross_shipping_kg"))).toBeCloseTo(4.4, 8);
    expect(q(result, wr("effective_containers_per_trip"))).toBe(1); expect(q(result, wr("full_service_trip_count"))).toBe(2);
    expect(q(result, wr("receiving_tonnes"))).toBeCloseTo(0.0044, 8); expect(Number(result.totals.amount)).toBeCloseTo(20.44, 8);
    expect(result.rows.filter(r => r.row_id.startsWith("rcs:service-waste:") && r.included_in_estimate).map(r => r.row_id)).toEqual([wr("full_service_trip_count"), wr("receiving_tonnes")]);
    expect(q(result, mr("wipes", "ordered"))).toBe(10); expect(q(result, row("disassembly:crew_hours"))).toBe(1);
    expect(q(result, "rcs:equipment-mobilization:shoring_trench_kits_return:trip_count")).toBe(2);
    expect(components.stageMatrix.filter(s => s.ownResourceIds.includes(wr("full_service_trip_count"))).map(s => s.stageId)).toEqual(["completion"]);
  });
  it("uses actual waste net mass and worst per-container shipment for packing/haul, independent of supplier packs/reserve and kit rental", async () => {
    const partialLast = await compile({ ...withWaste, [wp("net_waste_kg")]: 2.6 });
    expect(q(partialLast, wr("closed_container_count"))).toBe(2); expect(q(partialLast, wr("full_service_trip_count"))).toBe(2);
    expect(q(partialLast, wr("gross_shipping_kg"))).toBe(3); expect(q(partialLast, wr("receiving_tonnes"))).toBe(0.003);
    const stock = await compile({ ...withWaste, [mp("wipes", "compatible_unused_stock")]: 20,
      [mp("wipes", "retained_reserve")]: 10, [p("calendar_hours")]: 48 });
    expect(q(stock, mr("wipes", "ordered"))).toBe(0); expect(q(stock, wr("all_original_wipes_count"))).toBe(9);
    expect(q(stock, wr("full_service_trip_count"))).toBe(2); expect(q(stock, wr("receiving_tonnes"))).toBeCloseTo(0.0044, 8);
  });
  it.each([ ["net_waste_kg", 0], ["net_waste_kg", 0.89], ["certified_max_shipping_kg_per_container", 2.69],
    ["route_payload_kg", 2.99] ] as const)("rejects impossible actual service-waste %s=%s before manual trips/receiving", async (fact, value) => {
    await expect(compile({ ...withWaste, [wp(fact)]: value }, { [wr("full_service_trip_count")]: { quantity: "1", provenance },
      [wr("receiving_tonnes")]: { quantity: "1", provenance } })).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
  });
  it("leaves known packing/receiving and kit work calculable when only a haul payload is unknown", async () => {
    const input = { ...withWaste }; delete input[wp("route_payload_kg")];
    const result = await compile(input, { [wr("full_service_trip_count")]: { quantity: "999", provenance } });
    expect(result.preliminaryNeeds.find(n => n.row_id === wr("full_service_trip_count"))?.missing_parameter_ids).toContain(wp("route_payload_kg"));
    expect(q(result, wr("closed_container_count"))).toBe(2); expect(q(result, wr("receiving_tonnes"))).toBeCloseTo(0.0044, 8);
    expect(q(result, row("installation:crew_hours"))).toBe(10); expect(q(result, mr("cleaner", "ordered"))).toBe(1);
  });
  it.each(["contents_and_compatibility_reference", "receiver_designation", "receiving_reference", "effective_net_kg_per_container"])("keeps original actual service-waste %s mandatory before manually priced trips", async fact => {
    const input = { ...withWaste }; delete input[wp(fact)];
    const result = await compile(input, { [wr("full_service_trip_count")]: { quantity: "999", unitPrice: "1", provenance } });
    expect(result.preliminaryNeeds.find(n => n.row_id === wr("full_service_trip_count"))?.missing_parameter_ids).toContain(wp(fact));
    expect(q(result, row("rental_set_hours"))).toBe(48); expect(q(result, mr("wipes", "ordered"))).toBe(10);
  });
  it("preserves unknown real net mass instead of assuming zero or converting cleaner litres into a waste density", async () => {
    const input = { ...withWaste }; delete input[wp("net_waste_kg")];
    const result = await compile(input, { [wr("receiving_tonnes")]: { quantity: "999", provenance } });
    expect(result.preliminaryNeeds.find(n => n.row_id === wr("receiving_tonnes"))?.missing_parameter_ids).toContain(wp("net_waste_kg"));
    expect(q(result, mr("cleaner", "consumed"))).toBeCloseTo(1.14, 8); expect(q(result, row("rental_set_hours"))).toBe(48);
    const missingMin = { ...withWaste }; delete missingMin[wp("dry_kg_per_original_wipe")];
    const minResult = await compile(missingMin, { [wr("wipe_mass_margin_kg")]: { quantity: "999", provenance } });
    expect(minResult.preliminaryNeeds.find(n => n.row_id === wr("wipe_mass_margin_kg"))?.missing_parameter_ids).toContain(wp("dry_kg_per_original_wipe"));
  });
  it("disables truly empty service waste and separately supplied receiving/whole waste without reviving old priced quantities", async () => {
    const zero: Record<string, unknown> = { ...withWaste, [wp("net_waste_kg")]: 0,
      [mp("wipes", "gross_per_initial_kit")]: 0, [mp("wipes", "gross_per_placement_cycle")]: 0 };
    for (const field of ["route_payload_kg", "container_designation", "dry_kg_per_original_wipe", "receiver_designation"]) delete zero[wp(field)];
    const none = await compile(zero); expect(none.preliminaryNeeds).toEqual([]); expect(q(none, wr("net_waste_kg"))).toBe(0);
    expect(none.rows.some(r => r.row_id === wr("full_service_trip_count") || r.row_id === wr("receiving_tonnes"))).toBe(false);
    const receiver = await compile({ ...withWaste, [wp("receiving_mode")]: serviceWasteReceivingModes.otherParty }, { [wr("receiving_tonnes")]: { quantity: "999", unitPrice: "5", provenance } });
    expect(receiver.rows.some(r => r.row_id === wr("receiving_tonnes"))).toBe(false); expect(q(receiver, wr("full_service_trip_count"))).toBe(2);
    const other = await compile({ ...withWaste, [wp("mode")]: serviceWasteModes.otherParty });
    expect(other.rows.some(r => r.row_id.startsWith("rcs:service-waste:trench:"))).toBe(false); expect(q(other, mr("wipes", "ordered"))).toBe(10);
  });
  it("owns actual disjoint consumable contributions, complete new packages and unused balances without second rent/work/material charges", async () => {
    const result = await compile(withConsumables, { [mr("wipes", "ordered")]: { unitPrice: "2", provenance } });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(q(result, mr("lubricant", "consumed"))).toBeCloseTo(0.2, 8); expect(q(result, mr("lubricant", "ordered"))).toBe(0.25);
    expect(q(result, mr("lubricant", "remaining_unused"))).toBeCloseTo(0.15, 8); expect(q(result, mr("lubricant", "free_unused_beyond_reserve"))).toBeCloseTo(0.1, 8);
    expect(q(result, mr("cleaner", "consumed"))).toBeCloseTo(1.14, 8); expect(q(result, mr("cleaner", "ordered"))).toBe(1);
    expect(q(result, mr("cleaner", "remaining_unused"))).toBeCloseTo(0.36, 8); expect(q(result, mr("cleaner", "free_unused_beyond_reserve"))).toBeCloseTo(0.16, 8);
    expect(q(result, mr("wipes", "consumed"))).toBe(9); expect(q(result, mr("wipes", "supplier_pack_count"))).toBe(2);
    expect(q(result, mr("wipes", "ordered"))).toBe(10); expect(q(result, mr("wipes", "remaining_unused"))).toBe(4); expect(q(result, mr("wipes", "free_unused_beyond_reserve"))).toBe(2);
    expect(result.rows.filter(r => r.row_id.startsWith("rcs:shoring-material:") && r.included_in_estimate).map(r => r.row_id)).toEqual([mr("lubricant", "ordered"), mr("cleaner", "ordered"), mr("wipes", "ordered")]);
    expect(result.totals.amount).toBe("20"); expect(q(result, row("rental_set_hours"))).toBe(48); expect(q(result, row("installation:crew_hours"))).toBe(10);
  });
  it("changes each actual consumption source independently instead of multiplying whole-group calendar service by every kit", async () => {
    const kits = await compile({ ...withConsumables, [p("complete_kit_count")]: 3 });
    expect(q(kits, mr("cleaner", "consumed"))).toBeCloseTo(1.34, 8); expect(q(kits, row("monitoring:crew_hours"))).toBe(6);
    const cycles = await compile({ ...withConsumables, [p("placement_cycle_count")]: 6 });
    expect(q(cycles, mr("cleaner", "consumed"))).toBeCloseTo(1.24, 8); expect(q(cycles, mr("wipes", "consumed"))).toBe(10);
    const time = await compile({ ...withConsumables, [p("calendar_hours")]: 48 });
    expect(q(time, mr("cleaner", "consumed"))).toBeCloseTo(1.38, 8); expect(q(time, mr("wipes", "consumed"))).toBe(9);
    const packs = await compile({ ...withConsumables, [mp("wipes", "supplier_pack_net")]: 20, [mp("wipes", "retained_reserve")]: 10,
      rcs_freight_shoring_trench_wipes_new_mode: freightModes.otherParty });
    expect(q(packs, mr("wipes", "consumed"))).toBe(9); expect(q(packs, mr("wipes", "ordered"))).toBe(20);
  });
  it("transports only new complete unopened consumable packages, distinct from gross consumption and original equipment return", async () => {
    const result = await compile(withConsumables);
    expect(q(result, "rcs:freight:shoring_trench_wipes_new:cargo_units")).toBe(10);
    expect(q(result, "rcs:freight:shoring_trench_wipes_new:effective_units_per_trip")).toBe(5);
    expect(q(result, "rcs:freight:shoring_trench_wipes_new:trip_count")).toBe(2);
    expect(q(result, "rcs:equipment-mobilization:shoring_trench_kits_return:complete_unit_count")).toBe(2);
    await expect(compile({ ...withConsumables, rcs_freight_shoring_trench_wipes_new_max_units_per_trip: 4 }, {
      "rcs:freight:shoring_trench_wipes_new:trip_count": { quantity: "1", provenance },
    })).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
  });
  it("requires only the affected missing stock/order facts while preserving known consumption, other materials and kit work", async () => {
    const input = { ...withConsumables }; delete input[mp("cleaner", "compatible_unused_stock")];
    const result = await compile(input, { [mr("cleaner", "ordered")]: { quantity: "999", provenance } });
    expect(result.preliminaryNeeds.find(n => n.row_id === mr("cleaner", "ordered"))?.missing_parameter_ids).toContain(mp("cleaner", "compatible_unused_stock"));
    expect(q(result, mr("cleaner", "consumed"))).toBeCloseTo(1.14, 8); expect(q(result, mr("lubricant", "ordered"))).toBe(0.25);
    expect(q(result, row("assembly:crew_hours"))).toBe(6); expect(q(result, row("rental_set_hours"))).toBe(48);
  });
  it.each(["product_designation", "program_and_compatibility_reference", "gross_per_placement_cycle", "supplier_pack_net"])("preserves original consumable %s gate under a manual order", async fact => {
    const input = { ...withConsumables }; delete input[mp("cleaner", fact)];
    const result = await compile(input, { [mr("cleaner", "ordered")]: { quantity: "999", provenance } });
    expect(result.preliminaryNeeds.find(n => n.row_id === mr("cleaner", "ordered"))?.missing_parameter_ids).toContain(mp("cleaner", fact));
    expect(q(result, mr("wipes", "ordered"))).toBe(10); expect(q(result, row("rental_set_hours"))).toBe(48);
  });
  it("explicit zero consumption and other-party supply remove only obsolete consumable purchases and dependent freight", async () => {
    const zero = await compile({ ...withConsumables, [mp("wipes", "gross_per_initial_kit")]: 0, [mp("wipes", "gross_per_placement_cycle")]: 0 });
    expect(q(zero, mr("wipes", "consumed"))).toBe(0); expect(zero.rows.some(r => r.row_id === mr("wipes", "ordered") || r.row_id.startsWith("rcs:freight:shoring_trench_wipes_"))).toBe(false);
    const supplied = await compile({ ...withConsumables, [mp("cleaner", "mode")]: shoringMaterialModes.otherParty }, {
      [mr("cleaner", "ordered")]: { quantity: "999", unitPrice: "20", provenance },
    });
    expect(q(supplied, mr("cleaner", "provided_by_other_party"))).toBeCloseTo(1.14, 8); expect(supplied.rows.some(r => r.row_id === mr("cleaner", "ordered"))).toBe(false);
    expect(q(supplied, mr("wipes", "ordered"))).toBe(10);
  });
  it("owns all calendar rent, initial assembly, actual placement/extraction, whole-group monitoring and original disassembly separately", async () => {
    const result = await compile(selected); expect(result.preliminaryNeeds).toEqual([]);
    expect(q(result, row("rental_set_hours"))).toBe(48);
    expect(q(result, row("assembly:crew_hours"))).toBe(6); expect(q(result, row("assembly:equipment_hours"))).toBe(1);
    expect(q(result, row("installation:crew_hours"))).toBe(10); expect(q(result, row("installation:equipment_hours"))).toBe(7.5);
    expect(q(result, row("monitoring:crew_hours"))).toBe(6); expect(q(result, row("monitoring:equipment_hours"))).toBe(0);
    expect(q(result, row("extraction:crew_hours"))).toBe(6); expect(q(result, row("extraction:equipment_hours"))).toBe(3.75);
    expect(q(result, row("disassembly:crew_hours"))).toBe(1); expect(q(result, row("disassembly:equipment_hours"))).toBe(0);
    const own = result.rows.filter(r => r.row_id.startsWith("rcs:shoring:") && r.included_in_estimate);
    expect(own).toHaveLength(11); expect(own.every(r => r.included_in_procurement)).toBe(true);
    expect(components.scope).toMatchObject({ fullOwner: false, engineeringAccepted: false, readyForPublication: false });
  });
  it("lists actual complete BOM quantities in rent once, without treating included hardware as new purchases or permanent pit displacement", async () => {
    const result = await compile(selected);
    expect(q(result, row("included:base_panels"))).toBe(4); expect(q(result, row("included:fastener_sets"))).toBe(16);
    expect(q(result, row("included:top_panels"))).toBe(0);
    expect(result.rows.filter(r => r.row_id.includes(":included:")).every(r => !r.included_in_estimate && !r.included_in_procurement)).toBe(true);
    const manual = await compile(selected, { [row("included:base_panels")]: { quantity: "999", unitPrice: "100", provenance } });
    expect(manual.rows.find(r => r.row_id === row("included:base_panels"))).toMatchObject({ included_in_estimate: false, included_in_procurement: false });
    expect(q(manual, row("rental_set_hours"))).toBe(48); expect(manual.totals.amount).toBe("0");
    expect(result.rows.some(r => r.row_id.startsWith("rcs:shoring:thrust:") || r.row_id.startsWith("rcs:shoring:reception:"))).toBe(false);
    const pits = await compile({ ...fixture, rcs_civil_installation_method: methods.pipeJacking,
      ...Object.fromEntries(Object.entries(selected).filter(([key]) => key.startsWith("rcs_shoring_trench_")).map(([key, value]) => [key.replace("_trench_", "_thrust_"), value])),
      rcs_shoring_thrust_installed_height_m: 3.2,
    });
    expect(q(pits, "rcs:shoring:thrust:rental_set_hours")).toBe(48);
    expect(q(pits, "rcs:pit-return:total_remaining_space_m3")).toBe(83);
  });
  it("keeps excavation dimensions and material supply packs from inflating actual kits, handling cycles or rent", async () => {
    const result = await compile({ ...selected, rcs_crossing_length_m: 70, rcs_open_cut_excavation_depth_m: 1.8,
      rcs_supplier_bundle_section_count: 100, rcs_retained_spare_section_count: 20 });
    expect(q(result, row("rental_set_hours"))).toBe(48); expect(q(result, row("installation:crew_hours"))).toBe(10);
    expect(q(result, row("monitoring:crew_hours"))).toBe(6); expect(q(result, row("disassembly:crew_hours"))).toBe(1);
    expect(q(result, "rcs:equipment-mobilization:shoring_trench_kits_inbound:complete_unit_count")).toBe(2);
  });
  it("ships and returns original full kits, not multiplied rent hours or placement cycles, with different actual direction masses", async () => {
    const result = await compile(selected);
    expect(q(result, "rcs:equipment-mobilization:shoring_trench_kits_inbound:shipping_mass_kg")).toBe(1000);
    expect(q(result, "rcs:equipment-mobilization:shoring_trench_kits_inbound:trip_count")).toBe(2);
    expect(q(result, "rcs:equipment-mobilization:shoring_trench_kits_return:shipping_mass_kg")).toBe(960);
    expect(q(result, "rcs:equipment-mobilization:shoring_trench_kits_return:trip_count")).toBe(2);
  });
  it("localises an unknown excavation depth to positioning and removal, retaining known rent, assembly, transport, casing and welding", async () => {
    const input = { ...selected }; delete input.rcs_open_cut_excavation_depth_m;
    const result = await compile(input, { [row("installation:crew_hours")]: { quantity: "999", provenance } });
    expect(result.preliminaryNeeds.find(n => n.row_id === row("installation:crew_hours"))?.missing_parameter_ids).toContain("rcs_open_cut_excavation_depth_m");
    expect(result.preliminaryNeeds.find(n => n.row_id === row("extraction:equipment_hours"))?.missing_parameter_ids).toContain("rcs_open_cut_excavation_depth_m");
    expect(q(result, row("rental_set_hours"))).toBe(48); expect(q(result, row("assembly:crew_hours"))).toBe(6);
    expect(q(result, "rcs:equipment-mobilization:shoring_trench_kits_inbound:trip_count")).toBe(2);
    expect(q(result, "rcs:casing:ordered_casing_length_m")).toBe(48); expect(q(result, "rcs:joint:crew_person_hours")).toBe(6);
  });
  it.each(["complete_kit_count", "kit_product_reference", "program_reference", "kit_fastener_sets_per_complete_kit"])("requires original %s before a manual rent override", async fact => {
    const input = { ...selected }; delete input[p(fact)];
    const result = await compile(input, { [row("rental_set_hours")]: { quantity: "999", provenance } });
    expect(result.preliminaryNeeds.find(n => n.row_id === row("rental_set_hours"))?.missing_parameter_ids).toContain(p(fact));
    expect(result.preliminaryNeeds.find(n => n.row_id === row("rental_set_hours"))?.quantity).toBe("999");
    expect(q(result, "rcs:joint:crew_person_hours")).toBe(6);
  });
  it.each([ ["installed_outer_width_m", 2], ["installed_outer_length_m", 40], ["installed_height_m", 1.9],
    ["usable_width_m", 0.5], ["usable_length_m", 2], ["placement_cycle_count", 1] ] as const)("rejects incompatible %s=%s before any manual positioning quantity", async (fact, value) => {
    await expect(compile({ ...selected, [p(fact)]: value }, { [row("installation:crew_hours")]: { quantity: "999", provenance } })).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
  });
  it("retains an unknown rate as missing, accepts proven zero separate machinery and rejects equipment prices including crew", async () => {
    const input = { ...selected }; delete input[p("monitoring_equipment_h_per_unit")];
    const missing = await compile(input); expect(missing.preliminaryNeeds.find(n => n.row_id === row("monitoring:equipment_hours"))?.missing_parameter_ids).toContain(p("monitoring_equipment_h_per_unit"));
    const zero = await compile(selected); expect(q(zero, row("monitoring:equipment_hours"))).toBe(0);
    await expect(compile({ ...selected, [p("installation_equipment_cost_basis")]: "all-in operators and equipment" })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
  it.each([shoringModes.notRequired, shoringModes.otherParty, shoringModes.other])("does not keep obsolete rent/installation/haul charges after changing technology to %s", async mode => {
    const result = await compile({ ...selected, [p("mode")]: mode }, { [row("rental_set_hours")]: { quantity: "999", unitPrice: "3", provenance } });
    expect(result.rows.some(r => r.row_id.startsWith("rcs:shoring:trench:") || r.row_id.startsWith("rcs:equipment-mobilization:shoring_trench_kits_"))).toBe(false);
    expect(q(result, "rcs:casing:ordered_casing_length_m")).toBe(48);
  });
  it("places rent/installation and all removal/return in exactly one actual stage each", () => {
    expect(components.stageMatrix.filter(s => s.ownResourceIds.includes(row("rental_set_hours"))).map(s => s.stageId)).toEqual(["installation"]);
    for (const suffix of ["extraction:crew_hours", "disassembly:equipment_hours"]) {
      expect(components.stageMatrix.filter(s => s.ownResourceIds.includes(row(suffix))).map(s => s.stageId)).toEqual(["completion"]);
    }
    expect(components.stageMatrix.find(s => s.stageId === "completion")?.ownResourceIds).toContain("rcs:equipment-mobilization:shoring_trench_kits_return:trip_count");
  });
});

describe("actual disjoint field coating batches and all their initial resources", () => {
  // Deliberately synthetic single-batch evidence, not manufacturer defaults.
  const coating: Record<string, unknown> = { ...fixture, rcs_coating_mode: coatingModes.wholeKitBrush,
    rcs_coating_program_reference: "TEST actual two separate single batches; feasible conditions/life, nonoverlapping zones, full kits and touched article discard",
    rcs_coating_joint_band_width_m: 0.4, rcs_coating_damage_area_m2: 3,
    ...Object.fromEntries(["joints", "damage"].flatMap(zone => Object.entries({
      allocation_reference: `TEST exclusively allocated single ${zone} batch, no shared mix or material`,
      kit_designation: "TEST compatible complete A+B kit", kit_product_reference: "TEST actual compatible paired kit, thickness, climate/cure/inspection and usability",
      gross_mixed_l_per_m2: 0.6, kit_net_mixed_l: 2, confirmed_single_batch_max_mixed_l: 10,
      compatible_unmixed_kit_stock: 1, retained_kit_reserve: 1, supplier_pack_kit_count: 2, kit_cost_basis: coatingKitBasis,
    }).map(([key, value]) => [`rcs_coating_${zone}_${key}`, value]))),
    ...Object.fromEntries(["joints", "damage"].flatMap(zone => ["preparation", "application", "inspection"].flatMap(work => Object.entries({
      method_reference: `TEST actual compatible ${work}, disjoint work/material and single batch conditions`,
      crew_designation: "TEST all inspectors/operators/applicators", crew_h_per_m2: 0.5, crew_cost_basis: executionBases.crew,
      equipment_designation: "TEST actual compatible whole procedure/equipment/instrument set with energy", equipment_h_per_m2: 0.25, equipment_cost_basis: executionBases.equipment,
    }).map(([key, value]) => [`rcs_coating_${zone}_${work}_${key}`, value])))),
    ...Object.fromEntries(["joints", "damage"].flatMap(zone => ["abrasive", "cleaner", "wipes", "applicators"].flatMap((material, index) => Object.entries({
      gross_per_m2: [0.5, 0.2, 0.5, 0.1][index], product_designation: `TEST actual compatible ${material}`,
      product_reference: "TEST exclusive compatible consumed/discarded article programme; no reusable tooling or recovered stock",
      compatible_stock: material === "cleaner" ? 0.1 : 0, retained_reserve: material === "cleaner" ? 0.2 : 1,
      supplier_pack_net: material === "cleaner" ? 0.5 : 2, cost_basis: coatingConsumableBasis,
    }).map(([key, value]) => [`rcs_coating_${zone}_${material}_${key}`, value])))),
  };
  const row = (zone: string, key: string) => `rcs:coating:${zone}:${key}`;
  const cRow = (zone: string, material: string, key: string) => `rcs:coating-consumable:${zone}:${material}:${key}`;
  it("uses original site joints and full circumference/band width, with separate actual damage, labor/equipment and casing stage", async () => {
    const result = await compile(coating);
    const area = 2 * Math.PI * 0.53 * 0.4;
    expect(result.preliminaryNeeds).toEqual([]);
    expect(q(result, row("joints", "area_m2"))).toBeCloseTo(area, 7);
    expect(q(result, row("damage", "area_m2"))).toBe(3);
    for (const work of ["preparation", "application", "inspection"]) {
      expect(q(result, row("joints", `${work}:crew_hours`))).toBeCloseTo(area * 0.5, 7);
      expect(q(result, row("damage", `${work}:equipment_hours`))).toBe(0.75);
    }
    const changed = await compile({ ...coating, rcs_supplier_bundle_section_count: 10, rcs_retained_spare_section_count: 9, rcs_compatible_stock_section_count: 20 });
    expect(q(changed, row("joints", "area_m2"))).toBe(q(result, row("joints", "area_m2")));
    const stages = components.stageMatrix.filter(stage => stage.ownResourceIds.includes(row("damage", "ordered_kit_count")));
    expect(stages.map(stage => stage.stageId)).toEqual(["casing"]);
    expect(components.scope.fullOwner).toBe(false);
  });
  it("activates whole A+B kits once, separates wet surplus from unopened stock, and charges only new whole paired orders", async () => {
    const result = await compile(coating);
    expect(q(result, row("damage", "gross_mixed_need_l"))).toBe(1.8);
    expect(q(result, row("damage", "activated_kit_count"))).toBe(1);
    expect(q(result, row("damage", "activated_mixed_l"))).toBe(2);
    expect(q(result, row("damage", "activated_surplus_l"))).toBe(0.2);
    expect(q(result, row("damage", "new_kit_need"))).toBe(1);
    expect(q(result, row("damage", "ordered_kit_count"))).toBe(2);
    expect(q(result, row("damage", "remaining_unmixed_kit_count"))).toBe(2);
    expect(q(result, row("damage", "free_unmixed_kit_count"))).toBe(1);
    expect(result.rows.filter(r => r.row_id.startsWith("rcs:coating:damage:") && r.included_in_procurement).map(r => r.row_id)).toEqual([
      row("damage", "ordered_kit_count"), ...["preparation", "application", "inspection"].flatMap(work => [row("damage", `${work}:crew_hours`), row("damage", `${work}:equipment_hours`)])]);
    expect(definition.parameters.some(p => /(?:activated_kit_count|ordered_kit_count|activated_surplus|component_[ab]_order)/u.test(p.parameter_id))).toBe(false);
  });
  it("calculates independent damage and civil work when original joint band width is unknown", async () => {
    const input = { ...coating }; delete input.rcs_coating_joint_band_width_m;
    const result = await compile(input);
    expect(q(result, row("damage", "ordered_kit_count"))).toBe(2);
    expect(q(result, row("damage", "inspection:crew_hours"))).toBe(1.5);
    expect(q(result, "rcs:civil-execution:open_cut:equipment_hours")).toBe(21);
    expect(result.preliminaryNeeds.length).toBeGreaterThan(0);
    expect(result.preliminaryNeeds.every(need => need.missing_parameter_ids.includes("rcs_coating_joint_band_width_m") && !need.row_id.includes(":damage:"))).toBe(true);
  });
  it("explicit zero damage needs no kits, consumables, works or transport and is distinct from missing damage", async () => {
    const input: Record<string, unknown> = { ...coating, rcs_coating_damage_area_m2: 0 };
    for (const key of Object.keys(input)) if (key.startsWith("rcs_coating_damage_") && key !== "rcs_coating_damage_area_m2") delete input[key];
    const result = await compile(input);
    expect(result.preliminaryNeeds).toEqual([]);
    expect(q(result, row("damage", "area_m2"))).toBe(0);
    expect(result.rows.some(r => r.row_id.includes(":damage:") && r.included_in_procurement)).toBe(false);
    const missing = { ...input }; delete missing.rcs_coating_damage_area_m2;
    expect((await compile(missing)).preliminaryNeeds.some(need => need.missing_parameter_ids.includes("rcs_coating_damage_area_m2"))).toBe(true);
  });
  it("a single casing section disables joint bands while damage still calculates and checks its own cylinder limit", async () => {
    const input: Record<string, unknown> = { ...coating, rcs_crossing_length_m: 12 }; delete input.rcs_coating_joint_band_width_m;
    const result = await compile(input);
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.some(r => r.row_id.startsWith("rcs:coating:joints:"))).toBe(false);
    expect(q(result, row("damage", "ordered_kit_count"))).toBe(2);
    await expect(compile({ ...input, rcs_coating_damage_area_m2: 25 })).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
  });
  it("rejects impossible combined areas or a whole mix exceeding actual usable capacity before any manual quantities", async () => {
    await expect(compile({ ...coating, rcs_coating_joint_band_width_m: 20 }, { [row("joints", "area_m2")]: { quantity: "1", provenance } })).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
    await expect(compile({ ...coating, rcs_coating_damage_confirmed_single_batch_max_mixed_l: 1.9 }, { [row("damage", "ordered_kit_count")]: { quantity: "1", provenance } })).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
  });
  it.each(["rcs_casing_inside_diameter_mm", "rcs_coating_program_reference", "rcs_coating_damage_allocation_reference", "rcs_coating_damage_kit_product_reference", "rcs_coating_damage_kit_cost_basis", "rcs_coating_damage_confirmed_single_batch_max_mixed_l"])(
    "manual paid kit cannot bypass original geometry/program/product/batch/cost fact %s", async fact => {
      const input = { ...coating }; delete input[fact];
      const result = await compile(input, { [row("damage", "ordered_kit_count")]: { quantity: "2", provenance } });
      expect(result.rows.some(r => r.row_id === row("damage", "ordered_kit_count"))).toBe(false);
      expect(result.preliminaryNeeds.find(need => need.row_id === row("damage", "ordered_kit_count"))?.missing_parameter_ids).toContain(fact);
    });
  it("unknown supply pack leaves mixed consumption and all actual area-based works known", async () => {
    const input = { ...coating }; delete input.rcs_coating_damage_supplier_pack_kit_count;
    const result = await compile(input);
    expect(q(result, row("damage", "gross_mixed_need_l"))).toBe(1.8);
    expect(q(result, row("damage", "application:crew_hours"))).toBe(1.5);
    expect(result.preliminaryNeeds.every(need => need.missing_parameter_ids.includes("rcs_coating_damage_supplier_pack_kit_count"))).toBe(true);
  });
  it("owns separate cleaner/abrasive/wipe/applicator orders and does not turn pack surplus into additional work", async () => {
    const result = await compile(coating);
    expect(q(result, cRow("damage", "cleaner", "consumed"))).toBe(0.6);
    expect(q(result, cRow("damage", "cleaner", "new_need"))).toBe(0.7);
    expect(q(result, cRow("damage", "cleaner", "ordered"))).toBe(1);
    expect(q(result, cRow("damage", "cleaner", "remaining"))).toBe(0.5);
    expect(q(result, cRow("damage", "cleaner", "free_beyond_reserve"))).toBe(0.3);
    expect(q(result, cRow("damage", "wipes", "consumed"))).toBe(2);
    expect(q(result, cRow("damage", "applicators", "consumed"))).toBe(1);
    const changed = await compile({ ...coating, rcs_coating_damage_cleaner_supplier_pack_net: 5 });
    expect(q(changed, cRow("damage", "cleaner", "ordered"))).toBe(5);
    expect(q(changed, row("damage", "preparation:crew_hours"))).toBe(1.5);
  });
  it("zero gross use excludes only that consumable's product/order/freight; a missing use never becomes zero", async () => {
    const input: Record<string, unknown> = { ...coating, rcs_coating_damage_cleaner_gross_per_m2: 0 }; delete input.rcs_coating_damage_cleaner_product_reference;
    const zero = await compile(input);
    expect(zero.preliminaryNeeds).toEqual([]);
    expect(q(zero, cRow("damage", "cleaner", "consumed"))).toBe(0);
    expect(zero.rows.some(r => r.row_id === cRow("damage", "cleaner", "ordered"))).toBe(false);
    delete input.rcs_coating_damage_cleaner_gross_per_m2;
    expect((await compile(input)).preliminaryNeeds.some(need => need.missing_parameter_ids.includes("rcs_coating_damage_cleaner_gross_per_m2"))).toBe(true);
  });
  it("ships new full kits and unopened cleaner packs separately from compatible opened stock with its own mass/load plan", async () => {
    const input = { ...coating, rcs_freight_coating_damage_kits_new_mode: freightModes.separate,
      rcs_freight_coating_damage_kits_new_vehicle_designation: "TEST compatible complete A+B kit cargo",
      rcs_freight_coating_damage_kits_new_shipping_kg_per_unit: 3, rcs_freight_coating_damage_kits_new_payload_kg: 10,
      rcs_freight_coating_damage_kits_new_max_units_per_trip: 5, rcs_freight_coating_damage_kits_new_cost_basis: freightBasis,
      rcs_freight_coating_damage_cleaner_new_mode: freightModes.separate,
      rcs_freight_coating_damage_cleaner_new_vehicle_designation: "TEST compatible cleaner containers",
      rcs_freight_coating_damage_cleaner_new_shipping_kg_per_unit: 1, rcs_freight_coating_damage_cleaner_new_payload_kg: 10,
      rcs_freight_coating_damage_cleaner_new_max_units_per_trip: 0.75, rcs_freight_coating_damage_cleaner_new_cost_basis: freightBasis,
      rcs_freight_coating_damage_cleaner_offsite_stock_units: 0.1, rcs_freight_coating_damage_cleaner_stock_mode: freightModes.separate,
      rcs_freight_coating_damage_cleaner_stock_vehicle_designation: "TEST separate opened suitable stock",
      rcs_freight_coating_damage_cleaner_stock_shipping_kg_per_unit: 1, rcs_freight_coating_damage_cleaner_stock_payload_kg: 10,
      rcs_freight_coating_damage_cleaner_stock_max_units_per_trip: 0.1, rcs_freight_coating_damage_cleaner_stock_cost_basis: freightBasis };
    const result = await compile(input);
    expect(q(result, "rcs:freight:coating_damage_kits_new:shipping_mass_kg")).toBe(6);
    expect(q(result, "rcs:freight:coating_damage_kits_new:trip_count")).toBe(1);
    expect(q(result, "rcs:freight:coating_damage_cleaner_new:effective_units_per_trip")).toBe(0.5);
    expect(q(result, "rcs:freight:coating_damage_cleaner_new:trip_count")).toBe(2);
    expect(q(result, "rcs:freight:coating_damage_cleaner_stock:trip_count")).toBe(1);
    await expect(compile({ ...input, rcs_freight_coating_damage_cleaner_offsite_stock_units: 0.2 })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
});

describe("actual PE carrier electrofusion resources and independent end ties", () => {
  const connection: Record<string, unknown> = { ...fixture,
    rcs_carrier_connection_mode: connectionModes.electrofusion, rcs_carrier_connection_program_reference: "TEST actual straight uniform PE section layout and separate compatible end ties, complete process/cooling and initial inspection",
    rcs_carrier_supply_mode: carrierModes.newSections, rcs_carrier_total_end_extension_m: 2, rcs_carrier_physical_supply_section_length_m: 6,
    rcs_carrier_damaged_whole_section_count: 0, rcs_carrier_compatible_whole_section_stock_count: 0,
    rcs_carrier_retained_whole_section_count: 0, rcs_carrier_supplier_bundle_section_count: 2, rcs_carrier_pipe_cost_basis: carrierBasis,
    rcs_carrier_connection_end_tie_in_count: 2,
    ...Object.fromEntries(["internal", "ends"].flatMap(group => Object.entries({
      allocation_reference: `TEST exclusive ${group} nodes, materials and disjoint operations`, pipe_wall_thickness_mm: 10, coupler_outside_envelope_mm: 190,
      joining_method_reference: "TEST actual compatible clean/peel/round/clamp/fuse/full cycles/cooling programme, disjoint from insertion/inspection",
      joining_crew_designation: "TEST all joining operators", joining_crew_h_per_joint: 2, joining_crew_cost_basis: executionBases.crew,
      joining_equipment_designation: "TEST whole compatible cutter/peeler/clamp/fusion controller/power/protection set with energy", joining_equipment_h_per_joint: 1.5, joining_equipment_cost_basis: executionBases.equipment,
      inspection_method_reference: "TEST actual initial compatible full joint inspection, no repairs/line testing",
      inspection_crew_designation: "TEST all inspectors", inspection_crew_h_per_joint: 0.25, inspection_crew_cost_basis: executionBases.crew,
      inspection_equipment_designation: "TEST compatible initial instruments with energy", inspection_equipment_h_per_joint: 0.1, inspection_equipment_cost_basis: executionBases.equipment,
      couplers_preinstall_unusable_count: group === "internal" ? 1 : 0,
    }).map(([key, value]) => [`rcs_carrier_connection_${group}_${key}`, value]))),
    ...Object.fromEntries(["internal", "ends"].flatMap(group => ["couplers", "wash_water", "cleaner", "wipes", "markers"].flatMap(material => Object.entries({
      ...(material === "couplers" ? {} : { gross_per_joint: ({ wash_water: 1, cleaner: 0.25, wipes: 2, markers: 0.1 } as Record<string, number>)[material] }),
      product_designation: `TEST compatible ${material}`, product_reference: "TEST actual pipe/complete fitting/media/pressure/SDR/envelope or cleaning/marking/discard compatibility and exclusive allocated usability",
      compatible_stock: material === "couplers" ? 1 : material === "cleaner" ? 0.1 : 0,
      retained_reserve: material === "cleaner" ? 0.2 : 1, supplier_pack_net: material === "couplers" ? 3 : material === "cleaner" ? 0.5 : 2,
      cost_basis: connectionBasis,
    }).map(([key, value]) => [`rcs_carrier_connection_${group}_${material}_${key}`, value])))),
  };
  const row = (group: string, key: string) => `rcs:carrier-connection:${group}:${key}`;
  const mRow = (group: string, material: string, key: string) => `rcs:carrier-connection-material:${group}:${material}:${key}`;
  it("derives internal joints from original installed carrier sections, not casing sections or bought bundles; keeps actual end ties separate", async () => {
    const result = await compile(connection);
    expect(result.preliminaryNeeds).toEqual([]);
    expect(q(result, row("internal", "joint_count"))).toBe(6);
    expect(q(result, row("ends", "joint_count"))).toBe(2);
    expect(q(result, row("internal", "joining:crew_hours"))).toBe(12);
    expect(q(result, row("internal", "joining:equipment_hours"))).toBe(9);
    expect(q(result, row("ends", "inspection:crew_hours"))).toBe(0.5);
    const changed = await compile({ ...connection, rcs_planned_physical_section_length_m: 35,
      rcs_carrier_supplier_bundle_section_count: 20, rcs_carrier_retained_whole_section_count: 8, rcs_carrier_damaged_whole_section_count: 3,
      rcs_carrier_compatible_whole_section_stock_count: 40, rcs_carrier_connection_internal_couplers_preinstall_unusable_count: 4 });
    expect(q(changed, row("internal", "joint_count"))).toBe(6);
    expect(q(changed, row("internal", "joining:crew_hours"))).toBe(12);
    expect(components.stageMatrix.filter(stage => stage.ownResourceIds.includes(mRow("internal", "couplers", "ordered"))).map(stage => stage.stageId)).toEqual(["carrier_and_supports"]);
  });
  it("uses one complete coupler per real node, adds only actual preinstall losses and reserve to purchases, and retains usable balances", async () => {
    const result = await compile(connection);
    expect(q(result, mRow("internal", "couplers", "consumed"))).toBe(7);
    expect(q(result, mRow("internal", "couplers", "new_need"))).toBe(7);
    expect(q(result, mRow("internal", "couplers", "ordered"))).toBe(9);
    expect(q(result, mRow("internal", "couplers", "remaining"))).toBe(3);
    expect(q(result, mRow("internal", "couplers", "free_beyond_reserve"))).toBe(2);
    expect(q(result, mRow("internal", "cleaner", "consumed"))).toBe(1.5);
    expect(q(result, mRow("internal", "cleaner", "ordered"))).toBe(2);
    expect(q(result, mRow("internal", "cleaner", "free_beyond_reserve"))).toBe(0.4);
    expect(q(result, mRow("internal", "wipes", "consumed"))).toBe(12);
    expect(q(result, mRow("internal", "markers", "consumed"))).toBe(1);
    expect(result.rows.filter(r => r.row_id.startsWith("rcs:carrier-connection-material:") && r.included_in_procurement).length).toBe(10);
    expect(definition.parameters.some(p => /carrier_connection.*(?:joint_count|ordered|remaining)/u.test(p.parameter_id))).toBe(false);
  });
  it("unknown actual end ties leave internal fitting orders and all internal work known; zero ties disable only that group's resources", async () => {
    const input = { ...connection }; delete input.rcs_carrier_connection_end_tie_in_count;
    const unknown = await compile(input);
    expect(q(unknown, row("internal", "joining:crew_hours"))).toBe(12);
    expect(q(unknown, mRow("internal", "couplers", "ordered"))).toBe(9);
    expect(unknown.preliminaryNeeds.every(need => need.missing_parameter_ids.includes("rcs_carrier_connection_end_tie_in_count"))).toBe(true);
    const zero: Record<string, unknown> = { ...connection, rcs_carrier_connection_end_tie_in_count: 0 };
    for (const key of Object.keys(zero)) if (key.startsWith("rcs_carrier_connection_ends_")) delete zero[key];
    const result = await compile(zero);
    expect(result.preliminaryNeeds).toEqual([]);
    expect(q(result, row("ends", "joint_count"))).toBe(0);
    expect(result.rows.some(r => /carrier-connection(?:-material)?:ends:/u.test(r.row_id) && r.included_in_procurement)).toBe(false);
  });
  it("missing original carrier section length leaves actual end ties and casing/civil work independent", async () => {
    const input = { ...connection }; delete input.rcs_carrier_physical_supply_section_length_m;
    const result = await compile(input);
    expect(q(result, row("ends", "joining:crew_hours"))).toBe(4);
    expect(q(result, mRow("ends", "couplers", "ordered"))).toBe(3);
    expect(q(result, "rcs:mechanical:casing_preparation:crew_hours")).toBe(3);
    expect(result.preliminaryNeeds.every(need => need.missing_parameter_ids.includes("rcs_carrier_physical_supply_section_length_m"))).toBe(true);
  });
  it.each(["rcs_carrier_connection_program_reference", "rcs_carrier_connection_internal_allocation_reference", "rcs_carrier_connection_internal_couplers_product_reference", "rcs_carrier_connection_internal_joining_method_reference", "rcs_carrier_connection_internal_pipe_wall_thickness_mm", "rcs_carrier_connection_internal_couplers_cost_basis"])(
    "manual coupler order retains mandatory original compatibility/program/cost gate %s", async fact => {
      const input = { ...connection }; delete input[fact];
      const result = await compile(input, { [mRow("internal", "couplers", "ordered")]: { quantity: "9", provenance } });
      expect(result.preliminaryNeeds.find(need => need.row_id === mRow("internal", "couplers", "ordered"))?.missing_parameter_ids).toContain(fact);
      expect(result.rows.some(r => r.row_id === mRow("internal", "couplers", "ordered"))).toBe(false);
    });
  it("rejects unconfirmed supply layout, impossible wall or incompatible fitting envelope before manual orders", async () => {
    const override = { [mRow("internal", "couplers", "ordered")]: { quantity: "1", provenance } };
    await expect(compile({ ...connection, rcs_carrier_supply_mode: carrierModes.customerSupplied }, override)).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
    await expect(compile({ ...connection, rcs_carrier_connection_internal_pipe_wall_thickness_mm: 80 }, override)).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
    await expect(compile({ ...connection, rcs_carrier_connection_internal_coupler_outside_envelope_mm: 201 }, override)).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compile({ ...connection, rcs_carrier_connection_end_tie_in_count: 3 })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
  it("missing cleaner supply packaging keeps actual cleaner consumption and full joining/cooling work known", async () => {
    const input = { ...connection }; delete input.rcs_carrier_connection_internal_cleaner_supplier_pack_net;
    const result = await compile(input);
    expect(q(result, mRow("internal", "cleaner", "consumed"))).toBe(1.5);
    expect(q(result, row("internal", "joining:equipment_hours"))).toBe(9);
    expect(result.preliminaryNeeds.every(need => need.missing_parameter_ids.includes("rcs_carrier_connection_internal_cleaner_supplier_pack_net"))).toBe(true);
  });
  it("unknown preinstall unusable couplers leave actual joining and initial inspection known instead of assuming zero loss", async () => {
    const input = { ...connection }; delete input.rcs_carrier_connection_internal_couplers_preinstall_unusable_count;
    const result = await compile(input);
    expect(q(result, row("internal", "joining:crew_hours"))).toBe(12);
    expect(q(result, row("internal", "inspection:equipment_hours"))).toBe(0.6);
    expect(result.preliminaryNeeds.every(need => need.missing_parameter_ids.includes("rcs_carrier_connection_internal_couplers_preinstall_unusable_count"))).toBe(true);
    expect(result.rows.some(r => r.row_id === mRow("internal", "couplers", "ordered"))).toBe(false);
  });
  it("ships selected fittings as whole units and cleaner in full new containers, preserving original joint work", async () => {
    const result = await compile({ ...connection,
      ...Object.fromEntries(["couplers", "cleaner"].flatMap(material => Object.entries({ mode: freightModes.separate,
        vehicle_designation: `TEST dedicated compatible ${material} cargo`, shipping_kg_per_unit: material === "couplers" ? 3 : 1,
        payload_kg: 10, max_units_per_trip: material === "couplers" ? 5 : 0.75, cost_basis: freightBasis,
      }).map(([key, value]) => [`rcs_freight_carrier_connection_internal_${material}_new_${key}`, value]))),
    });
    expect(q(result, "rcs:freight:carrier_connection_internal_couplers_new:cargo_units")).toBe(9);
    expect(q(result, "rcs:freight:carrier_connection_internal_couplers_new:trip_count")).toBe(3);
    expect(q(result, "rcs:freight:carrier_connection_internal_cleaner_new:effective_units_per_trip")).toBe(0.5);
    expect(q(result, "rcs:freight:carrier_connection_internal_cleaner_new:trip_count")).toBe(4);
    expect(q(result, row("internal", "joining:crew_hours"))).toBe(12);
  });
});

describe("actual rented hydraulic sump pumping and separate group fuel", () => {
  const water: Record<string, unknown> = { ...fixture, rcs_water_control_mode: waterControlModes.hydraulicRental,
    rcs_water_treatment_mode: waterTreatmentModes.otherParty, rcs_water_treatment_program_reference: "TEST actual separate party owns all required water treatment resources, no executor charge",
    rcs_water_receiving_mode: waterReceivingModes.otherParty, rcs_water_receiving_excluded_water_m3: 0,
    rcs_water_receiving_allocation_reference: "TEST actual one compatible receiver, no duplicate fee, whole output stream with explicit zero other allocation",
    rcs_water_control_program_reference: "TEST actual homogeneous hydraulic fuel-powered kit group, original water/head/flow/duty/discharge, no groundwater design approval",
    rcs_water_control_allocation_reference: "TEST exclusively allocated whole deployment period and actual standby sets, disjoint fuel/labor/lifts",
    rcs_water_control_kit_designation: "TEST actual full leased hydraulic pump/powerpack/lines/connectors/protection set",
    rcs_water_control_kit_product_reference: "TEST full actual kit BOM/rental and each pump/powerpack/line/connection passport, compatible water/head/particles, lease excludes fuel",
    rcs_water_control_discharge_reference: "TEST actual water quality/classification/receiver/route and separately bounded treatment/receiving; no automatic permission",
    rcs_water_control_working_set_count: 2, rcs_water_control_standby_set_count: 1, rcs_water_control_calendar_hours: 24,
    rcs_water_control_working_duty_fraction: 0.5, rcs_water_control_actual_system_head_m: 12,
    rcs_water_control_flow_at_actual_head_m3_h: 5, rcs_water_control_required_average_inflow_m3_h: 4,
    rcs_water_control_kit_discharge_hose_m: 30, rcs_water_control_kit_hydraulic_supply_hose_m: 10, rcs_water_control_kit_hydraulic_return_hose_m: 10,
    rcs_water_control_kit_coupling_count: 6, rcs_water_control_kit_strainer_count: 1, rcs_water_control_kit_valve_count: 2,
    rcs_water_control_operation_method_reference: "TEST complete actual whole-group operation/idle/control shutdown and draining procedure, exclusive labor/fuel boundary",
    rcs_water_control_operation_crew_designation: "TEST all group operators/inspectors", rcs_water_control_operation_all_crew_h_per_calendar_hour: 0.5,
    rcs_water_control_operation_crew_cost_basis: executionBases.crew, rcs_water_control_rental_cost_basis: waterControlRentalBasis,
    ...Object.fromEntries(["setup", "removal"].flatMap(work => Object.entries({ method_reference: "TEST compatible whole kit lift/assembly/connection or isolation/drainage/removal, disjoint operation crew",
      crew_designation: "TEST all installation/removal personnel", crew_h_per_set: work === "setup" ? 2 : 1, crew_cost_basis: executionBases.crew,
      equipment_designation: "TEST compatible separate lifting equipment and rigging with energy", equipment_h_per_set: work === "setup" ? 0.5 : 0.25, equipment_cost_basis: executionBases.equipment,
    }).map(([key, value]) => [`rcs_water_control_${work}_${key}`, value]))),
    rcs_water_control_gross_fuel_l_per_deployed_set_hour: 0.2, rcs_water_control_fuel_product_designation: "TEST compatible actual powerpack fuel",
    rcs_water_control_fuel_product_reference: "TEST fuel compatibility/usability and actual weighted full working/idle/standby consumption profile including all losses once",
    rcs_water_control_fuel_compatible_stock_l: 5, rcs_water_control_fuel_retained_reserve_l: 2, rcs_water_control_fuel_supplier_pack_net_l: 10,
    rcs_water_control_fuel_cost_basis: waterControlFuelBasis,
  };
  const row = (key: string) => `rcs:water-control:${key}`;
  it("separates deployed rental, actual operating time/water and standby; shows real included hoses/connections without duplicate purchase", async () => {
    const result = await compile(water);
    expect(result.preliminaryNeeds).toEqual([]);
    expect(q(result, row("deployed_set_count"))).toBe(3);
    expect(q(result, row("rental_set_hours"))).toBe(72);
    expect(q(result, row("operating_pump_hours"))).toBe(24);
    expect(q(result, row("pumped_water_m3"))).toBe(120);
    expect(q(result, row("available_average_flow_m3_h"))).toBe(1);
    expect(q(result, row("kit:discharge_hose_m"))).toBe(90);
    expect(q(result, row("kit:coupling_count"))).toBe(18);
    expect(result.rows.filter(r => r.row_id.startsWith(row("kit:"))).every(r => !r.included_in_procurement)).toBe(true);
    expect(q(result, row("setup:crew_hours"))).toBe(6);
    expect(q(result, row("removal:equipment_hours"))).toBe(0.75);
    expect(q(result, row("operation_crew_hours"))).toBe(12);
    expect(components.stageMatrix.filter(stage => stage.ownResourceIds.includes(row("removal:crew_hours"))).map(stage => stage.stageId)).toEqual(["completion"]);
    expect(components.stageMatrix.filter(stage => stage.ownResourceIds.includes(row("rental_set_hours"))).map(stage => stage.stageId)).toEqual(["installation"]);
  });
  it("does not derive pumped water or period from excavation; extra standby alters deployed resources without pumping or multiplying whole-group crew", async () => {
    const longer = await compile({ ...water, rcs_crossing_length_m: 70 });
    expect(q(longer, row("pumped_water_m3"))).toBe(120);
    expect(q(longer, row("rental_set_hours"))).toBe(72);
    const standby = await compile({ ...water, rcs_water_control_standby_set_count: 2 });
    expect(q(standby, row("rental_set_hours"))).toBe(96);
    expect(q(standby, row("pumped_water_m3"))).toBe(120);
    expect(q(standby, row("operation_crew_hours"))).toBe(12);
  });
  it("owns only new separately priced fuel, includes the documented entire regime once, and retains stock/reserve/pack surplus", async () => {
    const result = await compile(water);
    expect(q(result, row("fuel:consumed_l"))).toBe(14.4);
    expect(q(result, row("fuel:new_need_l"))).toBe(11.4);
    expect(q(result, row("fuel:ordered_l"))).toBe(20);
    expect(q(result, row("fuel:remaining_l"))).toBe(10.6);
    expect(q(result, row("fuel:free_beyond_reserve_l"))).toBe(8.6);
    const stock = await compile({ ...water, rcs_water_control_fuel_compatible_stock_l: 20 });
    expect(q(stock, row("fuel:ordered_l"))).toBe(0);
    expect(q(stock, row("operating_pump_hours"))).toBe(24);
    expect(stock.rows.some(r => r.row_id.startsWith("rcs:freight:water_control_fuel_new:"))).toBe(false);
  });
  it("unknown duty leaves rental, setup, removal and known fuel/civil quantities calculable while dependent water/average-flow needs remain", async () => {
    const input = { ...water }; delete input.rcs_water_control_working_duty_fraction;
    const result = await compile(input);
    expect(q(result, row("rental_set_hours"))).toBe(72);
    expect(q(result, row("setup:crew_hours"))).toBe(6);
    expect(q(result, row("fuel:consumed_l"))).toBe(14.4);
    expect(q(result, "rcs:civil-execution:open_cut:equipment_hours")).toBe(21);
    expect(result.preliminaryNeeds.every(need => need.missing_parameter_ids.includes("rcs_water_control_working_duty_fraction"))).toBe(true);
  });
  it("missing fuel packaging leaves full consumption, pump water, crew and lease known", async () => {
    const input = { ...water }; delete input.rcs_water_control_fuel_supplier_pack_net_l;
    const result = await compile(input);
    expect(q(result, row("fuel:consumed_l"))).toBe(14.4);
    expect(q(result, row("pumped_water_m3"))).toBe(120);
    expect(q(result, row("operation_crew_hours"))).toBe(12);
    expect(result.preliminaryNeeds.every(need => need.missing_parameter_ids.includes("rcs_water_control_fuel_supplier_pack_net_l"))).toBe(true);
  });
  it("uses actual full new fuel containers and separately allocated opened stock in certified freight", async () => {
    const result = await compile({ ...water,
      rcs_freight_water_control_fuel_new_mode: freightModes.separate, rcs_freight_water_control_fuel_new_vehicle_designation: "TEST compatible actual fuel route/container load",
      rcs_freight_water_control_fuel_new_shipping_kg_per_unit: 0.9, rcs_freight_water_control_fuel_new_payload_kg: 100,
      rcs_freight_water_control_fuel_new_max_units_per_trip: 15, rcs_freight_water_control_fuel_new_cost_basis: freightBasis,
      rcs_freight_water_control_fuel_offsite_stock_units: 1, rcs_freight_water_control_fuel_stock_mode: freightModes.separate,
      rcs_freight_water_control_fuel_stock_vehicle_designation: "TEST exclusive compatible opened stock shipment",
      rcs_freight_water_control_fuel_stock_shipping_kg_per_unit: 1, rcs_freight_water_control_fuel_stock_payload_kg: 100,
      rcs_freight_water_control_fuel_stock_max_units_per_trip: 1, rcs_freight_water_control_fuel_stock_cost_basis: freightBasis,
    });
    expect(q(result, "rcs:freight:water_control_fuel_new:effective_units_per_trip")).toBe(10);
    expect(q(result, "rcs:freight:water_control_fuel_new:trip_count")).toBe(2);
    expect(q(result, "rcs:freight:water_control_fuel_stock:trip_count")).toBe(1);
  });
  it("rejects inadequate actual average flow or hiding active fuel-powered work with zero fuel before manual leases/orders", async () => {
    await expect(compile({ ...water, rcs_water_control_required_average_inflow_m3_h: 6 }, { [row("rental_set_hours")]: { quantity: "72", provenance } })).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
    await expect(compile({ ...water, rcs_water_control_gross_fuel_l_per_deployed_set_hour: 0 }, { [row("fuel:ordered_l")]: { quantity: "20", provenance } })).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
    await expect(compile({ ...water, rcs_water_control_working_duty_fraction: 1.1 })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
  it("explicit idle-only zero pumping/fuel disables fuel product/order/freight while retaining a real leased deployment", async () => {
    const input: Record<string, unknown> = { ...water, rcs_water_control_working_duty_fraction: 0,
      rcs_water_control_required_average_inflow_m3_h: 0, rcs_water_control_gross_fuel_l_per_deployed_set_hour: 0 };
    for (const key of Object.keys(input)) if (key.startsWith("rcs_water_control_fuel_")) delete input[key];
    const result = await compile(input);
    expect(result.preliminaryNeeds).toEqual([]);
    expect(q(result, row("pumped_water_m3"))).toBe(0);
    expect(q(result, row("fuel:consumed_l"))).toBe(0);
    expect(q(result, row("rental_set_hours"))).toBe(72);
    expect(result.rows.some(r => r.row_id === row("fuel:ordered_l"))).toBe(false);
  });
  it.each(["rcs_water_control_program_reference", "rcs_water_control_kit_product_reference", "rcs_water_control_actual_system_head_m", "rcs_water_control_kit_coupling_count", "rcs_water_control_discharge_reference", "rcs_water_control_rental_cost_basis"])(
    "manual rental retains original full-kit/hydraulics/discharge/price gate %s", async fact => {
      const input = { ...water }; delete input[fact];
      const result = await compile(input, { [row("rental_set_hours")]: { quantity: "72", provenance } });
      expect(result.rows.some(r => r.row_id === row("rental_set_hours"))).toBe(false);
      expect(result.preliminaryNeeds.find(need => need.row_id === row("rental_set_hours"))?.missing_parameter_ids).toContain(fact);
    });
  const receiving = { ...water, rcs_water_receiving_mode: waterReceivingModes.separate, rcs_water_receiving_excluded_water_m3: 8,
    rcs_water_receiving_receiver_designation: "TEST actual receiver full bounded water receiving service",
    rcs_water_receiving_receiver_reference: "TEST actual quality/route/period/capacity/unit-account and full receiving service, separate onsite pump/filter/waste boundaries",
    rcs_water_receiving_cost_basis: waterReceivingBasis };
  const receivingRow = "rcs:water-receiving:separate_receiving_m3";
  it("owns only actual remaining receiver water, keeps other allocations/pumping/fuel distinct and belongs to completion", async () => {
    const result = await compile(receiving);
    expect(result.preliminaryNeeds).toEqual([]); expect(q(result, receivingRow)).toBe(112);
    expect(q(result, "rcs:water-receiving:allocated_water_m3")).toBe(112);
    expect(q(result, row("pumped_water_m3"))).toBe(120); expect(q(result, row("rental_set_hours"))).toBe(72);
    expect(result.rows.filter(r => r.row_id.startsWith("rcs:water-receiving:") && r.included_in_estimate)).toHaveLength(1);
    expect(components.stageMatrix.filter(stage => stage.ownResourceIds.includes(receivingRow)).map(stage => stage.stageId)).toEqual(["completion"]);
    const outside = await compile({ ...receiving, rcs_open_cut_excavation_width_m: 5 });
    expect(q(outside, receivingRow)).toBe(112);
  });
  it("unknown receiving allocation stays local while independently known pump/fuel/civil work calculates", async () => {
    const input: Record<string, unknown> = { ...receiving }; delete input.rcs_water_receiving_excluded_water_m3;
    const result = await compile(input);
    expect(q(result, row("pumped_water_m3"))).toBe(120); expect(q(result, row("fuel:ordered_l"))).toBe(20);
    expect(q(result, "rcs:civil-execution:open_cut:equipment_hours")).toBe(21);
    expect(result.preliminaryNeeds.every(need => need.missing_parameter_ids.includes("rcs_water_receiving_excluded_water_m3"))).toBe(true);
  });
  it("rejects water over-allocation before a manual receiving fee and never derives permission from quantity", async () => {
    await expect(compile({ ...receiving, rcs_water_receiving_excluded_water_m3: 121 }, { [receivingRow]: { quantity: "112", provenance } })).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
  });
  it("other-party receiving and explicitly all-other water create no second fee; zero pumping needs no receiver facts", async () => {
    const other = await compile({ ...receiving, rcs_water_receiving_mode: waterReceivingModes.otherParty });
    expect(q(other, "rcs:water-receiving:allocated_water_m3")).toBe(112);
    expect(other.rows.some(r => r.row_id === receivingRow)).toBe(false);
    const allOther: Record<string, unknown> = { ...receiving, rcs_water_receiving_excluded_water_m3: 120 };
    delete allOther.rcs_water_receiving_receiver_designation; delete allOther.rcs_water_receiving_receiver_reference; delete allOther.rcs_water_receiving_cost_basis;
    const result = await compile(allOther); expect(result.preliminaryNeeds).toEqual([]);
    expect(q(result, "rcs:water-receiving:allocated_water_m3")).toBe(0); expect(result.rows.some(r => r.row_id === receivingRow)).toBe(false);
    const idle: Record<string, unknown> = { ...water, rcs_water_control_working_duty_fraction: 0, rcs_water_control_required_average_inflow_m3_h: 0 };
    for (const key of Object.keys(idle)) if (key.startsWith("rcs_water_receiving_")) delete idle[key];
    const idleResult = await compile(idle); expect(idleResult.preliminaryNeeds).toEqual([]);
    expect(idleResult.rows.some(r => r.row_id.startsWith("rcs:water-receiving:"))).toBe(false);
  });
  it.each(["rcs_water_control_working_set_count", "rcs_water_control_calendar_hours", "rcs_water_control_working_duty_fraction", "rcs_water_control_flow_at_actual_head_m3_h", "rcs_water_control_actual_system_head_m", "rcs_water_control_discharge_reference", "rcs_water_receiving_excluded_water_m3", "rcs_water_receiving_allocation_reference", "rcs_water_receiving_receiver_reference", "rcs_water_receiving_cost_basis"])(
    "manual receiving retains original water/receiver/cost gate %s", async fact => {
      const input: Record<string, unknown> = { ...receiving }; delete input[fact];
      const result = await compile(input, { [receivingRow]: { quantity: "112", provenance } });
      expect(result.rows.some(r => r.row_id === receivingRow)).toBe(false);
      expect(result.preliminaryNeeds.find(need => need.row_id === receivingRow)?.missing_parameter_ids).toContain(fact);
    });
  const treatment: Record<string, unknown> = { ...water, rcs_water_treatment_mode: waterTreatmentModes.singleBag,
    rcs_water_treatment_waste_mode: waterWasteModes.otherParty, rcs_water_treatment_waste_program_reference: "TEST separate party owns complete actual bag waste resources, no executor cost",
    rcs_water_treatment_program_reference: "TEST actual homogeneous once-through whole water group, simultaneous working pumps, one common single-bag kit, pressure/differential/quality programme, no other treatment approval",
    rcs_water_treatment_allocation_reference: "TEST one exclusively allocated common housing and complete kit/service supplies for entire period, no duplicate pump hose/personnel/service energy",
    rcs_water_treatment_kit_designation: "TEST complete actual single-bag passive leased kit with basket/connections/support/isolation/drain/vent/measurement/protection",
    rcs_water_treatment_kit_product_reference: "TEST all actual component passports and full kit/service BOM, actual water/pressure/flow/conditions compatible, filter losses already in pump system head, all actual service supplies included, no unaccounted onsite fluids",
    rcs_water_treatment_confirmed_max_flow_m3_h: 15, rcs_water_treatment_actual_max_housing_pressure_bar: 2, rcs_water_treatment_rated_max_housing_pressure_bar: 4,
    rcs_water_treatment_kit_interconnecting_hose_m: 4, rcs_water_treatment_kit_coupling_count: 4, rcs_water_treatment_kit_valve_node_count: 4,
    rcs_water_treatment_kit_pressure_device_count: 2, rcs_water_treatment_kit_service_gasket_count: 10, rcs_water_treatment_kit_service_cleaner_l: 0.2,
    rcs_water_treatment_kit_service_lubricant_kg: 0.01, rcs_water_treatment_kit_service_wipe_count: 20,
    rcs_water_treatment_rental_cost_basis: waterTreatmentRentalBasis,
    rcs_water_treatment_bag_product_designation: "TEST actual whole compatible bag",
    rcs_water_treatment_bag_product_reference: "TEST actual bag/seal compatibility and exclusively allocated usable stock; effective uniform-water batch capacity before required pressure/condition change, not manufacturer norm",
    rcs_water_treatment_bag_effective_capacity_m3: 50, rcs_water_treatment_bag_actual_preinstall_unusable_count: 1,
    rcs_water_treatment_bag_compatible_stock_count: 1, rcs_water_treatment_bag_retained_reserve_count: 2, rcs_water_treatment_bag_supplier_pack_count: 4,
    rcs_water_treatment_bag_cost_basis: waterTreatmentBagBasis,
    ...Object.fromEntries(["setup", "removal", "bag_cycle", "monitoring"].flatMap((work, i) => Object.entries({
      method_reference: "TEST complete actual disjoint filter procedure, bag first insertion/final removal and all depressurizing/draining/checks once; no duplicate pump operators, equipment 0 means explicit actual no separate machinery",
      crew_designation: "TEST all filter personnel including actual operators", equipment_designation: "TEST all separate compatible filter machinery with energy; actual zero if passive included tooling suffices",
      crew_h_per_unit: [2, 1, 0.4, 0.1][i], equipment_h_per_unit: [0.25, 0.1, 0, 0][i],
      crew_cost_basis: executionBases.crew, equipment_cost_basis: executionBases.equipment,
    }).map(([key, value]) => [`rcs_water_treatment_${work}_${key}`, value]))),
  };
  const filterRow = (key: string) => `rcs:water-treatment:${key}`;
  it("owns one common complete passive kit and all disjoint setup/monitoring/bag-cycle/removal work rather than a filter per pump", async () => {
    const result = await compile(treatment); expect(result.preliminaryNeeds).toEqual([]);
    expect(q(result, filterRow("deployed_kit_count"))).toBe(1); expect(q(result, filterRow("rental_set_hours"))).toBe(24);
    expect(q(result, filterRow("filtered_water_m3"))).toBe(120); expect(q(result, filterRow("flow_capacity_margin_m3_h"))).toBe(5);
    expect(q(result, filterRow("pressure_margin_bar"))).toBe(2); expect(q(result, filterRow("setup:crew_hours"))).toBe(2);
    expect(q(result, filterRow("bag_cycle:crew_hours"))).toBe(1.2); expect(q(result, filterRow("monitoring:crew_hours"))).toBe(2.4);
    expect(q(result, filterRow("removal:equipment_hours"))).toBe(0.1);
    expect(q(result, filterRow("kit:service_gasket_count"))).toBe(10);
    expect(result.rows.filter(r => r.row_id.startsWith(filterRow("kit:"))).every(r => !r.included_in_estimate && !r.included_in_procurement)).toBe(true);
    expect(components.stageMatrix.filter(stage => stage.ownResourceIds.includes(filterRow("removal:crew_hours"))).map(stage => stage.stageId)).toEqual(["completion"]);
    expect(components.stageMatrix.filter(stage => stage.ownResourceIds.includes(filterRow("bags:wet_used_count"))).map(stage => stage.stageId)).toEqual(["completion"]);
    const standby = await compile({ ...treatment, rcs_water_control_standby_set_count: 2 });
    expect(q(standby, filterRow("rental_set_hours"))).toBe(24); expect(q(standby, filterRow("bags:used_count"))).toBe(3);
  });
  it("keeps used/wet/discarded/unopened stock/reserve/full packages separate and prices only the new rounded bag order", async () => {
    const result = await compile(treatment);
    expect(q(result, filterRow("bags:used_count"))).toBe(3); expect(q(result, filterRow("bags:wet_used_count"))).toBe(3);
    expect(q(result, filterRow("bags:consumed_count"))).toBe(4); expect(q(result, filterRow("bags:new_need_count"))).toBe(5);
    expect(q(result, filterRow("bags:supplier_pack_count"))).toBe(2); expect(q(result, filterRow("bags:ordered_count"))).toBe(8);
    expect(q(result, filterRow("bags:remaining_count"))).toBe(5); expect(q(result, filterRow("bags:free_beyond_reserve_count"))).toBe(3);
    const stock = await compile({ ...treatment, rcs_water_treatment_bag_compatible_stock_count: 10 });
    expect(q(stock, filterRow("bags:ordered_count"))).toBe(0); expect(q(stock, filterRow("bags:remaining_count"))).toBe(6);
    expect(q(stock, filterRow("bag_cycle:crew_hours"))).toBe(1.2);
    expect(stock.rows.some(r => r.row_id.startsWith("rcs:freight:water_treatment_bags_new:"))).toBe(false);
  });
  it("unknown actual bag capacity leaves filter rental/setup/monitoring, pumping, fuel and civil work independent", async () => {
    const input = { ...treatment }; delete input.rcs_water_treatment_bag_effective_capacity_m3;
    const result = await compile(input);
    expect(q(result, filterRow("rental_set_hours"))).toBe(24); expect(q(result, filterRow("setup:crew_hours"))).toBe(2);
    expect(q(result, filterRow("monitoring:crew_hours"))).toBe(2.4); expect(q(result, row("pumped_water_m3"))).toBe(120);
    expect(q(result, row("fuel:ordered_l"))).toBe(20); expect(q(result, "rcs:civil-execution:open_cut:equipment_hours")).toBe(21);
    expect(result.preliminaryNeeds.every(need => need.missing_parameter_ids.includes("rcs_water_treatment_bag_effective_capacity_m3"))).toBe(true);
  });
  it("unknown supplier packaging retains actual used bags and full bag-cycle work; actual preinstall rejects do not add filtering cycles", async () => {
    const input = { ...treatment }; delete input.rcs_water_treatment_bag_supplier_pack_count;
    const result = await compile(input); expect(q(result, filterRow("bags:used_count"))).toBe(3);
    expect(q(result, filterRow("bags:consumed_count"))).toBe(4); expect(q(result, filterRow("bag_cycle:crew_hours"))).toBe(1.2);
    expect(result.preliminaryNeeds.every(need => need.missing_parameter_ids.includes("rcs_water_treatment_bag_supplier_pack_count"))).toBe(true);
  });
  it("checks instantaneous full-group flow rather than average duty and actual rated pressure before manual bags/rental", async () => {
    await expect(compile({ ...treatment, rcs_water_treatment_confirmed_max_flow_m3_h: 6 }, { [filterRow("bags:ordered_count")]: { quantity: "8", provenance } })).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
    await expect(compile({ ...treatment, rcs_water_control_working_duty_fraction: 0.05, rcs_water_control_required_average_inflow_m3_h: 0, rcs_water_treatment_confirmed_max_flow_m3_h: 6 })).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
    await expect(compile({ ...treatment, rcs_water_treatment_actual_max_housing_pressure_bar: 5 }, { [filterRow("rental_set_hours")]: { quantity: "24", provenance } })).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
  });
  it("explicit idle zero water keeps the deployed filter rental while bag products/orders/cycles are inactive", async () => {
    const input: Record<string, unknown> = { ...treatment, rcs_water_control_working_duty_fraction: 0, rcs_water_control_required_average_inflow_m3_h: 0 };
    for (const key of Object.keys(input)) if (key.startsWith("rcs_water_treatment_bag_") && !key.startsWith("rcs_water_treatment_bag_cycle_")) delete input[key];
    const result = await compile(input); expect(result.preliminaryNeeds).toEqual([]);
    expect(q(result, filterRow("filtered_water_m3"))).toBe(0); expect(q(result, filterRow("rental_set_hours"))).toBe(24);
    expect(result.rows.some(r => r.row_id.startsWith(filterRow("bags:")) || r.row_id.startsWith(filterRow("bag_cycle:")))).toBe(false);
  });
  it("ships actual full new bag packages separately from individually allocated offsite stock without changing used bags", async () => {
    const input = { ...treatment,
      rcs_freight_water_treatment_bags_new_mode: freightModes.separate, rcs_freight_water_treatment_bags_new_vehicle_designation: "TEST actual dedicated full-package filter bag vehicle",
      rcs_freight_water_treatment_bags_new_shipping_kg_per_unit: 0.5, rcs_freight_water_treatment_bags_new_payload_kg: 20,
      rcs_freight_water_treatment_bags_new_max_units_per_trip: 6, rcs_freight_water_treatment_bags_new_cost_basis: freightBasis,
      rcs_freight_water_treatment_bags_offsite_stock_units: 1, rcs_freight_water_treatment_bags_stock_mode: freightModes.separate,
      rcs_freight_water_treatment_bags_stock_vehicle_designation: "TEST actual individually allocated usable bag stock delivery",
      rcs_freight_water_treatment_bags_stock_shipping_kg_per_unit: 0.2, rcs_freight_water_treatment_bags_stock_payload_kg: 20,
      rcs_freight_water_treatment_bags_stock_max_units_per_trip: 1, rcs_freight_water_treatment_bags_stock_cost_basis: freightBasis };
    const result = await compile(input);
    expect(q(result, "rcs:freight:water_treatment_bags_new:effective_units_per_trip")).toBe(4);
    expect(q(result, "rcs:freight:water_treatment_bags_new:trip_count")).toBe(2);
    expect(q(result, "rcs:freight:water_treatment_bags_stock:trip_count")).toBe(1);
    expect(q(result, filterRow("bags:used_count"))).toBe(3);
    await expect(compile({ ...input, rcs_freight_water_treatment_bags_new_payload_kg: 1 }, {
      "rcs:freight:water_treatment_bags_new:trip_count": { quantity: "2", provenance },
    })).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
  });
  it.each(["rcs_water_control_working_duty_fraction", "rcs_water_control_flow_at_actual_head_m3_h", "rcs_water_control_actual_system_head_m", "rcs_water_treatment_program_reference", "rcs_water_treatment_kit_product_reference", "rcs_water_treatment_bag_effective_capacity_m3", "rcs_water_treatment_bag_product_reference", "rcs_water_treatment_bag_cost_basis"])(
    "manual filter bag order retains original water/compatibility/capacity/cost gate %s", async fact => {
      const input = { ...treatment }; delete input[fact];
      const result = await compile(input, { [filterRow("bags:ordered_count")]: { quantity: "8", provenance } });
      expect(result.rows.some(r => r.row_id === filterRow("bags:ordered_count"))).toBe(false);
      expect(result.preliminaryNeeds.find(need => need.row_id === filterRow("bags:ordered_count"))?.missing_parameter_ids).toContain(fact);
    });
  const waste: Record<string, unknown> = { ...treatment, rcs_water_receiving_excluded_water_m3: 0.002,
    rcs_water_treatment_waste_mode: waterWasteModes.dedicated,
    rcs_water_treatment_waste_program_reference: "TEST actual one compatible bag-waste party with wet removed and actual dry preinstall rejects; actual water/solids classification/route/receiver, one disposable sealed complete pack per bag, conservative certified max-shipping uniform load plan",
    rcs_water_treatment_waste_allocation_reference: "TEST exclusive whole party/routes/personnel/collection packs; bag cycle ends at drained removal, full service collects/packs/hauls, actual retained water included in excluded liquid stream once; other service waste separately scoped",
    rcs_water_treatment_waste_container_designation: "TEST actual complete compatible sealed disposable one-bag waste pack",
    rcs_water_treatment_waste_container_product_reference: "TEST real permitted content/liquid/solids/sealing/net capacity/tare and certified upper shipping mass for EACH pack, not inferred from average",
    rcs_water_treatment_waste_receiver_reference: "TEST actual compatible receiver/classification/route/period accepts whole sealed party with discarded external packaging; full separate fee per weighed tonnes, no receiving permission inferred",
    rcs_water_treatment_waste_vehicle_designation: "TEST actual dedicated compatible whole closed-pack vehicle",
    rcs_water_treatment_waste_container_tare_kg: 0.5, rcs_water_treatment_waste_container_allowed_net_kg: 4,
    rcs_water_treatment_waste_certified_max_shipping_kg_per_pack: 3.5, rcs_water_treatment_waste_max_packs_per_trip: 3,
    rcs_water_treatment_waste_route_payload_kg: 10, rcs_water_treatment_waste_wet_average_net_kg_per_used_bag: 2,
    rcs_water_treatment_waste_dry_average_net_kg_per_preinstall_reject: 0.2, rcs_water_treatment_waste_retained_water_l_per_used_bag: 0.5,
    rcs_water_treatment_waste_trip_cost_basis: waterWasteTripBasis, rcs_water_treatment_waste_receiving_mode: waterWasteReceivingModes.mass,
    rcs_water_treatment_waste_receiving_cost_basis: waterWasteReceivingBasis,
  };
  it("owns complete collection/packaging/haul and actual gross sealed receiving mass once, without crediting wet bags as stock", async () => {
    const result = await compile(waste); expect(result.preliminaryNeeds).toEqual([]);
    expect(q(result, filterRow("waste:collection_pack_count"))).toBe(4);
    expect(q(result, filterRow("waste:wet_net_kg"))).toBe(6); expect(q(result, filterRow("waste:dry_reject_net_kg"))).toBe(0.2);
    expect(q(result, filterRow("waste:with_preinstall_rejects:gross_shipping_kg"))).toBe(8.2);
    expect(q(result, filterRow("waste:effective_packs_per_trip"))).toBe(2); expect(q(result, filterRow("waste:haul_trip_count"))).toBe(2);
    expect(q(result, filterRow("waste:with_preinstall_rejects:receiving_t"))).toBe(0.0082);
    expect(q(result, filterRow("waste:retained_water_m3"))).toBe(0.0015); expect(q(result, filterRow("waste:water_allocation_margin_m3"))).toBe(0.0005);
    expect(q(result, "rcs:water-receiving:allocated_water_m3")).toBe(119.998);
    expect(q(result, filterRow("bags:remaining_count"))).toBe(5); expect(q(result, filterRow("bag_cycle:crew_hours"))).toBe(1.2);
    expect(result.rows.filter(r => r.row_id.startsWith(filterRow("waste:")) && r.included_in_estimate)).toHaveLength(2);
    expect(result.rows.find(r => r.row_id === filterRow("waste:collection_pack_count"))?.included_in_procurement).toBe(false);
    expect(components.stageMatrix.filter(stage => stage.ownResourceIds.includes(filterRow("waste:haul_trip_count"))).map(stage => stage.stageId)).toEqual(["completion"]);
  });
  it("actual zero preinstall rejects needs no dry-weight fact and enables exactly one receiving owner", async () => {
    const input: Record<string, unknown> = { ...waste, rcs_water_treatment_bag_actual_preinstall_unusable_count: 0 };
    delete input.rcs_water_treatment_waste_dry_average_net_kg_per_preinstall_reject;
    const result = await compile(input); expect(result.preliminaryNeeds).toEqual([]);
    expect(q(result, filterRow("waste:collection_pack_count"))).toBe(3);
    expect(q(result, filterRow("waste:no_preinstall_rejects:gross_shipping_kg"))).toBe(7.5);
    expect(q(result, filterRow("waste:no_preinstall_rejects:receiving_t"))).toBe(0.0075);
    expect(result.rows.some(r => r.row_id === filterRow("waste:with_preinstall_rejects:receiving_t") || r.row_id === filterRow("waste:dry_reject_net_kg"))).toBe(false);
    expect(result.rows.filter(r => r.row_id.startsWith(filterRow("waste:")) && /:receiving_t$/u.test(r.row_id))).toHaveLength(1);
  });
  it("unknown actual wet mass keeps source-certified capacity/trips, bag quantities/filter/pump/civil work known and receiving mass local", async () => {
    const input = { ...waste }; delete input.rcs_water_treatment_waste_wet_average_net_kg_per_used_bag;
    const result = await compile(input);
    expect(q(result, filterRow("waste:haul_trip_count"))).toBe(2); expect(q(result, filterRow("waste:collection_pack_count"))).toBe(4);
    expect(q(result, filterRow("bags:used_count"))).toBe(3); expect(q(result, filterRow("rental_set_hours"))).toBe(24);
    expect(q(result, row("fuel:ordered_l"))).toBe(20); expect(q(result, "rcs:civil-execution:open_cut:equipment_hours")).toBe(21);
    expect(result.preliminaryNeeds.every(need => need.missing_parameter_ids.includes("rcs_water_treatment_waste_wet_average_net_kg_per_used_bag"))).toBe(true);
  });
  it("unknown actual preinstall rejects does not invent zero or additional bag cycles and keeps known wet stream independent", async () => {
    const input = { ...waste }; delete input.rcs_water_treatment_bag_actual_preinstall_unusable_count;
    const result = await compile(input);
    expect(q(result, filterRow("waste:wet_net_kg"))).toBe(6); expect(q(result, filterRow("bags:used_count"))).toBe(3);
    expect(q(result, filterRow("bag_cycle:crew_hours"))).toBe(1.2);
    expect(result.rows.some(r => r.row_id === filterRow("waste:haul_trip_count"))).toBe(false);
    expect(result.preliminaryNeeds.every(need => need.missing_parameter_ids.includes("rcs_water_treatment_bag_actual_preinstall_unusable_count"))).toBe(true);
  });
  it.each([
    { rcs_water_receiving_excluded_water_m3: 0.001 },
    { rcs_water_treatment_waste_route_payload_kg: 3 },
    { rcs_water_treatment_waste_container_allowed_net_kg: 2 },
    { rcs_water_treatment_waste_wet_average_net_kg_per_used_bag: 4 },
  ])("rejects repeated water allocation, impossible full-pack transport/container or invalid certified mass before manual waste quantities %j", async change => {
    await expect(compile({ ...waste, ...change }, { [filterRow("waste:haul_trip_count")]: { quantity: "2", provenance },
      [filterRow("waste:with_preinstall_rejects:receiving_t")]: { quantity: "0.0082", provenance } })).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
  });
  it("other-party receiving leaves full physical waste/haul but no second receiver payment; all-waste third party excludes own waste resources", async () => {
    const noFee = await compile({ ...waste, rcs_water_treatment_waste_receiving_mode: waterWasteReceivingModes.otherParty });
    expect(q(noFee, filterRow("waste:haul_trip_count"))).toBe(2); expect(q(noFee, filterRow("waste:with_preinstall_rejects:gross_shipping_kg"))).toBe(8.2);
    expect(noFee.rows.some(r => r.row_id.startsWith(filterRow("waste:")) && /:receiving_t$/u.test(r.row_id))).toBe(false);
    const allOther = await compile({ ...waste, rcs_water_treatment_waste_mode: waterWasteModes.otherParty });
    expect(allOther.rows.some(r => r.row_id.startsWith(filterRow("waste:")))).toBe(false);
    expect(q(allOther, filterRow("bags:wet_used_count"))).toBe(3);
  });
  it.each(["rcs_water_control_working_duty_fraction", "rcs_water_treatment_bag_effective_capacity_m3", "rcs_water_treatment_waste_program_reference", "rcs_water_treatment_waste_allocation_reference", "rcs_water_treatment_waste_container_product_reference", "rcs_water_treatment_waste_receiver_reference", "rcs_water_treatment_waste_trip_cost_basis"])(
    "manual full waste trip retains original water/bag/source/container/receiver/cost gate %s", async fact => {
      const input = { ...waste }; delete input[fact];
      const result = await compile(input, { [filterRow("waste:haul_trip_count")]: { quantity: "2", provenance } });
      expect(result.rows.some(r => r.row_id === filterRow("waste:haul_trip_count"))).toBe(false);
      expect(result.preliminaryNeeds.find(need => need.row_id === filterRow("waste:haul_trip_count"))?.missing_parameter_ids).toContain(fact);
    });
  const equipment: Record<string, unknown> = { ...treatment,
    ...Object.fromEntries(["water_pump_kits_inbound", "water_pump_kits_return", "water_filter_kit_inbound", "water_filter_kit_return"].flatMap((lane, i) => Object.entries({
      mode: equipmentMobilizationModes.separate,
      allocation_reference: "TEST actual exclusive full equipment direction/cargo/site storage handover and separate dedicated full trip; no combined pickup/delivery or other equipment/material cargo, no duplicate installation/lift/lease payment",
      condition_and_load_reference: "TEST actual FULL homogeneous equipment packing/parts/tare/mass/dimensions/route/load/unload/secure plan; return actual drained/closed condition after disjoint removal; all full units returned, split/lost parts need another programme",
      vehicle_designation: `TEST actual compatible full equipment vehicle and handling means ${lane}`,
      shipping_kg_per_complete_unit: [200, 180, 100, 80][i], route_payload_kg: [500, 1000, 200, 100][i], max_complete_units_per_trip: [3, 1, 2, 1][i],
      cost_basis: freightBasis,
    }).map(([key, value]) => [`rcs_equipment_mobilization_${lane}_${key}`, value]))),
  };
  const equipmentRow = (lane: string, key: string) => `rcs:equipment-mobilization:${lane}:${key}`;
  it("ships original working/standby full pump kits and one shared full filter once in each disjoint direction, independent of time/material packs", async () => {
    const result = await compile(equipment); expect(result.preliminaryNeeds).toEqual([]);
    expect(q(result, equipmentRow("water_pump_kits_inbound", "complete_unit_count"))).toBe(3);
    expect(q(result, equipmentRow("water_pump_kits_inbound", "shipping_mass_kg"))).toBe(600);
    expect(q(result, equipmentRow("water_pump_kits_inbound", "effective_complete_units_per_trip"))).toBe(2);
    expect(q(result, equipmentRow("water_pump_kits_inbound", "trip_count"))).toBe(2);
    expect(q(result, equipmentRow("water_pump_kits_return", "shipping_mass_kg"))).toBe(540);
    expect(q(result, equipmentRow("water_pump_kits_return", "trip_count"))).toBe(3);
    expect(q(result, equipmentRow("water_filter_kit_inbound", "complete_unit_count"))).toBe(1);
    expect(q(result, equipmentRow("water_filter_kit_inbound", "trip_count"))).toBe(1);
    expect(q(result, equipmentRow("water_filter_kit_return", "shipping_mass_kg"))).toBe(80);
    expect(q(result, filterRow("rental_set_hours"))).toBe(24); expect(q(result, filterRow("bags:ordered_count"))).toBe(8);
    expect(q(result, row("rental_set_hours"))).toBe(72); expect(q(result, row("fuel:ordered_l"))).toBe(20);
    expect(result.rows.filter(r => r.row_id.startsWith("rcs:equipment-mobilization:") && r.included_in_estimate)).toHaveLength(4);
    expect(components.stageMatrix.filter(stage => stage.ownResourceIds.includes(equipmentRow("water_pump_kits_inbound", "trip_count"))).map(stage => stage.stageId)).toEqual(["completion"]);
    const longerPeriod = await compile({ ...equipment, rcs_water_control_calendar_hours: 48, rcs_water_treatment_bag_supplier_pack_count: 10 });
    expect(q(longerPeriod, equipmentRow("water_pump_kits_inbound", "trip_count"))).toBe(2);
    expect(q(longerPeriod, equipmentRow("water_filter_kit_return", "trip_count"))).toBe(1);
  });
  it("unknown return state/mass leaves original inbound equipment, rentals/materials and civil work calculable", async () => {
    const input = { ...equipment }; delete input.rcs_equipment_mobilization_water_pump_kits_return_shipping_kg_per_complete_unit;
    const result = await compile(input); expect(q(result, equipmentRow("water_pump_kits_inbound", "trip_count"))).toBe(2);
    expect(q(result, equipmentRow("water_filter_kit_return", "trip_count"))).toBe(1); expect(q(result, row("fuel:ordered_l"))).toBe(20);
    expect(q(result, "rcs:civil-execution:open_cut:equipment_hours")).toBe(21);
    expect(result.preliminaryNeeds.every(need => need.missing_parameter_ids.includes("rcs_equipment_mobilization_water_pump_kits_return_shipping_kg_per_complete_unit"))).toBe(true);
  });
  it("actual idle-only zero water retains full equipment delivery/return but disables dependent bag/freight work", async () => {
    const result = await compile({ ...equipment, rcs_water_control_working_duty_fraction: 0, rcs_water_control_required_average_inflow_m3_h: 0 });
    expect(result.preliminaryNeeds).toEqual([]); expect(q(result, equipmentRow("water_pump_kits_inbound", "trip_count"))).toBe(2);
    expect(q(result, equipmentRow("water_filter_kit_return", "trip_count"))).toBe(1);
    expect(result.rows.some(r => r.row_id === filterRow("bags:ordered_count"))).toBe(false);
  });
  it("one direction provided by another party or confirmed without movement has no second trip charge and does not hide the other direction", async () => {
    const input = { ...equipment, rcs_equipment_mobilization_water_pump_kits_inbound_mode: equipmentMobilizationModes.noMovement,
      rcs_equipment_mobilization_water_pump_kits_return_mode: equipmentMobilizationModes.otherParty };
    const result = await compile(input);
    expect(q(result, equipmentRow("water_pump_kits_inbound", "complete_unit_count"))).toBe(3);
    expect(result.rows.some(r => r.row_id === equipmentRow("water_pump_kits_inbound", "trip_count") || r.row_id === equipmentRow("water_pump_kits_return", "trip_count"))).toBe(false);
    expect(q(result, equipmentRow("water_filter_kit_return", "trip_count"))).toBe(1);
  });
  it("rejects a vehicle that cannot carry one full complete equipment unit before a manual trip override", async () => {
    await expect(compile({ ...equipment, rcs_equipment_mobilization_water_pump_kits_return_route_payload_kg: 179 }, {
      [equipmentRow("water_pump_kits_return", "trip_count")]: { quantity: "3", provenance },
    })).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
  });
  it.each(["rcs_water_control_working_set_count", "rcs_water_control_standby_set_count", "rcs_water_control_program_reference", "rcs_water_control_kit_product_reference", "rcs_water_control_kit_coupling_count", "rcs_equipment_mobilization_water_pump_kits_inbound_allocation_reference", "rcs_equipment_mobilization_water_pump_kits_inbound_condition_and_load_reference", "rcs_equipment_mobilization_water_pump_kits_inbound_cost_basis"])(
    "manual equipment trip retains original full cargo/kit/allocation/route/cost gate %s", async fact => {
      const input = { ...equipment }; delete input[fact];
      const result = await compile(input, { [equipmentRow("water_pump_kits_inbound", "trip_count")]: { quantity: "2", provenance } });
      expect(result.rows.some(r => r.row_id === equipmentRow("water_pump_kits_inbound", "trip_count"))).toBe(false);
      expect(result.preliminaryNeeds.find(need => need.row_id === equipmentRow("water_pump_kits_inbound", "trip_count"))?.missing_parameter_ids).toContain(fact);
    });
});

describe("actual casing preparation consumables, distinct from welding and preparation work", () => {
  const material: Record<string, unknown> = { ...fixture, rcs_casing_prep_material_mode: casingPrepModes.abrasive,
    rcs_casing_prep_material_program_reference: "TEST actual compatible cutting/grinding/cleaning program, gross rates and whole touched abrasive/wipe discard; no reused partial tooling",
    ...Object.fromEntries(["cutting_discs", "grinding_discs", "cleaner", "wipes"].flatMap((key, i) => Object.entries({
      gross_per_installed_section: [0.5, 0.25, 0.2, 2][i], product_designation: `TEST actual compatible ${key}`,
      product_reference: "TEST actual material/tool compatibility, rated speed/application, selected cleaning procedure",
      compatible_stock: [1, 0, 0.1, 2][i], retained_reserve: [1, 1, 0.2, 2][i], supplier_pack_net: [5, 2, 0.5, 10][i], cost_basis: casingPrepBasis,
    }).map(([suffix, value]) => [`rcs_casing_prep_material_${key}_${suffix}`, value]))),
  };
  const row = (key: string, suffix: string) => `rcs:casing-prep-material:${key}:${suffix}`;
  const order = row("cutting_discs", "ordered");
  it("derives gross consumption from installed sections and rounds whole discarded articles and supplier packs separately", async () => {
    const result = await compile(material, { [order]: { unitPrice: "2", provenance } });
    expect(result.preliminaryNeeds).toEqual([]); expect(q(result, row("cutting_discs", "consumed"))).toBe(2);
    expect(q(result, order)).toBe(5); expect(q(result, row("cutting_discs", "remaining"))).toBe(4);
    expect(q(result, row("cutting_discs", "free_beyond_reserve"))).toBe(3);
    expect(q(result, row("grinding_discs", "consumed"))).toBe(1); expect(q(result, row("grinding_discs", "ordered"))).toBe(2);
    expect(q(result, row("cleaner", "consumed"))).toBe(0.6); expect(q(result, row("cleaner", "ordered"))).toBe(1);
    expect(q(result, row("cleaner", "remaining"))).toBe(0.5); expect(q(result, row("cleaner", "free_beyond_reserve"))).toBe(0.3);
    expect(q(result, row("wipes", "consumed"))).toBe(6); expect(q(result, row("wipes", "ordered"))).toBe(10);
    expect(result.totals.amount).toBe("10"); expect(q(result, "rcs:mechanical:casing_preparation:crew_hours")).toBe(3);
    expect(q(result, "rcs:joint:electrode_ordered")).toBe(5);
    expect(result.rows.filter(r => r.row_id.startsWith("rcs:casing-prep-material:") && r.included_in_procurement).map(r => r.row_id)).toEqual(
      ["cutting_discs", "grinding_discs", "cleaner", "wipes"].map(key => row(key, "ordered")));
  });
  it("casing and consumable stock/reserve/pack orders do not increase preparation work or section consumption", async () => {
    const result = await compile({ ...material, rcs_compatible_stock_section_count: 20, rcs_retained_spare_section_count: 5,
      rcs_casing_prep_material_cutting_discs_retained_reserve: 20, rcs_casing_prep_material_cutting_discs_supplier_pack_net: 50 });
    expect(q(result, "rcs:casing:ordered_casing_length_m")).toBe(0); expect(q(result, order)).toBe(50);
    expect(q(result, row("cutting_discs", "consumed"))).toBe(2); expect(q(result, "rcs:mechanical:casing_preparation:crew_hours")).toBe(3);
  });
  it("zero actual use disables product/stock/order/freight facts for that material and differs from missing gross use", async () => {
    const input: Record<string, unknown> = { ...material, rcs_casing_prep_material_cutting_discs_gross_per_installed_section: 0 };
    for (const key of Object.keys(input)) if (key.startsWith("rcs_casing_prep_material_cutting_discs_") && !key.endsWith("gross_per_installed_section")) delete input[key];
    const zero = await compile(input); expect(zero.preliminaryNeeds).toEqual([]); expect(q(zero, row("cutting_discs", "consumed"))).toBe(0);
    expect(zero.rows.some(r => r.row_id === order || r.row_id.startsWith("rcs:freight:casing_prep_cutting_discs_"))).toBe(false);
    delete input.rcs_casing_prep_material_cutting_discs_gross_per_installed_section;
    const unknown = await compile(input); expect(unknown.preliminaryNeeds.find(n => n.row_id === order)?.missing_parameter_ids).toContain("rcs_casing_prep_material_cutting_discs_gross_per_installed_section");
    expect(q(unknown, "rcs:joint:crew_person_hours")).toBe(6);
  });
  it.each(["rcs_planned_physical_section_length_m", "rcs_casing_inside_diameter_mm", "rcs_casing_prep_material_program_reference",
    "rcs_mechanical_casing_preparation_method_reference", "rcs_mechanical_casing_preparation_equipment_designation", "rcs_casing_prep_material_cutting_discs_product_reference", "rcs_casing_prep_material_cutting_discs_cost_basis"])(
    "manual consumable purchase cannot bypass original geometry/program/tool/product/cost fact %s", async key => {
      const input = { ...material }; delete input[key];
      const result = await compile(input, { [order]: { quantity: "999", provenance } });
      expect(result.rows.some(r => r.row_id === order)).toBe(false); expect(result.preliminaryNeeds.find(n => n.row_id === order)?.missing_parameter_ids).toContain(key);
    });
  it("unknown supply packaging blocks purchase only while consumed material and preparation labor remain calculated", async () => {
    const input = { ...material }; delete input.rcs_casing_prep_material_cleaner_supplier_pack_net;
    const result = await compile(input); expect(q(result, row("cleaner", "consumed"))).toBe(0.6);
    expect(q(result, "rcs:mechanical:casing_preparation:crew_hours")).toBe(3); expect(q(result, order)).toBe(5);
    expect(result.rows.some(r => r.row_id === row("cleaner", "ordered"))).toBe(false);
  });
  it("other-party/other preparation resources are explicit separate scopes without a second executor material charge", async () => {
    for (const mode of [casingPrepModes.otherParty, casingPrepModes.other]) {
      const result = await compile({ ...material, rcs_casing_prep_material_mode: mode });
      expect(result.rows.filter(r => r.row_id.startsWith("rcs:casing-prep-material:")).map(r => r.row_id)).toEqual(["rcs:casing-prep-material:scope_length_m"]);
      expect(q(result, "rcs:mechanical:casing_preparation:crew_hours")).toBe(3);
    }
  });
  it("new cleaner uses indivisible actual liquid packs and opened usable off-site stock uses its own mass/load plan", async () => {
    const input = { ...material, rcs_freight_casing_prep_cleaner_new_mode: freightModes.separate,
      rcs_freight_casing_prep_cleaner_new_vehicle_designation: "TEST dedicated compatible cleaner load/route",
      rcs_freight_casing_prep_cleaner_new_shipping_kg_per_unit: 0.9, rcs_freight_casing_prep_cleaner_new_payload_kg: 100,
      rcs_freight_casing_prep_cleaner_new_max_units_per_trip: 0.75, rcs_freight_casing_prep_cleaner_new_cost_basis: freightBasis,
      rcs_freight_casing_prep_cleaner_offsite_stock_units: 0.1, rcs_freight_casing_prep_cleaner_stock_mode: freightModes.separate,
      rcs_freight_casing_prep_cleaner_stock_vehicle_designation: "TEST separately allocated opened compatible cleaner stock",
      rcs_freight_casing_prep_cleaner_stock_shipping_kg_per_unit: 1, rcs_freight_casing_prep_cleaner_stock_payload_kg: 100,
      rcs_freight_casing_prep_cleaner_stock_max_units_per_trip: 0.1, rcs_freight_casing_prep_cleaner_stock_cost_basis: freightBasis };
    const result = await compile(input); expect(result.preliminaryNeeds).toEqual([]);
    expect(q(result, "rcs:freight:casing_prep_cleaner_new:effective_units_per_trip")).toBe(0.5);
    expect(q(result, "rcs:freight:casing_prep_cleaner_new:trip_count")).toBe(2);
    expect(q(result, "rcs:freight:casing_prep_cleaner_stock:trip_count")).toBe(1);
    expect(parameters.some(p => /casing_prep_material.*(?:consumed|ordered|installed_section_count)/u.test(p.id))).toBe(false);
  });
});

describe("actual jacking section loading under an explicit disjoint cost boundary", () => {
  const loading: Record<string, unknown> = { ...fixture, rcs_civil_installation_method: methods.pipeJacking,
    rcs_jacking_section_loading_cost_mode: loadingModes.separate,
    rcs_jacking_section_loading_allocation_reference: "TEST loading excluded from actual advancement person/equipment hours, separate compatible lifting and guide positioning",
    rcs_mechanical_casing_jacking_loading_method_reference: "TEST confirmed certified section mass, compatible crane at actual radius, rigging/access and guides; no actual reaction design approval inferred",
    rcs_mechanical_casing_jacking_loading_crew_designation: "TEST all loading personnel including operators", rcs_mechanical_casing_jacking_loading_crew_h_per_unit: 0.6,
    rcs_mechanical_casing_jacking_loading_crew_cost_basis: mechanicalBases.crew,
    rcs_mechanical_casing_jacking_loading_equipment_designation: "TEST actual compatible lifting/positioning equipment with energy", rcs_mechanical_casing_jacking_loading_equipment_h_per_unit: 0.2,
    rcs_mechanical_casing_jacking_loading_equipment_cost_basis: mechanicalBases.equipment,
  };
  const crew = "rcs:mechanical:casing_jacking_loading:crew_hours", equipment = "rcs:mechanical:casing_jacking_loading:equipment_hours";
  it("loads original installed physical sections once and keeps pit excavation/advance/welding resources separate", async () => {
    const result = await compile(loading, { [crew]: { unitPrice: "10", provenance } });
    expect(result.preliminaryNeeds).toEqual([]); expect(q(result, "rcs:mechanical:casing_jacking_loading:scope_section_count")).toBe(3);
    expect(q(result, crew)).toBe(1.8); expect(q(result, equipment)).toBe(0.6); expect(result.totals.amount).toBe("18");
    expect(q(result, "rcs:civil-execution:jacking_advance:crew_hours")).toBe(70); expect(q(result, "rcs:civil-execution:jacking_pits:crew_hours")).toBe(40.8);
    expect(q(result, "rcs:joint:site_joint_count")).toBe(2);
    expect(result.rows.some(r => r.row_id.startsWith("rcs:mechanical:casing_lowering:"))).toBe(false);
    expect(components.stageMatrix.find(s => s.stageId === "casing")?.ownResourceIds).toContain(crew);
  });
  it("supplier bundles/reserve/damaged spares and compatible pipe stock cannot inflate section loading", async () => {
    const result = await compile({ ...loading, rcs_compatible_stock_section_count: 100, rcs_retained_spare_section_count: 10, rcs_supplier_bundle_section_count: 20 });
    expect(q(result, "rcs:casing:ordered_casing_length_m")).toBe(0); expect(q(result, crew)).toBe(1.8);
    const changed = await compile({ ...loading, rcs_crossing_length_m: 37 });
    expect(q(changed, crew)).toBe(2.4); expect(q(changed, "rcs:mechanical:casing_jacking_loading:scope_section_count")).toBe(4);
  });
  it("included or other-party loading never creates a second loading charge; open trench disables this entire branch", async () => {
    for (const mode of [loadingModes.included, loadingModes.otherParty]) {
      const input: Record<string, unknown> = { ...loading, rcs_jacking_section_loading_cost_mode: mode };
      for (const key of Object.keys(input)) if (key.startsWith("rcs_mechanical_casing_jacking_loading_")) delete input[key];
      const result = await compile(input); expect(result.preliminaryNeeds).toEqual([]);
      expect(result.rows.filter(r => r.row_id.startsWith("rcs:mechanical:casing_jacking_loading:")).map(r => r.row_id)).toEqual(["rcs:mechanical:casing_jacking_loading:scope_section_count"]);
      expect(q(result, "rcs:civil-execution:jacking_advance:crew_hours")).toBe(70);
    }
    const open = await compile({ ...loading, rcs_civil_installation_method: methods.openCut });
    expect(open.rows.some(r => r.row_id.startsWith("rcs:mechanical:casing_jacking_loading:"))).toBe(false);
  });
  it("unknown loading/advance allocation gates only dependent cost owners, leaving known excavation and casing quantities calculated", async () => {
    const input = { ...loading }; delete input.rcs_jacking_section_loading_cost_mode;
    const result = await compile(input); expect(q(result, "rcs:civil-execution:jacking_pits:crew_hours")).toBe(40.8);
    expect(q(result, "rcs:casing:ordered_casing_length_m")).toBe(48);
    expect(result.rows.some(r => r.row_id === crew || r.row_id === "rcs:civil-execution:jacking_advance:crew_hours")).toBe(false);
    expect(result.preliminaryNeeds.find(n => n.row_id === crew)?.missing_parameter_ids).toContain("rcs_jacking_section_loading_cost_mode");
  });
  it.each(["rcs_crossing_length_m", "rcs_planned_physical_section_length_m", "rcs_casing_inside_diameter_mm", "rcs_jacking_section_loading_allocation_reference",
    "rcs_civil_jacking_advance_method_reference", "rcs_mechanical_casing_jacking_loading_method_reference"])(
    "manual loading hours cannot bypass original geometry/actual compatible lifting and disjoint boundary %s", async key => {
      const input = { ...loading }; delete input[key];
      const result = await compile(input, { [equipment]: { quantity: "999", provenance } });
      expect(result.rows.some(r => r.row_id === equipment)).toBe(false);
      expect(result.preliminaryNeeds.find(n => n.row_id === equipment)?.missing_parameter_ids).toContain(key);
    });
});

describe("actual compaction water for selected finished geometry, distinct from internal mixing and water application work", () => {
  const water: Record<string, unknown> = { ...fixture,
    ...Object.fromEntries(["bedding", "pits", "trench"].flatMap(key => Object.entries({
      gross_l_per_finished_m3: 80, supply_mode: compactionWaterModes.separate,
      allocation_reference: "TEST suitable water separately allocated exclusively to this operation, no reuse of another stage's stock",
      product_designation: "TEST compatible construction water", compatibility_reference: "TEST actual material moisture/quality and gross addition under selected method",
      compatible_stock_m3: 0.1, retained_reserve_m3: 0.08, supplier_multiple_m3: 0.25, cost_basis: compactionWaterBasis,
    }).map(([suffix, value]) => [`rcs_compaction_water_${key}_${suffix}`, value]))),
  };
  const order = "rcs:compaction-water:bedding:ordered_m3";
  it("uses installed bedding volume and keeps water consumption/stock/reserve/order/remaining and freight distinct", async () => {
    const result = await compile(water, { [order]: { unitPrice: "10", provenance } });
    expect(result.preliminaryNeeds).toEqual([]); expect(q(result, "rcs:compaction-water:bedding:consumed_m3")).toBe(0.42);
    expect(q(result, order)).toBe(0.5); expect(q(result, "rcs:compaction-water:bedding:remaining_m3")).toBe(0.18);
    expect(q(result, "rcs:compaction-water:bedding:free_m3_beyond_reserve")).toBe(0.1); expect(result.totals.amount).toBe("5");
    expect(q(result, "rcs:fill-execution:bedding:crew_hours")).toBe(3.15);
    expect(result.rows.filter(r => r.row_id.startsWith("rcs:compaction-water:bedding:") && r.included_in_procurement).map(r => r.row_id)).toEqual([order]);
    expect(components.stageMatrix.find(s => s.stageId === "bedding")?.ownResourceIds).toContain(order);
    expect(result.rows.some(r => /^rcs:compaction-water:.*(?:crew|equipment)/u.test(r.row_id))).toBe(false);
  });
  it("uses finished trench volume including reuse and both actual pits, never new supply order or natural excavation volume", async () => {
    const trench = await compile({ ...selectedTrench, ...Object.fromEntries(Object.entries(water).filter(([k]) => k.startsWith("rcs_compaction_water_"))) });
    expect(trench.preliminaryNeeds).toEqual([]);
    expect(q(trench, "rcs:compaction-water:trench:consumed_m3")).toBeCloseTo(q(trench, "rcs:trench-fill:net_remaining_space_m3") * 0.08, 7);
    const pits = await compile({ ...water, rcs_civil_installation_method: methods.pipeJacking, rcs_pit_fill_material_mode: fillModes.sameGranular,
      rcs_pit_fill_granular_product_designation: "TEST actual pit material", rcs_pit_fill_approved_reused_finished_m3: 20,
      rcs_pit_fill_gross_supplied_volume_ratio: 1.2, rcs_pit_fill_compatible_loose_stock_m3: 10, rcs_pit_fill_retained_loose_reserve_m3: 2,
      rcs_pit_fill_supplier_loose_multiple_m3: 5 });
    expect(pits.preliminaryNeeds).toEqual([]); expect(q(pits, "rcs:compaction-water:pits:consumed_m3")).toBe(6.64);
    expect(pits.rows.some(r => r.row_id.startsWith("rcs:compaction-water:bedding:") || r.row_id.startsWith("rcs:compaction-water:trench:"))).toBe(false);
  });
  it("water supply and dry/granular reserve cannot inflate placement work or actual added-water consumption", async () => {
    const result = await compile({ ...water, rcs_compaction_water_bedding_compatible_stock_m3: 0,
      rcs_compaction_water_bedding_retained_reserve_m3: 3, rcs_compaction_water_bedding_supplier_multiple_m3: 5,
      rcs_bedding_compatible_loose_stock_m3: 20, rcs_bedding_retained_loose_reserve_m3: 10 });
    expect(q(result, order)).toBe(5); expect(q(result, "rcs:compaction-water:bedding:consumed_m3")).toBe(0.42);
    expect(q(result, "rcs:fill-execution:bedding:crew_hours")).toBe(3.15);
  });
  it("unknown gross added-water rate is local and differs from explicit zero; no universal moisture percentage is inferred", async () => {
    const input = { ...water }; delete input.rcs_compaction_water_bedding_gross_l_per_finished_m3;
    const result = await compile(input); expect(result.rows.some(r => r.row_id === order)).toBe(false);
    expect(q(result, beddingOwner)).toBe(6); expect(q(result, "rcs:fill-execution:bedding:crew_hours")).toBe(3.15);
    expect(result.preliminaryNeeds.every(n => n.row_id.startsWith("rcs:compaction-water:bedding:") || n.row_id.startsWith("rcs:freight:compaction_water_bedding_"))).toBe(true);
    const zero: Record<string, unknown> = { ...water, rcs_compaction_water_bedding_gross_l_per_finished_m3: 0 };
    for (const key of Object.keys(zero)) if (key.startsWith("rcs_compaction_water_bedding_") && !key.endsWith("gross_l_per_finished_m3")) delete zero[key];
    const known = await compile(zero); expect(known.preliminaryNeeds).toEqual([]);
    expect(q(known, "rcs:compaction-water:bedding:consumed_m3")).toBe(0); expect(known.rows.some(r => r.row_id === order)).toBe(false);
    await expect(compile({ ...water, rcs_compaction_water_bedding_gross_l_per_finished_m3: -1 })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
  it("another-party supply retains consumed water and real compatibility/allocation without executor purchase", async () => {
    const result = await compile({ ...water, rcs_compaction_water_bedding_supply_mode: compactionWaterModes.otherParty });
    expect(result.preliminaryNeeds).toEqual([]); expect(q(result, "rcs:compaction-water:bedding:allocated_consumed_m3")).toBe(0.42);
    expect(result.rows.some(r => r.row_id === order)).toBe(false);
    expect(result.parameters.rcs_compaction_water_bedding_supplier_multiple_m3).toBe(0.25);
  });
  it.each(["rcs_open_cut_excavation_width_m", "rcs_fill_bedding_method_reference", "rcs_compaction_water_bedding_gross_l_per_finished_m3",
    "rcs_compaction_water_bedding_allocation_reference", "rcs_compaction_water_bedding_compatibility_reference", "rcs_compaction_water_bedding_cost_basis"])(
    "manual water purchase retains original geometry/method/quality/allocation/cost fact %s", async key => {
      const input = { ...water }; delete input[key];
      const result = await compile(input, { [order]: { quantity: "999", provenance } });
      expect(result.rows.some(r => r.row_id === order)).toBe(false);
      expect(result.preliminaryNeeds.find(n => n.row_id === order)?.missing_parameter_ids).toContain(key);
    });
  it("unknown water supply multiple leaves actual consumption, application work and casing order available", async () => {
    const input = { ...water }; delete input.rcs_compaction_water_bedding_supplier_multiple_m3;
    const result = await compile(input); expect(q(result, "rcs:compaction-water:bedding:consumed_m3")).toBe(0.42);
    expect(q(result, "rcs:fill-execution:bedding:crew_hours")).toBe(3.15); expect(q(result, "rcs:casing:ordered_casing_length_m")).toBe(48);
    expect(result.rows.some(r => r.row_id === order)).toBe(false);
  });
  it("stock covers water consumption/reserve without new freight; separate delivery uses actual legal capacity", async () => {
    const stock = await compile({ ...water, rcs_compaction_water_bedding_compatible_stock_m3: 1 });
    expect(q(stock, order)).toBe(0); expect(stock.rows.some(r => r.row_id.startsWith("rcs:freight:compaction_water_bedding_new:"))).toBe(false);
    const shipped = await compile({ ...water, rcs_freight_compaction_water_bedding_new_mode: freightModes.separate,
      rcs_freight_compaction_water_bedding_new_vehicle_designation: "TEST actual dedicated compatible water transport",
      rcs_freight_compaction_water_bedding_new_shipping_kg_per_unit: 1010, rcs_freight_compaction_water_bedding_new_payload_kg: 505,
      rcs_freight_compaction_water_bedding_new_max_units_per_trip: 0.4, rcs_freight_compaction_water_bedding_new_cost_basis: freightBasis });
    expect(shipped.preliminaryNeeds).toEqual([]); expect(q(shipped, "rcs:freight:compaction_water_bedding_new:trip_count")).toBe(2);
    expect(q(shipped, "rcs:freight:compaction_water_bedding_new:shipping_mass_kg")).toBe(505);
  });
});

describe("actual staking resources, replacement and removal in the same crossing", () => {
  const preparation: Record<string, unknown> = { ...fixture,
    rcs_preparation_mode: preparationModes.straightAxis, rcs_preparation_program_reference: "TEST actual straight-axis program, control, additional points, replacements and removal boundaries",
    rcs_preparation_axis_marker_pitch_m: 10, rcs_preparation_additional_marker_count: 2, rcs_preparation_marker_replacement_count: 3,
    rcs_preparation_paint_gross_kg_per_marker: 0.02,
    ...Object.fromEntries(["initial", "replacement", "removal"].flatMap((key, i) => Object.entries({
      method_reference: "TEST actual compatible disjoint procedure and instruments, no material/transport charge",
      crew_designation: "TEST all survey/installation/removal personnel", crew_h_per_marker: [0.4, 0.6, 0.2][i], crew_cost_basis: executionBases.crew,
      equipment_designation: "TEST actual compatible survey/removal instruments with energy", equipment_h_per_marker: [0.1, 0.2, 0.05][i], equipment_cost_basis: executionBases.equipment,
    }).map(([suffix, value]) => [`rcs_preparation_${key}_${suffix}`, value]))),
    ...Object.fromEntries(["stakes", "paint"].flatMap((key, i) => Object.entries({
      product_designation: `TEST actual compatible ${key}`, product_reference: "TEST actual compatible selected product and gross quantities",
      compatible_stock: [3, 0.1][i], retained_reserve: [2, 0.05][i], supplier_pack_net: [5, 0.1][i], cost_basis: preparationBasis,
    }).map(([suffix, value]) => [`rcs_preparation_${key}_${suffix}`, value]))),
    rcs_preparation_stakes_pre_install_unusable: 1,
  };
  const row = (suffix: string) => `rcs:preparation:${suffix}`;
  const stakeOrder = row("stakes:ordered"), paintOrder = row("paint:ordered");
  it("counts both ends once and separates execution, gross material, whole packs, reserve and remainder", async () => {
    const result = await compile(preparation, { [stakeOrder]: { unitPrice: "2", provenance }, [paintOrder]: { unitPrice: "10", provenance } });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(q(result, row("axis_marker_count"))).toBe(5); expect(q(result, row("initial_marker_count"))).toBe(7);
    expect(q(result, row("marker_installation_events"))).toBe(10);
    expect(q(result, row("stakes:consumed"))).toBe(11); expect(q(result, stakeOrder)).toBe(10);
    expect(q(result, row("stakes:supplier_pack_count"))).toBe(2); expect(q(result, row("stakes:remaining"))).toBe(2);
    expect(q(result, row("stakes:free_beyond_reserve"))).toBe(0);
    expect(q(result, row("paint:consumed"))).toBe(0.2); expect(q(result, row("paint:new_need"))).toBe(0.15);
    expect(q(result, paintOrder)).toBe(0.2); expect(q(result, row("paint:remaining"))).toBe(0.1);
    expect(q(result, row("paint:free_beyond_reserve"))).toBe(0.05); expect(result.totals.amount).toBe("22");
    for (const [key, crew, equipment] of [["initial", 2.8, 0.7], ["replacement", 1.8, 0.6], ["removal", 1.4, 0.35]] as const) {
      expect(q(result, row(`${key}:crew_hours`))).toBe(crew); expect(q(result, row(`${key}:equipment_hours`))).toBe(equipment);
    }
    expect(result.rows.filter(r => /^rcs:preparation:(?:stakes|paint):/u.test(r.row_id) && r.included_in_procurement).map(r => r.row_id)).toEqual([stakeOrder, paintOrder]);
    expect(components.stageMatrix.find(s => s.stageId === "completion")?.ownResourceIds).toContain(row("removal:crew_hours"));
    expect(components.stageMatrix.find(s => s.stageId === "preparation")?.ownResourceIds).not.toContain(row("removal:crew_hours"));
  });
  it("pack/reserve/pre-install damage never inflate work; replacement consumes a new marker without charging its removal twice", async () => {
    const result = await compile({ ...preparation, rcs_preparation_stakes_pre_install_unusable: 20,
      rcs_preparation_stakes_retained_reserve: 30, rcs_preparation_stakes_supplier_pack_net: 100 });
    expect(q(result, stakeOrder)).toBe(100); expect(q(result, row("initial:crew_hours"))).toBe(2.8);
    expect(q(result, row("removal:crew_hours"))).toBe(1.4);
    const replaced = await compile({ ...preparation, rcs_preparation_marker_replacement_count: 5 });
    expect(q(replaced, row("marker_installation_events"))).toBe(12); expect(q(replaced, row("replacement:crew_hours"))).toBe(3);
    expect(q(replaced, row("paint:consumed"))).toBe(0.24); expect(q(replaced, row("removal:crew_hours"))).toBe(1.4);
  });
  it("zero replacements disable only replacement facts and retain explicit values; zero order needs no new transport", async () => {
    const input: Record<string, unknown> = { ...preparation, rcs_preparation_marker_replacement_count: 0, rcs_preparation_stakes_compatible_stock: 20 };
    for (const key of Object.keys(input)) if (key.startsWith("rcs_preparation_replacement_")) delete input[key];
    const result = await compile(input); expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.some(r => r.row_id.startsWith(row("replacement:")))).toBe(false);
    expect(q(result, row("initial:crew_hours"))).toBe(2.8); expect(q(result, stakeOrder)).toBe(0);
    expect(result.rows.some(r => r.row_id.startsWith("rcs:freight:preparation_stakes_new:"))).toBe(false);
  });
  it("unknown pitch stays local while casing and excavation calculate; a manual order cannot invent a valid layout", async () => {
    const input = { ...preparation }; delete input.rcs_preparation_axis_marker_pitch_m;
    const result = await compile(input, { [stakeOrder]: { quantity: "999", provenance } });
    expect(q(result, "rcs:casing:ordered_casing_length_m")).toBe(48); expect(q(result, "rcs:civil-execution:open_cut:crew_hours")).toBe(52.5);
    expect(result.rows.some(r => r.row_id === stakeOrder)).toBe(false);
    expect(result.preliminaryNeeds.find(n => n.row_id === stakeOrder)?.missing_parameter_ids).toContain("rcs_preparation_axis_marker_pitch_m");
    expect(result.preliminaryNeeds.every(n => n.row_id.startsWith(row("")) || n.row_id.startsWith("rcs:freight:preparation_"))).toBe(true);
  });
  it.each(["rcs_crossing_length_m", "rcs_preparation_program_reference", "rcs_preparation_stakes_product_reference", "rcs_preparation_stakes_cost_basis"])(
    "manual purchase retains original geometry/program/material boundary %s", async key => {
      const input = { ...preparation }; delete input[key];
      const result = await compile(input, { [stakeOrder]: { quantity: "999", provenance } });
      expect(result.rows.some(r => r.row_id === stakeOrder)).toBe(false);
      expect(result.preliminaryNeeds.find(n => n.row_id === stakeOrder)?.missing_parameter_ids).toContain(key);
    });
  it("missing paint packaging blocks its purchase only, leaving consumption and labor calculated", async () => {
    const input = { ...preparation }; delete input.rcs_preparation_paint_supplier_pack_net;
    const result = await compile(input); expect(q(result, row("paint:consumed"))).toBe(0.2);
    expect(q(result, row("initial:crew_hours"))).toBe(2.8); expect(q(result, stakeOrder)).toBe(10);
    expect(result.rows.some(r => r.row_id === paintOrder)).toBe(false);
  });
  it("other-party and other programs record scope without charging executor resources; jacking does not duplicate the survey axis", async () => {
    for (const mode of [preparationModes.otherParty, preparationModes.other]) {
      const result = await compile({ ...preparation, rcs_preparation_mode: mode });
      expect(result.rows.filter(r => r.row_id.startsWith(row(""))).map(r => r.row_id)).toEqual([row("scope_length_m")]);
      expect(result.parameters.rcs_preparation_axis_marker_pitch_m).toBe(10);
    }
    const jacked = await compile({ ...preparation, rcs_civil_installation_method: methods.pipeJacking });
    expect(q(jacked, row("axis_marker_count"))).toBe(5); expect(q(jacked, row("initial:crew_hours"))).toBe(2.8);
  });
  it("new paint travels as indivisible packages with actual shipping mass; derived counts are never questions", async () => {
    const result = await compile({ ...preparation,
      rcs_freight_preparation_paint_new_mode: freightModes.separate, rcs_freight_preparation_paint_new_vehicle_designation: "TEST dedicated compatible paint transport",
      rcs_freight_preparation_paint_new_shipping_kg_per_unit: 2, rcs_freight_preparation_paint_new_payload_kg: 100,
      rcs_freight_preparation_paint_new_max_units_per_trip: 0.15, rcs_freight_preparation_paint_new_cost_basis: freightBasis });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(q(result, "rcs:freight:preparation_paint_new:trip_count")).toBe(2);
    expect(parameters.some(p => /(?:axis_marker_count|initial_marker_count|marker_installation_events|stakes_ordered|paint_ordered)/u.test(p.id))).toBe(false);
  });
});

describe("actual initial joint inspection, equipment and couplant in the same crossing", () => {
  const inspection: Record<string, unknown> = { ...fixture, rcs_inspection_mode: inspectionModes.visualUt,
    rcs_inspection_program_reference: "TEST selected initial visual+manual UT program, actual selected joints and criteria; no predicted repair",
    rcs_inspection_ut_joint_fraction: 0.5,
    ...Object.fromEntries(["visual", "ut"].flatMap(key => Object.entries({
      method_reference: "TEST confirmed procedure, actual steel/wall/geometry/access and inspector qualification",
      crew_designation: "TEST all qualified inspectors/operators", crew_h_per_joint: 0.6, crew_cost_basis: executionBases.crew,
      equipment_designation: "TEST actual calibrated compatible inspection equipment", equipment_h_per_joint: 0.2, equipment_cost_basis: executionBases.equipment,
    }).map(([suffix, value]) => [`rcs_inspection_${key}_${suffix}`, value]))),
    rcs_inspection_couplant_product_designation: "TEST actual compatible UT couplant", rcs_inspection_couplant_product_reference: "TEST applicable product/procedure, disjoint gross consumption",
    rcs_inspection_couplant_gross_kg_per_joint: 0.3, rcs_inspection_couplant_compatible_stock_kg: 0.1,
    rcs_inspection_couplant_retained_reserve_kg: 0.2, rcs_inspection_couplant_supplier_pack_net_kg: 0.5,
    rcs_inspection_couplant_cost_basis: couplantBasis,
  };
  const order = "rcs:inspection:couplant:ordered_kg";
  it("derives initial selected whole joints and distinct inspection hours/material balances without changing welding", async () => {
    const result = await compile(inspection, { [order]: { unitPrice: "4", provenance },
      "rcs:inspection:ut:crew_hours": { unitPrice: "10", provenance } });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(q(result, "rcs:inspection:program_joint_count")).toBe(2); expect(q(result, "rcs:inspection:ut:initial_joint_count")).toBe(1);
    expect(q(result, "rcs:inspection:visual:crew_hours")).toBe(1.2); expect(q(result, "rcs:inspection:ut:crew_hours")).toBe(0.6);
    expect(q(result, "rcs:inspection:ut:equipment_hours")).toBe(0.2);
    expect(q(result, "rcs:inspection:couplant:consumed_kg")).toBe(0.3); expect(q(result, order)).toBe(0.5);
    expect(q(result, "rcs:inspection:couplant:remaining_kg")).toBe(0.3); expect(q(result, "rcs:inspection:couplant:free_kg_beyond_reserve")).toBe(0.1);
    expect(result.totals.amount).toBe("8"); expect(q(result, "rcs:joint:crew_person_hours")).toBe(6);
    expect(result.rows.filter(row => row.row_id.startsWith("rcs:inspection:couplant:") && row.included_in_procurement).map(row => row.row_id)).toEqual([order]);
    expect(components.stageMatrix.find(stage => stage.stageId === "casing")?.ownResourceIds).toContain(order);
  });
  it("supplier pack/reserve/stock cannot inflate inspection count or crew/equipment hours", async () => {
    const before = await compile(inspection);
    const changed = await compile({ ...inspection, rcs_inspection_couplant_retained_reserve_kg: 10,
      rcs_inspection_couplant_supplier_pack_net_kg: 5, rcs_inspection_couplant_compatible_stock_kg: 3 });
    expect(q(changed, order)).not.toBe(q(before, order));
    expect(q(changed, "rcs:inspection:ut:crew_hours")).toBe(q(before, "rcs:inspection:ut:crew_hours"));
    const all = await compile({ ...inspection, rcs_inspection_ut_joint_fraction: 1 });
    expect(q(all, "rcs:inspection:ut:initial_joint_count")).toBe(2); expect(q(all, "rcs:inspection:couplant:consumed_kg")).toBe(0.6);
    await expect(compile({ ...inspection, rcs_inspection_ut_joint_fraction: 1.1 })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
  it("zero UT fraction and visual-only scope keep visual inspection but disable UT-specific material/equipment questions", async () => {
    for (const patch of [{ rcs_inspection_ut_joint_fraction: 0 }, { rcs_inspection_mode: inspectionModes.visual }]) {
      const input: Record<string, unknown> = { ...inspection, ...patch };
      for (const key of Object.keys(input)) if (key.startsWith("rcs_inspection_couplant_") || key.startsWith("rcs_inspection_ut_") && key !== "rcs_inspection_ut_joint_fraction") delete input[key];
      const result = await compile(input); expect(result.preliminaryNeeds).toEqual([]);
      expect(q(result, "rcs:inspection:visual:crew_hours")).toBe(1.2);
      expect(result.rows.some(row => row.row_id.startsWith("rcs:inspection:couplant:") || row.row_id === "rcs:inspection:ut:crew_hours")).toBe(false);
    }
  });
  it("no site joints disables all initial inspection facts; other-party/other program retains its explicit boundary without executor costs", async () => {
    const single: Record<string, unknown> = { ...inspection, rcs_crossing_length_m: 12 };
    for (const key of Object.keys(single)) if (key.startsWith("rcs_inspection_")) delete single[key];
    const result = await compile(single); expect(result.preliminaryNeeds).toEqual([]); expect(result.rows.some(row => row.row_id.startsWith("rcs:inspection:"))).toBe(false);
    for (const mode of [inspectionModes.otherParty, inspectionModes.other]) {
      const other = await compile({ ...inspection, rcs_inspection_mode: mode });
      expect(other.rows.filter(row => row.row_id.startsWith("rcs:inspection:")).map(row => row.row_id)).toEqual(["rcs:inspection:program_joint_count"]);
      expect(other.parameters.rcs_inspection_ut_joint_fraction).toBe(0.5);
    }
  });
  it("an unknown UT fraction leaves known visual inspection and other materials calculated, never invents defects or repeats", async () => {
    const input = { ...inspection }; delete input.rcs_inspection_ut_joint_fraction;
    const result = await compile(input, { "rcs:inspection:ut:crew_hours": { quantity: "999", provenance } });
    expect(q(result, "rcs:inspection:visual:crew_hours")).toBe(1.2); expect(q(result, "rcs:casing:ordered_casing_length_m")).toBe(48);
    expect(result.rows.some(row => row.row_id === "rcs:inspection:ut:crew_hours")).toBe(false);
    expect(result.preliminaryNeeds.find(need => need.row_id === "rcs:inspection:ut:crew_hours")?.missing_parameter_ids).toContain("rcs_inspection_ut_joint_fraction");
  });
  it.each(["rcs_inspection_program_reference", "rcs_inspection_ut_method_reference", "rcs_casing_inside_diameter_mm", "rcs_inspection_couplant_product_reference", "rcs_inspection_couplant_cost_basis"])(
    "manual couplant order cannot bypass actual quality/source fact %s", async key => {
      const input = { ...inspection }; delete input[key];
      const result = await compile(input, { [order]: { quantity: "999", provenance } });
      expect(result.rows.some(row => row.row_id === order)).toBe(false);
      expect(result.preliminaryNeeds.find(need => need.row_id === order)?.missing_parameter_ids).toContain(key);
      expect(q(result, beddingOwner)).toBe(6);
    });
  it("unknown supply packaging blocks only material order while actual consumption and inspection labor stay calculated", async () => {
    const input = { ...inspection }; delete input.rcs_inspection_couplant_supplier_pack_net_kg;
    const result = await compile(input); expect(q(result, "rcs:inspection:couplant:consumed_kg")).toBe(0.3);
    expect(q(result, "rcs:inspection:ut:crew_hours")).toBe(0.6); expect(result.rows.some(row => row.row_id === order)).toBe(false);
    expect(result.preliminaryNeeds.find(need => need.row_id === order)?.missing_parameter_ids).toContain("rcs_inspection_couplant_supplier_pack_net_kg");
  });
  it("ships rounded new couplant bags and allocated off-site stock through the existing actual dedicated freight owner", async () => {
    const lane = (key: string) => Object.fromEntries(Object.entries({ mode: freightModes.separate, allocation_reference: "TEST actual dedicated couplant route/load", vehicle_designation: "TEST compatible small cargo vehicle",
      shipping_kg_per_unit: 1.1, payload_kg: 10, max_units_per_trip: 10, cost_basis: freightBasis }).map(([suffix, value]) => [`rcs_freight_inspection_couplant_${key}_${suffix}`, value]));
    const result = await compile({ ...inspection, rcs_freight_inspection_couplant_offsite_stock_units: 0.1, ...lane("new"), ...lane("stock"),
      rcs_freight_inspection_couplant_stock_payload_kg: 0.2, rcs_freight_inspection_couplant_stock_max_units_per_trip: 0.2 });
    expect(result.preliminaryNeeds).toEqual([]); expect(q(result, "rcs:freight:inspection_couplant_new:cargo_units")).toBe(0.5);
    expect(q(result, "rcs:freight:inspection_couplant_new:trip_count")).toBe(1);
    expect(q(result, "rcs:freight:inspection_couplant_stock:cargo_units")).toBe(0.1);
    expect(q(result, "rcs:freight:inspection_couplant_stock:trip_count")).toBe(1);
    // Whole supply packs apply to NEW goods. Existing compatible usable stock
    // can be an already opened container; inspect its actual allocation below.
    expect(q(result, "rcs:inspection:couplant:consumed_kg")).toBe(0.3);
  });
});

describe("actual homogeneous soil allocation and separate haul/receiving in the same assembly", () => {
  const soil: Record<string, unknown> = { ...selectedTrench,
    rcs_soil_trench_scope: soilModes.uniform,
    rcs_soil_trench_batch_reference: "TEST single classified homogeneous moist batch; actual state conversion only",
    rcs_soil_trench_loose_per_bank_m3: 1.25,
    rcs_soil_trench_allocation_reference: "TEST compatible reuse and disjoint allocations: current finished reuse, separate loose retained soil",
    rcs_soil_trench_retained_loose_m3: 10, rcs_soil_trench_reuse_origin: soilOrigins.current,
    rcs_soil_trench_reuse_loose_per_finished_m3: 1.2,
    rcs_soil_trench_destination: soilDestinations.disposal,
    rcs_soil_trench_destination_reference: "TEST approved material classification and named receiving site",
    rcs_soil_trench_haul_mode: freightModes.separate,
    rcs_soil_trench_haul_reference: "TEST actual dedicated soil route/trips; no overlapping loads",
    rcs_soil_trench_vehicle_designation: "TEST compatible soil vehicle",
    rcs_soil_trench_shipping_density_kg_m3: 1800,
    rcs_soil_trench_vehicle_payload_kg: 10000, rcs_soil_trench_vehicle_loose_capacity_m3: 8,
    rcs_soil_trench_haul_cost_basis: freightBasis,
    rcs_soil_trench_receiving_mode: receivingModes.looseVolume, rcs_soil_trench_receiving_cost_basis: receivingBasis,
  };
  const prefix = "rcs:soil:trench:current:";
  const trip = `${prefix}trip_count`, receiving = `${prefix}receiving_loose_m3`;
  it("conserves bank/loose/finished allocations and pays only full haul plus distinct receiving", async () => {
    const result = await compile(soil, { [trip]: { unitPrice: "70", provenance }, [receiving]: { unitPrice: "2", provenance } });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(q(result, "rcs:soil:trench:excavated_bank_m3")).toBe(105);
    expect(q(result, "rcs:soil:trench:excavated_loose_m3")).toBe(131.25);
    expect(q(result, `${prefix}current_reused_finished_m3`)).toBe(20);
    expect(q(result, `${prefix}current_reused_loose_m3`)).toBe(24);
    expect(q(result, `${prefix}retained_loose_m3`)).toBe(10);
    expect(q(result, `${prefix}excess_loose_m3`)).toBe(97.25);
    expect(q(result, `${prefix}shipping_mass_kg`)).toBe(175050);
    expect(q(result, `${prefix}effective_loose_m3_per_trip`)).toBeCloseTo(10000 / 1800, 8);
    expect(q(result, trip)).toBe(18); expect(q(result, receiving)).toBe(97.25); expect(result.totals.amount).toBe("1454.5");
    expect(result.rows.filter(row => row.row_id.startsWith("rcs:soil:") && row.included_in_procurement).map(row => row.row_id)).toEqual([trip, receiving]);
    expect(q(result, "rcs:fill-execution:trench:crew_hours")).toBeGreaterThan(0);
  });
  it("does not reuse purchased fill stock, reserve or supply-rounding surplus as excavated soil", async () => {
    const before = await compile(soil);
    const changed = await compile({ ...soil, rcs_trench_fill_compatible_loose_stock_m3: 100,
      rcs_trench_fill_retained_loose_reserve_m3: 50, rcs_trench_fill_supplier_loose_multiple_m3: 25,
      rcs_trench_fill_gross_supplied_volume_ratio: 1.9 });
    expect(q(changed, `${prefix}excess_loose_m3`)).toBe(q(before, `${prefix}excess_loose_m3`));
    expect(q(changed, trip)).toBe(q(before, trip)); expect(q(changed, "rcs:trench-fill:ordered_loose_m3")).not.toBe(q(before, "rcs:trench-fill:ordered_loose_m3"));
  });
  it("derives current reuse from actual origin, asks only partial allocation and rejects allocating more than existing reuse", async () => {
    const external: Record<string, unknown> = { ...soil, rcs_soil_trench_reuse_origin: soilOrigins.external };
    delete external.rcs_soil_trench_reuse_loose_per_finished_m3;
    const result = await compile(external); expect(result.preliminaryNeeds).toEqual([]);
    expect(q(result, "rcs:soil:trench:external:current_reused_finished_m3")).toBe(0);
    expect(q(result, "rcs:soil:trench:external:excess_loose_m3")).toBe(121.25);
    expect(q(result, "rcs:trench-fill:approved_reused_finished_m3")).toBe(20);
    const partial = await compile({ ...soil, rcs_soil_trench_reuse_origin: soilOrigins.partial, rcs_soil_trench_reuse_current_finished_m3: 5 });
    expect(partial.preliminaryNeeds).toEqual([]); expect(q(partial, "rcs:soil:trench:partial:excess_loose_m3")).toBe(115.25);
    await expect(compile({ ...soil, rcs_soil_trench_reuse_origin: soilOrigins.partial, rcs_soil_trench_reuse_current_finished_m3: 21 })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
  it.each([0, "0"])("zero original reuse %s excludes origin/conversion; zero excess excludes destination, density, truck and receiving questions", async zero => {
    const input: Record<string, unknown> = { ...soil, rcs_trench_fill_approved_reused_finished_m3: zero, rcs_soil_trench_retained_loose_m3: 131.25 };
    for (const key of Object.keys(input)) if (key.startsWith("rcs_soil_trench_") && !["scope", "batch_reference", "loose_per_bank_m3", "allocation_reference", "retained_loose_m3"].some(s => key === `rcs_soil_trench_${s}`)) delete input[key];
    const result = await compile(input); expect(result.preliminaryNeeds).toEqual([]);
    expect(q(result, "rcs:soil:trench:zero_reuse:excess_loose_m3")).toBe(0);
    expect(result.rows.some(row => row.row_id.startsWith("rcs:soil:") && row.included_in_procurement)).toBe(false);
    for (const suffix of ["reuse_origin", "reuse_loose_per_finished_m3", "destination", "shipping_density_kg_m3", "vehicle_payload_kg", "receiving_mode"]) {
      const parameter = definition.parameters.find(p => p.parameter_id === `rcs_soil_trench_${suffix}`)!;
      expect(evaluateInclusionGraph(parameter.constraints_json!.requiredWhen as Record<string, unknown>, result.parameters)).toBe(false);
    }
  });
  it("keeps missing reuse conversion local while known excavated volume and independent purchases continue, even with manual haul", async () => {
    const input = { ...soil }; delete input.rcs_soil_trench_reuse_loose_per_finished_m3;
    const result = await compile(input, { [trip]: { quantity: "999", provenance } });
    expect(q(result, "rcs:soil:trench:excavated_loose_m3")).toBe(131.25);
    expect(q(result, "rcs:casing:ordered_casing_length_m")).toBe(48); expect(q(result, beddingOwner)).toBe(6);
    expect(result.rows.some(row => row.row_id === trip)).toBe(false);
    expect(result.preliminaryNeeds.find(need => need.row_id === trip)?.missing_parameter_ids).toContain("rcs_soil_trench_reuse_loose_per_finished_m3");
  });
  it.each(["batch_reference", "allocation_reference", "destination_reference", "haul_reference", "vehicle_designation", "shipping_density_kg_m3", "vehicle_payload_kg"])(
    "manual haul retains actual soil/route compatibility fact %s", async suffix => {
      const input = { ...soil }; delete input[`rcs_soil_trench_${suffix}`];
      const result = await compile(input, { [trip]: { quantity: "999", provenance } });
      expect(result.rows.some(row => row.row_id === trip)).toBe(false);
      expect(result.preliminaryNeeds.find(need => need.row_id === trip)?.missing_parameter_ids).toContain(`rcs_soil_trench_${suffix}`);
      expect(q(result, "rcs:casing:ordered_casing_length_m")).toBe(48);
    });
  it("does not conceal impossible retained/reused allocations or overlapping charge bases", async () => {
    await expect(compile({ ...soil, rcs_soil_trench_retained_loose_m3: 108 })).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
    await expect(compile({ ...soil, rcs_soil_trench_reuse_loose_per_finished_m3: 10 })).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
    await expect(compile({ ...soil, rcs_soil_trench_haul_cost_basis: "Разработка, транспорт и приём вместе" })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compile({ ...soil, rcs_soil_trench_receiving_cost_basis: "Приём с перевозкой" })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
  it("allows other-party haul with independently priced receiving in tonnes and uses placement as the other capacity limit", async () => {
    const input: Record<string, unknown> = { ...soil, rcs_soil_trench_haul_mode: freightModes.otherParty, rcs_soil_trench_receiving_mode: receivingModes.mass };
    for (const suffix of ["vehicle_designation", "vehicle_payload_kg", "vehicle_loose_capacity_m3", "haul_cost_basis"]) delete input[`rcs_soil_trench_${suffix}`];
    const row = `${prefix}receiving_tonnes`;
    const result = await compile(input, { [row]: { unitPrice: "3", provenance } });
    expect(result.preliminaryNeeds).toEqual([]); expect(q(result, row)).toBe(175.05); expect(result.totals.amount).toBe("525.15");
    expect(result.rows.some(r => r.row_id === trip)).toBe(false);
    const placement = await compile({ ...soil, rcs_soil_trench_vehicle_payload_kg: 30000, rcs_soil_trench_vehicle_loose_capacity_m3: 4 });
    expect(q(placement, trip)).toBe(25);
  });
  it("jacking uses only pits plus actual bore geometry and does not count an open trench or inflate reuse", async () => {
    const input: Record<string, unknown> = { ...soil, rcs_civil_installation_method: methods.pipeJacking,
      rcs_pit_fill_material_mode: fillModes.sameGranular, rcs_pit_fill_granular_product_designation: "TEST actual pit fill",
      rcs_pit_fill_approved_reused_finished_m3: 20, rcs_pit_fill_gross_supplied_volume_ratio: 1.2,
      rcs_pit_fill_compatible_loose_stock_m3: 0, rcs_pit_fill_retained_loose_reserve_m3: 0, rcs_pit_fill_supplier_loose_multiple_m3: 5 };
    for (const [key, value] of Object.entries(soil).filter(([key]) => key.startsWith("rcs_soil_trench_"))) input[key.replace("rcs_soil_trench_", "rcs_soil_jacking_")] = value;
    const result = await compile(input); expect(result.preliminaryNeeds).toEqual([]);
    const bank = 72 + 30 + 3.141592654 / 4 * 580 ** 2 * 35 / 1000000;
    // Canonical fixed-decimal operations round intermediate mm-area products;
    // the independent floating-point volume uses a sub-microlitre tolerance.
    expect(q(result, "rcs:soil:jacking:excavated_bank_m3")).toBeCloseTo(bank, 7);
    expect(q(result, "rcs:soil:jacking:excavated_bank_m3")).toBe(q(result, "rcs:civil:jacking_total_geometric_excavation_m3"));
    expect(q(result, "rcs:soil:jacking:current:excess_loose_m3")).toBeCloseTo(bank * 1.25 - 24 - 10, 7);
    expect(result.rows.some(row => row.row_id.startsWith("rcs:soil:trench:"))).toBe(false);
    expect(q(result, "rcs:civil-execution:jacking_pits:crew_hours")).toBe(40.8);
  });
  it("retains homogeneous excavation quantity when fill is unknown and leaves heterogeneous/slurry scope explicit", async () => {
    const input = { ...soil }; delete input.rcs_trench_fill_material_mode;
    const result = await compile(input); expect(q(result, "rcs:soil:trench:excavated_loose_m3")).toBe(131.25);
    expect(result.preliminaryNeeds.find(need => need.row_id === trip)?.missing_parameter_ids).toContain("rcs_trench_fill_material_mode");
    const other = await compile({ ...soil, rcs_soil_trench_scope: soilModes.other });
    expect(other.rows.some(row => row.row_id.startsWith("rcs:soil:"))).toBe(false);
    expect(components.scope.fullOwner).toBe(false); expect(components.scope.readyForPublication).toBe(false);
  });
});

describe("full assembly freight with actual dedicated load plans", () => {
  const lane = (key: string, mass: number, payload: number, capacity: number, maxLength = 12): Record<string, unknown> => ({
    [`rcs_freight_${key}_mode`]: freightModes.separate,
    [`rcs_freight_${key}_allocation_reference`]: "TEST actual route/load plan: one dedicated cargo, no overlapping supplier or stock trips",
    [`rcs_freight_${key}_vehicle_designation`]: "TEST compatible dedicated vehicle",
    [`rcs_freight_${key}_shipping_kg_per_unit`]: mass,
    [`rcs_freight_${key}_payload_kg`]: payload,
    [`rcs_freight_${key}_max_units_per_trip`]: capacity,
    ...(/^(casing|carrier)_/u.test(key) ? { [`rcs_freight_${key}_max_section_length_m`]: maxLength } : {}),
    [`rcs_freight_${key}_cost_basis`]: freightBasis,
  });
  const casing = { ...fixture, ...lane("casing_new", 1000, 2500, 5) };
  const trip = "rcs:freight:casing_new:trip_count";
  it("counts whole pipe sections by payload and placement, prices one full round trip and preserves installed joints", async () => {
    const result = await compile(casing, { [trip]: { unitPrice: "70", provenance } });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(q(result, "rcs:freight:casing_new:cargo_units")).toBe(4);
    expect(q(result, "rcs:freight:casing_new:shipping_mass_kg")).toBe(4000);
    expect(q(result, "rcs:freight:casing_new:effective_units_per_trip")).toBe(2);
    expect(q(result, trip)).toBe(2); expect(result.totals.amount).toBe("140");
    expect(q(result, "rcs:casing:installed_section_count")).toBe(3);
    expect(q(result, "rcs:joint:site_joint_count")).toBe(2);
    expect(result.rows.filter(row => row.row_id.startsWith("rcs:freight:") && row.included_in_procurement).map(row => row.row_id)).toEqual([trip]);
    expect(components.stageMatrix.find(stage => stage.stageId === "completion")?.ownResourceIds).toContain(trip);
  });
  it("keeps newly ordered sections, off-site stock and site stock in distinct dedicated deliveries", async () => {
    const input = { ...casing, rcs_compatible_stock_section_count: 2, rcs_freight_casing_offsite_stock_units: 2,
      ...lane("casing_stock", 1000, 2500, 5) };
    const stockTrip = "rcs:freight:casing_stock:trip_count";
    const result = await compile(input, { [trip]: { unitPrice: "70", provenance }, [stockTrip]: { unitPrice: "50", provenance } });
    expect(result.preliminaryNeeds).toEqual([]); expect(q(result, trip)).toBe(1); expect(q(result, stockTrip)).toBe(1);
    expect(q(result, "rcs:casing:ordered_casing_length_m")).toBe(24); expect(result.totals.amount).toBe("120");
    const onSite = await compile({ ...input, rcs_freight_casing_offsite_stock_units: 0 });
    expect(onSite.rows.some(row => row.row_id.startsWith("rcs:freight:casing_stock:"))).toBe(false);
    expect(q(onSite, trip)).toBe(1);
    await expect(compile({ ...input, rcs_freight_casing_offsite_stock_units: 3 })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
  it("uses supplied loose volume and actual bulk mass, never calls the order multiple a vehicle trip", async () => {
    const result = await compile({ ...fixture, ...lane("bedding_new", 1800, 5000, 4) });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(q(result, "rcs:bedding:ordered_loose_m3")).toBe(6);
    expect(q(result, "rcs:bedding:supplier_multiple_count")).toBe(3);
    expect(q(result, "rcs:freight:bedding_new:trip_count")).toBe(3);
    const placementLimited = await compile({ ...fixture, ...lane("bedding_new", 1000, 20000, 4) });
    expect(q(placementLimited, "rcs:freight:bedding_new:trip_count")).toBe(2);
    expect(q(placementLimited, "rcs:fill-execution:bedding:crew_hours")).toBeCloseTo(3.15, 6);
  });
  it("keeps whole dry bags in a payload-limited load and never ships reserve as additional mixing water", async () => {
    const result = await compile({ ...selectedInternal, ...lane("internal_dry_new", 1.1, 75, 100) });
    expect(result.preliminaryNeeds).toEqual([]);
    const kg = q(result, "rcs:internal-fill:ordered_dry_kg");
    expect(q(result, "rcs:freight:internal_dry_new:effective_units_per_trip")).toBe(50);
    expect(q(result, "rcs:freight:internal_dry_new:trip_count")).toBe(kg / 50);
    const changed = await compile({ ...selectedInternal, rcs_internal_fill_retained_dry_reserve_kg: 125, ...lane("internal_dry_new", 1.1, 75, 100) });
    expect(q(changed, "rcs:freight:internal_dry_new:trip_count")).toBe(kg / 50 + 2);
    expect(q(changed, "rcs:internal-fill:mixing_water_m3")).toBe(q(result, "rcs:internal-fill:mixing_water_m3"));
  });
  it("automatically excludes zero shipment and its route/truck questions without a manually computed flag", async () => {
    const input: Record<string, unknown> = { ...fixture, rcs_compatible_stock_section_count: 4, rcs_freight_casing_offsite_stock_units: 0 };
    for (const key of Object.keys(input)) if (key.startsWith("rcs_freight_casing_new_")) delete input[key];
    const result = await compile(input); expect(result.preliminaryNeeds).toEqual([]);
    expect(q(result, "rcs:casing:ordered_casing_length_m")).toBe(0);
    expect(result.rows.some(row => row.row_id.startsWith("rcs:freight:casing_"))).toBe(false);
    for (const parameter of definition.parameters.filter(p => p.parameter_id.startsWith("rcs_freight_casing_new_"))) {
      expect(evaluateInclusionGraph(parameter.constraints_json!.requiredWhen as Record<string, unknown>, result.parameters)).toBe(false);
    }
  });
  it("keeps unavailable shipping mass local even under a manual trip override", async () => {
    const input = { ...casing }; delete input.rcs_freight_casing_new_shipping_kg_per_unit;
    const result = await compile(input, { [trip]: { quantity: "999", provenance } });
    expect(result.preliminaryNeeds.map(need => need.row_id)).toEqual([
      "rcs:freight:casing_new:shipping_mass_kg", "rcs:freight:casing_new:effective_units_per_trip", trip,
    ]);
    expect(result.preliminaryNeeds.every(need => need.missing_parameter_ids.includes("rcs_freight_casing_new_shipping_kg_per_unit"))).toBe(true);
    expect(result.rows.some(row => row.row_id === trip)).toBe(false);
    expect(q(result, "rcs:casing:ordered_casing_length_m")).toBe(48); expect(q(result, beddingOwner)).toBe(6);
  });
  it("cannot transport an unknown casing diameter through a manually supplied trip quantity", async () => {
    const input = { ...casing }; delete input.rcs_casing_inside_diameter_mm;
    const result = await compile(input, { [trip]: { quantity: "999", provenance } });
    expect(result.preliminaryNeeds.find(need => need.row_id === trip)?.missing_parameter_ids).toContain("rcs_casing_inside_diameter_mm");
    expect(q(result, beddingOwner)).toBe(6);
  });
  it("rejects impossible whole-section cargo, short vehicles and overlapping all-in cost bases", async () => {
    await expect(compile({ ...casing, rcs_freight_casing_new_payload_kg: 999 })).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
    await expect(compile({ ...casing, rcs_freight_casing_new_max_section_length_m: 11 })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compile({ ...casing, rcs_freight_casing_new_cost_basis: "Материал, монтаж и доставка оплачиваются вместе" })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
  it("requires an actual allocation document and preserves explicit other-party delivery without a second cost", async () => {
    const input = { ...casing }; delete input.rcs_freight_casing_new_allocation_reference;
    const result = await compile(input, { [trip]: { quantity: "999", provenance } });
    expect(result.preliminaryNeeds.find(need => need.row_id === trip)?.missing_parameter_ids).toContain("rcs_freight_casing_new_allocation_reference");
    const supplied = await compile({ ...casing, rcs_freight_casing_new_mode: freightModes.otherParty }, { [trip]: { unitPrice: "100", provenance } });
    expect(supplied.rows.some(row => row.row_id === trip)).toBe(false); expect(supplied.totals.amount).toBe("0");
    expect(supplied.parameters.rcs_freight_casing_new_payload_kg).toBe(2500);
    expect(aiEstimateRuUnitForParameter("cargo_mass", "kg_per_piece")).toBe("кг/шт.");
    expect(aiEstimateRuUnitForParameter("cargo_mass", "kg_per_kg")).toBe("кг/кг");
  });
});

describe("road-casing component integration, not full crossing acceptance", () => {
  it("declares each original fact, formula and resource only once with no derived-question duplicates", () => {
    for (const ids of [definition.parameters.map(p => p.parameter_id), definition.formulas.map(f => f.formula_id), definition.resources.map(r => r.row_id)]) {
      expect(new Set(ids).size).toBe(ids.length);
    }
    expect(definition.parameters.map(p => p.parameter_id).sort()).toEqual(parameters.map(p => p.id).sort());
    expect(parameters.some(p => /(?:installed_section_count|ordered_casing_length|site_joint_count|assembled_diameter|total_geometric_excavation)/u.test(p.id))).toBe(false);
    expect(definition.runtimeInput).toEqual({});
  });
  it.each([methods.openCut, methods.pipeJacking])("shares one section/product graph and excludes the other civil method: %s", async method => {
    const result = await compile({ ...fixture, rcs_civil_installation_method: method });
    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(q(result, "rcs:casing:installed_section_count")).toBe(3);
    expect(q(result, "rcs:casing:ordered_casing_length_m")).toBe(48);
    expect(q(result, "rcs:joint:site_joint_count")).toBe(2);
    expect(q(result, "rcs:raci_assembled_diameter")).toBe(360);
    expect(q(result, "rcs:raci-elements:installed")).toBe(68);
    const civil = result.rows.filter(row => row.row_id.startsWith("rcs:civil:"));
    expect(civil.length).toBeGreaterThan(0);
    expect(civil.every(row => row.section === `Геометрия: ${method}` && !row.included_in_estimate && !row.included_in_procurement)).toBe(true);
    expect(result.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual(applicableOwners(method));
    expect(result.rows.filter(row => row.included_in_procurement).map(row => row.row_id)).toEqual(applicableOwners(method));
    expect(result.rows.filter(row => row.included_in_estimate).every(row => row.unit_price === null)).toBe(true);
  });
  it("totals exactly the selected new material orders and disjoint joint crew/equipment, not informational controls", async () => {
    const rates = [10, 2, 30, 3, 10, 20, 30, 4, 2, 3, 2, 3, ...[2, 3, 2, 3, 2, 3, 2, 3, 2, 3]];
    const paid = applicableOwners(methods.openCut);
    const result = await compile(fixture, Object.fromEntries(paid.map((id, index) => [id, { unitPrice: String(rates[index]), provenance }])));
    // Existing 1306.45 plus five distinct mechanical operations: 60 installed
    // units * (1 crew-h*2 +0.25 equipment-h*3), no reserved supply work.
    expect(paid.map(id => q(result, id))).toEqual([48, 70, 2, 5, 5, 6, 8, 6, 52.5, 21, 3.15, 1.05, 3, 0.75, 3, 0.75, 17, 4.25, 35, 8.75, 2, 0.5]);
    expect(result.totals.amount).toBe("1471.45");
  });
  it.each([methods.openCut, methods.pipeJacking])("a one-section %s crossing does not ask for or pay joint resources", async method => {
    const input: Record<string, unknown> = { ...fixture, rcs_crossing_length_m: 12, rcs_civil_installation_method: method };
    for (const parameter of jointParameters) delete input[parameter.id];
    const result = await compile(input, { "rcs:joint:crew_person_hours": { quantity: "999", provenance } });
    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(q(result, "rcs:joint:site_joint_count")).toBe(0);
    expect(result.rows.filter(row => row.row_id.startsWith("rcs:joint:")).map(row => row.row_id)).toEqual(["rcs:joint:site_joint_count"]);
    expect(result.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual([
      ...owners.slice(0, 4), ...(method === methods.openCut ? [beddingOwner] : []), ...executionOwners(method),
      ...(method === methods.openCut ? fillExecutionOwners("bedding") : []), ...mechanicalOwners(method),
    ]);
  });
  it("a supplier casing bundle changes only its order/balance, not site joints or spacer/consumable installation", async () => {
    const result = await compile({ ...fixture, rcs_supplier_bundle_section_count: 10 });
    expect(q(result, "rcs:casing:ordered_casing_length_m")).toBe(120);
    expect(q(result, "rcs:joint:site_joint_count")).toBe(2);
    expect(q(result, "rcs:joint:electrode_consumed")).toBe(4);
    expect(q(result, "rcs:raci-elements:installed")).toBe(68);
  });
  it("zero bedding removes its purchase even with a retained positive material rate and manual order", async () => {
    const result = await compile({ ...fixture, rcs_open_cut_full_width_bedding_thickness_m: 0 }, {
      [beddingOwner]: { quantity: "999", unitPrice: "10", provenance },
    });
    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(result.rows.some(row => row.row_id.startsWith("rcs:bedding:"))).toBe(false);
    expect(result.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual([...owners, ...executionOwners(methods.openCut), ...mechanicalOwners(methods.openCut)]);
  });
  it("unknown bedding product gates its purchase and execution, never the independently known casing or joint orders", async () => {
    const input = { ...fixture }; delete input.rcs_bedding_granular_product_designation;
    const result = await compile(input, { [beddingOwner]: { quantity: "999", provenance } });
    expect(result.preliminaryNeeds).toHaveLength(5);
    expect(result.preliminaryNeeds[0]).toMatchObject({ row_id: beddingOwner, missing_parameter_ids: ["rcs_bedding_granular_product_designation"] });
    expect(result.preliminaryNeeds.map(need => need.row_id)).toEqual([beddingOwner, ...fillExecutionOwners("bedding"), "rcs:compaction-water:bedding:consumed_m3", "rcs:freight:bedding_new:cargo_units"]);
    expect(result.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual([...owners, ...executionOwners(methods.openCut), ...mechanicalOwners(methods.openCut)]);
  });
  it("unknown civil method remains one fact at its exact branch needs, not an invented full-length trench", async () => {
    const input = { ...fixture }; delete input.rcs_civil_installation_method;
    const result = await compile(input);
    expect(result.rows.some(row => row.row_id.startsWith("rcs:civil:"))).toBe(false);
    expect(result.preliminaryNeeds.length).toBeGreaterThan(0);
    expect(result.preliminaryNeeds.every(need => /^(?:rcs:civil:|rcs:civil-execution:|rcs:fill-execution:|rcs:compaction-water:|rcs:bedding:|rcs:pit-return:|rcs:mechanical:casing_lowering:|rcs:mechanical:casing_jacking_loading:scope_section_count$|rcs:freight:(?:bedding|pits|trench)_new:cargo_units$)/u.test(need.row_id) && need.need_state === "CONDITION_REQUIRED")).toBe(true);
    expect([...new Set(result.preliminaryNeeds.flatMap(need => need.missing_parameter_ids))]).toEqual(["rcs_civil_installation_method"]);
    expect(result.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual([...owners, ...mechanicalOwners()]);
  });
  it("unknown WPS gates the joint owners, not the known casing/spacer/seal/tape orders", async () => {
    const input = { ...fixture }; delete input.rcs_joint_wps_reference;
    const result = await compile(input);
    expect(result.preliminaryNeeds.length).toBeGreaterThan(0);
    expect(result.preliminaryNeeds.every(need => /^(?:rcs:joint:|rcs:inspection:program_joint_count$)/u.test(need.row_id)
      && need.missing_parameter_ids.includes("rcs_joint_wps_reference"))).toBe(true);
    expect(result.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual([...owners.slice(0, 4), beddingOwner, ...executionOwners(methods.openCut), ...fillExecutionOwners("bedding"), ...mechanicalOwners(methods.openCut)]);
  });
  it("reuses actual pit geometry and gates unknown retained volume locally, without an extra paid owner", async () => {
    const input: Record<string, unknown> = { ...fixture, rcs_civil_installation_method: methods.pipeJacking };
    const known = await compile(input);
    expect(q(known, "rcs:pit-return:total_remaining_space_m3")).toBe(83);
    const changedCrossing = await compile({ ...input, rcs_crossing_length_m: 70, rcs_jacking_confirmed_excavation_diameter_mm: 1000 });
    expect(q(changedCrossing, "rcs:pit-return:total_remaining_space_m3")).toBe(83);
    expect(known.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual(applicableOwners(methods.pipeJacking));
    delete input.rcs_jacking_reception_permanent_occupied_volume_m3;
    const unknown = await compile(input, { "rcs:pit-return:total_remaining_space_m3": { quantity: "999", provenance } });
    expect(unknown.preliminaryNeeds).toHaveLength(2);
    expect(unknown.preliminaryNeeds.every(need => need.row_id.startsWith("rcs:pit-return:") && need.missing_parameter_ids.includes("rcs_jacking_reception_permanent_occupied_volume_m3"))).toBe(true);
    expect(q(unknown, "rcs:civil:jacking_reception_pit_excavation_m3")).toBe(30);
    expect(q(unknown, "rcs:pit-return:thrust_remaining_space_m3")).toBe(60);
    expect(unknown.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual(applicableOwners(methods.pipeJacking));
  });
  it("unknown joint envelope leaves casing and welding known, while RACI selection gates remain local", async () => {
    const input = { ...fixture }; delete input.rcs_maximum_joint_envelope_diameter_mm;
    const result = await compile(input);
    expect(result.preliminaryNeeds.some(need => need.row_id === "rcs:raci_joint_diametral_difference")).toBe(true);
    expect(result.rows.some(row => row.row_id === "rcs:raci-elements:ordered")).toBe(false);
    expect(result.rows.some(row => row.row_id === "rcs:contact-tape:ordered")).toBe(false);
    expect(q(result, "rcs:casing:ordered_casing_length_m")).toBe(48);
    expect(q(result, "rcs:joint:crew_person_hours")).toBe(6);
  });
  it("adds exactly one selected pit-fill purchase owner without changing crossing/joint geometry or paying reused soil again", async () => {
    const input: Record<string, unknown> = { ...fixture, rcs_civil_installation_method: methods.pipeJacking,
      rcs_pit_fill_material_mode: fillModes.sameGranular, rcs_pit_fill_granular_product_designation: "TEST-OWNED pit granular fill",
      rcs_pit_fill_approved_reused_finished_m3: 20, rcs_pit_fill_gross_supplied_volume_ratio: 1.2,
      rcs_pit_fill_compatible_loose_stock_m3: 10, rcs_pit_fill_retained_loose_reserve_m3: 2, rcs_pit_fill_supplier_loose_multiple_m3: 5 };
    const pitFillOwner = "rcs:pit-fill:ordered_loose_m3";
    const result = await compile(input, { [pitFillOwner]: { unitPrice: "4", provenance } });
    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(q(result, pitFillOwner)).toBe(70);
    expect(q(result, "rcs:casing:ordered_casing_length_m")).toBe(48);
    expect(q(result, "rcs:joint:site_joint_count")).toBe(2);
    expect(result.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual([...owners, pitFillOwner, ...executionOwners(methods.pipeJacking), ...fillExecutionOwners("pits"), ...mechanicalOwners(methods.pipeJacking)]);
    expect(result.rows.filter(row => row.included_in_procurement).map(row => row.row_id)).toEqual([...owners, pitFillOwner, ...executionOwners(methods.pipeJacking), ...fillExecutionOwners("pits"), ...mechanicalOwners(methods.pipeJacking)]);
    // Other owner prices stay honest NULL; only this synthetic priced order is summed.
    expect(result.totals.amount).toBe("280");
    delete input.rcs_pit_fill_approved_reused_finished_m3;
    const unknown = await compile(input, { [pitFillOwner]: { quantity: "999", provenance } });
    expect(unknown.rows.some(row => row.row_id === pitFillOwner)).toBe(false);
    expect(unknown.preliminaryNeeds.every(need => (need.row_id.startsWith("rcs:pit-fill:") || need.row_id === "rcs:freight:pits_new:cargo_units") && need.missing_parameter_ids.includes("rcs_pit_fill_approved_reused_finished_m3"))).toBe(true);
    expect(q(unknown, "rcs:pit-return:total_remaining_space_m3")).toBe(83);
    expect(unknown.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual([...owners, ...executionOwners(methods.pipeJacking), ...fillExecutionOwners("pits"), ...mechanicalOwners(methods.pipeJacking)]);
  });
  it("cannot bypass selected spacer compatibility by manually replacing either its control or paid material", async () => {
    await expect(compile({ ...fixture, rcs_raci_selected_element_height_mm: 180 }, {
      "rcs:raci_insertion_diametral_difference": { quantity: "999", provenance }, "rcs:raci-elements:ordered": { quantity: "1", provenance },
    })).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
  });
  it("adds one internal dry-product owner independent of outside excavation and pit fill, never a second water/bag charge", async () => {
    const input = selectedInternal;
    const internalOwner = "rcs:internal-fill:ordered_dry_kg";
    const result = await compile(input, { [internalOwner]: { unitPrice: "4", provenance } });
    const independentNet = Math.PI / 4 * (510 ** 2 - 160 ** 2) * 35 / 1e6 - 0.1;
    const independentOrder = Math.ceil((independentNet * 1000 + 25 - 100) / 50) * 50;
    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(q(result, "rcs:internal-fill:net_fill_m3")).toBeCloseTo(independentNet, 6);
    expect(q(result, internalOwner)).toBe(independentOrder);
    expect(q(result, "rcs:internal-fill:mixing_water_m3")).toBeCloseTo(independentNet * 0.1, 6);
    expect(result.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual([...owners, beddingOwner, internalOwner, ...executionOwners(methods.openCut), ...fillExecutionOwners("bedding"), ...fillExecutionOwners("internal"), ...mechanicalOwners(methods.openCut)]);
    expect(result.rows.filter(row => row.included_in_procurement).map(row => row.row_id)).toEqual([...owners, beddingOwner, internalOwner, ...executionOwners(methods.openCut), ...fillExecutionOwners("bedding"), ...fillExecutionOwners("internal"), ...mechanicalOwners(methods.openCut)]);
    expect(result.totals.amount).toBe(String(independentOrder * 4));
    const outsideChanged = await compile({ ...input, rcs_civil_installation_method: methods.pipeJacking,
      rcs_jacking_confirmed_excavation_diameter_mm: 800, rcs_jacking_thrust_excavation_width_m: 5 });
    expect(q(outsideChanged, internalOwner)).toBe(independentOrder);
    expect(q(outsideChanged, "rcs:pit-return:total_remaining_space_m3")).toBe(101);
    expect(q(outsideChanged, "rcs:casing:ordered_casing_length_m")).toBe(48);
  });
  it("unknown internal-fill choice localizes its own needs without withholding known casing/civil/joint components", async () => {
    const input = { ...fixture }; delete input.rcs_internal_fill_mode;
    const result = await compile(input, { "rcs:internal-fill:ordered_dry_kg": { quantity: "999", provenance } });
    expect(result.rows.some(row => row.row_id.startsWith("rcs:internal-fill:"))).toBe(false);
    expect(result.preliminaryNeeds.length).toBeGreaterThan(0);
    expect(result.preliminaryNeeds.every(need => /^(?:rcs:internal-fill:|rcs:fill-execution:internal:|rcs:freight:internal_dry_new:cargo_units$)/u.test(need.row_id)
      && need.missing_parameter_ids.includes("rcs_internal_fill_mode"))).toBe(true);
    expect(result.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual(applicableOwners(methods.openCut));
  });
  it("retains explicit resource overrides across primary changes and resets to current shared formulas", async () => {
    const pin = { "rcs:joint:crew_person_hours": { quantity: "7", provenance } };
    expect(q(await compile(fixture, pin), "rcs:joint:crew_person_hours")).toBe(7);
    const changed = { ...fixture, rcs_crossing_length_m: 37 };
    expect(q(await compile(changed, pin), "rcs:joint:crew_person_hours")).toBe(7);
    const reset = await compile(changed);
    expect(q(reset, "rcs:joint:crew_person_hours")).toBe(9);
    expect(q(reset, "rcs:casing:ordered_casing_length_m")).toBe(72);
  });
  it("returns the explicit omissions beside the definition, never a full/published/engineer-approved owner", () => {
    expect(components.scope).toMatchObject({ fullOwner: false, engineeringAccepted: false, readyForPublication: false });
    expect(components.scope.omitted).toContain("Shoring/reaction actual design/method/load/interface approval, other consumables/waste and other kits/programmes; gap sealing, trenches, partial/nonrectangular/multiple/relocated/reused fill and retained-fill allocation approval; foundations/retained concrete/piles/anchors and other reaction schemes, groundwater measures; actual applicability and approved civil execution rates");
    for (const resource of definition.resources) expect(resource.source_metadata?.excludedUnownedAssumptions).toEqual([...components.scope.omitted]);
  });

  it("partitions actual resources across every construction stage and keeps unimplemented stages explicit", () => {
    const ids = components.stageMatrix.flatMap(stage => stage.ownResourceIds);
    expect(ids.sort()).toEqual(definition.resources.map(row => row.row_id).sort());
    expect(new Set(ids).size).toBe(ids.length);
    expect(components.stageMatrix.map(stage => stage.stageId)).toEqual([
      "preparation", "installation", "bedding", "casing", "carrier_and_supports", "internal_fill", "backfill", "completion",
    ]);
    expect(components.stageMatrix.every(stage => stage.remaining.length > 0)).toBe(true);
  });

  it("keeps pit excavation and drive advancement separate from each other and the bore's geometric volume", async () => {
    const result = await compile({ ...fixture, rcs_civil_installation_method: methods.pipeJacking });
    expect(q(result, "rcs:civil-execution:jacking_pits:crew_hours")).toBe(40.8);
    expect(q(result, "rcs:civil-execution:jacking_pits:equipment_hours")).toBe(10.2);
    expect(q(result, "rcs:civil-execution:jacking_advance:crew_hours")).toBe(70);
    expect(q(result, "rcs:civil-execution:jacking_advance:equipment_hours")).toBe(52.5);
    expect(result.rows.filter(row => row.row_id.startsWith("rcs:civil:")).every(row => !row.included_in_estimate)).toBe(true);
    expect(result.rows.some(row => row.row_id.startsWith("rcs:civil-execution:open_cut:"))).toBe(false);
  });

  it("keeps a missing equipment technology local while independent labor and materials still calculate", async () => {
    const input = { ...fixture }; delete input.rcs_civil_open_cut_equipment_designation;
    const rowId = "rcs:civil-execution:open_cut:equipment_hours";
    const result = await compile(input, { [rowId]: { quantity: 999, unitPrice: 10, provenance } });
    expect(result.rows.some(row => row.row_id === rowId)).toBe(false);
    expect(result.preliminaryNeeds).toHaveLength(1);
    expect(result.preliminaryNeeds[0]).toMatchObject({ row_id: rowId, quantity: "999", need_state: "CONDITION_REQUIRED",
      missing_parameter_ids: ["rcs_civil_open_cut_equipment_designation"] });
    expect(q(result, "rcs:civil-execution:open_cut:crew_hours")).toBe(52.5);
    expect(q(result, "rcs:casing:ordered_casing_length_m")).toBe(48);
  });

  it("does not let manual operating time replace the unknown original excavation dimensions or method reference", async () => {
    for (const missing of ["rcs_open_cut_excavation_depth_m", "rcs_civil_open_cut_method_reference"]) {
      const input = { ...fixture }; delete input[missing];
      const rowId = "rcs:civil-execution:open_cut:equipment_hours";
      const result = await compile(input, { [rowId]: { quantity: 999, provenance } });
      expect(result.rows.some(row => row.row_id === rowId)).toBe(false);
      expect(result.preliminaryNeeds.find(need => need.row_id === rowId)?.missing_parameter_ids).toContain(missing);
    }
  });

  it("keeps unknown and explicit zero execution rates distinct, without installing fixture rates as defaults", async () => {
    const input = { ...fixture }; delete input.rcs_civil_open_cut_crew_h_per_unit;
    const unknown = await compile(input);
    expect(unknown.preliminaryNeeds[0]).toMatchObject({ row_id: "rcs:civil-execution:open_cut:crew_hours",
      quantity: null, need_state: "QUANTITY_REQUIRED", missing_parameter_ids: ["rcs_civil_open_cut_crew_h_per_unit"] });
    const zero = await compile({ ...fixture, rcs_civil_open_cut_crew_h_per_unit: 0 });
    expect(zero.preliminaryNeeds).toEqual([]);
    expect(q(zero, "rcs:civil-execution:open_cut:crew_hours")).toBe(0);
    expect(definition.runtimeInput).toEqual({});
  });

  it("rejects an overlapping equipment cost basis that already includes crew instead of charging operators twice", async () => {
    await expect(compile({ ...fixture, rcs_civil_open_cut_equipment_cost_basis: "All-in with operator" })).rejects.toMatchObject({
      code: "PARAMETER_VALIDATION_FAILED",
    });
  });
  it("integrates selected trench supply beside bedding/casing/execution, without paying the inactive pit purchase", async () => {
    const input = selectedTrench;
    const result = await compile(input);
    expect(result.preliminaryNeeds).toEqual([]);
    expect(q(result, "rcs:trench-fill:ordered_loose_m3")).toBe(80);
    expect(q(result, beddingOwner)).toBe(6);
    expect(q(result, "rcs:casing:ordered_casing_length_m")).toBe(48);
    expect(result.rows.filter(row => row.included_in_procurement).map(row => row.row_id)).toEqual([
      ...owners, beddingOwner, "rcs:trench-fill:ordered_loose_m3", ...executionOwners(methods.openCut), ...fillExecutionOwners("bedding"), ...fillExecutionOwners("trench"), ...mechanicalOwners(methods.openCut),
    ]);
    expect(components.stageMatrix.find(stage => stage.stageId === "backfill")?.ownResourceIds).toContain("rcs:trench-fill:ordered_loose_m3");
    const missingProduct: Record<string, unknown> = { ...input }; delete missingProduct.rcs_trench_fill_granular_product_designation;
    const preliminary = await compile(missingProduct, { "rcs:trench-fill:ordered_loose_m3": { quantity: "999", provenance } });
    expect(preliminary.preliminaryNeeds.map(need => need.row_id)).toEqual(["rcs:trench-fill:ordered_loose_m3", ...fillExecutionOwners("trench"), "rcs:compaction-water:trench:consumed_m3", "rcs:freight:trench_new:cargo_units"]);
    expect(preliminary.preliminaryNeeds.every(need => need.missing_parameter_ids.includes("rcs_trench_fill_granular_product_designation"))).toBe(true);
    expect(q(preliminary, beddingOwner)).toBe(6);
    expect(q(preliminary, "rcs:civil-execution:open_cut:crew_hours")).toBe(52.5);
  });
  it("places and compacts installed finished geometry, including reuse, instead of ordered or consumed loose material", async () => {
    const result = await compile(selectedTrench);
    const net = q(result, "rcs:trench-fill:net_remaining_space_m3");
    expect(q(result, "rcs:fill-execution:bedding:crew_hours")).toBe(3.15);
    expect(q(result, "rcs:fill-execution:bedding:equipment_hours")).toBe(1.05);
    expect(q(result, "rcs:fill-execution:trench:crew_hours")).toBeCloseTo(net * 0.6, 6);
    expect(q(result, "rcs:fill-execution:trench:equipment_hours")).toBeCloseTo(net * 0.2, 6);
    for (const patch of [{ rcs_trench_fill_compatible_loose_stock_m3: 1000 }, { rcs_trench_fill_retained_loose_reserve_m3: 40 },
      { rcs_trench_fill_supplier_loose_multiple_m3: 50 }, { rcs_trench_fill_approved_reused_finished_m3: 0 },
      { rcs_trench_fill_approved_reused_finished_m3: 40 }, { rcs_trench_fill_gross_supplied_volume_ratio: 2 }]) {
      const changed = await compile({ ...selectedTrench, ...patch });
      expect(q(changed, "rcs:fill-execution:trench:crew_hours")).toBe(q(result, "rcs:fill-execution:trench:crew_hours"));
      expect(q(changed, "rcs:fill-execution:trench:equipment_hours")).toBe(q(result, "rcs:fill-execution:trench:equipment_hours"));
    }
    const changedGeometry = await compile({ ...selectedTrench, rcs_open_cut_excavation_depth_m: 2.2 });
    expect(q(changedGeometry, "rcs:fill-execution:trench:crew_hours")).toBeCloseTo((net + 10.5) * 0.6, 6);
  });
  it("full approved reuse removes new consumption but retains placing work; zero actual fill space yields zero work", async () => {
    const baseline = await compile(selectedTrench);
    const net = q(baseline, "rcs:trench-fill:net_remaining_space_m3");
    const fullReuse = await compile({ ...selectedTrench, rcs_trench_fill_approved_reused_finished_m3: net });
    expect(q(fullReuse, "rcs:trench-fill:consumed_loose_m3")).toBe(0);
    expect(q(fullReuse, "rcs:fill-execution:trench:crew_hours")).toBeCloseTo(net * 0.6, 6);
    const remaining = q(baseline, "rcs:civil:open_cut_remaining_fill_space_m3");
    const empty = await compile({ ...selectedTrench, rcs_trench_fill_other_permanent_occupied_volume_m3: remaining, rcs_trench_fill_approved_reused_finished_m3: 0 });
    expect(q(empty, "rcs:fill-execution:trench:crew_hours")).toBe(0);
    expect(q(empty, "rcs:fill-execution:trench:equipment_hours")).toBe(0);
  });
  it("unknown supply ratios do not block independently known execution, while unknown actual equipment stays local", async () => {
    const input = { ...selectedTrench }; delete input.rcs_trench_fill_gross_supplied_volume_ratio;
    const result = await compile(input);
    expect(result.preliminaryNeeds.every(need => need.row_id.startsWith("rcs:trench-fill:") || need.row_id === "rcs:freight:trench_new:cargo_units")).toBe(true);
    expect(q(result, "rcs:fill-execution:trench:crew_hours")).toBeGreaterThan(0);
    const missingEquipment = { ...selectedTrench }; delete missingEquipment.rcs_fill_trench_equipment_designation;
    const equipmentRow = "rcs:fill-execution:trench:equipment_hours";
    const equipmentNeed = await compile(missingEquipment, { [equipmentRow]: { quantity: "999", provenance } });
    expect(equipmentNeed.preliminaryNeeds).toEqual([expect.objectContaining({ row_id: equipmentRow, quantity: "999",
      missing_parameter_ids: ["rcs_fill_trench_equipment_designation"] })]);
    expect(q(equipmentNeed, "rcs:trench-fill:ordered_loose_m3")).toBe(80);
    expect(q(equipmentNeed, "rcs:fill-execution:trench:crew_hours")).toBeGreaterThan(0);
  });
  it.each(["rcs_open_cut_excavation_depth_m", "rcs_trench_fill_other_permanent_occupied_volume_m3", "rcs_fill_trench_method_reference"])("manual compaction hours cannot replace actual %s", async missing => {
    const input = { ...selectedTrench }; delete input[missing];
    const rowId = "rcs:fill-execution:trench:crew_hours";
    const result = await compile(input, { [rowId]: { quantity: "999", provenance } });
    expect(result.rows.some(row => row.row_id === rowId)).toBe(false);
    expect(result.preliminaryNeeds.find(need => need.row_id === rowId)?.missing_parameter_ids).toContain(missing);
    expect(q(result, "rcs:fill-execution:bedding:crew_hours")).toBe(3.15);
  });
  it("keeps missing and explicit zero compaction rates distinct and rejects an overlapping operator-inclusive equipment price basis", async () => {
    const input = { ...selectedTrench }; delete input.rcs_fill_trench_crew_h_per_finished_m3;
    const result = await compile(input);
    expect(result.preliminaryNeeds).toEqual([expect.objectContaining({ row_id: "rcs:fill-execution:trench:crew_hours",
      need_state: "QUANTITY_REQUIRED", missing_parameter_ids: ["rcs_fill_trench_crew_h_per_finished_m3"] })]);
    expect(q(await compile({ ...selectedTrench, rcs_fill_trench_crew_h_per_finished_m3: 0 }), "rcs:fill-execution:trench:crew_hours")).toBe(0);
    await expect(compile({ ...selectedTrench, rcs_fill_trench_equipment_cost_basis: "All-in with operators" })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
  it("mixes/places internal finished volume without increasing hours for dry bags, reserve or purchase surplus", async () => {
    const result = await compile(selectedInternal);
    const net = q(result, "rcs:internal-fill:net_fill_m3");
    expect(q(result, "rcs:fill-execution:internal:crew_hours")).toBeCloseTo(net * 0.6, 6);
    expect(q(result, "rcs:fill-execution:internal:equipment_hours")).toBeCloseTo(net * 0.2, 6);
    expect(components.stageMatrix.find(stage => stage.stageId === "internal_fill")?.ownResourceIds).toEqual(expect.arrayContaining(fillExecutionOwners("internal")));
    expect(components.stageMatrix.find(stage => stage.stageId === "backfill")?.ownResourceIds.some(id => id.startsWith("rcs:fill-execution:internal:"))).toBe(false);
    for (const patch of [{ rcs_internal_fill_compatible_dry_stock_kg: 10000 }, { rcs_internal_fill_retained_dry_reserve_kg: 500 },
      { rcs_internal_fill_supplier_bag_net_kg: 100, rcs_internal_fill_mixing_water_l_for_selected_bag: 10 }]) {
      const changed = await compile({ ...selectedInternal, ...patch });
      expect(q(changed, "rcs:fill-execution:internal:crew_hours")).toBe(q(result, "rcs:fill-execution:internal:crew_hours"));
      expect(q(changed, "rcs:fill-execution:internal:equipment_hours")).toBe(q(result, "rcs:fill-execution:internal:equipment_hours"));
    }
    const pinned = await compile(selectedInternal, { "rcs:fill-execution:internal:crew_hours": { quantity: "9", provenance } });
    expect(q(pinned, "rcs:fill-execution:internal:crew_hours")).toBe(9);
    expect(q(pinned, "rcs:internal-fill:net_fill_m3")).toBe(net);
  });
  it("known internal execution is independent from missing outside method or dry supply ratio, while source geometry and technology stay required", async () => {
    for (const missing of ["rcs_civil_installation_method", "rcs_internal_fill_gross_dry_mass_ratio", "rcs_internal_fill_compatible_dry_stock_kg"]) {
      const input = { ...selectedInternal }; delete input[missing];
      expect(q(await compile(input), "rcs:fill-execution:internal:crew_hours")).toBeGreaterThan(0);
    }
    for (const missing of ["rcs_carrier_outside_diameter_mm", "rcs_internal_fill_permanent_occupied_m3", "rcs_fill_internal_method_reference", "rcs_fill_internal_equipment_designation"]) {
      const input = { ...selectedInternal }; delete input[missing];
      const rowId = "rcs:fill-execution:internal:equipment_hours";
      const result = await compile(input, { [rowId]: { quantity: "999", provenance } });
      expect(result.rows.some(row => row.row_id === rowId)).toBe(false);
      expect(result.preliminaryNeeds.find(need => need.row_id === rowId)?.missing_parameter_ids).toContain(missing);
      expect(q(result, "rcs:civil-execution:open_cut:crew_hours")).toBe(52.5);
    }
  });
  it.each([internalModes.none, internalModes.other])("excludes internal mixing/placing for a known inactive branch %s", async mode => {
    const result = await compile({ ...selectedInternal, rcs_internal_fill_mode: mode }, {
      "rcs:fill-execution:internal:crew_hours": { quantity: "999", provenance },
    });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.some(row => row.row_id.startsWith("rcs:fill-execution:internal:"))).toBe(false);
  });
  it("uses installed casing sections, support rings, insertion length and two end kits for disjoint mechanical operations", async () => {
    const result = await compile();
    expect(mechanicalOwners(methods.openCut).map(id => q(result, id))).toEqual([3, 0.75, 3, 0.75, 17, 4.25, 35, 8.75, 2, 0.5]);
    const changed = await compile({ ...fixture, rcs_supplier_bundle_section_count: 10, rcs_retained_spare_section_count: 9,
      rcs_element_retained_spare_count: 40, rcs_end_seal_retained_spare_count: 9, rcs_tape_retained_spare_m: 10 });
    expect(mechanicalOwners(methods.openCut).map(id => q(changed, id))).toEqual(mechanicalOwners(methods.openCut).map(id => q(result, id)));
    const allStock = await compile({ ...fixture, rcs_compatible_stock_section_count: 20 });
    expect(q(allStock, "rcs:casing:ordered_casing_length_m")).toBe(0);
    expect(q(allStock, "rcs:mechanical:casing_preparation:crew_hours")).toBe(3);
  });
  it("never adds open-cut lowering to jacking advancement, including a retained manual lowering quantity", async () => {
    const row = "rcs:mechanical:casing_lowering:equipment_hours";
    const input: Record<string, unknown> = { ...fixture, rcs_civil_installation_method: methods.pipeJacking };
    for (const key of Object.keys(input).filter(key => key.startsWith("rcs_mechanical_casing_lowering_"))) delete input[key];
    const result = await compile(input, { [row]: { quantity: "999", provenance } });
    expect(result.preliminaryNeeds).toEqual([]); expect(result.rows.some(value => value.row_id === row)).toBe(false);
    expect(q(result, "rcs:civil-execution:jacking_advance:equipment_hours")).toBe(52.5);
    expect(q(result, "rcs:mechanical:carrier_insertion:crew_hours")).toBe(35);
  });
  it.each(["casing_preparation", "casing_lowering", "supports", "carrier_insertion", "end_seals"])(
    "a missing selected %s method remains local even with manual equipment hours", async key => {
      const input = { ...fixture }; const fact = `rcs_mechanical_${key}_method_reference`; delete input[fact];
      const row = `rcs:mechanical:${key}:equipment_hours`;
      const result = await compile(input, { [row]: { quantity: "999", provenance } });
      expect(result.preliminaryNeeds.map(need => need.row_id)).toEqual([`rcs:mechanical:${key}:crew_hours`, row]);
      expect(result.preliminaryNeeds.every(need => need.missing_parameter_ids.includes(fact))).toBe(true);
      expect(result.preliminaryNeeds.find(need => need.row_id === row)?.quantity).toBe("999");
      expect(q(result, "rcs:casing:ordered_casing_length_m")).toBe(48); expect(q(result, beddingOwner)).toBe(6);
    });
  it("a missing carrier designation gates insertion alone and never hides the other known material/work quantities", async () => {
    const input = { ...fixture }; delete input.rcs_carrier_product_designation;
    const result = await compile(input, { "rcs:mechanical:carrier_insertion:crew_hours": { quantity: "999", provenance } });
    expect(result.preliminaryNeeds.map(need => need.row_id)).toEqual(["rcs:mechanical:carrier_insertion:crew_hours", "rcs:mechanical:carrier_insertion:equipment_hours"]);
    expect(q(result, "rcs:mechanical:supports:crew_hours")).toBe(17); expect(q(result, "rcs:joint:crew_person_hours")).toBe(6);
    expect(q(result, "rcs:casing:ordered_casing_length_m")).toBe(48);
  });
  it("integrates one new carrier order while its end extension and supply packs do not inflate internal insertion or casing work", async () => {
    const input = { ...fixture, rcs_carrier_supply_mode: carrierModes.newSections, rcs_carrier_total_end_extension_m: 2,
      rcs_carrier_physical_supply_section_length_m: 6, rcs_carrier_damaged_whole_section_count: 1,
      rcs_carrier_compatible_whole_section_stock_count: 3, rcs_carrier_retained_whole_section_count: 2,
      rcs_carrier_supplier_bundle_section_count: 4, rcs_carrier_pipe_cost_basis: carrierBasis };
    const order = "rcs:carrier:ordered_length_m";
    const result = await compile(input, { [order]: { unitPrice: "4", provenance } });
    expect(result.preliminaryNeeds).toEqual([]); expect(q(result, "rcs:carrier:installed_length_m")).toBe(37);
    expect(q(result, order)).toBe(48); expect(result.totals.amount).toBe("192");
    expect(q(result, "rcs:mechanical:carrier_insertion:crew_hours")).toBe(35); expect(q(result, "rcs:mechanical:casing_preparation:crew_hours")).toBe(3);
    expect(result.rows.filter(row => row.row_id.startsWith("rcs:carrier:") && row.included_in_estimate).map(row => row.row_id)).toEqual([order]);
    expect(components.stageMatrix.find(stage => stage.stageId === "carrier_and_supports")?.ownResourceIds).toContain(order);
  });
  it("keeps missing and explicit zero mechanical equipment rates distinct and rejects operator-inclusive equipment prices", async () => {
    const fact = "rcs_mechanical_supports_equipment_h_per_unit", row = "rcs:mechanical:supports:equipment_hours";
    const input = { ...fixture }; delete input[fact];
    const missing = await compile(input); expect(missing.preliminaryNeeds).toEqual([expect.objectContaining({ row_id: row, missing_parameter_ids: [fact] })]);
    const zero = await compile({ ...fixture, [fact]: 0 }); expect(zero.preliminaryNeeds).toEqual([]); expect(q(zero, row)).toBe(0);
    await expect(compile({ ...fixture, rcs_mechanical_supports_equipment_cost_basis: "Техника и операторы вместе" })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
  it("adds exactly one separately selected mixing-water purchase without charging consumed water, bags or supplied water twice", async () => {
    const input = { ...selectedInternal, rcs_internal_fill_water_supply_mode: waterModes.separatePurchase,
      rcs_internal_fill_water_product_designation: "TEST suitable mixing water", rcs_internal_fill_water_compatibility_reference: "TEST selected grout water approval/allocation",
      rcs_internal_fill_water_cost_basis: waterBasis, rcs_internal_fill_water_compatible_stock_m3: 0.1,
      rcs_internal_fill_water_retained_reserve_m3: 0.05, rcs_internal_fill_water_supplier_multiple_m3: 0.1 };
    const rowId = "rcs:internal-water:ordered_m3";
    const result = await compile(input, { [rowId]: { unitPrice: "4", provenance } });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.filter(row => row.row_id.startsWith("rcs:internal-water:") && row.included_in_procurement).map(row => row.row_id)).toEqual([rowId]);
    const consumed = q(result, "rcs:internal-fill:mixing_water_m3");
    const ordered = Math.ceil((consumed + 0.05 - 0.1) / 0.1) * 0.1;
    expect(q(result, rowId)).toBeCloseTo(ordered, 6);
    expect(Number(result.totals.amount)).toBeCloseTo(ordered * 4, 6);
    expect(q(result, "rcs:fill-execution:internal:crew_hours")).toBeGreaterThan(0);
    expect(components.stageMatrix.find(stage => stage.stageId === "internal_fill")?.ownResourceIds).toContain(rowId);
    const customer = await compile({ ...input, rcs_internal_fill_water_supply_mode: waterModes.customerSupplied }, { [rowId]: { quantity: "999", unitPrice: "4", provenance } });
    expect(customer.rows.some(row => row.row_id.startsWith("rcs:internal-water:"))).toBe(false);
    expect(q(customer, "rcs:internal-fill:mixing_water_m3")).toBe(consumed);
    expect(customer.totals.amount).toBe("0");
  });
});
