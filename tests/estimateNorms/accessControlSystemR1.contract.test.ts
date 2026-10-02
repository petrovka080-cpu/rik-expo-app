import {
  ACCESS_CONTROL_SYSTEM_ACCEPTANCE_INPUT,
  ACCESS_CONTROL_SYSTEM_CATALOG_ID,
  ACCESS_CONTROL_SYSTEM_FORMULAS,
  ACCESS_CONTROL_SYSTEM_PARAMETERS,
  ACCESS_CONTROL_SYSTEM_RESOURCES,
  ACCESS_CONTROL_SYSTEM_RUNTIME_INPUT,
  ACCESS_CONTROL_SYSTEM_SHORT_INPUT,
  compileAccessControlSystemR1,
} from "../../src/lib/estimate/v4/accessControlSystemR1";

const CONDITIONAL = [
  "rc09:acs_intercom_gateway",
  "rc09:acs_fire_release_interface",
] as const;

describe("S27.24 access-control-system owner", () => {
  test("replaces area-derived generic rows with an exact access-control owner", () => {
    expect(ACCESS_CONTROL_SYSTEM_CATALOG_ID)
      .toBe("canonical-work:expanded:access_control_system");
    expect(ACCESS_CONTROL_SYSTEM_PARAMETERS).toHaveLength(53);
    expect(ACCESS_CONTROL_SYSTEM_FORMULAS).toHaveLength(36);
    expect(ACCESS_CONTROL_SYSTEM_RESOURCES).toHaveLength(36);
    expect(ACCESS_CONTROL_SYSTEM_RUNTIME_INPUT).toEqual({
      acs_controller_retained_spare_piece: 0,
      acs_controller_supplier_pack_size_piece: 1,
    });
    expect(JSON.stringify(ACCESS_CONTROL_SYSTEM_FORMULAS))
      .not.toMatch(/area_m2|\b432\b|electricalNetworkCalculator|golden_rate|normFactor/iu);
    expect(ACCESS_CONTROL_SYSTEM_RESOURCES.map((row) => row.row_id))
      .toEqual(expect.not.arrayContaining([
        "rc09:cctv_system",
        "rc09:fire_alarm_system",
        "rc09:general_lan",
        "rc09:general_ups",
      ]));
  });

  test("known door and device identity gives useful rows and local needs", async () => {
    const compiled = await compileAccessControlSystemR1({
      ...ACCESS_CONTROL_SYSTEM_SHORT_INPUT,
    });
    expect(compiled.rows).toHaveLength(13);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:acs_system_install_commission", quantity: "1", unit_id: "system" }),
      expect.objectContaining({ row_id: "rc09:acs_controller", quantity: "2", unit_id: "pcs" }),
      expect.objectContaining({ row_id: "rc09:acs_reader", quantity: "16", unit_id: "pcs" }),
      expect.objectContaining({ row_id: "rc09:acs_lock", quantity: "8", unit_id: "pcs" }),
      expect.objectContaining({ row_id: "rc09:acs_exit_device", quantity: "8", unit_id: "pcs" }),
      expect.objectContaining({ row_id: "rc09:acs_door_functional_test", quantity: "8", unit_id: "test" }),
      expect.objectContaining({ row_id: "rc09:acs_door_register", quantity: "8", unit_id: "door" }),
      expect.objectContaining({ row_id: "rc09:acs-controller-balance:package-count", quantity: "2", unit_id: "package" }),
    ]));
    expect(compiled.preliminaryNeeds).toHaveLength(23);
  });

  test("compiles the thirty-four-row project fixture", async () => {
    const compiled = await compileAccessControlSystemR1({
      ...ACCESS_CONTROL_SYSTEM_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(34);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:acs_door_contact", quantity: "8" }),
      expect.objectContaining({ row_id: "rc09:acs_emergency_release", quantity: "8" }),
      expect.objectContaining({ row_id: "rc09:acs_power_supply", quantity: "4" }),
      expect.objectContaining({ row_id: "rc09:acs_standby_battery", quantity: "4" }),
      expect.objectContaining({ row_id: "rc09:acs_network_cable", quantity: "180" }),
      expect.objectContaining({ row_id: "rc09:acs_reader_cable", quantity: "520" }),
      expect.objectContaining({ row_id: "rc09:acs_lock_cable", quantity: "360" }),
      expect.objectContaining({ row_id: "rc09:acs_mounting_box", quantity: "32" }),
      expect.objectContaining({ row_id: "rc09:acs_termination", quantity: "96" }),
      expect.objectContaining({ row_id: "rc09:acs_label", quantity: "80" }),
      expect.objectContaining({ row_id: "rc09:acs_fastening", quantity: "120" }),
      expect.objectContaining({ row_id: "rc09:acs_consumable", quantity: "5" }),
      expect.objectContaining({ row_id: "rc09:acs_grounding_conductor", quantity: "12" }),
      expect.objectContaining({ row_id: "rc09:labor:acs-device-install", quantity: "72" }),
      expect.objectContaining({ row_id: "rc09:labor:acs-cabling-termination", quantity: "88" }),
      expect.objectContaining({ row_id: "rc09:labor:acs-configuration-commissioning", quantity: "56" }),
      expect.objectContaining({ row_id: "rc09:equipment:acs-lifting", quantity: "12" }),
      expect.objectContaining({ row_id: "rc09:equipment:acs-cable-device-tester", quantity: "24" }),
      expect.objectContaining({ row_id: "rc09:logistics:acs-delivery", quantity: "2" }),
      expect.objectContaining({ row_id: "rc09:logistics:acs-packaging-removal", quantity: "1" }),
    ]));
  });

  test("separates installed controllers from rounded supplier procurement", async () => {
    const compiled = await compileAccessControlSystemR1({
      ...ACCESS_CONTROL_SYSTEM_ACCEPTANCE_INPUT,
      acs_controller_retained_spare_piece: 1,
      acs_controller_supplier_pack_size_piece: 4,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:acs-controller-balance:installed-net")?.quantity).toBe("2");
    expect(rows.get("rc09:acs-controller-balance:retained-spare")?.quantity).toBe("1");
    expect(rows.get("rc09:acs-controller-balance:total-need")?.quantity).toBe("3");
    expect(rows.get("rc09:acs-controller-balance:package-count")?.quantity).toBe("1");
    expect(rows.get("rc09:acs_controller")?.quantity).toBe("4");
    expect(rows.get("rc09:acs-controller-balance:remainder")?.quantity).toBe("2");
    expect(rows.get("rc09:acs-controller-balance:surplus-beyond-spare")?.quantity).toBe("1");
  });

  test("keeps system, door checks and records informational beside explicit labor", () => {
    for (const rowId of [
      "rc09:acs_system_install_commission",
      "rc09:acs_door_functional_test",
      "rc09:acs_door_register",
      "rc09:acs_test_report",
    ]) {
      const row = ACCESS_CONTROL_SYSTEM_RESOURCES.find((item) => item.row_id === rowId);
      expect(row?.resource_graph).toEqual(expect.objectContaining({
        costTreatment: "INFORMATIONAL_SCOPE",
      }));
    }
  });

  test("keeps intercom and fire-release interfaces conditional", async () => {
    const compiled = await compileAccessControlSystemR1({
      ...ACCESS_CONTROL_SYSTEM_ACCEPTANCE_INPUT,
      intercom_integration_mode: "REQUIRED",
      intercom_gateway_designation: "Шлюз интеграции с домофонией по архитектуре",
      intercom_gateway_quantity_piece: 1,
      fire_release_integration_mode: "REQUIRED",
      fire_release_interface_designation: "Интерфейс сигнала аварийного открытия",
      fire_release_interface_quantity_piece: 1,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(36);
    expect(compiled.rows.map((row) => row.row_id))
      .toEqual(expect.arrayContaining([...CONDITIONAL]));
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileAccessControlSystemR1({
      ...ACCESS_CONTROL_SYSTEM_SHORT_INPUT,
      acs_controlled_door_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileAccessControlSystemR1(
      { ...ACCESS_CONTROL_SYSTEM_ACCEPTANCE_INPUT },
      { catalogId: `${ACCESS_CONTROL_SYSTEM_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("ACCESS_CONTROL_SYSTEM_CATALOG_UNSUPPORTED");
  });
});
