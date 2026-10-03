import { buildAutomaticConstructionOwnerR1 } from "../../src/lib/estimate/v4/automaticConstructionOwnerR1";
import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { ROAD_CROSSING_SLEEVES_QUANTITY_PARAMETERS_R1 as quantity } from "../../src/lib/estimate/v4/roadCrossingSleevesQuantityModelR1";
import { ROAD_CROSSING_SLEEVES_CIVIL_METHODS_R1 as methods, ROAD_CROSSING_SLEEVES_CIVIL_PARAMETERS_R1 as civil,
  ROAD_CROSSING_SLEEVES_CIVIL_ROWS_R1 as civilRows } from "../../src/lib/estimate/v4/roadCrossingSleevesCivilGeometryR1";
import { ROAD_CROSSING_SLEEVES_PIT_RETURN_PARAMETERS_R1 as pitSpace, ROAD_CROSSING_SLEEVES_PIT_RETURN_ROWS_R1 as pitSpaceRows } from "../../src/lib/estimate/v4/roadCrossingSleevesPitReturnFillR1";
import { ROAD_CROSSING_SLEEVES_TRENCH_FILL_PARAMETERS_R1 as parameters, ROAD_CROSSING_SLEEVES_TRENCH_FILL_ROWS_R1 as rows,
  ROAD_CROSSING_SLEEVES_TRENCH_FILL_MODES_R1 as modes, ROAD_CROSSING_SLEEVES_TRENCH_FILL_SCOPE_R1 as scope,
  ROAD_CROSSING_SLEEVES_PIT_FILL_PARAMETERS_R1 as pitParameters, ROAD_CROSSING_SLEEVES_PIT_FILL_ROWS_R1 as pitRows,
  ROAD_CROSSING_SLEEVES_PIT_FILL_MODES_R1 as pitModes } from "../../src/lib/estimate/v4/roadCrossingSleevesPitFillMaterialR1";

const definition = buildAutomaticConstructionOwnerR1({
  contract: "rcs-trench-fill-material-test", semanticOwner: "rcs-test", sourceId: "actual-confirmed-backfill-facts", normId: "no-universal-reuse-compaction-rate",
  sourceMetadata: { source_title: "Synthetic backfill arithmetic; not approved project", source_document_version: "test-2026-10-03",
    definition_hash: "a".repeat(64), artifact_sha256: "a".repeat(64), exact_locator: "data/estimate-benchmarks/source-packs/road-crossing-sleeves-automatic-s27-28.json" },
  applicabilityRu: "Выбранный единый зернистый материал засыпки траншеи или котлованов; не полная работа",
  ordinary: [...quantity.slice(0, 4), ...civil.filter(p => p.kind === "ordinary")], profile: [],
  conditional: [...civil.filter(p => p.kind === "conditional"), ...pitSpace, ...pitParameters, ...parameters],
  rows: [...civilRows, ...pitSpaceRows, ...pitRows, ...rows], excludedUnownedAssumptions: [scope.excluded],
});
// Synthetic explicitly submitted facts only; no product/reuse/ratio defaults.
const fixture: Record<string, unknown> = {
  rcs_crossing_length_m: 35, rcs_casing_outside_diameter_mm: 530, rcs_casing_inside_diameter_mm: 510, rcs_carrier_outside_diameter_mm: 160,
  rcs_civil_installation_method: methods.openCut, rcs_open_cut_excavation_width_m: 1.5,
  rcs_open_cut_excavation_depth_m: 2, rcs_open_cut_full_width_bedding_thickness_m: 0.1,
  rcs_trench_fill_material_mode: modes.sameGranular, rcs_trench_fill_granular_product_designation: "TEST selected compatible trench fill",
  rcs_trench_fill_other_permanent_occupied_volume_m3: 2, rcs_trench_fill_approved_reused_finished_m3: 20,
  rcs_trench_fill_gross_supplied_volume_ratio: 1.2, rcs_trench_fill_compatible_loose_stock_m3: 10,
  rcs_trench_fill_retained_loose_reserve_m3: 2, rcs_trench_fill_supplier_loose_multiple_m3: 5,
  rcs_jacking_thrust_excavation_length_m: 6, rcs_jacking_thrust_excavation_width_m: 4, rcs_jacking_thrust_excavation_depth_m: 3,
  rcs_jacking_reception_excavation_length_m: 4, rcs_jacking_reception_excavation_width_m: 3, rcs_jacking_reception_excavation_depth_m: 2.5,
  rcs_jacking_confirmed_excavation_diameter_mm: 580,
  rcs_jacking_thrust_permanent_occupied_volume_m3: 12, rcs_jacking_reception_permanent_occupied_volume_m3: 7,
  rcs_pit_fill_material_mode: pitModes.sameGranular, rcs_pit_fill_granular_product_designation: "TEST selected pit material",
  rcs_pit_fill_approved_reused_finished_m3: 20, rcs_pit_fill_gross_supplied_volume_ratio: 1.2,
  rcs_pit_fill_compatible_loose_stock_m3: 10, rcs_pit_fill_retained_loose_reserve_m3: 2, rcs_pit_fill_supplier_loose_multiple_m3: 5,
};
const id = (key: string) => `rcs:trench-fill:${key}`;
const order = id("ordered_loose_m3");
const provenance = { kind: "manual", reason: "owned backfill exception" };
const allOverrides = Object.fromEntries([...civilRows, ...rows].map(row => [row.rowId, { quantity: "999", unitPrice: "4", provenance }]));
function compile(submittedParameters = fixture, rowOverrides?: Record<string, Record<string, unknown>>) {
  return compileCanonicalEstimateCore({ operation: rowOverrides ? "recalculate" : "compile", compilerVersion: "rcs-trench-fill-test",
    catalogId: "canonical-work:expanded:road_crossing_sleeves", primaryMeasureParameterId: "rcs_crossing_length_m",
    parameterDefinitions: [...definition.parameters], formulaDefinitions: [...definition.formulas], resourceDefinitions: [...definition.resources],
    submittedParameters, confirmedParameters: {}, priceItems: [], currencyCode: "KGS", maximumResourceRows: definition.resources.length,
    rowOverrides, hashJson: value => estimateDeterministicHash(value),
  });
}
const q = (result: Awaited<ReturnType<typeof compile>>, key: string) => Number(result.rows.find(row => row.row_id === id(key))?.quantity);
const net = 105 - 5.25 - 3.141592654 / 4 * 530 ** 2 * 35 / 1_000_000 - 2;

describe("selected trench backfill in disjoint finished/reused/loose states", () => {
  it("subtracts bedding, external casing and actual other occupation once; derives reuse, order and remainder", async () => {
    const result = await compile();
    expect(result.preliminaryNeeds).toHaveLength(0);
    for (const [key, value] of Object.entries({ net_remaining_space_m3: net, approved_reused_finished_m3: 20,
      additional_finished_fill_m3: net - 20, consumed_loose_m3: (net - 20) * 1.2,
      retained_loose_reserve_m3: 2, compatible_loose_stock_m3: 10, total_loose_need_m3: (net - 20) * 1.2 + 2,
      new_loose_need_m3: (net - 20) * 1.2 - 8, supplier_multiple_count: 16, ordered_loose_m3: 80,
      remaining_loose_m3: 90 - (net - 20) * 1.2, free_loose_m3_beyond_reserve: 88 - (net - 20) * 1.2 })) expect(q(result, key)).toBeCloseTo(value, 6);
    expect(definition.runtimeInput).toEqual({});
    expect(parameters.every(p => p.defaultValue == null)).toBe(true);
    expect(parameters.some(p => /ordered|consumed|net_remaining|additional_finished|supplier_multiple_count/u.test(p.id))).toBe(false);
  });
  it("pays/procures only new loose supply, never excavation, reuse, consumption, reserve or a second pit purchase", async () => {
    const result = await compile(fixture, { [order]: { unitPrice: "4", provenance } });
    expect(result.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual([order]);
    expect(result.rows.filter(row => row.included_in_procurement).map(row => row.row_id)).toEqual([order]);
    expect(result.rows.find(row => row.row_id === order)?.title_ru).toContain(fixture.rcs_trench_fill_granular_product_designation);
    expect(result.totals.amount).toBe("320");
  });
  it("changing method selects only the pit order and keeps retained trench facts inactive", async () => {
    const result = await compile({ ...fixture, rcs_civil_installation_method: methods.pipeJacking });
    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(result.rows.some(row => row.row_id.startsWith("rcs:trench-fill:"))).toBe(false);
    expect(result.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual(["rcs:pit-fill:ordered_loose_m3"]);
    expect(result.rows.find(row => row.row_id === "rcs:pit-fill:ordered_loose_m3")?.quantity).toBe("70");
    expect(result.parameters.rcs_trench_fill_other_permanent_occupied_volume_m3).toBe(2);
  });
  it.each(["rcs_trench_fill_other_permanent_occupied_volume_m3", "rcs_trench_fill_approved_reused_finished_m3",
    "rcs_trench_fill_gross_supplied_volume_ratio", "rcs_trench_fill_compatible_loose_stock_m3", "rcs_trench_fill_retained_loose_reserve_m3",
    "rcs_trench_fill_supplier_loose_multiple_m3", "rcs_trench_fill_granular_product_designation", "rcs_open_cut_excavation_depth_m"])("manual quantities cannot replace unknown original %s", async missing => {
    const input = { ...fixture }; delete input[missing];
    const result = await compile(input, allOverrides);
    expect(result.rows.some(row => row.row_id === order)).toBe(false);
    expect(result.preliminaryNeeds.find(need => need.row_id === order)?.missing_parameter_ids).toContain(missing);
  });
  it("an unknown product gates only purchase, while actual geometry/reuse/consumption remain visible", async () => {
    const input = { ...fixture }; delete input.rcs_trench_fill_granular_product_designation;
    const result = await compile(input);
    expect(q(result, "consumed_loose_m3")).toBeCloseTo((net - 20) * 1.2, 6);
    expect(result.preliminaryNeeds).toEqual([expect.objectContaining({ row_id: order, missing_parameter_ids: ["rcs_trench_fill_granular_product_designation"] })]);
  });
  it("an unknown carrier compatibility fact leaves independent excavation/stock visible and gates casing-dependent fill", async () => {
    const input = { ...fixture }; delete input.rcs_carrier_outside_diameter_mm;
    const result = await compile(input, { [order]: { quantity: "999", provenance } });
    expect(result.rows.find(row => row.row_id === "rcs:civil:open_cut_excavation_m3")?.quantity).toBe("105");
    expect(q(result, "compatible_loose_stock_m3")).toBe(10);
    expect(result.preliminaryNeeds.find(need => need.row_id === order)?.missing_parameter_ids).toContain("rcs_carrier_outside_diameter_mm");
  });
  it("unknown mode is a local question; a known other/mixed mode excludes this material, even with manual purchase", async () => {
    const input = { ...fixture }; delete input.rcs_trench_fill_material_mode;
    const unresolved = await compile(input, allOverrides);
    const needs = unresolved.preliminaryNeeds.filter(need => need.row_id.startsWith("rcs:trench-fill:"));
    expect(needs).toHaveLength(rows.length);
    expect(needs.every(need => need.missing_parameter_ids.includes("rcs_trench_fill_material_mode"))).toBe(true);
    const other = await compile({ ...input, rcs_trench_fill_material_mode: modes.other }, allOverrides);
    expect(other.preliminaryNeeds).toHaveLength(0);
    expect(other.rows.some(row => row.row_id.startsWith("rcs:trench-fill:"))).toBe(false);
  });
  it.each([{ rcs_trench_fill_other_permanent_occupied_volume_m3: 100 }, { rcs_trench_fill_approved_reused_finished_m3: 91 },
    { rcs_open_cut_excavation_width_m: 0.5 }])("rejects impossible original geometry/reuse even under manual exceptions: %j", async patch => {
    await expect(compile({ ...fixture, ...patch }, allOverrides)).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
  });
  it("zero reuse/occupation is real input; stock/pack size alter supply balances, not finished demand", async () => {
    const zero = await compile({ ...fixture, rcs_trench_fill_other_permanent_occupied_volume_m3: 0, rcs_trench_fill_approved_reused_finished_m3: 0 });
    expect(q(zero, "additional_finished_fill_m3")).toBeCloseTo(net + 2, 6);
    const stock = await compile({ ...fixture, rcs_trench_fill_compatible_loose_stock_m3: 100 });
    expect(q(stock, "ordered_loose_m3")).toBe(0); expect(q(stock, "additional_finished_fill_m3")).toBeCloseTo(net - 20, 6);
    const pack = await compile({ ...fixture, rcs_trench_fill_supplier_loose_multiple_m3: 50 });
    expect(q(pack, "ordered_loose_m3")).toBe(100); expect(q(pack, "consumed_loose_m3")).toBeCloseTo((net - 20) * 1.2, 6);
  });
  it("manual controls/order do not rewrite original facts; reset follows current geometry and retains exception provenance", async () => {
    const pin = { [order]: { quantity: "100", provenance }, [id("net_remaining_space_m3")]: { quantity: "999", provenance } };
    const changed = { ...fixture, rcs_open_cut_excavation_depth_m: 2.2 };
    const result = await compile(changed, pin);
    expect(q(result, "ordered_loose_m3")).toBe(100); expect(q(result, "additional_finished_fill_m3")).toBeCloseTo(net - 20 + 10.5, 6);
    expect(result.rows.find(row => row.row_id === order)?.calculation_trace).toMatchObject({ manualAmendment: provenance,
      manualQuantityOverride: true, calculatedQuantityBeforeOverride: "90" });
    expect(q(await compile(changed), "ordered_loose_m3")).toBe(90);
    expect(scope.purchaseOverride).toContain("must be reconciled");
  });
  it("does not install a universal conversion, loss or soil-suitability factor", async () => {
    const result = await compile({ ...fixture, rcs_trench_fill_gross_supplied_volume_ratio: 0.8 });
    expect(q(result, "consumed_loose_m3")).toBeCloseTo((net - 20) * 0.8, 6);
    expect(scope).toMatchObject({ fullOwner: false, engineeringAccepted: false });
    expect(rows.some(row => /haul|trip|mass|crew|equipment/u.test(row.rowId))).toBe(false);
  });
  it.each([{ rcs_trench_fill_other_permanent_occupied_volume_m3: -1 }, { rcs_trench_fill_approved_reused_finished_m3: -1 },
    { rcs_trench_fill_gross_supplied_volume_ratio: 0 }, { rcs_trench_fill_compatible_loose_stock_m3: -1 },
    { rcs_trench_fill_retained_loose_reserve_m3: -1 }, { rcs_trench_fill_supplier_loose_multiple_m3: 0 }])("rejects invalid facts instead of clamping: %j", async patch => {
    await expect(compile({ ...fixture, ...patch })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
});
