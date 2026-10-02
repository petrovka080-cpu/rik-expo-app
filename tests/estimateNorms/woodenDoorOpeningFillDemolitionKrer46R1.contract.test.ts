import {
  WOODEN_DOOR_FILL_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  WOODEN_DOOR_FILL_DEMOLITION_KRER46_ARTIFACT_SHA256,
  WOODEN_DOOR_FILL_DEMOLITION_KRER46_CATALOG_ID,
  WOODEN_DOOR_FILL_DEMOLITION_KRER46_CATALOG_IDS,
  WOODEN_DOOR_FILL_DEMOLITION_KRER46_FORMULAS,
  WOODEN_DOOR_FILL_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  WOODEN_DOOR_FILL_DEMOLITION_KRER46_PARAMETERS,
  WOODEN_DOOR_FILL_DEMOLITION_KRER46_RESOURCES,
  WOODEN_DOOR_FILL_DEMOLITION_KRER46_SHORT_INPUT,
  WOODEN_DOOR_FILL_DEMOLITION_KRER46_VARIANTS,
  compileWoodenDoorFillDemolitionKrer46R1,
  validateWoodenDoorFillDemolitionKrer46Completeness,
} from "../../src/lib/estimate/v4/woodenDoorOpeningFillDemolitionKrer46R1";

describe("KRER 46 wooden door opening-fill demolition", () => {
  test("binds the exact official rate and narrow door-fill boundary", () => {
    expect(WOODEN_DOOR_FILL_DEMOLITION_KRER46_CATALOG_ID)
      .toBe("canonical-work:base:demolition_interior_door_block_dismantle_standard");
    expect(WOODEN_DOOR_FILL_DEMOLITION_KRER46_CATALOG_IDS).toHaveLength(4);
    expect(WOODEN_DOOR_FILL_DEMOLITION_KRER46_ARTIFACT_SHA256)
      .toMatch(/^[0-9a-f]{64}$/u);
    expect(WOODEN_DOOR_FILL_DEMOLITION_KRER46_PARAMETERS).toHaveLength(3);
    expect(WOODEN_DOOR_FILL_DEMOLITION_KRER46_FORMULAS).toHaveLength(4);
    expect(WOODEN_DOOR_FILL_DEMOLITION_KRER46_RESOURCES).toHaveLength(4);
    expect(validateWoodenDoorFillDemolitionKrer46Completeness()).toBe(true);
    expect(WOODEN_DOOR_FILL_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(6);
  });

  test("turns 100 m2 into the exact labor and lift resources", async () => {
    const compiled = await compileWoodenDoorFillDemolitionKrer46R1({
      ...WOODEN_DOOR_FILL_DEMOLITION_KRER46_SHORT_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toEqual([
      expect.objectContaining({ quantity: "100", unit_id: "m2" }),
      expect.objectContaining({ quantity: "103.91", unit_id: "man_hour" }),
      expect.objectContaining({ quantity: "7.74", unit_id: "man_hour" }),
      expect.objectContaining({ quantity: "7.74", unit_id: "machine_hour" }),
    ]);
    expect(compiled.rows.every((row) => row.unit_price == null && row.amount == null))
      .toBe(true);
  });

  test("scales only by confirmed net area", async () => {
    const compiled = await compileWoodenDoorFillDemolitionKrer46R1({
      ...WOODEN_DOOR_FILL_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
    });
    expect(compiled.rows.map((row) => row.quantity)).toEqual([
      "35.5",
      "36.88805",
      "2.7477",
      "2.7477",
    ]);
  });

  test.each(Object.entries(WOODEN_DOOR_FILL_DEMOLITION_KRER46_VARIANTS))(
    "%s identity uses the same exact rate without a classification factor",
    async (_variantKey, variant) => {
      const compiled = await compileWoodenDoorFillDemolitionKrer46R1(
        { ...WOODEN_DOOR_FILL_DEMOLITION_KRER46_SHORT_INPUT },
        { catalogId: variant.catalogId },
      );
      expect(compiled.revisionProjection.catalogId).toBe(variant.catalogId);
      expect(compiled.rows.map((row) => row.quantity)).toEqual([
        "100", "103.91", "7.74", "7.74",
      ]);
      expect(compiled.preliminaryNeeds).toEqual([]);
    },
  );

  test("defers missing applicability and rejects wrong material or identity", async () => {
    const incomplete = await compileWoodenDoorFillDemolitionKrer46R1({
      opening_fill_area_m2: 100,
    });
    expect(incomplete.rows).toEqual([]);
    expect(incomplete.preliminaryNeeds).toHaveLength(4);
    await expect(compileWoodenDoorFillDemolitionKrer46R1({
      ...WOODEN_DOOR_FILL_DEMOLITION_KRER46_SHORT_INPUT,
      existing_wooden_door_fill_confirmed: false,
    })).rejects.toThrow("WOODEN_DOOR_FILL_DEMOLITION_KRER46_MATERIAL_NOT_CONFIRMED");
    await expect(compileWoodenDoorFillDemolitionKrer46R1({
      ...WOODEN_DOOR_FILL_DEMOLITION_KRER46_SHORT_INPUT,
      existing_opening_fill_profile: "KRER_46_04_012_01_WOODEN_WINDOW_WITH_SILL",
    })).rejects.toThrow("WOODEN_DOOR_FILL_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
    await expect(compileWoodenDoorFillDemolitionKrer46R1(
      { ...WOODEN_DOOR_FILL_DEMOLITION_KRER46_SHORT_INPUT },
      { catalogId: `${WOODEN_DOOR_FILL_DEMOLITION_KRER46_CATALOG_ID}:other` },
    )).rejects.toThrow("WOODEN_DOOR_FILL_DEMOLITION_KRER46_CATALOG_UNSUPPORTED");
  });

  test("does not add new doors, opening repair, haul or a zone factor", () => {
    const serialized = JSON.stringify({
      formulas: WOODEN_DOOR_FILL_DEMOLITION_KRER46_FORMULAS,
      resources: WOODEN_DOOR_FILL_DEMOLITION_KRER46_RESOURCES,
    });
    expect(serialized).not.toMatch(
      /new_door|opening_repair|slope_restoration|landfill|truck|area_factor/iu,
    );
  });
});
