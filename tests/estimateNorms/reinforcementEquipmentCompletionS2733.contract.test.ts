import { buildReinforcementEquipmentCompletionS2733, REINFORCEMENT_EQUIPMENT_COMPLETION_OWNERS_S2733 as owners, REINFORCEMENT_EQUIPMENT_COMPLETION_DELIVERY_S2733 as delivery } from "../../src/lib/estimate/v4/reinforcementEquipmentCompletionS2733";
import { STRIP_FOUNDATION_REINFORCEMENT_PARAMETERS as parameters, STRIP_FOUNDATION_REINFORCEMENT_FORMULAS as formulas,
  STRIP_FOUNDATION_REINFORCEMENT_RESOURCES as resources, stripFoundationReinforcementAcceptanceInputR1 } from "../../src/lib/estimate/v4/stripFoundationReinforcementR1";
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { assertCanonicalPurchaseReadinessV1 } from "../../src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1";
const addition = buildReinforcementEquipmentCompletionS2733("reinforcement-equipment-test", "", "99a269e1e5bbd007ff603c2e824bcf09a95bb0b061f4da772121d2b9513fedcd");
const facts: Record<string, unknown> = { ...stripFoundationReinforcementAcceptanceInputR1("standard"), fabrication_mode: "SITE_FABRICATED", rebar_cutting_machine_h: 3, rebar_bending_machine_h: 4,
  lifting_equipment_applicable: true, lifting_equipment_designation: "DEMO selected project lift", lifting_machine_h: 5,
  reinforcement_equipment_delivery_mode: "SEPARATE_CONFIRMED_TRIPS", reinforcement_equipment_delivery_reference: "DEMO two confirmed equipment trips including driver, route and return", reinforcement_equipment_delivery_trip_count: 2 };
for (const p of owners) Object.assign(facts, { [`reinforcement_${p.key}_equipment_specification`]: "DEMO compatible " + p.title,
  [`reinforcement_${p.key}_price_scope_reference`]: "DEMO equipment rate includes energy, operator in original labor, full kit and transport terms explicit",
  [`reinforcement_${p.key}_accessories_pricing_mode`]: "INCLUDED_IN_EQUIPMENT_RATE", [`reinforcement_${p.key}_accessories_specification`]: "DEMO full project compatible kit with each tool, attachment and consumable quantity stated", [`reinforcement_${p.key}_accessories_set_count`]: 2 });
delete facts.reinforcement_lifting_equipment_specification;
const manual = (quantity: string) => ({ quantity, provenance: { kind: "manual", reason: "DEMO confirmed equipment kit order" } });
const compile = (submittedParameters: Record<string, unknown>, rowOverrides: CanonicalEstimateCompileCoreInput["rowOverrides"] = {}) => compileCanonicalEstimateCore({
  operation: "recalculate", compilerVersion: "s2733-reinforcement-equipment-test", catalogId: "reinforcement-equipment-test",
  parameterDefinitions: [...parameters, ...addition.parameters.filter(p => !parameters.some(old => old.parameter_id === p.parameter_id))], formulaDefinitions: [...formulas, ...addition.formulas], resourceDefinitions: [...resources, ...addition.resources],
  submittedParameters, confirmedParameters: {}, rowOverrides, currencyCode: "KGS", maximumResourceRows: 23, hashJson: estimateDeterministicHash });
describe("S27.33 actual reinforcement equipment kits and transport", () => {
  it.each(owners)("includes $key kit in its own equipment owner", async p => {
    const result = await compile(facts); expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.find(row => row.row_id === `material:reinforcement:${p.key}-equipment-included-kit`)).toMatchObject({ quantity: "2", amount: null, included_in_procurement: false,
      calculation_trace: { resourceGraph: { includedInResourceOwnerRowId: p.rowId } } });
  });
  it("balances each separately ordered whole kit and rejects a shortage", async () => {
    for (const p of owners) { const id = `material:reinforcement:${p.key}-equipment-separate-kit`, input = { ...facts, [`reinforcement_${p.key}_accessories_pricing_mode`]: "SEPARATE_SUPPLY" };
      const result = await compile(input, { [id]: manual("3") }); expect(result.rows.find(row => row.row_id === id)?.calculation_trace).toMatchObject({ purchaseBalance: { remaining: "1" } });
      const zero = await compile(input, { [id]: manual("0") }); expect(() => assertCanonicalPurchaseReadinessV1(zero.rows)).toThrow();
      await expect(compile(input, { [id]: manual("1.5") })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" }); }
  });
  it("retains the actual count when an included quantity is supplied manually", async () => {
    for (const p of owners) { const id = `material:reinforcement:${p.key}-equipment-included-kit`, countId = `reinforcement_${p.key}_accessories_set_count`;
      const result = await compile({ ...facts, [countId]: null }, { [id]: manual("2") }); expect(result.preliminaryNeeds.find(row => row.row_id === id)?.missing_parameter_ids).toContain(countId); }
  });
  it("does not request new resources for ready cages without a selected lift or zero machine hours", async () => {
    const base = stripFoundationReinforcementAcceptanceInputR1("standard");
    for (const input of [{ ...base, fabrication_mode: "READY_CAGES", lifting_equipment_applicable: false }, { ...base, rebar_cutting_machine_h: 0, rebar_bending_machine_h: 0, lifting_machine_h: 0 }]) {
      const result = await compile(input); expect(result.preliminaryNeeds).toEqual([]); expect(result.rows.some(row => row.row_id.endsWith("equipment-included-kit") || row.row_id.endsWith("equipment-separate-kit") || row.row_id === delivery)).toBe(false); }
    expect(addition.parameters.every(p => p.default_value == null)).toBe(true);
  });
  it("requires confirmed transport and rejects smaller or fractional trips", async () => {
    const missing = await compile({ ...facts, reinforcement_equipment_delivery_trip_count: null }, { [delivery]: manual("9") });
    expect(missing.preliminaryNeeds.find(row => row.row_id === delivery)?.missing_parameter_ids).toContain("reinforcement_equipment_delivery_trip_count");
    for (const quantity of ["1", "1.5"]) await expect(compile(facts, { [delivery]: manual(quantity) })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
  });
});
