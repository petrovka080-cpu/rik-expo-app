import { buildAutomaticConstructionOwnerR1 } from "../../src/lib/estimate/v4/automaticConstructionOwnerR1";
import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { ROAD_CROSSING_SLEEVES_QUANTITY_PARAMETERS_R1 } from "../../src/lib/estimate/v4/roadCrossingSleevesQuantityModelR1";
import { ROAD_CROSSING_SLEEVES_SPACER_PARAMETERS_R1 as parameters, ROAD_CROSSING_SLEEVES_SPACER_GEOMETRY_ROWS_R1 as rows } from "../../src/lib/estimate/v4/roadCrossingSleevesSpacerGeometryR1";

// Explicit arithmetic fixture, not a load-rated element selection or approval.
const definition = buildAutomaticConstructionOwnerR1({
  contract: "rcs-spacer-geometry-test", semanticOwner: "rcs-test", sourceId: "raci-choosing-a-spacer", normId: "raci-specific-selection-geometry",
  sourceMetadata: { source_title: "RACI selection formulas 2 and 3", source_document_version: "web-2026-10-02", definition_hash: "a".repeat(64), exact_locator: "https://www.racispacers.com/choosing-a-spacer/", artifact_sha256: "a".repeat(64) },
  applicabilityRu: "Геометрическая совместимость выбранных опор RACI, не подтверждение нагрузочной способности",
  ordinary: [...ROAD_CROSSING_SLEEVES_QUANTITY_PARAMETERS_R1, ...parameters], profile: [], conditional: [], excludedUnownedAssumptions: ["load approval", "complete crossing scope"],
  rows: [{ rowId: "rcs:length", section: "Scope", category: "service", title: "Scope", unitId: "m", formulaId: "rcs:length", expression: "rcs_crossing_length_m", costTreatment: "INFORMATIONAL_SCOPE" }, ...rows],
});
const fixture: Record<string, number> = {
  rcs_crossing_length_m: 35, rcs_casing_outside_diameter_mm: 530, rcs_casing_inside_diameter_mm: 510,
  rcs_carrier_outside_diameter_mm: 160, rcs_planned_physical_section_length_m: 12,
  rcs_compatible_stock_section_count: 0, rcs_retained_spare_section_count: 1, rcs_supplier_bundle_section_count: 2,
  rcs_steel_density_kg_m3: 7850, rcs_raci_approved_ring_pitch_m: 2.5, rcs_raci_selected_elements_per_ring: 4,
  rcs_maximum_joint_envelope_diameter_mm: 200, rcs_raci_selected_element_height_mm: 100,
};
function compile(submittedParameters: Record<string, unknown> = fixture, rowOverrides?: Record<string, Record<string, unknown>>) {
  return compileCanonicalEstimateCore({
    operation: rowOverrides ? "recalculate" : "compile", compilerVersion: "rcs-spacer-test", catalogId: "canonical-work:expanded:road_crossing_sleeves", primaryMeasureParameterId: "rcs_crossing_length_m",
    parameterDefinitions: [...definition.parameters], formulaDefinitions: [...definition.formulas], resourceDefinitions: [...definition.resources],
    submittedParameters, confirmedParameters: {}, priceItems: [], currencyCode: "KGS", maximumResourceRows: definition.resources.length,
    rowOverrides, hashJson: value => estimateDeterministicHash(value),
  });
}

describe("RACI-specific road-casing geometry through the shared canonical compiler", () => {
  it("derives assembled geometry from actual facts without asking for a second independent diameter", async () => {
    const result = await compile();
    expect(result.rows.map(r => [r.row_id, r.quantity])).toEqual([
      ["rcs:length", "35"], ["rcs:raci_assembled_diameter", "360"],
      ["rcs:raci_joint_diametral_difference", "160"], ["rcs:raci_insertion_diametral_difference", "150"],
    ]);
    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(result.rows.every(r => !r.included_in_estimate && !r.included_in_procurement)).toBe(true);
    expect(result.totals.amount).toBe("0");
    expect(parameters.every(p => p.defaultValue == null)).toBe(true);
  });

  it.each([
    { rcs_maximum_joint_envelope_diameter_mm: 345 }, // exact 15 mm is NOT enough
    { rcs_maximum_joint_envelope_diameter_mm: 345.001 },
    { rcs_raci_selected_element_height_mm: 167.5 }, // exact 15 mm is NOT enough
    { rcs_raci_selected_element_height_mm: 167.501 },
    { rcs_raci_selected_element_height_mm: 180 }, // negative insertion difference
  ])("rejects insufficient actual geometry without clamping: %j", async patch => {
    await expect(compile({ ...fixture, ...patch })).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
  });

  it.each([
    { rcs_maximum_joint_envelope_diameter_mm: 344.999 },
    { rcs_raci_selected_element_height_mm: 167.4995 },
  ])("accepts geometry strictly above the manufacturer's diametral boundary: %j", async patch => {
    const result = await compile({ ...fixture, ...patch });
    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(result.rows.filter(r => (r.calculation_trace as Record<string, unknown>).formulaOutputBounds)).toHaveLength(2);
  });

  it("cannot disguise incompatible geometry with an editable manual control quantity", async () => {
    await expect(compile({ ...fixture, rcs_raci_selected_element_height_mm: 180 }, {
      "rcs:raci_insertion_diametral_difference": { quantity: "999", provenance: { kind: "manual", reason: "test-owned replacement" } },
    })).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
  });

  it("keeps an unknown joint envelope local, while known assembled and insertion dimensions still calculate", async () => {
    const input = { ...fixture };
    delete input.rcs_maximum_joint_envelope_diameter_mm;
    const result = await compile(input);
    expect(result.preliminaryNeeds).toHaveLength(1);
    expect(result.preliminaryNeeds[0]).toMatchObject({ row_id: "rcs:raci_joint_diametral_difference", missing_parameter_ids: ["rcs_maximum_joint_envelope_diameter_mm"], quantity: null });
    expect(result.rows.find(r => r.row_id === "rcs:raci_assembled_diameter")?.quantity).toBe("360");
    expect(result.rows.find(r => r.row_id === "rcs:raci_insertion_diametral_difference")?.quantity).toBe("150");
  });

  it("recalculates geometry from changed source facts, never from supply-pack size", async () => {
    const result = await compile({ ...fixture, rcs_carrier_outside_diameter_mm: 180, rcs_supplier_bundle_section_count: 10 });
    expect(result.rows.slice(1).map(r => r.quantity)).toEqual(["380", "180", "130"]);
  });

  it("rejects a joint envelope smaller than the pipe using the same-unit peer contract", async () => {
    await expect(compile({ ...fixture, rcs_maximum_joint_envelope_diameter_mm: 159 })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
});
