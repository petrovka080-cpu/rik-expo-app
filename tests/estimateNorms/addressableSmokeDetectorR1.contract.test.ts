import {
  ADDRESSABLE_SMOKE_DETECTOR_ACCEPTANCE_INPUT,
  ADDRESSABLE_SMOKE_DETECTOR_CATALOG_ID,
  ADDRESSABLE_SMOKE_DETECTOR_FORMULAS,
  ADDRESSABLE_SMOKE_DETECTOR_PARAMETERS,
  ADDRESSABLE_SMOKE_DETECTOR_RESOURCES,
  ADDRESSABLE_SMOKE_DETECTOR_RUNTIME_INPUT,
  ADDRESSABLE_SMOKE_DETECTOR_SHORT_INPUT,
  compileAddressableSmokeDetectorR1,
} from "../../src/lib/estimate/v4/addressableSmokeDetectorR1";

const REQUIRED = [
  "rc09:addressable_smoke_detector_install",
  "rc09:addressable_optical_smoke_detector",
  "rc09:addressable_detector_base",
  "rc09:detector_fire_resistant_fastener",
  "rc09:detector_address_label",
  "rc09:smoke_detector_test_aerosol",
  "rc09:smoke_detector_test_dispenser",
  "rc09:smoke_detector_activation_record",
] as const;
const CONDITIONAL = [
  "rc09:addressable_loop_isolator",
  "rc09:fire_resistant_junction_box",
] as const;

describe("MASTER addressable smoke-detector owner", () => {
  test("uses the exact fire-alarm owner without importing historical QA rates", () => {
    expect(ADDRESSABLE_SMOKE_DETECTOR_CATALOG_ID)
      .toBe("canonical-work:base:electrical_interior_fire_alarm_install_standard");
    expect(ADDRESSABLE_SMOKE_DETECTOR_PARAMETERS).toHaveLength(29);
    expect(ADDRESSABLE_SMOKE_DETECTOR_FORMULAS).toHaveLength(28);
    expect(ADDRESSABLE_SMOKE_DETECTOR_RESOURCES).toHaveLength(28);
    expect(ADDRESSABLE_SMOKE_DETECTOR_RUNTIME_INPUT).toEqual({
      detector_retained_spare_piece: 0,
      detector_supplier_pack_size_piece: 1,
      base_retained_spare_piece: 0,
      base_supplier_pack_size_piece: 1,
    });
    expect(JSON.stringify(ADDRESSABLE_SMOKE_DETECTOR_FORMULAS))
      .not.toMatch(/golden_rate|normFactor|detector_count\s*\*\s*(?:0\.006|0\.05|0\.04)/iu);
    expect(ADDRESSABLE_SMOKE_DETECTOR_RESOURCES.map((row) => row.row_id))
      .not.toEqual(expect.arrayContaining([
        "rc09:fire_alarm_loop_cable",
        "rc09:fire_alarm_control_panel",
        "rc09:sounder",
        "rc09:power_supply",
        "rc09:full_fire_alarm_system",
      ]));
  });

  test("known count gives work, devices, bases and labels plus local needs", async () => {
    const compiled = await compileAddressableSmokeDetectorR1({
      ...ADDRESSABLE_SMOKE_DETECTOR_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "25", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[1], quantity: "25", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[2], quantity: "25", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[4], quantity: "25", unit_id: "pcs" }),
    ]));
    expect(compiled.rows).toHaveLength(16);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([
        REQUIRED[3], ...REQUIRED.slice(5), ...CONDITIONAL,
      ]));
    expect(compiled.preliminaryNeeds).toHaveLength(12);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([
        "rc09:labor:installation", "rc09:labor:programming-testing",
        "rc09:equipment:mounting-tool", "rc09:equipment:loop-programmer",
        "rc09:logistics:delivery", "rc09:logistics:waste-removal",
      ]));
  });

  test("compiles the evidence-bound project fixture with labor, tools and logistics", async () => {
    const compiled = await compileAddressableSmokeDetectorR1({
      ...ADDRESSABLE_SMOKE_DETECTOR_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(26);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[3], quantity: "25", unit_id: "set" }),
      expect.objectContaining({ row_id: REQUIRED[5], quantity: "0.18", unit_id: "l" }),
      expect.objectContaining({ row_id: REQUIRED[6], quantity: "1.5", unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: REQUIRED[7], quantity: "1", unit_id: "document" }),
      expect.objectContaining({ row_id: "rc09:labor:installation", quantity: "15" }),
      expect.objectContaining({ row_id: "rc09:labor:programming-testing", quantity: "10" }),
      expect.objectContaining({ row_id: "rc09:equipment:mounting-tool", quantity: "5" }),
      expect.objectContaining({ row_id: "rc09:equipment:loop-programmer", quantity: "4" }),
      expect.objectContaining({ row_id: "rc09:logistics:delivery", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:logistics:waste-removal", quantity: "1" }),
    ]));
    expect(compiled.rows.find((row) => row.row_id === REQUIRED[0])
      ?.included_in_estimate).toBe(false);
    expect(compiled.rows.find((row) => row.row_id === REQUIRED[7])
      ?.included_in_estimate).toBe(false);
  });

  test("separates detector and base reserves, packages, orders and remainders", async () => {
    const compiled = await compileAddressableSmokeDetectorR1({
      ...ADDRESSABLE_SMOKE_DETECTOR_ACCEPTANCE_INPUT,
      detector_retained_spare_piece: 2,
      detector_supplier_pack_size_piece: 10,
      base_retained_spare_piece: 1,
      base_supplier_pack_size_piece: 20,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:detector-balance:installed-net")?.quantity).toBe("25");
    expect(rows.get("rc09:detector-balance:retained-spare")?.quantity).toBe("2");
    expect(rows.get("rc09:detector-balance:total-need")?.quantity).toBe("27");
    expect(rows.get("rc09:detector-balance:package-count")?.quantity).toBe("3");
    expect(rows.get(REQUIRED[1])?.quantity).toBe("30");
    expect(rows.get("rc09:detector-balance:remainder")?.quantity).toBe("5");
    expect(rows.get("rc09:detector-balance:surplus-beyond-reserve")?.quantity).toBe("3");
    expect(rows.get("rc09:base-balance:installed-net")?.quantity).toBe("25");
    expect(rows.get("rc09:base-balance:retained-spare")?.quantity).toBe("1");
    expect(rows.get("rc09:base-balance:total-need")?.quantity).toBe("26");
    expect(rows.get("rc09:base-balance:package-count")?.quantity).toBe("2");
    expect(rows.get(REQUIRED[2])?.quantity).toBe("40");
    expect(rows.get("rc09:base-balance:remainder")?.quantity).toBe("15");
    expect(rows.get("rc09:base-balance:surplus-beyond-reserve")?.quantity).toBe("14");
  });

  test("keeps loop isolators and junction boxes conditional", async () => {
    const compiled = await compileAddressableSmokeDetectorR1({
      ...ADDRESSABLE_SMOKE_DETECTOR_ACCEPTANCE_INPUT,
      loop_isolator_mode: "REQUIRED",
      loop_isolator_designation: "Изолятор адресного шлейфа по схеме",
      loop_isolator_quantity_piece: 2,
      junction_box_mode: "REQUIRED",
      junction_box_designation: "Коробка E30 по узлу",
      junction_box_quantity_piece: 5,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(28);
    expect(compiled.rows.map((row) => row.row_id))
      .toEqual(expect.arrayContaining([...CONDITIONAL]));
  });

  test("rejects invalid values and unrelated identities", async () => {
    await expect(compileAddressableSmokeDetectorR1({
      ...ADDRESSABLE_SMOKE_DETECTOR_SHORT_INPUT,
      detector_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileAddressableSmokeDetectorR1(
      { ...ADDRESSABLE_SMOKE_DETECTOR_ACCEPTANCE_INPUT },
      { catalogId: `${ADDRESSABLE_SMOKE_DETECTOR_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("ADDRESSABLE_SMOKE_DETECTOR_CATALOG_UNSUPPORTED");
  });
});
