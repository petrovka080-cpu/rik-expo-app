import { buildLevelingOperationCompletionS2733, LEVELING_COMPLETION_ROWS as ids } from "../../src/lib/estimate/v4/levelingOperationCompletionS2733";
import { ANCHOR_GROUP_LEVELING_FORMULAS, ANCHOR_GROUP_LEVELING_PARAMETERS, ANCHOR_GROUP_LEVELING_RESOURCES, anchorGroupLevelingAcceptanceInputR1 } from "../../src/lib/estimate/v4/anchorGroupLevelingR1";
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { buildCanonicalProcurementProjection, selectCanonicalArtifactRows } from "../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract";

const equipmentId = "equipment:concrete:anchor-group-leveling";
const addition = buildLevelingOperationCompletionS2733("leveling-operation-test", equipmentId);
const addedRows = addition.resources.filter(r => r.row_id !== ids.guides);
const addedFormulaIds = new Set(addedRows.map(r => r.formula_id));
const guide = addition.resources.find(r => r.row_id === ids.guides)!;
const resources = [...ANCHOR_GROUP_LEVELING_RESOURCES.map(r => r.row_id === ids.guides ? ({ ...r, resource_graph: {
  ...r.resource_graph, effectiveQuantityOutputV1: guide.resource_graph!.effectiveQuantityOutputV1,
  purchaseBalanceV1: guide.resource_graph!.purchaseBalanceV1,
} }) : r), ...addedRows];
const facts = { ...anchorGroupLevelingAcceptanceInputR1("high_load"),
  leveling_guide_accessories_pricing_mode: "INCLUDED_IN_GUIDE_RATE",
  leveling_guide_accessories_specification: "DEMO: 4 compatible supports and 8 fixing clips per set",
  leveling_guide_accessories_set_count: 2,
  leveling_equipment_accessories_pricing_mode: "INCLUDED_IN_EQUIPMENT_RATE",
  leveling_equipment_accessories_specification: "DEMO: 1 compatible screed head and 2 coupling pins per set",
  leveling_equipment_accessories_set_count: 1,
};
const amendment = (quantity: string) => ({ quantity, provenance: { kind: "manual", reason: "DEMO confirmed supplier order" } });
function compile(parameters: Record<string, unknown>, rowOverrides: CanonicalEstimateCompileCoreInput["rowOverrides"] = {}) {
  return compileCanonicalEstimateCore({ operation: "recalculate", compilerVersion: "s2733-leveling-completion-test", catalogId: "leveling-operation-test",
    primaryMeasureParameterId: "leveled_concrete_volume_m3",
    parameterDefinitions: [...ANCHOR_GROUP_LEVELING_PARAMETERS, ...addition.parameters.filter(p => !ANCHOR_GROUP_LEVELING_PARAMETERS.some(old => old.parameter_id === p.parameter_id))],
    formulaDefinitions: [...ANCHOR_GROUP_LEVELING_FORMULAS, ...addition.formulas.filter(f => addedFormulaIds.has(f.formula_id))],
    resourceDefinitions: resources, submittedParameters: parameters, confirmedParameters: {}, currencyCode: "KGS",
    maximumResourceRows: 9, rowOverrides, hashJson: estimateDeterministicHash });
}
describe("S27.33 leveling operation component completion", () => {
  it("preserves direct guide, labor, equipment and mobilization takeoff and discloses included component BOMs once", async () => {
    const result = await compile(facts, { [equipmentId]: { unitPrice: 10, provenance: { kind: "manual", reason: "DEMO equipment quote includes accessories" } } });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.find(r => r.row_id === "work:concrete:anchor-group-leveling")?.quantity).toBe("30");
    expect(result.rows.find(r => r.row_id === equipmentId)).toMatchObject({ quantity: "9", amount: "90" });
    expect(result.rows.find(r => r.row_id === ids.guides)?.quantity).toBe("76");
    expect(result.rows.find(r => r.category === "delivery")?.quantity).toBe("2");
    for (const rowId of [ids.includedGuideKit, ids.includedEquipmentKit]) expect(result.rows.find(r => r.row_id === rowId))
      .toMatchObject({ included_in_estimate: false, included_in_procurement: false, amount: null });
    expect(result.rows.some(r => [ids.separateGuideKit, ids.separateEquipmentKit].includes(r.row_id as typeof ids.separateGuideKit))).toBe(false);
    expect(addition.parameters.every(p => p.default_value == null)).toBe(true);
    expect(addition.runtimeInput).toEqual({});
  });
  it("selects separately supplied guide fixings and equipment consumables only when their price excludes them", async () => {
    const result = await compile({ ...facts, leveling_guide_accessories_pricing_mode: "SEPARATE_SUPPLY", leveling_equipment_accessories_pricing_mode: "SEPARATE_SUPPLY" });
    expect(result.preliminaryNeeds).toEqual([]);
    const selected = selectCanonicalArtifactRows(result.rows);
    for (const rowId of [ids.separateGuideKit, ids.separateEquipmentKit]) expect(selected.procurementRows.some(r => r.row_id === rowId)).toBe(true);
    expect(result.rows.some(r => [ids.includedGuideKit, ids.includedEquipmentKit].includes(r.row_id as typeof ids.includedGuideKit))).toBe(false);
    expect(result.rows.find(r => r.row_id === ids.separateGuideKit)?.title_ru).toContain("8 fixing clips per set");
  });
  it("reconciles a manually accepted guide order without changing project consumption", async () => {
    const result = await compile(facts, { [ids.guides]: amendment("80.5") });
    expect(result.rows.find(r => r.row_id === ids.guides)?.calculation_trace)
      .toMatchObject({ purchaseBalance: { consumed: "76", remaining: "4.5", procurementReady: true } });
    const shortage = await compile(facts, { [ids.guides]: amendment("0") });
    expect(shortage.rows.find(r => r.row_id === ids.guides)?.calculation_trace)
      .toMatchObject({ purchaseBalance: { consumptionShortage: "76", procurementReady: false } });
    expect(() => buildCanonicalProcurementProjection({ revision: { id: "fixture", release_id: "fixture", catalog_id: "fixture", checksum_sha256: "fixture", row_count: shortage.rows.length }, ...selectCanonicalArtifactRows(shortage.rows) })).toThrow();
  });
  it("blocks shortage and fractional supply of an actual whole accessory kit", async () => {
    const separate = { ...facts, leveling_equipment_accessories_pricing_mode: "SEPARATE_SUPPLY" };
    const result = await compile(separate, { [ids.separateEquipmentKit]: amendment("0") });
    expect(result.rows.find(r => r.row_id === ids.separateEquipmentKit)?.calculation_trace)
      .toMatchObject({ purchaseBalance: { consumptionShortage: "1", procurementReady: false } });
    await expect(compile(separate, { [ids.separateEquipmentKit]: amendment("1.5") })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
  });
  it("keeps missing compatibility/specification local to component rows", async () => {
    const result = await compile({ ...facts, leveling_equipment_accessories_specification: null });
    expect(result.preliminaryNeeds.find(r => r.row_id === ids.includedEquipmentKit)?.missing_parameter_ids).toContain("leveling_equipment_accessories_specification");
    expect(result.rows.find(r => r.row_id === equipmentId)?.quantity).toBe("9");
    expect(result.rows.find(r => r.row_id === "work:concrete:anchor-group-leveling")?.quantity).toBe("30");
  });
  it("does not invent kits for unselected equipment/guides or explicit project confirmation that no additional components are required", async () => {
    const noEquipment = await compile(anchorGroupLevelingAcceptanceInputR1("small_area"));
    expect(noEquipment.preliminaryNeeds).toEqual([]);
    expect(noEquipment.rows.some(r => Object.values(ids).includes(r.row_id as typeof ids.guides))).toBe(false);
    const noAdditional = await compile({ ...facts, leveling_guide_accessories_pricing_mode: "NOT_REQUIRED", leveling_equipment_accessories_pricing_mode: "NOT_REQUIRED" });
    expect(noAdditional.preliminaryNeeds).toEqual([]);
    expect(noAdditional.rows.some(r => r.row_id.includes("-kit"))).toBe(false);
  });
});
