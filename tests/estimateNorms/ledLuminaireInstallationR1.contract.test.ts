import {
  LED_LUMINAIRE_INSTALLATION_ACCEPTANCE_INPUT,
  LED_LUMINAIRE_INSTALLATION_CATALOG_ID,
  LED_LUMINAIRE_INSTALLATION_FORMULAS,
  LED_LUMINAIRE_INSTALLATION_PARAMETERS,
  LED_LUMINAIRE_INSTALLATION_RESOURCES,
  LED_LUMINAIRE_INSTALLATION_RUNTIME_INPUT,
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
const DIRECT_RESOURCE_NEEDS = [
  "led:labor:installation", "led:labor:testing",
  "led:equipment:drilling-tool", "led:equipment:installation-tool",
  "led:equipment:tester", "led:logistics:delivery", "led:logistics:waste-removal",
] as const;

describe("MASTER LED luminaire installation owner", () => {
  test("uses known count and identity without importing historical rates", () => {
    expect(LED_LUMINAIRE_INSTALLATION_CATALOG_ID)
      .toBe("canonical-work:base:electrical_interior_lighting_install_standard");
    expect(LED_LUMINAIRE_INSTALLATION_PARAMETERS).toHaveLength(31);
    expect(LED_LUMINAIRE_INSTALLATION_FORMULAS).toHaveLength(23);
    expect(LED_LUMINAIRE_INSTALLATION_RESOURCES).toHaveLength(23);
    expect(LED_LUMINAIRE_INSTALLATION_RUNTIME_INPUT).toEqual({
      luminaire_retained_spare_piece: 0,
      luminaire_supplier_pack_size_piece: 1,
    });
    expect(JSON.stringify(LED_LUMINAIRE_INSTALLATION_FORMULAS))
      .not.toMatch(/golden_rate|normFactor|luminaire_count\s*\*\s*(?:0\.6|0\.02)/iu);
    expect(LED_LUMINAIRE_INSTALLATION_RESOURCES.map((row) => row.row_id))
      .not.toEqual(expect.arrayContaining([
        "rc09:lighting_cable_line", "rc09:light_switch", "rc09:distribution_board",
      ]));
  });

  test("known thirty luminaires give a useful visible balance plus local needs", async () => {
    const compiled = await compileLedLuminaireInstallationR1({
      ...LED_LUMINAIRE_INSTALLATION_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "30", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[1], quantity: "30", unit_id: "pcs" }),
    ]));
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "led:balance:installed-net", quantity: "30" }),
      expect.objectContaining({ row_id: "led:balance:retained-spare", quantity: "0" }),
      expect.objectContaining({ row_id: "led:balance:total-need", quantity: "30" }),
      expect.objectContaining({ row_id: "led:balance:package-count", quantity: "30" }),
      expect.objectContaining({ row_id: "led:balance:remainder", quantity: "0" }),
      expect.objectContaining({ row_id: "led:balance:surplus-beyond-reserve", quantity: "0" }),
    ]));
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([
        ...REQUIRED.slice(2), ...CONDITIONAL, ...DIRECT_RESOURCE_NEEDS,
      ]));
    expect(compiled.preliminaryNeeds).toHaveLength(15);
  });

  test("compiles the evidence-bound fixture with labor, equipment and logistics", async () => {
    const compiled = await compileLedLuminaireInstallationR1({
      ...LED_LUMINAIRE_INSTALLATION_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(21);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[2], quantity: "30", unit_id: "set" }),
      expect.objectContaining({ row_id: REQUIRED[4], quantity: "18", unit_id: "m" }),
      expect.objectContaining({ row_id: REQUIRED[6], quantity: "0.6", unit_id: "shift" }),
      expect.objectContaining({ row_id: REQUIRED[7], quantity: "30", unit_id: "test" }),
      expect.objectContaining({ row_id: "led:labor:installation", quantity: "18",
        unit_id: "man_hour" }),
      expect.objectContaining({ row_id: "led:labor:testing", quantity: "3",
        unit_id: "man_hour" }),
      expect.objectContaining({ row_id: "led:equipment:drilling-tool", quantity: "6",
        unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: "led:equipment:installation-tool", quantity: "10",
        unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: "led:equipment:tester", quantity: "3",
        unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: "led:logistics:delivery", quantity: "1",
        unit_id: "trip" }),
      expect.objectContaining({ row_id: "led:logistics:waste-removal", quantity: "1",
        unit_id: "trip" }),
    ]));
    expect(compiled.rows.find((row) => row.row_id === REQUIRED[0])?.included_in_estimate)
      .toBe(false);
    expect(compiled.rows.find((row) => row.row_id === REQUIRED[7])?.included_in_estimate)
      .toBe(false);
  });

  test("separates installed quantity, retained spare, packages, order and remainder", async () => {
    const compiled = await compileLedLuminaireInstallationR1({
      ...LED_LUMINAIRE_INSTALLATION_ACCEPTANCE_INPUT,
      luminaire_retained_spare_piece: 3,
      luminaire_supplier_pack_size_piece: 8,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("led:balance:installed-net")?.quantity).toBe("30");
    expect(rows.get("led:balance:retained-spare")?.quantity).toBe("3");
    expect(rows.get("led:balance:total-need")?.quantity).toBe("33");
    expect(rows.get("led:balance:package-count")?.quantity).toBe("5");
    expect(rows.get(REQUIRED[1])?.quantity).toBe("40");
    expect(rows.get("led:balance:remainder")?.quantity).toBe("10");
    expect(rows.get("led:balance:surplus-beyond-reserve")?.quantity).toBe("7");
    expect(compiled.rows.filter((row) => row.row_id.startsWith("led:balance:")
      && row.included_in_procurement)).toEqual([]);
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
    expect(compiled.rows).toHaveLength(23);
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
