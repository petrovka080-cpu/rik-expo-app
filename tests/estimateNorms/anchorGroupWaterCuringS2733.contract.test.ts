import { buildAnchorGroupWaterCuringResourcesS2733, ANCHOR_WATER_CURING_ROWS as ids } from "../../src/lib/estimate/v4/anchorGroupWaterCuringResourcesS2733";
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";

const definition = buildAnchorGroupWaterCuringResourcesS2733("canonical-work:base:concrete_foundation_interior_anchor_group_pour_standard");
const facts = { curing_method: "water", curing_water_m3: 3.2, curing_water_source_reference: "DEMO: approved project takeoff and water source",
  curing_water_equipment_required: "REQUIRED", curing_water_equipment_designation: "DEMO: watering equipment, energy included",
  curing_water_equipment_machine_h: 4, curing_water_equipment_kit_specification: "DEMO: 2 hoses, 4 connections, 1 sprinkler included in equipment", curing_water_equipment_set_count: 1,
  curing_water_delivery_mode: "SEPARATE_DELIVERY", curing_water_delivery_vehicle_specification: "DEMO: water tank, driver and return included",
  curing_water_delivery_capacity_m3: 1.5 };
const amendment = (quantity: string) => ({ quantity, provenance: { kind: "manual", reason: "DEMO confirmed order change" } });
function compile(parameters: Record<string, unknown>, rowOverrides: CanonicalEstimateCompileCoreInput["rowOverrides"] = {}) {
  return compileCanonicalEstimateCore({ operation: "recalculate", compilerVersion: "s2733-anchor-water-test", catalogId: "anchor-water-test",
    parameterDefinitions: [...definition.parameters], formulaDefinitions: [...definition.formulas], resourceDefinitions: [...definition.resources],
    submittedParameters: parameters, confirmedParameters: {}, currencyCode: "KGS", maximumResourceRows: 4,
    rowOverrides, hashJson: estimateDeterministicHash });
}
describe("S27.33 missing water-curing branch through the existing core", () => {
  it("keeps the membrane branch free of new water questions and resources", async () => {
    const result = await compile({ curing_method: "membrane" });
    expect(result.rows).toEqual([]);
    expect(result.preliminaryNeeds).toEqual([]);
    expect(definition.runtimeInput).toEqual({});
    expect(definition.parameters.every(p => p.default_value == null)).toBe(true);
  });
  it("uses approved direct quantities and exposes included accessories without a second cost owner", async () => {
    const result = await compile(facts);
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.find(r => r.row_id === ids.water)).toMatchObject({ quantity: "3.2", included_in_procurement: true });
    expect(result.rows.find(r => r.row_id === ids.equipment)).toMatchObject({ quantity: "4", included_in_procurement: true });
    expect(result.rows.find(r => r.row_id === ids.accessories)).toMatchObject({ quantity: "1", included_in_procurement: false,
      calculation_trace: { resourceGraph: { costTreatment: "INCLUDED_IN_RESOURCE_ROWS" } } });
    expect(result.rows.find(r => r.row_id === ids.delivery)).toMatchObject({ quantity: "3", included_in_procurement: true });
    expect(result.totals.unpricedRowCount).toBe(3);
    expect(result.rows.find(r => r.row_id === ids.accessories)?.title_ru).toContain("2 hoses, 4 connections, 1 sprinkler");
  });
  it("recalculates freight and balance from the actual new water order", async () => {
    const result = await compile(facts, { [ids.water]: amendment("5.1") });
    expect(result.rows.find(r => r.row_id === ids.water)).toMatchObject({ quantity: "5.1", calculation_trace: {
      purchaseBalance: { consumed: "3.2", remaining: "1.9", procurementReady: true } } });
    expect(result.rows.find(r => r.row_id === ids.delivery)?.quantity).toBe("4");
    const zero = await compile(facts, { [ids.water]: amendment("0") });
    expect(zero.rows.find(r => r.row_id === ids.water)).toMatchObject({ included_in_procurement: false,
      calculation_trace: { purchaseBalance: { consumptionShortage: "3.2", procurementReady: false } } });
    expect(zero.rows.find(r => r.row_id === ids.delivery)?.quantity).toBe("0");
  });
  it("localizes absent project facts and does not let a manual order erase required consumption", async () => {
    const { curing_water_m3: _missing, ...withoutQuantity } = facts;
    const result = await compile(withoutQuantity, { [ids.water]: amendment("5.1") });
    expect(result.rows.some(r => r.row_id === ids.equipment)).toBe(true);
    expect(result.preliminaryNeeds.find(r => r.row_id === ids.water)).toMatchObject({ quantity: "5.1", missing_parameter_ids: ["curing_water_m3"] });
    const { curing_water_delivery_capacity_m3: _capacity, ...withoutCapacity } = facts;
    const transport = await compile(withoutCapacity, { [ids.delivery]: amendment("9") });
    expect(transport.preliminaryNeeds.find(r => r.row_id === ids.delivery)).toMatchObject({ quantity: "9", missing_parameter_ids: ["curing_water_delivery_capacity_m3"] });
  });
  it("keeps on-site manual watering selectable without inventing equipment or separate freight", async () => {
    const result = await compile({ curing_method: "water", curing_water_m3: 2, curing_water_source_reference: "DEMO on-site source",
      curing_water_equipment_required: "NOT_REQUIRED", curing_water_delivery_mode: "ON_SITE_SUPPLY" });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.map(r => r.row_id)).toEqual([ids.water]);
  });
  it("keeps actual included-kit count unknown under a manual quantity", async () => {
    const result = await compile({ ...facts, curing_water_equipment_set_count: null }, { [ids.accessories]: amendment("2") });
    expect(result.rows.some(row => row.row_id === ids.accessories)).toBe(false);
    expect(result.preliminaryNeeds.find(row => row.row_id === ids.accessories)).toMatchObject({ quantity: "2",
      missing_parameter_ids: ["curing_water_equipment_set_count"] });
    expect(result.rows.find(row => row.row_id === ids.water)?.quantity).toBe("3.2");
  });
  it("binds a composite branch to its existing placement selector", async () => {
    const composite = buildAnchorGroupWaterCuringResourcesS2733("composite-water", "DEMO project water takeoff", "placement_curing_method");
    const { curing_method: _originalSelector, ...waterFacts } = facts;
    const run = (method: string) => compileCanonicalEstimateCore({ operation: "compile", compilerVersion: "s2733-composite-water-test", catalogId: "composite-water",
      parameterDefinitions: [...composite.parameters], formulaDefinitions: [...composite.formulas], resourceDefinitions: [...composite.resources],
      submittedParameters: { ...waterFacts, placement_curing_method: method }, confirmedParameters: {}, currencyCode: "KGS",
      maximumResourceRows: 4, hashJson: estimateDeterministicHash });
    const active = await run("water");
    expect(active.preliminaryNeeds).toEqual([]);
    expect(active.rows.find(row => row.row_id === ids.water)?.quantity).toBe("3.2");
    const inactive = await run("membrane");
    expect(inactive.rows).toEqual([]);
    expect(inactive.preliminaryNeeds).toEqual([]);
    expect(composite.parameters.some(parameter => parameter.parameter_id === "curing_method")).toBe(false);
  });
  it("rejects fractional or insufficient freight and retains inactive facts without activating their resources", async () => {
    for (const quantity of ["1.5", "2"]) await expect(compile(facts, { [ids.delivery]: amendment(quantity) })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
    await expect(compile({ ...facts, curing_water_equipment_set_count: 1.5 })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    const inactive = await compile({ ...facts, curing_method: "membrane" });
    expect(inactive.rows).toEqual([]);
    expect(inactive.parameters.curing_water_m3).toBe(3.2);
  });
});
