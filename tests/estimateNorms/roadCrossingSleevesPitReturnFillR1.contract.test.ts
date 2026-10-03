import { buildAutomaticConstructionOwnerR1 } from "../../src/lib/estimate/v4/automaticConstructionOwnerR1";
import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { ROAD_CROSSING_SLEEVES_CIVIL_METHODS_R1 as methods, ROAD_CROSSING_SLEEVES_CIVIL_PARAMETERS_R1 as civilParameters } from "../../src/lib/estimate/v4/roadCrossingSleevesCivilGeometryR1";
import { ROAD_CROSSING_SLEEVES_PIT_RETURN_PARAMETERS_R1 as parameters, ROAD_CROSSING_SLEEVES_PIT_RETURN_ROWS_R1 as rows,
  ROAD_CROSSING_SLEEVES_PIT_RETURN_SCOPE_R1 as scope } from "../../src/lib/estimate/v4/roadCrossingSleevesPitReturnFillR1";

const definition = buildAutomaticConstructionOwnerR1({
  contract: "rcs-pit-return-test", semanticOwner: "rcs-test", sourceId: "actual-pit-facts", normId: "net-geometric-space-not-material-norm",
  sourceMetadata: { source_title: "Synthetic actual occupied-pit facts, not approved project", source_document_version: "test-2026-10-03",
    definition_hash: "a".repeat(64), artifact_sha256: "a".repeat(64), exact_locator: "https://www.pipejacking.org/about_pipe_jacking" },
  applicabilityRu: "Оставшееся геометрическое место выбранных прямоугольных котлованов, не полная работа",
  ordinary: civilParameters.filter(p => p.kind === "ordinary"), profile: [],
  conditional: [...civilParameters.filter(p => p.id.startsWith("rcs_jacking_") && p.id.includes("excavation_") && p.unitId === "m"), ...parameters],
  rows, excludedUnownedAssumptions: [scope.excluded],
});
// Confirmed synthetic facts ONLY. Zero is never a runtime default.
const fixture: Record<string, unknown> = {
  rcs_civil_installation_method: methods.pipeJacking,
  rcs_jacking_thrust_excavation_length_m: 6, rcs_jacking_thrust_excavation_width_m: 4, rcs_jacking_thrust_excavation_depth_m: 3,
  rcs_jacking_reception_excavation_length_m: 4, rcs_jacking_reception_excavation_width_m: 3, rcs_jacking_reception_excavation_depth_m: 2.5,
  rcs_jacking_thrust_permanent_occupied_volume_m3: 12, rcs_jacking_reception_permanent_occupied_volume_m3: 7,
};
const id = (key: string) => `rcs:pit-return:${key}`;
const provenance = { kind: "manual", reason: "owned explicit geometry exception" };
const overrides = Object.fromEntries(rows.map(row => [row.rowId, { quantity: "999", unitPrice: "10", provenance }]));
function compile(submittedParameters: Record<string, unknown> = fixture, rowOverrides?: Record<string, Record<string, unknown>>) {
  return compileCanonicalEstimateCore({ operation: rowOverrides ? "recalculate" : "compile", compilerVersion: "rcs-pit-test",
    catalogId: "canonical-work:expanded:road_crossing_sleeves", primaryMeasureParameterId: "rcs_jacking_thrust_excavation_length_m",
    parameterDefinitions: [...definition.parameters], formulaDefinitions: [...definition.formulas], resourceDefinitions: [...definition.resources],
    submittedParameters, confirmedParameters: {}, priceItems: [], currencyCode: "KGS", maximumResourceRows: definition.resources.length,
    rowOverrides, hashJson: value => estimateDeterministicHash(value),
  });
}
const q = (result: Awaited<ReturnType<typeof compile>>, key: string) => Number(result.rows.find(row => row.row_id === id(key))?.quantity);

describe("source-bounded net rectangular pit space, not soil/resource approval", () => {
  it("asks only for two unknown occupied volumes, not calculated net-space parameters", async () => {
    expect(parameters.map(p => p.id)).toEqual([
      "rcs_jacking_thrust_permanent_occupied_volume_m3", "rcs_jacking_reception_permanent_occupied_volume_m3",
    ]);
    expect(definition.runtimeInput).toEqual({});
    const result = await compile();
    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(q(result, "thrust_remaining_space_m3")).toBe(60);
    expect(q(result, "reception_remaining_space_m3")).toBe(23);
    expect(q(result, "total_remaining_space_m3")).toBe(83);
  });
  it("does not add bore excavation to pit return space or infer geometry from crossing length", async () => {
    expect(definition.parameters.some(p => p.parameter_id === "rcs_crossing_length_m" || p.parameter_id === "rcs_jacking_confirmed_excavation_diameter_mm")).toBe(false);
    expect(rows.every(row => !/rcs_crossing_length_m|rcs_jacking_confirmed_excavation_diameter_mm/u.test(row.expression))).toBe(true);
    const result = await compile();
    expect(q(result, "total_remaining_space_m3")).toBe(83);
  });
  it("accepts confirmed zero occupied volume and zero remaining space without hidden minima or clamping", async () => {
    const empty = await compile({ ...fixture, rcs_jacking_thrust_permanent_occupied_volume_m3: 0, rcs_jacking_reception_permanent_occupied_volume_m3: 0 });
    expect(q(empty, "total_remaining_space_m3")).toBe(102);
    const full = await compile({ ...fixture, rcs_jacking_thrust_permanent_occupied_volume_m3: 72, rcs_jacking_reception_permanent_occupied_volume_m3: 30 });
    expect(q(full, "total_remaining_space_m3")).toBe(0);
    expect(full.preliminaryNeeds).toHaveLength(0);
  });
  it.each(["rcs_jacking_thrust_permanent_occupied_volume_m3", "rcs_jacking_reception_permanent_occupied_volume_m3",
    "rcs_jacking_thrust_excavation_depth_m", "rcs_jacking_reception_excavation_width_m"])("keeps missing original %s explicit even with manual net quantities", async missing => {
    const input = { ...fixture }; delete input[missing];
    const result = await compile(input, overrides);
    expect(result.preliminaryNeeds).toHaveLength(2);
    expect(result.preliminaryNeeds.every(need => need.missing_parameter_ids.includes(missing))).toBe(true);
    expect(result.rows.some(row => row.row_id === id("total_remaining_space_m3"))).toBe(false);
  });
  it.each(["rcs_jacking_thrust_permanent_occupied_volume_m3", "rcs_jacking_reception_permanent_occupied_volume_m3"])("rejects impossible %s before manual quantities can conceal it", async parameterId => {
    await expect(compile({ ...fixture, [parameterId]: 73 }, overrides)).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
  });
  it("does not offset an invalid reception pit against spare thrust space", async () => {
    await expect(compile({ ...fixture, rcs_jacking_thrust_permanent_occupied_volume_m3: 0, rcs_jacking_reception_permanent_occupied_volume_m3: 31 }))
      .rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
  });
  it("requires the actual selected method, never a manual quantity as its replacement", async () => {
    const input = { ...fixture }; delete input.rcs_civil_installation_method;
    const result = await compile(input, overrides);
    expect(result.rows).toHaveLength(0);
    expect(result.preliminaryNeeds).toHaveLength(3);
    expect(result.preliminaryNeeds.every(need => need.need_state === "CONDITION_REQUIRED" && need.missing_parameter_ids.includes("rcs_civil_installation_method"))).toBe(true);
  });
  it("excludes questions/rows/cost for open cut while retaining valid inactive jacking facts", async () => {
    const result = await compile({ ...fixture, rcs_civil_installation_method: methods.openCut, rcs_jacking_thrust_permanent_occupied_volume_m3: 999 }, overrides);
    expect(result.rows).toHaveLength(0);
    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(result.parameters.rcs_jacking_thrust_permanent_occupied_volume_m3).toBe(999);
  });
  it("never pays informational space or uses it as procurement even with supplied prices", async () => {
    const result = await compile(fixture, overrides);
    expect(result.rows.every(row => !row.included_in_estimate && !row.included_in_procurement)).toBe(true);
    expect(scope).toMatchObject({ fullOwner: false, engineeringAccepted: false });
  });
  it("keeps a visible net-quantity exception across changed pit facts; reset follows current geometry", async () => {
    const pin = { [id("total_remaining_space_m3")]: { quantity: "88", provenance } };
    const changed = { ...fixture, rcs_jacking_thrust_excavation_width_m: 5 };
    expect(q(await compile(fixture, pin), "total_remaining_space_m3")).toBe(88);
    expect(q(await compile(changed, pin), "total_remaining_space_m3")).toBe(88);
    const reset = await compile(changed);
    expect(q(reset, "thrust_remaining_space_m3")).toBe(78);
    expect(q(reset, "total_remaining_space_m3")).toBe(101);
  });
});
