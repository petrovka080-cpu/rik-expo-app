import {
  WATER_METER_CHAMBERS_ACCEPTANCE_INPUT,
  WATER_METER_CHAMBERS_CATALOG_ID,
  WATER_METER_CHAMBERS_FORMULAS,
  WATER_METER_CHAMBERS_PARAMETERS,
  WATER_METER_CHAMBERS_RESOURCES,
  WATER_METER_CHAMBERS_RUNTIME_INPUT,
  WATER_METER_CHAMBERS_SHORT_INPUT,
  compileWaterMeterChambersR1,
} from "../../src/lib/estimate/v4/waterMeterChambersR1";

describe("S27.24 water-meter chambers owner", () => {
  test("replaces the village-network template with one exact metering boundary", () => {
    expect(WATER_METER_CHAMBERS_CATALOG_ID).toBe(
      "canonical-work:expanded:water_meter_chambers",
    );
    expect(WATER_METER_CHAMBERS_PARAMETERS).toHaveLength(63);
    expect(WATER_METER_CHAMBERS_FORMULAS).toHaveLength(45);
    expect(WATER_METER_CHAMBERS_RESOURCES).toHaveLength(45);
    expect(WATER_METER_CHAMBERS_RUNTIME_INPUT).toEqual({
      wmc_meter_retained_spare_piece: 0,
      wmc_meter_supplier_package_quantity_piece: 1,
    });
    expect(JSON.stringify(WATER_METER_CHAMBERS_FORMULAS)).not.toMatch(
      /design_flow\w*\s*\*|pipe_installed\w*\s*\*\s*0\.|length_m\s*\*|golden_rate|normFactor/iu,
    );
    expect(JSON.stringify(WATER_METER_CHAMBERS_RESOURCES.map((row) => row.row_id)))
      .not.toMatch(
        /village_water|water_intake|borehole|pumping_station|treatment_plant|reservoir|water_tower|sewer/iu,
      );
  });

  test("selected chambers give useful rows and local project needs", async () => {
    const compiled = await compileWaterMeterChambersR1({
      ...WATER_METER_CHAMBERS_SHORT_INPUT,
    });
    expect(compiled.rows).toHaveLength(11);
    expect(compiled.preliminaryNeeds).toHaveLength(34);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:wmc_acceptance", quantity: "4" }),
      expect.objectContaining({ row_id: "rc09:wmc_chambers", quantity: "4" }),
      expect.objectContaining({ row_id: "rc09:wmc_water_meters", quantity: "4" }),
      expect.objectContaining({ row_id: "rc09:wmc_straight_pipe", quantity: "96" }),
      expect.objectContaining({ row_id: "rc09:wmc_bypass_pipe", quantity: "48" }),
    ]));
  });

  test("compiles the forty-two-row approved project fixture", async () => {
    const compiled = await compileWaterMeterChambersR1({
      ...WATER_METER_CHAMBERS_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(42);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:wmc_isolation_valves", quantity: "12" }),
      expect.objectContaining({ row_id: "rc09:wmc_penetration_seals", quantity: "32" }),
      expect.objectContaining({ row_id: "rc09:wmc_base_concrete", quantity: "72" }),
      expect.objectContaining({ row_id: "rc09:wmc_rebar", quantity: "8800" }),
      expect.objectContaining({ row_id: "rc09:labor:wmc-civil", quantity: "1200" }),
      expect.objectContaining({ row_id: "rc09:equipment:wmc-crane", quantity: "120" }),
      expect.objectContaining({ row_id: "rc09:logistics:wmc-material-delivery", quantity: "36" }),
    ]));
  });

  test("separates installed meters from supplier-package rounding", async () => {
    const compiled = await compileWaterMeterChambersR1({
      ...WATER_METER_CHAMBERS_ACCEPTANCE_INPUT,
      wmc_meter_retained_spare_piece: 1,
      wmc_meter_supplier_package_quantity_piece: 2,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:wmc-meter-balance:installed-net")?.quantity).toBe("4");
    expect(rows.get("rc09:wmc-meter-balance:retained-spare")?.quantity).toBe("1");
    expect(rows.get("rc09:wmc-meter-balance:total-need")?.quantity).toBe("5");
    expect(rows.get("rc09:wmc-meter-balance:package-count")?.quantity).toBe("3");
    expect(rows.get("rc09:wmc_water_meters")?.quantity).toBe("6");
    expect(rows.get("rc09:wmc-meter-balance:remainder")?.quantity).toBe("2");
    expect(rows.get("rc09:wmc-meter-balance:surplus-beyond-spare")?.quantity).toBe("1");
  });

  test("keeps acceptance and QA records informational beside explicit labor", () => {
    for (const rowId of [
      "rc09:wmc_acceptance",
      "rc09:wmc_hydraulic_tests",
      "rc09:wmc_meter_calibration",
      "rc09:wmc_electrical_tests",
      "rc09:wmc_asbuilt_documents",
    ]) {
      expect(WATER_METER_CHAMBERS_RESOURCES.find((row) => row.row_id === rowId)
        ?.resource_graph).toEqual(expect.objectContaining({
        costTreatment: "INFORMATIONAL_SCOPE",
      }));
    }
  });

  test("keeps shoring, dewatering and road reinstatement conditional", async () => {
    const compiled = await compileWaterMeterChambersR1({
      ...WATER_METER_CHAMBERS_ACCEPTANCE_INPUT,
      wmc_excavation_shoring_mode: "REQUIRED",
      wmc_excavation_shoring_designation: "SHEET-PILE-LIGHT",
      wmc_excavation_shoring_area_m2: 620,
      wmc_groundwater_dewatering_mode: "REQUIRED",
      wmc_groundwater_dewatering_designation: "WELLPOINT-60M3H",
      wmc_groundwater_dewatering_machine_h: 240,
      wmc_road_reinstatement_mode: "REQUIRED",
      wmc_road_reinstatement_designation: "ASPHALT-2L-ROAD-REINSTATEMENT",
      wmc_road_reinstatement_area_m2: 480,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(45);
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileWaterMeterChambersR1({
      ...WATER_METER_CHAMBERS_SHORT_INPUT,
      wmc_chamber_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileWaterMeterChambersR1(
      { ...WATER_METER_CHAMBERS_ACCEPTANCE_INPUT },
      { catalogId: `${WATER_METER_CHAMBERS_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("WATER_METER_CHAMBERS_CATALOG_UNSUPPORTED");
  });
});
