import { overlayS2733ReinforcementPurchaseGroup } from "../../scripts/estimate/r4a13/s2733ReinforcementPurchaseGroupOverlay";
import { overlayS2732PurchaseGroup, type PurchaseGroupRepresentative } from "../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay";
import { ANCHOR_GROUP_REINFORCEMENT_PARAMETERS, ANCHOR_GROUP_REINFORCEMENT_RESOURCES, anchorGroupReinforcementAcceptanceInputR1 } from "../../src/lib/estimate/v4/anchorGroupReinforcementR1";
import { STRIP_FOUNDATION_REINFORCEMENT_FORMULAS } from "../../src/lib/estimate/v4/stripFoundationReinforcementR1";
import { MONOLITHIC_REBAR_CAGE_PARAMETERS, MONOLITHIC_REBAR_CAGE_RESOURCES, MONOLITHIC_REBAR_CAGE_FORMULAS, MONOLITHIC_REBAR_CAGE_ACCEPTANCE_INPUT } from "../../src/lib/estimate/v4/monolithicRebarCageR1";
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { buildCanonicalProcurementProjection, selectCanonicalArtifactRows } from "../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract";

const steel = "material:reinforcement:steel-approved-schedule", freight = "delivery:reinforcement:steel";
const facts = anchorGroupReinforcementAcceptanceInputR1("high_load");
const manual = (quantity: string) => ({ quantity, provenance: { kind: "manual", reason: "DEMO confirmed supplier order" } });
function parent(frame = false): PurchaseGroupRepresentative {
  const parameters = frame ? MONOLITHIC_REBAR_CAGE_PARAMETERS : ANCHOR_GROUP_REINFORCEMENT_PARAMETERS;
  const resources = frame ? MONOLITHIC_REBAR_CAGE_RESOURCES : ANCHOR_GROUP_REINFORCEMENT_RESOURCES;
  return structuredClone({ definition: { catalog_id: `canonical-work:base:concrete_foundation_interior_${frame ? "reinforcement_frame_reinforce_standard" : "anchor_group_reinforce_high_load"}`,
    definition_sha256: "a".repeat(64) }, parameters: [...parameters], resources: resources.map(r => ({ ...r,
      row_type: r.category === "material" ? "material" : r.category === "construction_work" ? "labor" : r.category === "delivery" ? "service" : r.category })),
    formulas: [...(frame ? MONOLITHIC_REBAR_CAGE_FORMULAS : STRIP_FOUNDATION_REINFORCEMENT_FORMULAS)],
    baseline: { formula_consumer_ids: {}, resource_consumer_row_ids: {}, uom_by_parameter: {}, normative_source_ids: {}, guide_provenance_ru: {} },
    passport: { physical_result_ru: "DEMO reinforcement" }, bindings: [] });
}
const base = parent(), next = overlayS2733ReinforcementPurchaseGroup(base, "unused-existing-bindings").representative;
function compile(r: PurchaseGroupRepresentative, parameters: Record<string, unknown>, rowOverrides: CanonicalEstimateCompileCoreInput["rowOverrides"] = {}, frame = false) {
  return compileCanonicalEstimateCore({ operation: "recalculate", compilerVersion: "s2733-reinforcement-order-test", catalogId: r.definition.catalog_id,
    primaryMeasureParameterId: frame ? null : "approved_reinforcement_schedule_weight_kg",
    parameterDefinitions: r.parameters as unknown as CanonicalEstimateCompileCoreInput["parameterDefinitions"],
    formulaDefinitions: r.formulas as unknown as CanonicalEstimateCompileCoreInput["formulaDefinitions"],
    resourceDefinitions: r.resources as unknown as CanonicalEstimateCompileCoreInput["resourceDefinitions"],
    submittedParameters: parameters, confirmedParameters: {}, currencyCode: "KGS", maximumResourceRows: r.resources.length, rowOverrides, hashJson: estimateDeterministicHash });
}
describe("S27.33 reinforcement material order and delivery", () => {
  it("preserves all original component, labor, equipment and work quantities without a changed order", async () => {
    const old = await compile(base, facts), current = await compile(next, facts);
    expect(current.preliminaryNeeds).toEqual([]);
    expect(current.rows.map(r => [r.row_id, r.unit_id, r.quantity, r.included_in_estimate, r.included_in_procurement]))
      .toEqual(old.rows.map(r => [r.row_id, r.unit_id, r.quantity, r.included_in_estimate, r.included_in_procurement]));
    expect(next.resources).toHaveLength(base.resources.length);
    expect(next.parameters.slice(base.parameters.length).every(p => p.default_value == null && p.truth_metadata.visibility_role === "INTERNAL_ONLY")).toBe(true);
  });
  it("uses accepted fractional kilogram order for freight while keeping BBS and installation labor unchanged", async () => {
    const current = await compile(next, facts, { [steel]: manual("2750.5") });
    expect(current.rows.find(r => r.row_id === freight)?.quantity).toBe("71.513");
    expect(current.rows.find(r => r.row_id === steel)?.calculation_trace)
      .toMatchObject({ purchaseBalance: { consumed: "2500", remaining: "250.5", procurementReady: true } });
    expect(current.rows.find(r => r.row_id === "work:reinforcement:install-fix")?.quantity).toBe("72");
  });
  it("blocks procurement on a zero/insufficient material order and does not keep freight for unordered steel", async () => {
    const current = await compile(next, facts, { [steel]: manual("0") });
    expect(current.rows.find(r => r.row_id === freight)?.quantity).toBe("0");
    expect(current.rows.find(r => r.row_id === steel)?.calculation_trace)
      .toMatchObject({ purchaseBalance: { consumptionShortage: "2500", procurementReady: false } });
    expect(() => buildCanonicalProcurementProjection({ revision: { id: "fixture", release_id: "fixture", catalog_id: "fixture", checksum_sha256: "fixture", row_count: current.rows.length }, ...selectCanonicalArtifactRows(current.rows) })).toThrow();
  });
  it("preserves whole-piece constraints for separately ordered chairs and couplers", async () => {
    for (const id of ["material:reinforcement:spacer-chairs", "material:reinforcement:mechanical-couplers"])
      await expect(compile(next, facts, { [id]: manual("1.5") })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
    const shortage = await compile(next, facts, { "material:reinforcement:mechanical-couplers": manual("0") });
    expect(shortage.rows.find(r => r.row_id === "material:reinforcement:mechanical-couplers")?.calculation_trace)
      .toMatchObject({ purchaseBalance: { consumptionShortage: "62", procurementReady: false } });
  });
  it("rejects underreported freight but allows a confirmed greater decimal t-km quantity", async () => {
    await expect(compile(next, facts, { [steel]: manual("2750.5"), [freight]: manual("70") })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
    const greater = await compile(next, facts, { [steel]: manual("2750.5"), [freight]: manual("72.25") });
    expect(greater.rows.find(r => r.row_id === freight)?.quantity).toBe("72.25");
  });
  it("reconciles the existing two-diameter frame profile without changing installed steel mass or adding an invented freight route", async () => {
    const original = parent(true), amended = overlayS2733ReinforcementPurchaseGroup(original, "unused-existing-bindings").representative;
    const old = await compile(original, MONOLITHIC_REBAR_CAGE_ACCEPTANCE_INPUT, {}, true);
    const changed = await compile(amended, MONOLITHIC_REBAR_CAGE_ACCEPTANCE_INPUT, { "material:rebar-cage:a500c-d12": manual("4000") }, true);
    expect(changed.preliminaryNeeds).toEqual([]);
    expect(changed.rows.find(r => r.row_id === "work:rebar-cage:assemble-install")?.quantity).toBe(old.rows.find(r => r.row_id === "work:rebar-cage:assemble-install")?.quantity);
    expect(amended.resources).toHaveLength(9);
    expect(amended.resources.some(r => r.category === "delivery")).toBe(false);
  });
  it("keeps the old default scope closed and rejects mixed/unknown owner options", () => {
    expect(() => overlayS2732PurchaseGroup(base)).toThrow("UNKNOWN_CATALOG");
    expect(() => overlayS2732PurchaseGroup(base, { reinforcementOwners: true, concretePlacementOwners: true })).toThrow("OWNER_SCOPE_CONFLICT");
    expect(() => overlayS2732PurchaseGroup({ ...base, definition: { ...base.definition, catalog_id: "unapproved-owner" } }, { reinforcementOwners: true })).toThrow("REINFORCEMENT_OWNER_SCOPE");
  });
});
