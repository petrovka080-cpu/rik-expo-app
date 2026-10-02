import {
  RESIDUAL_CURRENT_DEVICE_INSTALLATION_ACCEPTANCE_INPUT,
  RESIDUAL_CURRENT_DEVICE_INSTALLATION_CATALOG_ID,
  RESIDUAL_CURRENT_DEVICE_INSTALLATION_FORMULAS,
  RESIDUAL_CURRENT_DEVICE_INSTALLATION_PARAMETERS,
  RESIDUAL_CURRENT_DEVICE_INSTALLATION_RESOURCES,
  RESIDUAL_CURRENT_DEVICE_INSTALLATION_RUNTIME_INPUT,
  RESIDUAL_CURRENT_DEVICE_INSTALLATION_SHORT_INPUT,
  compileResidualCurrentDeviceInstallationR1,
} from "../../src/lib/estimate/v4/residualCurrentDeviceInstallationR1";

const CONDITIONAL = [
  "q4:rcd:conditional:comb-bus",
  "q4:rcd:conditional:comb-bus-end-cap",
  "q4:rcd:conditional:auxiliary-contact",
  "q4:rcd:conditional:din-rail-segment",
] as const;

describe("MASTER residual-current-device installation owner", () => {
  test("replaces the generic 1/63/63 shell with an atomic evidence-bound profile", () => {
    expect(RESIDUAL_CURRENT_DEVICE_INSTALLATION_CATALOG_ID)
      .toBe("canonical-work:base:electrical_interior_rcd_install_standard");
    expect(RESIDUAL_CURRENT_DEVICE_INSTALLATION_PARAMETERS).toHaveLength(38);
    expect(RESIDUAL_CURRENT_DEVICE_INSTALLATION_FORMULAS).toHaveLength(24);
    expect(RESIDUAL_CURRENT_DEVICE_INSTALLATION_RESOURCES).toHaveLength(24);
    expect(RESIDUAL_CURRENT_DEVICE_INSTALLATION_RUNTIME_INPUT).toEqual({
      rcd_retained_spare_piece: 0,
      rcd_supplier_pack_size_piece: 1,
    });
    expect(JSON.stringify(RESIDUAL_CURRENT_DEVICE_INSTALLATION_FORMULAS))
      .not.toMatch(/golden_rate|normFactor|rcd_count\s*\*\s*(?:0\.7|0\.5)/iu);
    expect(JSON.stringify(RESIDUAL_CURRENT_DEVICE_INSTALLATION_RESOURCES.map((row) => ({
      rowId: row.row_id, titleRu: row.title_ru,
    }))))
      .not.toMatch(/cable.line|separate.circuit.breaker|panel.enclosure|complete.switchboard/iu);
  });

  test("known selected devices give a useful balance while project facts remain local", async () => {
    const compiled = await compileResidualCurrentDeviceInstallationR1({
      ...RESIDUAL_CURRENT_DEVICE_INSTALLATION_SHORT_INPUT,
    });
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "q4:rcd:install", quantity: "8" }),
      expect.objectContaining({ row_id: "q4:rcd:device-order", quantity: "8" }),
      expect.objectContaining({ row_id: "q4:rcd:balance:installed-net", quantity: "8" }),
      expect.objectContaining({ row_id: "q4:rcd:balance:retained-spare", quantity: "0" }),
      expect.objectContaining({ row_id: "q4:rcd:balance:total-need", quantity: "8" }),
      expect.objectContaining({ row_id: "q4:rcd:balance:package-count", quantity: "8" }),
      expect.objectContaining({ row_id: "q4:rcd:balance:remainder", quantity: "0" }),
      expect.objectContaining({
        row_id: "q4:rcd:balance:surplus-beyond-reserve", quantity: "0",
      }),
    ]));
    expect(compiled.preliminaryNeeds).toHaveLength(16);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([
        "q4:rcd:selection-basis", "q4:rcd:circuit-marker",
        "q4:rcd:terminal-accessory", "q4:rcd:torque-seal",
        "q4:rcd:trip-test", "q4:rcd:labor:installation",
        "q4:rcd:labor:testing", "q4:rcd:equipment:torque-screwdriver",
        "q4:rcd:equipment:installation-tool", "q4:rcd:equipment:tester",
        "q4:rcd:logistics:delivery", "q4:rcd:logistics:waste-removal",
        ...CONDITIONAL,
      ]));
  });

  test("compiles the documented fixture with accessories, labor, tools, tests and logistics", async () => {
    const compiled = await compileResidualCurrentDeviceInstallationR1({
      ...RESIDUAL_CURRENT_DEVICE_INSTALLATION_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(20);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "q4:rcd:circuit-marker", quantity: "8" }),
      expect.objectContaining({ row_id: "q4:rcd:terminal-accessory", quantity: "16" }),
      expect.objectContaining({ row_id: "q4:rcd:torque-seal", quantity: "1" }),
      expect.objectContaining({ row_id: "q4:rcd:trip-test", quantity: "8" }),
      expect.objectContaining({ row_id: "q4:rcd:labor:installation", quantity: "5.6" }),
      expect.objectContaining({ row_id: "q4:rcd:labor:testing", quantity: "4" }),
      expect.objectContaining({
        row_id: "q4:rcd:equipment:torque-screwdriver", quantity: "0.8",
      }),
      expect.objectContaining({
        row_id: "q4:rcd:equipment:installation-tool", quantity: "2.8",
      }),
      expect.objectContaining({ row_id: "q4:rcd:equipment:tester", quantity: "4" }),
      expect.objectContaining({ row_id: "q4:rcd:logistics:delivery", quantity: "1" }),
      expect.objectContaining({ row_id: "q4:rcd:logistics:waste-removal", quantity: "1" }),
    ]));
    expect(compiled.rows.find((row) => row.row_id === "q4:rcd:install")
      ?.included_in_estimate).toBe(false);
    expect(compiled.rows.find((row) => row.row_id === "q4:rcd:trip-test")
      ?.included_in_estimate).toBe(false);
  });

  test("separates installed devices, retained reserve, packages, order and remainder", async () => {
    const compiled = await compileResidualCurrentDeviceInstallationR1({
      ...RESIDUAL_CURRENT_DEVICE_INSTALLATION_ACCEPTANCE_INPUT,
      rcd_retained_spare_piece: 2,
      rcd_supplier_pack_size_piece: 4,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("q4:rcd:balance:installed-net")?.quantity).toBe("8");
    expect(rows.get("q4:rcd:balance:retained-spare")?.quantity).toBe("2");
    expect(rows.get("q4:rcd:balance:total-need")?.quantity).toBe("10");
    expect(rows.get("q4:rcd:balance:package-count")?.quantity).toBe("3");
    expect(rows.get("q4:rcd:device-order")?.quantity).toBe("12");
    expect(rows.get("q4:rcd:balance:remainder")?.quantity).toBe("4");
    expect(rows.get("q4:rcd:balance:surplus-beyond-reserve")?.quantity).toBe("2");
    expect(compiled.rows.filter((row) => row.row_id.includes(":balance:")
      && row.included_in_procurement)).toEqual([]);
  });

  test("keeps bus, auxiliary contact and added DIN rail conditional", async () => {
    const compiled = await compileResidualCurrentDeviceInstallationR1({
      ...RESIDUAL_CURRENT_DEVICE_INSTALLATION_ACCEPTANCE_INPUT,
      comb_bus_mode: "REQUIRED",
      comb_bus_designation: "Шина 2P 63 A, шаг 18 мм",
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
    await expect(compileResidualCurrentDeviceInstallationR1({
      ...RESIDUAL_CURRENT_DEVICE_INSTALLATION_SHORT_INPUT, rcd_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileResidualCurrentDeviceInstallationR1(
      { ...RESIDUAL_CURRENT_DEVICE_INSTALLATION_ACCEPTANCE_INPUT },
      { catalogId: `${RESIDUAL_CURRENT_DEVICE_INSTALLATION_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("RESIDUAL_CURRENT_DEVICE_INSTALLATION_CATALOG_UNSUPPORTED");
  });
});
