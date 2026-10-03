import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { buildRoadCrossingSleevesComponentsR1, ROAD_CROSSING_SLEEVES_FREIGHT_MODES_R1 as freightModes,
  ROAD_CROSSING_SLEEVES_CIVIL_EXECUTION_COST_BASES_R1 as existingBases } from "../../src/lib/estimate/v4/roadCrossingSleevesComponentsR1";
import { ROAD_CROSSING_SLEEVES_COMPLETION_PROGRAMMES_R1 as programmes, ROAD_CROSSING_SLEEVES_COMPLETION_MODES_R1 as modes,
  ROAD_CROSSING_SLEEVES_COMPLETION_SUPPLY_MODES_R1 as supplies, ROAD_CROSSING_SLEEVES_COMPLETION_COST_BASES_R1 as bases,
  ROAD_CROSSING_SLEEVES_RESTORATION_CONSTRUCTIONS_R1 as constructions, ROAD_CROSSING_SLEEVES_EXTERNAL_FILL_GEOMETRIES_R1 as externalGeometries,
  assertRoadCrossingSleevesSelectedCompletionScopeR1 } from "../../src/lib/estimate/v4/roadCrossingSleevesSelectedCompletionR1";
import { ROAD_CROSSING_SLEEVES_CIVIL_METHODS_R1 as methods } from "../../src/lib/estimate/v4/roadCrossingSleevesCivilGeometryR1";
import { ROAD_CROSSING_SLEEVES_INTERNAL_FILL_MODES_R1 as fillModes } from "../../src/lib/estimate/v4/roadCrossingSleevesInternalFillR1";
const component = buildRoadCrossingSleevesComponentsR1({ source_title: "VALIDATION_FIXTURE selected completion", source_document_version: "test-only",
  definition_hash: "f".repeat(64), artifact_sha256: "e".repeat(64), exact_locator: "synthetic contract, not project acceptance" });
const definition = component.definition;
const primary = { rcs_civil_installation_method: methods.pipeJacking, rcs_crossing_length_m: 35,
  ...Object.fromEntries(programmes.flatMap(p => [[`rcs_completion_${p.key}_mode`, modes.notRequired],
    [`rcs_completion_${p.key}_programme_reference`, "TEST actual applicability/whole allocation, not an engineering default"]])) };
function work(key: string, amount: number) {
  return Object.fromEntries(Object.entries({ mode: modes.separate, ...(programmes.find(value => value.key === key)?.amount ? {} : { amount }), programme_reference: "TEST actual disjoint complete programme",
    crew_designation: "TEST all personnel", equipment_designation: "TEST complete compatible equipment", crew_hours_per_unit: 2, equipment_hours_per_unit: 0,
    crew_cost_basis: bases.crew, equipment_cost_basis: bases.equipment, complete_equipment_count: 0 }).map(([suffix, value]) => [`rcs_completion_${key}_${suffix}`, value]));
}
function material(key: string, rate: number) {
  return Object.fromEntries(Object.entries({ ...(key === "traffic" ? {} : { gross_per_programme_unit: rate }), inventory_reference: "TEST complete homogeneous product/consumption inventory",
    supply_mode: supplies.separate, product_designation: "TEST compatible product", allocation_reference: "TEST own supply with complete stock/reserve boundary",
    stock: 0, reserve: 1, quantum: 2, cost_basis: bases.material }).map(([suffix, value]) => [`rcs_completion_material_${key}_${suffix}`, value]));
}
function compile(values: Record<string, unknown>, rowOverrides?: Record<string, Record<string, unknown>>) {
  return compileCanonicalEstimateCore({ operation: rowOverrides ? "recalculate" : "compile", compilerVersion: "completion-contract",
    catalogId: component.scope.catalogId, primaryMeasureParameterId: "rcs_crossing_length_m", parameterDefinitions: [...definition.parameters],
    formulaDefinitions: [...definition.formulas], resourceDefinitions: [...definition.resources], submittedParameters: { ...primary, ...values }, confirmedParameters: {},
    priceItems: [], currencyCode: "KGS", maximumResourceRows: definition.resources.length, rowOverrides, hashJson: estimateDeterministicHash });
}
const q = (result: Awaited<ReturnType<typeof compile>>, rowId: string) => Number(result.rows.find(row => row.row_id === rowId)?.quantity);
const manual = { kind: "manual", reason: "TEST current owned row amendment" };
describe("finite selected jacking completion on the shared compiler", () => {
  it("keeps missing programme facts localized while an independent known operation calculates", async () => {
    const result = await compile({ ...work("site", 10), ...material("site_surface", 0), rcs_completion_carrier_testing_mode: modes.separate });
    expect(q(result, "rcs:completion:site:crew_hours")).toBe(20);
    const need = result.preliminaryNeeds.find(row => row.row_id === "rcs:completion:carrier_testing:crew_hours")!;
    expect(need.missing_parameter_ids).toContain("rcs_completion_carrier_testing_amount");
    expect(need.missing_parameter_ids.some(id => id.startsWith("effective_resource_quantity_"))).toBe(false);
  });
  it("reconciles the actual new site material order and its freight without changing work quantities", async () => {
    const values = { ...work("site", 10), ...material("site_surface", 0.3), rcs_freight_completion_site_surface_new_mode: freightModes.otherParty,
      rcs_freight_completion_site_surface_new_allocation_reference: "TEST complete separate supplier delivery" };
    const auto = await compile(values), order = "rcs:completion-material:site_surface:ordered";
    expect(q(auto, order)).toBe(4);
    const changed = await compile(values, { [order]: { quantity: "6", provenance: manual } });
    expect(q(changed, "rcs:completion-material:site_surface:consumed")).toBe(3);
    expect(q(changed, "rcs:completion-material:site_surface:remaining")).toBe(3);
    expect(q(changed, "rcs:completion-material:site_surface:free_beyond_reserve")).toBe(2);
    expect(q(changed, "rcs:freight:completion_site_surface_new:cargo_units")).toBe(6);
    expect(q(changed, "rcs:completion:site:crew_hours")).toBe(20);
  });
  it("does not buy the same reusable traffic inventory again when calendar duration grows", async () => {
    const values = { ...work("traffic", 2), ...material("traffic", 0), rcs_completion_traffic_physical_complete_places: 5,
      rcs_completion_traffic_actual_replacement_places: 1 };
    const first = await compile(values), longer = await compile({ ...values, rcs_completion_traffic_amount: 8 });
    expect(q(first, "rcs:completion-material:traffic:consumed")).toBe(6);
    expect(q(longer, "rcs:completion-material:traffic:consumed")).toBe(6);
    expect(q(longer, "rcs:completion:traffic:crew_hours")).toBe(16);
  });
  it("uses actual covered area/applications for curing material rather than days", async () => {
    const values = { ...work("curing", 1), ...material("curing_material", 0.1), rcs_internal_fill_mode: fillModes.dryGrout,
      rcs_completion_curing_application_area_m2: 10, rcs_completion_curing_application_count: 1 };
    const first = await compile(values), longer = await compile({ ...values, rcs_completion_curing_amount: 7 });
    expect(q(first, "rcs:completion-material:curing_material:consumed")).toBe(1);
    expect(q(longer, "rcs:completion-material:curing_material:consumed")).toBe(1);
    expect(q(longer, "rcs:completion:curing:crew_hours")).toBe(14);
  });
  it("keeps actual fill package BOM counts informational despite explicit payable inclusion", async () => {
    const values = { rcs_internal_fill_mode: fillModes.dryGrout, rcs_fill_internal_equipment_designation: "TEST full existing compatible package",
      rcs_fill_internal_equipment_cost_basis: existingBases.equipment, rcs_fill_internal_method_reference: "TEST same programme",
      rcs_completion_fill_package_mixer_count: 2, rcs_completion_fill_package_mixer_designation: "TEST actual two mixers" };
    const rowId = "rcs:completion:fill-package:mixer";
    const result = await compile(values, { [rowId]: { includedInEstimate: true, includedInProcurement: true, unitPrice: "100", provenance: manual } });
    const row = result.rows.find(value => value.row_id === rowId)!;
    expect(row.quantity).toBe("2"); expect(row.included_in_estimate).toBe(false); expect(row.included_in_procurement).toBe(false);
  });
  it("calculates pit bedding from existing pit bottom dimensions and actual separate thicknesses", async () => {
    const result = await compile({ ...work("pit_bedding", 999), ...material("pit_bedding", 0), rcs_jacking_thrust_excavation_length_m: 4,
      rcs_jacking_thrust_excavation_width_m: 3, rcs_jacking_reception_excavation_length_m: 2, rcs_jacking_reception_excavation_width_m: 2,
      rcs_completion_pit_bedding_thrust_thickness_m: 0.2, rcs_completion_pit_bedding_reception_thickness_m: 0.1 });
    expect(q(result, "rcs:completion:pit_bedding:crew_hours")).toBe(5.6);
    expect(definition.parameters.some(p => p.parameter_id === "rcs_completion_pit_bedding_amount")).toBe(false);
  });
  it("refuses publication scope promotion for open cut or missing multilayer restoration owner", () => {
    expect(() => assertRoadCrossingSleevesSelectedCompletionScopeR1({ rcs_civil_installation_method: methods.openCut })).toThrow("REQUIRES_JACKING");
    expect(() => assertRoadCrossingSleevesSelectedCompletionScopeR1({ rcs_civil_installation_method: methods.pipeJacking,
      rcs_completion_restoration_mode: modes.separate, rcs_completion_restoration_construction: constructions.existingOwnerRequired })).toThrow("NOT_BOUND");
    expect(component.scope.fullOwner).toBe(false);
  });
  it("calculates confirmed uniform external annulus from existing measured geometry and keeps unknown boundaries local", async () => {
    const values = { ...work("external_grout", 999), ...material("external_grout", 0), rcs_casing_outside_diameter_mm: 720,
      rcs_casing_inside_diameter_mm: 700, rcs_carrier_outside_diameter_mm: 110,
      rcs_jacking_confirmed_excavation_diameter_mm: 740, rcs_completion_external_grout_geometry_scope: externalGeometries.uniformAnnulus };
    const first = await compile(values);
    expect(q(first, "rcs:completion:external_grout:finished_amount")).toBeCloseTo(Math.PI / 4 * (740 ** 2 - 720 ** 2) * 35 / 1e6, 7);
    expect(definition.parameters.some(p => p.parameter_id === "rcs_completion_external_grout_amount")).toBe(false);
    const missing: Record<string, unknown> = { ...values }; delete missing.rcs_completion_external_grout_geometry_scope;
    expect((await compile(missing)).preliminaryNeeds.find(row => row.row_id === "rcs:completion:external_grout:crew_hours")?.missing_parameter_ids).toContain("rcs_completion_external_grout_geometry_scope");
    expect(() => assertRoadCrossingSleevesSelectedCompletionScopeR1({ ...values, rcs_civil_installation_method: methods.pipeJacking,
      rcs_completion_external_grout_geometry_scope: externalGeometries.existingOwnerRequired })).toThrow("NOT_BOUND");
  });
  it("rejects a positive actual discarded fill flow masked by zero net waste without a second purchase", async () => {
    await expect(compile({ rcs_internal_fill_mode: fillModes.dryGrout, rcs_completion_fill_discard_wet_l: 1,
      rcs_completion_fill_discard_dry_kg: 0, rcs_completion_fill_priming_discard_reference: "TEST actual discard included in original gross",
      rcs_fill_internal_method_reference: "TEST actual compatible method", rcs_service_waste_internal_fill_discard_mode: "Одна фактически совместимая однородная партия ВСЕХ отходов обслуживания этой программы, включая все израсходованные одноразовые обтирочные изделия и фактическую выброшенную тару/остатки, в целых одноразовых закрытых местах; отдельный полный сервис",
      rcs_service_waste_internal_fill_discard_program_reference: "TEST all actual discarded flow", rcs_service_waste_internal_fill_discard_net_waste_kg: 0 })).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
    expect(component.definition.resources.filter(r => r.row_id.startsWith("rcs:completion:") && r.row_id.includes("discard")).every(r => r.procurement_eligible !== true)).toBe(true);
  });
  it("requires source-backed placed dry yield and rejects discarding all gross dry material for a positive finished fill", async () => {
    const values = { rcs_internal_fill_mode: fillModes.dryGrout, rcs_casing_outside_diameter_mm: 508, rcs_casing_inside_diameter_mm: 480,
      rcs_carrier_outside_diameter_mm: 110, rcs_maximum_joint_envelope_diameter_mm: 130, rcs_internal_fill_permanent_occupied_m3: 0,
      rcs_internal_fill_gross_dry_mass_ratio: 2000, rcs_completion_fill_placed_dry_kg_per_finished_m3: 1600,
      rcs_completion_fill_discard_dry_kg: 0, rcs_completion_fill_discard_wet_l: 0,
      rcs_completion_fill_actual_yield_reference: "TEST actual selected product yield and complete dry mass balance",
      rcs_completion_fill_priming_discard_reference: "TEST complete actual losses inventory", rcs_fill_internal_method_reference: "TEST compatible method" };
    const safe = await compile(values);
    const gross = safe.rows.find(row => row.row_id === "rcs:internal-fill:consumed_dry_kg")!.quantity;
    expect(Number(gross)).toBeGreaterThan(0);
    await expect(compile({ ...values, rcs_completion_fill_discard_dry_kg: gross })).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
    const unresolved: Record<string, unknown> = { ...values }; delete unresolved.rcs_completion_fill_placed_dry_kg_per_finished_m3;
    const missing = await compile(unresolved);
    expect(missing.preliminaryNeeds.find(row => row.row_id === "rcs:completion:fill-discard-dry-margin")?.missing_parameter_ids).toContain("rcs_completion_fill_placed_dry_kg_per_finished_m3");
  });
});
