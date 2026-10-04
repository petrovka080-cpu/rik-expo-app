import { buildRebarCageOperationCompletionS2733, REBAR_CAGE_COMPLETION_ROWS as ids } from "../../src/lib/estimate/v4/rebarCageOperationCompletionS2733";
import { MONOLITHIC_REBAR_CAGE_PARAMETERS, MONOLITHIC_REBAR_CAGE_RESOURCES, MONOLITHIC_REBAR_CAGE_FORMULAS, MONOLITHIC_REBAR_CAGE_ACCEPTANCE_INPUT, MONOLITHIC_REBAR_CAGE_SHORT_INPUT } from "../../src/lib/estimate/v4/monolithicRebarCageR1";
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";

const addition = buildRebarCageOperationCompletionS2733("rebar-cage-completion-test");
const noWeld = { ...MONOLITHIC_REBAR_CAGE_ACCEPTANCE_INPUT, cage_assembly_worker_h: 100 };
const welded = { ...noWeld, welding_electrode_mode: "REQUIRED", welding_electrode_designation: "DEMO approved compatible electrode", welding_electrode_mass_kg: 3,
  cage_welding_pricing_mode: "INCLUDED_IN_CAGE_RATE", cage_welding_procedure_reference: "DEMO approved WPS-AG-REV-B",
  cage_welding_worker_h: 5, cage_welding_machine_specification: "DEMO complete compatible welding post",
  cage_welding_machine_h: 3, cage_welding_machine_complete_bom: "DEMO per supplied post: 1 power unit, 2 rated leads, 1 electrode holder, 1 return clamp, 1 helmet, 1 pair of gloves; included in post rate" };
function compile(parameters: Record<string, unknown>, rowOverrides: CanonicalEstimateCompileCoreInput["rowOverrides"] = {}) {
  return compileCanonicalEstimateCore({ operation: "recalculate", compilerVersion: "s2733-rebar-cage-completion-test", catalogId: "rebar-cage-completion-test", primaryMeasureParameterId: null,
    parameterDefinitions: [...MONOLITHIC_REBAR_CAGE_PARAMETERS, ...addition.parameters.filter(p => !MONOLITHIC_REBAR_CAGE_PARAMETERS.some(old => old.parameter_id === p.parameter_id))],
    formulaDefinitions: [...MONOLITHIC_REBAR_CAGE_FORMULAS, ...addition.formulas],
    resourceDefinitions: [...MONOLITHIC_REBAR_CAGE_RESOURCES.map(r => r.row_id === "material:rebar-cage:welding-electrodes"
      ? { ...r, resource_graph: { ...r.resource_graph, inputParameterIds: ["cage_welding_procedure_reference"] } } : r), ...addition.resources],
    submittedParameters: parameters, confirmedParameters: {}, currencyCode: "KGS", maximumResourceRows: 14, rowOverrides, hashJson: estimateDeterministicHash });
}
const rate = (unitPrice: number) => ({ unitPrice, provenance: { kind: "manual", reason: "DEMO explicitly selected quote boundary" } });
describe("S27.33 residual rebar cage labor and welding resources", () => {
  it("discloses actual assembly labor inside the existing kilogram work without duplicate cost", async () => {
    const result = await compile(noWeld, { [ids.work]: rate(2) });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.find(r => r.row_id === ids.work)).toMatchObject({ quantity: "1500", unit_id: "kg", amount: "3000" });
    expect(result.rows.find(r => r.row_id === ids.assemblyLabor)).toMatchObject({ quantity: "100", amount: null, included_in_estimate: false, included_in_procurement: false });
    expect(result.rows.some(r => r.row_id.includes("welding-"))).toBe(false);
    expect(addition.parameters.every(p => p.default_value == null)).toBe(true);
    expect(addition.runtimeInput).toEqual({});
  });
  it("keeps missing labor and BBS facts local rather than deriving productivity from bar mass", async () => {
    const result = await compile(MONOLITHIC_REBAR_CAGE_ACCEPTANCE_INPUT);
    expect(result.preliminaryNeeds.find(r => r.row_id === ids.assemblyLabor)?.missing_parameter_ids).toContain("cage_assembly_worker_h");
    expect(result.rows.find(r => r.row_id === ids.work)?.quantity).toBe("1500");
    const short = await compile(MONOLITHIC_REBAR_CAGE_SHORT_INPUT);
    expect(short.preliminaryNeeds.find(r => r.row_id === ids.work)?.missing_parameter_ids).toContain("rebar_d12_mass_kg");
  });
  it("includes selected welding labor and complete machine once under the kilogram work rate", async () => {
    const result = await compile(welded, { [ids.work]: rate(2) });
    expect(result.preliminaryNeeds).toEqual([]);
    for (const [rowId, quantity] of [[ids.includedWeldingLabor, "5"], [ids.includedWeldingMachine, "3"]])
      expect(result.rows.find(r => r.row_id === rowId)).toMatchObject({ quantity, included_in_estimate: false, included_in_procurement: false, amount: null });
    expect(result.rows.some(r => r.row_id === ids.separateWeldingLabor || r.row_id === ids.separateWeldingMachine)).toBe(false);
    expect(result.rows.find(r => r.row_id === ids.includedWeldingMachine)?.title_ru).toContain("1 power unit");
    expect(result.totals.amount).toBe("3000");
  });
  it("allows explicit separate labor and machine rates while preserving all original takeoff", async () => {
    const result = await compile({ ...welded, cage_welding_pricing_mode: "SEPARATE_LABOR_AND_MACHINE_RATES" },
      { [ids.work]: rate(2), [ids.separateWeldingLabor]: rate(10), [ids.separateWeldingMachine]: rate(20) });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.find(r => r.row_id === ids.separateWeldingLabor)).toMatchObject({ amount: "50", included_in_estimate: true });
    expect(result.rows.find(r => r.row_id === ids.separateWeldingMachine)).toMatchObject({ amount: "60", included_in_estimate: true, included_in_procurement: true });
    expect(result.rows.find(r => r.row_id === ids.work)?.quantity).toBe("1500");
    expect(result.rows.find(r => r.row_id === "equipment:rebar-cage:cutting-bending-machine")?.quantity).toBe("12");
    expect(result.totals.amount).toBe("3110");
  });
  it("does not certify welding or its electrodes without the approved procedure and complete post BOM", async () => {
    const result = await compile({ ...welded, cage_welding_procedure_reference: null, cage_welding_machine_complete_bom: null });
    expect(result.preliminaryNeeds.find(r => r.row_id === "material:rebar-cage:welding-electrodes")?.missing_parameter_ids).toContain("cage_welding_procedure_reference");
    expect(result.preliminaryNeeds.find(r => r.row_id === ids.includedWeldingMachine)?.missing_parameter_ids).toContain("cage_welding_machine_complete_bom");
    expect(result.rows.find(r => r.row_id === ids.work)?.quantity).toBe("1500");
  });
  it("rejects supplied welding details when project welding is explicitly not required", async () => {
    await expect(compile({ ...welded, welding_electrode_mode: "NOT_REQUIRED", welding_electrode_designation: null, welding_electrode_mass_kg: null }))
      .rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
});
