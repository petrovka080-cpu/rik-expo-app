import { buildAutomaticConstructionOwnerR1 } from "../../src/lib/estimate/v4/automaticConstructionOwnerR1";
import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { ROAD_CROSSING_SLEEVES_CIVIL_METHODS_R1 as methods, ROAD_CROSSING_SLEEVES_CIVIL_PARAMETERS_R1 as civilParameters } from "../../src/lib/estimate/v4/roadCrossingSleevesCivilGeometryR1";
import { ROAD_CROSSING_SLEEVES_PIT_RETURN_PARAMETERS_R1 as pitParameters, ROAD_CROSSING_SLEEVES_PIT_RETURN_ROWS_R1 as pitRows } from "../../src/lib/estimate/v4/roadCrossingSleevesPitReturnFillR1";
import { ROAD_CROSSING_SLEEVES_PIT_FILL_PARAMETERS_R1 as parameters, ROAD_CROSSING_SLEEVES_PIT_FILL_ROWS_R1 as rows,
  ROAD_CROSSING_SLEEVES_PIT_FILL_MODES_R1 as modes, ROAD_CROSSING_SLEEVES_PIT_FILL_SCOPE_R1 as scope } from "../../src/lib/estimate/v4/roadCrossingSleevesPitFillMaterialR1";

const definition = buildAutomaticConstructionOwnerR1({
  contract: "rcs-pit-fill-material-test", semanticOwner: "rcs-test", sourceId: "actual-approved-pit-material-and-volume-facts", normId: "no-universal-reuse-or-compaction-norm",
  sourceMetadata: { source_title: "Synthetic pit material arithmetic, not approved project", source_document_version: "test-2026-10-03",
    definition_hash: "a".repeat(64), artifact_sha256: "a".repeat(64), exact_locator: "https://highways.dot.gov/federal-lands/pddm/dpg/earthwork-design" },
  applicabilityRu: "Один подтверждённый зернистый материал для прямоугольных котлованов; не полная работа",
  ordinary: civilParameters.filter(p => p.kind === "ordinary"), profile: [],
  conditional: [...civilParameters.filter(p => p.id.startsWith("rcs_jacking_") && p.unitId === "m"), ...pitParameters, ...parameters],
  rows: [...pitRows, ...rows], excludedUnownedAssumptions: [scope.excluded],
});
// Synthetic actual facts ONLY, no runtime product, conversion or reuse defaults.
const fixture: Record<string, unknown> = {
  rcs_civil_installation_method: methods.pipeJacking,
  rcs_jacking_thrust_excavation_length_m: 6, rcs_jacking_thrust_excavation_width_m: 4, rcs_jacking_thrust_excavation_depth_m: 3,
  rcs_jacking_reception_excavation_length_m: 4, rcs_jacking_reception_excavation_width_m: 3, rcs_jacking_reception_excavation_depth_m: 2.5,
  rcs_jacking_thrust_permanent_occupied_volume_m3: 12, rcs_jacking_reception_permanent_occupied_volume_m3: 7,
  rcs_pit_fill_material_mode: modes.sameGranular, rcs_pit_fill_granular_product_designation: "TEST-OWNED selected compatible granular fill",
  rcs_pit_fill_approved_reused_finished_m3: 20, rcs_pit_fill_gross_supplied_volume_ratio: 1.2,
  rcs_pit_fill_compatible_loose_stock_m3: 10, rcs_pit_fill_retained_loose_reserve_m3: 2, rcs_pit_fill_supplier_loose_multiple_m3: 5,
};
const id = (key: string) => `rcs:pit-fill:${key}`;
const order = id("ordered_loose_m3");
const provenance = { kind: "manual", reason: "owned pit material purchase exception" };
const overrides = Object.fromEntries([...pitRows, ...rows].map(row => [row.rowId, { quantity: "999", unitPrice: "10", provenance }]));
function compile(submittedParameters: Record<string, unknown> = fixture, rowOverrides?: Record<string, Record<string, unknown>>) {
  return compileCanonicalEstimateCore({ operation: rowOverrides ? "recalculate" : "compile", compilerVersion: "rcs-pit-fill-test",
    catalogId: "canonical-work:expanded:road_crossing_sleeves", primaryMeasureParameterId: "rcs_jacking_thrust_excavation_length_m",
    parameterDefinitions: [...definition.parameters], formulaDefinitions: [...definition.formulas], resourceDefinitions: [...definition.resources],
    submittedParameters, confirmedParameters: {}, priceItems: [], currencyCode: "KGS", maximumResourceRows: definition.resources.length,
    rowOverrides, hashJson: value => estimateDeterministicHash(value),
  });
}
const q = (result: Awaited<ReturnType<typeof compile>>, key: string) => Number(result.rows.find(row => row.row_id === id(key))?.quantity);

describe("selected pit fill with disjoint finished/reused/loose supply states", () => {
  it("derives additional finished volume and all supplied-volume balances instead of asking for them", async () => {
    const result = await compile();
    expect(result.preliminaryNeeds).toHaveLength(0);
    for (const [key, value] of Object.entries({ approved_reused_finished_m3: 20, additional_finished_fill_m3: 63,
      consumed_loose_m3: 75.6, retained_loose_reserve_m3: 2, compatible_loose_stock_m3: 10,
      total_loose_need_m3: 77.6, new_loose_need_m3: 67.6, supplier_multiple_count: 14,
      ordered_loose_m3: 70, remaining_loose_m3: 4.4, free_loose_m3_beyond_reserve: 2.4 })) expect(q(result, key)).toBeCloseTo(value, 6);
    expect(definition.runtimeInput).toEqual({});
    expect(parameters.every(p => p.defaultValue == null)).toBe(true);
    expect(parameters.some(p => /ordered|consumed|additional_finished|supplier_multiple_count|remaining/u.test(p.id))).toBe(false);
  });
  it("does not equate excavation to reusable finished material, or charge allocated reuse and consumption as purchases", async () => {
    const result = await compile();
    expect(result.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual([order]);
    expect(result.rows.filter(row => row.included_in_procurement).map(row => row.row_id)).toEqual([order]);
    expect(result.rows.find(row => row.row_id === order)).toMatchObject({ unit_id: "m3", unit_price: null });
    expect(result.rows.find(row => row.row_id === order)?.title_ru).toContain(fixture.rcs_pit_fill_granular_product_designation);
    expect((await compile(fixture, { [order]: { unitPrice: "4", provenance } })).totals.amount).toBe("280");
  });
  it.each(["rcs_pit_fill_approved_reused_finished_m3", "rcs_pit_fill_gross_supplied_volume_ratio", "rcs_pit_fill_compatible_loose_stock_m3",
    "rcs_pit_fill_retained_loose_reserve_m3", "rcs_pit_fill_supplier_loose_multiple_m3", "rcs_pit_fill_granular_product_designation",
    "rcs_jacking_thrust_permanent_occupied_volume_m3", "rcs_jacking_reception_excavation_depth_m"])("a manual order cannot replace unknown original %s", async missing => {
    const input = { ...fixture }; delete input[missing];
    const result = await compile(input, overrides);
    expect(result.rows.some(row => row.row_id === order)).toBe(false);
    expect(result.preliminaryNeeds.find(need => need.row_id === order)?.missing_parameter_ids).toContain(missing);
  });
  it.each(["rcs_civil_installation_method", "rcs_pit_fill_material_mode"])("unknown applicability %s remains a question, not a zero/default", async missing => {
    const input = { ...fixture }; delete input[missing];
    const result = await compile(input, overrides);
    expect(result.rows.some(row => row.row_id.startsWith("rcs:pit-fill:"))).toBe(false);
    const materialNeeds = result.preliminaryNeeds.filter(need => need.row_id.startsWith("rcs:pit-fill:"));
    expect(materialNeeds).toHaveLength(rows.length);
    expect(materialNeeds.every(need => need.missing_parameter_ids.includes(missing))).toBe(true);
  });
  it.each([{ rcs_civil_installation_method: methods.openCut }, { rcs_pit_fill_material_mode: modes.other }])("excludes this material's questions/payment in a known different branch: %j", async patch => {
    const input: Record<string, unknown> = { ...fixture, ...patch }; for (const parameter of parameters.slice(1)) delete input[parameter.id];
    const result = await compile(input, overrides);
    expect(result.rows.some(row => row.row_id.startsWith("rcs:pit-fill:"))).toBe(false);
    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(result.totals.amount).toBe("0");
  });
  it("rejects impossible reuse and individual pit occupation before any manual quantities can hide them", async () => {
    for (const patch of [{ rcs_pit_fill_approved_reused_finished_m3: 84 },
      { rcs_jacking_reception_permanent_occupied_volume_m3: 31 }]) {
      await expect(compile({ ...fixture, ...patch }, overrides)).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
    }
  });
  it("keeps known material consumption visible when only the selected product is unknown", async () => {
    const input = { ...fixture }; delete input.rcs_pit_fill_granular_product_designation;
    const result = await compile(input, { [order]: { quantity: "999", provenance } });
    expect(q(result, "consumed_loose_m3")).toBeCloseTo(75.6, 6);
    expect(result.preliminaryNeeds).toHaveLength(1);
    expect(result.preliminaryNeeds[0]).toMatchObject({ row_id: order, missing_parameter_ids: ["rcs_pit_fill_granular_product_designation"] });
  });
  it("informational pit-space exceptions do not rewrite original geometry or supply material quantities", async () => {
    const result = await compile(fixture, { "rcs:pit-return:total_remaining_space_m3": { quantity: "999", provenance } });
    expect(q(result, "additional_finished_fill_m3")).toBe(63);
    expect(q(result, "ordered_loose_m3")).toBe(70);
    expect(result.parameters.rcs_jacking_thrust_permanent_occupied_volume_m3).toBe(12);
  });
  it("permits confirmed no reuse, full reuse and zero remaining geometry without inventing a positive demand", async () => {
    expect(q(await compile({ ...fixture, rcs_pit_fill_approved_reused_finished_m3: 0 }), "additional_finished_fill_m3")).toBe(83);
    const full = await compile({ ...fixture, rcs_pit_fill_approved_reused_finished_m3: 83 });
    expect(q(full, "consumed_loose_m3")).toBe(0); expect(q(full, "ordered_loose_m3")).toBe(0);
    const empty = await compile({ ...fixture, rcs_jacking_thrust_permanent_occupied_volume_m3: 72,
      rcs_jacking_reception_permanent_occupied_volume_m3: 30, rcs_pit_fill_approved_reused_finished_m3: 0,
      rcs_pit_fill_compatible_loose_stock_m3: 0, rcs_pit_fill_retained_loose_reserve_m3: 0 });
    expect(q(empty, "additional_finished_fill_m3")).toBe(0); expect(q(empty, "ordered_loose_m3")).toBe(0);
  });
  it("supply multiples and loose stock change the purchase/surplus, not finished demand or approved reuse", async () => {
    const stock = await compile({ ...fixture, rcs_pit_fill_compatible_loose_stock_m3: 100 });
    expect(q(stock, "ordered_loose_m3")).toBe(0); expect(q(stock, "remaining_loose_m3")).toBeCloseTo(24.4, 6);
    const supply = await compile({ ...fixture, rcs_pit_fill_supplier_loose_multiple_m3: 40 });
    expect(q(supply, "ordered_loose_m3")).toBe(80); expect(q(supply, "approved_reused_finished_m3")).toBe(20);
    expect(q(supply, "additional_finished_fill_m3")).toBe(63); expect(q(supply, "consumed_loose_m3")).toBeCloseTo(75.6, 6);
  });
  it("pins a visible purchase exception and resets to the current geometry without rewriting reuse or original pit facts", async () => {
    const pin = { [order]: { quantity: "80", provenance } };
    const changed = { ...fixture, rcs_jacking_thrust_excavation_width_m: 5 };
    expect(q(await compile(fixture, pin), "ordered_loose_m3")).toBe(80);
    const result = await compile(changed, pin);
    expect(q(result, "ordered_loose_m3")).toBe(80); expect(q(result, "additional_finished_fill_m3")).toBe(81);
    expect(result.parameters.rcs_pit_fill_approved_reused_finished_m3).toBe(20);
    expect(q(await compile(changed), "ordered_loose_m3")).toBe(90);
    expect(scope.purchaseOverride).toContain("must be reconciled");
  });
  it("does not install a universal >=1 conversion factor or a second process-loss factor", async () => {
    const result = await compile({ ...fixture, rcs_pit_fill_gross_supplied_volume_ratio: 0.8 });
    expect(q(result, "consumed_loose_m3")).toBeCloseTo(50.4, 6);
    expect(q(result, "ordered_loose_m3")).toBe(45);
    expect(scope).toMatchObject({ fullOwner: false, engineeringAccepted: false });
    expect(rows.some(row => /haul|trip|mass|crew|equipment/u.test(row.rowId))).toBe(false);
  });
  it.each([{ rcs_pit_fill_approved_reused_finished_m3: -1 }, { rcs_pit_fill_gross_supplied_volume_ratio: 0 },
    { rcs_pit_fill_compatible_loose_stock_m3: -1 }, { rcs_pit_fill_retained_loose_reserve_m3: -1 },
    { rcs_pit_fill_supplier_loose_multiple_m3: 0 }])("rejects invalid actual values instead of clamping: %j", async patch => {
    await expect(compile({ ...fixture, ...patch })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
});
