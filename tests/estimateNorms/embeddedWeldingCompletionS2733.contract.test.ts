import { measuredConcreteProjectInputR533 } from "./fixtures/concreteMeasuredProjectInputsR533";
import { buildEmbeddedWeldingCompletionS2733, EMBEDDED_WELDING_COMPLETION_ROWS_S2733 as ids } from "../../src/lib/estimate/v4/embeddedWeldingCompletionS2733";
import { CONCRETE_SLAB_EMBEDDED_ITEMS_PARAMETERS as parameters, CONCRETE_SLAB_EMBEDDED_ITEMS_FORMULAS as formulas,
  CONCRETE_SLAB_EMBEDDED_ITEMS_RESOURCES as resources, concreteSlabEmbeddedItemsAcceptanceInputR1 } from "../../src/lib/estimate/v4/concreteSlabEmbeddedItemsR1";
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { assertCanonicalPurchaseReadinessV1 } from "../../src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1";
const labor = "work:concrete:slab-embedded-items-welding";
const addition = buildEmbeddedWeldingCompletionS2733("embedded-welding-test", "", "42123e5d9adcd174b32049da87bcfbe55b0b7f2cd5ef17a09e599b63f4dddb50", labor);
const facts = { ...concreteSlabEmbeddedItemsAcceptanceInputR1("standard"), welding_post_pricing_mode: "INCLUDED_IN_WELDING_LABOR_RATE",
  welding_post_specification: "DEMO selected post compatible with the existing WPS", welding_post_machine_h: 6,
  welding_post_price_scope_reference: "DEMO operating energy included, operator in existing welding labor, kg welding consumable separate",
  welding_post_accessories_pricing_mode: "INCLUDED_IN_SELECTED_POST_RATE", welding_post_accessories_specification: "DEMO full counted compatible leads clamps protection control cleaning tool BOM, excluding old kg consumable",
  welding_post_accessories_set_count: 2, welding_post_delivery_mode: "SEPARATE_CONFIRMED_TRIPS", welding_post_delivery_reference: "DEMO two confirmed post and kit trips including driver route return, separate from item/lift transport", welding_post_delivery_trip_count: 2 };
const manual = (quantity: string) => ({ quantity, provenance: { kind: "manual", reason: "DEMO confirmed post-kit supply" } });
const compile = (submittedParameters: Record<string, unknown>, rowOverrides: CanonicalEstimateCompileCoreInput["rowOverrides"] = {}) => compileCanonicalEstimateCore({
  operation: "recalculate", compilerVersion: "s2733-embedded-welding-test", catalogId: "embedded-welding-test",
  parameterDefinitions: [...parameters, ...addition.parameters.filter(p => !parameters.some(old => old.parameter_id === p.parameter_id))],
  formulaDefinitions: [...formulas, ...addition.formulas], resourceDefinitions: [...resources, ...addition.resources], submittedParameters, confirmedParameters: {}, rowOverrides,
  currencyCode: "KGS", maximumResourceRows: 20, hashJson: estimateDeterministicHash });
describe("S27.33 actual embedded welding post and counted tool kits", () => {
  it("includes post and kit once in existing welding labor while retaining old kg consumables", async () => {
    const result = await compile(facts); expect(result.preliminaryNeeds).toEqual([]);
    for (const [id, quantity] of [[ids.includedPost, "6"], [ids.laborIncludedKit, "2"]]) expect(result.rows.find(row => row.row_id === id)).toMatchObject({ quantity, amount: null,
      included_in_procurement: false, calculation_trace: { resourceGraph: { includedInResourceOwnerRowId: labor } } });
    expect(result.rows.find(row => row.row_id === "material:concrete:slab-embedded-items-welding-consumables")?.quantity).toBe("5");
    expect(result.rows.find(row => row.row_id === labor)?.quantity).toBe("8");
  });
  it("uses separate post as cost owner of its included kit without paying labor again", async () => {
    const result = await compile({ ...facts, welding_post_pricing_mode: "SEPARATE_EQUIPMENT_RATE" });
    expect(result.preliminaryNeeds).toEqual([]); expect(result.rows.some(row => row.row_id === ids.includedPost || row.row_id === ids.laborIncludedKit)).toBe(false);
    expect(result.rows.find(row => row.row_id === ids.separatePost)).toMatchObject({ quantity: "6", included_in_procurement: true });
    expect(result.rows.find(row => row.row_id === ids.equipmentIncludedKit)?.calculation_trace).toMatchObject({ resourceGraph: { includedInResourceOwnerRowId: ids.separatePost } });
    expect(result.rows.filter(row => row.row_id === labor)).toHaveLength(1);
  });
  it("balances separate whole kits, blocks deficit and rejects fractional orders", async () => {
    const input = { ...facts, welding_post_pricing_mode: "SEPARATE_EQUIPMENT_RATE", welding_post_accessories_pricing_mode: "SEPARATE_SUPPLY" };
    const result = await compile(input, { [ids.separateKit]: manual("3") }); expect(result.rows.find(row => row.row_id === ids.separateKit)?.calculation_trace).toMatchObject({ purchaseBalance: { consumed: "2", remaining: "1" } });
    const zero = await compile(input, { [ids.separateKit]: manual("0") }); expect(() => assertCanonicalPurchaseReadinessV1(zero.rows)).toThrow();
    await expect(compile(input, { [ids.separateKit]: manual("1.5") })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
  });
  it("manual post/kit quantities retain absent actual hours, specifications, price terms and kit count", async () => {
    for (const [rowId, factId] of [[ids.includedPost, "welding_post_machine_h"], [ids.includedPost, "welding_post_specification"], [ids.includedPost, "welding_post_price_scope_reference"],
      [ids.laborIncludedKit, "welding_post_accessories_specification"], [ids.laborIncludedKit, "welding_post_accessories_set_count"]]) {
      const result = await compile({ ...facts, [factId]: null }, { [rowId]: manual("9") });
      expect(result.preliminaryNeeds.find(row => row.row_id === rowId)?.missing_parameter_ids).toContain(factId);
    }
  });
  it("adds no post or questions when project welding is explicitly off", async () => {
    const result = await compile(measuredConcreteProjectInputR533("concreteSlabEmbeddedItemsAcceptanceInputR1", "compact")); expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.some(row => Object.values(ids).includes(row.row_id as typeof ids[keyof typeof ids]))).toBe(false);
    expect(addition.parameters.every(p => p.default_value == null)).toBe(true);
  });
  it("requires confirmed post trips and prevents smaller or fractional manual freight", async () => {
    const missing = await compile({ ...facts, welding_post_delivery_trip_count: null }, { [ids.delivery]: manual("9") });
    expect(missing.preliminaryNeeds.find(row => row.row_id === ids.delivery)?.missing_parameter_ids).toContain("welding_post_delivery_trip_count");
    for (const quantity of ["1", "1.5"]) await expect(compile(facts, { [ids.delivery]: manual(quantity) })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
  });
});
