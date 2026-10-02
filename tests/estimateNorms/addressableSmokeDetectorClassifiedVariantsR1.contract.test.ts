import {
  ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_ACCEPTANCE_INPUT,
  ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_FORMULAS,
  ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_PARAMETERS,
  ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_RESOURCES,
  ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_SHORT_INPUT,
  ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_VARIANTS,
  compileAddressableSmokeDetectorClassifiedVariantR1,
  resolveAddressableSmokeDetectorClassifiedVariant,
  type AddressableSmokeDetectorClassifiedVariantKey,
} from "../../src/lib/estimate/v4/addressableSmokeDetectorClassifiedVariantsR1";

const VARIANT_KEYS = Object.keys(
  ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_VARIANTS,
) as AddressableSmokeDetectorClassifiedVariantKey[];

describe("S27.6 F09 classified addressable smoke-detector install identities", () => {
  test("keeps five catalog identities on one physical profile without hidden factors", () => {
    expect(VARIANT_KEYS).toEqual([
      "high_load",
      "large_area",
      "small_area",
      "technical_room",
      "wet_zone",
    ]);
    expect(new Set(VARIANT_KEYS.map((key) =>
      ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_VARIANTS[key].catalogId)).size).toBe(5);
    expect(ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_PARAMETERS).toHaveLength(29);
    expect(ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_FORMULAS).toHaveLength(28);
    expect(ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_RESOURCES).toHaveLength(28);
    expect(JSON.stringify(ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_FORMULAS))
      .not.toMatch(/classification|area_factor|load_factor|golden_rate|normFactor/iu);
  });

  test.each(VARIANT_KEYS)("%s exposes known device cardinality and local gaps", async (key) => {
    const compiled = await compileAddressableSmokeDetectorClassifiedVariantR1(key, {
      ...ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_SHORT_INPUT,
    });
    expect(compiled.rows).toHaveLength(16);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:addressable_smoke_detector_install", quantity: "25" }),
      expect.objectContaining({ row_id: "rc09:addressable_optical_smoke_detector", quantity: "25" }),
      expect.objectContaining({ row_id: "rc09:addressable_detector_base", quantity: "25" }),
      expect.objectContaining({ row_id: "rc09:detector_address_label", quantity: "25" }),
    ]));
    expect(compiled.preliminaryNeeds).toHaveLength(12);
  });

  test.each(VARIANT_KEYS)("%s uses only direct project quantities", async (key) => {
    const compiled = await compileAddressableSmokeDetectorClassifiedVariantR1(key, {
      ...ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(26);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:detector_fire_resistant_fastener", quantity: "25" }),
      expect.objectContaining({ row_id: "rc09:smoke_detector_test_aerosol", quantity: "0.18" }),
      expect.objectContaining({ row_id: "rc09:smoke_detector_test_dispenser", quantity: "1.5" }),
      expect.objectContaining({ row_id: "rc09:smoke_detector_activation_record", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:labor:installation", quantity: "15" }),
      expect.objectContaining({ row_id: "rc09:equipment:loop-programmer", quantity: "4" }),
      expect.objectContaining({ row_id: "rc09:logistics:delivery", quantity: "1" }),
    ]));
  });

  test("classification words do not add adjacent fire-alarm-system scope", () => {
    const rows = JSON.stringify(ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_RESOURCES.map((row) => ({
      row_id: row.row_id,
      title_ru: row.title_ru,
      category: row.category,
    })));
    expect(rows).not.toMatch(
      /fire_alarm_loop_cable|control_panel|sounder|power_supply|full_fire_alarm_system/iu,
    );
  });

  test("rejects unknown variants, other identities and zero device count", async () => {
    expect(() => resolveAddressableSmokeDetectorClassifiedVariant("standard"))
      .toThrow("ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_VARIANT_UNSUPPORTED");
    await expect(compileAddressableSmokeDetectorClassifiedVariantR1(
      "small_area",
      { ...ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_ACCEPTANCE_INPUT },
      { catalogId: ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_VARIANTS.wet_zone.catalogId },
    )).rejects.toThrow("ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_CATALOG_UNSUPPORTED");
    await expect(compileAddressableSmokeDetectorClassifiedVariantR1("wet_zone", {
      ...ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_ACCEPTANCE_INPUT,
      detector_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
});
