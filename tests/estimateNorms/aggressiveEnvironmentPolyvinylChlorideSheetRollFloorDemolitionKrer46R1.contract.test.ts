import {
  AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256,
  AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_CATALOG_ID,
  AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_CATALOG_IDS,
  AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_FORMULAS,
  AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_PARAMETERS,
  AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_RESOURCES,
  AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
  AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_SOURCE_SUMMARY,
  AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_VARIANTS,
  compileAggressiveEnvironmentPolyvinylChlorideSheetRollFloorDemolitionKrer46R1,
  validateAggressiveEnvironmentPolyvinylChlorideSheetRollFloorDemolitionKrer46Completeness,
} from "../../src/lib/estimate/v4/aggressiveEnvironmentPolyvinylChlorideSheetRollFloorDemolitionKrer46R1";

describe("KRER 46-04-011-14 aggressive-environment PVC sheet/roll floor demolition", () => {
  test("owns four distinct catalog identities", () => {
    expect(AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_CATALOG_ID)
      .toBe("canonical-work:master:demolition_aggressive_environment_polyvinyl_chloride_sheet_roll_floor_standard");
    expect(new Set(AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_CATALOG_IDS).size).toBe(4);
  });

  test("has exact 3/2/2 scope and official artifact provenance", () => {
    expect(validateAggressiveEnvironmentPolyvinylChlorideSheetRollFloorDemolitionKrer46Completeness()).toBe(true);
    expect([
      AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_PARAMETERS.length,
      AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_FORMULAS.length,
      AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_RESOURCES.length,
    ]).toEqual([3, 2, 2]);
    expect(AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_ARTIFACT_SHA256)
      .toBe("21815737ca4286d31aca56e2361fb1b87451ab16eecd466e2b52d3fd89507471");
  });

  test("compiles exact per-100-m2 operation and grade-2.0 labor rows", async () => {
    const compiled = await compileAggressiveEnvironmentPolyvinylChlorideSheetRollFloorDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.map((row) => row.quantity)).toEqual(["100", "33"]);
    expect(compiled.rows.map((row) => row.title_ru)).toEqual([
      "Разборка покрытия пола из поливинилхлоридных листовых рулонных материалов в агрессивной среде",
      "Труд рабочих-строителей среднего разряда 2,0",
    ]);
  });

  test("scales the acceptance area without a hidden factor", async () => {
    const compiled = await compileAggressiveEnvironmentPolyvinylChlorideSheetRollFloorDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
    });
    expect(compiled.rows.map((row) => row.quantity)).toEqual(["35.5", "11.715"]);
  });

  test.each(Object.entries(AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_VARIANTS))(
    "%s identity keeps the exact rate without machines",
    async (_variantKey, variant) => {
      const compiled = await compileAggressiveEnvironmentPolyvinylChlorideSheetRollFloorDemolitionKrer46R1(
        { ...AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_SHORT_INPUT },
        { catalogId: variant.catalogId },
      );
      expect(compiled.revisionProjection.catalogId).toBe(variant.catalogId);
      expect(compiled.rows.map((row) => row.quantity)).toEqual(["100", "33"]);
    },
  );

  test("defers missing applicability and rejects another material profile", async () => {
    const incomplete = await compileAggressiveEnvironmentPolyvinylChlorideSheetRollFloorDemolitionKrer46R1({
      floor_covering_area_m2: 100,
    });
    expect(incomplete.rows).toEqual([]);
    expect(incomplete.preliminaryNeeds).toHaveLength(2);
    await expect(compileAggressiveEnvironmentPolyvinylChlorideSheetRollFloorDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_SHORT_INPUT,
      existing_polyvinyl_chloride_sheet_roll_floor_aggressive_environment_confirmed: false,
    })).rejects.toThrow("AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_MATERIAL_NOT_CONFIRMED");
  });

  test("keeps cleanup reviewed and creates no machine row", () => {
    const cleanup = AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries
      .find((entry) => entry.operationId === "clean_salvageable_brick_from_mortar");
    expect(cleanup).toMatchObject({
      detailPrinciple: "REVIEWED_EXCLUSION",
      priceRelation: "NOT_APPLICABLE",
      resolution: { kind: "NOT_APPLICABLE" },
    });
    expect(AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(5);
    expect(AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_SOURCE_SUMMARY)
      .toMatchObject({ exactRate: "46-04-011-14", machineResourcesIncluded: false });
    expect(AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toContainEqual(expect.objectContaining({
        expectedResourceId: "required-resource:construction_labor_grade_2_0",
        operationId: "construction_labor_grade_2_0",
      }));
    expect(AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_RESOURCES)
      .toHaveLength(2);
  });

  test("contains no rate-12 cement/concrete or machine residue", () => {
    const serialized = JSON.stringify({
      parameters: AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_PARAMETERS,
      formulas: AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_FORMULAS,
      resources: AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_RESOURCES,
      completeness: AGGRESSIVE_ENVIRONMENT_POLYVINYL_CHLORIDE_SHEET_ROLL_FLOOR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
    });
    expect(serialized).not.toMatch(/cement_or_concrete|цементн|бетонн|25 мм|46[-_]04[-_]011[-_]12|28[.,]54|5[.,]58|11[.,]16|05-0005|33-0384|machinist|compressor|breaker/iu);
    expect(serialized).toMatch(/polyvinyl_chloride|поливинилхлоридн|46[-_]04[-_]011[-_]14|33(?:[.,]00)?|000-1002-0|grade_2_0/iu);
    expect(serialized).not.toMatch(/floor_install|floor_repair|ordinary_environment|truck_|classification_factor|minimum_area|mobilization_surcharge/iu);
  });
});
