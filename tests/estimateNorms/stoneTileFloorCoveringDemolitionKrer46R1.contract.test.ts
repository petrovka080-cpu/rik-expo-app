import {
  STONE_TILE_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  STONE_TILE_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
  STONE_TILE_FLOOR_DEMOLITION_KRER46_CATALOG_ID,
  STONE_TILE_FLOOR_DEMOLITION_KRER46_CATALOG_IDS,
  STONE_TILE_FLOOR_DEMOLITION_KRER46_FORMULAS,
  STONE_TILE_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  STONE_TILE_FLOOR_DEMOLITION_KRER46_PARAMETERS,
  STONE_TILE_FLOOR_DEMOLITION_KRER46_RESOURCES,
  STONE_TILE_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
  STONE_TILE_FLOOR_DEMOLITION_KRER46_VARIANTS,
  compileStoneTileFloorDemolitionKrer46R1,
  validateStoneTileFloorDemolitionKrer46Completeness,
} from "../../src/lib/estimate/v4/stoneTileFloorCoveringDemolitionKrer46R1";

describe("KRER 46 stone-cubes floor covering demolition", () => {
  test("binds the exact official rate and limited normative operation boundary", () => {
    expect(STONE_TILE_FLOOR_DEMOLITION_KRER46_CATALOG_ID)
      .toBe("canonical-work:base:demolition_interior_flooring_remove_standard");
    expect(STONE_TILE_FLOOR_DEMOLITION_KRER46_CATALOG_IDS).toHaveLength(2);
    expect(STONE_TILE_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256)
      .toMatch(/^[0-9a-f]{64}$/u);
    expect(STONE_TILE_FLOOR_DEMOLITION_KRER46_PARAMETERS).toHaveLength(8);
    expect(STONE_TILE_FLOOR_DEMOLITION_KRER46_FORMULAS).toHaveLength(6);
    expect(STONE_TILE_FLOOR_DEMOLITION_KRER46_RESOURCES).toHaveLength(6);
    expect(validateStoneTileFloorDemolitionKrer46Completeness()).toBe(true);
    expect(STONE_TILE_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(7);
  });

  test("turns 100 m2 into 39.18 man-hours without machines or materials", async () => {
    const compiled = await compileStoneTileFloorDemolitionKrer46R1({
      ...STONE_TILE_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
    });
    expect(compiled.preliminaryNeeds).toHaveLength(4);
    expect(compiled.rows).toEqual([
      expect.objectContaining({
        row_id: "f09:stone_tile_floor_demolition:operation",
        quantity: "100",
        unit_id: "m2",
      }),
      expect.objectContaining({
        row_id: "f09:stone_tile_floor_demolition:labor",
        quantity: "39.18",
        unit_id: "man_hour",
      }),
    ]);
    expect(compiled.rows.every((row) => row.unit_price == null && row.amount == null))
      .toBe(true);
    expect(compiled.rows.some((row) => ["material", "equipment"].includes(String(row.category))))
      .toBe(false);
  });

  test("scales only by confirmed net area", async () => {
    const compiled = await compileStoneTileFloorDemolitionKrer46R1({
      ...STONE_TILE_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toHaveLength(4);
    expect(compiled.rows).toContainEqual(expect.objectContaining({
      row_id: "f09:stone_tile_floor_demolition:operation",
      quantity: "35.5",
    }));
    expect(compiled.rows).toContainEqual(expect.objectContaining({
      row_id: "f09:stone_tile_floor_demolition:labor",
      quantity: "13.9089",
    }));
  });

  test.each(Object.entries(STONE_TILE_FLOOR_DEMOLITION_KRER46_VARIANTS))(
    "%s identity uses the same exact rate without a classification factor",
    async (_variantKey, variant) => {
      const compiled = await compileStoneTileFloorDemolitionKrer46R1(
        { ...STONE_TILE_FLOOR_DEMOLITION_KRER46_SHORT_INPUT },
        { catalogId: variant.catalogId },
      );
      expect(compiled.revisionProjection.catalogId).toBe(variant.catalogId);
      expect(compiled.rows).toEqual([
        expect.objectContaining({ quantity: "100", unit_id: "m2" }),
        expect.objectContaining({ quantity: "39.18", unit_id: "man_hour" }),
      ]);
      expect(compiled.preliminaryNeeds).toHaveLength(4);
    },
  );

  test("defers missing applicability and rejects a wrong material or identity", async () => {
    const incomplete = await compileStoneTileFloorDemolitionKrer46R1({
      floor_covering_area_m2: 100,
    });
    expect(incomplete.rows).toEqual([]);
    expect(incomplete.preliminaryNeeds).toHaveLength(6);
    await expect(compileStoneTileFloorDemolitionKrer46R1({
      ...STONE_TILE_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
      existing_stone_tile_covering_confirmed: false,
    })).rejects.toThrow("STONE_TILE_FLOOR_DEMOLITION_KRER46_MATERIAL_NOT_CONFIRMED");
    await expect(compileStoneTileFloorDemolitionKrer46R1({
      ...STONE_TILE_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
      existing_covering_profile: "KRER_46_04_010_03_PARQUET",
    })).rejects.toThrow("STONE_TILE_FLOOR_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
    await expect(compileStoneTileFloorDemolitionKrer46R1(
      { ...STONE_TILE_FLOOR_DEMOLITION_KRER46_SHORT_INPUT },
      { catalogId: `${STONE_TILE_FLOOR_DEMOLITION_KRER46_CATALOG_ID}:other` },
    )).rejects.toThrow("STONE_TILE_FLOOR_DEMOLITION_KRER46_CATALOG_UNSUPPORTED");
  });

  test("requires fresh physical scope and refuses invented waste quantities", async () => {
    const input={...STONE_TILE_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT};
    const legacy=await compileStoneTileFloorDemolitionKrer46R1({...input,stone_cubes_source_scope_confirmed:undefined});
    expect(legacy.rows).toEqual([]);
    expect(legacy.preliminaryNeeds.every(need=>need.missing_parameter_ids.includes('stone_cubes_source_scope_confirmed'))).toBe(true);
    for(const id of ['open_qty_packaging','open_qty_other_descent','open_qty_offsite_haul','open_qty_disposal'])
      await expect(compileStoneTileFloorDemolitionKrer46R1({...input,[id]:1})).rejects.toThrow();
    expect(STONE_TILE_FLOOR_DEMOLITION_KRER46_PARAMETERS.every(p=>p.default_value==null)).toBe(true);
  });

  test("does not smuggle adjacent construction or waste-export scope", () => {
    const serialized = JSON.stringify({
      formulas: STONE_TILE_FLOOR_DEMOLITION_KRER46_FORMULAS,
      resources: STONE_TILE_FLOOR_DEMOLITION_KRER46_RESOURCES,
    });
    expect(serialized).not.toMatch(/new_floor|adhesive|screed_install|area_factor/iu);
  });
});
