import {
  PORCELAIN_FLOOR_TILE_INSTALLATION_ACCEPTANCE_INPUT,
  PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_ID,
  PORCELAIN_FLOOR_TILE_INSTALLATION_FORMULAS,
  PORCELAIN_FLOOR_TILE_INSTALLATION_PARAMETERS,
  PORCELAIN_FLOOR_TILE_INSTALLATION_RESOURCES,
  PORCELAIN_FLOOR_TILE_INSTALLATION_SHORT_INPUT,
  compilePorcelainFloorTileInstallationR1,
} from "../../src/lib/estimate/v4/porcelainFloorTileInstallationR1";

const REQUIRED_ROW_IDS = [
  "rc09:porcelain_floor_tile_lay",
  "rc09:porcelain_tile_600x600",
  "rc09:c2te_s1_tile_adhesive",
  "rc09:cement_grout_2mm_joint",
  "rc09:tile_leveling_consumable_clip_2mm",
  "rc09:neutral_silicone_movement_joint",
  "rc09:wet_tile_saw",
] as const;

const CONDITIONAL_ROW_IDS = [
  "rc09:floor_leveling_compound",
  "rc09:floor_waterproofing",
] as const;

describe("MASTER porcelain floor-tile installation owner", () => {
  test("uses the direct porcelain-tile owner with the narrow project-system boundary", () => {
    expect(PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_ID)
      .toBe("canonical-work:base:tile_stone_interior_porcelain_tile_lay_standard");
    expect(PORCELAIN_FLOOR_TILE_INSTALLATION_PARAMETERS).toHaveLength(22);
    expect(PORCELAIN_FLOOR_TILE_INSTALLATION_FORMULAS).toHaveLength(9);
    expect(PORCELAIN_FLOOR_TILE_INSTALLATION_RESOURCES).toHaveLength(9);
    const formulas = JSON.stringify(PORCELAIN_FLOOR_TILE_INSTALLATION_FORMULAS);
    const rowIds = PORCELAIN_FLOOR_TILE_INSTALLATION_RESOURCES.map((row) => row.row_id);
    expect(formulas).not.toMatch(/golden_rate|normFactor|area_m2\s*\*\s*(?:1\.08|5\.2|0\.28|11\.5|0\.025)/iu);
    expect(rowIds).not.toContain("rc09:generic_tile_leveling_system_m2");
  });

  test("turns known 120 m2, 600x600 format and 2 mm joint into work and keeps exact quantities visible", async () => {
    const compiled = await compilePorcelainFloorTileInstallationR1({
      ...PORCELAIN_FLOOR_TILE_INSTALLATION_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual([
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[0], quantity: "120", unit_id: "m2" }),
    ]);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id)).toEqual(
      expect.arrayContaining([...REQUIRED_ROW_IDS.slice(1), ...CONDITIONAL_ROW_IDS]),
    );
    expect(compiled.preliminaryNeeds).toHaveLength(8);
    expect(compiled.preliminaryNeeds.every((need) => need.quantity == null)).toBe(true);
  });

  test("compiles the evidence-bound seven-row fixture without unresolved needs", async () => {
    const compiled = await compilePorcelainFloorTileInstallationR1({
      ...PORCELAIN_FLOOR_TILE_INSTALLATION_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(7);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[0], quantity: "120", unit_id: "m2" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[1], quantity: "129.6", unit_id: "m2" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[2], quantity: "624", unit_id: "kg" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[3], quantity: "33.6", unit_id: "kg" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[4], quantity: "1380", unit_id: "piece" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[5], quantity: "3", unit_id: "l" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[6], quantity: "3", unit_id: "machine_hour" }),
    ]));
  });

  test("keeps floor leveling and waterproofing local and fail-closed", async () => {
    const compiled = await compilePorcelainFloorTileInstallationR1({
      ...PORCELAIN_FLOOR_TILE_INSTALLATION_ACCEPTANCE_INPUT,
      floor_leveling_mode: "REQUIRED",
      floor_leveling_compound_designation: "Выравнивающий состав по обследованию основания",
      floor_leveling_compound_mass_kg: 1200,
      floor_waterproofing_mode: "REQUIRED",
      floor_waterproofing_designation: "Гидроизоляционная система по проекту мокрой зоны",
      floor_waterproofing_area_m2: 120,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(9);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: CONDITIONAL_ROW_IDS[0], quantity: "1200", unit_id: "kg" }),
      expect.objectContaining({ row_id: CONDITIONAL_ROW_IDS[1], quantity: "120", unit_id: "m2" }),
    ]));
  });

  test("rejects invalid supplied values and unrelated identities", async () => {
    await expect(compilePorcelainFloorTileInstallationR1({
      ...PORCELAIN_FLOOR_TILE_INSTALLATION_SHORT_INPUT,
      tile_adhesive_mass_kg: -1,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compilePorcelainFloorTileInstallationR1(
      { ...PORCELAIN_FLOOR_TILE_INSTALLATION_ACCEPTANCE_INPUT },
      { catalogId: `${PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_UNSUPPORTED");
  });
});
