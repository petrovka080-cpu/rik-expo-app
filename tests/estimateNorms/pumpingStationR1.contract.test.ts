import {
  PUMPING_STATION_ACCEPTANCE_INPUT,
  PUMPING_STATION_CATALOG_ID,
  PUMPING_STATION_FORMULAS,
  PUMPING_STATION_PARAMETERS,
  PUMPING_STATION_RESOURCES,
  PUMPING_STATION_RUNTIME_CLASSIFICATION,
  PUMPING_STATION_RUNTIME_INPUT,
  PUMPING_STATION_SHORT_INPUT,
  compilePumpingStationR1,
} from "../../src/lib/estimate/v4/pumpingStationR1";

const quantity = async (input: Record<string, unknown>, rowId: string) => {
  const result = await compilePumpingStationR1(input);
  return Number(result.rows.find((row) => row.row_id === rowId)?.quantity);
};

describe("S27.25 automatic complete potable-water pumping-station owner", () => {
  test("asks only eleven primary facts and keeps the engineering profile visible", () => {
    expect(PUMPING_STATION_CATALOG_ID).toBe("canonical-work:expanded:pumping_station");
    expect(Object.keys(PUMPING_STATION_SHORT_INPUT)).toHaveLength(11);
    expect(Object.keys(PUMPING_STATION_RUNTIME_INPUT)).toHaveLength(70);
    expect(PUMPING_STATION_PARAMETERS).toHaveLength(87);
    expect(PUMPING_STATION_FORMULAS).toHaveLength(68);
    expect(PUMPING_STATION_RESOURCES).toHaveLength(68);
    expect(Object.values(PUMPING_STATION_RUNTIME_CLASSIFICATION))
      .toEqual(expect.arrayContaining(["ASSUMPTION"]));
    expect(Object.keys(PUMPING_STATION_SHORT_INPUT).join(" ")).not.toMatch(
      /quantity|labor|machine|trip|test_count|concrete_volume|reinforcement_mass/iu,
    );
  });

  test("ordinary facts compile the complete non-conditional resource chain without questions", async () => {
    const result = await compilePumpingStationR1({ ...PUMPING_STATION_SHORT_INPUT });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows).toHaveLength(65);
    expect(result.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:wps_excavation", quantity: "808.704" }),
      expect.objectContaining({ row_id: "rc09:wps_structural_concrete", quantity: "166.1648" }),
      expect.objectContaining({ row_id: "rc09:wps_reinforcement", quantity: "22.797" }),
      expect.objectContaining({ row_id: "rc09:wps_isolation_valves", quantity: "8" }),
      expect.objectContaining({ row_id: "rc09:wps_check_valves", quantity: "3" }),
      expect.objectContaining({ row_id: "rc09:wps_nonshrink_grout", quantity: "1.8" }),
      expect.objectContaining({ row_id: "rc09:wps_power_cable", quantity: "300" }),
    ]));
  });

  test("recalculates civil quantities from primary station geometry", async () => {
    const baseline = await compilePumpingStationR1({ ...PUMPING_STATION_SHORT_INPUT });
    const changed = await compilePumpingStationR1({
      ...PUMPING_STATION_SHORT_INPUT,
      wps_internal_length_m: 15,
      wps_internal_width_m: 10,
    });
    const q = (result: typeof baseline, rowId: string) => Number(
      result.rows.find((row) => row.row_id === rowId)?.quantity,
    );
    expect(q(changed, "rc09:wps_excavation")).toBeGreaterThan(q(baseline, "rc09:wps_excavation"));
    expect(q(changed, "rc09:wps_structural_concrete"))
      .toBeGreaterThan(q(baseline, "rc09:wps_structural_concrete"));
    expect(q(changed, "rc09:wps_reinforcement"))
      .toBeGreaterThan(q(baseline, "rc09:wps_reinforcement"));
    expect(q(changed, "rc09:wps_pump_units")).toBe(q(baseline, "rc09:wps_pump_units"));
  });

  test("recalculates cable purchase from loss, spare, package and available stock", async () => {
    const baseline = await compilePumpingStationR1({ ...PUMPING_STATION_SHORT_INPUT });
    const changed = await compilePumpingStationR1({
      ...PUMPING_STATION_SHORT_INPUT,
      wps_cable_supplier_drum_length_m: 50,
      wps_cable_available_stock_m: 40,
    });
    const q = (result: typeof baseline, rowId: string) => Number(
      result.rows.find((row) => row.row_id === rowId)?.quantity,
    );
    expect(q(baseline, "rc09:wps-cable-balance:total-need")).toBeCloseTo(267.2);
    expect(q(baseline, "rc09:wps_power_cable")).toBe(300);
    expect(q(changed, "rc09:wps-cable-balance:net-order-need")).toBeCloseTo(227.2);
    expect(q(changed, "rc09:wps-cable-balance:drum-count")).toBe(5);
    expect(q(changed, "rc09:wps_power_cable")).toBe(250);
  });

  test("contains materials, labor, mechanisms, tests and logistics needed for completion", () => {
    const requiredRows = [
      "rc09:wps_blinding", "rc09:wps_structural_concrete", "rc09:wps_reinforcement",
      "rc09:wps_formwork", "rc09:wps_waterproofing", "rc09:wps_imported_backfill",
      "rc09:wps_pump_units", "rc09:wps_suction_manifold", "rc09:wps_discharge_manifold",
      "rc09:wps_isolation_valves", "rc09:wps_flanged_joint_sets",
      "rc09:wps_cable_terminations", "rc09:wps_curing_compound",
      "rc09:wps_test_water", "rc09:wps_disinfection_reagent",
      "rc09:labor:wps-earthworks", "rc09:labor:wps-mechanical",
      "rc09:equipment:wps-excavator", "rc09:equipment:wps-crane",
      "rc09:logistics:wps-material-delivery", "rc09:wps_asbuilt",
    ];
    expect(requiredRows.every((rowId) => PUMPING_STATION_RESOURCES.some(
      (row) => row.row_id === rowId,
    ))).toBe(true);
  });

  test("keeps shoring, dewatering and standby generation conditional", async () => {
    const result = await compilePumpingStationR1({
      ...PUMPING_STATION_ACCEPTANCE_INPUT,
      wps_excavation_shoring_mode: "REQUIRED",
      wps_excavation_shoring_designation: "SECANT-PILE-SHORING",
      wps_excavation_shoring_area_m2: 420,
      wps_groundwater_dewatering_mode: "REQUIRED",
      wps_groundwater_dewatering_designation: "WELLPOINT-120M3H",
      wps_groundwater_dewatering_machine_h: 360,
      wps_standby_generator_mode: "REQUIRED",
      wps_standby_generator_designation: "DIESEL-GENSET-400KVA-ATS",
      wps_standby_generator_quantity_set: 1,
    });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows).toHaveLength(68);
  });

  test("rejects invalid quantities, pump arrangements and unrelated identities", async () => {
    await expect(compilePumpingStationR1({
      ...PUMPING_STATION_SHORT_INPUT,
      wps_station_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compilePumpingStationR1({
      ...PUMPING_STATION_SHORT_INPUT,
      wps_standby_pump_count: 2,
    })).rejects.toThrow("PUMPING_STATION_PUMP_ARRANGEMENT_MISMATCH");
    await expect(compilePumpingStationR1(
      { ...PUMPING_STATION_ACCEPTANCE_INPUT },
      { catalogId: `${PUMPING_STATION_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("PUMPING_STATION_CATALOG_UNSUPPORTED");
  });

  test("changes actual calculated outputs rather than accepting final quantities", async () => {
    await expect(quantity({
      ...PUMPING_STATION_SHORT_INPUT,
      wps_pump_installed_piece: 4,
      wps_duty_pump_count: 3,
      wps_standby_pump_count: 1,
    }, "rc09:wps_isolation_valves")).resolves.toBe(10);
  });
});
