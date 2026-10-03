import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { buildRoadCrossingSleevesComponentsR1, ROAD_CROSSING_SLEEVES_COMPONENT_PARAMETERS_R1 as parameters,
  ROAD_CROSSING_SLEEVES_CIVIL_EXECUTION_COST_BASES_R1 as executionBases,
  ROAD_CROSSING_SLEEVES_MECHANICAL_COST_BASES_R1 as mechanicalBases } from "../../src/lib/estimate/v4/roadCrossingSleevesComponentsR1";
import { ROAD_CROSSING_SLEEVES_CARRIER_SUPPLY_MODES_R1 as carrierModes, ROAD_CROSSING_SLEEVES_CARRIER_COST_BASIS_R1 as carrierBasis } from "../../src/lib/estimate/v4/roadCrossingSleevesCasingMaterialR1";
import { ROAD_CROSSING_SLEEVES_CIVIL_METHODS_R1 as methods } from "../../src/lib/estimate/v4/roadCrossingSleevesCivilGeometryR1";
import { ROAD_CROSSING_SLEEVES_JOINT_RESOURCE_PARAMETERS_R1 as jointParameters, ROAD_CROSSING_SLEEVES_JOINT_COST_BASES_R1 as bases } from "../../src/lib/estimate/v4/roadCrossingSleevesJointResourcesR1";
import { ROAD_CROSSING_SLEEVES_PIT_FILL_MODES_R1 as fillModes,
  ROAD_CROSSING_SLEEVES_TRENCH_FILL_MODES_R1 as trenchModes } from "../../src/lib/estimate/v4/roadCrossingSleevesPitFillMaterialR1";
import { ROAD_CROSSING_SLEEVES_INTERNAL_FILL_MODES_R1 as internalModes,
  ROAD_CROSSING_SLEEVES_INTERNAL_WATER_MODES_R1 as waterModes, ROAD_CROSSING_SLEEVES_INTERNAL_WATER_COST_BASIS_R1 as waterBasis } from "../../src/lib/estimate/v4/roadCrossingSleevesInternalFillR1";

const components = buildRoadCrossingSleevesComponentsR1({ source_title: "Owned integration fixture for source-bounded components, not a full crossing",
  source_document_version: "test-2026-10-03", definition_hash: "a".repeat(64), artifact_sha256: "a".repeat(64),
  exact_locator: "data/estimate-benchmarks/source-packs/road-crossing-sleeves-automatic-s27-28.json" });
const definition = components.definition;
// Synthetic actual-fact/price fixtures ONLY, never a published default or WPS approval.
const fixture: Record<string, unknown> = {
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
    expect(result.preliminaryNeeds).toHaveLength(3);
    expect(result.preliminaryNeeds[0]).toMatchObject({ row_id: beddingOwner, missing_parameter_ids: ["rcs_bedding_granular_product_designation"] });
    expect(result.preliminaryNeeds.map(need => need.row_id)).toEqual([beddingOwner, ...fillExecutionOwners("bedding")]);
    expect(result.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual([...owners, ...executionOwners(methods.openCut), ...mechanicalOwners(methods.openCut)]);
  });
  it("unknown civil method remains one fact at its exact branch needs, not an invented full-length trench", async () => {
    const input = { ...fixture }; delete input.rcs_civil_installation_method;
    const result = await compile(input);
    expect(result.rows.some(row => row.row_id.startsWith("rcs:civil:"))).toBe(false);
    expect(result.preliminaryNeeds.length).toBeGreaterThan(0);
    expect(result.preliminaryNeeds.every(need => /^(?:rcs:civil:|rcs:civil-execution:|rcs:fill-execution:|rcs:bedding:|rcs:pit-return:|rcs:mechanical:casing_lowering:)/u.test(need.row_id) && need.need_state === "CONDITION_REQUIRED")).toBe(true);
    expect([...new Set(result.preliminaryNeeds.flatMap(need => need.missing_parameter_ids))]).toEqual(["rcs_civil_installation_method"]);
    expect(result.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual([...owners, ...mechanicalOwners()]);
  });
  it("unknown WPS gates the joint owners, not the known casing/spacer/seal/tape orders", async () => {
    const input = { ...fixture }; delete input.rcs_joint_wps_reference;
    const result = await compile(input);
    expect(result.preliminaryNeeds.length).toBeGreaterThan(0);
    expect(result.preliminaryNeeds.every(need => need.row_id.startsWith("rcs:joint:") && need.missing_parameter_ids.includes("rcs_joint_wps_reference"))).toBe(true);
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
    expect(unknown.preliminaryNeeds.every(need => need.row_id.startsWith("rcs:pit-fill:") && need.missing_parameter_ids.includes("rcs_pit_fill_approved_reused_finished_m3"))).toBe(true);
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
    expect(result.preliminaryNeeds.every(need => /^(?:rcs:internal-fill:|rcs:fill-execution:internal:)/u.test(need.row_id)
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
    expect(components.scope.omitted).toContain("Excavation support/reaction structures and groundwater measures; actual applicability and approved civil execution rates");
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
    expect(preliminary.preliminaryNeeds.map(need => need.row_id)).toEqual(["rcs:trench-fill:ordered_loose_m3", ...fillExecutionOwners("trench")]);
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
    expect(result.preliminaryNeeds.every(need => need.row_id.startsWith("rcs:trench-fill:"))).toBe(true);
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
