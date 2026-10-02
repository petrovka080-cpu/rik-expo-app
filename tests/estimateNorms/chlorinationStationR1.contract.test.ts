import {
  CHLORINATION_STATION_ACCEPTANCE_INPUT,
  CHLORINATION_STATION_CATALOG_ID,
  CHLORINATION_STATION_FORMULAS,
  CHLORINATION_STATION_PARAMETERS,
  CHLORINATION_STATION_RESOURCES,
  CHLORINATION_STATION_RUNTIME_CLASSIFICATION,
  CHLORINATION_STATION_RUNTIME_INPUT,
  CHLORINATION_STATION_SHORT_INPUT,
  compileChlorinationStationR1,
  parseChlorinationStationOrdinaryPromptR1,
} from "../../src/lib/estimate/v4/chlorinationStationR1";

const quantity = async (input: Record<string, unknown>, rowId: string) => {
  const result = await compileChlorinationStationR1(input);
  return Number(result.rows.find((row) => row.row_id === rowId)?.quantity);
};

describe("S27.26 automatic complete sodium-hypochlorite station owner", () => {
  test("asks eight primary facts and keeps engineering assumptions in a visible profile", () => {
    expect(CHLORINATION_STATION_CATALOG_ID).toBe(
      "canonical-work:expanded:chlorination_station",
    );
    expect(Object.keys(CHLORINATION_STATION_SHORT_INPUT)).toHaveLength(8);
    expect(Object.keys(CHLORINATION_STATION_RUNTIME_INPUT)).toHaveLength(92);
    expect(CHLORINATION_STATION_PARAMETERS).toHaveLength(106);
    expect(CHLORINATION_STATION_FORMULAS).toHaveLength(80);
    expect(CHLORINATION_STATION_RESOURCES).toHaveLength(80);
    expect(Object.values(CHLORINATION_STATION_RUNTIME_CLASSIFICATION))
      .toEqual(expect.arrayContaining(["ASSUMPTION"]));
    expect(Object.keys(CHLORINATION_STATION_SHORT_INPUT).join(" ")).not.toMatch(
      /excavation|concrete_volume|reinforcement_mass|labor|machine|trip|package_count|pipe_length/iu,
    );
    const ordinary = CHLORINATION_STATION_PARAMETERS.slice(0, 8);
    const profile = CHLORINATION_STATION_PARAMETERS.slice(8, 100);
    expect(ordinary.every((parameter) =>
      parameter.truth_metadata.preliminary_compilation_allowed === false
      && (parameter.truth_metadata.guide as Record<string, unknown>)
        .guide_validation_policy === "MANDATORY_BLOCK"
    )).toBe(true);
    expect(profile.every((parameter) =>
      parameter.truth_metadata.preliminary_compilation_allowed === true
      && (parameter.truth_metadata.guide as Record<string, unknown>)
        .guide_validation_policy === "ADVISORY_REASON_REQUIRED"
    )).toBe(true);
  });

  test("extracts stated facts and leaves only genuinely unknown facts for the form", () => {
    expect(parseChlorinationStationOrdinaryPromptR1(
      "смета на станцию хлорирования производительностью 1000 м3 в сутки",
    )).toEqual({
      chl_station_count: "1",
      chl_design_flow_m3_day: "1000",
    });
    expect(parseChlorinationStationOrdinaryPromptR1(
      "Строительство 1 станции хлорирования CHL-NAOCL-1000-1IP производительностью 1000 м3/сут, технология гипохлорит натрия, расчётная доза 2 мг/л, раствор концентрацией 12.5%, дозирующий пакет DS-NAOCL-2X15LPH-PVC, 1 точка ввода.",
    )).toEqual(Object.fromEntries(Object.entries(CHLORINATION_STATION_SHORT_INPUT)
      .map(([key, value]) => [key, String(value)])));
  });

  test("ordinary facts compile the complete non-conditional resource chain", async () => {
    const result = await compileChlorinationStationR1({
      ...CHLORINATION_STATION_SHORT_INPUT,
    });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows).toHaveLength(77);
    expect(result.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc11:chl_design_flow", quantity: "1000" }),
      expect.objectContaining({ row_id: "rc11:chl_active_chlorine_demand", quantity: "2" }),
      expect.objectContaining({ row_id: "rc11:chl_solution_daily_mass", quantity: "16" }),
      expect.objectContaining({ row_id: "rc11:chl_storage_volume", quantity: "0.2" }),
      expect.objectContaining({ row_id: "rc11:chl_storage_tanks", quantity: "1" }),
      expect.objectContaining({ row_id: "rc11:chl_excavation", quantity: "21" }),
      expect.objectContaining({ row_id: "rc11:chl_structural_concrete", quantity: "6.18" }),
      expect.objectContaining({ row_id: "rc11:chl_reinforcement", quantity: "0.72" }),
      expect.objectContaining({ row_id: "rc11:chl_dosing_pumps", quantity: "2" }),
      expect.objectContaining({ row_id: "rc11:chl_reagent_order", quantity: "300" }),
    ]));
  });

  test("recalculates demand from flow, dose and concentration", async () => {
    const baseline = await compileChlorinationStationR1({
      ...CHLORINATION_STATION_SHORT_INPUT,
    });
    const changed = await compileChlorinationStationR1({
      ...CHLORINATION_STATION_SHORT_INPUT,
      chl_design_flow_m3_day: 4000,
      chl_design_dose_mg_l: 4,
      chl_solution_concentration_percent: 10,
    });
    const q = (result: typeof baseline, rowId: string) => Number(
      result.rows.find((row) => row.row_id === rowId)?.quantity,
    );
    expect(q(changed, "rc11:chl_active_chlorine_demand"))
      .toBeGreaterThan(q(baseline, "rc11:chl_active_chlorine_demand"));
    expect(q(changed, "rc11:chl_solution_daily_mass"))
      .toBeGreaterThan(q(baseline, "rc11:chl_solution_daily_mass"));
    expect(q(changed, "rc11:chl_storage_volume"))
      .toBeGreaterThan(q(baseline, "rc11:chl_storage_volume"));
    expect(q(changed, "rc11:chl_storage_tanks"))
      .toBeGreaterThan(q(baseline, "rc11:chl_storage_tanks"));
  });

  test("recalculates civil materials from building geometry", async () => {
    const baseline = await compileChlorinationStationR1({
      ...CHLORINATION_STATION_SHORT_INPUT,
    });
    const changed = await compileChlorinationStationR1({
      ...CHLORINATION_STATION_SHORT_INPUT,
      chl_building_length_m: 8,
      chl_building_width_m: 5,
    });
    const q = (result: typeof baseline, rowId: string) => Number(
      result.rows.find((row) => row.row_id === rowId)?.quantity,
    );
    expect(q(changed, "rc11:chl_excavation"))
      .toBeGreaterThan(q(baseline, "rc11:chl_excavation"));
    expect(q(changed, "rc11:chl_structural_concrete"))
      .toBeGreaterThan(q(baseline, "rc11:chl_structural_concrete"));
    expect(q(changed, "rc11:chl_reinforcement"))
      .toBeGreaterThan(q(baseline, "rc11:chl_reinforcement"));
    expect(q(changed, "rc11:chl_structural_steel"))
      .toBeGreaterThan(q(baseline, "rc11:chl_structural_steel"));
  });

  test("recalculates reagent purchase from reserve, stock and supplier package", async () => {
    const changed = await compileChlorinationStationR1({
      ...CHLORINATION_STATION_SHORT_INPUT,
      chl_reagent_available_stock_kg: 50,
      chl_reagent_supplier_package_kg: 100,
    });
    const q = (rowId: string) => Number(
      changed.rows.find((row) => row.row_id === rowId)?.quantity,
    );
    expect(q("rc11:chl-reagent-balance:initial-fill")).toBe(240);
    expect(q("rc11:chl-reagent-balance:retained-spare")).toBe(48);
    expect(q("rc11:chl-reagent-balance:available-stock")).toBe(50);
    expect(q("rc11:chl-reagent-balance:total-need")).toBe(288);
    expect(q("rc11:chl-reagent-balance:net-order-need")).toBe(238);
    expect(q("rc11:chl-reagent-balance:package-count")).toBe(3);
    expect(q("rc11:chl_reagent_order")).toBe(300);
    expect(q("rc11:chl-reagent-balance:remainder")).toBe(110);
    expect(q("rc11:chl-reagent-balance:surplus-beyond-spare")).toBe(62);
  });

  test("contains civil, process, safety, electrical, labor, mechanism, QA and logistics", () => {
    const requiredRows = [
      "rc11:chl_blinding", "rc11:chl_structural_concrete",
      "rc11:chl_reinforcement", "rc11:chl_formwork",
      "rc11:chl_floor_coating", "rc11:chl_structural_steel",
      "rc11:chl_wall_panels", "rc11:chl_roof_panels",
      "rc11:chl_storage_tanks", "rc11:chl_dosing_pumps",
      "rc11:chl_transfer_pumps", "rc11:chl_injection_quills",
      "rc11:chl_process_pipe", "rc11:chl_process_valves",
      "rc11:chl_exhaust_fans", "rc11:chl_gas_detectors",
      "rc11:chl_eyewash", "rc11:chl_spill_kits",
      "rc11:chl_level_instruments", "rc11:chl_residual_analyzers",
      "rc11:chl_control_panels", "rc11:chl_power_cable",
      "rc11:chl_control_cable", "rc11:chl_flushing_water",
      "rc11:labor:chl-civil", "rc11:labor:chl-process",
      "rc11:labor:chl-electrical", "rc11:equipment:chl-excavator",
      "rc11:equipment:chl-crane", "rc11:chl_asbuilt",
      "rc11:chl_process_commissioning", "rc11:logistics:chl-reagent",
    ];
    expect(requiredRows.every((rowId) => CHLORINATION_STATION_RESOURCES.some(
      (row) => row.row_id === rowId,
    ))).toBe(true);
    expect(JSON.stringify(CHLORINATION_STATION_FORMULAS)).not.toMatch(
      /waterTreatmentPlantCalculator|golden_rate|normFactor/iu,
    );
  });

  test("keeps shoring, dewatering and standby power conditional", async () => {
    const result = await compileChlorinationStationR1({
      ...CHLORINATION_STATION_ACCEPTANCE_INPUT,
      chl_excavation_shoring_mode: "REQUIRED",
      chl_excavation_shoring_designation: "SHEET-PILE-CHEMICAL-ROOM",
      chl_excavation_shoring_area_m2: 80,
      chl_groundwater_dewatering_mode: "REQUIRED",
      chl_groundwater_dewatering_designation: "WELLPOINT-40M3H",
      chl_groundwater_dewatering_machine_h: 40,
      chl_standby_power_mode: "REQUIRED",
      chl_standby_power_designation: "DIESEL-GENSET-40KVA-AMF",
      chl_standby_power_kva: 40,
    });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows).toHaveLength(80);
  });

  test("rejects invalid primary facts and unrelated identities", async () => {
    await expect(compileChlorinationStationR1({
      ...CHLORINATION_STATION_SHORT_INPUT,
      chl_station_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileChlorinationStationR1({
      ...CHLORINATION_STATION_SHORT_INPUT,
      chl_solution_concentration_percent: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileChlorinationStationR1(
      { ...CHLORINATION_STATION_ACCEPTANCE_INPUT },
      { catalogId: `${CHLORINATION_STATION_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("CHLORINATION_STATION_CATALOG_UNSUPPORTED");
  });

  test("changes calculated outputs instead of accepting final resource quantities", async () => {
    await expect(quantity({
      ...CHLORINATION_STATION_SHORT_INPUT,
      chl_injection_point_count: 3,
    }, "rc11:chl_dosing_pumps")).resolves.toBe(6);
  });
});
