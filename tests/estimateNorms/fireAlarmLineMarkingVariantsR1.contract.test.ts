import {
  FIRE_ALARM_LINE_MARKING_ACCEPTANCE_INPUT,
  FIRE_ALARM_LINE_MARKING_ARTIFACT_SHA256,
  FIRE_ALARM_LINE_MARKING_FORMULAS,
  FIRE_ALARM_LINE_MARKING_PARAMETERS,
  FIRE_ALARM_LINE_MARKING_RESOURCES,
  FIRE_ALARM_LINE_MARKING_SHORT_INPUT,
  FIRE_ALARM_LINE_MARKING_SOURCE_METADATA,
  FIRE_ALARM_LINE_MARKING_VARIANTS,
  compileFireAlarmLineMarkingVariantR1,
  fireAlarmLineMarkingCompletenessMap,
  resolveFireAlarmLineMarkingVariant,
  type FireAlarmLineMarkingVariantKey,
} from "../../src/lib/estimate/v4/fireAlarmLineMarkingVariantsR1";

const VARIANT_KEYS = Object.keys(
  FIRE_ALARM_LINE_MARKING_VARIANTS,
) as FireAlarmLineMarkingVariantKey[];

describe("S27.3 F09 fire-alarm line-marking variants", () => {
  test("binds six catalog identities without turning clause 12.60 into a fake rate", () => {
    expect(VARIANT_KEYS).toEqual([
      "high_load",
      "standard",
      "technical_room",
      "wet_zone",
    ]);
    expect(FIRE_ALARM_LINE_MARKING_SOURCE_METADATA).toMatchObject({
      official_url: "https://minstroy.gov.kg/ru/kyzmat/217/show",
      artifact_sha256: FIRE_ALARM_LINE_MARKING_ARTIFACT_SHA256,
    });
    expect(FIRE_ALARM_LINE_MARKING_SOURCE_METADATA.use_restriction)
      .toMatch(/не является универсальной нормой расхода/iu);
    expect(new Set(VARIANT_KEYS.map((key) =>
      FIRE_ALARM_LINE_MARKING_VARIANTS[key].catalogId)).size).toBe(4);
  });

  test.each(VARIANT_KEYS)("%s emits only the confirmed marking operation first", async (key) => {
    const compiled = await compileFireAlarmLineMarkingVariantR1(key, {
      ...FIRE_ALARM_LINE_MARKING_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual([
      expect.objectContaining({
        row_id: "f09:fire_alarm_mark_objects",
        quantity: "40",
        unit_id: "pcs",
      }),
    ]);
    expect(compiled.preliminaryNeeds).toHaveLength(3);
    expect(fireAlarmLineMarkingCompletenessMap(key)).toMatchObject({
      generatedFromCurrentRows: false,
      catalogVariant: expect.stringMatching(/NO_HIDDEN_QUANTITY_FACTOR$/u),
    });
  });

  test.each(VARIANT_KEYS)("%s preserves independent project quantities", async (key) => {
    const compiled = await compileFireAlarmLineMarkingVariantR1(key, {
      ...FIRE_ALARM_LINE_MARKING_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.map((row) => ({ rowId: row.row_id, quantity: row.quantity })))
      .toEqual([
        { rowId: "f09:fire_alarm_mark_objects", quantity: "40" },
        { rowId: "f09:fire_alarm_marker_material", quantity: "80" },
        { rowId: "f09:fire_alarm_marking_labor", quantity: "6.5" },
        { rowId: "f09:fire_alarm_marking_inspection", quantity: "2" },
      ]);
  });

  test("contains no hidden one-to-one material or labor coefficient", () => {
    expect(FIRE_ALARM_LINE_MARKING_PARAMETERS).toHaveLength(6);
    expect(FIRE_ALARM_LINE_MARKING_FORMULAS).toHaveLength(4);
    expect(FIRE_ALARM_LINE_MARKING_RESOURCES).toHaveLength(4);
    const formulas = JSON.stringify(FIRE_ALARM_LINE_MARKING_FORMULAS);
    expect(formulas).not.toMatch(/marked_object_count\s*\*|high_load_factor|area_factor/iu);
    expect(JSON.stringify(FIRE_ALARM_LINE_MARKING_RESOURCES)).not.toMatch(
      /line_laying|connection_end|device_install|system_commission|boiler|radiator|heating/iu,
    );
  });

  test("rejects unsupported identities, scope values and zero counts", async () => {
    expect(() => resolveFireAlarmLineMarkingVariant("unsupported"))
      .toThrow("FIRE_ALARM_LINE_MARKING_VARIANT_UNSUPPORTED");
    await expect(compileFireAlarmLineMarkingVariantR1(
      "standard",
      { ...FIRE_ALARM_LINE_MARKING_ACCEPTANCE_INPUT },
      { catalogId: FIRE_ALARM_LINE_MARKING_VARIANTS.wet_zone.catalogId },
    )).rejects.toThrow("FIRE_ALARM_LINE_MARKING_CATALOG_UNSUPPORTED");
    await expect(compileFireAlarmLineMarkingVariantR1("standard", {
      ...FIRE_ALARM_LINE_MARKING_ACCEPTANCE_INPUT,
      marked_object_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileFireAlarmLineMarkingVariantR1("standard", {
      ...FIRE_ALARM_LINE_MARKING_ACCEPTANCE_INPUT,
      marking_scope: "UNPROVEN_SCOPE",
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
});
