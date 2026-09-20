import {
  LED_LUMINAIRE_INSTALLATION_ACCEPTANCE_INPUT,
  LED_LUMINAIRE_INSTALLATION_CATALOG_ID,
  LED_LUMINAIRE_INSTALLATION_FORMULAS,
  LED_LUMINAIRE_INSTALLATION_PARAMETERS,
  LED_LUMINAIRE_INSTALLATION_RESOURCES,
  LED_LUMINAIRE_INSTALLATION_SHORT_INPUT,
  compileLedLuminaireInstallationR1,
} from "../../src/lib/estimate/v4/ledLuminaireInstallationR1";

const REQUIRED = [
  "rc09:led_luminaire_install", "rc09:led_luminaire_36w_ip40",
  "rc09:luminaire_mounting_anchor_set", "rc09:luminaire_terminal_connector",
  "rc09:luminaire_connection_wire_3x1_5", "rc09:luminaire_pe_lug",
  "rc09:luminaire_work_platform", "rc09:luminaire_pe_continuity_test",
] as const;
const CONDITIONAL = [
  "rc09:separate_led_driver", "rc09:suspended_ceiling_reinforcement_adapter",
] as const;

describe("MASTER LED luminaire installation owner", () => {
  test("uses known count and identity without importing historical rates", () => {
    expect(LED_LUMINAIRE_INSTALLATION_CATALOG_ID)
      .toBe("canonical-work:base:electrical_interior_lighting_install_standard");
    expect(LED_LUMINAIRE_INSTALLATION_PARAMETERS).toHaveLength(22);
    expect(LED_LUMINAIRE_INSTALLATION_FORMULAS).toHaveLength(10);
    expect(LED_LUMINAIRE_INSTALLATION_RESOURCES).toHaveLength(10);
    expect(JSON.stringify(LED_LUMINAIRE_INSTALLATION_FORMULAS))
      .not.toMatch(/golden_rate|normFactor|luminaire_count\s*\*\s*(?:0\.6|0\.02)/iu);
    expect(LED_LUMINAIRE_INSTALLATION_RESOURCES.map((row) => row.row_id))
      .not.toEqual(expect.arrayContaining([
        "rc09:lighting_cable_line", "rc09:light_switch", "rc09:distribution_board",
      ]));
  });

  test("known thirty luminaires give work and exact products plus local needs", async () => {
    const compiled = await compileLedLuminaireInstallationR1({
      ...LED_LUMINAIRE_INSTALLATION_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "30", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[1], quantity: "30", unit_id: "pcs" }),
    ]));
    expect(compiled.rows).toHaveLength(2);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([...REQUIRED.slice(2), ...CONDITIONAL]));
    expect(compiled.preliminaryNeeds).toHaveLength(8);
  });

  test("compiles the evidence-bound eight-row fixture", async () => {
    const compiled = await compileLedLuminaireInstallationR1({
      ...LED_LUMINAIRE_INSTALLATION_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[2], quantity: "30", unit_id: "set" }),
      expect.objectContaining({ row_id: REQUIRED[4], quantity: "18", unit_id: "m" }),
      expect.objectContaining({ row_id: REQUIRED[6], quantity: "0.6", unit_id: "shift" }),
      expect.objectContaining({ row_id: REQUIRED[7], quantity: "30", unit_id: "test" }),
    ]));
  });

  test("keeps separate drivers and ceiling adapters conditional", async () => {
    const compiled = await compileLedLuminaireInstallationR1({
      ...LED_LUMINAIRE_INSTALLATION_ACCEPTANCE_INPUT,
      separate_driver_mode: "REQUIRED",
      separate_driver_designation: "Драйвер по ведомости светильников",
      separate_driver_quantity_piece: 30,
      ceiling_adapter_mode: "REQUIRED",
      ceiling_adapter_designation: "Адаптер усиления по узлу потолка",
      ceiling_adapter_quantity_set: 30,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(10);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: CONDITIONAL[0], quantity: "30", unit_id: "pcs" }),
      expect.objectContaining({ row_id: CONDITIONAL[1], quantity: "30", unit_id: "set" }),
    ]));
  });

  test("rejects invalid values and unrelated identities", async () => {
    await expect(compileLedLuminaireInstallationR1({
      ...LED_LUMINAIRE_INSTALLATION_SHORT_INPUT, luminaire_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileLedLuminaireInstallationR1(
      { ...LED_LUMINAIRE_INSTALLATION_ACCEPTANCE_INPUT },
      { catalogId: `${LED_LUMINAIRE_INSTALLATION_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("LED_LUMINAIRE_INSTALLATION_CATALOG_UNSUPPORTED");
  });
});
