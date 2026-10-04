import { buildEmbeddedCoatingCompletionS2733, EMBEDDED_COATING_COMPLETION_ROWS_S2733 as ids } from "../../src/lib/estimate/v4/embeddedCoatingCompletionS2733";
import { CONCRETE_SLAB_EMBEDDED_ITEMS_PARAMETERS as parameters, CONCRETE_SLAB_EMBEDDED_ITEMS_FORMULAS as formulas,
  CONCRETE_SLAB_EMBEDDED_ITEMS_RESOURCES as resources, concreteSlabEmbeddedItemsAcceptanceInputR1 } from "../../src/lib/estimate/v4/concreteSlabEmbeddedItemsR1";
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { assertCanonicalPurchaseReadinessV1 } from "../../src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1";
const labor = "work:concrete:slab-embedded-items-coating";
const addition = buildEmbeddedCoatingCompletionS2733("embedded-coating-test", "", "42123e5d9adcd174b32049da87bcfbe55b0b7f2cd5ef17a09e599b63f4dddb50", labor);
const facts = { ...concreteSlabEmbeddedItemsAcceptanceInputR1("standard"), coating_touchup_required: true,
  coating_touchup_designation: "DEMO approved compatible coating", coating_touchup_quantity_kg: 4, coating_touchup_worker_h: 4, embedded_coating_method: "MANUAL_TOOLS",
  embedded_coating_method_reference: "DEMO approved compatible coating preparation application control cleanup schedule, all labor in old hours",
  embedded_coating_price_scope_reference: "DEMO old labor includes operator, selected machine rate includes energy; old coating kg separate",
  embedded_coating_accessories_pricing_mode: "INCLUDED_IN_SELECTED_RATE", embedded_coating_accessories_specification: "DEMO counted full prep brush masking applicator PPE control gauge and cleanup kit, excluding old coating kg and welding/installation items",
  embedded_coating_accessories_set_count: 2, embedded_coating_delivery_mode: "SEPARATE_CONFIRMED_TRIPS",
  embedded_coating_delivery_reference: "DEMO two confirmed coating tool freight trips including driver route return, old item/lift/post freight excluded", embedded_coating_delivery_trip_count: 2 };
const equipment = { ...facts, embedded_coating_method: "PROJECT_SELECTED_EQUIPMENT", embedded_coating_equipment_pricing_mode: "INCLUDED_IN_EXISTING_LABOR_RATE",
  embedded_coating_equipment_specification: "DEMO selected coating compatible prep/application equipment", embedded_coating_equipment_machine_h: 3.5 };
const manual = (quantity: string) => ({ quantity, provenance: { kind: "manual", reason: "DEMO confirmed coating-kit order" } });
const compile = (submittedParameters: Record<string, unknown>, rowOverrides: CanonicalEstimateCompileCoreInput["rowOverrides"] = {}) => compileCanonicalEstimateCore({
  operation: "recalculate", compilerVersion: "s2733-embedded-coating-test", catalogId: "embedded-coating-test",
  parameterDefinitions: [...parameters, ...addition.parameters.filter(p => !parameters.some(old => old.parameter_id === p.parameter_id))],
  formulaDefinitions: [...formulas, ...addition.formulas], resourceDefinitions: [...resources, ...addition.resources], submittedParameters, confirmedParameters: {}, rowOverrides,
  currencyCode: "KGS", maximumResourceRows: 20, hashJson: estimateDeterministicHash });
describe("S27.33 project coating restoration equipment and counted complete tools", () => {
  it("includes manual tools in original labor with no imposed machine or duplicated coating kg", async () => {
    const result = await compile(facts); expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.find(row => row.row_id === ids.laborIncludedKit)).toMatchObject({ quantity: "2", amount: null, included_in_estimate: false,
      included_in_procurement: false, calculation_trace: { resourceGraph: { includedInResourceOwnerRowId: labor } } });
    expect(result.rows.some(row => row.row_id === ids.includedEquipment || row.row_id === ids.separateEquipment)).toBe(false);
    expect(result.rows.find(row => row.row_id === "material:concrete:slab-embedded-items-coating")?.quantity).toBe("4");
    expect(result.rows.find(row => row.row_id === labor)?.quantity).toBe("4");
  });
  it("resolves both equipment payment owners and excludes a second labor payment", async () => {
    const included = await compile(equipment); expect(included.preliminaryNeeds).toEqual([]);
    expect(included.rows.find(row => row.row_id === ids.includedEquipment)).toMatchObject({ quantity: "3.5", amount: null,
      included_in_estimate: false, calculation_trace: { resourceGraph: { includedInResourceOwnerRowId: labor } } });
    const separate = await compile({ ...equipment, embedded_coating_equipment_pricing_mode: "SEPARATE_EQUIPMENT_RATE" }); expect(separate.preliminaryNeeds).toEqual([]);
    expect(separate.rows.find(row => row.row_id === ids.separateEquipment)).toMatchObject({ quantity: "3.5", included_in_procurement: true });
    expect(separate.rows.find(row => row.row_id === ids.equipmentIncludedKit)?.calculation_trace).toMatchObject({ resourceGraph: { includedInResourceOwnerRowId: ids.separateEquipment } });
    expect(separate.rows.filter(row => row.row_id === labor)).toHaveLength(1);
  });
  it("balances whole separate tool kits and blocks shortage or fractional orders", async () => {
    const input = { ...facts, embedded_coating_accessories_pricing_mode: "SEPARATE_SUPPLY" };
    const ordered = await compile(input, { [ids.separateKit]: manual("3") }); expect(ordered.rows.find(row => row.row_id === ids.separateKit)?.calculation_trace).toMatchObject({ purchaseBalance: { consumed: "2", remaining: "1" } });
    const shortage = await compile(input, { [ids.separateKit]: manual("0") }); expect(() => assertCanonicalPurchaseReadinessV1(shortage.rows)).toThrow();
    await expect(compile(input, { [ids.separateKit]: manual("1.5") })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
  });
  it("manual quantities cannot hide missing method, compatibility BOM, actual hours or price scope", async () => {
    for (const fact of ["embedded_coating_method_reference", "embedded_coating_accessories_specification", "embedded_coating_accessories_set_count", "embedded_coating_price_scope_reference"]) {
      const result = await compile({ ...facts, [fact]: null }, { [ids.laborIncludedKit]: manual("9") });
      expect(result.preliminaryNeeds.find(row => row.row_id === ids.laborIncludedKit)?.missing_parameter_ids).toContain(fact);
    }
    for (const fact of ["embedded_coating_equipment_machine_h", "embedded_coating_equipment_specification"]) {
      const result = await compile({ ...equipment, [fact]: null }, { [ids.includedEquipment]: manual("9") });
      expect(result.preliminaryNeeds.find(row => row.row_id === ids.includedEquipment)?.missing_parameter_ids).toContain(fact);
    }
    const missing = await compile({ ...facts, embedded_coating_method: null }, { [ids.laborIncludedKit]: manual("9") });
    expect(missing.preliminaryNeeds.some(row => row.missing_parameter_ids?.includes("embedded_coating_method"))).toBe(true);
  });
  it("adds no coating tools or questions when the original project selector is off", async () => {
    const result = await compile(concreteSlabEmbeddedItemsAcceptanceInputR1("small_area")); expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.some(row => Object.values(ids).includes(row.row_id as typeof ids[keyof typeof ids]))).toBe(false);
    expect(addition.parameters.every(p => p.default_value == null)).toBe(true);
  });
  it("retains confirmed freight needs and rejects smaller or fractional manual trips", async () => {
    const missing = await compile({ ...facts, embedded_coating_delivery_trip_count: null }, { [ids.delivery]: manual("9") });
    expect(missing.preliminaryNeeds.find(row => row.row_id === ids.delivery)?.missing_parameter_ids).toContain("embedded_coating_delivery_trip_count");
    for (const quantity of ["1", "1.5"]) await expect(compile(facts, { [ids.delivery]: manual(quantity) })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
  });
});
