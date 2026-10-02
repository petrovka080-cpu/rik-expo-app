import {
  VILLAGE_SEWER_NETWORK_ACCEPTANCE_INPUT, VILLAGE_SEWER_NETWORK_CATALOG_ID,
  VILLAGE_SEWER_NETWORK_FORMULAS, VILLAGE_SEWER_NETWORK_PARAMETERS,
  VILLAGE_SEWER_NETWORK_RESOURCES, VILLAGE_SEWER_NETWORK_RUNTIME_INPUT,
  VILLAGE_SEWER_NETWORK_SHORT_INPUT, compileVillageSewerNetworkR1,
} from "../../src/lib/estimate/v4/villageSewerNetworkR1";

describe("S27.24 village sewer network owner", () => {
  test("replaces the length-coefficient template with one exact gravity-network boundary", () => {
    expect(VILLAGE_SEWER_NETWORK_CATALOG_ID)
      .toBe("canonical-work:expanded:village_sewer_network");
    expect(VILLAGE_SEWER_NETWORK_PARAMETERS).toHaveLength(57);
    expect(VILLAGE_SEWER_NETWORK_FORMULAS).toHaveLength(43);
    expect(VILLAGE_SEWER_NETWORK_RESOURCES).toHaveLength(43);
    expect(VILLAGE_SEWER_NETWORK_RUNTIME_INPUT).toEqual({
      vsn_main_pipe_retained_spare_m: 0,
      vsn_main_pipe_supplier_bundle_length_m: 1,
    });
    expect(JSON.stringify(VILLAGE_SEWER_NETWORK_FORMULAS)).not.toMatch(
      /design_flow\w*\s*\*|pipe_installed\w*\s*\*\s*0\.|length_m\s*\*\s*0\.|golden_rate|normFactor/iu,
    );
    expect(JSON.stringify(VILLAGE_SEWER_NETWORK_RESOURCES.map((row) => row.row_id)))
      .not.toMatch(/pressure_sewer|pumping_station|wtp_|stf_|stormwater/iu);
  });

  test("selected network gives useful rows and local project needs", async () => {
    const compiled = await compileVillageSewerNetworkR1({
      ...VILLAGE_SEWER_NETWORK_SHORT_INPUT,
    });
    expect(compiled.rows).toHaveLength(11);
    expect(compiled.preliminaryNeeds.length).toBeGreaterThan(0);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:vsn_acceptance", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:vsn_main_pipe", quantity: "2400" }),
      expect.objectContaining({ row_id: "rc09:vsn_lateral_pipe", quantity: "800" }),
      expect.objectContaining({ row_id: "rc09:vsn_inspection_manholes", quantity: "64" }),
      expect.objectContaining({ row_id: "rc09:vsn_house_connections", quantity: "120" }),
    ]));
  });

  test("compiles the thirty-nine-row approved project fixture", async () => {
    const compiled = await compileVillageSewerNetworkR1({
      ...VILLAGE_SEWER_NETWORK_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(39);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:vsn_trench_excavation", quantity: "7200" }),
      expect.objectContaining({ row_id: "rc09:vsn_bedding_sand", quantity: "980" }),
      expect.objectContaining({ row_id: "rc09:vsn_manhole_covers", quantity: "64" }),
      expect.objectContaining({ row_id: "rc09:vsn_road_crossing_sleeves", quantity: "180" }),
      expect.objectContaining({ row_id: "rc09:labor:vsn-pipe-installation", quantity: "3600" }),
      expect.objectContaining({ row_id: "rc09:equipment:vsn-excavator", quantity: "820" }),
      expect.objectContaining({
        row_id: "rc09:logistics:vsn-material-delivery", quantity: "180",
      }),
    ]));
  });

  test("separates installed main pipe from supplier-bundle rounding", async () => {
    const compiled = await compileVillageSewerNetworkR1({
      ...VILLAGE_SEWER_NETWORK_ACCEPTANCE_INPUT,
      vsn_main_pipe_retained_spare_m: 30,
      vsn_main_pipe_supplier_bundle_length_m: 60,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:vsn-main-pipe-balance:installed-net")?.quantity).toBe("2400");
    expect(rows.get("rc09:vsn-main-pipe-balance:retained-spare")?.quantity).toBe("30");
    expect(rows.get("rc09:vsn-main-pipe-balance:total-need")?.quantity).toBe("2430");
    expect(rows.get("rc09:vsn-main-pipe-balance:package-count")?.quantity).toBe("41");
    expect(rows.get("rc09:vsn_main_pipe")?.quantity).toBe("2460");
    expect(rows.get("rc09:vsn-main-pipe-balance:remainder")?.quantity).toBe("60");
    expect(rows.get("rc09:vsn-main-pipe-balance:surplus-beyond-spare")?.quantity).toBe("30");
  });

  test("keeps acceptance and QA records informational beside explicit labor", () => {
    for (const rowId of ["rc09:vsn_acceptance", "rc09:vsn_leak_tests",
      "rc09:vsn_cctv_inspections", "rc09:vsn_compaction_tests",
      "rc09:vsn_asbuilt_documents"]) {
      expect(VILLAGE_SEWER_NETWORK_RESOURCES.find((row) => row.row_id === rowId)
        ?.resource_graph).toEqual(expect.objectContaining({ costTreatment: "INFORMATIONAL_SCOPE" }));
    }
  });

  test("keeps rock, dewatering, traffic and road reinstatement conditional", async () => {
    const compiled = await compileVillageSewerNetworkR1({
      ...VILLAGE_SEWER_NETWORK_ACCEPTANCE_INPUT,
      vsn_rock_excavation_mode: "REQUIRED",
      vsn_rock_excavation_designation: "HYDRAULIC-BREAKER",
      vsn_rock_excavation_volume_m3: 800,
      vsn_groundwater_dewatering_mode: "REQUIRED",
      vsn_groundwater_dewatering_designation: "WELLPOINT-120M3H",
      vsn_groundwater_dewatering_machine_h: 600,
      vsn_traffic_management_mode: "REQUIRED",
      vsn_traffic_management_designation: "TEMP-TRAFFIC-SCHEME-VSN",
      vsn_traffic_management_quantity_set: 12,
      vsn_road_reinstatement_mode: "REQUIRED",
      vsn_road_reinstatement_designation: "ASPHALT-2L-ROAD-REINSTATEMENT",
      vsn_road_reinstatement_area_m2: 2400,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(43);
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileVillageSewerNetworkR1({
      ...VILLAGE_SEWER_NETWORK_SHORT_INPUT, vsn_network_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileVillageSewerNetworkR1(
      { ...VILLAGE_SEWER_NETWORK_ACCEPTANCE_INPUT },
      { catalogId: `${VILLAGE_SEWER_NETWORK_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("VILLAGE_SEWER_NETWORK_CATALOG_UNSUPPORTED");
  });
});
