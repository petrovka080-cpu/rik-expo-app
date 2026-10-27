import {
  FIRE_ALARM_DETECTOR_REPLACEMENT_ACCEPTANCE_INPUT,
  FIRE_ALARM_DETECTOR_REPLACEMENT_FORMULAS,
  FIRE_ALARM_DETECTOR_REPLACEMENT_PARAMETERS,
  FIRE_ALARM_DETECTOR_REPLACEMENT_RESOURCES,
  FIRE_ALARM_DETECTOR_REPLACEMENT_SHORT_INPUT,
  FIRE_ALARM_DETECTOR_REPLACEMENT_SOURCE_METADATA,
  FIRE_ALARM_DETECTOR_REPLACEMENT_VARIANTS,
  compileFireAlarmDetectorReplacementVariantR1,
  fireAlarmDetectorReplacementCompletenessMap,
  resolveFireAlarmDetectorReplacementVariant,
  type FireAlarmDetectorReplacementVariantKey,
} from "../../src/lib/estimate/v4/fireAlarmDetectorReplacementVariantsR1";

const VARIANT_KEYS = Object.keys(
  FIRE_ALARM_DETECTOR_REPLACEMENT_VARIANTS,
) as FireAlarmDetectorReplacementVariantKey[];

describe("S27.6 F09 fire-alarm detector replacement variants", () => {
  test("preserves the surviving exact identities and source boundary", () => {
    expect(VARIANT_KEYS).toEqual([
      "high_load",
      "standard",
      "technical_room",
      "wet_zone",
    ]);
    expect(new Set(VARIANT_KEYS.map((key) =>
      FIRE_ALARM_DETECTOR_REPLACEMENT_VARIANTS[key].catalogId)).size).toBe(4);
    expect(FIRE_ALARM_DETECTOR_REPLACEMENT_SOURCE_METADATA).toMatchObject({
      official_url: "https://minstroy.gov.kg/ru/kyzmat/217/show",
      artifact_sha256:
        "0eab462536d90bf329f9b1c6605b0a8527e941b18f6e563776ff3eddc44ff33c",
    });
    for (const key of VARIANT_KEYS) {
      expect(fireAlarmDetectorReplacementCompletenessMap(key)).toMatchObject({
        generatedFromCurrentRows: false,
        catalogVariant: expect.stringMatching(/NO_HIDDEN_QUANTITY_FACTOR$/u),
      });
    }
  });

  test.each(VARIANT_KEYS)("%s exposes known cardinality and local project gaps", async (key) => {
    const compiled = await compileFireAlarmDetectorReplacementVariantR1(key, {
      ...FIRE_ALARM_DETECTOR_REPLACEMENT_SHORT_INPUT,
    });
    expect(compiled.rows.map((row) => ({
      rowId: row.row_id,
      quantity: row.quantity,
    }))).toEqual([
      { rowId: "f09:fire_alarm_replacement_new_detector", quantity: "25" },
      { rowId: "f09:fire_alarm_replacement_address_label", quantity: "25" },
      { rowId: "f09:fire_alarm_replacement_returned_device", quantity: "25" },
    ]);
    expect(compiled.preliminaryNeeds).toHaveLength(6);
  });

  test.each(VARIANT_KEYS)("%s uses direct replacement and waste quantities", async (key) => {
    const compiled = await compileFireAlarmDetectorReplacementVariantR1(key, {
      ...FIRE_ALARM_DETECTOR_REPLACEMENT_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.map((row) => row.quantity)).toEqual([
      "25", "25", "5", "9", "4", "25", "25", "0.12", "1.2", "1",
      "2", "5", "1", "1",
    ]);
    expect(FIRE_ALARM_DETECTOR_REPLACEMENT_FORMULAS).toHaveLength(15);
    expect(FIRE_ALARM_DETECTOR_REPLACEMENT_RESOURCES).toHaveLength(15);
  });

  test("keeps removal, installation, consumables and waste explicit without adjacent scope", () => {
    const rows = JSON.stringify(FIRE_ALARM_DETECTOR_REPLACEMENT_RESOURCES.map((row) => ({
      row_id: row.row_id,
      title_ru: row.title_ru,
      category: row.category,
    })));
    expect(rows).toMatch(/removal_labor|installation_labor|test_aerosol|e_waste/iu);
    expect(rows).not.toMatch(
      /loop_cable|control_panel|sounder|power_supply|full_fire_alarm_system/iu,
    );
    expect(JSON.stringify(FIRE_ALARM_DETECTOR_REPLACEMENT_FORMULAS))
      .not.toMatch(/classification|area_factor|load_factor|golden_rate|normFactor/iu);
  });

  test("rejects unknown variants, identity substitution and invalid branches", async () => {
    expect(() => resolveFireAlarmDetectorReplacementVariant("expanded"))
      .toThrow("FIRE_ALARM_DETECTOR_REPLACEMENT_VARIANT_UNSUPPORTED");
    await expect(compileFireAlarmDetectorReplacementVariantR1(
      "high_load",
      { ...FIRE_ALARM_DETECTOR_REPLACEMENT_ACCEPTANCE_INPUT },
      { catalogId: "canonical-work:base:unrelated_work_standard" },
    )).rejects.toThrow("FIRE_ALARM_DETECTOR_REPLACEMENT_CATALOG_UNSUPPORTED");
    await expect(compileFireAlarmDetectorReplacementVariantR1("standard", {
      ...FIRE_ALARM_DETECTOR_REPLACEMENT_ACCEPTANCE_INPUT,
      replacement_device_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileFireAlarmDetectorReplacementVariantR1("wet_zone", {
      ...FIRE_ALARM_DETECTOR_REPLACEMENT_SHORT_INPUT,
      replacement_base_designation: "Недопустимое значение при отключённой ветви",
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });

  test("keeps every quantity input visible and source-owned", () => {
    expect(FIRE_ALARM_DETECTOR_REPLACEMENT_PARAMETERS).toHaveLength(23);
    for (const parameter of FIRE_ALARM_DETECTOR_REPLACEMENT_PARAMETERS) {
      expect(parameter.truth_metadata).toMatchObject({
        hidden_default_forbidden: true,
        synthetic: false,
      });
    }
  });
});
