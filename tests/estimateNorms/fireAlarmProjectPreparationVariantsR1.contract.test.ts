import {
  FIRE_ALARM_PROJECT_PREPARATION_ACCEPTANCE_INPUT,
  FIRE_ALARM_PROJECT_PREPARATION_FORMULAS,
  FIRE_ALARM_PROJECT_PREPARATION_PARAMETERS,
  FIRE_ALARM_PROJECT_PREPARATION_RESOURCES,
  FIRE_ALARM_PROJECT_PREPARATION_SHORT_INPUT,
  FIRE_ALARM_PROJECT_PREPARATION_SOURCE_METADATA,
  FIRE_ALARM_PROJECT_PREPARATION_VARIANTS,
  compileFireAlarmProjectPreparationVariantR1,
  fireAlarmProjectPreparationCompletenessMap,
  resolveFireAlarmProjectPreparationVariant,
  type FireAlarmProjectPreparationVariantKey,
} from "../../src/lib/estimate/v4/fireAlarmProjectPreparationVariantsR1";

const VARIANT_KEYS = Object.keys(
  FIRE_ALARM_PROJECT_PREPARATION_VARIANTS,
) as FireAlarmProjectPreparationVariantKey[];

describe("S27.6 F09 fire-alarm project preparation variants", () => {
  test("uses five exact identities and one current official technical boundary", () => {
    expect(VARIANT_KEYS).toEqual([
      "large_area",
      "small_area",
      "standard",
      "technical_room",
      "wet_zone",
    ]);
    expect(new Set(VARIANT_KEYS.map((key) =>
      FIRE_ALARM_PROJECT_PREPARATION_VARIANTS[key].catalogId)).size).toBe(5);
    expect(FIRE_ALARM_PROJECT_PREPARATION_SOURCE_METADATA).toMatchObject({
      source_title: "СП КР 21-101:2024 «Пожарная автоматика зданий и сооружений»",
      source_authority:
        "Государственное агентство архитектуры, строительства и жилищно-коммунального хозяйства при Кабинете Министров Кыргызской Республики (Госстрой)",
      official_url: "https://minstroy.gov.kg/ru/kyzmat/217/show",
      artifact_sha256: "0eab462536d90bf329f9b1c6605b0a8527e941b18f6e563776ff3eddc44ff33c",
    });
    for (const key of VARIANT_KEYS) {
      expect(fireAlarmProjectPreparationCompletenessMap(key)).toMatchObject({
        generatedFromCurrentRows: false,
        catalogVariant: expect.stringMatching(/NO_HIDDEN_QUANTITY_FACTOR$/u),
      });
    }
  });

  test.each(VARIANT_KEYS)("%s exposes area and defers eleven project inputs", async (key) => {
    const compiled = await compileFireAlarmProjectPreparationVariantR1(key, {
      ...FIRE_ALARM_PROJECT_PREPARATION_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual([
      expect.objectContaining({
        row_id: "f09:fire_alarm_preparation_protected_area_survey",
        quantity: "800",
        unit_id: "m2",
      }),
    ]);
    expect(compiled.preliminaryNeeds).toHaveLength(11);
  });

  test.each(VARIANT_KEYS)("%s uses direct fixture quantities without area factors", async (key) => {
    const compiled = await compileFireAlarmProjectPreparationVariantR1(key, {
      ...FIRE_ALARM_PROJECT_PREPARATION_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.map((row) => row.quantity)).toEqual([
      "800", "24", "3", "96", "8", "4", "16", "60", "8", "1", "12", "2",
    ]);
    expect(FIRE_ALARM_PROJECT_PREPARATION_FORMULAS.map((formula) =>
      (formula as typeof formula & { expression_source: string }).expression_source))
      .toEqual(FIRE_ALARM_PROJECT_PREPARATION_PARAMETERS.map((parameter) =>
        parameter.parameter_id));
  });

  test("contains no installation, material or commissioning rows", () => {
    const rows = JSON.stringify(FIRE_ALARM_PROJECT_PREPARATION_RESOURCES.map((row) => ({
      row_id: row.row_id,
      title_ru: row.title_ru,
      category: row.category,
    })));
    expect(rows).not.toMatch(
      /detector_install|loop_cable|control_panel|sounder|power_supply|commissioning|пусконалад/iu,
    );
    expect(FIRE_ALARM_PROJECT_PREPARATION_RESOURCES)
      .not.toEqual(expect.arrayContaining([expect.objectContaining({ category: "material" })]));
  });

  test("rejects unknown variants, identity substitution and invalid area", async () => {
    expect(() => resolveFireAlarmProjectPreparationVariant("high_load"))
      .toThrow("FIRE_ALARM_PROJECT_PREPARATION_VARIANT_UNSUPPORTED");
    await expect(compileFireAlarmProjectPreparationVariantR1(
      "small_area",
      { ...FIRE_ALARM_PROJECT_PREPARATION_ACCEPTANCE_INPUT },
      { catalogId: FIRE_ALARM_PROJECT_PREPARATION_VARIANTS.wet_zone.catalogId },
    )).rejects.toThrow("FIRE_ALARM_PROJECT_PREPARATION_CATALOG_UNSUPPORTED");
    await expect(compileFireAlarmProjectPreparationVariantR1("standard", {
      ...FIRE_ALARM_PROJECT_PREPARATION_ACCEPTANCE_INPUT,
      protected_area_m2: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
});
