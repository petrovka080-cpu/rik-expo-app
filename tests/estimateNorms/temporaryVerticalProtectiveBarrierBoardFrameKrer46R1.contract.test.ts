import {
  TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_ACCEPTANCE_INPUT,
  TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_ARTIFACT_SHA256,
  TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_CATALOG_IDS,
  TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_FORMULAS,
  TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_PARAMETERS,
  TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_PROFILE_ID,
  TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_RESOURCES,
  TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SHORT_INPUT,
  TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SOURCE_METADATA,
  TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_VARIANTS,
  compileTemporaryVerticalProtectiveBarrierBoardFrameKrer46R1,
  resolveTemporaryVerticalProtectiveBarrierBoardFrameKrer46Variant,
  validateTemporaryVerticalProtectiveBarrierBoardFrameKrer46Completeness,
} from "../../src/lib/estimate/v4/temporaryVerticalProtectiveBarrierBoardFrameKrer46R1";

describe("KRER 46-05-001-03 temporary vertical protective barrier", () => {
  const expectedShort = [
    "100", "52.44", "0.19", "0.19", "0.56", "0.27", "0.0141", "0.003",
    "0.86", "0.25", "115",
  ];
  const expectedAcceptance = [
    "35.5", "18.6162", "0.06745", "0.06745", "0.1988", "0.09585",
    "0.0050055", "0.001065", "0.3053", "0.08875", "40.825",
  ];

  test("keeps the actual technologies and removes area-only identities", () => {
    expect(TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_CATALOG_IDS).toEqual([
      "canonical-work:master:temporary_vertical_protective_barrier_board_frame_standard",
      "canonical-work:master:temporary_vertical_protective_barrier_board_frame_wet_zone",
    ]);
    expect(TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_VARIANTS).not.toHaveProperty("small_area");
    expect(TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_VARIANTS).not.toHaveProperty("large_area");
  });

  test("binds only exact official rate column 46-05-001-03", () => {
    expect(TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_PROFILE_ID)
      .toBe("KRER_46_05_001_03_VERTICAL_BOARD_FRAME_FACING_ONE_ROOFING_FELT_LAYER");
    expect(TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SOURCE_METADATA.exact_locator)
      .toContain("46-05-001-03");
    expect(TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SOURCE_METADATA.artifact_sha256)
      .toBe(TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_ARTIFACT_SHA256);
  });

  test("has the exact three user parameters and eleven formulas/resources", () => {
    expect(TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_PARAMETERS).toHaveLength(3);
    expect(TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_FORMULAS).toHaveLength(11);
    expect(TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_RESOURCES).toHaveLength(11);
    expect(validateTemporaryVerticalProtectiveBarrierBoardFrameKrer46Completeness()).toBe(true);
  });

  test("preserves official codes and rates without resources dashed in column 03", () => {
    expect(TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_RESOURCES.map((row) => [
      row.source_metadata!.krerResourceCode,
      row.source_metadata!.normativeRatePer100M2,
    ])).toEqual([
      ["46-05-001-03", 100],
      ["000-1002-2", 52.44],
      ["KRER_AGGREGATE_MACHINIST_LABOR", 0.19],
      ["02-0075", 0.19],
      ["03-0160", 0.56],
      ["40-0001", 0.27],
      ["01-1110-0002", 0.0141],
      ["01-1113-0002", 0.003],
      ["01-6304-0075", 0.86],
      ["01-6304-0079", 0.25],
      ["01-7413-0001", 115],
    ]);
    const serialized = JSON.stringify(TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_RESOURCES);
    expect(serialized).not.toContain("01-4201-0027");
    expect(serialized).not.toContain("01-6901-0001");
    expect(serialized).not.toContain("10-0105-0001");
  });

  test("computes the exact per-100 m2 fixture", async () => {
    const result = await compileTemporaryVerticalProtectiveBarrierBoardFrameKrer46R1(
      { ...TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SHORT_INPUT },
    );
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.map((row) => row.quantity)).toEqual(expectedShort);
  });

  test("computes the exact 35.5 m2 acceptance fixture", async () => {
    const result = await compileTemporaryVerticalProtectiveBarrierBoardFrameKrer46R1(
      { ...TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_ACCEPTANCE_INPUT },
    );
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.map((row) => row.quantity)).toEqual(expectedAcceptance);
  });

  test("fails closed when applicability is missing", async () => {
    const result = await compileTemporaryVerticalProtectiveBarrierBoardFrameKrer46R1({
      barrier_vertical_area_m2: 100,
    });
    expect(result.rows).toEqual([]);
    expect(result.preliminaryNeeds).toHaveLength(11);
  });

  test("rejects a horizontal profile or explicit non-confirmation", async () => {
    await expect(compileTemporaryVerticalProtectiveBarrierBoardFrameKrer46R1({
      ...TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SHORT_INPUT,
      temporary_protective_barrier_profile:
        "KRER_46_05_001_02_HORIZONTAL_BEAMS_ON_LOG_POSTS_CONTINUOUS_BOARD_DECKING",
    })).rejects.toThrow("PROFILE_UNSUPPORTED");
    await expect(compileTemporaryVerticalProtectiveBarrierBoardFrameKrer46R1({
      ...TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_SHORT_INPUT,
      vertical_barrier_board_frame_confirmed: false,
    })).rejects.toThrow("PROFILE_NOT_CONFIRMED");
  });

  test("keeps machinist labor informational and machines payable", () => {
    const machinist = TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_RESOURCES[2]!;
    expect(machinist.resource_graph).toMatchObject({
      costTreatment: "INFORMATIONAL_SCOPE",
      payable: false,
    });
    for (const machine of TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_RESOURCES.slice(3, 6)) {
      expect(machine.resource_graph).toMatchObject({ costTreatment: "OWN_COST", payable: true });
      expect(machine.procurement_eligible).toBe(true);
    }
  });

  test("has an independently authored complete operation map", () => {
    expect(TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_INDEPENDENT_COMPLETENESS_MAP)
      .toMatchObject({
        rateTable: "KRER_46_05_001_03",
        generatedFromCurrentRows: false,
      });
    expect(TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(13);
    expect(TEMPORARY_VERTICAL_PROTECTIVE_BARRIER_BOARD_FRAME_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ operationId: "temporary_barrier_dismantling" }),
        expect.objectContaining({ operationId: "horizontal_temporary_protective_barrier" }),
      ]));
  });

  test("resolves all variants and rejects an unsupported key", () => {
    for (const key of ["standard", "wet_zone"] as const) {
      expect(resolveTemporaryVerticalProtectiveBarrierBoardFrameKrer46Variant(key).catalogId)
        .toContain(`_${key}`);
    }
    for (const key of ["large_area", "small_area", "bad"] as const) {
      expect(() => resolveTemporaryVerticalProtectiveBarrierBoardFrameKrer46Variant(key as never))
        .toThrow("VARIANT_UNSUPPORTED");
    }
  });
});
