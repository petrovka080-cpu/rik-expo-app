import {
  FIRE_ALARM_COMMISSIONING_LARGE_AREA_ACCEPTANCE_INPUT,
  FIRE_ALARM_COMMISSIONING_LARGE_AREA_CATALOG_ID,
  FIRE_ALARM_COMMISSIONING_LARGE_AREA_FORMULAS,
  FIRE_ALARM_COMMISSIONING_LARGE_AREA_INDEPENDENT_COMPLETENESS_MAP,
  FIRE_ALARM_COMMISSIONING_LARGE_AREA_PARAMETERS,
  FIRE_ALARM_COMMISSIONING_LARGE_AREA_RESOURCES,
  FIRE_ALARM_COMMISSIONING_LARGE_AREA_SHORT_INPUT,
  FIRE_ALARM_COMMISSIONING_LARGE_AREA_SOURCE_METADATA,
  compileFireAlarmCommissioningLargeAreaR1,
} from "../../src/lib/estimate/v4/fireAlarmCommissioningLargeAreaR1";

const ROW_IDS = [
  "f09:fire_alarm_system_point_identification",
  "f09:fire_alarm_panel_configuration",
  "f09:fire_alarm_loop_fault_monitoring_test",
  "f09:fire_alarm_cause_effect_test",
  "f09:fire_alarm_external_interface_test",
  "f09:fire_alarm_commissioning_labor",
  "f09:fire_alarm_test_equipment",
  "f09:fire_alarm_commissioning_protocol",
] as const;

describe("S27.3 F09 large-area fire-alarm commissioning owner", () => {
  test("uses the exact catalog identity and the verified official source artifact", () => {
    expect(FIRE_ALARM_COMMISSIONING_LARGE_AREA_CATALOG_ID)
      .toBe("canonical-work:base:electrical_interior_fire_alarm_commission_large_area");
    expect(FIRE_ALARM_COMMISSIONING_LARGE_AREA_PARAMETERS).toHaveLength(8);
    expect(FIRE_ALARM_COMMISSIONING_LARGE_AREA_FORMULAS).toHaveLength(8);
    expect(FIRE_ALARM_COMMISSIONING_LARGE_AREA_RESOURCES.map((row) => row.row_id))
      .toEqual(ROW_IDS);
    expect(FIRE_ALARM_COMMISSIONING_LARGE_AREA_SOURCE_METADATA).toMatchObject({
      official_url: "https://minstroy.gov.kg/ru/kyzmat/217/show",
      artifact_sha256: "0eab462536d90bf329f9b1c6605b0a8527e941b18f6e563776ff3eddc44ff33c",
    });
    expect(FIRE_ALARM_COMMISSIONING_LARGE_AREA_INDEPENDENT_COMPLETENESS_MAP)
      .toMatchObject({
        generatedFromCurrentRows: false,
        catalogVariant: "LARGE_AREA_SEARCH_IDENTITY_NO_HIDDEN_QUANTITY_FACTOR",
      });
  });

  test("known point count emits one row and seven local project-data needs", async () => {
    const compiled = await compileFireAlarmCommissioningLargeAreaR1({
      ...FIRE_ALARM_COMMISSIONING_LARGE_AREA_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual([
      expect.objectContaining({ row_id: ROW_IDS[0], quantity: "100", unit_id: "test" }),
    ]);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id)).toEqual(ROW_IDS.slice(1));
  });

  test("full approved fixture emits direct quantities without a large-area factor", async () => {
    const compiled = await compileFireAlarmCommissioningLargeAreaR1({
      ...FIRE_ALARM_COMMISSIONING_LARGE_AREA_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.rows.map((row) => row.quantity))
      .toEqual(["100", "2", "8", "12", "5", "96", "24", "4"]);
    expect(FIRE_ALARM_COMMISSIONING_LARGE_AREA_FORMULAS.map((formula) =>
      (formula as typeof formula & { expression_source: string }).expression_source))
      .toEqual(FIRE_ALARM_COMMISSIONING_LARGE_AREA_PARAMETERS.map((parameter) =>
        parameter.parameter_id));
  });

  test("does not add installation materials or cross-system resources", () => {
    const actualRows = JSON.stringify(FIRE_ALARM_COMMISSIONING_LARGE_AREA_RESOURCES.map((row) => ({
      row_id: row.row_id,
      title_ru: row.title_ru,
      category: row.category,
    })));
    expect(actualRows).not.toMatch(
      /fire_alarm_(?:loop_)?cable|conduit|detector_(?:install|material)|boiler|radiator|heating/iu,
    );
    expect(FIRE_ALARM_COMMISSIONING_LARGE_AREA_RESOURCES)
      .not.toEqual(expect.arrayContaining([expect.objectContaining({ category: "material" })]));
  });

  test("rejects invalid quantities and any other catalog identity", async () => {
    await expect(compileFireAlarmCommissioningLargeAreaR1({
      ...FIRE_ALARM_COMMISSIONING_LARGE_AREA_ACCEPTANCE_INPUT,
      panel_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileFireAlarmCommissioningLargeAreaR1(
      { ...FIRE_ALARM_COMMISSIONING_LARGE_AREA_ACCEPTANCE_INPUT },
      { catalogId: "canonical-work:base:electrical_interior_fire_alarm_commission_standard" },
    )).rejects.toThrow("FIRE_ALARM_COMMISSIONING_LARGE_AREA_CATALOG_UNSUPPORTED");
  });
});
