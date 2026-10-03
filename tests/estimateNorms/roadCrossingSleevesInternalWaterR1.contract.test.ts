import { buildAutomaticConstructionOwnerR1 } from "../../src/lib/estimate/v4/automaticConstructionOwnerR1";
import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { ROAD_CROSSING_SLEEVES_QUANTITY_PARAMETERS_R1 as quantity } from "../../src/lib/estimate/v4/roadCrossingSleevesQuantityModelR1";
import { ROAD_CROSSING_SLEEVES_INTERNAL_FILL_PARAMETERS_R1 as dryParameters, ROAD_CROSSING_SLEEVES_INTERNAL_FILL_ROWS_R1 as dryRows,
  ROAD_CROSSING_SLEEVES_INTERNAL_FILL_MODES_R1 as dryModes, ROAD_CROSSING_SLEEVES_INTERNAL_WATER_PARAMETERS_R1 as parameters,
  ROAD_CROSSING_SLEEVES_INTERNAL_WATER_ROWS_R1 as rows, ROAD_CROSSING_SLEEVES_INTERNAL_WATER_MODES_R1 as modes,
  ROAD_CROSSING_SLEEVES_INTERNAL_WATER_COST_BASIS_R1 as basis, ROAD_CROSSING_SLEEVES_INTERNAL_WATER_SCOPE_R1 as scope } from "../../src/lib/estimate/v4/roadCrossingSleevesInternalFillR1";

const geometry = quantity.filter(p => ["rcs_crossing_length_m", "rcs_casing_inside_diameter_mm", "rcs_carrier_outside_diameter_mm"].includes(p.id));
const definition = buildAutomaticConstructionOwnerR1({
  contract: "owned-mixing-water-test", semanticOwner: "rcs-test", sourceId: "selected-compatible-water-project-facts", normId: "no-universal-water-loss-or-truck-default",
  sourceMetadata: { source_title: "Synthetic water supply arithmetic, not an accepted project", source_document_version: "test",
    definition_hash: "a".repeat(64), artifact_sha256: "a".repeat(64), exact_locator: "owned test fixture" },
  applicabilityRu: "Вода выбранного внутреннего сухого заполнения; отдельная закупка или вода заказчика",
  ordinary: [...geometry, ...dryParameters.filter(p => p.kind === "ordinary")], profile: [],
  conditional: [...dryParameters.filter(p => p.kind === "conditional"), ...parameters], rows: [...dryRows, ...rows],
  excludedUnownedAssumptions: [scope.excluded],
});
// Actual-input arithmetic fixtures only; never installation/product defaults.
const fixture: Record<string, unknown> = {
  rcs_crossing_length_m: 5, rcs_casing_inside_diameter_mm: 500, rcs_carrier_outside_diameter_mm: 100,
  rcs_internal_fill_mode: dryModes.dryGrout, rcs_internal_fill_permanent_occupied_m3: 0.042477797,
  rcs_internal_fill_dry_product_designation: "TEST selected dry grout", rcs_internal_fill_gross_dry_mass_ratio: 1000,
  rcs_internal_fill_compatible_dry_stock_kg: 100, rcs_internal_fill_retained_dry_reserve_kg: 25,
  rcs_internal_fill_supplier_bag_net_kg: 50, rcs_internal_fill_mixing_water_l_for_selected_bag: 5,
  rcs_internal_fill_water_supply_mode: modes.separatePurchase, rcs_internal_fill_water_product_designation: "TEST suitable mixing water",
  rcs_internal_fill_water_compatibility_reference: "TEST selected grout approval and water allocation", rcs_internal_fill_water_cost_basis: basis,
  rcs_internal_fill_water_compatible_stock_m3: 0.02, rcs_internal_fill_water_retained_reserve_m3: 0.01, rcs_internal_fill_water_supplier_multiple_m3: 0.05,
};
const id = (key: string) => `rcs:internal-water:${key}`;
const order = id("ordered_m3");
const provenance = { kind: "manual", reason: "owned water supply exception" };
function compile(submittedParameters = fixture, rowOverrides?: Record<string, Record<string, unknown>>) {
  return compileCanonicalEstimateCore({ operation: rowOverrides ? "recalculate" : "compile", compilerVersion: "owned-water-test",
    catalogId: "canonical-work:expanded:road_crossing_sleeves", primaryMeasureParameterId: "rcs_crossing_length_m",
    parameterDefinitions: [...definition.parameters], formulaDefinitions: [...definition.formulas], resourceDefinitions: [...definition.resources],
    submittedParameters, confirmedParameters: {}, priceItems: [], currencyCode: "KGS", maximumResourceRows: definition.resources.length,
    rowOverrides, hashJson: value => estimateDeterministicHash(value),
  });
}
const q = (result: Awaited<ReturnType<typeof compile>>, rowId: string) => Number(result.rows.find(row => row.row_id === rowId)?.quantity);

describe("disjoint material purchase for actual internal mixing water", () => {
  it("uses consumed powder for water and derives stock/reserve/supply/order/remaining balances in compatible m3", async () => {
    const result = await compile();
    expect(result.preliminaryNeeds).toEqual([]);
    expect(q(result, "rcs:internal-fill:mixing_water_m3")).toBeCloseTo(0.09, 7);
    for (const [key, value] of Object.entries({ compatible_stock_m3: 0.02, retained_reserve_m3: 0.01, total_need_m3: 0.1,
      new_need_m3: 0.08, supplier_multiple_count: 2, ordered_m3: 0.1, remaining_m3: 0.03, free_m3_beyond_reserve: 0.02 })) expect(q(result, id(key))).toBeCloseTo(value, 7);
    expect(definition.runtimeInput).toEqual({});
    expect(parameters.every(p => p.defaultValue == null)).toBe(true);
    expect(parameters.some(p => /ordered|consumed|remaining|multiple_count/u.test(p.id))).toBe(false);
    expect(rows.some(row => /truck|trip|energy|crew|equipment/u.test(row.rowId))).toBe(false);
  });
  it("owns exactly the dry kg order and one separate new-water m3 order, not another bag/consumption/multiple charge", async () => {
    const result = await compile(fixture, { "rcs:internal-fill:ordered_dry_kg": { unitPrice: "4", provenance }, [order]: { unitPrice: "4", provenance } });
    expect(result.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual(["rcs:internal-fill:ordered_dry_kg", order]);
    expect(result.rows.filter(row => row.included_in_procurement).map(row => row.row_id)).toEqual(["rcs:internal-fill:ordered_dry_kg", order]);
    expect(result.totals.amount).toBe("3400.4");
    expect(result.rows.find(row => row.row_id === order)?.title_ru).toContain(fixture.rcs_internal_fill_water_product_designation);
    expect((await compile()).rows.find(row => row.row_id === order)?.unit_price).toBeNull();
  });
  it("dry reserve, purchased bags and usable dry stock do not imply extra mixing water", async () => {
    for (const patch of [{ rcs_internal_fill_retained_dry_reserve_kg: 500 }, { rcs_internal_fill_compatible_dry_stock_kg: 10000 },
      { rcs_internal_fill_supplier_bag_net_kg: 100, rcs_internal_fill_mixing_water_l_for_selected_bag: 10 }]) {
      const result = await compile({ ...fixture, ...patch });
      expect(q(result, "rcs:internal-fill:mixing_water_m3")).toBeCloseTo(0.09, 7);
      expect(q(result, order)).toBeCloseTo(0.1, 7);
    }
  });
  it.each(["rcs_internal_fill_water_product_designation", "rcs_internal_fill_water_compatibility_reference", "rcs_internal_fill_water_cost_basis",
    "rcs_internal_fill_water_compatible_stock_m3", "rcs_internal_fill_water_retained_reserve_m3", "rcs_internal_fill_water_supplier_multiple_m3",
    "rcs_internal_fill_mixing_water_l_for_selected_bag", "rcs_internal_fill_gross_dry_mass_ratio", "rcs_internal_fill_supplier_bag_net_kg",
    "rcs_internal_fill_permanent_occupied_m3", "rcs_carrier_outside_diameter_mm"])("manual order cannot replace original actual %s", async missing => {
    const input = { ...fixture }; delete input[missing];
    const result = await compile(input, { [order]: { quantity: "999", unitPrice: "4", provenance } });
    expect(result.rows.some(row => row.row_id === order)).toBe(false);
    expect(result.preliminaryNeeds.find(need => need.row_id === order)?.missing_parameter_ids).toContain(missing);
  });
  it("unknown water compatibility gates only new water; independently known dry purchase and consumption remain visible", async () => {
    const input = { ...fixture }; delete input.rcs_internal_fill_water_compatibility_reference;
    const result = await compile(input);
    expect(result.preliminaryNeeds).toEqual([expect.objectContaining({ row_id: order, missing_parameter_ids: ["rcs_internal_fill_water_compatibility_reference"] })]);
    expect(q(result, "rcs:internal-fill:ordered_dry_kg")).toBe(850);
    expect(q(result, "rcs:internal-fill:mixing_water_m3")).toBeCloseTo(0.09, 7);
  });
  it("an unknown supply mode is a local question; customer-supplied water has visible consumption without a paid order", async () => {
    const input = { ...fixture }; delete input.rcs_internal_fill_water_supply_mode;
    const unknown = await compile(input, { [order]: { quantity: "999", provenance } });
    const needs = unknown.preliminaryNeeds.filter(need => need.row_id.startsWith("rcs:internal-water:"));
    expect(needs).toHaveLength(rows.length);
    expect(needs.every(need => need.missing_parameter_ids.includes("rcs_internal_fill_water_supply_mode"))).toBe(true);
    const customer = await compile({ ...input, rcs_internal_fill_water_supply_mode: modes.customerSupplied }, { [order]: { quantity: "999", provenance } });
    expect(customer.preliminaryNeeds).toEqual([]);
    expect(customer.rows.some(row => row.row_id.startsWith("rcs:internal-water:"))).toBe(false);
    expect(q(customer, "rcs:internal-fill:mixing_water_m3")).toBeCloseTo(0.09, 7);
    expect(customer.parameters.rcs_internal_fill_water_compatible_stock_m3).toBe(0.02);
  });
  it.each([dryModes.none, dryModes.other])("excludes this purchase for a known inactive internal-fill branch %s", async mode => {
    const result = await compile({ ...fixture, rcs_internal_fill_mode: mode }, { [order]: { quantity: "999", provenance } });
    expect(result.preliminaryNeeds).toEqual([]); expect(result.rows).toEqual([]);
  });
  it("changes water purchase rounding/stock, not mixing consumption; confirmed zero stock/reserve stay real values", async () => {
    const zero = await compile({ ...fixture, rcs_internal_fill_water_compatible_stock_m3: 0, rcs_internal_fill_water_retained_reserve_m3: 0 });
    expect(q(zero, order)).toBeCloseTo(0.1, 7);
    const stock = await compile({ ...fixture, rcs_internal_fill_water_compatible_stock_m3: 1 });
    expect(q(stock, order)).toBe(0); expect(q(stock, id("remaining_m3"))).toBeCloseTo(0.91, 7);
    const multiple = await compile({ ...fixture, rcs_internal_fill_water_supplier_multiple_m3: 0.03 });
    expect(q(multiple, order)).toBeCloseTo(0.09, 7);
    expect(q(multiple, "rcs:internal-fill:mixing_water_m3")).toBeCloseTo(0.09, 7);
  });
  it("informational consumption and direct purchase exceptions do not rewrite source water/dry facts or formula-reference balances", async () => {
    const result = await compile(fixture, { [order]: { quantity: "1", provenance }, "rcs:internal-fill:mixing_water_m3": { quantity: "999", provenance } });
    expect(q(result, order)).toBe(1); expect(q(result, id("remaining_m3"))).toBeCloseTo(0.03, 7);
    expect(result.rows.find(row => row.row_id === order)?.calculation_trace).toMatchObject({ manualAmendment: provenance,
      manualQuantityOverride: true, calculatedQuantityBeforeOverride: "0.1" });
    expect(q(await compile(), order)).toBeCloseTo(0.1, 7);
    expect(scope.purchaseOverride).toContain("reconciliation");
  });
  it.each([{ rcs_internal_fill_water_compatible_stock_m3: -1 }, { rcs_internal_fill_water_retained_reserve_m3: -1 },
    { rcs_internal_fill_water_supplier_multiple_m3: 0 }, { rcs_internal_fill_water_cost_basis: "Water, delivery and operators included" }])("rejects invalid actual supply facts/overlapping cost bases: %j", async patch => {
    await expect(compile({ ...fixture, ...patch })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
});
