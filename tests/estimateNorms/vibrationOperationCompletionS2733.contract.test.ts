import { buildVibrationOperationCompletionS2733, VIBRATION_COMPLETION_ROWS as ids } from "../../src/lib/estimate/v4/vibrationOperationCompletionS2733";
import { ANCHOR_GROUP_VIBRATION_FORMULAS, ANCHOR_GROUP_VIBRATION_PARAMETERS, ANCHOR_GROUP_VIBRATION_RESOURCES, anchorGroupVibrationAcceptanceInputR1 } from "../../src/lib/estimate/v4/anchorGroupVibrationR1";
import { PILE_CAP_VIBRATION_FORMULAS, PILE_CAP_VIBRATION_PARAMETERS, PILE_CAP_VIBRATION_RESOURCES, pileCapVibrationAcceptanceInputR1 } from "../../src/lib/estimate/v4/pileCapVibrationR1";
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { buildCanonicalProcurementProjection, selectCanonicalArtifactRows } from "../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract";

const kitFacts = { vibration_equipment_accessories_pricing_mode: "INCLUDED_IN_EQUIPMENT_RATE",
  vibration_equipment_accessories_specification: "DEMO: 1 compatible head, 1 flexible shaft and 2 coupling pins per set; actual selected cleaning consumables included",
  vibration_equipment_accessories_set_count: 2 };
const facts = { ...anchorGroupVibrationAcceptanceInputR1("high_load"), ...kitFacts };
const amendment = (quantity: string) => ({ quantity, provenance: { kind: "manual", reason: "DEMO confirmed supplier order" } });
function compile(parameters: Record<string, unknown>, rowOverrides: CanonicalEstimateCompileCoreInput["rowOverrides"] = {}, pileCap = false) {
  const oldParameters = pileCap ? PILE_CAP_VIBRATION_PARAMETERS : ANCHOR_GROUP_VIBRATION_PARAMETERS;
  const addition = buildVibrationOperationCompletionS2733("vibration-operation-test", pileCap ? "work:concrete:pile-cap-vibration" : undefined);
  return compileCanonicalEstimateCore({ operation: "recalculate", compilerVersion: "s2733-vibration-completion-test", catalogId: "vibration-operation-test",
    primaryMeasureParameterId: "consolidated_concrete_volume_m3",
    parameterDefinitions: [...oldParameters, ...addition.parameters.filter(p => !oldParameters.some(old => old.parameter_id === p.parameter_id))],
    formulaDefinitions: [...(pileCap ? PILE_CAP_VIBRATION_FORMULAS : ANCHOR_GROUP_VIBRATION_FORMULAS), ...addition.formulas],
    resourceDefinitions: [...(pileCap ? PILE_CAP_VIBRATION_RESOURCES : ANCHOR_GROUP_VIBRATION_RESOURCES), ...addition.resources],
    submittedParameters: parameters, confirmedParameters: {}, currencyCode: "KGS", maximumResourceRows: 7, rowOverrides, hashJson: estimateDeterministicHash });
}
describe("S27.33 vibration equipment and labor disclosure", () => {
  it("preserves project labor/equipment and counts included compatible accessories once", async () => {
    const result = await compile(facts, { [ids.equipment]: { unitPrice: 10, provenance: { kind: "manual", reason: "DEMO equipment quote includes accessories" } } });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.find(r => r.row_id === "work:concrete:anchor-group-vibration")?.quantity).toBe("32");
    expect(result.rows.find(r => r.row_id === ids.equipment)).toMatchObject({ quantity: "9", amount: "90" });
    expect(result.rows.find(r => r.row_id === ids.includedKit)).toMatchObject({ quantity: "2", amount: null, included_in_estimate: false, included_in_procurement: false });
    expect(result.rows.some(r => r.row_id === ids.separateKit)).toBe(false);
    const addition = buildVibrationOperationCompletionS2733("vibration-operation-test");
    expect(addition.parameters.every(p => p.default_value == null)).toBe(true);
    expect(addition.runtimeInput).toEqual({});
  });
  it("orders separately supplied accessories only under the matching price terms", async () => {
    const result = await compile({ ...facts, vibration_equipment_accessories_pricing_mode: "SEPARATE_SUPPLY" });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.some(r => r.row_id === ids.includedKit)).toBe(false);
    expect(selectCanonicalArtifactRows(result.rows).procurementRows.some(r => r.row_id === ids.separateKit)).toBe(true);
    expect(result.rows.find(r => r.row_id === ids.separateKit)?.title_ru).toContain("1 flexible shaft");
  });
  it("blocks whole-kit shortage and rejects fractional kit supply", async () => {
    const separate = { ...facts, vibration_equipment_accessories_pricing_mode: "SEPARATE_SUPPLY" };
    const result = await compile(separate, { [ids.separateKit]: amendment("0") });
    expect(result.rows.find(r => r.row_id === ids.separateKit)?.calculation_trace)
      .toMatchObject({ purchaseBalance: { consumptionShortage: "2", procurementReady: false } });
    expect(() => buildCanonicalProcurementProjection({ revision: { id: "fixture", release_id: "fixture", catalog_id: "fixture", checksum_sha256: "fixture", row_count: result.rows.length }, ...selectCanonicalArtifactRows(result.rows) })).toThrow();
    await expect(compile(separate, { [ids.separateKit]: amendment("1.5") })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
  });
  it("keeps missing project BOM local while preserving known project equipment time", async () => {
    const result = await compile({ ...facts, vibration_equipment_accessories_specification: null });
    expect(result.preliminaryNeeds.find(r => r.row_id === ids.includedKit)?.missing_parameter_ids).toContain("vibration_equipment_accessories_specification");
    expect(result.rows.find(r => r.row_id === ids.equipment)?.quantity).toBe("9");
    const noAdditional = await compile({ ...facts, vibration_equipment_accessories_pricing_mode: "NOT_REQUIRED" });
    expect(noAdditional.preliminaryNeeds).toEqual([]);
    expect(noAdditional.rows.some(r => r.row_id === ids.includedKit || r.row_id === ids.separateKit)).toBe(false);
  });
  it("discloses actual pile-cap labor within the existing volume work price without duplicate payment", async () => {
    const result = await compile({ ...pileCapVibrationAcceptanceInputR1("high_load"), ...kitFacts, vibration_worker_h: 33 },
      { "work:concrete:pile-cap-vibration": { unitPrice: 20, provenance: { kind: "manual", reason: "DEMO composite work rate per m3" } } }, true);
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.find(r => r.row_id === "work:concrete:pile-cap-vibration")).toMatchObject({ quantity: "26", unit_id: "m3", amount: "520" });
    expect(result.rows.find(r => r.row_id === ids.pileCapLabor)).toMatchObject({ quantity: "33", unit_id: "man_hour", amount: null, included_in_estimate: false, included_in_procurement: false });
  });
  it("does not infer pile-cap labor productivity from concrete volume or machine time", async () => {
    const result = await compile({ ...pileCapVibrationAcceptanceInputR1("high_load"), ...kitFacts }, {}, true);
    expect(result.preliminaryNeeds.find(r => r.row_id === ids.pileCapLabor)?.missing_parameter_ids).toContain("vibration_worker_h");
    expect(result.rows.find(r => r.row_id === "work:concrete:pile-cap-vibration")?.quantity).toBe("26");
  });
});
