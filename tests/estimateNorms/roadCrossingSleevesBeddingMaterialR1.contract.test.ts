import { buildAutomaticConstructionOwnerR1 } from "../../src/lib/estimate/v4/automaticConstructionOwnerR1";
import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { ROAD_CROSSING_SLEEVES_QUANTITY_PARAMETERS_R1 } from "../../src/lib/estimate/v4/roadCrossingSleevesQuantityModelR1";
import { ROAD_CROSSING_SLEEVES_CIVIL_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_CIVIL_METHODS_R1 as methods } from "../../src/lib/estimate/v4/roadCrossingSleevesCivilGeometryR1";
import { ROAD_CROSSING_SLEEVES_BEDDING_PARAMETERS_R1 as parameters, ROAD_CROSSING_SLEEVES_BEDDING_ROWS_R1 as rows,
  ROAD_CROSSING_SLEEVES_BEDDING_SCOPE_R1 as scope } from "../../src/lib/estimate/v4/roadCrossingSleevesBeddingMaterialR1";

const definition = buildAutomaticConstructionOwnerR1({ contract: "rcs-bedding-material-test", semanticOwner: "rcs-test",
  sourceId: "actual-selected-granular-material-and-gross-volume-facts", normId: "no-universal-compaction-rate",
  sourceMetadata: { source_title: "Owned granular bedding arithmetic fixture, not a design or norm", source_document_version: "test-2026-10-03",
    definition_hash: "a".repeat(64), exact_locator: "Test-only selected supplied-volume facts", artifact_sha256: "a".repeat(64) },
  applicabilityRu: "Зернистое основание открытой прямоугольной траншеи; не бетонное основание или полная работа",
  ordinary: [...ROAD_CROSSING_SLEEVES_QUANTITY_PARAMETERS_R1.filter(p => p.id === "rcs_crossing_length_m"),
    ...ROAD_CROSSING_SLEEVES_CIVIL_PARAMETERS_R1.filter(p => p.kind === "ordinary")], profile: [],
  conditional: [...ROAD_CROSSING_SLEEVES_CIVIL_PARAMETERS_R1.filter(p => p.kind === "conditional"), ...parameters], rows,
  excludedUnownedAssumptions: [scope.excluded],
});
// Actual-fact/price fixtures ONLY, not runtime defaults or project approval.
const fixture: Record<string, unknown> = { rcs_crossing_length_m: 35, rcs_civil_installation_method: methods.openCut,
  rcs_open_cut_excavation_width_m: 1.5, rcs_open_cut_full_width_bedding_thickness_m: 0.1,
  rcs_bedding_granular_product_designation: "TEST-OWNED selected compatible granular material",
  rcs_bedding_gross_supplied_volume_ratio: 1.2, rcs_bedding_compatible_loose_stock_m3: 1,
  rcs_bedding_retained_loose_reserve_m3: 0.5, rcs_bedding_supplier_loose_multiple_m3: 2,
};
const id = (key: string) => `rcs:bedding:${key}`;
const order = id("ordered_loose_m3");
const provenance = { kind: "manual", reason: "owned bedding purchase exception" };
function compile(submittedParameters: Record<string, unknown> = fixture, rowOverrides?: Record<string, Record<string, unknown>>) {
  return compileCanonicalEstimateCore({ operation: rowOverrides ? "recalculate" : "compile", compilerVersion: "rcs-bedding-test",
    catalogId: "canonical-work:expanded:road_crossing_sleeves", primaryMeasureParameterId: "rcs_crossing_length_m",
    parameterDefinitions: [...definition.parameters], formulaDefinitions: [...definition.formulas], resourceDefinitions: [...definition.resources],
    submittedParameters, confirmedParameters: {}, priceItems: [], currencyCode: "KGS", maximumResourceRows: definition.resources.length,
    rowOverrides, hashJson: value => estimateDeterministicHash(value),
  });
}
const q = (result: Awaited<ReturnType<typeof compile>>, key: string) => Number(result.rows.find(row => row.row_id === id(key))?.quantity);

describe("applicable granular bedding material through the shared graph", () => {
  it("derives consumption and rounded supplied-volume balances without asking for another finished volume", async () => {
    const result = await compile();
    expect(result.preliminaryNeeds).toHaveLength(0);
    for (const [key, value] of Object.entries({ consumed_loose_m3: 6.3, retained_loose_reserve_m3: 0.5,
      compatible_loose_stock_m3: 1, total_loose_need_m3: 6.8, new_loose_need_m3: 5.8,
      supplier_multiple_count: 3, ordered_loose_m3: 6, remaining_loose_m3: 0.7, free_loose_m3_beyond_reserve: 0.2 })) expect(q(result, key)).toBeCloseTo(value, 6);
    expect(parameters.some(p => /consumed|ordered|finished|remaining/u.test(p.id))).toBe(false);
    expect(q(result, "consumed_loose_m3")).toBeCloseTo(35 * 1.5 * 0.1 * 1.2, 6);
  });
  it.each([
    { rcs_civil_installation_method: methods.pipeJacking },
    { rcs_open_cut_full_width_bedding_thickness_m: 0 },
  ])("does not require or pay material in a known inactive branch: %j", async patch => {
    const input: Record<string, unknown> = { ...fixture, ...patch }; for (const p of parameters) delete input[p.id];
    const result = await compile(input, { [order]: { quantity: "999", unitPrice: "10", provenance } });
    expect(result.rows).toEqual([]); expect(result.preliminaryNeeds).toEqual([]); expect(result.totals.amount).toBe("0");
  });
  it("a known jacking branch remains excluded even with unknown or retained positive open-cut thickness", async () => {
    for (const thickness of [undefined, 0.1]) {
      const input = { ...fixture, rcs_civil_installation_method: methods.pipeJacking, rcs_open_cut_full_width_bedding_thickness_m: thickness };
      expect((await compile(input)).rows).toEqual([]);
      expect((await compile(input)).preliminaryNeeds).toEqual([]);
    }
  });
  it.each(["rcs_civil_installation_method", "rcs_open_cut_full_width_bedding_thickness_m"])("unknown %s is an undecided local condition, not an invented zero", async key => {
    const input = { ...fixture }; delete input[key]; const result = await compile(input);
    expect(result.rows).toEqual([]);
    expect(result.preliminaryNeeds.length).toBe(rows.length);
    expect(result.preliminaryNeeds.every(need => need.missing_parameter_ids.join() === key)).toBe(true);
    // A missing thickness is also a quantity operand on consumption rows;
    // both quantity and condition needs refer to that SAME original fact.
    expect(result.preliminaryNeeds.find(need => need.row_id === id("retained_loose_reserve_m3"))?.need_state).toBe("CONDITION_REQUIRED");
  });
  it.each(["rcs_civil_installation_method", "rcs_open_cut_full_width_bedding_thickness_m"])("a manual quantity cannot imply confirmation of missing applicability fact %s", async key => {
    const input = { ...fixture }; delete input[key];
    const result = await compile(input, Object.fromEntries(rows.map(row => [row.rowId, { quantity: "999", provenance }])));
    expect(result.rows).toEqual([]);
    expect(result.preliminaryNeeds.every(need => need.missing_parameter_ids.includes(key))).toBe(true);
  });
  it.each(["rcs_bedding_gross_supplied_volume_ratio", "rcs_bedding_compatible_loose_stock_m3",
    "rcs_bedding_retained_loose_reserve_m3", "rcs_bedding_supplier_loose_multiple_m3"])("does not invent missing %s", async key => {
    const input = { ...fixture }; delete input[key]; const result = await compile(input);
    expect(result.rows.some(row => row.row_id === order)).toBe(false);
    expect(result.preliminaryNeeds.find(need => need.row_id === order)?.missing_parameter_ids).toContain(key);
  });
  it("keeps an unknown selected product gated even with a manual order, while known geometry/consumption stays known", async () => {
    const input = { ...fixture }; delete input.rcs_bedding_granular_product_designation;
    const result = await compile(input, { [order]: { quantity: "100", provenance } });
    expect(result.rows.some(row => row.row_id === order)).toBe(false);
    expect(result.preliminaryNeeds.find(need => need.row_id === order)?.missing_parameter_ids).toContain("rcs_bedding_granular_product_designation");
    expect(q(result, "consumed_loose_m3")).toBeCloseTo(6.3, 6);
  });
  it("owns only the new loose-volume purchase, not finished geometry, consumption, supplies or another loss payment", async () => {
    const result = await compile();
    expect(result.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual([order]);
    expect(result.rows.filter(row => row.included_in_procurement).map(row => row.row_id)).toEqual([order]);
    expect(result.rows.find(row => row.row_id === order)).toMatchObject({ unit_id: "m3", unit_price: null });
    expect(result.rows.find(row => row.row_id === order)?.title_ru).toContain(fixture.rcs_bedding_granular_product_designation);
    expect((await compile(fixture, { [order]: { unitPrice: "4", provenance } })).totals.amount).toBe("24");
  });
  it("compatible stock can eliminate new purchase and supply multiple affects surplus, not consumption", async () => {
    const stock = await compile({ ...fixture, rcs_bedding_compatible_loose_stock_m3: 10 });
    expect(q(stock, "ordered_loose_m3")).toBe(0); expect(q(stock, "remaining_loose_m3")).toBeCloseTo(3.7, 6);
    expect(q(stock, "free_loose_m3_beyond_reserve")).toBeCloseTo(3.2, 6);
    const pack = await compile({ ...fixture, rcs_bedding_supplier_loose_multiple_m3: 10 });
    expect(q(pack, "ordered_loose_m3")).toBe(10); expect(q(pack, "consumed_loose_m3")).toBeCloseTo(6.3, 6);
  });
  it("does not impose a fabricated minimum compaction factor of one", async () => {
    const result = await compile({ ...fixture, rcs_bedding_gross_supplied_volume_ratio: 0.8 });
    expect(q(result, "consumed_loose_m3")).toBeCloseTo(4.2, 6);
    expect(q(result, "ordered_loose_m3")).toBe(4);
  });
  it("pins a visible manual order across primary changes and resets to the current formula without changing geometry", async () => {
    const pin = { [order]: { quantity: "12", provenance } };
    expect(q(await compile(fixture, pin), "ordered_loose_m3")).toBe(12);
    const changed = { ...fixture, rcs_crossing_length_m: 70 };
    const result = await compile(changed, pin);
    expect(q(result, "ordered_loose_m3")).toBe(12); expect(q(result, "consumed_loose_m3")).toBeCloseTo(12.6, 6);
    expect(q(await compile(changed), "ordered_loose_m3")).toBe(14);
  });
  it.each([
    { rcs_bedding_gross_supplied_volume_ratio: 0 }, { rcs_bedding_supplier_loose_multiple_m3: 0 },
    { rcs_bedding_compatible_loose_stock_m3: -1 }, { rcs_bedding_retained_loose_reserve_m3: -1 },
    { rcs_open_cut_full_width_bedding_thickness_m: -1 },
  ])("rejects invalid factual values rather than clamping them: %j", async patch => {
    await expect(compile({ ...fixture, ...patch })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
  it("does not install a hidden product, ratio, supply multiple, crew, freight, mass or full owner", () => {
    expect(definition.runtimeInput).toEqual({}); expect(parameters.every(p => p.defaultValue == null)).toBe(true);
    expect(scope).toMatchObject({ fullOwner: false, engineeringAccepted: false });
    expect(scope.grossRatio).toContain("no universal or second loss factor");
    expect(scope.purchaseOverride).toContain("must be reconciled");
    expect(rows.some(row => /crew|equipment|freight|mass/u.test(row.rowId))).toBe(false);
  });
});
