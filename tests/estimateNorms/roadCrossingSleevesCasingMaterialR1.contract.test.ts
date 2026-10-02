import { buildAutomaticConstructionOwnerR1 } from "../../src/lib/estimate/v4/automaticConstructionOwnerR1";
import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { ROAD_CROSSING_SLEEVES_QUANTITY_PARAMETERS_R1 } from "../../src/lib/estimate/v4/roadCrossingSleevesQuantityModelR1";
import {
  ROAD_CROSSING_SLEEVES_CASING_MATERIAL_PARAMETERS_R1 as parameters,
  ROAD_CROSSING_SLEEVES_CASING_MATERIAL_ROWS_R1 as rows,
  ROAD_CROSSING_SLEEVES_CASING_MATERIAL_SCOPE_R1 as scope,
} from "../../src/lib/estimate/v4/roadCrossingSleevesCasingMaterialR1";

const definition = buildAutomaticConstructionOwnerR1({
  contract: "rcs-casing-material-test", semanticOwner: "rcs-test", sourceId: "actual-selected-product-and-whole-section-facts", normId: "no-universal-supply-rate",
  sourceMetadata: { source_title: "Selected casing supply; geometric mass is preliminary only", source_document_version: "test-2026-10-03",
    definition_hash: "a".repeat(64), exact_locator: "https://www.ssab.com/en/support/product-material-data/steel/20-questions", artifact_sha256: "a".repeat(64) },
  applicabilityRu: "Заказ выбранного футляра одинаковыми целыми совместимыми секциями; не полная работа или приёмка изделия",
  ordinary: [...ROAD_CROSSING_SLEEVES_QUANTITY_PARAMETERS_R1, ...parameters], profile: [], conditional: [], rows,
  excludedUnownedAssumptions: ["grade/capacity approval", "certified unit mass", "price", "freight", "joints", "full crossing"],
});
// Synthetic arithmetic/specification/pricing fixtures ONLY; no runtime defaults.
const fixture: Record<string, unknown> = {
  rcs_crossing_length_m: 35, rcs_casing_outside_diameter_mm: 530, rcs_casing_inside_diameter_mm: 510,
  rcs_carrier_outside_diameter_mm: 160, rcs_planned_physical_section_length_m: 12,
  rcs_compatible_stock_section_count: 0, rcs_retained_spare_section_count: 1, rcs_supplier_bundle_section_count: 2,
  rcs_steel_density_kg_m3: 7850, rcs_raci_approved_ring_pitch_m: 2.5, rcs_raci_selected_elements_per_ring: 4,
  rcs_casing_product_designation: "TEST-OWNED selected casing 530x10 with compatible 12m sections",
};
const id = (key: string) => `rcs:casing:${key}`;
const orderedId = id("ordered_casing_length_m");
const provenance = { kind: "manual", reason: "test-owned material quantity amendment" };
function compile(submittedParameters: Record<string, unknown> = fixture, rowOverrides?: Record<string, Record<string, unknown>>) {
  return compileCanonicalEstimateCore({ operation: rowOverrides ? "recalculate" : "compile", compilerVersion: "rcs-material-test",
    catalogId: "canonical-work:expanded:road_crossing_sleeves", primaryMeasureParameterId: "rcs_crossing_length_m",
    parameterDefinitions: [...definition.parameters], formulaDefinitions: [...definition.formulas], resourceDefinitions: [...definition.resources],
    submittedParameters, confirmedParameters: {}, priceItems: [], currencyCode: "KGS", maximumResourceRows: definition.resources.length,
    rowOverrides, hashJson: value => estimateDeterministicHash(value),
  });
}
const q = (result: Awaited<ReturnType<typeof compile>>, key: string) => Number(result.rows.find(row => row.row_id === id(key))?.quantity);

describe("selected casing material through the common quantity and cost owners", () => {
  it("calculates installed, cut, spare, compatible stock, whole pack order and free section balances", async () => {
    const result = await compile();
    expect(result.preliminaryNeeds).toHaveLength(0);
    for (const [key, value] of Object.entries({ installed_length_m: 35, wall_thickness_mm: 10, installed_section_count: 3,
      installed_whole_section_length_m: 36, cutting_remainder_m: 1, retained_spare_section_count: 1, total_section_need: 4,
      compatible_stock_section_count: 0, new_section_need: 4, supplier_bundle_count: 2, ordered_section_count: 4,
      ordered_casing_length_m: 48, remaining_whole_section_count: 1, free_section_count_beyond_spare: 0 })) expect(q(result, key)).toBe(value);
    expect(parameters).toHaveLength(1);
    expect(parameters[0]?.id).toBe("rcs_casing_product_designation");
  });
  it.each([12, 12.001, 24, 24.001, 35, 37])("length %s recalculates physical sections and packs without a derived question", async length => {
    const result = await compile({ ...fixture, rcs_crossing_length_m: length });
    const sections = Math.ceil(length / 12);
    const ordered = Math.ceil((sections + 1) / 2) * 2;
    expect(q(result, "installed_section_count")).toBe(sections);
    expect(q(result, "ordered_casing_length_m")).toBe(ordered * 12);
    expect(q(result, "cutting_remainder_m")).toBeCloseTo(sections * 12 - length, 6);
  });
  it("existing whole stock can eliminate the new order without treating a cut as another whole section", async () => {
    const result = await compile({ ...fixture, rcs_compatible_stock_section_count: 5 });
    expect(q(result, "ordered_casing_length_m")).toBe(0);
    expect(q(result, "cutting_remainder_m")).toBe(1);
    expect(q(result, "remaining_whole_section_count")).toBe(2);
    expect(q(result, "free_section_count_beyond_spare")).toBe(1);
  });
  it("a larger bundle changes the new order and surplus, not installed sections or the cutting remainder", async () => {
    const result = await compile({ ...fixture, rcs_supplier_bundle_section_count: 10 });
    expect(q(result, "installed_section_count")).toBe(3);
    expect(q(result, "cutting_remainder_m")).toBe(1);
    expect(q(result, "ordered_casing_length_m")).toBe(120);
    expect(q(result, "remaining_whole_section_count")).toBe(7);
    expect(q(result, "free_section_count_beyond_spare")).toBe(6);
  });
  it("owns only new selected casing metres, never another section, package, installed length or mass charge", async () => {
    const result = await compile();
    expect(result.rows.filter(row => row.included_in_estimate).map(row => row.row_id)).toEqual([orderedId]);
    expect(result.rows.filter(row => row.included_in_procurement).map(row => row.row_id)).toEqual([orderedId]);
    const order = result.rows.find(row => row.row_id === orderedId)!;
    expect(order.unit_id).toBe("m");
    expect(order.title_ru).toContain(fixture.rcs_casing_product_designation);
    expect(order.unit_price).toBeNull();
    const priced = await compile(fixture, { [orderedId]: { unitPrice: "10", provenance } });
    expect(priced.totals.amount).toBe("480");
  });
  it("does not invent the selected product even when a manual order quantity is supplied", async () => {
    const input = { ...fixture }; delete input.rcs_casing_product_designation;
    const result = await compile(input, { [orderedId]: { quantity: "100", provenance } });
    expect(result.rows.some(row => row.row_id === orderedId)).toBe(false);
    expect(result.preliminaryNeeds.find(need => need.row_id === orderedId)?.missing_parameter_ids).toContain("rcs_casing_product_designation");
    expect(q(result, "installed_section_count")).toBe(3);
  });
  it.each(["rcs_compatible_stock_section_count", "rcs_retained_spare_section_count", "rcs_supplier_bundle_section_count"])("unknown %s is not silently zero or one", async key => {
    const input = { ...fixture }; delete input[key];
    const result = await compile(input);
    expect(result.preliminaryNeeds.find(need => need.row_id === orderedId)?.missing_parameter_ids).toContain(key);
    expect(result.rows.some(row => row.row_id === orderedId)).toBe(false);
  });
  it("unknown preliminary density blocks only geometric mass, not a known selected metre order", async () => {
    const input = { ...fixture }; delete input.rcs_steel_density_kg_m3;
    const result = await compile(input);
    expect(q(result, "ordered_casing_length_m")).toBe(48);
    expect(result.preliminaryNeeds.map(need => need.row_id)).toEqual([
      id("preliminary_installed_steel_mass_kg"), id("preliminary_ordered_steel_mass_kg"),
    ]);
  });
  it("keeps a manual order pinned after a new primary length and explicitly returns to the current formula", async () => {
    const pin = { [orderedId]: { quantity: "96", provenance } };
    expect(q(await compile(fixture, pin), "ordered_casing_length_m")).toBe(96);
    const changed = { ...fixture, rcs_crossing_length_m: 37 };
    expect(q(await compile(changed, pin), "ordered_casing_length_m")).toBe(96);
    expect(q(await compile(changed, pin), "installed_length_m")).toBe(37);
    expect(q(await compile(changed), "ordered_casing_length_m")).toBe(72);
  });
  it.each([
    { rcs_casing_outside_diameter_mm: 510 }, { rcs_casing_inside_diameter_mm: 530 },
    { rcs_planned_physical_section_length_m: 0 }, { rcs_supplier_bundle_section_count: 0 },
    { rcs_compatible_stock_section_count: -1 }, { rcs_compatible_stock_section_count: 0.5 },
  ])("rejects impossible geometry and non-whole or invalid section facts: %j", async patch => {
    await expect(compile({ ...fixture, ...patch }, { [orderedId]: { quantity: "1", provenance } }))
      .rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
  it("does not supply a hidden designation, certified mass, price, delivery or full construction owner", () => {
    expect(definition.runtimeInput).toEqual({});
    expect(parameters.every(parameter => parameter.defaultValue == null)).toBe(true);
    expect(scope).toMatchObject({ fullOwner: false, engineeringAccepted: false });
    expect(rows.some(row => /weld|freight|labor|machine/u.test(row.rowId))).toBe(false);
    expect(scope.mass).toContain("not a payable kilogram");
    expect(scope.purchaseOverride).toContain("must be reconciled");
  });
});
