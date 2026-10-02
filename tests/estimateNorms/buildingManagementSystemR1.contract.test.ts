import {
  BUILDING_MANAGEMENT_SYSTEM_ACCEPTANCE_INPUT,
  BUILDING_MANAGEMENT_SYSTEM_CATALOG_ID,
  BUILDING_MANAGEMENT_SYSTEM_FORMULAS,
  BUILDING_MANAGEMENT_SYSTEM_PARAMETERS,
  BUILDING_MANAGEMENT_SYSTEM_RESOURCES,
  BUILDING_MANAGEMENT_SYSTEM_RUNTIME_INPUT,
  BUILDING_MANAGEMENT_SYSTEM_SHORT_INPUT,
  compileBuildingManagementSystemR1,
} from "../../src/lib/estimate/v4/buildingManagementSystemR1";

const CONDITIONAL = [
  "rc09:bms_integration_gateway",
  "rc09:bms_field_sensor",
  "rc09:bms_field_actuator",
] as const;

describe("S27.24 building-management-system owner", () => {
  test("replaces area-derived generic electrical rows with an exact BMS owner", () => {
    expect(BUILDING_MANAGEMENT_SYSTEM_CATALOG_ID)
      .toBe("canonical-work:expanded:BMS_system");
    expect(BUILDING_MANAGEMENT_SYSTEM_PARAMETERS).toHaveLength(46);
    expect(BUILDING_MANAGEMENT_SYSTEM_FORMULAS).toHaveLength(32);
    expect(BUILDING_MANAGEMENT_SYSTEM_RESOURCES).toHaveLength(32);
    expect(BUILDING_MANAGEMENT_SYSTEM_RUNTIME_INPUT).toEqual({
      bms_controller_retained_spare_piece: 0,
      bms_controller_supplier_pack_size_piece: 1,
    });
    expect(JSON.stringify(BUILDING_MANAGEMENT_SYSTEM_FORMULAS))
      .not.toMatch(/area_m2|\b432\b|electricalNetworkCalculator|golden_rate|normFactor/iu);
    expect(BUILDING_MANAGEMENT_SYSTEM_RESOURCES.map((row) => row.row_id))
      .toEqual(expect.not.arrayContaining([
        "rc09:hvac_plant",
        "rc09:electrical_distribution",
        "rc09:fire_alarm_system",
        "rc09:access_control_system",
      ]));
  });

  test("known system identity gives useful BMS rows and local project needs", async () => {
    const compiled = await compileBuildingManagementSystemR1({
      ...BUILDING_MANAGEMENT_SYSTEM_SHORT_INPUT,
    });
    expect(compiled.rows).toHaveLength(11);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:bms_system_install_commission", quantity: "1", unit_id: "system" }),
      expect.objectContaining({ row_id: "rc09:bms_ddc_controller", quantity: "2", unit_id: "pcs" }),
      expect.objectContaining({ row_id: "rc09:bms_operator_workstation", quantity: "1", unit_id: "pcs" }),
      expect.objectContaining({ row_id: "rc09:bms_point_test", quantity: "120", unit_id: "test" }),
      expect.objectContaining({ row_id: "rc09:bms_asbuilt_point_register", quantity: "120", unit_id: "point" }),
      expect.objectContaining({ row_id: "rc09:bms-controller-balance:package-count", quantity: "2", unit_id: "package" }),
    ]));
    expect(compiled.preliminaryNeeds).toHaveLength(21);
  });

  test("compiles the twenty-nine-row project fixture", async () => {
    const compiled = await compileBuildingManagementSystemR1({
      ...BUILDING_MANAGEMENT_SYSTEM_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(29);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:bms_automation_panel", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:bms_io_module", quantity: "8" }),
      expect.objectContaining({ row_id: "rc09:bms_network_cable", quantity: "360" }),
      expect.objectContaining({ row_id: "rc09:bms_control_cable", quantity: "850" }),
      expect.objectContaining({ row_id: "rc09:bms_termination", quantity: "240" }),
      expect.objectContaining({ row_id: "rc09:labor:bms-panel-controller-install", quantity: "48" }),
      expect.objectContaining({ row_id: "rc09:labor:bms-cabling-termination", quantity: "120" }),
      expect.objectContaining({ row_id: "rc09:labor:bms-programming-commissioning", quantity: "80" }),
      expect.objectContaining({ row_id: "rc09:equipment:bms-commissioning-analyzer", quantity: "32" }),
      expect.objectContaining({ row_id: "rc09:logistics:bms-delivery", quantity: "2" }),
    ]));
  });

  test("separates installed controllers from rounded supplier procurement", async () => {
    const compiled = await compileBuildingManagementSystemR1({
      ...BUILDING_MANAGEMENT_SYSTEM_ACCEPTANCE_INPUT,
      bms_controller_retained_spare_piece: 1,
      bms_controller_supplier_pack_size_piece: 4,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:bms-controller-balance:installed-net")?.quantity).toBe("2");
    expect(rows.get("rc09:bms-controller-balance:retained-spare")?.quantity).toBe("1");
    expect(rows.get("rc09:bms-controller-balance:total-need")?.quantity).toBe("3");
    expect(rows.get("rc09:bms-controller-balance:package-count")?.quantity).toBe("1");
    expect(rows.get("rc09:bms_ddc_controller")?.quantity).toBe("4");
    expect(rows.get("rc09:bms-controller-balance:remainder")?.quantity).toBe("2");
    expect(rows.get("rc09:bms-controller-balance:surplus-beyond-spare")?.quantity).toBe("1");
  });

  test("keeps system, point checks and records informational beside explicit labor", () => {
    for (const rowId of [
      "rc09:bms_system_install_commission",
      "rc09:bms_point_test",
      "rc09:bms_asbuilt_point_register",
      "rc09:bms_test_report",
    ]) {
      const row = BUILDING_MANAGEMENT_SYSTEM_RESOURCES.find((item) => item.row_id === rowId);
      expect(row?.resource_graph).toEqual(expect.objectContaining({
        costTreatment: "INFORMATIONAL_SCOPE",
      }));
    }
  });

  test("keeps gateway and field devices conditional", async () => {
    const compiled = await compileBuildingManagementSystemR1({
      ...BUILDING_MANAGEMENT_SYSTEM_ACCEPTANCE_INPUT,
      integration_gateway_mode: "REQUIRED",
      integration_gateway_designation: "Шлюз BACnet/Modbus по архитектуре",
      integration_gateway_quantity_piece: 1,
      field_devices_mode: "REQUIRED",
      field_sensor_designation: "Датчик температуры по спецификации",
      field_sensor_quantity_piece: 40,
      field_actuator_designation: "Электропривод клапана по спецификации",
      field_actuator_quantity_piece: 12,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(32);
    expect(compiled.rows.map((row) => row.row_id))
      .toEqual(expect.arrayContaining([...CONDITIONAL]));
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileBuildingManagementSystemR1({
      ...BUILDING_MANAGEMENT_SYSTEM_SHORT_INPUT,
      bms_controller_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileBuildingManagementSystemR1(
      { ...BUILDING_MANAGEMENT_SYSTEM_ACCEPTANCE_INPUT },
      { catalogId: `${BUILDING_MANAGEMENT_SYSTEM_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("BUILDING_MANAGEMENT_SYSTEM_CATALOG_UNSUPPORTED");
  });
});
