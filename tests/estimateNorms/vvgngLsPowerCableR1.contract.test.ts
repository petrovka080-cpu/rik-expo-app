import {
  VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT, VVGNG_LS_POWER_CABLE_CATALOG_ID,
  VVGNG_LS_POWER_CABLE_FORMULAS, VVGNG_LS_POWER_CABLE_PARAMETERS,
  VVGNG_LS_POWER_CABLE_RESOURCES, VVGNG_LS_POWER_CABLE_RUNTIME_INPUT,
  VVGNG_LS_POWER_CABLE_SHORT_INPUT,
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
const DIRECT_RESOURCE_NEEDS = [
  "vvgng:labor:installation", "vvgng:labor:testing",
  "vvgng:equipment:reel-stand", "vvgng:equipment:pulling-device",
  "vvgng:equipment:crimp-tool", "vvgng:equipment:installation-tester",
  "vvgng:logistics:delivery", "vvgng:logistics:waste-removal",
] as const;
const MINIMUM_REAL_QUANTITY_NEEDS = Object.freeze({
  "rc09:fire_resistant_cable_marker": ["marker_quantity_piece"],
  "rc09:halogen_free_cable_clamp": ["clamp_quantity_piece"],
  "rc09:cable_gland_for_5x6": ["gland_quantity_piece"],
  "rc09:copper_lug_6mm2": ["lug_quantity_piece"],
  "rc09:firestop_cable_penetration_compound": ["firestop_quantity_kg"],
  "rc09:power_cable_insulation_continuity_test": ["test_count"],
});
const OPTIONAL_PRODUCT_DESIGNATIONS = [
  "marker_designation", "clamp_designation", "gland_designation",
  "lug_designation", "firestop_designation", "test_designation",
] as const;

describe("MASTER VVGng-LS power-cable owner", () => {
  test("uses net route geometry without importing historical rates", () => {
    expect(VVGNG_LS_POWER_CABLE_CATALOG_ID)
      .toBe("canonical-work:base:electrical_interior_vvg_cable_lay_standard");
    expect(VVGNG_LS_POWER_CABLE_PARAMETERS).toHaveLength(36);
    expect(VVGNG_LS_POWER_CABLE_FORMULAS).toHaveLength(25);
    expect(VVGNG_LS_POWER_CABLE_RESOURCES).toHaveLength(25);
    expect(VVGNG_LS_POWER_CABLE_RUNTIME_INPUT).toEqual({
      cable_expected_loss_ratio: 0,
      cable_retained_reserve_m: 0,
      cable_supplier_cut_increment_m: 1,
    });
    expect(JSON.stringify(VVGNG_LS_POWER_CABLE_FORMULAS))
      .not.toMatch(/golden_rate|normFactor|length_m\s*\*\s*(?:1\.04|0\.08|2|0\.014|0\.07|0\.025)/iu);
    expect(VVGNG_LS_POWER_CABLE_RESOURCES.map((row) => row.row_id))
      .not.toEqual(expect.arrayContaining(["rc09:switchboard", "rc09:building_full_power_system"]));
  });

  test("known 150 m route gives a useful visible balance and local resource needs", async () => {
    const compiled = await compileVvgngLsPowerCableR1({ ...VVGNG_LS_POWER_CABLE_SHORT_INPUT });
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "150", unit_id: "m" }),
      expect.objectContaining({ row_id: REQUIRED[1], quantity: "150", unit_id: "m" }),
    ]));
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "vvgng:balance:installed-net-length", quantity: "150" }),
      expect.objectContaining({ row_id: "vvgng:balance:expected-loss", quantity: "0" }),
      expect.objectContaining({ row_id: "vvgng:balance:retained-reserve", quantity: "0" }),
      expect.objectContaining({ row_id: "vvgng:balance:total-need", quantity: "150" }),
      expect.objectContaining({ row_id: "vvgng:balance:remainder-after-installation-loss",
        quantity: "0" }),
      expect.objectContaining({ row_id: "vvgng:balance:surplus-beyond-reserve", quantity: "0" }),
    ]));
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([
        ...REQUIRED.slice(2), ...CONDITIONAL, ...DIRECT_RESOURCE_NEEDS,
      ]));
    expect(compiled.preliminaryNeeds).toHaveLength(17);
    for (const [rowId, missingParameterIds] of Object.entries(MINIMUM_REAL_QUANTITY_NEEDS)) {
      expect(compiled.preliminaryNeeds.find((need) => need.row_id === rowId)
        ?.missing_parameter_ids).toEqual(missingParameterIds);
    }
    for (const parameterId of OPTIONAL_PRODUCT_DESIGNATIONS) {
      expect(VVGNG_LS_POWER_CABLE_PARAMETERS.find((parameter) =>
        parameter.parameter_id === parameterId)?.required).toBe(false);
    }
  });

  test("compiles the evidence-bound fixture with explicit labor, mechanisms and logistics", async () => {
    const compiled = await compileVvgngLsPowerCableR1({ ...VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(22);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[2], quantity: "12", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[3], quantity: "300", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[6], quantity: "3.75", unit_id: "kg" }),
      expect.objectContaining({ row_id: REQUIRED[7], quantity: "3", unit_id: "test" }),
      expect.objectContaining({ row_id: "vvgng:labor:installation", quantity: "24",
        unit_id: "man_hour" }),
      expect.objectContaining({ row_id: "vvgng:labor:testing", quantity: "3",
        unit_id: "man_hour" }),
      expect.objectContaining({ row_id: "vvgng:equipment:reel-stand", quantity: "4",
        unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: "vvgng:equipment:pulling-device", quantity: "5",
        unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: "vvgng:equipment:crimp-tool", quantity: "2",
        unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: "vvgng:equipment:installation-tester", quantity: "3",
        unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: "vvgng:logistics:delivery", quantity: "1",
        unit_id: "trip" }),
      expect.objectContaining({ row_id: "vvgng:logistics:waste-removal", quantity: "1",
        unit_id: "trip" }),
    ]));
    expect(compiled.rows.find((row) => row.row_id === REQUIRED[0])?.included_in_estimate)
      .toBe(false);
    expect(compiled.rows.find((row) => row.row_id === REQUIRED[7])?.included_in_estimate)
      .toBe(false);
  });

  test("separates installed length, loss, retained reserve, order and remainder", async () => {
    const compiled = await compileVvgngLsPowerCableR1({
      ...VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT,
      cable_expected_loss_ratio: 0.05,
      cable_retained_reserve_m: 5,
      cable_supplier_cut_increment_m: 100,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("vvgng:balance:installed-net-length")?.quantity).toBe("150");
    expect(rows.get("vvgng:balance:expected-loss")?.quantity).toBe("7.5");
    expect(rows.get("vvgng:balance:retained-reserve")?.quantity).toBe("5");
    expect(rows.get("vvgng:balance:total-need")?.quantity).toBe("162.5");
    expect(rows.get("rc09:vvgng_a_ls_5x6_cable")?.quantity).toBe("200");
    expect(rows.get("vvgng:balance:remainder-after-installation-loss")?.quantity).toBe("42.5");
    expect(rows.get("vvgng:balance:surplus-beyond-reserve")?.quantity).toBe("37.5");
    expect(compiled.rows.filter((row) => row.row_id.startsWith("vvgng:balance:")
      && row.included_in_procurement)).toEqual([]);
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
    expect(compiled.rows).toHaveLength(25);
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
