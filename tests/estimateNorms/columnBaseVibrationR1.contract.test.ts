import { BELT_VIBRATION_FORMULAS } from "../../src/lib/estimate/v4/beltVibrationR1";
import {
  COLUMN_BASE_VIBRATION_FORMULAS, COLUMN_BASE_VIBRATION_PARAMETERS,
  COLUMN_BASE_VIBRATION_RESOURCES, COLUMN_BASE_VIBRATION_TARGETS,
  columnBaseVibrationAcceptanceInputR1, compileColumnBaseVibrationR1,
} from "../../src/lib/estimate/v4/columnBaseVibrationR1";

describe("column-base vibration canonical family", () => {
  it("compiles all seven exact identities through the shared core", async () => {
    for (const target of COLUMN_BASE_VIBRATION_TARGETS) {
      const compiled = await compileColumnBaseVibrationR1(
        { ...columnBaseVibrationAcceptanceInputR1(target.contextKey) }, { catalogId: target.catalogId });
      expect(compiled.preliminaryNeeds).toEqual([]);
      expect(compiled.rows.some((row) => row.row_id === "work:concrete:column-base-vibration")).toBe(true);
      expect(compiled.rows.some((row) => row.row_id === "material:concrete:ready-mix")).toBe(false);
      expect(compiled.rows.some((row) => row.row_id.includes("formwork"))).toBe(false);
    }
  });
  it("reuses the accepted ACI graph and exposes missing calculation hours", async () => {
    expect(COLUMN_BASE_VIBRATION_FORMULAS).toBe(BELT_VIBRATION_FORMULAS);
    expect(COLUMN_BASE_VIBRATION_PARAMETERS).toHaveLength(13);
    expect(COLUMN_BASE_VIBRATION_RESOURCES).toHaveLength(4);
    const target = COLUMN_BASE_VIBRATION_TARGETS[0];
    const input = { ...columnBaseVibrationAcceptanceInputR1(target.contextKey) };
    for (const id of ["concrete_mix_reference", "placement_location", "method_statement_reference", "equipment_schedule_reference", "quality_plan_reference", "mobilization_scope_reference"]) delete input[id];
    delete input.vibration_worker_h;
    expect((await compileColumnBaseVibrationR1(input, { catalogId: target.catalogId })).preliminaryNeeds)
      .toEqual(expect.arrayContaining([expect.objectContaining({ missing_parameter_ids: ["vibration_worker_h"] })]));
  });
  it("rejects neighboring leveling identities", async () => {
    await expect(compileColumnBaseVibrationR1(columnBaseVibrationAcceptanceInputR1("standard"), {
      catalogId: "canonical-work:base:concrete_foundation_interior_column_base_level_standard",
    })).rejects.toThrow("COLUMN_BASE_VIBRATION_CATALOG_UNSUPPORTED");
  });
});
