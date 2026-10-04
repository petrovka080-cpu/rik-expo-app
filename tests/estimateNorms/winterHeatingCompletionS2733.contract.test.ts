import { buildWinterHeatingCompletionS2733, WINTER_HEATING_COMPLETION_ROWS_S2733 as ids } from "../../src/lib/estimate/v4/winterHeatingCompletionS2733";
import { CONCRETE_SLAB_CONCRETE_PLACEMENT_PARAMETERS, CONCRETE_SLAB_CONCRETE_PLACEMENT_FORMULAS,
  CONCRETE_SLAB_CONCRETE_PLACEMENT_RESOURCES, concreteSlabConcretePlacementAcceptanceInputR1 } from "../../src/lib/estimate/v4/concreteSlabConcretePlacementR1";
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { assertCanonicalPurchaseReadinessV1 } from "../../src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1";
const addition = buildWinterHeatingCompletionS2733("winter-heating-test", "winter_mode", "e2f9581f930330995b67a4fe08cf264756fd3b5b606085062229fd12baf9e437");
const facts = { ...concreteSlabConcretePlacementAcceptanceInputR1("standard"), winter_mode: true, winter_heating_cable_m: 240, winter_heating_worker_h: 28, heating_transformer_machine_h: 24,
  winter_heating_system_reference: "DEMO explicit project heating system, connection/protection/control scheme; no engineering approval",
  winter_heating_cable_specification: "DEMO specified compatible heating cable", winter_heating_equipment_specification: "DEMO selected compatible heating transformer",
  winter_heating_price_scope_reference: "DEMO original labor includes operator, actual energy and kit pricing terms declared",
  winter_heating_accessories_pricing_mode: "INCLUDED_IN_EQUIPMENT_RATE", winter_heating_accessories_specification: "DEMO per full kit: 1 connection/control assembly, 4 connectors, 4 fasteners, 2 sensors, 1 brush, 2 wipes; complete project BOM only", winter_heating_accessories_set_count: 2,
  winter_heating_energy_pricing_mode: "INCLUDED_IN_EQUIPMENT_RATE", winter_heating_energy_kwh: 120,
  winter_heating_energy_reference: "DEMO explicit 120 kWh test schedule independent of transformer hours",
  winter_heating_delivery_mode: "SEPARATE_CONFIRMED_TRIPS", winter_heating_delivery_reference: "DEMO two confirmed trips with driver, route and return", winter_heating_delivery_trip_count: 2 };
const manual = (quantity: string) => ({ quantity, provenance: { kind: "manual", reason: "DEMO confirmed order" } });
const compile = (submittedParameters: Record<string, unknown>, rowOverrides: CanonicalEstimateCompileCoreInput["rowOverrides"] = {}) => compileCanonicalEstimateCore({
  operation: "recalculate", compilerVersion: "s2733-winter-heating-test", catalogId: "winter-heating-test",
  parameterDefinitions: [...CONCRETE_SLAB_CONCRETE_PLACEMENT_PARAMETERS, ...addition.parameters.filter(p => !CONCRETE_SLAB_CONCRETE_PLACEMENT_PARAMETERS.some(old => old.parameter_id === p.parameter_id))],
  formulaDefinitions: [...CONCRETE_SLAB_CONCRETE_PLACEMENT_FORMULAS, ...addition.formulas], resourceDefinitions: [...CONCRETE_SLAB_CONCRETE_PLACEMENT_RESOURCES, ...addition.resources],
  submittedParameters, confirmedParameters: {}, rowOverrides, currencyCode: "KGS", maximumResourceRows: 20, hashJson: estimateDeterministicHash });
describe("S27.33 project winter heating system resources", () => {
  it("includes the kit and explicit energy in the existing equipment owner without duplicate payment", async () => {
    const result = await compile(facts); expect(result.preliminaryNeeds).toEqual([]);
    for (const id of [ids.includedKit, ids.includedEnergy]) expect(result.rows.find(row => row.row_id === id)).toMatchObject({ amount: null, included_in_procurement: false,
      calculation_trace: { resourceGraph: { includedInResourceOwnerRowId: "equipment:concrete:heating-transformer" } } });
    expect(result.rows.find(row => row.row_id === ids.includedEnergy)?.quantity).toBe("120");
    expect(result.rows.find(row => row.row_id === "work:concrete:winter-heating")?.quantity).toBe("28");
  });
  it("separates paid energy and whole kits while preserving transformer hours and blocking shortage", async () => {
    const parameters = { ...facts, winter_heating_accessories_pricing_mode: "SEPARATE_SUPPLY", winter_heating_energy_pricing_mode: "SEPARATE_ENERGY_RATE" };
    const result = await compile(parameters, { [ids.separateKit]: manual("3") }); expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.find(row => row.row_id === ids.separateKit)?.calculation_trace).toMatchObject({ purchaseBalance: { remaining: "1" } });
    expect(result.rows.find(row => row.row_id === ids.separateEnergy)).toMatchObject({ quantity: "120", included_in_procurement: true });
    expect(result.rows.find(row => row.row_id === "equipment:concrete:heating-transformer")?.quantity).toBe("24");
    expect(result.rows.some(row => row.row_id === ids.includedEnergy || row.row_id === ids.includedKit)).toBe(false);
    const zero = await compile(parameters, { [ids.separateKit]: manual("0") }); expect(() => assertCanonicalPurchaseReadinessV1(zero.rows)).toThrow();
    await expect(compile(parameters, { [ids.separateKit]: manual("1.5") })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
  });
  it("does not derive unknown energy from existing transformer hours or a manual replacement", async () => {
    const result = await compile({ ...facts, winter_heating_energy_kwh: null }, { [ids.includedEnergy]: manual("120") });
    expect(result.preliminaryNeeds.find(row => row.row_id === ids.includedEnergy)?.missing_parameter_ids).toContain("winter_heating_energy_kwh");
    expect(result.rows.find(row => row.row_id === "equipment:concrete:heating-transformer")?.quantity).toBe("24");
  });
  it("requires the actual kit count even when an included quantity is manually supplied", async () => {
    const result = await compile({ ...facts, winter_heating_accessories_set_count: null }, { [ids.includedKit]: manual("2") });
    expect(result.preliminaryNeeds.find(row => row.row_id === ids.includedKit)?.missing_parameter_ids).toContain("winter_heating_accessories_set_count");
  });
  it("leaves the nonwinter route unchanged without heating facts or defaults", async () => {
    const result = await compile(concreteSlabConcretePlacementAcceptanceInputR1("standard")); expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.some(row => Object.values(ids).includes(row.row_id as typeof ids.delivery))).toBe(false);
    expect(addition.parameters.every(p => p.default_value == null)).toBe(true);
  });
  it("requires confirmed transport and rejects smaller or fractional trips", async () => {
    const missing = await compile({ ...facts, winter_heating_delivery_trip_count: null }, { [ids.delivery]: manual("9") });
    expect(missing.preliminaryNeeds.find(row => row.row_id === ids.delivery)?.missing_parameter_ids).toContain("winter_heating_delivery_trip_count");
    for (const quantity of ["1", "1.5"]) await expect(compile(facts, { [ids.delivery]: manual(quantity) })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
  });
});
