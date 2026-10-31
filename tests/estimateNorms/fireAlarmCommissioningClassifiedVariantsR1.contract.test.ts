import {
  FIRE_ALARM_COMMISSIONING_CLASSIFIED_ACCEPTANCE_INPUT,
  FIRE_ALARM_COMMISSIONING_CLASSIFIED_FORMULAS,
  FIRE_ALARM_COMMISSIONING_CLASSIFIED_PARAMETERS,
  FIRE_ALARM_COMMISSIONING_CLASSIFIED_RESOURCES,
  FIRE_ALARM_COMMISSIONING_CLASSIFIED_SHORT_INPUT,
  FIRE_ALARM_COMMISSIONING_CLASSIFIED_SOURCE_METADATA,
  FIRE_ALARM_COMMISSIONING_CLASSIFIED_VARIANTS,
  compileFireAlarmCommissioningClassifiedVariantR1,
  fireAlarmCommissioningClassifiedCompletenessMap,
  resolveFireAlarmCommissioningClassifiedVariant,
  type FireAlarmCommissioningClassifiedVariantKey,
} from "../../src/lib/estimate/v4/fireAlarmCommissioningClassifiedVariantsR1";

const VARIANT_KEYS = Object.keys(
  FIRE_ALARM_COMMISSIONING_CLASSIFIED_VARIANTS,
) as FireAlarmCommissioningClassifiedVariantKey[];

describe("S27.3 F09 classified fire-alarm commissioning variants", () => {
  test("preserves the surviving exact identities and source boundary", () => {
    expect(VARIANT_KEYS).toEqual([ "technical_room", "wet_zone"]);
    expect(new Set(VARIANT_KEYS.map((key) =>
      FIRE_ALARM_COMMISSIONING_CLASSIFIED_VARIANTS[key].catalogId)).size).toBe(2);
    expect(FIRE_ALARM_COMMISSIONING_CLASSIFIED_SOURCE_METADATA).toMatchObject({
      official_url: "https://minstroy.gov.kg/ru/kyzmat/217/show",
      artifact_sha256: "0eab462536d90bf329f9b1c6605b0a8527e941b18f6e563776ff3eddc44ff33c",
    });
    for (const key of VARIANT_KEYS) {
      expect(fireAlarmCommissioningClassifiedCompletenessMap(key)).toMatchObject({
        generatedFromCurrentRows: false,
        catalogVariant: expect.stringMatching(/NO_HIDDEN_QUANTITY_FACTOR$/u),
      });
    }
  });

  test.each(VARIANT_KEYS)("%s emits one known row and seven local needs", async (key) => {
    const compiled = await compileFireAlarmCommissioningClassifiedVariantR1(key, {
      ...FIRE_ALARM_COMMISSIONING_CLASSIFIED_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual([
      expect.objectContaining({
        row_id: "f09:fire_alarm_system_point_identification",
        quantity: "100",
        unit_id: "test",
      }),
    ]);
    expect(compiled.preliminaryNeeds).toHaveLength(7);
  });

  test.each(VARIANT_KEYS)("%s uses only direct full-fixture quantities", async (key) => {
    const compiled = await compileFireAlarmCommissioningClassifiedVariantR1(key, {
      ...FIRE_ALARM_COMMISSIONING_CLASSIFIED_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.map((row) => row.quantity))
      .toEqual(["100", "2", "8", "12", "5", "96", "24", "4"]);
    expect(FIRE_ALARM_COMMISSIONING_CLASSIFIED_FORMULAS.map((formula) =>
      (formula as typeof formula & { expression_source: string }).expression_source))
      .toEqual(FIRE_ALARM_COMMISSIONING_CLASSIFIED_PARAMETERS.map((parameter) =>
        parameter.parameter_id));
  });

  test("classification words do not add material or cross-system rows", () => {
    const rows = JSON.stringify(FIRE_ALARM_COMMISSIONING_CLASSIFIED_RESOURCES.map((row) => ({
      row_id: row.row_id,
      title_ru: row.title_ru,
      category: row.category,
    })));
    expect(rows).not.toMatch(
      /fire_alarm_(?:loop_)?cable|conduit|detector_(?:install|material)|boiler|radiator|heating/iu,
    );
    expect(FIRE_ALARM_COMMISSIONING_CLASSIFIED_RESOURCES)
      .not.toEqual(expect.arrayContaining([expect.objectContaining({ category: "material" })]));
  });

  test("rejects unknown variants, other identities and zero quantities", async () => {
    expect(() => resolveFireAlarmCommissioningClassifiedVariant("large_area"))
      .toThrow("FIRE_ALARM_COMMISSIONING_CLASSIFIED_VARIANT_UNSUPPORTED");
    await expect(compileFireAlarmCommissioningClassifiedVariantR1(
      "technical_room",
      { ...FIRE_ALARM_COMMISSIONING_CLASSIFIED_ACCEPTANCE_INPUT },
      { catalogId: "canonical-work:base:unrelated_work_standard" },
    )).rejects.toThrow("FIRE_ALARM_COMMISSIONING_CLASSIFIED_CATALOG_UNSUPPORTED");
    await expect(compileFireAlarmCommissioningClassifiedVariantR1("wet_zone", {
      ...FIRE_ALARM_COMMISSIONING_CLASSIFIED_ACCEPTANCE_INPUT,
      panel_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
});
