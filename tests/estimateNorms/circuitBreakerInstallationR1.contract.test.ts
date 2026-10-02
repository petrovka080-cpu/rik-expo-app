import {
  CIRCUIT_BREAKER_INSTALLATION_ACCEPTANCE_INPUT,
  CIRCUIT_BREAKER_INSTALLATION_CATALOG_ID,
  CIRCUIT_BREAKER_INSTALLATION_FORMULAS,
  CIRCUIT_BREAKER_INSTALLATION_PARAMETERS,
  CIRCUIT_BREAKER_INSTALLATION_RESOURCES,
  CIRCUIT_BREAKER_INSTALLATION_RUNTIME_INPUT,
  CIRCUIT_BREAKER_INSTALLATION_SHORT_INPUT,
  compileCircuitBreakerInstallationR1,
} from "../../src/lib/estimate/v4/circuitBreakerInstallationR1";

const CONDITIONAL = [
  "q4:breaker:conditional:comb-bus",
  "q4:breaker:conditional:comb-bus-end-cap",
  "q4:breaker:conditional:auxiliary-contact",
  "q4:breaker:conditional:din-rail-segment",
] as const;

describe("MASTER circuit-breaker installation owner", () => {
  test("replaces the generic 1/63/63 shell with an atomic evidence-bound profile", () => {
    expect(CIRCUIT_BREAKER_INSTALLATION_CATALOG_ID)
      .toBe("canonical-work:base:electrical_interior_breaker_install_standard");
    expect(CIRCUIT_BREAKER_INSTALLATION_PARAMETERS).toHaveLength(37);
    expect(CIRCUIT_BREAKER_INSTALLATION_FORMULAS).toHaveLength(24);
    expect(CIRCUIT_BREAKER_INSTALLATION_RESOURCES).toHaveLength(24);
    expect(CIRCUIT_BREAKER_INSTALLATION_RUNTIME_INPUT).toEqual({
      breaker_retained_spare_piece: 0,
      breaker_supplier_pack_size_piece: 1,
    });
    expect(JSON.stringify(CIRCUIT_BREAKER_INSTALLATION_FORMULAS))
      .not.toMatch(/golden_rate|normFactor|breaker_count\s*\*\s*(?:0\.6|0\.2)/iu);
    expect(JSON.stringify(CIRCUIT_BREAKER_INSTALLATION_RESOURCES.map((row) => ({
      rowId: row.row_id, titleRu: row.title_ru,
    }))))
      .not.toMatch(/cable.line|rcd|panel.enclosure|complete.switchboard/iu);
  });

  test("known selected devices give a useful balance while project facts remain local", async () => {
    const compiled = await compileCircuitBreakerInstallationR1({
      ...CIRCUIT_BREAKER_INSTALLATION_SHORT_INPUT,
    });
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "q4:breaker:install", quantity: "12" }),
      expect.objectContaining({ row_id: "q4:breaker:device-order", quantity: "12" }),
      expect.objectContaining({ row_id: "q4:breaker:balance:installed-net", quantity: "12" }),
      expect.objectContaining({ row_id: "q4:breaker:balance:retained-spare", quantity: "0" }),
      expect.objectContaining({ row_id: "q4:breaker:balance:total-need", quantity: "12" }),
      expect.objectContaining({ row_id: "q4:breaker:balance:package-count", quantity: "12" }),
      expect.objectContaining({ row_id: "q4:breaker:balance:remainder", quantity: "0" }),
      expect.objectContaining({
        row_id: "q4:breaker:balance:surplus-beyond-reserve", quantity: "0",
      }),
    ]));
    expect(compiled.preliminaryNeeds).toHaveLength(16);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([
        "q4:breaker:selection-basis", "q4:breaker:circuit-marker",
        "q4:breaker:terminal-accessory", "q4:breaker:torque-seal",
        "q4:breaker:test", "q4:breaker:labor:installation",
        "q4:breaker:labor:testing", "q4:breaker:equipment:torque-screwdriver",
        "q4:breaker:equipment:installation-tool", "q4:breaker:equipment:tester",
        "q4:breaker:logistics:delivery", "q4:breaker:logistics:waste-removal",
        ...CONDITIONAL,
      ]));
  });

  test("compiles the documented fixture with accessories, labor, tools, tests and logistics", async () => {
    const compiled = await compileCircuitBreakerInstallationR1({
      ...CIRCUIT_BREAKER_INSTALLATION_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(20);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "q4:breaker:circuit-marker", quantity: "12" }),
      expect.objectContaining({ row_id: "q4:breaker:terminal-accessory", quantity: "24" }),
      expect.objectContaining({ row_id: "q4:breaker:torque-seal", quantity: "1" }),
      expect.objectContaining({ row_id: "q4:breaker:test", quantity: "12" }),
      expect.objectContaining({ row_id: "q4:breaker:labor:installation", quantity: "7.2" }),
      expect.objectContaining({ row_id: "q4:breaker:labor:testing", quantity: "2.4" }),
      expect.objectContaining({
        row_id: "q4:breaker:equipment:torque-screwdriver", quantity: "1.2",
      }),
      expect.objectContaining({
        row_id: "q4:breaker:equipment:installation-tool", quantity: "3.6",
      }),
      expect.objectContaining({ row_id: "q4:breaker:equipment:tester", quantity: "2.4" }),
      expect.objectContaining({ row_id: "q4:breaker:logistics:delivery", quantity: "1" }),
      expect.objectContaining({ row_id: "q4:breaker:logistics:waste-removal", quantity: "1" }),
    ]));
    expect(compiled.rows.find((row) => row.row_id === "q4:breaker:install")
      ?.included_in_estimate).toBe(false);
    expect(compiled.rows.find((row) => row.row_id === "q4:breaker:test")
      ?.included_in_estimate).toBe(false);
  });

  test("separates installed devices, retained reserve, packages, order and remainder", async () => {
    const compiled = await compileCircuitBreakerInstallationR1({
      ...CIRCUIT_BREAKER_INSTALLATION_ACCEPTANCE_INPUT,
      breaker_retained_spare_piece: 2,
      breaker_supplier_pack_size_piece: 5,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("q4:breaker:balance:installed-net")?.quantity).toBe("12");
    expect(rows.get("q4:breaker:balance:retained-spare")?.quantity).toBe("2");
    expect(rows.get("q4:breaker:balance:total-need")?.quantity).toBe("14");
    expect(rows.get("q4:breaker:balance:package-count")?.quantity).toBe("3");
    expect(rows.get("q4:breaker:device-order")?.quantity).toBe("15");
    expect(rows.get("q4:breaker:balance:remainder")?.quantity).toBe("3");
    expect(rows.get("q4:breaker:balance:surplus-beyond-reserve")?.quantity).toBe("1");
    expect(compiled.rows.filter((row) => row.row_id.includes(":balance:")
      && row.included_in_procurement)).toEqual([]);
  });

  test("keeps bus, auxiliary contact and added DIN rail conditional", async () => {
    const compiled = await compileCircuitBreakerInstallationR1({
      ...CIRCUIT_BREAKER_INSTALLATION_ACCEPTANCE_INPUT,
      comb_bus_mode: "REQUIRED",
      comb_bus_designation: "Шина 1P 63 A, шаг 18 мм",
      comb_bus_length_m: 0.22,
      comb_bus_end_cap_designation: "Заглушка совместимой серии",
      comb_bus_end_cap_quantity_piece: 2,
      auxiliary_contact_mode: "REQUIRED",
      auxiliary_contact_designation: "Контакт состояния совместимой серии",
      auxiliary_contact_quantity_piece: 2,
      din_rail_segment_mode: "REQUIRED",
      din_rail_segment_designation: "DIN-рейка 35 мм",
      din_rail_segment_length_m: 0.3,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(24);
    expect(compiled.rows.map((row) => row.row_id))
      .toEqual(expect.arrayContaining([...CONDITIONAL]));
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileCircuitBreakerInstallationR1({
      ...CIRCUIT_BREAKER_INSTALLATION_SHORT_INPUT, breaker_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileCircuitBreakerInstallationR1(
      { ...CIRCUIT_BREAKER_INSTALLATION_ACCEPTANCE_INPUT },
      { catalogId: `${CIRCUIT_BREAKER_INSTALLATION_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("CIRCUIT_BREAKER_INSTALLATION_CATALOG_UNSUPPORTED");
  });
});
