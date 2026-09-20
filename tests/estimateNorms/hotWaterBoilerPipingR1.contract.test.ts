import {
  HOT_WATER_BOILER_PIPING_ACCEPTANCE_INPUT,
  HOT_WATER_BOILER_PIPING_CATALOG_ID,
  HOT_WATER_BOILER_PIPING_FORMULAS,
  HOT_WATER_BOILER_PIPING_PARAMETERS,
  HOT_WATER_BOILER_PIPING_RESOURCES,
  HOT_WATER_BOILER_PIPING_SHORT_INPUT,
  compileHotWaterBoilerPipingR1,
} from "../../src/lib/estimate/v4/hotWaterBoilerPipingR1";

const REQUIRED = [
  "rc09:hot_water_boiler_install_pipe",
  "rc09:hot_water_boiler_500kw",
  "rc09:modulating_gas_burner_500kw",
  "rc09:boiler_flange_gasket_fastener_set",
  "rc09:boiler_isolation_valve",
  "rc09:boiler_safety_group",
  "rc09:boiler_thermomanometer_sensor_set",
  "rc09:high_temperature_flue_sealant",
  "rc09:boiler_hydraulic_safety_commission",
] as const;
const CONDITIONAL = [
  "rc09:gas_train",
  "rc09:boiler_circulation_pump",
  "rc09:plate_heat_exchanger",
  "rc09:expansion_vessel",
  "rc09:water_treatment",
] as const;

describe("MASTER hot-water boiler piping owner", () => {
  test("uses the exact expanded boiler-installation owner without historical project rates", () => {
    expect(HOT_WATER_BOILER_PIPING_CATALOG_ID)
      .toBe("canonical-work:expanded:boiler_installation");
    expect(HOT_WATER_BOILER_PIPING_PARAMETERS).toHaveLength(29);
    expect(HOT_WATER_BOILER_PIPING_FORMULAS).toHaveLength(14);
    expect(HOT_WATER_BOILER_PIPING_RESOURCES).toHaveLength(14);
    expect(JSON.stringify(HOT_WATER_BOILER_PIPING_FORMULAS))
      .not.toMatch(/golden_rate|normFactor|boiler_count\s*\*\s*(?:4|1\.2)/iu);
    expect(HOT_WATER_BOILER_PIPING_RESOURCES.map((row) => row.row_id))
      .not.toContain("rc09:full_boiler_house");
  });

  test("known count, power, fuel and burner give useful direct rows plus local needs", async () => {
    const compiled = await compileHotWaterBoilerPipingR1({
      ...HOT_WATER_BOILER_PIPING_SHORT_INPUT,
    });
    expect(compiled.rows).toHaveLength(4);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "1", unit_id: "set" }),
      expect.objectContaining({ row_id: REQUIRED[1], quantity: "1", unit_id: "set" }),
      expect.objectContaining({ row_id: REQUIRED[2], quantity: "1", unit_id: "set" }),
      expect.objectContaining({ row_id: REQUIRED[8], quantity: "1", unit_id: "test" }),
    ]));
    expect(compiled.preliminaryNeeds).toHaveLength(10);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([...REQUIRED.slice(3, 8), ...CONDITIONAL]));
  });

  test("compiles the nine-row evidence-bound mandatory fixture", async () => {
    const compiled = await compileHotWaterBoilerPipingR1({
      ...HOT_WATER_BOILER_PIPING_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(9);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[3], quantity: "4", unit_id: "set" }),
      expect.objectContaining({ row_id: REQUIRED[4], quantity: "4", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[5], quantity: "1", unit_id: "set" }),
      expect.objectContaining({ row_id: REQUIRED[6], quantity: "1", unit_id: "set" }),
      expect.objectContaining({ row_id: REQUIRED[7], quantity: "1.1", unit_id: "kg" }),
    ]));
  });

  test("keeps five boiler-house auxiliaries conditional", async () => {
    const compiled = await compileHotWaterBoilerPipingR1({
      ...HOT_WATER_BOILER_PIPING_ACCEPTANCE_INPUT,
      gas_train_mode: "REQUIRED",
      gas_train_designation: "Газовая рампа по паспорту горелки",
      gas_train_quantity: 1,
      circulation_pump_mode: "REQUIRED",
      circulation_pump_designation: "Насос котлового контура по проекту",
      circulation_pump_quantity: 2,
      plate_heat_exchanger_mode: "REQUIRED",
      plate_heat_exchanger_designation: "Теплообменник по тепломеханической схеме",
      plate_heat_exchanger_quantity: 1,
      expansion_vessel_mode: "REQUIRED",
      expansion_vessel_designation: "Расширительный бак по расчёту проекта",
      expansion_vessel_quantity: 1,
      water_treatment_mode: "REQUIRED",
      water_treatment_designation: "Водоподготовка по анализу исходной воды",
      water_treatment_quantity: 1,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(14);
    expect(compiled.rows.map((row) => row.row_id))
      .toEqual(expect.arrayContaining([...CONDITIONAL]));
  });

  test("rejects invalid values and unrelated identities", async () => {
    await expect(compileHotWaterBoilerPipingR1({
      ...HOT_WATER_BOILER_PIPING_SHORT_INPUT,
      boiler_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileHotWaterBoilerPipingR1(
      { ...HOT_WATER_BOILER_PIPING_ACCEPTANCE_INPUT },
      { catalogId: `${HOT_WATER_BOILER_PIPING_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("HOT_WATER_BOILER_PIPING_CATALOG_UNSUPPORTED");
  });
});
