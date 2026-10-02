import {
  FIRE_FIGHTING_PUMP_STATION_ACCEPTANCE_INPUT,
  FIRE_FIGHTING_PUMP_STATION_CATALOG_ID,
  FIRE_FIGHTING_PUMP_STATION_FORMULAS,
  FIRE_FIGHTING_PUMP_STATION_INDEPENDENT_COMPLETENESS_MAP,
  FIRE_FIGHTING_PUMP_STATION_PARAMETERS,
  FIRE_FIGHTING_PUMP_STATION_RESOURCES,
  FIRE_FIGHTING_PUMP_STATION_SHORT_INPUT,
  FIRE_FIGHTING_PUMP_STATION_SOURCE_METADATA,
  compileFireFightingPumpStationR1,
} from "../../src/lib/estimate/v4/fireFightingPumpStationR1";

describe("S27.3 F09 fire-fighting pump-station owner", () => {
  test("uses the exact pump-station identity and official artifact boundary", () => {
    expect(FIRE_FIGHTING_PUMP_STATION_CATALOG_ID)
      .toBe("canonical-work:expanded:fire_fighting_pump_station");
    expect(FIRE_FIGHTING_PUMP_STATION_PARAMETERS).toHaveLength(34);
    expect(FIRE_FIGHTING_PUMP_STATION_FORMULAS).toHaveLength(21);
    expect(FIRE_FIGHTING_PUMP_STATION_RESOURCES).toHaveLength(33);
    expect(FIRE_FIGHTING_PUMP_STATION_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(33);
    expect(FIRE_FIGHTING_PUMP_STATION_SOURCE_METADATA).toMatchObject({
      source_title: "СП КР 21-101:2024 «Пожарная автоматика зданий и сооружений»",
      source_authority:
        "Государственное агентство архитектуры, строительства и жилищно-коммунального хозяйства при Кабинете Министров Кыргызской Республики (Госстрой)",
      official_url: "https://minstroy.gov.kg/ru/kyzmat/217/show",
      artifact_sha256: "0eab462536d90bf329f9b1c6605b0a8527e941b18f6e563776ff3eddc44ff33c",
      effective_from: "2024-07-05",
    });
  });

  test("known station count emits only project-basis review and explicit local needs", async () => {
    const compiled = await compileFireFightingPumpStationR1({
      ...FIRE_FIGHTING_PUMP_STATION_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual([
      expect.objectContaining({
        row_id: "f09:fire_pump_station_scope_review",
        quantity: "1",
      }),
    ]);
    expect(compiled.preliminaryNeeds).toHaveLength(32);
    expect(compiled.preliminaryNeeds).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "f09:fire_pump" }),
      expect.objectContaining({ row_id: "f09:fire_pump_diesel_interfaces", need_state: "CONDITION_REQUIRED" }),
      expect.objectContaining({ row_id: "f09:fire_pump_station_flow_performance_test" }),
    ]));
  });

  test("full electric fixture emits 31 rows and preserves one labor cost owner", async () => {
    const compiled = await compileFireFightingPumpStationR1({
      ...FIRE_FIGHTING_PUMP_STATION_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(31);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "f09:fire_pump", quantity: "2" }),
      expect.objectContaining({ row_id: "f09:fire_brigade_connection", quantity: "2" }),
      expect.objectContaining({ row_id: "f09:fire_pump_station_installation_commissioning_labor", quantity: "640" }),
      expect.objectContaining({ row_id: "f09:fire_pump_station_automatic_start_test", quantity: "4" }),
    ]));
    expect(compiled.rows.map((row) => row.row_id))
      .not.toEqual(expect.arrayContaining([
        "f09:fire_pump_diesel_interfaces",
        "f09:fire_pump_diesel_interfaces_install",
      ]));
    const included = FIRE_FIGHTING_PUMP_STATION_RESOURCES.filter((row) =>
      row.resource_graph.costTreatment === "INCLUDED_IN_RESOURCE_ROWS");
    expect(included).toHaveLength(16);
    expect(included.every((row) =>
      row.resource_graph.parentCostOwnerId
        === "f09:fire_pump_station_installation_commissioning_labor")).toBe(true);
  });

  test("surfaces missing diesel details locally and rejects prohibited hidden minima", async () => {
    const incompleteDiesel = await compileFireFightingPumpStationR1({
      ...FIRE_FIGHTING_PUMP_STATION_ACCEPTANCE_INPUT,
      diesel_interface_mode: "REQUIRED",
    });
    expect(incompleteDiesel.preliminaryNeeds).toEqual(expect.arrayContaining([
      expect.objectContaining({
        row_id: "f09:fire_pump_diesel_interfaces",
        missing_parameter_ids: expect.arrayContaining([
          "diesel_interface_designation",
          "diesel_interface_set_count",
        ]),
      }),
      expect.objectContaining({
        row_id: "f09:fire_pump_diesel_interfaces_install",
        missing_parameter_ids: ["diesel_interface_set_count"],
      }),
    ]));
    expect(incompleteDiesel.preliminaryNeeds).toHaveLength(2);
    const diesel = await compileFireFightingPumpStationR1({
      ...FIRE_FIGHTING_PUMP_STATION_ACCEPTANCE_INPUT,
      diesel_interface_mode: "REQUIRED",
      diesel_interface_designation: "Комплект интерфейсов дизельного насоса по проекту",
      diesel_interface_set_count: 1,
    });
    expect(diesel.rows).toHaveLength(33);
    expect(diesel.preliminaryNeeds).toEqual([]);
    await expect(compileFireFightingPumpStationR1({
      ...FIRE_FIGHTING_PUMP_STATION_ACCEPTANCE_INPUT,
      fire_pump_count: 1,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileFireFightingPumpStationR1({
      ...FIRE_FIGHTING_PUMP_STATION_ACCEPTANCE_INPUT,
      fire_brigade_connection_count: 1,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });

  test("contains no HVAC substitution or universal rate and rejects unrelated identities", async () => {
    const actualRows = JSON.stringify(FIRE_FIGHTING_PUMP_STATION_RESOURCES.map((row) => ({
      rowId: row.row_id,
      titleRu: row.title_ru,
      formulaId: row.formula_id,
    })));
    expect(actualRows).not.toMatch(/отоплен|воздуховод|вентилятор|радиатор|кот[её]л|heating|boiler/iu);
    expect(FIRE_FIGHTING_PUMP_STATION_FORMULAS)
      .not.toEqual(expect.arrayContaining([
        expect.objectContaining({ expression_source: expect.stringMatching(/[*/]|normFactor/iu) }),
      ]));
    await expect(compileFireFightingPumpStationR1(
      { ...FIRE_FIGHTING_PUMP_STATION_ACCEPTANCE_INPUT },
      { catalogId: `${FIRE_FIGHTING_PUMP_STATION_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("FIRE_FIGHTING_PUMP_STATION_CATALOG_UNSUPPORTED");
  });
});
