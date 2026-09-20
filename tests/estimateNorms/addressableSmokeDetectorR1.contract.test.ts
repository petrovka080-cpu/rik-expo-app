import {
  ADDRESSABLE_SMOKE_DETECTOR_ACCEPTANCE_INPUT,
  ADDRESSABLE_SMOKE_DETECTOR_CATALOG_ID,
  ADDRESSABLE_SMOKE_DETECTOR_FORMULAS,
  ADDRESSABLE_SMOKE_DETECTOR_PARAMETERS,
  ADDRESSABLE_SMOKE_DETECTOR_RESOURCES,
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
    expect(ADDRESSABLE_SMOKE_DETECTOR_PARAMETERS).toHaveLength(17);
    expect(ADDRESSABLE_SMOKE_DETECTOR_FORMULAS).toHaveLength(10);
    expect(ADDRESSABLE_SMOKE_DETECTOR_RESOURCES).toHaveLength(10);
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
    expect(compiled.rows).toHaveLength(4);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([
        REQUIRED[3], ...REQUIRED.slice(5), ...CONDITIONAL,
      ]));
    expect(compiled.preliminaryNeeds).toHaveLength(6);
  });

  test("compiles the evidence-bound eight-row fixture", async () => {
    const compiled = await compileAddressableSmokeDetectorR1({
      ...ADDRESSABLE_SMOKE_DETECTOR_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[3], quantity: "25", unit_id: "set" }),
      expect.objectContaining({ row_id: REQUIRED[5], quantity: "0.18", unit_id: "l" }),
      expect.objectContaining({ row_id: REQUIRED[6], quantity: "1.5", unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: REQUIRED[7], quantity: "1", unit_id: "document" }),
    ]));
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
    expect(compiled.rows).toHaveLength(10);
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
