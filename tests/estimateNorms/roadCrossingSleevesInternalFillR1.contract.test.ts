import { buildAutomaticConstructionOwnerR1 } from "../../src/lib/estimate/v4/automaticConstructionOwnerR1";
import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { ROAD_CROSSING_SLEEVES_QUANTITY_PARAMETERS_R1 as quantity } from "../../src/lib/estimate/v4/roadCrossingSleevesQuantityModelR1";
import { ROAD_CROSSING_SLEEVES_INTERNAL_FILL_PARAMETERS_R1 as parameters, ROAD_CROSSING_SLEEVES_INTERNAL_FILL_ROWS_R1 as rows,
  ROAD_CROSSING_SLEEVES_INTERNAL_FILL_MODES_R1 as modes, ROAD_CROSSING_SLEEVES_INTERNAL_FILL_SCOPE_R1 as scope } from "../../src/lib/estimate/v4/roadCrossingSleevesInternalFillR1";

const geometricIds = ["rcs_crossing_length_m", "rcs_casing_inside_diameter_mm", "rcs_carrier_outside_diameter_mm"];
const definition = buildAutomaticConstructionOwnerR1({
  contract: "owned-internal-fill-arithmetic-test", semanticOwner: "rcs-test", sourceId: "actual-approved-product-and-internal-fill-facts", normId: "no-universal-dry-grout-yield",
  sourceMetadata: { source_title: "Synthetic dry-product arithmetic, not a crossing design", source_document_version: "test",
    definition_hash: "a".repeat(64), artifact_sha256: "a".repeat(64), exact_locator: "owned test fixture" },
  applicabilityRu: "Полный внутренний зазор одного футляра; не внешняя проходка или полная работа",
  ordinary: [...quantity.filter(p => geometricIds.includes(p.id)), ...parameters.filter(p => p.kind === "ordinary")],
  profile: [], conditional: parameters.filter(p => p.kind === "conditional"), rows, excludedUnownedAssumptions: [scope.excluded],
});
// Explicit synthetic facts only. The 0.042477797 m3 occupation makes net 0.9 m3
// at this geometry; neither a default nor an approved spacer/connection volume.
const fixture: Record<string, unknown> = {
  rcs_crossing_length_m: 5, rcs_casing_inside_diameter_mm: 500, rcs_carrier_outside_diameter_mm: 100,
  rcs_internal_fill_mode: modes.dryGrout, rcs_internal_fill_permanent_occupied_m3: 0.042477797,
  rcs_internal_fill_dry_product_designation: "TEST-OWNED approved-for-fixture dry product",
  rcs_internal_fill_gross_dry_mass_ratio: 1000, rcs_internal_fill_compatible_dry_stock_kg: 100,
  rcs_internal_fill_retained_dry_reserve_kg: 25, rcs_internal_fill_supplier_bag_net_kg: 50,
  rcs_internal_fill_mixing_water_l_for_selected_bag: 5,
};
const id = (key: string) => `rcs:internal-fill:${key}`;
const order = id("ordered_dry_kg");
const provenance = { kind: "manual", reason: "owned internal-fill quantity exception" };
const overrides = Object.fromEntries(rows.map(row => [row.rowId, { quantity: "999", unitPrice: "10", provenance }]));
function compile(submittedParameters: Record<string, unknown> = fixture, rowOverrides?: Record<string, Record<string, unknown>>) {
  return compileCanonicalEstimateCore({ operation: rowOverrides ? "recalculate" : "compile", compilerVersion: "rcs-internal-fill-test",
    catalogId: "canonical-work:expanded:road_crossing_sleeves", primaryMeasureParameterId: "rcs_crossing_length_m",
    parameterDefinitions: [...definition.parameters], formulaDefinitions: [...definition.formulas], resourceDefinitions: [...definition.resources],
    submittedParameters, confirmedParameters: {}, priceItems: [], currencyCode: "KGS", maximumResourceRows: definition.resources.length,
    rowOverrides, hashJson: value => estimateDeterministicHash(value),
  });
}
const q = (result: Awaited<ReturnType<typeof compile>>, key: string) => Number(result.rows.find(row => row.row_id === id(key))?.quantity);

describe("optional full internal dry-grout fill with disjoint geometry and supply states", () => {
  it("derives net fill, dry consumption, bags and balances from original facts instead of asking for calculated quantities", async () => {
    const result = await compile();
    expect(result.preliminaryNeeds).toHaveLength(0);
    for (const [key, value] of Object.entries({ gross_internal_annulus_m3: 0.942477797, permanent_occupied_m3: 0.042477797,
      net_fill_m3: 0.9, consumed_dry_kg: 900, compatible_dry_stock_kg: 100, retained_dry_reserve_kg: 25,
      total_dry_need_kg: 925, new_dry_need_kg: 825, supplier_bag_count: 17, ordered_dry_kg: 850,
      remaining_dry_kg: 50, free_dry_kg_beyond_reserve: 25, mixing_water_m3: 0.09 })) expect(q(result, key)).toBeCloseTo(value, 7);
    expect(definition.runtimeInput).toEqual({});
    expect(parameters.every(p => p.defaultValue == null)).toBe(true);
    expect(parameters.some(p => /net_fill|consumed|ordered|remaining|bag_count/u.test(p.id))).toBe(false);
  });
  it("owns only the new compatible dry kg order, not a second bag, constituent or water purchase", async () => {
    const result = await compile();
    expect(result.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual([order]);
    expect(result.rows.filter(row => row.included_in_procurement).map(row => row.row_id)).toEqual([order]);
    expect(result.rows.find(row => row.row_id === order)).toMatchObject({ unit_id: "kg", unit_price: null });
    expect(result.rows.find(row => row.row_id === order)?.title_ru).toContain(fixture.rcs_internal_fill_dry_product_designation);
    expect((await compile(fixture, { [order]: { unitPrice: "4", provenance } })).totals.amount).toBe("3400");
    expect(rows.some(row => /cement|sand|crew|equipment|haul/u.test(row.rowId))).toBe(false);
  });
  it.each([...geometricIds,
    ...parameters.filter(p => p.id !== "rcs_internal_fill_mode" && p.id !== "rcs_internal_fill_mixing_water_l_for_selected_bag").map(p => p.id)])
  ("manual purchases cannot replace unknown original %s", async missing => {
    const input = { ...fixture }; delete input[missing];
    const result = await compile(input, overrides);
    expect(result.rows.some(row => row.row_id === order)).toBe(false);
    expect(result.preliminaryNeeds.find(need => need.row_id === order)?.missing_parameter_ids).toContain(missing);
  });
  it("keeps missing carrier compatibility local to the selected internal-fill needs", async () => {
    const input = { ...fixture }; delete input.rcs_carrier_outside_diameter_mm;
    const result = await compile(input, overrides);
    expect(result.rows.every(row => !row.included_in_estimate && !row.included_in_procurement)).toBe(true);
    expect(result.totals.includedRowCount).toBe(0);
    expect(result.preliminaryNeeds.find(need => need.row_id === order)).toMatchObject({
      need_state: "CONDITION_REQUIRED", missing_parameter_ids: ["rcs_carrier_outside_diameter_mm"],
    });
  });
  it("an unknown mode is a localized undecided branch, not silent no-fill or a positive material default", async () => {
    const input = { ...fixture }; delete input.rcs_internal_fill_mode;
    const result = await compile(input, overrides);
    expect(result.rows).toHaveLength(0);
    expect(result.preliminaryNeeds).toHaveLength(rows.length);
    expect(result.preliminaryNeeds.every(need => need.need_state === "CONDITION_REQUIRED" && need.missing_parameter_ids.includes("rcs_internal_fill_mode"))).toBe(true);
  });
  it.each([modes.none, modes.other])("known excluded choice %s suppresses resources, needs and stale manual payment", async mode => {
    const result = await compile({ rcs_crossing_length_m: 5, rcs_casing_inside_diameter_mm: 500, rcs_carrier_outside_diameter_mm: 100,
      rcs_internal_fill_mode: mode }, overrides);
    expect(result.rows).toHaveLength(0); expect(result.preliminaryNeeds).toHaveLength(0); expect(result.totals.amount).toBe("0");
  });
  it("missing water gates only its known consumption output, not the independent dry product purchase", async () => {
    const input = { ...fixture }; delete input.rcs_internal_fill_mixing_water_l_for_selected_bag;
    const result = await compile(input, { [id("mixing_water_m3")]: { quantity: "999", provenance } });
    expect(q(result, "ordered_dry_kg")).toBe(850);
    expect(result.preliminaryNeeds).toHaveLength(1);
    expect(result.preliminaryNeeds[0]).toMatchObject({ row_id: id("mixing_water_m3"), missing_parameter_ids: ["rcs_internal_fill_mixing_water_l_for_selected_bag"] });
  });
  it("a missing product gates only the purchase while original net volume, dry demand and mixing water remain visible", async () => {
    const input = { ...fixture }; delete input.rcs_internal_fill_dry_product_designation;
    const result = await compile(input, { [order]: { quantity: "999", provenance } });
    expect(q(result, "net_fill_m3")).toBeCloseTo(0.9, 7); expect(q(result, "consumed_dry_kg")).toBe(900); expect(q(result, "mixing_water_m3")).toBeCloseTo(0.09, 7);
    expect(result.preliminaryNeeds).toHaveLength(1);
    expect(result.preliminaryNeeds[0]).toMatchObject({ row_id: order, missing_parameter_ids: ["rcs_internal_fill_dry_product_designation"] });
  });
  it("validates original internal occupation and diameter relations before manual quantities can hide impossible geometry", async () => {
    await expect(compile({ ...fixture, rcs_internal_fill_permanent_occupied_m3: 1 }, overrides)).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
    for (const diameter of [100, 90]) await expect(compile({ ...fixture, rcs_casing_inside_diameter_mm: diameter }, overrides)).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
  it("allows explicitly confirmed zero stock/occupation/reserve and zero remaining space, never treating an unknown value as zero", async () => {
    const zero = await compile({ ...fixture, rcs_internal_fill_compatible_dry_stock_kg: 0, rcs_internal_fill_retained_dry_reserve_kg: 0,
      rcs_internal_fill_permanent_occupied_m3: 0 });
    expect(q(zero, "net_fill_m3")).toBeCloseTo(0.942477797, 7); expect(q(zero, "ordered_dry_kg")).toBe(950);
    const occupied = await compile({ ...fixture, rcs_internal_fill_permanent_occupied_m3: 0.942477797,
      rcs_internal_fill_compatible_dry_stock_kg: 0, rcs_internal_fill_retained_dry_reserve_kg: 0 });
    expect(q(occupied, "net_fill_m3")).toBe(0); expect(q(occupied, "ordered_dry_kg")).toBe(0); expect(q(occupied, "mixing_water_m3")).toBe(0);
  });
  it("changes purchase rounding and dry reserve without adding water for unopened powder or altering installed geometry", async () => {
    const changed = await compile({ ...fixture, rcs_internal_fill_supplier_bag_net_kg: 200,
      rcs_internal_fill_mixing_water_l_for_selected_bag: 20, rcs_internal_fill_retained_dry_reserve_kg: 500 });
    expect(q(changed, "ordered_dry_kg")).toBe(1400); expect(q(changed, "remaining_dry_kg")).toBe(600);
    expect(q(changed, "net_fill_m3")).toBeCloseTo(0.9, 7); expect(q(changed, "consumed_dry_kg")).toBe(900); expect(q(changed, "mixing_water_m3")).toBeCloseTo(0.09, 7);
    const stock = await compile({ ...fixture, rcs_internal_fill_compatible_dry_stock_kg: 1000 });
    expect(q(stock, "ordered_dry_kg")).toBe(0); expect(q(stock, "consumed_dry_kg")).toBe(900); expect(q(stock, "mixing_water_m3")).toBeCloseTo(0.09, 7);
  });
  it("reuses source geometry, not manual net-space or material-order quantities, in consumption and mixing water", async () => {
    const result = await compile(fixture, { [id("net_fill_m3")]: { quantity: "2", provenance }, [order]: { quantity: "1000", provenance } });
    expect(q(result, "net_fill_m3")).toBe(2); expect(q(result, "ordered_dry_kg")).toBe(1000);
    expect(q(result, "consumed_dry_kg")).toBe(900); expect(q(result, "mixing_water_m3")).toBeCloseTo(0.09, 7);
    expect(result.parameters.rcs_internal_fill_permanent_occupied_m3).toBe(fixture.rcs_internal_fill_permanent_occupied_m3);
    expect(scope.purchaseOverride).toContain("reconciliation");
  });
  it("pins the applied purchase across primary changes while retaining the current formula reference and reset", async () => {
    const pin = { [order]: { quantity: "950", provenance } };
    const changed = { ...fixture, rcs_crossing_length_m: 10 };
    const result = await compile(changed, pin);
    expect(q(result, "ordered_dry_kg")).toBe(950);
    expect(result.rows.find(row => row.row_id === order)?.calculation_trace).toMatchObject({ calculatedQuantityBeforeOverride: "1800" });
    expect(q(await compile(changed), "ordered_dry_kg")).toBe(1800);
    expect(q(result, "consumed_dry_kg")).toBeCloseTo(1842.477797, 6);
  });
  it("keeps mm2 until final volume conversion even for small geometry", async () => {
    const result = await compile({ ...fixture, rcs_crossing_length_m: 0.001, rcs_casing_inside_diameter_mm: 100,
      rcs_carrier_outside_diameter_mm: 99, rcs_internal_fill_permanent_occupied_m3: 0 });
    expect(q(result, "gross_internal_annulus_m3")).toBeCloseTo(Math.PI / 4 * (100 ** 2 - 99 ** 2) * 0.001 / 1e6, 9);
    expect(q(result, "gross_internal_annulus_m3")).toBeGreaterThan(0);
  });
  it.each([{ rcs_internal_fill_permanent_occupied_m3: -1 }, { rcs_internal_fill_gross_dry_mass_ratio: 0 },
    { rcs_internal_fill_compatible_dry_stock_kg: -1 }, { rcs_internal_fill_retained_dry_reserve_kg: -1 },
    { rcs_internal_fill_supplier_bag_net_kg: 0 }, { rcs_internal_fill_mixing_water_l_for_selected_bag: 0 }])
  ("rejects invalid original fact without clamping or inventing a standard: %j", async patch => {
    await expect(compile({ ...fixture, ...patch })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
  it("preserves the explicit partial scope and does not promote a chosen mode to engineering acceptance", () => {
    expect(scope).toMatchObject({ fullOwner: false, engineeringAccepted: false });
    expect(scope.excluded).toContain("pressure/buoyancy/restraints");
    expect(scope.excluded).toContain("water supply");
    expect(scope.stock).toContain("wet mixed grout");
  });
});
