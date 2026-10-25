import { measuredConcreteProjectInputR533 } from "./fixtures/concreteMeasuredProjectInputsR533";
import { buildEmbeddedInstallationCompletionS2733, EMBEDDED_INSTALLATION_COMPLETION_OWNERS_S2733 as owners } from "../../src/lib/estimate/v4/embeddedInstallationCompletionS2733";
import { CONCRETE_SLAB_EMBEDDED_ITEMS_PARAMETERS as parameters, CONCRETE_SLAB_EMBEDDED_ITEMS_FORMULAS as formulas,
  CONCRETE_SLAB_EMBEDDED_ITEMS_RESOURCES as resources, concreteSlabEmbeddedItemsAcceptanceInputR1 } from "../../src/lib/estimate/v4/concreteSlabEmbeddedItemsR1";
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { assertCanonicalPurchaseReadinessV1 } from "../../src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1";
const ownerRows = { installation: "work:concrete:slab-embedded-items-fixing", lifting: "equipment:concrete:slab-embedded-items-lifting" };
const addition = buildEmbeddedInstallationCompletionS2733("embedded-installation-test", "", "42123e5d9adcd174b32049da87bcfbe55b0b7f2cd5ef17a09e599b63f4dddb50", ownerRows);
const facts: Record<string, unknown> = { ...concreteSlabEmbeddedItemsAcceptanceInputR1("standard"), embedded_installation_delivery_reference: "DEMO confirmed item order shipment including driver and route" };
for (const p of owners) Object.assign(facts, { [`embedded_${p.key}_price_scope_reference`]: "DEMO confirmed original owner rate; full kit terms and existing separate physical materials explicit",
  [`embedded_${p.key}_accessories_pricing_mode`]: "INCLUDED_IN_SELECTED_RATE", [`embedded_${p.key}_accessories_specification`]: "DEMO complete project compatible kit with actual individual tool attachment protection cleaning component counts; old physical material takeoffs excluded",
  [`embedded_${p.key}_accessories_set_count`]: 2 });
const manual = (quantity: string) => ({ quantity, provenance: { kind: "manual", reason: "DEMO confirmed compatible kit order" } });
const compile = (submittedParameters: Record<string, unknown>, rowOverrides: CanonicalEstimateCompileCoreInput["rowOverrides"] = {}) => compileCanonicalEstimateCore({
  operation: "recalculate", compilerVersion: "s2733-embedded-installation-test", catalogId: "embedded-installation-test",
  parameterDefinitions: [...parameters, ...addition.parameters.filter(p => !parameters.some(old => old.parameter_id === p.parameter_id))],
  formulaDefinitions: [...formulas, ...addition.formulas], resourceDefinitions: [...resources, ...addition.resources], submittedParameters, confirmedParameters: {}, rowOverrides,
  currencyCode: "KGS", maximumResourceRows: 18, hashJson: estimateDeterministicHash });
describe("S27.33 actual embedded installation and lifting kits", () => {
  it.each(owners)("includes $key kit in its original owner once", async p => {
    const result = await compile(facts); expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.find(row => row.row_id === `material:concrete:embedded-${p.key}-included-kit`)).toMatchObject({ quantity: "2", amount: null, included_in_procurement: false,
      calculation_trace: { resourceGraph: { includedInResourceOwnerRowId: ownerRows[p.key] } } });
  });
  it("balances separate whole-kit orders without changing old installation hours or item mass", async () => {
    for (const p of owners) {
      const id = `material:concrete:embedded-${p.key}-separate-kit`, input = { ...facts, [`embedded_${p.key}_accessories_pricing_mode`]: "SEPARATE_SUPPLY" };
      const result = await compile(input, { [id]: manual("3") }); expect(result.rows.find(row => row.row_id === id)?.calculation_trace).toMatchObject({ purchaseBalance: { consumed: "2", remaining: "1" } });
      expect(result.rows.find(row => row.row_id === ownerRows.installation)?.quantity).toBe("12"); expect(result.rows.find(row => row.row_id === "material:concrete:slab-embedded-items")?.quantity).toBe("620");
      const zero = await compile(input, { [id]: manual("0") }); expect(() => assertCanonicalPurchaseReadinessV1(zero.rows)).toThrow();
      await expect(compile(input, { [id]: manual("1.5") })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
    }
  });
  it("retains actual count, composition and quote facts under manual kit quantity", async () => {
    for (const p of owners) for (const suffix of ["accessories_set_count", "accessories_specification", "price_scope_reference"]) {
      const fact = `embedded_${p.key}_${suffix}`, id = `material:concrete:embedded-${p.key}-included-kit`;
      const result = await compile({ ...facts, [fact]: null }, { [id]: manual("9") }); expect(result.preliminaryNeeds.find(row => row.row_id === id)?.missing_parameter_ids).toContain(fact);
    }
  });
  it("keeps an explicitly unselected lift inactive while completing the manual installation", async () => {
    const input = { ...measuredConcreteProjectInputR533("concreteSlabEmbeddedItemsAcceptanceInputR1", "compact"), embedded_installation_delivery_reference: facts.embedded_installation_delivery_reference,
      ...Object.fromEntries(Object.entries(facts).filter(([id]) => id.startsWith("embedded_installation_"))) };
    const result = await compile(input); expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.some(row => row.row_id.includes("embedded-lifting-"))).toBe(false);
    expect(addition.parameters.every(p => p.default_value == null)).toBe(true);
  });
});
