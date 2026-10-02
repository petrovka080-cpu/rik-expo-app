import {
  UPS_SYSTEM_ACCEPTANCE_INPUT,
  UPS_SYSTEM_CATALOG_ID,
  UPS_SYSTEM_FORMULAS,
  UPS_SYSTEM_PARAMETERS,
  UPS_SYSTEM_RESOURCES,
  UPS_SYSTEM_RUNTIME_INPUT,
  UPS_SYSTEM_SHORT_INPUT,
  compileUpsSystemR1,
} from "../../src/lib/estimate/v4/upsSystemR1";

const CONDITIONAL = [
  "rc09:ups_external_battery_cabinet",
  "rc09:ups_monitoring_gateway",
] as const;

describe("S27.24 UPS-system owner", () => {
  test("replaces area-derived generic rows with an exact UPS owner", () => {
    expect(UPS_SYSTEM_CATALOG_ID).toBe("canonical-work:expanded:UPS_system");
    expect(UPS_SYSTEM_PARAMETERS).toHaveLength(47);
    expect(UPS_SYSTEM_FORMULAS).toHaveLength(32);
    expect(UPS_SYSTEM_RESOURCES).toHaveLength(32);
    expect(UPS_SYSTEM_RUNTIME_INPUT).toEqual({
      ups_unit_retained_spare_piece: 0,
      ups_unit_supplier_pack_size_piece: 1,
    });
    expect(JSON.stringify(UPS_SYSTEM_FORMULAS))
      .not.toMatch(/area_m2|\b432\b|electricalNetworkCalculator|golden_rate|normFactor/iu);
    expect(UPS_SYSTEM_RESOURCES.map((row) => row.row_id))
      .toEqual(expect.not.arrayContaining([
        "rc09:downstream_loads",
        "rc09:general_distribution",
        "rc09:generator_system",
        "rc09:low_voltage_system",
      ]));
  });

  test("known UPS identity gives useful rows and local project needs", async () => {
    const compiled = await compileUpsSystemR1({ ...UPS_SYSTEM_SHORT_INPUT });
    expect(compiled.rows).toHaveLength(10);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:ups_system_install_commission", quantity: "1", unit_id: "system" }),
      expect.objectContaining({ row_id: "rc09:ups_unit", quantity: "2", unit_id: "pcs" }),
      expect.objectContaining({ row_id: "rc09:ups_acceptance_test", quantity: "2", unit_id: "test" }),
      expect.objectContaining({ row_id: "rc09:ups_protocol_register", quantity: "2", unit_id: "unit" }),
      expect.objectContaining({ row_id: "rc09:ups-unit-balance:package-count", quantity: "2", unit_id: "package" }),
    ]));
    expect(compiled.preliminaryNeeds).toHaveLength(22);
  });

  test("compiles the thirty-row project fixture", async () => {
    const compiled = await compileUpsSystemR1({ ...UPS_SYSTEM_ACCEPTANCE_INPUT });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(30);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:ups_input_protection", quantity: "2" }),
      expect.objectContaining({ row_id: "rc09:ups_output_panel", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:ups_maintenance_bypass", quantity: "2" }),
      expect.objectContaining({ row_id: "rc09:ups_input_cable", quantity: "120" }),
      expect.objectContaining({ row_id: "rc09:ups_output_cable", quantity: "180" }),
      expect.objectContaining({ row_id: "rc09:ups_battery_cable", quantity: "80" }),
      expect.objectContaining({ row_id: "rc09:ups_battery_module", quantity: "16" }),
      expect.objectContaining({ row_id: "rc09:ups_termination", quantity: "48" }),
      expect.objectContaining({ row_id: "rc09:ups_label", quantity: "40" }),
      expect.objectContaining({ row_id: "rc09:ups_fastening", quantity: "80" }),
      expect.objectContaining({ row_id: "rc09:ups_consumable", quantity: "6" }),
      expect.objectContaining({ row_id: "rc09:ups_grounding_conductor", quantity: "25" }),
      expect.objectContaining({ row_id: "rc09:labor:ups-equipment-install", quantity: "48" }),
      expect.objectContaining({ row_id: "rc09:labor:ups-cabling-termination", quantity: "72" }),
      expect.objectContaining({ row_id: "rc09:labor:ups-configuration-commissioning", quantity: "40" }),
      expect.objectContaining({ row_id: "rc09:equipment:ups-handling", quantity: "16" }),
      expect.objectContaining({ row_id: "rc09:equipment:ups-load-battery-tester", quantity: "20" }),
      expect.objectContaining({ row_id: "rc09:logistics:ups-delivery", quantity: "2" }),
      expect.objectContaining({ row_id: "rc09:logistics:ups-packaging-removal", quantity: "1" }),
    ]));
  });

  test("separates installed UPS units from rounded supplier procurement", async () => {
    const compiled = await compileUpsSystemR1({
      ...UPS_SYSTEM_ACCEPTANCE_INPUT,
      ups_unit_retained_spare_piece: 1,
      ups_unit_supplier_pack_size_piece: 2,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:ups-unit-balance:installed-net")?.quantity).toBe("2");
    expect(rows.get("rc09:ups-unit-balance:retained-spare")?.quantity).toBe("1");
    expect(rows.get("rc09:ups-unit-balance:total-need")?.quantity).toBe("3");
    expect(rows.get("rc09:ups-unit-balance:package-count")?.quantity).toBe("2");
    expect(rows.get("rc09:ups_unit")?.quantity).toBe("4");
    expect(rows.get("rc09:ups-unit-balance:remainder")?.quantity).toBe("2");
    expect(rows.get("rc09:ups-unit-balance:surplus-beyond-spare")?.quantity).toBe("1");
  });

  test("keeps operation, tests and records informational beside explicit labor", () => {
    for (const rowId of [
      "rc09:ups_system_install_commission",
      "rc09:ups_acceptance_test",
      "rc09:ups_protocol_register",
      "rc09:ups_test_report",
    ]) {
      const row = UPS_SYSTEM_RESOURCES.find((item) => item.row_id === rowId);
      expect(row?.resource_graph).toEqual(expect.objectContaining({
        costTreatment: "INFORMATIONAL_SCOPE",
      }));
    }
  });

  test("keeps external battery enclosure and monitoring conditional", async () => {
    const compiled = await compileUpsSystemR1({
      ...UPS_SYSTEM_ACCEPTANCE_INPUT,
      external_battery_cabinet_mode: "REQUIRED",
      external_battery_cabinet_designation: "Внешний батарейный шкаф по компоновке",
      external_battery_cabinet_quantity_piece: 2,
      ups_monitoring_mode: "REQUIRED",
      ups_monitoring_gateway_designation: "Карта SNMP по архитектуре мониторинга",
      ups_monitoring_gateway_quantity_piece: 2,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(32);
    expect(compiled.rows.map((row) => row.row_id))
      .toEqual(expect.arrayContaining([...CONDITIONAL]));
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileUpsSystemR1({
      ...UPS_SYSTEM_SHORT_INPUT,
      ups_unit_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileUpsSystemR1(
      { ...UPS_SYSTEM_ACCEPTANCE_INPUT },
      { catalogId: `${UPS_SYSTEM_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("UPS_SYSTEM_CATALOG_UNSUPPORTED");
  });
});
