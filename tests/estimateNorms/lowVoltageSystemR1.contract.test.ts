import {
  LOW_VOLTAGE_SYSTEM_ACCEPTANCE_INPUT,
  LOW_VOLTAGE_SYSTEM_CATALOG_ID,
  LOW_VOLTAGE_SYSTEM_FORMULAS,
  LOW_VOLTAGE_SYSTEM_PARAMETERS,
  LOW_VOLTAGE_SYSTEM_RESOURCES,
  LOW_VOLTAGE_SYSTEM_RUNTIME_INPUT,
  LOW_VOLTAGE_SYSTEM_SHORT_INPUT,
  compileLowVoltageSystemR1,
} from "../../src/lib/estimate/v4/lowVoltageSystemR1";

describe("S27.24 low-voltage structured-cabling owner", () => {
  test("replaces generic electrical area rows with an exact SCS owner", () => {
    expect(LOW_VOLTAGE_SYSTEM_CATALOG_ID).toBe("canonical-work:expanded:low_voltage_system");
    expect(LOW_VOLTAGE_SYSTEM_PARAMETERS).toHaveLength(47);
    expect(LOW_VOLTAGE_SYSTEM_FORMULAS).toHaveLength(33);
    expect(LOW_VOLTAGE_SYSTEM_RESOURCES).toHaveLength(33);
    expect(LOW_VOLTAGE_SYSTEM_RUNTIME_INPUT).toEqual({
      lvs_outlet_retained_spare_piece: 0,
      lvs_outlet_supplier_pack_size_piece: 1,
    });
    expect(JSON.stringify(LOW_VOLTAGE_SYSTEM_FORMULAS))
      .not.toMatch(/area_m2|\b432\b|electricalNetworkCalculator|golden_rate|normFactor/iu);
  });

  test("known outlet and patching identity gives useful rows and local needs", async () => {
    const compiled = await compileLowVoltageSystemR1({ ...LOW_VOLTAGE_SYSTEM_SHORT_INPUT });
    expect(compiled.rows).toHaveLength(11);
    expect(compiled.preliminaryNeeds).toHaveLength(22);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:lvs_system_install_certification", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:lvs_information_outlet", quantity: "48" }),
      expect.objectContaining({ row_id: "rc09:lvs_patch_panel", quantity: "2" }),
      expect.objectContaining({ row_id: "rc09:lvs_permanent_link_test", quantity: "48" }),
      expect.objectContaining({ row_id: "rc09:lvs_outlet_register", quantity: "48" }),
    ]));
  });

  test("compiles the thirty-row project fixture", async () => {
    const compiled = await compileLowVoltageSystemR1({ ...LOW_VOLTAGE_SYSTEM_ACCEPTANCE_INPUT });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(30);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:lvs_copper_cable", quantity: "2400" }),
      expect.objectContaining({ row_id: "rc09:lvs_patch_cord", quantity: "96" }),
      expect.objectContaining({ row_id: "rc09:lvs_cable_manager", quantity: "4" }),
      expect.objectContaining({ row_id: "rc09:lvs_faceplate_backbox", quantity: "48" }),
      expect.objectContaining({ row_id: "rc09:lvs_containment", quantity: "500" }),
      expect.objectContaining({ row_id: "rc09:lvs_firestop", quantity: "20" }),
      expect.objectContaining({ row_id: "rc09:lvs_termination", quantity: "96" }),
      expect.objectContaining({ row_id: "rc09:lvs_label", quantity: "144" }),
      expect.objectContaining({ row_id: "rc09:labor:lvs-cable-component-install", quantity: "160" }),
      expect.objectContaining({ row_id: "rc09:labor:lvs-termination-labeling", quantity: "96" }),
      expect.objectContaining({ row_id: "rc09:labor:lvs-certification-documentation", quantity: "64" }),
      expect.objectContaining({ row_id: "rc09:equipment:lvs-certification-tester", quantity: "40" }),
      expect.objectContaining({ row_id: "rc09:logistics:lvs-delivery", quantity: "3" }),
    ]));
  });

  test("separates installed outlets from rounded supplier procurement", async () => {
    const compiled = await compileLowVoltageSystemR1({
      ...LOW_VOLTAGE_SYSTEM_ACCEPTANCE_INPUT,
      lvs_outlet_retained_spare_piece: 4,
      lvs_outlet_supplier_pack_size_piece: 25,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:lvs-outlet-balance:installed-net")?.quantity).toBe("48");
    expect(rows.get("rc09:lvs-outlet-balance:retained-spare")?.quantity).toBe("4");
    expect(rows.get("rc09:lvs-outlet-balance:total-need")?.quantity).toBe("52");
    expect(rows.get("rc09:lvs-outlet-balance:package-count")?.quantity).toBe("3");
    expect(rows.get("rc09:lvs_information_outlet")?.quantity).toBe("75");
    expect(rows.get("rc09:lvs-outlet-balance:remainder")?.quantity).toBe("27");
    expect(rows.get("rc09:lvs-outlet-balance:surplus-beyond-spare")?.quantity).toBe("23");
  });

  test("keeps certification scope informational beside explicit labor", () => {
    for (const rowId of [
      "rc09:lvs_system_install_certification", "rc09:lvs_permanent_link_test",
      "rc09:lvs_outlet_register", "rc09:lvs_test_report",
    ]) expect(LOW_VOLTAGE_SYSTEM_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph).toEqual(expect.objectContaining({ costTreatment: "INFORMATIONAL_SCOPE" }));
  });

  test("keeps fiber and active uplink conditional", async () => {
    const compiled = await compileLowVoltageSystemR1({
      ...LOW_VOLTAGE_SYSTEM_ACCEPTANCE_INPUT,
      lvs_fiber_backbone_mode: "REQUIRED",
      lvs_fiber_cable_designation: "FO SM G.652D по проекту",
      lvs_fiber_cable_length_m: 300,
      lvs_fiber_termination_designation: "LC/UPC по схеме",
      lvs_fiber_termination_quantity_piece: 24,
      lvs_active_uplink_mode: "REQUIRED",
      lvs_active_uplink_designation: "Uplink-коммутатор по архитектуре",
      lvs_active_uplink_quantity_piece: 2,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(33);
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileLowVoltageSystemR1({
      ...LOW_VOLTAGE_SYSTEM_SHORT_INPUT,
      lvs_information_outlet_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileLowVoltageSystemR1(
      { ...LOW_VOLTAGE_SYSTEM_ACCEPTANCE_INPUT },
      { catalogId: `${LOW_VOLTAGE_SYSTEM_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("LOW_VOLTAGE_SYSTEM_CATALOG_UNSUPPORTED");
  });
});
