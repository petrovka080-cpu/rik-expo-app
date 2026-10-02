import {
  WOODEN_PARTITION_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  WOODEN_PARTITION_DEMOLITION_KRER46_ARTIFACT_SHA256,
  WOODEN_PARTITION_DEMOLITION_KRER46_CATALOG_ID,
  WOODEN_PARTITION_DEMOLITION_KRER46_CATALOG_IDS,
  WOODEN_PARTITION_DEMOLITION_KRER46_FORMULAS,
  WOODEN_PARTITION_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  WOODEN_PARTITION_DEMOLITION_KRER46_PARAMETERS,
  WOODEN_PARTITION_DEMOLITION_KRER46_RESOURCES,
  WOODEN_PARTITION_DEMOLITION_KRER46_SHORT_INPUT,
  WOODEN_PARTITION_DEMOLITION_KRER46_VARIANTS,
  compileWoodenPartitionDemolitionKrer46R1,
  validateWoodenPartitionDemolitionKrer46Completeness,
} from "../../src/lib/estimate/v4/woodenPartitionDemolitionKrer46R1";

describe("KRER 46 wooden partition demolition", () => {
  test("binds the exact official rate and narrow partition boundary", () => {
    expect(WOODEN_PARTITION_DEMOLITION_KRER46_CATALOG_ID)
      .toBe("canonical-work:base:demolition_interior_partition_dismantle_standard");
    expect(WOODEN_PARTITION_DEMOLITION_KRER46_CATALOG_IDS).toHaveLength(4);
    expect(WOODEN_PARTITION_DEMOLITION_KRER46_ARTIFACT_SHA256)
      .toMatch(/^[0-9a-f]{64}$/u);
    expect(WOODEN_PARTITION_DEMOLITION_KRER46_PARAMETERS).toHaveLength(3);
    expect(WOODEN_PARTITION_DEMOLITION_KRER46_FORMULAS).toHaveLength(4);
    expect(WOODEN_PARTITION_DEMOLITION_KRER46_RESOURCES).toHaveLength(4);
    expect(validateWoodenPartitionDemolitionKrer46Completeness()).toBe(true);
    expect(WOODEN_PARTITION_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(8);
  });

  test("turns 100 m2 into the exact labor and lift resources", async () => {
    const compiled = await compileWoodenPartitionDemolitionKrer46R1({
      ...WOODEN_PARTITION_DEMOLITION_KRER46_SHORT_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toEqual([
      expect.objectContaining({ quantity: "100", unit_id: "m2" }),
      expect.objectContaining({ quantity: "42.86", unit_id: "man_hour" }),
      expect.objectContaining({ quantity: "7.41", unit_id: "man_hour" }),
      expect.objectContaining({ quantity: "7.41", unit_id: "machine_hour" }),
    ]);
    expect(compiled.rows.every((row) => row.unit_price == null && row.amount == null))
      .toBe(true);
  });

  test("scales only by confirmed net area", async () => {
    const compiled = await compileWoodenPartitionDemolitionKrer46R1({
      ...WOODEN_PARTITION_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
    });
    expect(compiled.rows.map((row) => row.quantity)).toEqual([
      "35.5",
      "15.2153",
      "2.63055",
      "2.63055",
    ]);
  });

  test.each(Object.entries(WOODEN_PARTITION_DEMOLITION_KRER46_VARIANTS))(
    "%s identity uses the same exact rate without a classification factor",
    async (_variantKey, variant) => {
      const compiled = await compileWoodenPartitionDemolitionKrer46R1(
        { ...WOODEN_PARTITION_DEMOLITION_KRER46_SHORT_INPUT },
        { catalogId: variant.catalogId },
      );
      expect(compiled.revisionProjection.catalogId).toBe(variant.catalogId);
      expect(compiled.rows.map((row) => row.quantity)).toEqual([
        "100", "42.86", "7.41", "7.41",
      ]);
      expect(compiled.preliminaryNeeds).toEqual([]);
    },
  );

  test("defers missing applicability and rejects wrong partition type or identity", async () => {
    const incomplete = await compileWoodenPartitionDemolitionKrer46R1({
      partition_area_m2: 100,
    });
    expect(incomplete.rows).toEqual([]);
    expect(incomplete.preliminaryNeeds).toHaveLength(4);
    await expect(compileWoodenPartitionDemolitionKrer46R1({
      ...WOODEN_PARTITION_DEMOLITION_KRER46_SHORT_INPUT,
      existing_plastered_single_layer_timber_board_panel_partition_confirmed: false,
    })).rejects.toThrow("WOODEN_PARTITION_DEMOLITION_KRER46_PARTITION_TYPE_NOT_CONFIRMED");
    await expect(compileWoodenPartitionDemolitionKrer46R1({
      ...WOODEN_PARTITION_DEMOLITION_KRER46_SHORT_INPUT,
      existing_partition_profile: "KRER_46_04_006_02_PLASTERED_SOLID_TIMBER_PARTITION",
    })).rejects.toThrow("WOODEN_PARTITION_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
    await expect(compileWoodenPartitionDemolitionKrer46R1(
      { ...WOODEN_PARTITION_DEMOLITION_KRER46_SHORT_INPUT },
      { catalogId: `${WOODEN_PARTITION_DEMOLITION_KRER46_CATALOG_ID}:other` },
    )).rejects.toThrow("WOODEN_PARTITION_DEMOLITION_KRER46_CATALOG_UNSUPPORTED");
  });

  test("does not add installation, repair, haul or a zone factor", () => {
    const serialized = JSON.stringify({
      formulas: WOODEN_PARTITION_DEMOLITION_KRER46_FORMULAS,
      resources: WOODEN_PARTITION_DEMOLITION_KRER46_RESOURCES,
    });
    expect(serialized).not.toMatch(
      /partition_install|partition_repair|wall_repair|landfill|truck|area_factor/iu,
    );
  });
});
