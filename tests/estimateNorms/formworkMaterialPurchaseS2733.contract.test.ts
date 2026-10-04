import { overlayS2733FormworkMaterialPurchase } from "../../scripts/estimate/r4a13/s2733FormworkMaterialPurchaseOverlay";
import { overlayS2732PurchaseGroup, type PurchaseGroupRepresentative } from "../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay";
import { FORMWORK_FRAMI_XLIFE_PARAMETERS, FORMWORK_FRAMI_XLIFE_FORMULAS, FORMWORK_FRAMI_XLIFE_RESOURCES, formworkFramiXlifeStripFoundationAcceptanceInputR1 } from "../../src/lib/estimate/v4/formworkFramiXlifeProjectKitR1";
import { CONCRETE_SLAB_COMPLETE_INSTALLATION_PARAMETERS, CONCRETE_SLAB_COMPLETE_INSTALLATION_FORMULAS, CONCRETE_SLAB_COMPLETE_INSTALLATION_RESOURCES, concreteSlabCompleteInstallationAcceptanceInputR1 } from "../../src/lib/estimate/v4/concreteSlabCompleteInstallationR1";
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { assertCanonicalPurchaseReadinessV1 } from "../../src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1";
const tape = "material:formwork:perforated-tape-50x2", concrete = "material:concrete:ready-mix", steel = "material:reinforcement:steel-approved-schedule";
const manual = (quantity: string) => ({ quantity, provenance: { kind: "manual", reason: "DEMO supplier order" } });
function fixture(slab = false): PurchaseGroupRepresentative {
  // The frozen delivered slab precedes the later optional waterstop source
  // extension. Match its exact 72/174 envelope; do not relax publisher guards.
  const laterJointIds = new Set(["placement_construction_joint_mode", "placement_construction_joint_waterstop_specification", "placement_construction_joint_waterstop_length_m", "placement_construction_joint_installation_worker_h"]);
  return structuredClone({ definition: { catalog_id: `canonical-work:base:concrete_foundation_interior_${slab ? "concrete_slab" : "strip_foundation"}_form_high_load`, definition_sha256: "a".repeat(64) },
    parameters: [...(slab ? CONCRETE_SLAB_COMPLETE_INSTALLATION_PARAMETERS.filter(p => !laterJointIds.has(p.parameter_id)) : FORMWORK_FRAMI_XLIFE_PARAMETERS)],
    formulas: [...(slab ? CONCRETE_SLAB_COMPLETE_INSTALLATION_FORMULAS : FORMWORK_FRAMI_XLIFE_FORMULAS)],
    resources: (slab ? CONCRETE_SLAB_COMPLETE_INSTALLATION_RESOURCES.filter(row => !["material:concrete:construction-joint-waterstop", "work:concrete:construction-joint-waterstop-install"].includes(row.row_id)) : FORMWORK_FRAMI_XLIFE_RESOURCES).map(row => ({ ...row,
      row_type: row.category === "construction_work" ? "labor" : row.category === "delivery" ? "service" : row.category })),
    baseline: { formula_consumer_ids: {}, resource_consumer_row_ids: {}, uom_by_parameter: {}, normative_source_ids: {}, guide_provenance_ru: {} },
    bindings: [], passport: { physical_result_ru: "DEMO project formwork" } });
}
const base = fixture(), next = overlayS2733FormworkMaterialPurchase(base).representative;
const facts = formworkFramiXlifeStripFoundationAcceptanceInputR1("high_load");
const compile = (r: PurchaseGroupRepresentative, parameters: Record<string, unknown>, rowOverrides: CanonicalEstimateCompileCoreInput["rowOverrides"] = {}) => compileCanonicalEstimateCore({
  operation: "recalculate", compilerVersion: "formwork-material-purchase-test", catalogId: r.definition.catalog_id,
  parameterDefinitions: r.parameters as unknown as CanonicalEstimateCompileCoreInput["parameterDefinitions"], formulaDefinitions: r.formulas as unknown as CanonicalEstimateCompileCoreInput["formulaDefinitions"],
  resourceDefinitions: r.resources as unknown as CanonicalEstimateCompileCoreInput["resourceDefinitions"], submittedParameters: parameters, confirmedParameters: {}, currencyCode: "KGS", maximumResourceRows: r.resources.length, rowOverrides, hashJson: estimateDeterministicHash });
describe("S27.33 delivered formwork material purchase group", () => {
  it("preserves rental, project labor, two transport legs and all original quantities before an order edit", async () => {
    const old = await compile(base, facts), current = await compile(next, facts);
    expect(current.preliminaryNeeds).toEqual([]);
    expect(current.rows.map(r => [r.row_id, r.unit_id, r.quantity, r.included_in_estimate, r.included_in_procurement])).toEqual(old.rows.map(r => [r.row_id, r.unit_id, r.quantity, r.included_in_estimate, r.included_in_procurement]));
    expect(next.formulas).toEqual(base.formulas);
    expect(next.parameters.slice(base.parameters.length).every(p => p.default_value == null && p.truth_metadata.visibility_role === "INTERNAL_ONLY")).toBe(true);
  });
  it("tracks a fractional tape order without changing returnable equipment count-days or kit shipping mass", async () => {
    const current = await compile(next, facts, { [tape]: manual("70.5") });
    expect(current.rows.find(r => r.row_id === tape)?.calculation_trace).toMatchObject({ purchaseBalance: { consumed: "65", remaining: "5.5", procurementReady: true } });
    expect(current.rows.find(r => r.row_id === "equipment:formwork:frami-xlife-panels-rental")?.quantity).toBe("576");
    expect(current.rows.find(r => r.row_id === "delivery:formwork:outbound-kit")?.quantity).toBe("96");
    expect(current.rows.find(r => r.row_id === "delivery:formwork:return-kit")?.quantity).toBe("96");
    expect(current.rows.find(r => r.row_id === "work:formwork:assemble-install-align")?.quantity).toBe("96");
  });
  it("keeps a zero order as a shortage and an unknown physical tape schedule as a local need", async () => {
    const shortage = await compile(next, facts, { [tape]: manual("0") });
    expect(shortage.rows.find(r => r.row_id === tape)?.calculation_trace).toMatchObject({ purchaseBalance: { consumptionShortage: "65", procurementReady: false } });
    expect(() => assertCanonicalPurchaseReadinessV1(shortage.rows)).toThrow();
    const unknown = await compile(next, { ...facts, perforated_tape_50x2_length_m: null }, { [tape]: manual("70.5") });
    expect(unknown.preliminaryNeeds.find(n => n.row_id === tape)?.missing_parameter_ids).toContain("perforated_tape_50x2_length_m");
  });
  it("uses composed operation parameters for concrete reserve and accepted concrete/steel shipping", async () => {
    const original = fixture(true), transformed = overlayS2733FormworkMaterialPurchase(original).representative;
    const parameters = Object.fromEntries(Object.entries(concreteSlabCompleteInstallationAcceptanceInputR1("high_load")).filter(([id]) => original.parameters.some(p => p.parameter_id === id)));
    const old = await compile(original, parameters), unchanged = await compile(transformed, parameters);
    expect(unchanged.preliminaryNeeds).toEqual([]);
    expect(unchanged.rows.map(r => [r.row_id, r.quantity])).toEqual(old.rows.map(r => [r.row_id, r.quantity]));
    const ready = old.rows.find(r => r.row_id === concrete)!, bars = old.rows.find(r => r.row_id === steel)!;
    const changed = await compile(transformed, parameters, { [concrete]: manual(String(Number(ready.quantity) + 2.5)), [steel]: manual(String(Number(bars.quantity) + 100.5)) });
    expect(changed.preliminaryNeeds).toEqual([]);
    expect(changed.rows.find(r => r.row_id === concrete)?.calculation_trace).toMatchObject({ purchaseBalance: { plannedConsumption: String(parameters.slab_concrete_volume_m3), remaining: "2.5", requirementBasis: "selected_order_including_contingency" } });
    for (const rowId of ["work:concrete:place-and-compact", "work:reinforcement:install-fix", "equipment:formwork:dokaflex-floor-props-rental"])
      expect(changed.rows.find(r => r.row_id === rowId)?.quantity).toBe(old.rows.find(r => r.row_id === rowId)?.quantity);
    await expect(compile(transformed, parameters, { ["delivery:reinforcement:steel"]: manual("0") })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
  });
  it("rejects drift, out-of-scope and mixed owners while leaving the original default scope closed", () => {
    expect(() => overlayS2732PurchaseGroup(base)).toThrow("UNKNOWN_CATALOG");
    expect(() => overlayS2732PurchaseGroup(base, { formworkMaterialOwners: true, reinforcementOwners: true })).toThrow("OWNER_SCOPE_CONFLICT");
    expect(() => overlayS2733FormworkMaterialPurchase({ ...base, definition: { ...base.definition, catalog_id: "unknown" } })).toThrow("FINITE_SCOPE");
    expect(() => overlayS2733FormworkMaterialPurchase({ ...base, resources: base.resources.slice(1) })).toThrow("DELIVERED_SHAPE_DRIFT");
    expect(() => overlayS2733FormworkMaterialPurchase(next)).toThrow("DELIVERED_SHAPE_DRIFT");
  });
});
