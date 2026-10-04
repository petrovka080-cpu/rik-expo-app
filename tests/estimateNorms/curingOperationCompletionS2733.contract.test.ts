import { buildCuringOperationCompletionS2733, CURING_COMPLETION_ROWS as ids } from "../../src/lib/estimate/v4/curingOperationCompletionS2733";
import { ANCHOR_GROUP_CURING_FORMULAS, ANCHOR_GROUP_CURING_PARAMETERS, ANCHOR_GROUP_CURING_RESOURCES, anchorGroupCuringAcceptanceInputR1 } from "../../src/lib/estimate/v4/anchorGroupCuringR1";
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { buildCanonicalProcurementProjection, selectCanonicalArtifactRows } from "../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract";

const addition = buildCuringOperationCompletionS2733("curing-operation-test");
const addedRows = addition.resources.filter(r => r.row_id !== ids.water);
const addedFormulaIds = new Set(addedRows.map(r => r.formula_id));
const water = addition.resources.find(r => r.row_id === ids.water)!;
const parameterDefinitions = [...ANCHOR_GROUP_CURING_PARAMETERS,
  ...addition.parameters.filter(p => !ANCHOR_GROUP_CURING_PARAMETERS.some(old => old.parameter_id === p.parameter_id))];
const resources = [...ANCHOR_GROUP_CURING_RESOURCES.map(r => r.row_id === ids.water ? ({ ...r, resource_graph: {
  ...r.resource_graph, effectiveQuantityOutputV1: water.resource_graph!.effectiveQuantityOutputV1,
  purchaseBalanceV1: water.resource_graph!.purchaseBalanceV1,
} }) : r), ...addedRows];
const facts = { ...anchorGroupCuringAcceptanceInputR1("high_load"),
  application_equipment_accessories_pricing_mode: "INCLUDED_IN_EQUIPMENT_RATE",
  application_equipment_accessories_specification: "DEMO: 2 compatible hoses, 4 couplings and 1 sprinkler per set",
  application_equipment_accessories_set_count: 2, curing_water_delivery_mode: "SEPARATE_DELIVERY",
  curing_water_delivery_vehicle_specification: "DEMO: water tanker including driver and return; excluding water",
  curing_water_delivery_capacity_m3: 3,
};
const amendment = (quantity: string) => ({ quantity, provenance: { kind: "manual", reason: "DEMO confirmed supplier order" } });
function compile(parameters: Record<string, unknown>, rowOverrides: CanonicalEstimateCompileCoreInput["rowOverrides"] = {}) {
  return compileCanonicalEstimateCore({ operation: "recalculate", compilerVersion: "s2733-curing-completion-test", catalogId: "curing-operation-test",
    primaryMeasureParameterId: "cured_concrete_volume_m3", parameterDefinitions,
    formulaDefinitions: [...ANCHOR_GROUP_CURING_FORMULAS, ...addition.formulas.filter(f => addedFormulaIds.has(f.formula_id))],
    resourceDefinitions: resources, submittedParameters: parameters, confirmedParameters: {}, currencyCode: "KGS",
    maximumResourceRows: 11, rowOverrides, hashJson: estimateDeterministicHash });
}
describe("S27.33 standalone curing resource completion", () => {
  it("retains original labor/equipment takeoff and discloses included actual accessories without duplicate procurement", async () => {
    const result = await compile(facts);
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.find(r => r.row_id === ids.equipment)?.quantity).toBe("8");
    expect(result.rows.find(r => r.row_id === "work:concrete:anchor-group-curing")?.quantity).toBe("34");
    expect(result.rows.find(r => r.row_id === ids.includedKit)).toMatchObject({ quantity: "2", included_in_estimate: false, included_in_procurement: false });
    expect(result.rows.some(r => r.row_id === ids.separateKit)).toBe(false);
    expect(result.rows.find(r => r.row_id === ids.delivery)?.quantity).toBe("3");
    expect(addition.parameters.every(p => p.default_value == null)).toBe(true);
    expect(addition.runtimeInput).toEqual({});
  });
  it("orders only the separate kit when the confirmed equipment price excludes accessories", async () => {
    const result = await compile({ ...facts, application_equipment_accessories_pricing_mode: "SEPARATE_SUPPLY" });
    expect(result.preliminaryNeeds).toEqual([]);
    const selected = selectCanonicalArtifactRows(result.rows);
    expect(selected.procurementRows.some(r => r.row_id === ids.separateKit)).toBe(true);
    expect(result.rows.some(r => r.row_id === ids.includedKit)).toBe(false);
    expect(result.rows.find(r => r.row_id === ids.separateKit)?.title_ru).toContain("4 couplings");
  });
  it("counts an included kit once and reconciles shortage of a separately supplied whole kit", async () => {
    const included = await compile(facts, { [ids.equipment]: { unitPrice: 10, provenance: { kind: "manual", reason: "DEMO confirmed equipment quote includes accessories" } } });
    expect(included.rows.find(r => r.row_id === ids.equipment)?.amount).toBe("80");
    expect(included.rows.find(r => r.row_id === ids.includedKit)?.amount).toBeNull();
    const separateFacts = { ...facts, application_equipment_accessories_pricing_mode: "SEPARATE_SUPPLY" };
    const zero = await compile(separateFacts, { [ids.separateKit]: amendment("0") });
    expect(zero.rows.find(r => r.row_id === ids.separateKit)?.calculation_trace.purchaseBalance)
      .toMatchObject({ consumptionShortage: "2", procurementReady: false });
    await expect(compile(separateFacts, { [ids.separateKit]: amendment("1.5") })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
  });
  it("reconciles water freight after manual ordering and blocks a real shortage", async () => {
    const result = await compile(facts, { [ids.water]: amendment("10.1") });
    expect(result.rows.find(r => r.row_id === ids.delivery)?.quantity).toBe("4");
    expect(result.rows.find(r => r.row_id === ids.water)?.calculation_trace.purchaseBalance)
      .toMatchObject({ consumed: "8.5", remaining: "1.6", procurementReady: true });
    const zero = await compile(facts, { [ids.water]: amendment("0") });
    expect(zero.rows.find(r => r.row_id === ids.delivery)?.quantity).toBe("0");
    expect(() => buildCanonicalProcurementProjection({ revision: { id: "fixture", release_id: "fixture", catalog_id: "fixture", checksum_sha256: "fixture", row_count: zero.rows.length }, ...selectCanonicalArtifactRows(zero.rows) })).toThrow();
  });
  it("keeps unknown delivery capacity local and rejects fractional or insufficient manual trips", async () => {
    const partial = await compile({ ...facts, curing_water_delivery_capacity_m3: null }, { [ids.delivery]: amendment("9") });
    expect(partial.preliminaryNeeds.find(r => r.row_id === ids.delivery)).toMatchObject({ quantity: "9", missing_parameter_ids: ["curing_water_delivery_capacity_m3"] });
    expect(partial.rows.find(r => r.row_id === "work:concrete:anchor-group-curing")?.quantity).toBe("34");
    for (const quantity of ["1.5", "2"]) await expect(compile(facts, { [ids.delivery]: amendment(quantity) })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
  });
  it("does not add water delivery or accessories to a sheet method with explicitly no equipment", async () => {
    const result = await compile({ ...anchorGroupCuringAcceptanceInputR1("small_area") });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.some(r => Object.values(ids).includes(r.row_id as typeof ids.water))).toBe(false);
  });
});
