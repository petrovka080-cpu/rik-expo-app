import { buildSurfaceFinishingCompletionS2733, SURFACE_FINISHING_COMPLETION_ROWS_S2733 as ids } from "../../src/lib/estimate/v4/surfaceFinishingCompletionS2733";
import { CONCRETE_SLAB_CONCRETE_PLACEMENT_PARAMETERS, CONCRETE_SLAB_CONCRETE_PLACEMENT_FORMULAS,
  CONCRETE_SLAB_CONCRETE_PLACEMENT_RESOURCES, concreteSlabConcretePlacementAcceptanceInputR1 } from "../../src/lib/estimate/v4/concreteSlabConcretePlacementR1";
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { assertCanonicalPurchaseReadinessV1 } from "../../src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1";
const addition = buildSurfaceFinishingCompletionS2733("surface-finishing-test", "finishing_worker_h", "e2f9581f930330995b67a4fe08cf264756fd3b5b606085062229fd12baf9e437");
const facts = { ...concreteSlabConcretePlacementAcceptanceInputR1("standard"), surface_finishing_method: "MANUAL_TOOLS", surface_finishing_accessories_pricing_mode: "INCLUDED_IN_SELECTED_RATE",
  surface_finishing_accessories_specification: "DEMO complete manual finishing kit: 1 float, 1 edge tool, 1 brush, 2 cleaning cloths; project quantities only", surface_finishing_accessories_set_count: 2,
  surface_finishing_price_scope_reference: "DEMO original finishing labor includes operator, energy in selected rate, compatible kit and logistics terms declared",
  surface_finishing_delivery_mode: "SEPARATE_CONFIRMED_TRIPS", surface_finishing_delivery_reference: "DEMO two confirmed trips with driver, route and return", surface_finishing_delivery_trip_count: 2 };
const manual = (quantity: string) => ({ quantity, provenance: { kind: "manual", reason: "DEMO confirmed order" } });
const compile = (submittedParameters: Record<string, unknown>, rowOverrides: CanonicalEstimateCompileCoreInput["rowOverrides"] = {}) => compileCanonicalEstimateCore({
  operation: "recalculate", compilerVersion: "s2733-finishing-test", catalogId: "surface-finishing-test",
  parameterDefinitions: [...CONCRETE_SLAB_CONCRETE_PLACEMENT_PARAMETERS, ...addition.parameters.filter(p => !CONCRETE_SLAB_CONCRETE_PLACEMENT_PARAMETERS.some(old => old.parameter_id === p.parameter_id))],
  formulaDefinitions: [...CONCRETE_SLAB_CONCRETE_PLACEMENT_FORMULAS, ...addition.formulas], resourceDefinitions: [...CONCRETE_SLAB_CONCRETE_PLACEMENT_RESOURCES, ...addition.resources],
  submittedParameters, confirmedParameters: {}, rowOverrides, currencyCode: "KGS", maximumResourceRows: 20, hashJson: estimateDeterministicHash });
describe("S27.33 resources of the existing surface finishing operation", () => {
  it("includes the full manual kit in existing labor without a separate equipment charge", async () => {
    const result = await compile(facts);
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.find(row => row.row_id === ids.manualIncludedKit)).toMatchObject({ quantity: "2", amount: null, included_in_procurement: false,
      calculation_trace: { resourceGraph: { includedInResourceOwnerRowId: "work:concrete:finish-surface" } } });
    expect(result.rows.find(row => row.row_id === "work:concrete:finish-surface")?.quantity).toBe("10");
    expect(result.rows.some(row => row.row_id === ids.equipment || row.row_id === ids.equipmentIncludedKit)).toBe(false);
  });
  it("uses actual selected equipment hours and its own included kit owner", async () => {
    const result = await compile({ ...facts, surface_finishing_method: "PROJECT_SELECTED_EQUIPMENT", surface_finishing_equipment_specification: "DEMO compatible project finishing machine",
      surface_finishing_equipment_machine_h: 3.5 });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.find(row => row.row_id === ids.equipment)).toMatchObject({ quantity: "3.5", included_in_procurement: true, title_ru: expect.stringContaining("DEMO compatible") });
    expect(result.rows.find(row => row.row_id === ids.equipmentIncludedKit)?.calculation_trace).toMatchObject({ resourceGraph: { includedInResourceOwnerRowId: ids.equipment } });
    expect(result.rows.find(row => row.row_id === "work:concrete:finish-surface")?.quantity).toBe("10");
    expect(result.rows.some(row => row.row_id === ids.manualIncludedKit)).toBe(false);
  });
  it("balances separately supplied whole kits and blocks a shortage or fractional order", async () => {
    const parameters = { ...facts, surface_finishing_accessories_pricing_mode: "SEPARATE_SUPPLY" };
    const result = await compile(parameters, { [ids.separateKit]: manual("3") });
    expect(result.rows.find(row => row.row_id === ids.separateKit)?.calculation_trace).toMatchObject({ purchaseBalance: { remaining: "1" } });
    const zero = await compile(parameters, { [ids.separateKit]: manual("0") });
    expect(() => assertCanonicalPurchaseReadinessV1(zero.rows)).toThrow();
    await expect(compile(parameters, { [ids.separateKit]: manual("1.5") })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
  });
  it("retains missing actual count and equipment hours under a manual quantity", async () => {
    const count = await compile({ ...facts, surface_finishing_accessories_set_count: null }, { [ids.manualIncludedKit]: manual("2") });
    expect(count.preliminaryNeeds.find(row => row.row_id === ids.manualIncludedKit)?.missing_parameter_ids).toContain("surface_finishing_accessories_set_count");
    const equipment = await compile({ ...facts, surface_finishing_method: "PROJECT_SELECTED_EQUIPMENT", surface_finishing_equipment_specification: "DEMO selected finishing machine" }, { [ids.equipment]: manual("9") });
    expect(equipment.preliminaryNeeds.find(row => row.row_id === ids.equipment)?.missing_parameter_ids).toContain("surface_finishing_equipment_machine_h");
  });
  it("does not request kits/equipment for zero actual finishing hours", async () => {
    const result = await compile({ ...concreteSlabConcretePlacementAcceptanceInputR1("standard"), finishing_worker_h: 0 });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.some(row => Object.values(ids).includes(row.row_id as typeof ids.delivery))).toBe(false);
    expect(addition.parameters.every(p => p.default_value == null)).toBe(true);
  });
  it("requires confirmed trips and prevents a smaller or fractional shipment", async () => {
    const missing = await compile({ ...facts, surface_finishing_delivery_trip_count: null }, { [ids.delivery]: manual("9") });
    expect(missing.preliminaryNeeds.find(row => row.row_id === ids.delivery)?.missing_parameter_ids).toContain("surface_finishing_delivery_trip_count");
    for (const quantity of ["1", "1.5"]) await expect(compile(facts, { [ids.delivery]: manual(quantity) })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
  });
});
