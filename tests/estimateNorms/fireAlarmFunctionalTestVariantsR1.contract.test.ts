import {
  FIRE_ALARM_FUNCTIONAL_TEST_ACCEPTANCE_INPUT,
  FIRE_ALARM_FUNCTIONAL_TEST_FORMULAS,
  FIRE_ALARM_FUNCTIONAL_TEST_PARAMETERS,
  FIRE_ALARM_FUNCTIONAL_TEST_RESOURCES,
  FIRE_ALARM_FUNCTIONAL_TEST_SHORT_INPUT,
  FIRE_ALARM_FUNCTIONAL_TEST_SOURCE_METADATA,
  FIRE_ALARM_FUNCTIONAL_TEST_VARIANTS,
  compileFireAlarmFunctionalTestVariantR1,
  fireAlarmFunctionalTestCompletenessMap,
  resolveFireAlarmFunctionalTestVariant,
  type FireAlarmFunctionalTestVariantKey,
} from "../../src/lib/estimate/v4/fireAlarmFunctionalTestVariantsR1";

const VARIANT_KEYS = Object.keys(
  FIRE_ALARM_FUNCTIONAL_TEST_VARIANTS,
) as FireAlarmFunctionalTestVariantKey[];

describe("S27.6 F09 fire-alarm functional-test variants", () => {
  test("preserves the surviving exact identities and source boundary", () => {
    expect(VARIANT_KEYS).toEqual([
      "high_load", "standard", "technical_room", "wet_zone",
    ]);
    expect(new Set(VARIANT_KEYS.map((key) =>
      FIRE_ALARM_FUNCTIONAL_TEST_VARIANTS[key].catalogId)).size).toBe(4);
    expect(FIRE_ALARM_FUNCTIONAL_TEST_SOURCE_METADATA).toMatchObject({
      official_url: "https://minstroy.gov.kg/ru/kyzmat/217/show",
      artifact_sha256:
        "0eab462536d90bf329f9b1c6605b0a8527e941b18f6e563776ff3eddc44ff33c",
    });
    for (const key of VARIANT_KEYS) {
      expect(fireAlarmFunctionalTestCompletenessMap(key)).toMatchObject({
        generatedFromCurrentRows: false,
        catalogVariant: expect.stringMatching(/NO_HIDDEN_QUANTITY_FACTOR$/u),
      });
    }
  });

  test.each(VARIANT_KEYS)("%s exposes known detector tests and defers local inputs", async (key) => {
    const compiled = await compileFireAlarmFunctionalTestVariantR1(key, {
      ...FIRE_ALARM_FUNCTIONAL_TEST_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual([
      expect.objectContaining({
        row_id: "f09:fire_alarm_detector_functional_test",
        quantity: "100",
        unit_id: "test",
      }),
    ]);
    expect(compiled.preliminaryNeeds).toHaveLength(10);
  });

  test.each(VARIANT_KEYS)("%s uses direct test-program quantities", async (key) => {
    const compiled = await compileFireAlarmFunctionalTestVariantR1(key, {
      ...FIRE_ALARM_FUNCTIONAL_TEST_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.map((row) => row.quantity)).toEqual([
      "100", "5", "8", "6", "4", "2", "40", "0.25", "8", "2", "1",
    ]);
    expect(FIRE_ALARM_FUNCTIONAL_TEST_FORMULAS).toHaveLength(11);
    expect(FIRE_ALARM_FUNCTIONAL_TEST_RESOURCES).toHaveLength(11);
  });

  test("contains functional tests, labor, consumable, equipment and documents only", () => {
    const rows = JSON.stringify(FIRE_ALARM_FUNCTIONAL_TEST_RESOURCES.map((row) => ({
      row_id: row.row_id,
      title_ru: row.title_ru,
      category: row.category,
    })));
    expect(rows).toMatch(/detector_functional_test|test_labor|test_aerosol|test_equipment|protocol/iu);
    expect(rows).not.toMatch(
      /detector_install|detector_replacement|panel_configuration|loop_cable|device_procurement/iu,
    );
    expect(JSON.stringify(FIRE_ALARM_FUNCTIONAL_TEST_FORMULAS))
      .not.toMatch(/classification|area_factor|load_factor|golden_rate|normFactor/iu);
  });

  test("allows explicit zero only for absent test-program branches", async () => {
    const compiled = await compileFireAlarmFunctionalTestVariantR1("standard", {
      ...FIRE_ALARM_FUNCTIONAL_TEST_ACCEPTANCE_INPUT,
      manual_call_point_test_count: 0,
      external_interface_test_count: 0,
      defect_register_document_count: 0,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.find((row) =>
      row.row_id === "f09:fire_alarm_manual_call_point_test")?.quantity).toBe("0");
    expect(FIRE_ALARM_FUNCTIONAL_TEST_PARAMETERS.find((parameter) =>
      parameter.parameter_id === "manual_call_point_test_count")?.truth_metadata)
      .toMatchObject({ zero_value_meaning: "EXPLICITLY_ABSENT_FROM_APPROVED_TEST_PROGRAM" });
  });

  test("rejects unknown variants, identity substitution and invalid detector count", async () => {
    expect(() => resolveFireAlarmFunctionalTestVariant("expanded"))
      .toThrow("FIRE_ALARM_FUNCTIONAL_TEST_VARIANT_UNSUPPORTED");
    await expect(compileFireAlarmFunctionalTestVariantR1(
      "high_load",
      { ...FIRE_ALARM_FUNCTIONAL_TEST_ACCEPTANCE_INPUT },
      { catalogId: "canonical-work:base:unrelated_work_standard" },
    )).rejects.toThrow("FIRE_ALARM_FUNCTIONAL_TEST_CATALOG_UNSUPPORTED");
    await expect(compileFireAlarmFunctionalTestVariantR1("wet_zone", {
      ...FIRE_ALARM_FUNCTIONAL_TEST_ACCEPTANCE_INPUT,
      detector_test_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
});
