import {
  WATER_RESERVOIR_ACCEPTANCE_INPUT,
  WATER_RESERVOIR_CATALOG_ID,
  WATER_RESERVOIR_FORMULAS,
  WATER_RESERVOIR_PARAMETERS,
  WATER_RESERVOIR_RESOURCES,
  WATER_RESERVOIR_RUNTIME_INPUT,
  WATER_RESERVOIR_SHORT_INPUT,
  compileWaterReservoirR1,
} from "../../src/lib/estimate/v4/waterReservoirR1";

describe("S27.24 water-reservoir owner", () => {
  test("replaces the tank-silo calculator with one exact clean-water boundary", () => {
    expect(WATER_RESERVOIR_CATALOG_ID).toBe("canonical-work:expanded:water_reservoir");
    expect(WATER_RESERVOIR_PARAMETERS).toHaveLength(65);
    expect(WATER_RESERVOIR_FORMULAS).toHaveLength(45);
    expect(WATER_RESERVOIR_RESOURCES).toHaveLength(45);
    expect(WATER_RESERVOIR_RUNTIME_INPUT).toEqual({
      wr_waterstop_retained_spare_m: 0,
      wr_waterstop_supplier_roll_length_m: 1,
    });
    expect(JSON.stringify(WATER_RESERVOIR_FORMULAS)).not.toMatch(
      /storage_capacity\w*\s*\*|unit_capacity\w*\s*\*|pow\s*\(\s*volume|tankSilo|golden_rate|normFactor/iu,
    );
    expect(JSON.stringify(WATER_RESERVOIR_RESOURCES.map((row) => row.row_id)))
      .not.toMatch(/steel_shell|silo|water_intake|treatment_plant|pumping_station|water_tower|sewer/iu);
  });

  test("selected reservoirs give useful rows and local project needs", async () => {
    const compiled = await compileWaterReservoirR1({ ...WATER_RESERVOIR_SHORT_INPUT });
    expect(compiled.rows).toHaveLength(10);
    expect(compiled.preliminaryNeeds).toHaveLength(35);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:wr_acceptance", quantity: "2" }),
      expect.objectContaining({ row_id: "rc09:wr_waterstop", quantity: "420" }),
      expect.objectContaining({ row_id: "rc09:wr_inlet_pipe", quantity: "64" }),
      expect.objectContaining({ row_id: "rc09:wr_outlet_pipe", quantity: "64" }),
    ]));
  });

  test("compiles the forty-two-row approved project fixture", async () => {
    const compiled = await compileWaterReservoirR1({ ...WATER_RESERVOIR_ACCEPTANCE_INPUT });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(42);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:wr_structural_concrete", quantity: "1850" }),
      expect.objectContaining({ row_id: "rc09:wr_rebar", quantity: "260000" }),
      expect.objectContaining({ row_id: "rc09:wr_internal_potable_coating", quantity: "5200" }),
      expect.objectContaining({ row_id: "rc09:wr_isolation_valves", quantity: "12" }),
      expect.objectContaining({ row_id: "rc09:labor:wr-civil", quantity: "14800" }),
      expect.objectContaining({ row_id: "rc09:equipment:wr-crane", quantity: "520" }),
      expect.objectContaining({ row_id: "rc09:logistics:wr-material-delivery", quantity: "240" }),
    ]));
  });

  test("separates installed waterstop from supplier-roll rounding", async () => {
    const compiled = await compileWaterReservoirR1({
      ...WATER_RESERVOIR_ACCEPTANCE_INPUT,
      wr_waterstop_retained_spare_m: 20,
      wr_waterstop_supplier_roll_length_m: 25,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:wr-waterstop-balance:installed-net")?.quantity).toBe("420");
    expect(rows.get("rc09:wr-waterstop-balance:retained-spare")?.quantity).toBe("20");
    expect(rows.get("rc09:wr-waterstop-balance:total-need")?.quantity).toBe("440");
    expect(rows.get("rc09:wr-waterstop-balance:roll-count")?.quantity).toBe("18");
    expect(rows.get("rc09:wr_waterstop")?.quantity).toBe("450");
    expect(rows.get("rc09:wr-waterstop-balance:remainder")?.quantity).toBe("30");
    expect(rows.get("rc09:wr-waterstop-balance:surplus-beyond-spare")?.quantity).toBe("10");
  });

  test("keeps acceptance and QA records informational beside explicit labor", () => {
    for (const rowId of [
      "rc09:wr_acceptance", "rc09:wr_hydrostatic_tests",
      "rc09:wr_disinfection_cycles", "rc09:wr_water_quality_tests",
      "rc09:wr_asbuilt_documents",
    ]) {
      expect(WATER_RESERVOIR_RESOURCES.find((row) => row.row_id === rowId)
        ?.resource_graph).toEqual(expect.objectContaining({
        costTreatment: "INFORMATIONAL_SCOPE",
      }));
    }
  });

  test("keeps shoring, dewatering and road reinstatement conditional", async () => {
    const compiled = await compileWaterReservoirR1({
      ...WATER_RESERVOIR_ACCEPTANCE_INPUT,
      wr_excavation_shoring_mode: "REQUIRED",
      wr_excavation_shoring_designation: "SHEET-PILE-AZ18",
      wr_excavation_shoring_area_m2: 3200,
      wr_groundwater_dewatering_mode: "REQUIRED",
      wr_groundwater_dewatering_designation: "WELLPOINT-180M3H",
      wr_groundwater_dewatering_machine_h: 1400,
      wr_road_reinstatement_mode: "REQUIRED",
      wr_road_reinstatement_designation: "ASPHALT-2L-ROAD-REINSTATEMENT",
      wr_road_reinstatement_area_m2: 1200,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(45);
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileWaterReservoirR1({
      ...WATER_RESERVOIR_SHORT_INPUT,
      wr_reservoir_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileWaterReservoirR1(
      { ...WATER_RESERVOIR_ACCEPTANCE_INPUT },
      { catalogId: `${WATER_RESERVOIR_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("WATER_RESERVOIR_CATALOG_UNSUPPORTED");
  });
});
