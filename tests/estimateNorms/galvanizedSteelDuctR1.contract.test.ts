import {
  GALVANIZED_STEEL_DUCT_ACCEPTANCE_INPUT,
  GALVANIZED_STEEL_DUCT_CATALOG_ID,
  GALVANIZED_STEEL_DUCT_FORMULAS,
  GALVANIZED_STEEL_DUCT_PARAMETERS,
  GALVANIZED_STEEL_DUCT_RESOURCES,
  GALVANIZED_STEEL_DUCT_SHORT_INPUT,
  compileGalvanizedSteelDuctR1,
} from "../../src/lib/estimate/v4/galvanizedSteelDuctR1";

const REQUIRED = [
  "rc09:galvanized_duct_install",
  "rc09:rectangular_galvanized_duct_0_7mm",
  "rc09:duct_shaped_fittings_0_7mm",
  "rc09:duct_flange_sealing_tape",
  "rc09:duct_polymer_sealant_class_b",
  "rc09:duct_hanger_threaded_rod_m8",
  "rc09:duct_support_traverse",
  "rc09:duct_scissor_lift",
] as const;
const CONDITIONAL = [
  "rc09:duct_thermal_insulation",
  "rc09:duct_fireproofing",
  "rc09:equipment_flexible_connector",
] as const;

describe("MASTER galvanized-steel duct owner", () => {
  test("uses the narrow duct-install owner without importing historical linear rates", () => {
    expect(GALVANIZED_STEEL_DUCT_CATALOG_ID)
      .toBe("canonical-work:base:ventilation_interior_duct_install_standard");
    expect(GALVANIZED_STEEL_DUCT_PARAMETERS).toHaveLength(26);
    expect(GALVANIZED_STEEL_DUCT_FORMULAS).toHaveLength(11);
    expect(GALVANIZED_STEEL_DUCT_RESOURCES).toHaveLength(11);
    expect(JSON.stringify(GALVANIZED_STEEL_DUCT_FORMULAS))
      .not.toMatch(/golden_rate|normFactor|length_m\s*\*\s*(?:2\.2|0\.55|1\.6|0\.035|0\.8|0\.5|0\.015)/iu);
    expect(GALVANIZED_STEEL_DUCT_RESOURCES.map((row) => row.row_id))
      .not.toEqual(expect.arrayContaining([
        "rc09:air_handling_unit",
        "rc09:ventilation_fan",
        "rc09:air_terminal",
        "rc09:full_ventilation_system",
      ]));
  });

  test("known 120 m route gives work plus row-local voluntary needs", async () => {
    const compiled = await compileGalvanizedSteelDuctR1({
      ...GALVANIZED_STEEL_DUCT_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "120", unit_id: "m" }),
    ]);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([...REQUIRED.slice(1), ...CONDITIONAL]));
    expect(compiled.preliminaryNeeds).toHaveLength(10);
  });

  test("compiles the evidence-bound eight-row fixture", async () => {
    const compiled = await compileGalvanizedSteelDuctR1({
      ...GALVANIZED_STEEL_DUCT_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "120", unit_id: "m" }),
      expect.objectContaining({ row_id: REQUIRED[1], quantity: "264", unit_id: "m2" }),
      expect.objectContaining({ row_id: REQUIRED[2], quantity: "66", unit_id: "m2" }),
      expect.objectContaining({ row_id: REQUIRED[3], quantity: "192", unit_id: "m" }),
      expect.objectContaining({ row_id: REQUIRED[4], quantity: "4.2", unit_id: "l" }),
      expect.objectContaining({ row_id: REQUIRED[5], quantity: "96", unit_id: "m" }),
      expect.objectContaining({ row_id: REQUIRED[6], quantity: "60", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[7], quantity: "1.8", unit_id: "shift" }),
    ]));
    expect(compiled.rows).toHaveLength(8);
  });

  test("keeps insulation, fireproofing and flexible connectors conditional", async () => {
    const compiled = await compileGalvanizedSteelDuctR1({
      ...GALVANIZED_STEEL_DUCT_ACCEPTANCE_INPUT,
      thermal_insulation_mode: "REQUIRED",
      thermal_insulation_designation: "Теплоизоляция по спецификации",
      thermal_insulation_area_m2: 280,
      fireproofing_mode: "REQUIRED",
      fireproofing_designation: "Огнезащитное покрытие по проекту",
      fireproofing_area_m2: 42,
      flexible_connector_mode: "REQUIRED",
      flexible_connector_designation: "Гибкая вставка по узлу оборудования",
      flexible_connector_quantity_piece: 4,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(11);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: CONDITIONAL[0], quantity: "280", unit_id: "m2" }),
      expect.objectContaining({ row_id: CONDITIONAL[1], quantity: "42", unit_id: "m2" }),
      expect.objectContaining({ row_id: CONDITIONAL[2], quantity: "4", unit_id: "pcs" }),
    ]));
  });

  test("rejects invalid values and unrelated identities", async () => {
    await expect(compileGalvanizedSteelDuctR1({
      ...GALVANIZED_STEEL_DUCT_SHORT_INPUT,
      length_m: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileGalvanizedSteelDuctR1(
      { ...GALVANIZED_STEEL_DUCT_ACCEPTANCE_INPUT },
      { catalogId: `${GALVANIZED_STEEL_DUCT_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("GALVANIZED_STEEL_DUCT_CATALOG_UNSUPPORTED");
  });
});
