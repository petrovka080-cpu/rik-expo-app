import {
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_ACCEPTANCE_INPUT,
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_ARTIFACT_SHA256,
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_CATALOG_ID,
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_CATALOG_IDS,
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_FORMULAS,
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_PARAMETERS,
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_PROFILE_ID,
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_RESOURCES,
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_SOURCE_METADATA,
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_SHORT_INPUT,
  TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_VARIANTS,
  compileTemporaryHorizontalProtectiveBarrierBeamsOnLogPostsKrer46R1,
  validateTemporaryHorizontalProtectiveBarrierBeamsOnLogPostsKrer46Completeness,
} from "../../src/lib/estimate/v4/temporaryHorizontalProtectiveBarrierBeamsOnLogPostsKrer46R1";

describe("KRER 46 temporary horizontal protective barrier on beams and log posts", () => {
  const expectedShort = [
    "100", "105.46", "0.49", "0.49", "1.47", "0.73", "0.016", "0.003",
    "1.5", "0.8", "1.43", "230", "0.0171",
  ];

  test("binds exact rate 46-05-001-02 and all official resources", () => {
    expect(TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_CATALOG_ID)
      .toBe("canonical-work:master:temporary_horizontal_protective_barrier_beams_on_log_posts_standard");
    expect(TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_CATALOG_IDS).toHaveLength(4);
    expect(TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_ARTIFACT_SHA256)
      .toMatch(/^[0-9a-f]{64}$/u);
    expect(TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_PARAMETERS).toHaveLength(3);
    expect(TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_FORMULAS).toHaveLength(13);
    expect(TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_RESOURCES).toHaveLength(13);
    expect(validateTemporaryHorizontalProtectiveBarrierBeamsOnLogPostsKrer46Completeness()).toBe(true);
    expect(TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(15);
    expect(TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_RESOURCES
      .map((resource) => resource.source_metadata!.krerResourceCode)).toEqual([
      "46-05-001-02", "000-1002-6", "KRER_AGGREGATE_MACHINIST_LABOR",
      "02-0075", "03-0160", "40-0001", "01-1110-0002", "01-1113-0002",
      "01-4201-0027", "01-6304-0075", "01-6304-0079", "01-7413-0001",
      "01-6901-0001",
    ]);
  });

  test("turns 100 m2 into exact labor, machines and materials", async () => {
    const compiled = await compileTemporaryHorizontalProtectiveBarrierBeamsOnLogPostsKrer46R1({
      ...TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_SHORT_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.map((row) => row.quantity)).toEqual(expectedShort);
    expect(compiled.rows.every((row) => row.unit_price == null && row.amount == null))
      .toBe(true);
  });

  test("scales only by confirmed horizontal projection area", async () => {
    const compiled = await compileTemporaryHorizontalProtectiveBarrierBeamsOnLogPostsKrer46R1({
      ...TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_ACCEPTANCE_INPUT,
    });
    expect(compiled.rows.map((row) => row.quantity)).toEqual([
      "35.5",
      "37.4383",
      "0.17395",
      "0.17395",
      "0.52185",
      "0.25915",
      "0.00568",
      "0.001065",
      "0.5325",
      "0.284",
      "0.50765",
      "81.65",
      "0.0060705",
    ]);
  });

  test("keeps rate 02 distinct from lower-truss and vertical barriers", () => {
    expect(TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_PROFILE_ID)
      .toBe("KRER_46_05_001_02_HORIZONTAL_BEAMS_ON_LOG_POSTS_CONTINUOUS_BOARD_DECKING");
    expect(TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_SOURCE_METADATA.use_restriction)
      .toContain("балкам на стойках из брёвен");
    expect(Object.values(TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_VARIANTS)
      .every((variant) => variant.canonicalNameRu.includes("балкам на стойках из брёвен"))).toBe(true);
    for (const resource of TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_RESOURCES) {
      expect(resource.row_id).toContain("temporary_horizontal_protective_barrier_beams_on_log_posts");
      expect(resource.source_metadata).toEqual(expect.objectContaining({
        normativeRatePer100M2: expect.any(Number),
      }));
      expect(JSON.stringify(resource.source_metadata)).toContain("46-05-001-02");
      expect(resource.formula_id).not.toMatch(/46_05_001_0[13]/u);
    }
  });

  test.each(Object.entries(TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_VARIANTS))(
    "%s identity uses the same exact rate without a classification factor",
    async (_variantKey, variant) => {
      const compiled = await compileTemporaryHorizontalProtectiveBarrierBeamsOnLogPostsKrer46R1(
        { ...TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_SHORT_INPUT },
        { catalogId: variant.catalogId },
      );
      expect(compiled.revisionProjection.catalogId).toBe(variant.catalogId);
      expect(compiled.rows.map((row) => row.quantity)).toEqual(expectedShort);
      expect(compiled.preliminaryNeeds).toEqual([]);
    },
  );

  test("defers missing applicability and rejects another barrier profile or identity", async () => {
    const incomplete = await compileTemporaryHorizontalProtectiveBarrierBeamsOnLogPostsKrer46R1({
      barrier_horizontal_projection_area_m2: 100,
    });
    expect(incomplete.rows).toEqual([]);
    expect(incomplete.preliminaryNeeds).toHaveLength(13);
    await expect(compileTemporaryHorizontalProtectiveBarrierBeamsOnLogPostsKrer46R1({
      ...TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_SHORT_INPUT,
      horizontal_barrier_beams_on_log_posts_confirmed: false,
    })).rejects.toThrow("TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_PROFILE_NOT_CONFIRMED");
    await expect(compileTemporaryHorizontalProtectiveBarrierBeamsOnLogPostsKrer46R1({
      ...TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_SHORT_INPUT,
      temporary_protective_barrier_profile:
        "KRER_46_05_001_01_HORIZONTAL_LOWER_TRUSS_CHORDS_CONTINUOUS_BOARD_DECKING",
    })).rejects.toThrow("TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_PROFILE_UNSUPPORTED");
    await expect(compileTemporaryHorizontalProtectiveBarrierBeamsOnLogPostsKrer46R1(
      { ...TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_SHORT_INPUT },
      { catalogId: `${TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_CATALOG_ID}:other` },
    )).rejects.toThrow("TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_CATALOG_UNSUPPORTED");
  });

  test("does not invent reuse, recovery, area factors or adjacent rate formulas", () => {
    const serialized = JSON.stringify({
      formulas: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_FORMULAS,
      rowIds: TEMPORARY_HORIZONTAL_PROTECTIVE_BARRIER_BEAMS_ON_LOG_POSTS_KRER46_RESOURCES
        .map((resource) => resource.row_id),
    });
    expect(serialized).not.toMatch(
      /reuse_factor|recovery_credit|46_05_001_01|46_05_001_03|area_factor/iu,
    );
  });
});
