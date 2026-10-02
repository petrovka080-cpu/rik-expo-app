import { compileFormulaGraph, evaluateFormulaGraph } from "../../src/lib/estimate/backendPlatform/formulaGraph";
import { validateCanonicalEstimateParameters } from "../../src/lib/estimate/backendPlatform/parameterConstraints";
import {
  ROAD_CROSSING_SLEEVES_QUANTITY_EXPRESSIONS_R1 as expressions,
  ROAD_CROSSING_SLEEVES_QUANTITY_PARAMETERS_R1 as specs,
  ROAD_CROSSING_SLEEVES_QUANTITY_SCOPE_R1 as scope,
} from "../../src/lib/estimate/v4/roadCrossingSleevesQuantityModelR1";

// Explicit synthetic inputs for arithmetic verification; not a selected product,
// load approval, WPS, universal engineering profile or owner publication.
const fixture = {
  rcs_crossing_length_m: 35,
  rcs_casing_outside_diameter_mm: 530,
  rcs_casing_inside_diameter_mm: 510,
  rcs_carrier_outside_diameter_mm: 160,
  rcs_planned_physical_section_length_m: 12,
  rcs_compatible_stock_section_count: 0,
  rcs_retained_spare_section_count: 1,
  rcs_supplier_bundle_section_count: 2,
  rcs_steel_density_kg_m3: 7850,
  rcs_raci_approved_ring_pitch_m: 2.5,
  rcs_raci_selected_elements_per_ring: 4,
};
const invalidPatches: readonly Record<string, number>[] = [
  { rcs_casing_inside_diameter_mm: 530 },
  { rcs_casing_inside_diameter_mm: 531 },
  { rcs_carrier_outside_diameter_mm: 510 },
  { rcs_crossing_length_m: 0 },
  { rcs_planned_physical_section_length_m: 0 },
  { rcs_supplier_bundle_section_count: 0 },
  { rcs_supplier_bundle_section_count: 1.5 },
  { rcs_compatible_stock_section_count: -1 },
  { rcs_compatible_stock_section_count: 0.5 },
  { rcs_raci_approved_ring_pitch_m: 3.01 },
  { rcs_raci_selected_elements_per_ring: 0 },
];
function quantities(patch: Record<string, number> = {}) {
  const parameters = validateCanonicalEstimateParameters(specs.map(s => ({
    parameter_id: s.id, value_type: s.valueType, required: true, default_value: null,
    constraints_json: { ...(s.min == null ? {} : { min: s.min }), ...(s.max == null ? {} : { max: s.max }), ...s.numericPeerConstraints },
  })), { ...fixture, ...patch });
  return Object.fromEntries(Object.entries(expressions).map(([id, expression]) => [
    id, Number(evaluateFormulaGraph(compileFormulaGraph(expression).ast, parameters as Record<string, number>)),
  ]));
}

describe("road casing quantity foundation through the existing FormulaGraph", () => {
  it("calculates physical sections, field joints, cutting remainder and separate purchase balance", () => {
    expect(quantities()).toMatchObject({
      installed_length_m: 35, wall_thickness_mm: 10,
      installed_section_count: 3, site_joint_count: 2,
      installed_whole_section_length_m: 36, cutting_remainder_m: 1,
      retained_spare_section_count: 1, total_section_need: 4,
      new_section_need: 4, supplier_bundle_count: 2,
      ordered_section_count: 4, ordered_casing_length_m: 48,
      remaining_whole_section_count: 1, free_section_count_beyond_spare: 0,
      raci_installed_ring_count: 17, raci_installed_element_count: 68,
      installed_end_seal_kit_count: 2,
    });
  });

  it.each([1, 2, 3, 10])("bundle size %s affects order, never installed sections, field welds or support layout", size => {
    const changed = quantities({ rcs_supplier_bundle_section_count: size });
    expect(changed.ordered_section_count).toBe(Math.ceil(4 / size) * size);
    for (const id of ["installed_section_count", "site_joint_count", "circumferential_site_weld_length_m", "raci_installed_ring_count", "raci_installed_element_count", "raci_installed_contact_tape_length_m"]) {
      expect(changed[id]).toBe(quantities()[id]);
    }
  });

  it.each([0, 1, 3, 4, 6])("counts %s whole compatible stock sections without consuming the retained reserve", stock => {
    const changed = quantities({ rcs_compatible_stock_section_count: stock });
    const expectedNew = Math.max(0, 3 + 1 - stock);
    const expectedOrder = Math.ceil(expectedNew / 2) * 2;
    expect(changed.new_section_need).toBe(expectedNew);
    expect(changed.ordered_section_count).toBe(expectedOrder);
    expect(changed.remaining_whole_section_count).toBe(stock + expectedOrder - 3);
    expect(changed.free_section_count_beyond_spare).toBe(stock + expectedOrder - 3 - 1);
    expect(changed.site_joint_count).toBe(2);
  });

  it.each([[12, 1, 0], [12.001, 2, 1], [24, 2, 1], [24.001, 3, 2]])("length %s crosses only the actual section boundary", (length, sections, joints) => {
    const q = quantities({ rcs_crossing_length_m: length });
    expect(q.installed_section_count).toBe(sections);
    expect(q.site_joint_count).toBe(joints);
    expect(q.installed_end_seal_kit_count).toBe(2);
  });

  it("uses explicit mm-to-m and kg-to-geometric-mass arithmetic, not a pipe strength selection", () => {
    const q = quantities();
    const steelArea = Math.PI / 4 * (0.530 ** 2 - 0.510 ** 2);
    expect(q.preliminary_installed_steel_mass_kg).toBeCloseTo(steelArea * 35 * 7850, 5);
    expect(q.preliminary_ordered_steel_mass_kg).toBeCloseTo(steelArea * 48 * 7850, 5);
    expect(q.circumferential_site_weld_length_m).toBeCloseTo(Math.PI * 0.530 * 2, 8);
    expect(q.raci_installed_contact_tape_length_m).toBeCloseTo(17 * Math.PI * 0.160, 8);
  });

  it.each(invalidPatches)("rejects invalid geometry, discrete supply or layout before formula evaluation: %j", patch => {
    expect(() => quantities(patch)).toThrow();
  });

  it("does not claim full scope, design approval or silently default an unknown project fact", () => {
    expect(scope.fullOwner).toBe(false);
    expect(scope.engineeringAccepted).toBe(false);
    expect(specs.every(s => s.defaultValue == null)).toBe(true);
  });
});
