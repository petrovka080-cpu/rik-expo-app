import { buildAutomaticConstructionOwnerR1, type AutomaticRowSpec } from "../../src/lib/estimate/v4/automaticConstructionOwnerR1";
import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { ROAD_CROSSING_SLEEVES_QUANTITY_PARAMETERS_R1 } from "../../src/lib/estimate/v4/roadCrossingSleevesQuantityModelR1";
import { ROAD_CROSSING_SLEEVES_SPACER_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_SPACER_GEOMETRY_ROWS_R1 } from "../../src/lib/estimate/v4/roadCrossingSleevesSpacerGeometryR1";
import { ROAD_CROSSING_SLEEVES_PROCUREMENT_PARAMETERS_R1 as parameters, ROAD_CROSSING_SLEEVES_PROCUREMENT_ROWS_R1 as rows, ROAD_CROSSING_SLEEVES_PROCUREMENT_SCOPE_R1 as scope } from "../../src/lib/estimate/v4/roadCrossingSleevesProcurementR1";

const config = {
  contract: "rcs-supply-test", semanticOwner: "rcs-test", sourceId: "raci-specifications", normId: "selected-products-and-explicit-supply-facts",
  sourceMetadata: { source_title: "RACI supplied tape and full-width contact course", source_document_version: "web-2026-10-03", definition_hash: "a".repeat(64), exact_locator: "https://www.racispacers.com/specifications/", artifact_sha256: "a".repeat(64) },
  applicabilityRu: "Проверка баланса конкретных выбранных изделий; не полный переход и не проектная приёмка",
  ordinary: [...ROAD_CROSSING_SLEEVES_QUANTITY_PARAMETERS_R1, ...ROAD_CROSSING_SLEEVES_SPACER_PARAMETERS_R1, ...parameters],
  profile: [], conditional: [], excludedUnownedAssumptions: ["full crossing", "structural acceptance", "multi-course tape", "water-pressure seal approval"],
  rows: [...ROAD_CROSSING_SLEEVES_SPACER_GEOMETRY_ROWS_R1, ...rows],
};
const definition = buildAutomaticConstructionOwnerR1(config);
// Synthetic arithmetic/contract facts only, not an actual selected product,
// quotation, engineering solution or runtime profile/default.
const fixture: Record<string, number | string> = {
  rcs_crossing_length_m: 35, rcs_casing_outside_diameter_mm: 530, rcs_casing_inside_diameter_mm: 510,
  rcs_carrier_outside_diameter_mm: 160, rcs_planned_physical_section_length_m: 12,
  rcs_compatible_stock_section_count: 0, rcs_retained_spare_section_count: 1, rcs_supplier_bundle_section_count: 2,
  rcs_steel_density_kg_m3: 7850, rcs_raci_approved_ring_pitch_m: 2.5, rcs_raci_selected_elements_per_ring: 4,
  rcs_maximum_joint_envelope_diameter_mm: 200, rcs_raci_selected_element_height_mm: 100,
  rcs_raci_element_designation: "TEST-OWNED RACI element", rcs_element_technological_loss_count: 2,
  rcs_element_retained_spare_count: 4, rcs_element_compatible_stock_count: 10, rcs_element_supplier_pack_count: 10,
  rcs_end_seal_kit_designation: "TEST-OWNED compatible kit with included straps",
  rcs_end_seal_technological_loss_count: 0, rcs_end_seal_retained_spare_count: 1,
  rcs_end_seal_compatible_stock_count: 1, rcs_end_seal_supplier_pack_count: 2,
  rcs_contact_tape_designation: "TEST-OWNED same compatible tape for included and extra supply",
  rcs_raci_ring_width_mm: 40, rcs_contact_tape_width_mm: 50,
  rcs_tape_provided_m_per_element_pack: 1, rcs_tape_technological_loss_m: 0.25,
  rcs_tape_retained_spare_m: 1, rcs_tape_compatible_stock_m: 0.5, rcs_tape_supplier_roll_length_m: 5,
};
function compile(submittedParameters: Record<string, unknown> = fixture, rowOverrides?: Record<string, Record<string, unknown>>) {
  return compileCanonicalEstimateCore({
    operation: rowOverrides ? "recalculate" : "compile", compilerVersion: "rcs-supply-test", catalogId: "canonical-work:expanded:road_crossing_sleeves", primaryMeasureParameterId: "rcs_crossing_length_m",
    parameterDefinitions: [...definition.parameters], formulaDefinitions: [...definition.formulas], resourceDefinitions: [...definition.resources],
    submittedParameters, confirmedParameters: {}, priceItems: [], currencyCode: "KGS", maximumResourceRows: definition.resources.length,
    rowOverrides, hashJson: value => estimateDeterministicHash(value),
  });
}
const q = (result: Awaited<ReturnType<typeof compile>>, prefix: string, key: string) =>
  Number(result.rows.find(row => row.row_id === `rcs:${prefix}:${key}`)?.quantity);
const ownedReplacement = { kind: "manual", reason: "test-owned supply contract" };

describe("road casing selected-product supply through the shared canonical compiler", () => {
  it("reconciles supplied tape from the effective element packs before the separate tape order", async () => {
    const automatic = await compile();
    const manual = await compile(fixture, { "rcs:raci-elements:ordered": { quantity: "100", provenance: ownedReplacement } });
    expect(q(automatic, "raci-elements", "ordered")).toBe(70);
    expect(q(manual, "raci-elements", "packages")).toBe(10);
    expect(q(manual, "raci-elements", "remaining")).toBe(40);
    expect(q(manual, "contact-tape", "provided")).toBe(10);
    expect(q(manual, "contact-tape", "ordered")).toBeLessThan(q(automatic, "contact-tape", "ordered"));
    expect(q(manual, "raci-elements", "installed")).toBe(q(automatic, "raci-elements", "installed"));
    expect((await compile()).revisionProjection).toEqual(automatic.revisionProjection);
  });
  it("separates installed count, actual loss, reserve, stock, new packs and free remainder", async () => {
    const result = await compile();
    expect(result.preliminaryNeeds).toHaveLength(0);
    for (const [key, expected] of Object.entries({ installed: 68, loss: 2, spare: 4, stock: 10, total: 74, need: 64, packages: 7, ordered: 70, remaining: 10, free: 6 })) {
      expect(q(result, "raci-elements", key)).toBe(expected);
    }
    for (const [key, expected] of Object.entries({ installed: 2, loss: 0, spare: 1, stock: 1, total: 3, need: 2, packages: 1, ordered: 2, remaining: 1, free: 0 })) {
      expect(q(result, "end-seal-kits", key)).toBe(expected);
    }
    expect(q(result, "contact-tape", "provided")).toBe(7);
    expect(q(result, "contact-tape", "installed")).toBeCloseTo(17 * Math.PI * 0.160, 7);
    expect(q(result, "contact-tape", "ordered")).toBe(5);
    expect(q(result, "contact-tape", "remaining")).toBeCloseTo(0.5 + 7 + 5 - 17 * Math.PI * 0.160 - 0.25, 7);
    expect(q(result, "contact-tape", "free")).toBeCloseTo(q(result, "contact-tape", "remaining") - 1, 8);
  });

  it("owns only the three new material orders; included tape, balances and kit straps cannot be purchased twice", async () => {
    const result = await compile();
    const costRows = result.rows.filter(row => row.included_in_estimate);
    expect(costRows.map(row => row.row_id)).toEqual(["rcs:raci-elements:ordered", "rcs:end-seal-kits:ordered", "rcs:contact-tape:ordered"]);
    expect(result.rows.filter(row => row.included_in_procurement).map(row => row.row_id)).toEqual(costRows.map(row => row.row_id));
    expect(costRows.every(row => row.unit_price === null)).toBe(true);
    expect(costRows.every(row => typeof row.title_ru === "string" && row.title_ru.includes("TEST-OWNED"))).toBe(true);
    expect(result.rows.find(row => row.row_id === "rcs:contact-tape:provided")).toMatchObject({ included_in_estimate: false, included_in_procurement: false });
    expect(rows.some(row => /strap|fastener|хомут/u.test(row.rowId))).toBe(false);
    const priced = await compile(fixture, {
      "rcs:raci-elements:ordered": { unitPrice: "250", provenance: ownedReplacement },
      "rcs:end-seal-kits:ordered": { unitPrice: "300", provenance: ownedReplacement },
      "rcs:contact-tape:ordered": { unitPrice: "10", provenance: ownedReplacement },
    });
    expect(priced.totals.amount).toBe("18150");
  });

  it.each([1, 4, 10, 20])("element pack size %s changes new supply and its included tape, not installed quantities", async size => {
    const result = await compile({ ...fixture, rcs_element_supplier_pack_count: size });
    const expectedPacks = Math.ceil(64 / size);
    expect(q(result, "raci-elements", "packages")).toBe(expectedPacks);
    expect(q(result, "raci-elements", "ordered")).toBe(expectedPacks * size);
    expect(q(result, "raci-elements", "installed")).toBe(68);
    expect(q(result, "contact-tape", "provided")).toBe(expectedPacks);
    const additionalTape = Math.max(0, 17 * Math.PI * 0.160 + 0.25 + 1 - 0.5 - expectedPacks);
    expect(q(result, "contact-tape", "ordered")).toBe(Math.ceil(additionalTape / 5) * 5);
  });

  it("does not count tape from old whole elements or nonexistent new packs", async () => {
    const result = await compile({ ...fixture, rcs_element_compatible_stock_count: 74 });
    expect(q(result, "raci-elements", "ordered")).toBe(0);
    expect(q(result, "contact-tape", "provided")).toBe(0);
    expect(q(result, "contact-tape", "ordered")).toBe(10);
  });

  it("keeps excessive compatible stock and included tape as free remaining supply, never negative orders", async () => {
    const result = await compile({ ...fixture, rcs_end_seal_compatible_stock_count: 8, rcs_tape_provided_m_per_element_pack: 5 });
    expect(q(result, "end-seal-kits", "ordered")).toBe(0);
    expect(q(result, "end-seal-kits", "remaining")).toBe(6);
    expect(q(result, "end-seal-kits", "free")).toBe(5);
    expect(q(result, "contact-tape", "provided")).toBe(35);
    expect(q(result, "contact-tape", "ordered")).toBe(0);
    expect(q(result, "contact-tape", "free")).toBeGreaterThan(0);
  });

  it("recalculates installation and the linked purchase inclusion from a primary-length change", async () => {
    const result = await compile({ ...fixture, rcs_crossing_length_m: 36 });
    expect(q(result, "raci-elements", "installed")).toBe(72); // ceil(36/2.5)+3 = 18 rings
    expect(q(result, "raci-elements", "ordered")).toBe(70);
    expect(q(result, "raci-elements", "remaining")).toBe(6);
    expect(q(result, "contact-tape", "provided")).toBe(7);
    expect(q(result, "contact-tape", "installed")).toBeCloseTo(18 * Math.PI * 0.160, 7);
    expect(q(result, "end-seal-kits", "installed")).toBe(2);
  });

  it.each(["rcs_raci_ring_width_mm", "rcs_contact_tape_width_mm"])("unknown %s blocks only the relevant tape resource, including manual-quantity bypass", async id => {
    const input = { ...fixture };
    delete input[id];
    for (const override of [undefined, { "rcs:contact-tape:ordered": { quantity: "999", provenance: ownedReplacement } }]) {
      const result = await compile(input, override);
      expect(result.preliminaryNeeds.find(need => need.row_id === "rcs:contact-tape:ordered")).toMatchObject({
        missing_parameter_ids: [id], need_state: "CONDITION_REQUIRED", quantity: override ? "999" : "5",
      });
      expect(result.rows.some(row => row.row_id === "rcs:contact-tape:ordered")).toBe(false);
      expect(result.preliminaryNeeds.find(need => need.row_id === "rcs:contact-tape:width-compatibility")).toMatchObject({ missing_parameter_ids: [id], quantity: null });
      expect(q(result, "raci-elements", "ordered")).toBe(70);
      expect(q(result, "end-seal-kits", "ordered")).toBe(2);
    }
  });

  it("does not pretend a narrower tape is a compatible single course", async () => {
    await expect(compile({ ...fixture, rcs_contact_tape_width_mm: 39.999 }, {
      "rcs:contact-tape:ordered": { quantity: "999", provenance: ownedReplacement },
      "rcs:contact-tape:width-compatibility": { quantity: "999", provenance: ownedReplacement },
    })).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
    expect((await compile({ ...fixture, rcs_contact_tape_width_mm: 40 })).preliminaryNeeds).toHaveLength(0);
  });

  it("unknown quote inclusion is not silently zero and does not stop independent seal/element quantities", async () => {
    const input = { ...fixture };
    delete input.rcs_tape_provided_m_per_element_pack;
    const result = await compile(input);
    expect(result.preliminaryNeeds.find(need => need.row_id === "rcs:contact-tape:ordered")).toMatchObject({ missing_parameter_ids: ["rcs_tape_provided_m_per_element_pack"], quantity: null });
    expect(q(result, "raci-elements", "ordered")).toBe(70);
    expect(q(result, "end-seal-kits", "ordered")).toBe(2);
  });

  it("retains exact product selection as a required resource input, not a generic priced title", async () => {
    const input = { ...fixture };
    delete input.rcs_raci_element_designation;
    const result = await compile(input);
    expect(result.preliminaryNeeds.find(need => need.row_id === "rcs:raci-elements:ordered")).toMatchObject({ missing_parameter_ids: ["rcs_raci_element_designation"] });
    expect(result.preliminaryNeeds.find(need => need.row_id === "rcs:contact-tape:ordered")).toMatchObject({ missing_parameter_ids: ["rcs_raci_element_designation"] });
    expect(q(result, "end-seal-kits", "ordered")).toBe(2);
  });

  it("cannot use a supply override to hide failed authoritative spacer geometry", async () => {
    await expect(compile({ ...fixture, rcs_raci_selected_element_height_mm: 180 }, {
      "rcs:raci-elements:ordered": { quantity: "70", provenance: ownedReplacement },
    })).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
  });

  it("keeps an unknown spacer height local, including an explicit supply quantity; compatible seal demand still calculates", async () => {
    const input = { ...fixture };
    delete input.rcs_raci_selected_element_height_mm;
    const result = await compile(input, { "rcs:raci-elements:ordered": { quantity: "999", provenance: ownedReplacement } });
    expect(result.preliminaryNeeds.find(need => need.row_id === "rcs:raci-elements:ordered")).toMatchObject({ missing_parameter_ids: ["rcs_raci_selected_element_height_mm"], need_state: "CONDITION_REQUIRED" });
    expect(result.rows.some(row => row.row_id === "rcs:raci-elements:ordered")).toBe(false);
    expect(q(result, "end-seal-kits", "ordered")).toBe(2);
  });

  it.each([
    { rcs_element_technological_loss_count: -1 }, { rcs_element_supplier_pack_count: 0 },
    { rcs_element_compatible_stock_count: 0.5 }, { rcs_end_seal_supplier_pack_count: 1.5 },
    { rcs_tape_supplier_roll_length_m: 0 }, { rcs_tape_provided_m_per_element_pack: -1 },
  ])("rejects invalid loss, supply discreteness or roll/inclusion length: %j", async patch => {
    await expect(compile({ ...fixture, ...patch })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });

  it("rejects an undeclared non-arithmetic resource input at owner construction", () => {
    const invalid: AutomaticRowSpec = { ...rows[0], inputParameterIds: ["undeclared-project-fact"] };
    expect(() => buildAutomaticConstructionOwnerR1({ ...config, rows: [invalid] })).toThrow("AUTOMATIC_RESOURCE_INPUT_PARAMETER_INVALID");
  });

  it("has no hidden inputs, publication or full-owner/engineering acceptance claim", () => {
    expect(parameters.every(parameter => parameter.defaultValue == null)).toBe(true);
    expect(definition.runtimeInput).toEqual({});
    expect(scope).toMatchObject({ fullOwner: false, engineeringAccepted: false, tapeLayout: "ONE_FULL_WIDTH_COURSE_ONLY" });
  });
});
