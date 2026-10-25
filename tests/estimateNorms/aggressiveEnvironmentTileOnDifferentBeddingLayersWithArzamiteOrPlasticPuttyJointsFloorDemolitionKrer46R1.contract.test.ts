import {
  AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_CATALOG_ID,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_CATALOG_IDS,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_FORMULAS,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_PARAMETERS,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_RESOURCES,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
  AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_VARIANTS,
  compileAggressiveEnvironmentTileOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsFloorDemolitionKrer46R1,
  validateAggressiveEnvironmentTileOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsFloorDemolitionKrer46Completeness,
} from "../../src/lib/estimate/v4/aggressiveEnvironmentTileOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsFloorDemolitionKrer46R1";

describe("KRER 46 tile-on-different-bedding-layers-with-arzamite-or-plastic-putty-joints floor covering demolition", () => {
  test("binds the exact official rate and complete narrow operation boundary", () => {
    expect(AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_CATALOG_ID)
      .toBe("canonical-work:base:demolition_interior_flooring_open_standard");
    expect(AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_CATALOG_IDS).toHaveLength(2);
    expect(AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256)
      .toMatch(/^[0-9a-f]{64}$/u);
    expect(AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_PARAMETERS).toHaveLength(3);
    expect(AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_FORMULAS).toHaveLength(2);
    expect(AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_RESOURCES).toHaveLength(2);
    expect(validateAggressiveEnvironmentTileOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsFloorDemolitionKrer46Completeness()).toBe(true);
    expect(AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(5);
    expect(AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({
          operationId: "construction_labor_grade_3_2",
          expectedResourceId: "required-resource:construction-labor-grade-3-2",
        }),
        expect.objectContaining({
          operationId: "clean_salvageable_tiles_and_bricks_from_mortar",
          condition: "confirmed_krer_46_04_011_06_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_in_aggressive_environment",
          resolution: expect.objectContaining({ kind: "INCLUDED_IN_PARENT" }),
        }),
      ]));
  });

  test("turns 100 m2 into 24 man-hours without machines or materials", async () => {
    const compiled = await compileAggressiveEnvironmentTileOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsFloorDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toEqual([
      expect.objectContaining({
        row_id: "f09:aggressive_environment_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_floor_demolition:operation",
        quantity: "100",
        unit_id: "m2",
      }),
      expect.objectContaining({
        row_id: "f09:aggressive_environment_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_floor_demolition:labor",
        quantity: "24",
        unit_id: "man_hour",
      }),
    ]);
    expect(compiled.rows.every((row) => row.unit_price == null && row.amount == null))
      .toBe(true);
    expect(compiled.rows.some((row) => ["material", "equipment"].includes(String(row.category))))
      .toBe(false);
  });

  test("scales only by confirmed net area", async () => {
    const compiled = await compileAggressiveEnvironmentTileOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsFloorDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toContainEqual(expect.objectContaining({
      row_id: "f09:aggressive_environment_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_floor_demolition:operation",
      quantity: "35.5",
    }));
    expect(compiled.rows).toContainEqual(expect.objectContaining({
      row_id: "f09:aggressive_environment_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_floor_demolition:labor",
      quantity: "8.52",
    }));
  });

  test.each(Object.entries(AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_VARIANTS))(
    "%s identity uses the same exact rate without a classification factor",
    async (_variantKey, variant) => {
      const compiled = await compileAggressiveEnvironmentTileOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsFloorDemolitionKrer46R1(
        { ...AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_SHORT_INPUT },
        { catalogId: variant.catalogId },
      );
      expect(compiled.revisionProjection.catalogId).toBe(variant.catalogId);
      expect(compiled.rows).toEqual([
        expect.objectContaining({ quantity: "100", unit_id: "m2" }),
        expect.objectContaining({ quantity: "24", unit_id: "man_hour" }),
      ]);
      expect(compiled.preliminaryNeeds).toEqual([]);
    },
  );

  test("defers missing applicability and rejects a wrong material or identity", async () => {
    const incomplete = await compileAggressiveEnvironmentTileOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsFloorDemolitionKrer46R1({
      floor_covering_area_m2: 100,
    });
    expect(incomplete.rows).toEqual([]);
    expect(incomplete.preliminaryNeeds).toHaveLength(2);
    await expect(compileAggressiveEnvironmentTileOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsFloorDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
      existing_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_aggressive_environment_confirmed: false,
    })).rejects.toThrow("AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_MATERIAL_NOT_CONFIRMED");
    await expect(compileAggressiveEnvironmentTileOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsFloorDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
      existing_aggressive_environment_tile_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_floor_profile:
        "KRER_46_04_011_03_TILE_ON_SILICATE_PUTTY_AGGRESSIVE_ENVIRONMENT",
    })).rejects.toThrow("AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
    await expect(compileAggressiveEnvironmentTileOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsFloorDemolitionKrer46R1(
      { ...AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_SHORT_INPUT },
      { catalogId: `${AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_CATALOG_ID}:other` },
    )).rejects.toThrow("AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_CATALOG_UNSUPPORTED");
  });

  test("does not smuggle adjacent construction or waste-export scope", () => {
    const serialized = JSON.stringify({
      formulas: AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_FORMULAS,
      resources: AGGRESSIVE_ENVIRONMENT_TILE_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_FLOOR_DEMOLITION_KRER46_RESOURCES,
    });
    expect(serialized).not.toMatch(
      /new_floor|adhesive|screed_install|landfill|truck|area_factor|compressor|pneumatic_breaker|machinist|sulfur_cement|bituminous_mastic|silicate_putty|tile_on_mortar/iu,
    );
  });
});
