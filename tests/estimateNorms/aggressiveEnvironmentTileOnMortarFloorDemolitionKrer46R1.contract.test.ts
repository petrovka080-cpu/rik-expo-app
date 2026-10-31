import {
  AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_CATALOG_ID,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_CATALOG_IDS,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_FORMULAS,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_PARAMETERS,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_RESOURCES,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_VARIANTS,
  compileAggressiveEnvironmentTileOnMortarFloorDemolitionKrer46R1,
  validateAggressiveEnvironmentTileOnMortarFloorDemolitionKrer46Completeness,
} from "../../src/lib/estimate/v4/aggressiveEnvironmentTileOnMortarFloorDemolitionKrer46R1";

describe("KRER 46 aggressive-environment tile-on-mortar floor demolition", () => {
  test("binds the exact tile-on-mortar aggressive-environment boundary", () => {
    expect(AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_CATALOG_ID)
      .toBe("canonical-work:base:demolition_interior_tile_remove_standard");
    expect(AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_CATALOG_IDS).toHaveLength(2);
    expect(AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256)
      .toMatch(/^[0-9a-f]{64}$/u);
    expect(AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_PARAMETERS).toHaveLength(3);
    expect(AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_FORMULAS).toHaveLength(5);
    expect(AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_RESOURCES).toHaveLength(5);
    expect(validateAggressiveEnvironmentTileOnMortarFloorDemolitionKrer46Completeness()).toBe(true);
    expect(AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(8);
    expect(AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
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

  test("turns 100 m2 of tile on mortar into the exact labor and pneumatic-tool resources", async () => {
    const compiled = await compileAggressiveEnvironmentTileOnMortarFloorDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toEqual([
      expect.objectContaining({ quantity: "100", unit_id: "m2" }),
      expect.objectContaining({ quantity: "36.77", unit_id: "man_hour" }),
      expect.objectContaining({ quantity: "0.46", unit_id: "man_hour" }),
      expect.objectContaining({ quantity: "0.46", unit_id: "machine_hour" }),
      expect.objectContaining({ quantity: "0.92", unit_id: "machine_hour" }),
    ]);
    expect(compiled.rows.every((row) => row.unit_price == null && row.amount == null))
      .toBe(true);
  });

  test("scales only by confirmed net tile-covering area", async () => {
    const compiled = await compileAggressiveEnvironmentTileOnMortarFloorDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
    });
    expect(compiled.rows.map((row) => row.quantity)).toEqual([
      "35.5",
      "13.05335",
      "0.1633",
      "0.1633",
      "0.3266",
    ]);
  });

  test.each(Object.entries(AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_VARIANTS))(
    "%s identity uses the same exact rate without a classification factor",
    async (_variantKey, variant) => {
      const compiled = await compileAggressiveEnvironmentTileOnMortarFloorDemolitionKrer46R1(
        { ...AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_SHORT_INPUT },
        { catalogId: variant.catalogId },
      );
      expect(compiled.revisionProjection.catalogId).toBe(variant.catalogId);
      expect(compiled.rows.map((row) => row.quantity)).toEqual([
        "100", "36.77", "0.46", "0.46", "0.92",
      ]);
      expect(compiled.preliminaryNeeds).toEqual([]);
    },
  );

  test("defers missing applicability and rejects wrong bedding, environment or identity", async () => {
    const incomplete = await compileAggressiveEnvironmentTileOnMortarFloorDemolitionKrer46R1({
      floor_covering_area_m2: 100,
    });
    expect(incomplete.rows).toEqual([]);
    expect(incomplete.preliminaryNeeds).toHaveLength(5);
    await expect(compileAggressiveEnvironmentTileOnMortarFloorDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
      existing_tile_on_mortar_aggressive_environment_confirmed: false,
    })).rejects.toThrow("AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_TILE_BEDDING_ENVIRONMENT_NOT_CONFIRMED");
    await expect(compileAggressiveEnvironmentTileOnMortarFloorDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
      existing_aggressive_environment_tile_on_mortar_floor_profile:
        "KRER_46_04_011_01_TILE_ON_BITUMINOUS_MASTIC_AGGRESSIVE_ENVIRONMENT",
    })).rejects.toThrow("AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
    await expect(compileAggressiveEnvironmentTileOnMortarFloorDemolitionKrer46R1(
      { ...AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_SHORT_INPUT },
      { catalogId: `${AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_CATALOG_ID}:other` },
    )).rejects.toThrow("AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_CATALOG_UNSUPPORTED");
  });

  test("keeps ordinary tile scopes, other beddings and offsite haul outside the exact rate", () => {
    const serialized = JSON.stringify({
      formulas: AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_FORMULAS,
      resources: AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_RESOURCES,
    });
    expect(serialized).not.toMatch(
      /tile_install|floor_repair|ordinary_environment|offsite_waste_haul|truck_|area_factor/iu,
    );
    expect(JSON.stringify(
      AGGRESSIVE_ENVIRONMENT_TILE_ON_MORTAR_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
    )).toMatch(/offsite_waste_haul/iu);
  });});
