import {
  SEWER_PUMPING_STATION_ACCEPTANCE_INPUT, SEWER_PUMPING_STATION_CATALOG_ID,
  SEWER_PUMPING_STATION_FORMULAS, SEWER_PUMPING_STATION_PARAMETERS,
  SEWER_PUMPING_STATION_RESOURCES, SEWER_PUMPING_STATION_RUNTIME_INPUT,
  SEWER_PUMPING_STATION_SHORT_INPUT, compileSewerPumpingStationR1,
} from "../../src/lib/estimate/v4/sewerPumpingStationR1";

describe("S27.24 sewer pumping station owner", () => {
  test("replaces the whole-network template with one exact packaged SPS boundary", () => {
    expect(SEWER_PUMPING_STATION_CATALOG_ID).toBe(
      "canonical-work:expanded:sewer_pumping_station",
    );
    expect(SEWER_PUMPING_STATION_PARAMETERS).toHaveLength(66);
    expect(SEWER_PUMPING_STATION_FORMULAS).toHaveLength(42);
    expect(SEWER_PUMPING_STATION_RESOURCES).toHaveLength(42);
    expect(SEWER_PUMPING_STATION_RUNTIME_INPUT).toEqual({
      sps_pump_retained_spare_piece: 0, sps_pump_supplier_package_quantity_piece: 1,
    });
    expect(JSON.stringify(SEWER_PUMPING_STATION_FORMULAS)).not.toMatch(
      /station_count\s*\*|design_(?:flow|head)\w*\s*\*|wet_well_(?:diameter|depth)\w*\s*\*|golden_rate|normFactor/iu,
    );
    expect(JSON.stringify(SEWER_PUMPING_STATION_RESOURCES)).not.toMatch(
      /sewer_pipe_lm|inspection_manhole|hydraulic_testing_lm|rc09:pbb_|rc09:hyd_/iu,
    );
  });

  test("selected packaged SPS gives useful rows and local needs", async () => {
    const compiled = await compileSewerPumpingStationR1({ ...SEWER_PUMPING_STATION_SHORT_INPUT });
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.preliminaryNeeds.length).toBeGreaterThan(0);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:sps_acceptance", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:sps_pump_units", quantity: "3" }),
      expect.objectContaining({ row_id: "rc09:sps-pump-balance:installed-net", quantity: "3" }),
    ]));
  });

  test("compiles the thirty-nine-row project fixture", async () => {
    const compiled = await compileSewerPumpingStationR1({
      ...SEWER_PUMPING_STATION_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(39);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:sps_wet_well_shell", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:sps_isolation_valves", quantity: "4" }),
      expect.objectContaining({ row_id: "rc09:sps_internal_cable", quantity: "180" }),
      expect.objectContaining({ row_id: "rc09:sps_excavation", quantity: "240" }),
      expect.objectContaining({ row_id: "rc09:labor:sps-mechanical-installation", quantity: "160" }),
      expect.objectContaining({ row_id: "rc09:equipment:sps-crane", quantity: "48" }),
      expect.objectContaining({ row_id: "rc09:logistics:sps-material-delivery", quantity: "14" }),
    ]));
  });

  test("separates installed pumps from supplier-package rounding", async () => {
    const compiled = await compileSewerPumpingStationR1({
      ...SEWER_PUMPING_STATION_ACCEPTANCE_INPUT,
      sps_pump_retained_spare_piece: 1, sps_pump_supplier_package_quantity_piece: 2,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:sps-pump-balance:installed-net")?.quantity).toBe("3");
    expect(rows.get("rc09:sps-pump-balance:retained-spare")?.quantity).toBe("1");
    expect(rows.get("rc09:sps-pump-balance:total-need")?.quantity).toBe("4");
    expect(rows.get("rc09:sps-pump-balance:package-count")?.quantity).toBe("2");
    expect(rows.get("rc09:sps_pump_units")?.quantity).toBe("4");
    expect(rows.get("rc09:sps-pump-balance:remainder")?.quantity).toBe("1");
    expect(rows.get("rc09:sps-pump-balance:surplus-beyond-spare")?.quantity).toBe("0");
  });

  test("keeps acceptance and test records informational beside explicit labor", () => {
    for (const rowId of ["rc09:sps_acceptance", "rc09:sps_functional_tests",
      "rc09:sps_electrical_tests", "rc09:sps_asbuilt_documents"]) {
      expect(SEWER_PUMPING_STATION_RESOURCES.find((row) => row.row_id === rowId)
        ?.resource_graph).toEqual(expect.objectContaining({ costTreatment: "INFORMATIONAL_SCOPE" }));
    }
  });

  test("keeps bypass pumping, dewatering and odor control conditional", async () => {
    const compiled = await compileSewerPumpingStationR1({
      ...SEWER_PUMPING_STATION_ACCEPTANCE_INPUT,
      sps_bypass_pumping_mode: "REQUIRED", sps_bypass_pumping_designation: "BYPASS-PUMP-Q60-H20",
      sps_bypass_pumping_machine_h: 72,
      sps_dewatering_mode: "REQUIRED", sps_dewatering_designation: "WELLPOINT-DW-100",
      sps_dewatering_machine_h: 96,
      sps_odor_control_mode: "REQUIRED", sps_odor_control_designation: "CARBON-FILTER-500",
      sps_odor_control_set_count: 1,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(42);
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileSewerPumpingStationR1({
      ...SEWER_PUMPING_STATION_SHORT_INPUT, sps_station_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileSewerPumpingStationR1(
      { ...SEWER_PUMPING_STATION_ACCEPTANCE_INPUT },
      { catalogId: `${SEWER_PUMPING_STATION_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("SEWER_PUMPING_STATION_CATALOG_UNSUPPORTED");
  });
});
