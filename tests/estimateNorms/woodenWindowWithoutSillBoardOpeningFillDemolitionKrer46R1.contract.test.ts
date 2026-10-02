import {
  WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_ARTIFACT_SHA256,
  WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_CATALOG_ID,
  WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_CATALOG_IDS,
  WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_FORMULAS,
  WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_PARAMETERS,
  WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_PROFILE_ID,
  WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_RESOURCES,
  WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SOURCE_METADATA,
  WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SHORT_INPUT,
  WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_VARIANTS,
  compileWoodenWindowWithoutSillBoardFillDemolitionKrer46R1,
  validateWoodenWindowWithoutSillBoardFillDemolitionKrer46Completeness,
} from "../../src/lib/estimate/v4/woodenWindowWithoutSillBoardOpeningFillDemolitionKrer46R1";

describe("KRER 46 wooden window opening-fill demolition without sill board", () => {
  test("binds the exact official rate and narrow window-fill boundary", () => {
    expect(WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_CATALOG_ID)
      .toBe("canonical-work:master:demolition_wooden_window_without_sill_board_opening_fill_standard");
    expect(WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_CATALOG_IDS).toHaveLength(4);
    expect(WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_ARTIFACT_SHA256)
      .toMatch(/^[0-9a-f]{64}$/u);
    expect(WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_PARAMETERS).toHaveLength(3);
    expect(WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_FORMULAS).toHaveLength(4);
    expect(WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_RESOURCES).toHaveLength(4);
    expect(validateWoodenWindowWithoutSillBoardFillDemolitionKrer46Completeness()).toBe(true);
    expect(WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(6);
  });

  test("turns 100 m2 into the exact labor and lift resources", async () => {
    const compiled = await compileWoodenWindowWithoutSillBoardFillDemolitionKrer46R1({
      ...WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SHORT_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toEqual([
      expect.objectContaining({ quantity: "100", unit_id: "m2" }),
      expect.objectContaining({ quantity: "172.76", unit_id: "man_hour" }),
      expect.objectContaining({ quantity: "7.74", unit_id: "man_hour" }),
      expect.objectContaining({ quantity: "7.74", unit_id: "machine_hour" }),
    ]);
    expect(compiled.rows.every((row) => row.unit_price == null && row.amount == null))
      .toBe(true);
  });

  test("scales only by confirmed net area", async () => {
    const compiled = await compileWoodenWindowWithoutSillBoardFillDemolitionKrer46R1({
      ...WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
    });
    expect(compiled.rows.map((row) => row.quantity)).toEqual([
      "35.5",
      "61.3298",
      "2.7477",
      "2.7477",
    ]);
  });

  test("keeps the without-sill rate distinct from adjacent column 01", () => {
    expect(WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_PROFILE_ID)
      .toBe("KRER_46_04_012_02_WOODEN_WINDOW_WITHOUT_SILL_BOARD");
    expect(WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SOURCE_METADATA.use_restriction)
      .toContain("без подоконной доски");
    expect(Object.values(WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_VARIANTS)
      .every((variant) => variant.canonicalNameRu.includes("без подоконной доски"))).toBe(true);
    for (const resource of WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_RESOURCES) {
      expect(resource.row_id).toContain("without_sill_board");
      expect(resource.source_metadata).toEqual(expect.objectContaining({
        normativeRatePer100M2: expect.any(Number),
      }));
      expect(JSON.stringify(resource.source_metadata)).toContain("46-04-012-02");
      expect(resource.formula_id).not.toContain("46_04_012_01");
    }
  });

  test.each(Object.entries(WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_VARIANTS))(
    "%s identity uses the same exact rate without a classification factor",
    async (_variantKey, variant) => {
      const compiled = await compileWoodenWindowWithoutSillBoardFillDemolitionKrer46R1(
        { ...WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SHORT_INPUT },
        { catalogId: variant.catalogId },
      );
      expect(compiled.revisionProjection.catalogId).toBe(variant.catalogId);
      expect(compiled.rows.map((row) => row.quantity)).toEqual([
        "100", "172.76", "7.74", "7.74",
      ]);
      expect(compiled.preliminaryNeeds).toEqual([]);
    },
  );

  test("defers missing applicability and rejects wrong material or identity", async () => {
    const incomplete = await compileWoodenWindowWithoutSillBoardFillDemolitionKrer46R1({
      opening_fill_area_m2: 100,
    });
    expect(incomplete.rows).toEqual([]);
    expect(incomplete.preliminaryNeeds).toHaveLength(4);
    await expect(compileWoodenWindowWithoutSillBoardFillDemolitionKrer46R1({
      ...WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SHORT_INPUT,
      existing_wooden_window_without_sill_board_confirmed: false,
    })).rejects.toThrow("WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_MATERIAL_NOT_CONFIRMED");
    await expect(compileWoodenWindowWithoutSillBoardFillDemolitionKrer46R1({
      ...WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SHORT_INPUT,
      existing_opening_fill_profile: "KRER_46_04_012_02_WOODEN_WINDOW_WITH_SILL",
    })).rejects.toThrow("WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
    await expect(compileWoodenWindowWithoutSillBoardFillDemolitionKrer46R1(
      { ...WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_SHORT_INPUT },
      { catalogId: `${WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_CATALOG_ID}:other` },
    )).rejects.toThrow("WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_CATALOG_UNSUPPORTED");
  });

  test("does not add new windows, opening repair, haul or a zone factor", () => {
    const serialized = JSON.stringify({
      formulas: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_FORMULAS,
      resources: WOODEN_WINDOW_WITHOUT_SILL_BOARD_FILL_DEMOLITION_KRER46_RESOURCES,
    });
    expect(serialized).not.toMatch(
      /new_window|opening_repair|slope_restoration|landfill|truck|area_factor/iu,
    );
  });
});
