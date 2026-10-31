import {
  FIRE_ALARM_CABLE_LAYING_ACCEPTANCE_INPUT,
  FIRE_ALARM_CABLE_LAYING_ARTIFACT_SHA256,
  FIRE_ALARM_CABLE_LAYING_FORMULAS,
  FIRE_ALARM_CABLE_LAYING_PARAMETERS,
  FIRE_ALARM_CABLE_LAYING_RESOURCES,
  FIRE_ALARM_CABLE_LAYING_SHORT_INPUT,
  FIRE_ALARM_CABLE_LAYING_SOURCE_METADATA,
  FIRE_ALARM_CABLE_LAYING_VARIANTS,
  compileFireAlarmCableLayingVariantR1,
  fireAlarmCableLayingCompletenessMap,
  resolveFireAlarmCableLayingVariant,
  type FireAlarmCableLayingVariantKey,
} from "../../src/lib/estimate/v4/fireAlarmCableLayingVariantsR1";

const VARIANT_KEYS = Object.keys(
  FIRE_ALARM_CABLE_LAYING_VARIANTS,
) as FireAlarmCableLayingVariantKey[];

describe("S27.3 F09 fire-alarm cable-laying variants", () => {
  test("binds six identities to the exact official line boundary", () => {
    expect(VARIANT_KEYS).toEqual([
      "high_load",
      "standard",
      "technical_room",
      "wet_zone",
    ]);
    expect(new Set(VARIANT_KEYS.map((key) =>
      FIRE_ALARM_CABLE_LAYING_VARIANTS[key].catalogId)).size).toBe(4);
    expect(FIRE_ALARM_CABLE_LAYING_SOURCE_METADATA).toMatchObject({
      source_title: "СП КР 21-101:2024 «Пожарная автоматика зданий и сооружений»",
      source_authority:
        "Государственное агентство архитектуры, строительства и жилищно-коммунального хозяйства при Кабинете Министров Кыргызской Республики (Госстрой)",
      official_url: "https://minstroy.gov.kg/ru/kyzmat/217/show",
      artifact_sha256: FIRE_ALARM_CABLE_LAYING_ARTIFACT_SHA256,
    });
    expect(FIRE_ALARM_CABLE_LAYING_SOURCE_METADATA.exact_locator)
      .toMatch(/§§12\.57–12\.72.*PDF pages 168–170/u);
  });

  test.each(VARIANT_KEYS)("%s emits route work and net cable without reserve", async (key) => {
    const compiled = await compileFireAlarmCableLayingVariantR1(key, {
      ...FIRE_ALARM_CABLE_LAYING_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual([
      expect.objectContaining({
        row_id: "f09:fire_alarm_line_laying",
        quantity: "120",
        unit_id: "m",
      }),
      expect.objectContaining({
        row_id: "f09:fire_alarm_line_cable",
        quantity: "120",
        unit_id: "m",
      }),
    ]);
    expect(compiled.preliminaryNeeds).toHaveLength(6);
    expect(fireAlarmCableLayingCompletenessMap(key)).toMatchObject({
      generatedFromCurrentRows: false,
      catalogVariant: expect.stringMatching(/NO_HIDDEN_QUANTITY_FACTOR$/u),
    });
  });

  test.each(VARIANT_KEYS)("%s compiles only direct approved accessory quantities", async (key) => {
    const compiled = await compileFireAlarmCableLayingVariantR1(key, {
      ...FIRE_ALARM_CABLE_LAYING_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.map((row) => ({ rowId: row.row_id, quantity: row.quantity })))
      .toEqual([
        { rowId: "f09:fire_alarm_line_laying", quantity: "120" },
        { rowId: "f09:fire_alarm_line_cable", quantity: "120" },
        { rowId: "f09:fire_alarm_line_fastener", quantity: "240" },
        { rowId: "f09:fire_alarm_line_integrity_test", quantity: "2" },
        { rowId: "f09:fire_alarm_line_label", quantity: "12" },
        { rowId: "f09:fire_alarm_line_junction_box", quantity: "4" },
        { rowId: "f09:fire_alarm_line_metallic_protection", quantity: "15" },
        { rowId: "f09:fire_alarm_line_protection_grounding", quantity: "2" },
      ]);
  });

  test("does not invent waste, spacing, labor or classification factors", () => {
    expect(FIRE_ALARM_CABLE_LAYING_PARAMETERS).toHaveLength(19);
    expect(FIRE_ALARM_CABLE_LAYING_FORMULAS).toHaveLength(8);
    expect(FIRE_ALARM_CABLE_LAYING_RESOURCES).toHaveLength(8);
    const formulas = JSON.stringify(FIRE_ALARM_CABLE_LAYING_FORMULAS);
    expect(formulas).not.toMatch(/route_length_m\s*\*\s*1\.|waste|spacing|high_load_factor/iu);
    const rows = JSON.stringify(FIRE_ALARM_CABLE_LAYING_RESOURCES);
    expect(rows).not.toMatch(
      /connection_end|addressable_smoke_detector|control_panel|system_commission|boiler|radiator|heating/iu,
    );
  });

  test("keeps optional project branches out when explicitly not required", async () => {
    const compiled = await compileFireAlarmCableLayingVariantR1("standard", {
      ...FIRE_ALARM_CABLE_LAYING_SHORT_INPUT,
      fastener_designation: "Крепление по проекту",
      fastener_quantity_piece: 200,
      integrity_test_count: 1,
      labeling_mode: "NOT_REQUIRED",
      junction_box_mode: "NOT_REQUIRED",
      emi_protection_mode: "NOT_REQUIRED",
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(4);
    expect(compiled.rows.map((row) => row.row_id)).not.toEqual(expect.arrayContaining([
      "f09:fire_alarm_line_label",
      "f09:fire_alarm_line_junction_box",
      "f09:fire_alarm_line_metallic_protection",
      "f09:fire_alarm_line_protection_grounding",
    ]));
  });

  test("rejects unsupported identities and conductor diameter below the official minimum", async () => {
    expect(() => resolveFireAlarmCableLayingVariant("unsupported"))
      .toThrow("FIRE_ALARM_CABLE_LAYING_VARIANT_UNSUPPORTED");
    await expect(compileFireAlarmCableLayingVariantR1(
      "standard",
      { ...FIRE_ALARM_CABLE_LAYING_ACCEPTANCE_INPUT },
      { catalogId: FIRE_ALARM_CABLE_LAYING_VARIANTS.wet_zone.catalogId },
    )).rejects.toThrow("FIRE_ALARM_CABLE_LAYING_CATALOG_UNSUPPORTED");
    await expect(compileFireAlarmCableLayingVariantR1("wet_zone", {
      ...FIRE_ALARM_CABLE_LAYING_ACCEPTANCE_INPUT,
      conductor_diameter_mm: 0.49,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
});
