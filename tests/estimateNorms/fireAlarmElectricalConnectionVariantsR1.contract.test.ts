import {
  FIRE_ALARM_ELECTRICAL_CONNECTION_ACCEPTANCE_INPUT,
  FIRE_ALARM_ELECTRICAL_CONNECTION_ARTIFACT_SHA256,
  FIRE_ALARM_ELECTRICAL_CONNECTION_FORMULAS,
  FIRE_ALARM_ELECTRICAL_CONNECTION_METHODS,
  FIRE_ALARM_ELECTRICAL_CONNECTION_PARAMETERS,
  FIRE_ALARM_ELECTRICAL_CONNECTION_RESOURCES,
  FIRE_ALARM_ELECTRICAL_CONNECTION_SHORT_INPUT,
  FIRE_ALARM_ELECTRICAL_CONNECTION_SOURCE_METADATA,
  FIRE_ALARM_ELECTRICAL_CONNECTION_VARIANTS,
  compileFireAlarmElectricalConnectionVariantR1,
  fireAlarmElectricalConnectionCompletenessMap,
  resolveFireAlarmElectricalConnectionVariant,
  type FireAlarmElectricalConnectionVariantKey,
} from "../../src/lib/estimate/v4/fireAlarmElectricalConnectionVariantsR1";

const VARIANT_KEYS = Object.keys(
  FIRE_ALARM_ELECTRICAL_CONNECTION_VARIANTS,
) as FireAlarmElectricalConnectionVariantKey[];

function quantities(rows: readonly { row_id: string; quantity: string }[]) {
  return Object.fromEntries(rows.map((row) => [row.row_id, row.quantity]));
}

describe("S27.3 F09 fire-alarm electrical connection variants", () => {
  test("uses six exact identities and the verified official KРЕРм artifact", () => {
    expect(VARIANT_KEYS).toEqual([
      "high_load",
      "large_area",
      "small_area",
      "standard",
      "technical_room",
      "wet_zone",
    ]);
    expect(new Set(VARIANT_KEYS.map((key) =>
      FIRE_ALARM_ELECTRICAL_CONNECTION_VARIANTS[key].catalogId)).size).toBe(6);
    expect(FIRE_ALARM_ELECTRICAL_CONNECTION_PARAMETERS).toHaveLength(2);
    expect(FIRE_ALARM_ELECTRICAL_CONNECTION_FORMULAS).toHaveLength(14);
    expect(FIRE_ALARM_ELECTRICAL_CONNECTION_RESOURCES).toHaveLength(14);
    expect(FIRE_ALARM_ELECTRICAL_CONNECTION_SOURCE_METADATA).toMatchObject({
      official_url: "https://minstroy.gov.kg/ru/kyzmat/369/show",
      artifact_sha256: FIRE_ALARM_ELECTRICAL_CONNECTION_ARTIFACT_SHA256,
      source_kind: "OFFICIAL_RESOURCE_RATE",
    });
    expect(FIRE_ALARM_ELECTRICAL_CONNECTION_ARTIFACT_SHA256)
      .toBe("bc7646110a1a29815881ee2cffe33e2288e3bde7a3183c2f3daa1e9f109e6550");
    for (const key of VARIANT_KEYS) {
      expect(fireAlarmElectricalConnectionCompletenessMap(key)).toMatchObject({
        sourceKind: "NORMATIVE_OPERATION_MAP",
        rateTable: "KRERM_11_08_001",
        generatedFromCurrentRows: false,
        catalogVariant: expect.stringMatching(/NO_HIDDEN_QUANTITY_FACTOR$/u),
      });
    }
  });

  test("known end count emits only method-independent rows and local method needs", async () => {
    const compiled = await compileFireAlarmElectricalConnectionVariantR1("high_load", {
      ...FIRE_ALARM_ELECTRICAL_CONNECTION_SHORT_INPUT,
    });
    expect(compiled.rows.map((row) => row.row_id)).toEqual([
      "f09:fire_alarm_connection_dichloroethane",
      "f09:fire_alarm_connection_marking_tags",
      "f09:fire_alarm_connection_pvc_tube",
    ]);
    expect(compiled.preliminaryNeeds).toHaveLength(11);
    expect(compiled.preliminaryNeeds.every((need) =>
      need.missing_parameter_ids.includes("connection_method"))).toBe(true);
  });

  test.each([
    ["SCREW_WITH_LUG", "11.3"],
    ["SCREW_WITH_RING", "9.27"],
    ["SCREW_TINNED_NO_RING", "10.3"],
  ] as const)("%s applies the exact non-soldered table rates", async (method, labor) => {
    const compiled = await compileFireAlarmElectricalConnectionVariantR1("high_load", {
      connection_end_count: 100,
      connection_method: method,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(7);
    expect(quantities(compiled.rows)).toMatchObject({
      [`f09:fire_alarm_connection_labor_${method.toLowerCase()}`]: labor,
      "f09:fire_alarm_connection_ethanol_regular": "0.029",
      "f09:fire_alarm_connection_dichloroethane": "0.00002",
      "f09:fire_alarm_connection_rosin_regular": "0.019",
      "f09:fire_alarm_connection_marking_tags": "1",
      "f09:fire_alarm_connection_pvc_tube": "0.04",
      "f09:fire_alarm_connection_solder_regular": "0.077",
    });
  });

  test("soldered connection applies the exact fourth-column table rates", async () => {
    const compiled = await compileFireAlarmElectricalConnectionVariantR1("wet_zone", {
      connection_end_count: 100,
      connection_method: "SOLDERED",
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(8);
    expect(quantities(compiled.rows)).toMatchObject({
      "f09:fire_alarm_connection_labor_soldered": "10.3",
      "f09:fire_alarm_connection_ethanol_soldered": "0.056",
      "f09:fire_alarm_connection_lacquer_soldered": "0.00003",
      "f09:fire_alarm_connection_dichloroethane": "0.00002",
      "f09:fire_alarm_connection_rosin_soldered": "0.032",
      "f09:fire_alarm_connection_marking_tags": "1",
      "f09:fire_alarm_connection_pvc_tube": "0.04",
      "f09:fire_alarm_connection_solder_soldered": "0.136",
    });
  });

  test("variant suffixes do not alter rates or add adjacent installation scope", async () => {
    const expected = await compileFireAlarmElectricalConnectionVariantR1(
      "high_load",
      { ...FIRE_ALARM_ELECTRICAL_CONNECTION_ACCEPTANCE_INPUT },
    );
    for (const key of VARIANT_KEYS.slice(1)) {
      const actual = await compileFireAlarmElectricalConnectionVariantR1(
        key,
        { ...FIRE_ALARM_ELECTRICAL_CONNECTION_ACCEPTANCE_INPUT },
      );
      expect(actual.rows.map((row) => [row.row_id, row.quantity, row.unit_id]))
        .toEqual(expected.rows.map((row) => [row.row_id, row.quantity, row.unit_id]));
    }
    const rows = JSON.stringify(FIRE_ALARM_ELECTRICAL_CONNECTION_RESOURCES.map((row) => ({
      row_id: row.row_id,
      title_ru: row.title_ru,
    })));
    expect(rows).not.toMatch(/cable_supply|device_install|system_commission|boiler|radiator|heating/iu);
  });

  test("rejects unknown methods, zero ends and another catalog identity", async () => {
    expect(() => resolveFireAlarmElectricalConnectionVariant("commission"))
      .toThrow("FIRE_ALARM_ELECTRICAL_CONNECTION_VARIANT_UNSUPPORTED");
    expect(Object.keys(FIRE_ALARM_ELECTRICAL_CONNECTION_METHODS)).toHaveLength(4);
    await expect(compileFireAlarmElectricalConnectionVariantR1("high_load", {
      connection_end_count: 100,
      connection_method: "UNSUPPORTED",
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileFireAlarmElectricalConnectionVariantR1("high_load", {
      connection_end_count: 0,
      connection_method: "SCREW_WITH_LUG",
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileFireAlarmElectricalConnectionVariantR1(
      "high_load",
      { ...FIRE_ALARM_ELECTRICAL_CONNECTION_ACCEPTANCE_INPUT },
      { catalogId: FIRE_ALARM_ELECTRICAL_CONNECTION_VARIANTS.standard.catalogId },
    )).rejects.toThrow("FIRE_ALARM_ELECTRICAL_CONNECTION_CATALOG_UNSUPPORTED");
  });
});
