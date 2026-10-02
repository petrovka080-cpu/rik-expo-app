import {
  VILLAGE_WATER_SUPPLY_ACCEPTANCE_INPUT, VILLAGE_WATER_SUPPLY_CATALOG_ID,
  VILLAGE_WATER_SUPPLY_FORMULAS, VILLAGE_WATER_SUPPLY_PARAMETERS,
  VILLAGE_WATER_SUPPLY_RESOURCES, VILLAGE_WATER_SUPPLY_RUNTIME_INPUT,
  VILLAGE_WATER_SUPPLY_SHORT_INPUT, compileVillageWaterSupplyR1,
} from "../../src/lib/estimate/v4/villageWaterSupplyR1";

describe("S27.24 village water supply owner", () => {
  test("replaces the length-coefficient template with one exact pressure-network boundary", () => {
    expect(VILLAGE_WATER_SUPPLY_CATALOG_ID)
      .toBe("canonical-work:expanded:village_water_supply");
    expect(VILLAGE_WATER_SUPPLY_PARAMETERS).toHaveLength(60);
    expect(VILLAGE_WATER_SUPPLY_FORMULAS).toHaveLength(45);
    expect(VILLAGE_WATER_SUPPLY_RESOURCES).toHaveLength(45);
    expect(VILLAGE_WATER_SUPPLY_RUNTIME_INPUT).toEqual({
      vws_main_pipe_retained_spare_m: 0,
      vws_main_pipe_supplier_bundle_length_m: 1,
    });
    expect(JSON.stringify(VILLAGE_WATER_SUPPLY_FORMULAS)).not.toMatch(
      /design_flow\w*\s*\*|pipe_installed\w*\s*\*\s*0\.|length_m\s*\*\s*0\.|golden_rate|normFactor/iu,
    );
    expect(JSON.stringify(VILLAGE_WATER_SUPPLY_RESOURCES.map((row) => row.row_id)))
      .not.toMatch(/water_intake|borehole|pumping_station|treatment_plant|reservoir|water_tower|sewer/iu);
  });

  test("selected network gives useful rows and local project needs", async () => {
    const compiled = await compileVillageWaterSupplyR1({
      ...VILLAGE_WATER_SUPPLY_SHORT_INPUT,
    });
    expect(compiled.rows).toHaveLength(12);
    expect(compiled.preliminaryNeeds.length).toBeGreaterThan(0);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:vws_acceptance", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:vws_main_pipe", quantity: "3000" }),
      expect.objectContaining({ row_id: "rc09:vws_branch_pipe", quantity: "1200" }),
      expect.objectContaining({ row_id: "rc09:vws_valve_chambers", quantity: "36" }),
      expect.objectContaining({ row_id: "rc09:vws_fire_hydrants", quantity: "18" }),
      expect.objectContaining({ row_id: "rc09:vws_house_connections", quantity: "150" }),
    ]));
  });

  test("compiles the forty-one-row approved project fixture", async () => {
    const compiled = await compileVillageWaterSupplyR1({
      ...VILLAGE_WATER_SUPPLY_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(41);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:vws_trench_excavation", quantity: "8600" }),
      expect.objectContaining({ row_id: "rc09:vws_bedding_sand", quantity: "1280" }),
      expect.objectContaining({ row_id: "rc09:vws_isolation_valves", quantity: "42" }),
      expect.objectContaining({ row_id: "rc09:vws_road_crossing_sleeves", quantity: "220" }),
      expect.objectContaining({ row_id: "rc09:labor:vws-pipe-installation", quantity: "4400" }),
      expect.objectContaining({ row_id: "rc09:equipment:vws-butt-fusion", quantity: "360" }),
      expect.objectContaining({
        row_id: "rc09:logistics:vws-material-delivery", quantity: "210",
      }),
    ]));
  });

  test("separates installed main pipe from supplier-bundle rounding", async () => {
    const compiled = await compileVillageWaterSupplyR1({
      ...VILLAGE_WATER_SUPPLY_ACCEPTANCE_INPUT,
      vws_main_pipe_retained_spare_m: 40,
      vws_main_pipe_supplier_bundle_length_m: 100,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:vws-main-pipe-balance:installed-net")?.quantity).toBe("3000");
    expect(rows.get("rc09:vws-main-pipe-balance:retained-spare")?.quantity).toBe("40");
    expect(rows.get("rc09:vws-main-pipe-balance:total-need")?.quantity).toBe("3040");
    expect(rows.get("rc09:vws-main-pipe-balance:package-count")?.quantity).toBe("31");
    expect(rows.get("rc09:vws_main_pipe")?.quantity).toBe("3100");
    expect(rows.get("rc09:vws-main-pipe-balance:remainder")?.quantity).toBe("100");
    expect(rows.get("rc09:vws-main-pipe-balance:surplus-beyond-spare")?.quantity).toBe("60");
  });

  test("keeps acceptance and QA records informational beside explicit labor", () => {
    for (const rowId of ["rc09:vws_acceptance", "rc09:vws_hydraulic_tests",
      "rc09:vws_flushing_disinfection", "rc09:vws_water_quality_samples",
      "rc09:vws_compaction_tests", "rc09:vws_asbuilt_documents"]) {
      expect(VILLAGE_WATER_SUPPLY_RESOURCES.find((row) => row.row_id === rowId)
        ?.resource_graph).toEqual(expect.objectContaining({ costTreatment: "INFORMATIONAL_SCOPE" }));
    }
  });

  test("keeps rock, dewatering, traffic and road reinstatement conditional", async () => {
    const compiled = await compileVillageWaterSupplyR1({
      ...VILLAGE_WATER_SUPPLY_ACCEPTANCE_INPUT,
      vws_rock_excavation_mode: "REQUIRED",
      vws_rock_excavation_designation: "HYDRAULIC-BREAKER",
      vws_rock_excavation_volume_m3: 900,
      vws_groundwater_dewatering_mode: "REQUIRED",
      vws_groundwater_dewatering_designation: "WELLPOINT-120M3H",
      vws_groundwater_dewatering_machine_h: 700,
      vws_traffic_management_mode: "REQUIRED",
      vws_traffic_management_designation: "TEMP-TRAFFIC-SCHEME-VWS",
      vws_traffic_management_quantity_set: 14,
      vws_road_reinstatement_mode: "REQUIRED",
      vws_road_reinstatement_designation: "ASPHALT-2L-ROAD-REINSTATEMENT",
      vws_road_reinstatement_area_m2: 3000,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(45);
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileVillageWaterSupplyR1({
      ...VILLAGE_WATER_SUPPLY_SHORT_INPUT, vws_network_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileVillageWaterSupplyR1(
      { ...VILLAGE_WATER_SUPPLY_ACCEPTANCE_INPUT },
      { catalogId: `${VILLAGE_WATER_SUPPLY_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("VILLAGE_WATER_SUPPLY_CATALOG_UNSUPPORTED");
  });
});
