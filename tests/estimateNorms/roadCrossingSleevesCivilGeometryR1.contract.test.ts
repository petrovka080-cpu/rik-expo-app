import { buildAutomaticConstructionOwnerR1 } from "../../src/lib/estimate/v4/automaticConstructionOwnerR1";
import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { ROAD_CROSSING_SLEEVES_QUANTITY_PARAMETERS_R1 } from "../../src/lib/estimate/v4/roadCrossingSleevesQuantityModelR1";
import {
  ROAD_CROSSING_SLEEVES_CIVIL_METHODS_R1 as methods, ROAD_CROSSING_SLEEVES_CIVIL_PARAMETERS_R1 as parameters,
  ROAD_CROSSING_SLEEVES_CIVIL_ROWS_R1 as rows, ROAD_CROSSING_SLEEVES_CIVIL_SCOPE_R1 as scope,
} from "../../src/lib/estimate/v4/roadCrossingSleevesCivilGeometryR1";

const definition = buildAutomaticConstructionOwnerR1({
  contract: "rcs-civil-geometry-test", semanticOwner: "rcs-test", sourceId: "project-dimensions", normId: "explicit-rectangular-geometry-not-design",
  sourceMetadata: { source_title: "Explicit project geometry test; PJA method boundary", source_document_version: "test-2026-10-03", definition_hash: "a".repeat(64), exact_locator: "https://www.pipejacking.org/about_pipe_jacking", artifact_sha256: "a".repeat(64) },
  applicabilityRu: "Только арифметика выбранных прямоугольных размеров; не проект разработки, опор, водопонижения или полный переход",
  ordinary: [...ROAD_CROSSING_SLEEVES_QUANTITY_PARAMETERS_R1, ...parameters.filter(p => p.kind === "ordinary")], profile: [],
  conditional: parameters.filter(p => p.kind === "conditional"), rows, excludedUnownedAssumptions: ["soil suitability", "haul/disposal", "reaction capacity", "groundwater", "construction resources"],
});
// All dimensions are owned synthetic arithmetic fixtures, not approved works.
const casing = {
  rcs_crossing_length_m: 35, rcs_casing_outside_diameter_mm: 530, rcs_casing_inside_diameter_mm: 510,
  rcs_carrier_outside_diameter_mm: 160, rcs_planned_physical_section_length_m: 12,
  rcs_compatible_stock_section_count: 0, rcs_retained_spare_section_count: 0, rcs_supplier_bundle_section_count: 1,
  rcs_steel_density_kg_m3: 7850, rcs_raci_approved_ring_pitch_m: 2.5, rcs_raci_selected_elements_per_ring: 4,
};
const open: Record<string, unknown> = {
  ...casing, rcs_civil_installation_method: methods.openCut,
  rcs_open_cut_excavation_width_m: 1.5, rcs_open_cut_excavation_depth_m: 2,
  rcs_open_cut_full_width_bedding_thickness_m: 0.1,
};
const jacking: Record<string, unknown> = {
  ...casing, rcs_civil_installation_method: methods.pipeJacking,
  rcs_jacking_thrust_excavation_length_m: 6, rcs_jacking_thrust_excavation_width_m: 4, rcs_jacking_thrust_excavation_depth_m: 3,
  rcs_jacking_reception_excavation_length_m: 4, rcs_jacking_reception_excavation_width_m: 3, rcs_jacking_reception_excavation_depth_m: 2.5,
  rcs_jacking_confirmed_excavation_diameter_mm: 580,
};
const id = (key: string) => `rcs:civil:${key}`;
async function compile(submittedParameters: Record<string, unknown>, rowOverrides?: Record<string, Record<string, unknown>>) {
  return compileCanonicalEstimateCore({
    operation: rowOverrides ? "recalculate" : "compile", compilerVersion: "rcs-civil-test", catalogId: "canonical-work:expanded:road_crossing_sleeves", primaryMeasureParameterId: "rcs_crossing_length_m",
    parameterDefinitions: [...definition.parameters], formulaDefinitions: [...definition.formulas], resourceDefinitions: [...definition.resources],
    submittedParameters, confirmedParameters: {}, priceItems: [], currencyCode: "KGS", maximumResourceRows: definition.resources.length,
    rowOverrides, hashJson: value => estimateDeterministicHash(value),
  });
}
const q = (result: Awaited<ReturnType<typeof compile>>, key: string) => Number(result.rows.find(row => row.row_id === id(key))?.quantity);
const provenance = { kind: "manual", reason: "test-owned geometry override" };

describe("method-specific road-casing project geometry in the canonical compiler", () => {
  it("calculates open excavation, bedding and outside fill space without asking for derived volumes", async () => {
    const result = await compile(open);
    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(result.rows).toHaveLength(7);
    expect(result.rows.every(row => String(row.row_id).includes("open_cut"))).toBe(true);
    expect(q(result, "open_cut_plan_area_m2")).toBe(52.5);
    expect(q(result, "open_cut_excavation_m3")).toBe(105);
    expect(q(result, "open_cut_full_width_bedding_m3")).toBe(5.25);
    const displaced = Math.PI / 4 * 0.530 ** 2 * 35;
    expect(q(result, "open_cut_casing_displacement_m3")).toBeCloseTo(displaced, 7);
    expect(q(result, "open_cut_remaining_fill_space_m3")).toBeCloseTo(105 - 5.25 - displaced, 7);
  });

  it("uses actual start/reception pits and excavation diameter for jacking, never an additional full-length trench", async () => {
    const result = await compile(jacking);
    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(result.rows).toHaveLength(5);
    expect(result.rows.every(row => String(row.row_id).includes("jacking"))).toBe(true);
    expect(q(result, "jacking_thrust_pit_excavation_m3")).toBe(72);
    expect(q(result, "jacking_reception_pit_excavation_m3")).toBe(30);
    const bore = Math.PI / 4 * 0.580 ** 2 * 35;
    expect(q(result, "jacking_bore_excavation_m3")).toBeCloseTo(bore, 7);
    expect(q(result, "jacking_total_geometric_excavation_m3")).toBeCloseTo(72 + 30 + bore, 7);
    expect(q(result, "jacking_excavation_casing_diameter_difference_mm")).toBe(50);
  });

  it.each([methods.openCut, methods.pipeJacking])("retained valid facts from the inactive method do not create its resources: %s", async method => {
    const result = await compile({ ...open, ...jacking, rcs_civil_installation_method: method });
    expect(result.rows).toHaveLength(method === methods.openCut ? 7 : 5);
    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(result.rows.every(row => row.section === `Геометрия: ${method}`)).toBe(true);
  });

  it("keeps an unknown pit dimension local, rather than guessing pit size from crossing length", async () => {
    const input = { ...jacking };
    delete input.rcs_jacking_reception_excavation_width_m;
    const result = await compile(input);
    expect(result.preliminaryNeeds.map(need => need.row_id)).toEqual([
      id("jacking_reception_pit_excavation_m3"), id("jacking_total_geometric_excavation_m3"),
    ]);
    expect(result.preliminaryNeeds.every(need => need.quantity === null && need.missing_parameter_ids.join() === "rcs_jacking_reception_excavation_width_m")).toBe(true);
    expect(q(result, "jacking_thrust_pit_excavation_m3")).toBe(72);
    expect(q(result, "jacking_bore_excavation_m3")).toBeCloseTo(Math.PI / 4 * 0.580 ** 2 * 35, 7);
  });

  it("does not silently choose a method, including when a manual row quantity is provided", async () => {
    const input = { ...open, ...jacking };
    delete input.rcs_civil_installation_method;
    const result = await compile(input, { [id("open_cut_excavation_m3")]: { quantity: "999", provenance } });
    expect(result.rows).toHaveLength(0);
    expect(result.preliminaryNeeds).toHaveLength(12);
    expect(result.preliminaryNeeds.every(need => need.need_state === "CONDITION_REQUIRED" && need.missing_parameter_ids.includes("rcs_civil_installation_method"))).toBe(true);
  });

  it("scales only the continuous excavation with length; approved pit dimensions stay actual facts", async () => {
    const before = await compile(jacking);
    const after = await compile({ ...jacking, rcs_crossing_length_m: 70 });
    expect(q(after, "jacking_thrust_pit_excavation_m3")).toBe(q(before, "jacking_thrust_pit_excavation_m3"));
    expect(q(after, "jacking_reception_pit_excavation_m3")).toBe(q(before, "jacking_reception_pit_excavation_m3"));
    expect(q(after, "jacking_bore_excavation_m3")).toBeCloseTo(2 * q(before, "jacking_bore_excavation_m3"), 8);
    const longerOpen = await compile({ ...open, rcs_crossing_length_m: 70, rcs_supplier_bundle_section_count: 10 });
    expect(q(longerOpen, "open_cut_excavation_m3")).toBe(210);
    expect(q(longerOpen, "open_cut_full_width_bedding_m3")).toBe(10.5);
  });

  it.each([
    { rcs_open_cut_excavation_width_m: 0.529999 },
    { rcs_open_cut_excavation_depth_m: 0.629999 },
    { rcs_open_cut_full_width_bedding_thickness_m: 2.1 },
  ])("rejects impossible selected open-cut geometry before manual control replacements: %j", async patch => {
    await expect(compile({ ...open, ...patch }, Object.fromEntries(rows.filter(row => row.formulaOutputBounds).map(row => [row.rowId, { quantity: "999", provenance }]))))
      .rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
  });

  it("rejects excavation diameter smaller than the casing without clamping or a manual bypass", async () => {
    await expect(compile({ ...jacking, rcs_jacking_confirmed_excavation_diameter_mm: 529.999 }, {
      [id("jacking_excavation_casing_diameter_difference_mm")]: { quantity: "999", provenance },
    })).rejects.toMatchObject({ code: "FORMULA_OUTPUT_BOUNDS_FAILED" });
  });

  it("allows explicit zero bedding and exact geometric boundaries without asserting design adequacy", async () => {
    const result = await compile({ ...open, rcs_open_cut_excavation_width_m: 0.530, rcs_open_cut_excavation_depth_m: 0.530, rcs_open_cut_full_width_bedding_thickness_m: 0 });
    expect(q(result, "open_cut_width_difference_m")).toBe(0);
    expect(q(result, "open_cut_depth_difference_above_bedding_m")).toBe(0);
    expect(q(result, "open_cut_full_width_bedding_m3")).toBe(0);
    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(scope.engineeringAccepted).toBe(false);
  });

  it("rejects unsupported method, zero/nonfinite dimensions and negative bedding", async () => {
    for (const patch of [{ rcs_civil_installation_method: "HDD" }, { rcs_open_cut_excavation_width_m: 0 }, { rcs_open_cut_excavation_depth_m: Infinity }, { rcs_open_cut_full_width_bedding_thickness_m: -1 }]) {
      await expect(compile({ ...open, ...patch })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    }
  });

  it("keeps all geometric controls informational, with no invented paid operation, default or full-owner claim", async () => {
    const result = await compile(jacking);
    expect(result.rows.every(row => !row.included_in_estimate && !row.included_in_procurement)).toBe(true);
    expect(result.totals.amount).toBe("0");
    expect(parameters.every(parameter => parameter.defaultValue == null)).toBe(true);
    expect(definition.runtimeInput).toEqual({});
    expect(scope.fullOwner).toBe(false);
    expect(parameters.map(parameter => parameter.id).join()).not.toMatch(/volume|haul|machine|labor/u);
  });
});
