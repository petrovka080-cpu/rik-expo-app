import {
  CCTV_SYSTEM_ACCEPTANCE_INPUT,
  CCTV_SYSTEM_CATALOG_ID,
  CCTV_SYSTEM_FORMULAS,
  CCTV_SYSTEM_PARAMETERS,
  CCTV_SYSTEM_RESOURCES,
  CCTV_SYSTEM_RUNTIME_INPUT,
  CCTV_SYSTEM_SHORT_INPUT,
  compileCctvSystemR1,
} from "../../src/lib/estimate/v4/cctvSystemR1";

const CONDITIONAL = [
  "rc09:cctv_video_analytics_license",
  "rc09:cctv_external_integration_gateway",
] as const;

describe("S27.24 CCTV-system owner", () => {
  test("replaces area-derived generic rows with an exact CCTV owner", () => {
    expect(CCTV_SYSTEM_CATALOG_ID).toBe("canonical-work:expanded:CCTV_system");
    expect(CCTV_SYSTEM_PARAMETERS).toHaveLength(48);
    expect(CCTV_SYSTEM_FORMULAS).toHaveLength(33);
    expect(CCTV_SYSTEM_RESOURCES).toHaveLength(33);
    expect(CCTV_SYSTEM_RUNTIME_INPUT).toEqual({
      cctv_camera_retained_spare_piece: 0,
      cctv_camera_supplier_pack_size_piece: 1,
    });
    expect(JSON.stringify(CCTV_SYSTEM_FORMULAS))
      .not.toMatch(/area_m2|\b432\b|electricalNetworkCalculator|golden_rate|normFactor/iu);
    expect(CCTV_SYSTEM_RESOURCES.map((row) => row.row_id))
      .toEqual(expect.not.arrayContaining([
        "rc09:access_control_system",
        "rc09:fire_alarm_system",
        "rc09:general_lan",
        "rc09:general_ups",
      ]));
  });

  test("known CCTV identity gives useful rows and local project needs", async () => {
    const compiled = await compileCctvSystemR1({ ...CCTV_SYSTEM_SHORT_INPUT });
    expect(compiled.rows).toHaveLength(11);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:cctv_system_install_commission", quantity: "1", unit_id: "system" }),
      expect.objectContaining({ row_id: "rc09:cctv_ip_camera", quantity: "16", unit_id: "pcs" }),
      expect.objectContaining({ row_id: "rc09:cctv_nvr", quantity: "1", unit_id: "pcs" }),
      expect.objectContaining({ row_id: "rc09:cctv_camera_test", quantity: "16", unit_id: "test" }),
      expect.objectContaining({ row_id: "rc09:cctv_camera_register", quantity: "16", unit_id: "camera" }),
      expect.objectContaining({ row_id: "rc09:cctv-camera-balance:package-count", quantity: "16", unit_id: "package" }),
    ]));
    expect(compiled.preliminaryNeeds).toHaveLength(22);
  });

  test("compiles the thirty-one-row project fixture", async () => {
    const compiled = await compileCctvSystemR1({ ...CCTV_SYSTEM_ACCEPTANCE_INPUT });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(31);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:cctv_camera_mounting_bracket", quantity: "16" }),
      expect.objectContaining({ row_id: "rc09:cctv_camera_junction_box", quantity: "16" }),
      expect.objectContaining({ row_id: "rc09:cctv_network_cable", quantity: "720" }),
      expect.objectContaining({ row_id: "rc09:cctv_patch_panel", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:cctv_poe_switch", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:cctv_storage_drive", quantity: "4" }),
      expect.objectContaining({ row_id: "rc09:cctv_monitor", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:cctv_termination", quantity: "32" }),
      expect.objectContaining({ row_id: "rc09:cctv_label", quantity: "32" }),
      expect.objectContaining({ row_id: "rc09:cctv_fastening", quantity: "120" }),
      expect.objectContaining({ row_id: "rc09:cctv_consumable", quantity: "6" }),
      expect.objectContaining({ row_id: "rc09:cctv_grounding_conductor", quantity: "18" }),
      expect.objectContaining({ row_id: "rc09:labor:cctv-camera-equipment-install", quantity: "64" }),
      expect.objectContaining({ row_id: "rc09:labor:cctv-cabling-termination", quantity: "96" }),
      expect.objectContaining({ row_id: "rc09:labor:cctv-configuration-commissioning", quantity: "48" }),
      expect.objectContaining({ row_id: "rc09:equipment:cctv-lifting", quantity: "24" }),
      expect.objectContaining({ row_id: "rc09:equipment:cctv-network-tester", quantity: "20" }),
      expect.objectContaining({ row_id: "rc09:logistics:cctv-delivery", quantity: "2" }),
      expect.objectContaining({ row_id: "rc09:logistics:cctv-packaging-removal", quantity: "1" }),
    ]));
  });

  test("separates installed cameras from rounded supplier procurement", async () => {
    const compiled = await compileCctvSystemR1({
      ...CCTV_SYSTEM_ACCEPTANCE_INPUT,
      cctv_camera_retained_spare_piece: 2,
      cctv_camera_supplier_pack_size_piece: 10,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:cctv-camera-balance:installed-net")?.quantity).toBe("16");
    expect(rows.get("rc09:cctv-camera-balance:retained-spare")?.quantity).toBe("2");
    expect(rows.get("rc09:cctv-camera-balance:total-need")?.quantity).toBe("18");
    expect(rows.get("rc09:cctv-camera-balance:package-count")?.quantity).toBe("2");
    expect(rows.get("rc09:cctv_ip_camera")?.quantity).toBe("20");
    expect(rows.get("rc09:cctv-camera-balance:remainder")?.quantity).toBe("4");
    expect(rows.get("rc09:cctv-camera-balance:surplus-beyond-spare")?.quantity).toBe("2");
  });

  test("keeps system, camera checks and records informational beside explicit labor", () => {
    for (const rowId of [
      "rc09:cctv_system_install_commission",
      "rc09:cctv_camera_test",
      "rc09:cctv_camera_register",
      "rc09:cctv_test_report",
    ]) {
      const row = CCTV_SYSTEM_RESOURCES.find((item) => item.row_id === rowId);
      expect(row?.resource_graph).toEqual(expect.objectContaining({
        costTreatment: "INFORMATIONAL_SCOPE",
      }));
    }
  });

  test("keeps analytics and external integration conditional", async () => {
    const compiled = await compileCctvSystemR1({
      ...CCTV_SYSTEM_ACCEPTANCE_INPUT,
      video_analytics_mode: "REQUIRED",
      video_analytics_license_designation: "Лицензия аналитики по проекту",
      video_analytics_license_quantity_piece: 16,
      external_integration_mode: "REQUIRED",
      external_integration_gateway_designation: "Шлюз интеграции по архитектуре",
      external_integration_gateway_quantity_piece: 1,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(33);
    expect(compiled.rows.map((row) => row.row_id))
      .toEqual(expect.arrayContaining([...CONDITIONAL]));
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileCctvSystemR1({
      ...CCTV_SYSTEM_SHORT_INPUT,
      cctv_camera_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileCctvSystemR1(
      { ...CCTV_SYSTEM_ACCEPTANCE_INPUT },
      { catalogId: `${CCTV_SYSTEM_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("CCTV_SYSTEM_CATALOG_UNSUPPORTED");
  });
});
