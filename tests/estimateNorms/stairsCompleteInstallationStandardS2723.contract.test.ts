import {
  STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_FINISHING_RUNTIME_INPUT,
  STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_FORMULAS,
  STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_INDEPENDENT_COMPLETENESS_MAP,
  STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_PARAMETERS,
  STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_RESOURCES,
  STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_SHORT_INPUT,
  compileStairsCompleteInstallationStandardS2723,
  stairsCompleteInstallationStandardAcceptanceInputS2723,
  stairsCompleteInstallationStandardMissingRowsS2723,
} from "../../src/lib/estimate/v4/stairsCompleteInstallationStandardS2723";

function quantity(
  rows: readonly Record<string, any>[],
  rowId: string,
): number {
  return Number(rows.find((row) => row.row_id === rowId)?.quantity);
}

describe("S27.23 complete standard monolithic concrete stairs composition", () => {
  it("shows an immediate independent estimate and keeps only dependent facts visible", async () => {
    const compiled = await compileStairsCompleteInstallationStandardS2723({
      ...STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_SHORT_INPUT,
    });
    const missing = new Set(
      compiled.preliminaryNeeds.flatMap((need) => need.missing_parameter_ids),
    );

    expect(compiled.rows).toHaveLength(24);
    expect(compiled.preliminaryNeeds).toHaveLength(52);
    expect(compiled.rows.filter((row) => row.included_in_procurement)).toHaveLength(11);
    expect(compiled.rows.some((row) =>
      row.row_id === "concrete-stairs-vibration:03:operation:internal-vibration"))
      .toBe(true);
    expect(compiled.rows.some((row) =>
      row.row_id === "concrete-stairs-vibration:04:consumable:cleaning-water"))
      .toBe(true);
    expect(missing.has("reinforcement_approved_reinforcement_schedule_weight_kg"))
      .toBe(true);
    expect(missing.has("formwork_measured_formwork_contact_area_m2")).toBe(true);
    expect(missing.has("finishing_exposed_surface_area_m2")).toBe(true);
    expect(missing.has("external_curing_approved_external_curing_method")).toBe(true);
    expect([...missing].some((parameterId) => parameterId.startsWith("vibration_")))
      .toBe(false);
    expect([...missing]).not.toContain("reinforcement_applicable");
    expect([...missing]).not.toContain("temporary_formwork_applicable");
    expect([...missing].some((parameterId) =>
      parameterId.startsWith("technical_room_")
      || parameterId.startsWith("high_load_"))).toBe(false);
  });

  it("composes all six technology stages and their resources without legacy double count", async () => {
    const compiled = await compileStairsCompleteInstallationStandardS2723({
      ...stairsCompleteInstallationStandardAcceptanceInputS2723(),
    });
    const rowIds = new Set(compiled.rows.map((row) => row.row_id));

    expect(compiled.rows).toHaveLength(58);
    expect(compiled.rows.filter((row) => row.included_in_estimate)).toHaveLength(48);
    expect(compiled.rows.filter((row) => row.included_in_procurement)).toHaveLength(34);
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(stairsCompleteInstallationStandardMissingRowsS2723(rowIds)).toEqual([]);
    expect(STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_INDEPENDENT_COMPLETENESS_MAP
      .entries.map((entry) => entry.semanticKey)).toEqual([
      "temporary-formwork",
      "reinforcement",
      "concrete-supply-and-placement",
      "internal-vibration",
      "primary-surface-finishing",
      "external-curing",
    ]);

    expect(rowIds.has("work:concrete:place")).toBe(true);
    expect(rowIds.has("work:concrete:place-and-compact")).toBe(false);
    expect(rowIds.has("equipment:concrete:deep-vibrator")).toBe(false);
    expect(rowIds.has("work:concrete:finish-surface")).toBe(false);
    expect(rowIds.has("work:concrete:cure")).toBe(false);
    expect(rowIds.has("material:concrete:curing-membrane")).toBe(false);
    expect(quantity(compiled.rows, "concrete-stairs-vibration:04:labor:cleaning"))
      .toBe(0.25);
    expect(quantity(compiled.rows,
      "concrete-stairs-vibration:04:consumable:cleaning-water")).toBe(0.025);
  });

  it("recalculates concrete and detailed vibration while charging cleaning once", async () => {
    const changed = await compileStairsCompleteInstallationStandardS2723({
      ...stairsCompleteInstallationStandardAcceptanceInputS2723(),
      stairs_concrete_volume_m3: 20,
    });

    expect(quantity(changed.rows, "material:concrete:ready-mix")).toBe(21.2);
    expect(quantity(changed.rows,
      "concrete-stairs-vibration:03:labor:vibration-crew")).toBe(25);
    expect(quantity(changed.rows,
      "concrete-stairs-vibration:03:equipment:active-vibrator"))
      .toBeCloseTo(6.666666667, 8);
    expect(quantity(changed.rows,
      "concrete-stairs-vibration:03:equipment:rental-shifts")).toBe(1);
    expect(quantity(changed.rows,
      "concrete-stairs-vibration:03:material:electricity"))
      .toBeCloseTo(5.866666667, 8);
    expect(quantity(changed.rows,
      "concrete-stairs-vibration:04:labor:cleaning")).toBe(0.25);
    expect(quantity(changed.rows,
      "concrete-stairs-vibration:04:consumable:cleaning-water")).toBe(0.025);
  });

  it("automatically recalculates the visible finishing profile and accepts curing takeoff edits", async () => {
    const changed = await compileStairsCompleteInstallationStandardS2723({
      ...stairsCompleteInstallationStandardAcceptanceInputS2723(),
      finishing_exposed_surface_area_m2: 100,
      external_curing_curing_water_m3: 3,
      external_curing_wet_covering_area_m2: 110,
    });

    expect(quantity(changed.rows,
      "work:concrete:stairs-primary-surface-finishing")).toBe(100);
    expect(quantity(changed.rows,
      "labor:concrete:stairs-primary-surface-finishing")).toBe(50);
    expect(quantity(changed.rows,
      "equipment:concrete:stairs-finishing-hand-tools")).toBe(2);
    expect(quantity(changed.rows, "material:concrete:curing-water")).toBe(3);
    expect(quantity(changed.rows, "material:concrete:wet-curing-covering")).toBe(110);
  });

  it("publishes unique graph identities and visible replaceable finishing assumptions", () => {
    const unique = (values: readonly string[]) => new Set(values).size === values.length;
    expect(unique(STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_PARAMETERS
      .map((parameter) => parameter.parameter_id))).toBe(true);
    expect(unique(STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_FORMULAS
      .map((formula) => formula.formula_id))).toBe(true);
    expect(unique(STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_RESOURCES
      .map((resource) => resource.row_id))).toBe(true);
    expect(STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_FINISHING_RUNTIME_INPUT)
      .toEqual({
        finishing_method: "AS_CAST_HAND_TROWEL",
        finishing_labor_productivity_m2_per_man_hour: 2,
        finishing_tool_set_coverage_m2_per_set: 50,
        finishing_quality_record_count: 1,
    });
    expect(STAIRS_COMPLETE_INSTALLATION_STANDARD_S2723_RESOURCES.every(
      (resource) => resource.source_metadata?.synthetic === false,
    )).toBe(true);
  });
});
