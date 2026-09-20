import {
  STEEL_COLUMNS_BEAMS_INSTALLATION_ACCEPTANCE_INPUT,
  STEEL_COLUMNS_BEAMS_INSTALLATION_CATALOG_ID,
  STEEL_COLUMNS_BEAMS_INSTALLATION_FORMULAS,
  STEEL_COLUMNS_BEAMS_INSTALLATION_PARAMETERS,
  STEEL_COLUMNS_BEAMS_INSTALLATION_RESOURCES,
  STEEL_COLUMNS_BEAMS_INSTALLATION_SHORT_INPUT,
  compileSteelColumnsBeamsInstallationR1,
} from "../../src/lib/estimate/v4/steelColumnsBeamsInstallationR1";

const REQUIRED_ROW_IDS = [
  "rc09:steel_columns_beams_install",
  "rc09:fabricated_steel_columns_beams_c345",
  "rc09:structural_bolt_m24_class_10_9",
  "rc09:welding_wire_sv08g2s",
  "rc09:repair_primer_epoxy_zinc",
  "rc09:steel_frame_mobile_crane",
  "rc09:steel_frame_survey_control",
  "rc09:steel_weld_ndt",
] as const;

const CONDITIONAL_ROW_IDS = [
  "rc09:non_shrink_column_base_grout",
  "rc09:structural_fireproofing",
] as const;

describe("MASTER steel-columns-and-beams installation owner", () => {
  test("uses the exact expanded steel-frame owner without generic building scope", () => {
    expect(STEEL_COLUMNS_BEAMS_INSTALLATION_CATALOG_ID)
      .toBe("canonical-work:expanded:steel_frame_building");
    expect(STEEL_COLUMNS_BEAMS_INSTALLATION_PARAMETERS).toHaveLength(21);
    expect(STEEL_COLUMNS_BEAMS_INSTALLATION_FORMULAS).toHaveLength(10);
    expect(STEEL_COLUMNS_BEAMS_INSTALLATION_RESOURCES).toHaveLength(10);
    const serialized = JSON.stringify({
      formulas: STEEL_COLUMNS_BEAMS_INSTALLATION_FORMULAS,
      resources: STEEL_COLUMNS_BEAMS_INSTALLATION_RESOURCES,
    });
    expect(serialized).not.toMatch(/area_m2\s*\*|golden_rate|highRiseBuildingCalculator/iu);
    expect(serialized).not.toMatch(/foundation_concrete|roofing_package|envelope_m2/iu);
  });

  test("turns known 30 t into erection work while keeping project quantities visible", async () => {
    const compiled = await compileSteelColumnsBeamsInstallationR1({
      ...STEEL_COLUMNS_BEAMS_INSTALLATION_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        row_id: REQUIRED_ROW_IDS[0],
        quantity: "30",
        unit_id: "t",
      }),
      expect.objectContaining({
        row_id: REQUIRED_ROW_IDS[1],
        quantity: "30",
        unit_id: "t",
      }),
    ]));
    expect(compiled.preliminaryNeeds.map((need) => need.row_id)).toEqual(
      expect.arrayContaining([...REQUIRED_ROW_IDS.slice(2), ...CONDITIONAL_ROW_IDS]),
    );
    expect(compiled.preliminaryNeeds).toHaveLength(8);
    expect(compiled.preliminaryNeeds.every((need) => need.quantity == null)).toBe(true);
  });

  test("compiles the evidence-bound eight-row fixture without unresolved needs", async () => {
    const compiled = await compileSteelColumnsBeamsInstallationR1({
      ...STEEL_COLUMNS_BEAMS_INSTALLATION_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[0], quantity: "30", unit_id: "t" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[1], quantity: "30", unit_id: "t" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[2], quantity: "1260", unit_id: "piece" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[3], quantity: "72", unit_id: "kg" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[4], quantity: "10.5", unit_id: "kg" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[5], quantity: "2.4", unit_id: "shift" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[6], quantity: "3", unit_id: "test" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[7], quantity: "4", unit_id: "test" }),
    ]));
    expect(compiled.rows.map((row) => row.row_id)).toEqual(expect.arrayContaining(REQUIRED_ROW_IDS));
  });

  test("keeps base grout and structural fireproofing fail-closed", async () => {
    const compiled = await compileSteelColumnsBeamsInstallationR1({
      ...STEEL_COLUMNS_BEAMS_INSTALLATION_ACCEPTANCE_INPUT,
      column_base_grout_mode: "REQUIRED",
      column_base_grout_designation: "Безусадочный состав по узлу базы колонны",
      column_base_grout_mass_kg: 850,
      structural_fireproofing_mode: "REQUIRED",
      structural_fireproofing_designation: "Система огнезащиты по проекту пожарной безопасности",
      structural_fireproofing_area_m2: 920,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(10);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: CONDITIONAL_ROW_IDS[0], quantity: "850" }),
      expect.objectContaining({ row_id: CONDITIONAL_ROW_IDS[1], quantity: "920" }),
    ]));
  });

  test("rejects invalid supplied values and unrelated identities", async () => {
    await expect(compileSteelColumnsBeamsInstallationR1({
      ...STEEL_COLUMNS_BEAMS_INSTALLATION_SHORT_INPUT,
      structural_bolt_quantity_piece: -1,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileSteelColumnsBeamsInstallationR1(
      { ...STEEL_COLUMNS_BEAMS_INSTALLATION_ACCEPTANCE_INPUT },
      { catalogId: `${STEEL_COLUMNS_BEAMS_INSTALLATION_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("STEEL_COLUMNS_BEAMS_INSTALLATION_CATALOG_UNSUPPORTED");
  });
});
