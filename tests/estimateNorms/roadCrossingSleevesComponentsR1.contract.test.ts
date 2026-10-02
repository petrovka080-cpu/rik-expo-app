import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { buildRoadCrossingSleevesComponentsR1, ROAD_CROSSING_SLEEVES_COMPONENT_PARAMETERS_R1 as parameters } from "../../src/lib/estimate/v4/roadCrossingSleevesComponentsR1";
import { ROAD_CROSSING_SLEEVES_CIVIL_METHODS_R1 as methods } from "../../src/lib/estimate/v4/roadCrossingSleevesCivilGeometryR1";
import { ROAD_CROSSING_SLEEVES_JOINT_RESOURCE_PARAMETERS_R1 as jointParameters, ROAD_CROSSING_SLEEVES_JOINT_COST_BASES_R1 as bases } from "../../src/lib/estimate/v4/roadCrossingSleevesJointResourcesR1";

const components = buildRoadCrossingSleevesComponentsR1({ source_title: "Owned integration fixture for source-bounded components, not a full crossing",
  source_document_version: "test-2026-10-03", definition_hash: "a".repeat(64), artifact_sha256: "a".repeat(64),
  exact_locator: "data/estimate-benchmarks/source-packs/road-crossing-sleeves-automatic-s27-28.json" });
const definition = components.definition;
// Synthetic actual-fact/price fixtures ONLY, never a published default or WPS approval.
const fixture: Record<string, unknown> = {
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
  rcs_joint_wps_reference: "TEST-OWNED applicable MMA WPS", rcs_joint_welding_process: bases.process,
  rcs_joint_electrode_designation: "TEST-OWNED compatible electrode", rcs_joint_gross_electrode_kg_per_joint: 2,
  rcs_joint_electrode_retained_spare_kg: 1, rcs_joint_electrode_compatible_stock_kg: 0.5, rcs_joint_electrode_supplier_pack_kg: 2.5,
  rcs_joint_crew_designation: "TEST-OWNED all joint crew", rcs_joint_total_crew_person_hours_per_joint: 3,
  rcs_joint_crew_cost_basis: bases.labor, rcs_joint_equipment_designation: "TEST-OWNED welding equipment",
  rcs_joint_equipment_hours_per_joint: 4, rcs_joint_equipment_cost_basis: bases.equipment,
};
const owners = ["rcs:casing:ordered_casing_length_m", "rcs:raci-elements:ordered", "rcs:end-seal-kits:ordered", "rcs:contact-tape:ordered",
  "rcs:joint:electrode_ordered", "rcs:joint:crew_person_hours", "rcs:joint:equipment_hours"];
const beddingOwner = "rcs:bedding:ordered_loose_m3";
const applicableOwners = (method: string) => method === methods.openCut ? [...owners, beddingOwner] : owners;
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
    const rates = [10, 2, 30, 3, 10, 20, 30, 4];
    const paid = applicableOwners(methods.openCut);
    const result = await compile(fixture, Object.fromEntries(paid.map((id, index) => [id, { unitPrice: String(rates[index]), provenance }])));
    // Previous disjoint 1105 fixture total +6 loose m3 bedding at fixture-only 4/m3.
    expect(paid.map(id => q(result, id))).toEqual([48, 70, 2, 5, 5, 6, 8, 6]);
    expect(result.totals.amount).toBe("1129");
  });
  it.each([methods.openCut, methods.pipeJacking])("a one-section %s crossing does not ask for or pay joint resources", async method => {
    const input: Record<string, unknown> = { ...fixture, rcs_crossing_length_m: 12, rcs_civil_installation_method: method };
    for (const parameter of jointParameters) delete input[parameter.id];
    const result = await compile(input, { "rcs:joint:crew_person_hours": { quantity: "999", provenance } });
    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(q(result, "rcs:joint:site_joint_count")).toBe(0);
    expect(result.rows.filter(row => row.row_id.startsWith("rcs:joint:")).map(row => row.row_id)).toEqual(["rcs:joint:site_joint_count"]);
    expect(result.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual([
      ...owners.slice(0, 4), ...(method === methods.openCut ? [beddingOwner] : []),
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
    expect(result.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual(owners);
  });
  it("unknown bedding product gates only its purchase, never the independently known casing or joint orders", async () => {
    const input = { ...fixture }; delete input.rcs_bedding_granular_product_designation;
    const result = await compile(input, { [beddingOwner]: { quantity: "999", provenance } });
    expect(result.preliminaryNeeds).toHaveLength(1);
    expect(result.preliminaryNeeds[0]).toMatchObject({ row_id: beddingOwner, missing_parameter_ids: ["rcs_bedding_granular_product_designation"] });
    expect(result.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual(owners);
  });
  it("unknown civil method remains one fact at its exact branch needs, not an invented full-length trench", async () => {
    const input = { ...fixture }; delete input.rcs_civil_installation_method;
    const result = await compile(input);
    expect(result.rows.some(row => row.row_id.startsWith("rcs:civil:"))).toBe(false);
    expect(result.preliminaryNeeds.length).toBeGreaterThan(0);
    expect(result.preliminaryNeeds.every(need => /^(?:rcs:civil:|rcs:bedding:)/u.test(need.row_id) && need.need_state === "CONDITION_REQUIRED")).toBe(true);
    expect([...new Set(result.preliminaryNeeds.flatMap(need => need.missing_parameter_ids))]).toEqual(["rcs_civil_installation_method"]);
    expect(result.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual(owners);
  });
  it("unknown WPS gates the joint owners, not the known casing/spacer/seal/tape orders", async () => {
    const input = { ...fixture }; delete input.rcs_joint_wps_reference;
    const result = await compile(input);
    expect(result.preliminaryNeeds.length).toBeGreaterThan(0);
    expect(result.preliminaryNeeds.every(need => need.row_id.startsWith("rcs:joint:") && need.missing_parameter_ids.includes("rcs_joint_wps_reference"))).toBe(true);
    expect(result.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual([...owners.slice(0, 4), beddingOwner]);
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
  it("cannot bypass selected spacer compatibility by manually replacing either its control or paid material", async () => {
    await expect(compile({ ...fixture, rcs_raci_selected_element_height_mm: 180 }, {
      "rcs:raci_insertion_diametral_difference": { quantity: "999", provenance }, "rcs:raci-elements:ordered": { quantity: "1", provenance },
    })).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
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
    expect(components.scope.omitted).toContain("Method-specific civil execution resources, excavation support/reaction structures and groundwater measures");
    for (const resource of definition.resources) expect(resource.source_metadata?.excludedUnownedAssumptions).toEqual([...components.scope.omitted]);
  });
});
