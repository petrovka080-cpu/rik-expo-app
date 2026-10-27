import {
  FIRE_ALARM_COMMISSIONING_STANDARD_ACCEPTANCE_INPUT,
  FIRE_ALARM_COMMISSIONING_STANDARD_CATALOG_ID,
  FIRE_ALARM_COMMISSIONING_STANDARD_FORMULAS,
  FIRE_ALARM_COMMISSIONING_STANDARD_INDEPENDENT_COMPLETENESS_MAP,
  FIRE_ALARM_COMMISSIONING_STANDARD_PARAMETERS,
  FIRE_ALARM_COMMISSIONING_STANDARD_RESOURCES,
  FIRE_ALARM_COMMISSIONING_STANDARD_SHORT_INPUT,
  FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_METADATA,
  compileFireAlarmCommissioningStandardR1,
} from "../../src/lib/estimate/v4/fireAlarmCommissioningStandardR1";

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

describe("S27.3 F09 fire-alarm system commissioning owner", () => {
  test("uses the exact commissioning identity and artifact-backed official boundary", () => {
    expect(FIRE_ALARM_COMMISSIONING_STANDARD_CATALOG_ID)
      .toBe("canonical-work:base:electrical_interior_fire_alarm_commission_standard");
    expect(FIRE_ALARM_COMMISSIONING_STANDARD_PARAMETERS).toHaveLength(8);
    expect(FIRE_ALARM_COMMISSIONING_STANDARD_FORMULAS).toHaveLength(8);
    expect(FIRE_ALARM_COMMISSIONING_STANDARD_RESOURCES).toHaveLength(8);
    expect(FIRE_ALARM_COMMISSIONING_STANDARD_RESOURCES.map((row) => row.row_id))
      .toEqual(ROW_IDS);
    expect(FIRE_ALARM_COMMISSIONING_STANDARD_INDEPENDENT_COMPLETENESS_MAP).toMatchObject({
      sourceKind: "PROJECT_SYSTEM",
      generatedFromCurrentRows: false,
      evidenceSha256: "0eab462536d90bf329f9b1c6605b0a8527e941b18f6e563776ff3eddc44ff33c",
    });
    expect(FIRE_ALARM_COMMISSIONING_STANDARD_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(8);
    expect(FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_METADATA).toMatchObject({
      source_title: "СП КР 21-101:2024 «Пожарная автоматика зданий и сооружений»",
      source_authority:
        "Государственное агентство архитектуры, строительства и жилищно-коммунального хозяйства при Кабинете Министров Кыргызской Республики (Госстрой)",
      official_url: "https://minstroy.gov.kg/ru/kyzmat/217/show",
      artifact_sha256: "0eab462536d90bf329f9b1c6605b0a8527e941b18f6e563776ff3eddc44ff33c",
      effective_from: "2024-07-05",
      source_kind: "OFFICIAL_NORMATIVE_TECHNICAL_BOUNDARY",
    });
    expect(FIRE_ALARM_COMMISSIONING_STANDARD_SOURCE_METADATA.use_restriction)
      .toMatch(/не устанавливает универсальную производительность.*Количества и часы/iu);
  });

  test("known point count emits only the system-level point check and seven local needs", async () => {
    const compiled = await compileFireAlarmCommissioningStandardR1({
      ...FIRE_ALARM_COMMISSIONING_STANDARD_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual([
      expect.objectContaining({ row_id: ROW_IDS[0], quantity: "100", unit_id: "test" }),
    ]);
    expect(compiled.preliminaryNeeds).toHaveLength(7);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(ROW_IDS.slice(1));
  });

  test("full approved project fixture emits eight direct quantities without hidden factors", async () => {
    const compiled = await compileFireAlarmCommissioningStandardR1({
      ...FIRE_ALARM_COMMISSIONING_STANDARD_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.rows.map((row) => row.quantity))
      .toEqual(["100", "2", "8", "12", "5", "96", "24", "4"]);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: ROW_IDS[1], quantity: "2", unit_id: "pcs" }),
      expect.objectContaining({ row_id: ROW_IDS[2], quantity: "8", unit_id: "test" }),
      expect.objectContaining({ row_id: ROW_IDS[3], quantity: "12", unit_id: "test" }),
      expect.objectContaining({ row_id: ROW_IDS[4], quantity: "5", unit_id: "test" }),
      expect.objectContaining({ row_id: ROW_IDS[5], quantity: "96", unit_id: "man_hour" }),
      expect.objectContaining({ row_id: ROW_IDS[6], quantity: "24", unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: ROW_IDS[7], quantity: "4", unit_id: "document" }),
    ]));
    expect(FIRE_ALARM_COMMISSIONING_STANDARD_FORMULAS.map((formula) =>
      (formula as typeof formula & { expression_source: string }).expression_source))
      .toEqual(FIRE_ALARM_COMMISSIONING_STANDARD_PARAMETERS.map((parameter) =>
        parameter.parameter_id));
  });

  test("does not procure installation materials or duplicate device installation", () => {
    const actualRows = JSON.stringify(FIRE_ALARM_COMMISSIONING_STANDARD_RESOURCES.map((row) => ({
      row_id: row.row_id,
      title_ru: row.title_ru,
      category: row.category,
    })));
    expect(actualRows).not.toMatch(
      /fire_alarm_(?:loop_)?cable|conduit|детектор|извещатель.*(?:поставка|монтаж)|блок питания|оповещатель|кот[её]л|радиатор|отоплен/iu,
    );
    expect(FIRE_ALARM_COMMISSIONING_STANDARD_RESOURCES)
      .not.toEqual(expect.arrayContaining([
        expect.objectContaining({ category: "material" }),
      ]));
    expect(FIRE_ALARM_COMMISSIONING_STANDARD_FORMULAS)
      .not.toEqual(expect.arrayContaining([
        expect.objectContaining({ expression_source: expect.stringMatching(/[*/]|normFactor/iu) }),
      ]));
  });

  test("rejects zero quantities and unrelated catalog identities", async () => {
    await expect(compileFireAlarmCommissioningStandardR1({
      ...FIRE_ALARM_COMMISSIONING_STANDARD_ACCEPTANCE_INPUT,
      panel_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileFireAlarmCommissioningStandardR1(
      { ...FIRE_ALARM_COMMISSIONING_STANDARD_ACCEPTANCE_INPUT },
      { catalogId: `${FIRE_ALARM_COMMISSIONING_STANDARD_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("FIRE_ALARM_COMMISSIONING_STANDARD_CATALOG_UNSUPPORTED");
  });
});

test("standard commissioning rejects the retired area catalog identity", async () => {
  await expect(compileFireAlarmCommissioningStandardR1(
    { ...FIRE_ALARM_COMMISSIONING_STANDARD_ACCEPTANCE_INPUT },
    { catalogId: "canonical-work:base:electrical_interior_fire_alarm_commission_large_area" },
  )).rejects.toThrow("FIRE_ALARM_COMMISSIONING_STANDARD_CATALOG_UNSUPPORTED");
  expect(JSON.stringify(FIRE_ALARM_COMMISSIONING_STANDARD_RESOURCES))
    .not.toMatch(/boiler|radiator|heating/iu);
});
