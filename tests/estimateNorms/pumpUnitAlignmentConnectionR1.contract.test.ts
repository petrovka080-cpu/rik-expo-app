import {
  PUMP_UNIT_ALIGNMENT_CONNECTION_ACCEPTANCE_INPUT,
  PUMP_UNIT_ALIGNMENT_CONNECTION_CATALOG_ID,
  PUMP_UNIT_ALIGNMENT_CONNECTION_FORMULAS,
  PUMP_UNIT_ALIGNMENT_CONNECTION_PARAMETERS,
  PUMP_UNIT_ALIGNMENT_CONNECTION_RESOURCES,
  PUMP_UNIT_ALIGNMENT_CONNECTION_RUNTIME_INPUT,
  PUMP_UNIT_ALIGNMENT_CONNECTION_SHORT_INPUT,
  compilePumpUnitAlignmentConnectionR1,
} from "../../src/lib/estimate/v4/pumpUnitAlignmentConnectionR1";

const REQUIRED = [
  "rc09:pump_unit_install_align",
  "rc09:pump_motor_baseframe_45m3h_55m",
  "rc09:pump_anchor_bolt_set",
  "rc09:pump_alignment_shim_set",
  "rc09:non_shrink_pump_base_grout",
  "rc09:pump_flange_gasket_fastener_set",
  "rc09:laser_shaft_alignment_tool",
  "rc09:pump_vibration_qh_current_test",
] as const;
const CONDITIONAL = [
  "rc09:pump_vibration_isolator",
  "rc09:pump_flexible_connector",
] as const;

describe("MASTER pump-unit alignment and connection owner", () => {
  test("uses the exact pump owner without importing historical project rates", () => {
    expect(PUMP_UNIT_ALIGNMENT_CONNECTION_CATALOG_ID)
      .toBe("canonical-work:base:plumbing_interior_pump_install_standard");
    expect(PUMP_UNIT_ALIGNMENT_CONNECTION_PARAMETERS).toHaveLength(32);
    expect(PUMP_UNIT_ALIGNMENT_CONNECTION_FORMULAS).toHaveLength(24);
    expect(PUMP_UNIT_ALIGNMENT_CONNECTION_RESOURCES).toHaveLength(24);
    expect(PUMP_UNIT_ALIGNMENT_CONNECTION_RUNTIME_INPUT).toEqual({
      pump_retained_spare_set: 0,
      pump_supplier_pack_size_set: 1,
    });
    expect(JSON.stringify(PUMP_UNIT_ALIGNMENT_CONNECTION_FORMULAS))
      .not.toMatch(/golden_rate|normFactor|pump_count\s*\*\s*(?:45|2|0\.5)/iu);
    expect(PUMP_UNIT_ALIGNMENT_CONNECTION_RESOURCES.map((row) => row.row_id))
      .not.toEqual(expect.arrayContaining([
        "rc09:pumping_station_collectors",
        "rc09:water_reservoir",
        "rc09:pumping_station_automation",
        "rc09:full_pumping_station",
      ]));
  });

  test("known count and Q/H give work, pump units and individual tests plus local needs", async () => {
    const compiled = await compilePumpUnitAlignmentConnectionR1({
      ...PUMP_UNIT_ALIGNMENT_CONNECTION_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "2", unit_id: "set" }),
      expect.objectContaining({ row_id: REQUIRED[1], quantity: "2", unit_id: "set" }),
      expect.objectContaining({ row_id: REQUIRED[7], quantity: "2", unit_id: "test" }),
    ]));
    expect(compiled.rows).toHaveLength(9);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([...REQUIRED.slice(2, 7), ...CONDITIONAL]));
    expect(compiled.preliminaryNeeds).toHaveLength(15);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([
        "rc09:pump_test_record", "rc09:labor:pump-installation-alignment",
        "rc09:labor:pump-testing", "rc09:equipment:pump-lifting",
        "rc09:equipment:pump-torque-tool", "rc09:equipment:pump-vibration-analyzer",
        "rc09:logistics:pump-delivery", "rc09:logistics:pump-waste-removal",
      ]));
  });

  test("compiles the project fixture with labor, mechanisms, records and logistics", async () => {
    const compiled = await compilePumpUnitAlignmentConnectionR1({
      ...PUMP_UNIT_ALIGNMENT_CONNECTION_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(22);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[2], quantity: "2", unit_id: "set" }),
      expect.objectContaining({ row_id: REQUIRED[3], quantity: "2", unit_id: "set" }),
      expect.objectContaining({ row_id: REQUIRED[4], quantity: "84", unit_id: "kg" }),
      expect.objectContaining({ row_id: REQUIRED[5], quantity: "4", unit_id: "set" }),
      expect.objectContaining({ row_id: REQUIRED[6], quantity: "1", unit_id: "shift" }),
      expect.objectContaining({ row_id: "rc09:pump_test_record", quantity: "2" }),
      expect.objectContaining({ row_id: "rc09:labor:pump-installation-alignment", quantity: "36" }),
      expect.objectContaining({ row_id: "rc09:labor:pump-testing", quantity: "12" }),
      expect.objectContaining({ row_id: "rc09:equipment:pump-lifting", quantity: "8" }),
      expect.objectContaining({ row_id: "rc09:equipment:pump-torque-tool", quantity: "6" }),
      expect.objectContaining({ row_id: "rc09:equipment:pump-vibration-analyzer", quantity: "4" }),
      expect.objectContaining({ row_id: "rc09:logistics:pump-delivery", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:logistics:pump-waste-removal", quantity: "1" }),
    ]));
    expect(compiled.rows.find((row) => row.row_id === REQUIRED[0])
      ?.included_in_estimate).toBe(false);
    expect(compiled.rows.find((row) => row.row_id === REQUIRED[7])
      ?.included_in_estimate).toBe(false);
  });

  test("separates installed pumps, retained reserve, packages, order and remainder", async () => {
    const compiled = await compilePumpUnitAlignmentConnectionR1({
      ...PUMP_UNIT_ALIGNMENT_CONNECTION_ACCEPTANCE_INPUT,
      pump_retained_spare_set: 1,
      pump_supplier_pack_size_set: 2,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:pump-balance:installed-net")?.quantity).toBe("2");
    expect(rows.get("rc09:pump-balance:retained-spare")?.quantity).toBe("1");
    expect(rows.get("rc09:pump-balance:total-need")?.quantity).toBe("3");
    expect(rows.get("rc09:pump-balance:package-count")?.quantity).toBe("2");
    expect(rows.get(REQUIRED[1])?.quantity).toBe("4");
    expect(rows.get("rc09:pump-balance:remainder")?.quantity).toBe("2");
    expect(rows.get("rc09:pump-balance:surplus-beyond-reserve")?.quantity).toBe("1");
  });

  test("keeps vibration isolators and flexible connectors conditional", async () => {
    const compiled = await compilePumpUnitAlignmentConnectionR1({
      ...PUMP_UNIT_ALIGNMENT_CONNECTION_ACCEPTANCE_INPUT,
      vibration_isolator_mode: "REQUIRED",
      vibration_isolator_designation: "Виброизоляторы по чертежу рамы",
      vibration_isolator_quantity_set: 2,
      flexible_connector_mode: "REQUIRED",
      flexible_connector_designation: "Гибкие вставки по схеме обвязки",
      flexible_connector_quantity_set: 4,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(24);
    expect(compiled.rows.map((row) => row.row_id))
      .toEqual(expect.arrayContaining([...CONDITIONAL]));
  });

  test("rejects invalid values and unrelated identities", async () => {
    await expect(compilePumpUnitAlignmentConnectionR1({
      ...PUMP_UNIT_ALIGNMENT_CONNECTION_SHORT_INPUT,
      pump_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compilePumpUnitAlignmentConnectionR1(
      { ...PUMP_UNIT_ALIGNMENT_CONNECTION_ACCEPTANCE_INPUT },
      { catalogId: `${PUMP_UNIT_ALIGNMENT_CONNECTION_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("PUMP_UNIT_ALIGNMENT_CONNECTION_CATALOG_UNSUPPORTED");
  });
});
