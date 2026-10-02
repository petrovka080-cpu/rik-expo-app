import {
  BOOSTER_PUMPING_STATION_ACCEPTANCE_INPUT,
  BOOSTER_PUMPING_STATION_CATALOG_ID,
  BOOSTER_PUMPING_STATION_FORMULAS,
  BOOSTER_PUMPING_STATION_PARAMETERS,
  BOOSTER_PUMPING_STATION_RESOURCES,
  BOOSTER_PUMPING_STATION_RUNTIME_INPUT,
  BOOSTER_PUMPING_STATION_SHORT_INPUT,
  compileBoosterPumpingStationR1,
} from "../../src/lib/estimate/v4/boosterPumpingStationR1";

describe("S27.25 automatic factory potable-water booster-skid owner", () => {
  test("asks only seven primary facts and exposes the manufacturer profile", () => {
    expect(BOOSTER_PUMPING_STATION_CATALOG_ID)
      .toBe("canonical-work:expanded:booster_pumping_station");
    expect(Object.keys(BOOSTER_PUMPING_STATION_SHORT_INPUT)).toHaveLength(7);
    expect(Object.keys(BOOSTER_PUMPING_STATION_RUNTIME_INPUT)).toHaveLength(63);
    expect(BOOSTER_PUMPING_STATION_PARAMETERS).toHaveLength(76);
    expect(BOOSTER_PUMPING_STATION_FORMULAS).toHaveLength(55);
    expect(BOOSTER_PUMPING_STATION_RESOURCES).toHaveLength(55);
    expect(Object.keys(BOOSTER_PUMPING_STATION_SHORT_INPUT).join(" ")).not.toMatch(
      /quantity|labor|machine|trip|test_count|grout_volume/iu,
    );
  });

  test("ordinary facts compile the complete non-conditional resource chain without questions", async () => {
    const result = await compileBoosterPumpingStationR1({
      ...BOOSTER_PUMPING_STATION_SHORT_INPUT,
    });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows).toHaveLength(52);
    expect(result.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:bps_skid_package", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:bps_pump_units", quantity: "3" }),
      expect.objectContaining({ row_id: "rc09:bps_isolation_valves", quantity: "8" }),
      expect.objectContaining({ row_id: "rc09:bps_nonshrink_grout", quantity: "0.4725" }),
      expect.objectContaining({ row_id: "rc09:bps_power_cable", quantity: "200" }),
      expect.objectContaining({ row_id: "rc09:labor:bps-mechanical", quantity: "144" }),
    ]));
  });

  test("recalculates accessories from the visible selected-skid arrangement", async () => {
    const changed = await compileBoosterPumpingStationR1({
      ...BOOSTER_PUMPING_STATION_SHORT_INPUT,
      bps_pump_installed_piece_per_skid: 4,
      bps_duty_pump_count_per_skid: 3,
      bps_standby_pump_count_per_skid: 1,
    });
    const rows = new Map(changed.rows.map((row) => [row.row_id, row.quantity]));
    expect(rows.get("rc09:bps_pump_units")).toBe("4");
    expect(rows.get("rc09:bps_isolation_valves")).toBe("10");
    expect(rows.get("rc09:bps_check_valves")).toBe("4");
    expect(rows.get("rc09:bps_flexible_connectors")).toBe("8");
    expect(rows.get("rc09:bps_cable_terminations")).toBe("4");
  });

  test("recalculates grout from skid footprint and cable purchase from stock and drums", async () => {
    const changed = await compileBoosterPumpingStationR1({
      ...BOOSTER_PUMPING_STATION_SHORT_INPUT,
      bps_skid_length_m: 4,
      bps_skid_width_m: 2,
      bps_grout_thickness_m: 0.08,
      bps_cable_supplier_drum_length_m: 50,
      bps_cable_available_stock_m: 40,
    });
    const rows = new Map(changed.rows.map((row) => [row.row_id, Number(row.quantity)]));
    expect(rows.get("rc09:bps-grout-balance:installed-net")).toBeCloseTo(0.64);
    expect(rows.get("rc09:bps_nonshrink_grout")).toBeCloseTo(0.672);
    expect(rows.get("rc09:bps-cable-balance:net-order-need")).toBeCloseTo(139.8);
    expect(rows.get("rc09:bps_power_cable")).toBe(150);
  });

  test("lists completion materials while avoiding double cost for factory-included components", () => {
    const includedRows = [
      "rc09:bps_pump_units", "rc09:bps_pressure_vessels", "rc09:bps_isolation_valves",
      "rc09:bps_check_valves", "rc09:bps_flexible_connectors", "rc09:bps_instruments",
      "rc09:bps_mcc_vfd", "rc09:bps_plc_gateway", "rc09:bps_acoustic_enclosure",
      "rc09:bps_drainage_tray",
    ];
    for (const rowId of includedRows) {
      expect(BOOSTER_PUMPING_STATION_RESOURCES.find((row) => row.row_id === rowId)
        ?.resource_graph).toEqual(expect.objectContaining({
        costTreatment: "INCLUDED_IN_RESOURCE_ROWS",
      }));
    }
    for (const rowId of [
      "rc09:bps_anchors", "rc09:bps_nonshrink_grout", "rc09:bps_flanged_joint_sets",
      "rc09:bps_power_cable", "rc09:bps_cable_terminations",
      "rc09:bps_test_water", "rc09:bps_disinfection_reagent",
      "rc09:equipment:bps-lifting", "rc09:logistics:bps-delivery",
    ]) {
      expect(BOOSTER_PUMPING_STATION_RESOURCES.some((row) => row.row_id === rowId)).toBe(true);
    }
  });

  test("keeps room upgrades and standby generation conditional", async () => {
    const result = await compileBoosterPumpingStationR1({
      ...BOOSTER_PUMPING_STATION_ACCEPTANCE_INPUT,
      bps_room_ventilation_upgrade_mode: "REQUIRED",
      bps_room_ventilation_upgrade_designation: "ROOM-VENT-UPGRADE-12ACH",
      bps_room_ventilation_upgrade_quantity_set: 1,
      bps_floor_strengthening_mode: "REQUIRED",
      bps_floor_strengthening_designation: "CFRP-FLOOR-STRENGTHENING-BPS",
      bps_floor_strengthening_quantity_set: 1,
      bps_standby_generator_mode: "REQUIRED",
      bps_standby_generator_designation: "DIESEL-GENSET-200KVA-ATS",
      bps_standby_generator_quantity_set: 1,
    });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows).toHaveLength(55);
  });

  test("rejects invalid values, inconsistent profile and unrelated identities", async () => {
    await expect(compileBoosterPumpingStationR1({
      ...BOOSTER_PUMPING_STATION_SHORT_INPUT,
      bps_skid_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileBoosterPumpingStationR1({
      ...BOOSTER_PUMPING_STATION_SHORT_INPUT,
      bps_pump_installed_piece_per_skid: 4,
    })).rejects.toThrow("BOOSTER_PUMPING_STATION_PUMP_ARRANGEMENT_MISMATCH");
    await expect(compileBoosterPumpingStationR1(
      { ...BOOSTER_PUMPING_STATION_ACCEPTANCE_INPUT },
      { catalogId: `${BOOSTER_PUMPING_STATION_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("BOOSTER_PUMPING_STATION_CATALOG_UNSUPPORTED");
  });
});
