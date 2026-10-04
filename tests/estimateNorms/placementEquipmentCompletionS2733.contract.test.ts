import { buildPlacementEquipmentCompletionS2733, PLACEMENT_EQUIPMENT_COMPLETION_ROWS_S2733 as ids } from "../../src/lib/estimate/v4/placementEquipmentCompletionS2733";
import { CONCRETE_SLAB_CONCRETE_PLACEMENT_PARAMETERS, CONCRETE_SLAB_CONCRETE_PLACEMENT_FORMULAS,
  CONCRETE_SLAB_CONCRETE_PLACEMENT_RESOURCES, concreteSlabConcretePlacementAcceptanceInputR1 } from "../../src/lib/estimate/v4/concreteSlabConcretePlacementR1";
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { assertCanonicalPurchaseReadinessV1 } from "../../src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1";
const addition = buildPlacementEquipmentCompletionS2733("placement-equipment-test", "placement_method", "e2f9581f930330995b67a4fe08cf264756fd3b5b606085062229fd12baf9e437");
const facts = { ...concreteSlabConcretePlacementAcceptanceInputR1("standard"), placement_equipment_accessories_pricing_mode: "INCLUDED_IN_EQUIPMENT_RATE",
  placement_equipment_accessories_specification: "DEMO full project compatible equipment kit, each item and quantity specified in actual schedule", placement_equipment_accessories_set_count: 2,
  placement_equipment_specification: "DEMO chosen project pump or crane with compatible bucket", placement_equipment_price_scope_reference: "DEMO energy in equipment, operator in existing placement labor, kit and delivery conditions declared",
  placement_equipment_delivery_mode: "SEPARATE_CONFIRMED_TRIPS", placement_equipment_delivery_reference: "DEMO two confirmed trips including driver, route and return", placement_equipment_delivery_trip_count: 2 };
const manual = (quantity: string) => ({ quantity, provenance: { kind: "manual", reason: "DEMO confirmed order" } });
const compile = (submittedParameters: Record<string, unknown>, rowOverrides: CanonicalEstimateCompileCoreInput["rowOverrides"] = {}) => compileCanonicalEstimateCore({
  operation: "recalculate", compilerVersion: "s2733-placement-equipment-test", catalogId: "placement-equipment-test",
  parameterDefinitions: [...CONCRETE_SLAB_CONCRETE_PLACEMENT_PARAMETERS, ...addition.parameters.filter(p => !CONCRETE_SLAB_CONCRETE_PLACEMENT_PARAMETERS.some(old => old.parameter_id === p.parameter_id))],
  formulaDefinitions: [...CONCRETE_SLAB_CONCRETE_PLACEMENT_FORMULAS, ...addition.formulas], resourceDefinitions: [...CONCRETE_SLAB_CONCRETE_PLACEMENT_RESOURCES, ...addition.resources],
  submittedParameters, confirmedParameters: {}, rowOverrides, currencyCode: "KGS", maximumResourceRows: 19, hashJson: estimateDeterministicHash });
describe("S27.33 actual equipment supply within existing concrete placement", () => {
  it.each([['pump', ids.pumpIncludedKit, 'equipment:concrete:pump'], ['crane_bucket', ids.craneIncludedKit, 'equipment:concrete:crane-bucket']])(
    "uses only the selected %s included cost owner", async (method, kitId, ownerId) => {
      const result = await compile({ ...facts, placement_method: method, crane_bucket_machine_h: 4 });
      expect(result.preliminaryNeeds).toEqual([]);
      expect(result.rows.find(row => row.row_id === kitId)).toMatchObject({ quantity: "2", amount: null, included_in_procurement: false,
        calculation_trace: { resourceGraph: { includedInResourceOwnerRowId: ownerId } } });
      expect(result.rows.filter(row => [ids.pumpIncludedKit, ids.craneIncludedKit].includes(row.row_id as typeof ids.pumpIncludedKit))).toHaveLength(1);
      expect(result.rows.find(row => row.row_id === "work:concrete:place-and-compact")?.quantity).toBe("30");
      expect(result.rows.find(row => row.row_id === ids.delivery)?.quantity).toBe("2");
    });
  it("balances separately supplied whole kits and rejects a shortage", async () => {
    const parameters = { ...facts, placement_equipment_accessories_pricing_mode: "SEPARATE_SUPPLY" };
    const result = await compile(parameters, { [ids.separateKit]: manual("3") });
    expect(result.rows.find(row => row.row_id === ids.separateKit)?.calculation_trace).toMatchObject({ purchaseBalance: { remaining: "1" } });
    const zero = await compile(parameters, { [ids.separateKit]: manual("0") });
    expect(() => assertCanonicalPurchaseReadinessV1(zero.rows)).toThrow();
    await expect(compile(parameters, { [ids.separateKit]: manual("1.5") })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
  });
  it("localizes missing actual count and shipment without a manual replacement", async () => {
    const count = await compile({ ...facts, placement_equipment_accessories_set_count: null }, { [ids.pumpIncludedKit]: manual("2") });
    expect(count.preliminaryNeeds.find(row => row.row_id === ids.pumpIncludedKit)?.missing_parameter_ids).toContain("placement_equipment_accessories_set_count");
    const trip = await compile({ ...facts, placement_equipment_delivery_trip_count: null }, { [ids.delivery]: manual("9") });
    expect(trip.preliminaryNeeds.find(row => row.row_id === ids.delivery)?.missing_parameter_ids).toContain("placement_equipment_delivery_trip_count");
    for (const quantity of ["1", "1.5"]) await expect(compile(facts, { [ids.delivery]: manual(quantity) })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
  });
  it("does not impose equipment kit facts on direct chute placement", async () => {
    const result = await compile({ ...concreteSlabConcretePlacementAcceptanceInputR1("standard"), placement_method: "direct_chute" });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.some(row => Object.values(ids).includes(row.row_id as typeof ids.delivery))).toBe(false);
    expect(addition.parameters.every(p => p.default_value == null)).toBe(true);
  });
});
