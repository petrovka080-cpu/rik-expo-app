import { buildConstructionJointCompletionS2733, CONSTRUCTION_JOINT_COMPLETION_ROWS as ids } from "../../src/lib/estimate/v4/constructionJointCompletionS2733";
import { STRIP_FOUNDATION_CONCRETE_PLACEMENT_PARAMETERS, STRIP_FOUNDATION_CONCRETE_PLACEMENT_FORMULAS, STRIP_FOUNDATION_CONCRETE_PLACEMENT_RESOURCES, stripFoundationConcretePlacementAcceptanceInputR1 } from "../../src/lib/estimate/v4/stripFoundationConcretePlacementR1";
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { assertCanonicalPurchaseReadinessV1 } from "../../src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1";
const addition = buildConstructionJointCompletionS2733("test-project", "construction_joint_mode", { source_title: "Actual project schedule", source_document_version: "r1", definition_hash: "a".repeat(64), artifact_sha256: "a".repeat(64), exact_locator: "counted project BOM and direct hours" });
const parameters = [...STRIP_FOUNDATION_CONCRETE_PLACEMENT_PARAMETERS, ...addition.parameters.filter(p => !STRIP_FOUNDATION_CONCRETE_PLACEMENT_PARAMETERS.some(old => old.parameter_id === p.parameter_id))];
const resources = [...STRIP_FOUNDATION_CONCRETE_PLACEMENT_RESOURCES, ...addition.resources];
const facts = { ...stripFoundationConcretePlacementAcceptanceInputR1("high_load"), construction_joint_mode: "WATERSTOP", construction_joint_waterstop_specification: "DEMO compatible project waterstop", construction_joint_waterstop_length_m: 23,
  construction_joint_installation_worker_h: 7, construction_joint_accessories_pricing_mode: "SEPARATE_SUPPLY", construction_joint_accessories_specification: "DEMO per full set: 8 compatible clips, 2 approved joint components and 4 cleaning wipes", construction_joint_accessories_set_count: 2,
  construction_joint_equipment_pricing_mode: "SEPARATE_EQUIPMENT_RATE", construction_joint_equipment_specification: "DEMO project approved installation tool with operator scope stated separately", construction_joint_equipment_machine_h: 1.5,
  construction_joint_method_statement_reference: "DEMO installation and connections schedule", construction_joint_quality_program_reference: "DEMO joint control included in existing acceptance programme",
  construction_joint_supply_delivery_mode: "SEPARATE_CONFIRMED_TRIPS", construction_joint_supply_delivery_reference: "DEMO separate shipment of waterstop and complete kits with driver", construction_joint_supply_delivery_trip_count: 2 };
const manual = (quantity: string) => ({ quantity, provenance: { kind: "manual", reason: "DEMO actual order" } });
const compile = (submittedParameters: Record<string, unknown>, rowOverrides: CanonicalEstimateCompileCoreInput["rowOverrides"] = {}) => compileCanonicalEstimateCore({
  operation: "recalculate", compilerVersion: "construction-joint-completion-test", catalogId: "test-project", parameterDefinitions: parameters as CanonicalEstimateCompileCoreInput["parameterDefinitions"],
  formulaDefinitions: [...STRIP_FOUNDATION_CONCRETE_PLACEMENT_FORMULAS, ...addition.formulas], resourceDefinitions: resources,
  submittedParameters, confirmedParameters: {}, rowOverrides, currencyCode: "KGS", maximumResourceRows: resources.length, hashJson: estimateDeterministicHash });
describe("counted project construction joint operation resources", () => {
  it("reveals full kit, installation labor, actual tool hours and separate shipment without a productivity coefficient", async () => {
    const result = await compile(facts);expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.find(r => r.row_id === ids.separateKit)?.quantity).toBe("2");expect(result.rows.find(r => r.row_id === ids.separateEquipment)?.quantity).toBe("1.5");
    expect(result.rows.find(r => r.row_id === ids.delivery)?.quantity).toBe("2");expect(result.rows.find(r => r.row_id === "work:concrete:construction-joint-waterstop-install")?.quantity).toBe("7");
    expect(result.rows.some(r => r.row_id === ids.includedKit || r.row_id === ids.includedEquipment)).toBe(false);
  });
  it("keeps included material kit and tools visible without paying them twice", async () => {
    const result = await compile({ ...facts, construction_joint_accessories_pricing_mode: "INCLUDED_IN_WATERSTOP_RATE", construction_joint_equipment_pricing_mode: "INCLUDED_IN_INSTALLATION_LABOR_RATE" });
    for (const id of [ids.includedKit, ids.includedEquipment])expect(result.rows.find(r => r.row_id === id)).toMatchObject({ included_in_estimate: false, included_in_procurement: false, amount: null });
    expect(result.rows.some(r => r.row_id === ids.separateKit || r.row_id === ids.separateEquipment)).toBe(false);
  });
  it("blocks a zero kit order, rejects fractions and retains the actual count need under a manual included quantity", async () => {
    const zero = await compile(facts, { [ids.separateKit]: manual("0") });expect(() => assertCanonicalPurchaseReadinessV1(zero.rows)).toThrow();
    await expect(compile(facts, { [ids.separateKit]: manual("1.5") })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
    const unknown = await compile({ ...facts, construction_joint_accessories_pricing_mode: "INCLUDED_IN_WATERSTOP_RATE", construction_joint_accessories_set_count: null }, { [ids.includedKit]: manual("2") });
    expect(unknown.preliminaryNeeds.find(n => n.row_id === ids.includedKit)?.missing_parameter_ids).toContain("construction_joint_accessories_set_count");
  });
  it("accepts an actual integer greater order and rejects underreported shipment", async () => {
    const result = await compile(facts, { [ids.separateKit]: manual("3") });expect(result.rows.find(r => r.row_id === ids.separateKit)?.calculation_trace).toMatchObject({ purchaseBalance: { consumed: "2", remaining: "1", procurementReady: true } });
    await expect(compile(facts, { [ids.delivery]: manual("1") })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
  });
  it("does not invent a kit or equipment after an explicit project scope with no construction joint", async () => {
    const result = await compile({ ...stripFoundationConcretePlacementAcceptanceInputR1("high_load"), construction_joint_mode: "NONE" });expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.some(r => Object.values(ids).includes(r.row_id as typeof ids[keyof typeof ids]))).toBe(false);
    expect(addition.parameters.every(p => p.default_value == null)).toBe(true);
  });
});
