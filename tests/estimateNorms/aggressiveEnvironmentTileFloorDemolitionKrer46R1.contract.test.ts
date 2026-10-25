import {
  AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
  AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_CATALOG_ID,
  AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_CATALOG_IDS,
  AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_FORMULAS,
  AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_PARAMETERS,
  AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_RESOURCES,
  AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
  AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_VARIANTS,
  compileAggressiveEnvironmentTileFloorDemolitionKrer46R1,
  validateAggressiveEnvironmentTileFloorDemolitionKrer46Completeness,
} from "../../src/lib/estimate/v4/aggressiveEnvironmentTileFloorDemolitionKrer46R1";

describe("KRER 46 aggressive-environment tile floor demolition", () => {
  test("binds the exact tile-on-bituminous-mastic aggressive-environment boundary", () => {
    expect(AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_CATALOG_ID)
      .toBe("canonical-work:base:demolition_interior_tile_dismantle_standard");
    expect(AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_CATALOG_IDS).toHaveLength(2);
    expect(AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256)
      .toMatch(/^[0-9a-f]{64}$/u);
    expect(AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_PARAMETERS).toHaveLength(3);
    expect(AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_FORMULAS).toHaveLength(5);
    expect(AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_RESOURCES).toHaveLength(5);
    expect(validateAggressiveEnvironmentTileFloorDemolitionKrer46Completeness()).toBe(true);
    expect(AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(8);
    expect(AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({
          operationId: "clean_salvageable_tiles_and_bricks_from_mortar",
          resolution: expect.objectContaining({ kind: "INCLUDED_IN_PARENT" }),
        }),
        expect.objectContaining({
          operationId: "internal_debris_handling_within_object",
          resolution: expect.objectContaining({ kind: "INCLUDED_IN_PARENT" }),
        }),
        expect.objectContaining({
          operationId: "offsite_waste_haul",
          resolution: expect.objectContaining({ kind: "NOT_APPLICABLE" }),
        }),
      ]));
  });

  test("turns 100 m2 into the exact tile-demolition labor and pneumatic-tool resources", async () => {
    const compiled = await compileAggressiveEnvironmentTileFloorDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toEqual([
      expect.objectContaining({ quantity: "100", unit_id: "m2" }),
      expect.objectContaining({ quantity: "46.63", unit_id: "man_hour" }),
      expect.objectContaining({ quantity: "0.36", unit_id: "man_hour" }),
      expect.objectContaining({ quantity: "0.36", unit_id: "machine_hour" }),
      expect.objectContaining({ quantity: "0.72", unit_id: "machine_hour" }),
    ]);
    expect(compiled.rows.every((row) => row.unit_price == null && row.amount == null))
      .toBe(true);
  });

  test("scales only by confirmed net tile-covering area", async () => {
    const compiled = await compileAggressiveEnvironmentTileFloorDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
    });
    expect(compiled.rows.map((row) => row.quantity)).toEqual([
      "35.5",
      "16.55365",
      "0.1278",
      "0.1278",
      "0.2556",
    ]);
  });

  test.each(Object.entries(AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_VARIANTS))(
    "%s identity uses the same exact rate without a classification factor",
    async (_variantKey, variant) => {
      const compiled = await compileAggressiveEnvironmentTileFloorDemolitionKrer46R1(
        { ...AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_SHORT_INPUT },
        { catalogId: variant.catalogId },
      );
      expect(compiled.revisionProjection.catalogId).toBe(variant.catalogId);
      expect(compiled.rows.map((row) => row.quantity)).toEqual([
        "100", "46.63", "0.36", "0.36", "0.72",
      ]);
      expect(compiled.preliminaryNeeds).toEqual([]);
    },
  );

  test("defers missing applicability and rejects wrong bedding, environment or identity", async () => {
    const incomplete = await compileAggressiveEnvironmentTileFloorDemolitionKrer46R1({
      floor_covering_area_m2: 100,
    });
    expect(incomplete.rows).toEqual([]);
    expect(incomplete.preliminaryNeeds).toHaveLength(5);
    await expect(compileAggressiveEnvironmentTileFloorDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
      existing_tile_on_bituminous_mastic_aggressive_environment_confirmed: false,
    })).rejects.toThrow("AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_TILE_BEDDING_ENVIRONMENT_NOT_CONFIRMED");
    await expect(compileAggressiveEnvironmentTileFloorDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
      existing_aggressive_environment_tile_floor_profile:
        "KRER_46_04_011_02_TILE_ON_MORTAR_AGGRESSIVE_ENVIRONMENT",
    })).rejects.toThrow("AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
    await expect(compileAggressiveEnvironmentTileFloorDemolitionKrer46R1(
      { ...AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_SHORT_INPUT },
      { catalogId: `${AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_CATALOG_ID}:other` },
    )).rejects.toThrow("AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_CATALOG_UNSUPPORTED");
  });

  test("keeps ordinary tile scopes, other beddings and offsite haul outside the exact rate", () => {
    const serialized = JSON.stringify({
      formulas: AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_FORMULAS,
      resources: AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_RESOURCES,
    });
    expect(serialized).not.toMatch(
      /tile_install|floor_repair|ordinary_environment|offsite_waste_haul|truck_|area_factor/iu,
    );
    expect(JSON.stringify(
      AGGRESSIVE_ENVIRONMENT_TILE_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
    )).toMatch(/offsite_waste_haul/iu);
  });});
