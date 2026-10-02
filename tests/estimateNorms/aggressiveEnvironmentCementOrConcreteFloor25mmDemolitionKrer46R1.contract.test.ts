import {
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_ARTIFACT_SHA256,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_CATALOG_ID,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_CATALOG_IDS,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_FORMULAS,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_PARAMETERS,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_RESOURCES,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SHORT_INPUT,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SOURCE_SUMMARY,
  AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_VARIANTS,
  compileAggressiveEnvironmentCementOrConcreteFloor25mmDemolitionKrer46R1,
  validateAggressiveEnvironmentCementOrConcreteFloor25mmDemolitionKrer46Completeness,
} from "../../src/lib/estimate/v4/aggressiveEnvironmentCementOrConcreteFloor25mmDemolitionKrer46R1";

describe("KRER 46-04-011-12 aggressive-environment 25 mm cement/concrete floor demolition", () => {
  test("owns four distinct appended identities", () => {
    expect(AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_CATALOG_ID)
      .toBe("canonical-work:master:demolition_aggressive_environment_cement_or_concrete_floor_25mm_standard");
    expect(AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_CATALOG_IDS)
      .toHaveLength(4);
    expect(new Set(AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_CATALOG_IDS).size)
      .toBe(4);
  });

  test("binds the exact column-12 resources and metadata", () => {
    expect(AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_ARTIFACT_SHA256)
      .toMatch(/^[0-9a-f]{64}$/u);
    expect(AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_PARAMETERS)
      .toHaveLength(3);
    expect(AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_FORMULAS)
      .toHaveLength(5);
    expect(AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_RESOURCES)
      .toHaveLength(5);
    expect(validateAggressiveEnvironmentCementOrConcreteFloor25mmDemolitionKrer46Completeness())
      .toBe(true);
    expect(AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_RESOURCES
      .map((resource) => [
        resource.source_metadata!.krerResourceCode,
        resource.source_metadata!.normativeRatePer100M2,
      ]))
      .toEqual([
        ["46-04-011-12", 100],
        ["000-1003-1", 28.54],
        ["KRER_AGGREGATE_MACHINIST_LABOR", 5.58],
        ["05-0005", 5.58],
        ["33-0384", 11.16],
      ]);
    const profileParameter = AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_PARAMETERS[1];
    expect(profileParameter.title_ru).toContain("цементного или бетонного покрытия");
    expect(profileParameter.truth_metadata.guide).toMatchObject({
      source_locator: expect.stringContaining("стр. 59–60"),
      applicability: expect.stringContaining("колонка 12"),
    });
  });

  test("turns 100 m2 into exact labor and pneumatic-tool resources", async () => {
    const compiled = await compileAggressiveEnvironmentCementOrConcreteFloor25mmDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SHORT_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.map((row) => [row.quantity, row.unit_id])).toEqual([
      ["100", "m2"],
      ["28.54", "man_hour"],
      ["5.58", "man_hour"],
      ["5.58", "machine_hour"],
      ["11.16", "machine_hour"],
    ]);
    expect(compiled.rows.every((row) => row.unit_price == null && row.amount == null)).toBe(true);
  });

  test("scales only by confirmed net covering area", async () => {
    const compiled = await compileAggressiveEnvironmentCementOrConcreteFloor25mmDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
    });
    expect(compiled.rows.map((row) => row.quantity)).toEqual([
      "35.5", "10.1317", "1.9809", "1.9809", "3.9618",
    ]);
  });

  test.each(Object.entries(AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_VARIANTS))(
    "%s identity keeps the exact rate without a classification factor",
    async (_variantKey, variant) => {
      const compiled = await compileAggressiveEnvironmentCementOrConcreteFloor25mmDemolitionKrer46R1(
        { ...AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SHORT_INPUT },
        { catalogId: variant.catalogId },
      );
      expect(compiled.revisionProjection.catalogId).toBe(variant.catalogId);
      expect(compiled.rows.map((row) => row.quantity)).toEqual([
        "100", "28.54", "5.58", "5.58", "11.16",
      ]);
    },
  );

  test("defers missing applicability and rejects another material profile", async () => {
    const incomplete = await compileAggressiveEnvironmentCementOrConcreteFloor25mmDemolitionKrer46R1({
      floor_covering_area_m2: 100,
    });
    expect(incomplete.rows).toEqual([]);
    expect(incomplete.preliminaryNeeds).toHaveLength(5);
    await expect(compileAggressiveEnvironmentCementOrConcreteFloor25mmDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SHORT_INPUT,
      existing_cement_or_concrete_floor_25mm_aggressive_environment_confirmed: false,
    })).rejects.toThrow("AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_MATERIAL_NOT_CONFIRMED");
    await expect(compileAggressiveEnvironmentCementOrConcreteFloor25mmDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SHORT_INPUT,
      existing_aggressive_environment_cement_or_concrete_floor_25mm_profile:
        "KRER_46_04_011_11_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_AGGRESSIVE_ENVIRONMENT",
    })).rejects.toThrow("AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
  });

  test("keeps cleanup reviewed and rate 13 separate from the base rate", () => {
    const cleanup = AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries
      .find((entry) => entry.operationId === "clean_salvageable_brick_from_mortar");
    expect(cleanup).toMatchObject({
      detailPrinciple: "REVIEWED_EXCLUSION",
      priceRelation: "NOT_APPLICABLE",
      resolution: { kind: "NOT_APPLICABLE" },
    });
    expect(AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(8);
    expect(AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_SOURCE_SUMMARY)
      .toMatchObject({ exactRate: "46-04-011-12", thicknessAdjustmentRateIncluded: false });
  });

  test("contains no column-11 composition-floor quantity residue", () => {
    const serialized = JSON.stringify({
      parameters: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_PARAMETERS,
      formulas: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_FORMULAS,
      resources: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_RESOURCES,
      completeness: AGGRESSIVE_ENVIRONMENT_CEMENT_OR_CONCRETE_FLOOR_25MM_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
    });
    expect(serialized).not.toMatch(/polymer_cement_or_epoxy|полимерцемент|эпоксидн|колонк[аи] 11|46[-_]04[-_]011[-_]11|"normativeRatePer100M2":(?:5\.27|1\.1|2\.2)/iu);
    expect(serialized).toMatch(/cement_or_concrete|46[-_]04[-_]011[-_]12|28[.,]54|000-1003-1|grade_3_1/iu);
    expect(serialized).not.toMatch(/floor_install|floor_repair|ordinary_environment|truck_|classification_factor|minimum_area|mobilization_surcharge/iu);
  });
});
