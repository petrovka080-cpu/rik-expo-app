import {
  SPLIT_SYSTEM_BLOCKS_ACCEPTANCE_INPUT,
  SPLIT_SYSTEM_BLOCKS_CATALOG_ID,
  SPLIT_SYSTEM_BLOCKS_FORMULAS,
  SPLIT_SYSTEM_BLOCKS_PARAMETERS,
  SPLIT_SYSTEM_BLOCKS_RESOURCES,
  SPLIT_SYSTEM_BLOCKS_SHORT_INPUT,
  compileSplitSystemBlocksR1,
} from "../../src/lib/estimate/v4/splitSystemBlocksR1";

const REQUIRED = [
  "rc09:split_system_install_commission",
  "rc09:split_system_indoor_outdoor_3_5kw",
  "rc09:refrigeration_copper_pipe_pair",
  "rc09:closed_cell_pipe_insulation_pair",
  "rc09:condensate_drain_pipe_d20",
  "rc09:split_interconnect_cable",
  "rc09:outdoor_unit_wall_bracket",
  "rc09:dry_nitrogen_pressure_test",
  "rc09:split_system_vacuum_leak_commission",
] as const;
const CONDITIONAL = [
  "rc09:additional_refrigerant",
  "rc09:fire_rated_penetration_seal",
  "rc09:decorative_trunking",
] as const;

describe("MASTER split-system blocks owner", () => {
  test("uses direct geometry without importing historical allowances", () => {
    expect(SPLIT_SYSTEM_BLOCKS_CATALOG_ID)
      .toBe("canonical-work:base:heating_hvac_interior_split_install_standard");
    expect(SPLIT_SYSTEM_BLOCKS_PARAMETERS).toHaveLength(16);
    expect(SPLIT_SYSTEM_BLOCKS_FORMULAS).toHaveLength(12);
    expect(SPLIT_SYSTEM_BLOCKS_RESOURCES).toHaveLength(12);
    expect(JSON.stringify(SPLIT_SYSTEM_BLOCKS_FORMULAS))
      .not.toMatch(/golden_rate|normFactor|system_count\s*\*\s*(?:8\.5|9|0\.08)/iu);
    expect(SPLIT_SYSTEM_BLOCKS_RESOURCES.map((row) => row.row_id))
      .not.toEqual(expect.arrayContaining([
        "rc09:building_vrf_system",
        "rc09:full_electrical_distribution",
      ]));
  });

  test("known four systems and 8 m routes give useful geometric rows and local needs", async () => {
    const compiled = await compileSplitSystemBlocksR1({ ...SPLIT_SYSTEM_BLOCKS_SHORT_INPUT });
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "4", unit_id: "set" }),
      expect.objectContaining({ row_id: REQUIRED[1], quantity: "4", unit_id: "set" }),
      expect.objectContaining({ row_id: REQUIRED[2], quantity: "64", unit_id: "m" }),
      expect.objectContaining({ row_id: REQUIRED[3], quantity: "64", unit_id: "m" }),
      expect.objectContaining({ row_id: REQUIRED[4], quantity: "32", unit_id: "m" }),
      expect.objectContaining({ row_id: REQUIRED[5], quantity: "32", unit_id: "m" }),
      expect.objectContaining({ row_id: REQUIRED[8], quantity: "4", unit_id: "test" }),
    ]));
    expect(compiled.rows).toHaveLength(7);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([REQUIRED[6], REQUIRED[7], ...CONDITIONAL]));
    expect(compiled.preliminaryNeeds).toHaveLength(5);
  });

  test("compiles the evidence-bound nine-row fixture", async () => {
    const compiled = await compileSplitSystemBlocksR1({ ...SPLIT_SYSTEM_BLOCKS_ACCEPTANCE_INPUT });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[6], quantity: "4", unit_id: "set" }),
      expect.objectContaining({ row_id: REQUIRED[7], quantity: "0.32", unit_id: "m3" }),
    ]));
    expect(compiled.rows).toHaveLength(9);
  });

  test("keeps refrigerant, fire sealing and decorative trunking conditional", async () => {
    const compiled = await compileSplitSystemBlocksR1({
      ...SPLIT_SYSTEM_BLOCKS_ACCEPTANCE_INPUT,
      additional_refrigerant_mode: "REQUIRED",
      additional_refrigerant_designation: "R32 по паспорту выбранной модели",
      additional_refrigerant_mass_kg: 1.2,
      fire_rated_penetration_seal_mode: "REQUIRED",
      fire_rated_penetration_seal_designation: "Система огнестойкой проходки по проекту",
      fire_rated_penetration_seal_quantity_piece: 4,
      decorative_trunking_mode: "REQUIRED",
      decorative_trunking_designation: "Короб ПВХ по раскладке трассы",
      decorative_trunking_length_m: 18,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(12);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: CONDITIONAL[0], quantity: "1.2", unit_id: "kg" }),
      expect.objectContaining({ row_id: CONDITIONAL[1], quantity: "4", unit_id: "pcs" }),
      expect.objectContaining({ row_id: CONDITIONAL[2], quantity: "18", unit_id: "m" }),
    ]));
  });

  test("rejects invalid values and unrelated identities", async () => {
    await expect(compileSplitSystemBlocksR1({
      ...SPLIT_SYSTEM_BLOCKS_SHORT_INPUT,
      system_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileSplitSystemBlocksR1(
      { ...SPLIT_SYSTEM_BLOCKS_ACCEPTANCE_INPUT },
      { catalogId: `${SPLIT_SYSTEM_BLOCKS_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("SPLIT_SYSTEM_BLOCKS_CATALOG_UNSUPPORTED");
  });
});
