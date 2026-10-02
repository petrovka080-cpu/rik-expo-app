import {
  WATER_INTAKE_ACCEPTANCE_INPUT, WATER_INTAKE_CATALOG_ID, WATER_INTAKE_FORMULAS,
  WATER_INTAKE_PARAMETERS, WATER_INTAKE_RESOURCES, WATER_INTAKE_RUNTIME_INPUT,
  WATER_INTAKE_SHORT_INPUT, compileWaterIntakeR1,
} from "../../src/lib/estimate/v4/waterIntakeR1";

describe("S27.24 water intake owner", () => {
  test("replaces the village-network template with one exact riverbank-intake boundary", () => {
    expect(WATER_INTAKE_CATALOG_ID).toBe("canonical-work:expanded:water_intake");
    expect(WATER_INTAKE_PARAMETERS).toHaveLength(65);
    expect(WATER_INTAKE_FORMULAS).toHaveLength(45);
    expect(WATER_INTAKE_RESOURCES).toHaveLength(45);
    expect(WATER_INTAKE_RUNTIME_INPUT).toEqual({
      wi_raw_water_pump_retained_spare_piece: 0,
      wi_raw_water_pump_supplier_package_quantity_piece: 1,
    });
    expect(JSON.stringify(WATER_INTAKE_FORMULAS)).not.toMatch(
      /design_capacity\w*\s*\*|bay_count\s*\*|pump_installed\w*\s*\*\s*0\.|length_m\s*\*|golden_rate|normFactor/iu,
    );
    expect(JSON.stringify(WATER_INTAKE_RESOURCES.map((row) => row.row_id)))
      .not.toMatch(/village_water|borehole|treatment_plant|reservoir|water_tower|sewer/iu);
  });

  test("selected intake gives useful rows and local project needs", async () => {
    const compiled = await compileWaterIntakeR1({ ...WATER_INTAKE_SHORT_INPUT });
    expect(compiled.rows).toHaveLength(9);
    expect(compiled.preliminaryNeeds.length).toBeGreaterThan(0);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:wi_acceptance", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:wi_coarse_screens", quantity: "4" }),
      expect.objectContaining({ row_id: "rc09:wi_raw_water_pumps", quantity: "4" }),
    ]));
  });

  test("compiles the forty-one-row approved project fixture", async () => {
    const compiled = await compileWaterIntakeR1({ ...WATER_INTAKE_ACCEPTANCE_INPUT });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(41);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:wi_structural_concrete", quantity: "1850" }),
      expect.objectContaining({ row_id: "rc09:wi_rebar", quantity: "245000" }),
      expect.objectContaining({ row_id: "rc09:wi_intake_conduits", quantity: "120" }),
      expect.objectContaining({ row_id: "rc09:wi_screen_cleaners", quantity: "2" }),
      expect.objectContaining({ row_id: "rc09:labor:wi-mechanical", quantity: "4600" }),
      expect.objectContaining({ row_id: "rc09:equipment:wi-crane", quantity: "520" }),
      expect.objectContaining({ row_id: "rc09:logistics:wi-material-delivery", quantity: "260" }),
    ]));
  });

  test("separates installed pumps from supplier-package rounding", async () => {
    const compiled = await compileWaterIntakeR1({
      ...WATER_INTAKE_ACCEPTANCE_INPUT,
      wi_raw_water_pump_retained_spare_piece: 1,
      wi_raw_water_pump_supplier_package_quantity_piece: 2,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:wi-pump-balance:installed-net")?.quantity).toBe("4");
    expect(rows.get("rc09:wi-pump-balance:retained-spare")?.quantity).toBe("1");
    expect(rows.get("rc09:wi-pump-balance:total-need")?.quantity).toBe("5");
    expect(rows.get("rc09:wi-pump-balance:package-count")?.quantity).toBe("3");
    expect(rows.get("rc09:wi_raw_water_pumps")?.quantity).toBe("6");
    expect(rows.get("rc09:wi-pump-balance:remainder")?.quantity).toBe("2");
    expect(rows.get("rc09:wi-pump-balance:surplus-beyond-spare")?.quantity).toBe("1");
  });

  test("keeps acceptance and QA records informational beside explicit labor", () => {
    for (const rowId of ["rc09:wi_acceptance", "rc09:wi_mechanical_tests",
      "rc09:wi_electrical_tests", "rc09:wi_commissioning_tests",
      "rc09:wi_asbuilt_documents"]) {
      expect(WATER_INTAKE_RESOURCES.find((row) => row.row_id === rowId)
        ?.resource_graph).toEqual(expect.objectContaining({ costTreatment: "INFORMATIONAL_SCOPE" }));
    }
  });

  test("keeps cofferdam, river diversion, dewatering and fish protection conditional", async () => {
    const compiled = await compileWaterIntakeR1({
      ...WATER_INTAKE_ACCEPTANCE_INPUT,
      wi_cofferdam_mode: "REQUIRED", wi_cofferdam_designation: "SHEET-PILE-AZ18",
      wi_cofferdam_area_m2: 1800,
      wi_river_diversion_mode: "REQUIRED", wi_river_diversion_designation: "DIVERSION-CHANNEL-1",
      wi_river_diversion_quantity_set: 1,
      wi_construction_dewatering_mode: "REQUIRED",
      wi_construction_dewatering_designation: "WELLPOINT-240M3H",
      wi_construction_dewatering_machine_h: 1000,
      wi_fish_protection_mode: "REQUIRED", wi_fish_protection_designation: "FISH-SCREEN-2B",
      wi_fish_protection_quantity_set: 2,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(45);
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileWaterIntakeR1({
      ...WATER_INTAKE_SHORT_INPUT, wi_facility_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileWaterIntakeR1(
      { ...WATER_INTAKE_ACCEPTANCE_INPUT },
      { catalogId: `${WATER_INTAKE_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("WATER_INTAKE_CATALOG_UNSUPPORTED");
  });
});
