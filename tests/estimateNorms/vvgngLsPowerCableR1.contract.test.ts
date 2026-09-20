import {
  VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT, VVGNG_LS_POWER_CABLE_CATALOG_ID,
  VVGNG_LS_POWER_CABLE_FORMULAS, VVGNG_LS_POWER_CABLE_PARAMETERS,
  VVGNG_LS_POWER_CABLE_RESOURCES, VVGNG_LS_POWER_CABLE_SHORT_INPUT,
  compileVvgngLsPowerCableR1,
} from "../../src/lib/estimate/v4/vvgngLsPowerCableR1";

const REQUIRED = [
  "rc09:vvgng_ls_cable_lay", "rc09:vvgng_a_ls_5x6_cable",
  "rc09:fire_resistant_cable_marker", "rc09:halogen_free_cable_clamp",
  "rc09:cable_gland_for_5x6", "rc09:copper_lug_6mm2",
  "rc09:firestop_cable_penetration_compound", "rc09:power_cable_insulation_continuity_test",
] as const;
const CONDITIONAL = ["rc09:cable_tray", "rc09:cable_protective_pipe",
  "rc09:cable_pulling_lubricant"] as const;

describe("MASTER VVGng-LS power-cable owner", () => {
  test("uses net route geometry without importing historical rates", () => {
    expect(VVGNG_LS_POWER_CABLE_CATALOG_ID)
      .toBe("canonical-work:base:electrical_interior_vvg_cable_lay_standard");
    expect(VVGNG_LS_POWER_CABLE_PARAMETERS).toHaveLength(25);
    expect(VVGNG_LS_POWER_CABLE_FORMULAS).toHaveLength(11);
    expect(VVGNG_LS_POWER_CABLE_RESOURCES).toHaveLength(11);
    expect(JSON.stringify(VVGNG_LS_POWER_CABLE_FORMULAS))
      .not.toMatch(/golden_rate|normFactor|length_m\s*\*\s*(?:1\.04|0\.08|2|0\.014|0\.07|0\.025)/iu);
    expect(VVGNG_LS_POWER_CABLE_RESOURCES.map((row) => row.row_id))
      .not.toEqual(expect.arrayContaining(["rc09:switchboard", "rc09:building_full_power_system"]));
  });

  test("known 150 m route gives work and net cable plus local needs", async () => {
    const compiled = await compileVvgngLsPowerCableR1({ ...VVGNG_LS_POWER_CABLE_SHORT_INPUT });
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "150", unit_id: "m" }),
      expect.objectContaining({ row_id: REQUIRED[1], quantity: "150", unit_id: "m" }),
    ]));
    expect(compiled.rows).toHaveLength(2);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([...REQUIRED.slice(2), ...CONDITIONAL]));
    expect(compiled.preliminaryNeeds).toHaveLength(9);
  });

  test("compiles the evidence-bound eight-row fixture", async () => {
    const compiled = await compileVvgngLsPowerCableR1({ ...VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[2], quantity: "12", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[3], quantity: "300", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[6], quantity: "3.75", unit_id: "kg" }),
      expect.objectContaining({ row_id: REQUIRED[7], quantity: "3", unit_id: "test" }),
    ]));
  });

  test("keeps tray, protective pipe and pulling lubricant conditional", async () => {
    const compiled = await compileVvgngLsPowerCableR1({
      ...VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT,
      cable_tray_mode: "REQUIRED", cable_tray_designation: "Лоток по проекту",
      cable_tray_length_m: 90, protective_pipe_mode: "REQUIRED",
      protective_pipe_designation: "Труба по узлу", protective_pipe_length_m: 12,
      pulling_lubricant_mode: "REQUIRED", pulling_lubricant_designation: "Смазка по ППР",
      pulling_lubricant_quantity_kg: 2.5,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(11);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: CONDITIONAL[0], quantity: "90", unit_id: "m" }),
      expect.objectContaining({ row_id: CONDITIONAL[1], quantity: "12", unit_id: "m" }),
      expect.objectContaining({ row_id: CONDITIONAL[2], quantity: "2.5", unit_id: "kg" }),
    ]));
  });

  test("rejects invalid values and unrelated identities", async () => {
    await expect(compileVvgngLsPowerCableR1({ ...VVGNG_LS_POWER_CABLE_SHORT_INPUT,
      length_m: 0 })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileVvgngLsPowerCableR1({ ...VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT },
      { catalogId: `${VVGNG_LS_POWER_CABLE_CATALOG_ID}:unsupported` }))
      .rejects.toThrow("VVGNG_LS_POWER_CABLE_CATALOG_UNSUPPORTED");
  });
});
