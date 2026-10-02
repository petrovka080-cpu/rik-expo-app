import {
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_ARTIFACT_SHA256,
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_CATALOG_ID,
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_CATALOG_IDS,
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_FORMULAS,
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_PARAMETERS,
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_RESOURCES,
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_SHORT_INPUT,
  AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_VARIANTS,
  compileAggressiveEnvironmentPolymerCementOrEpoxyCompositionFloor5mmDemolitionKrer46R1,
  validateAggressiveEnvironmentPolymerCementOrEpoxyCompositionFloor5mmDemolitionKrer46Completeness,
} from "../../src/lib/estimate/v4/aggressiveEnvironmentPolymerCementOrEpoxyCompositionFloor5mmDemolitionKrer46R1";

describe("KRER 46-04-011-11 aggressive-environment 5 mm composition-floor demolition", () => {
  test("owns four distinct appended identities", () => {
    expect(AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_CATALOG_ID)
      .toBe("canonical-work:master:demolition_aggressive_environment_polymer_cement_or_epoxy_composition_floor_5mm_standard");
    expect(AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_CATALOG_IDS)
      .toHaveLength(4);
    expect(new Set(AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_CATALOG_IDS).size)
      .toBe(4);
  });

  test("binds the exact column-11 composition and metadata", () => {
    expect(AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_ARTIFACT_SHA256)
      .toMatch(/^[0-9a-f]{64}$/u);
    expect(AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_PARAMETERS)
      .toHaveLength(3);
    expect(AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_FORMULAS)
      .toHaveLength(5);
    expect(AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_RESOURCES)
      .toHaveLength(5);
    expect(validateAggressiveEnvironmentPolymerCementOrEpoxyCompositionFloor5mmDemolitionKrer46Completeness())
      .toBe(true);
    expect(AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_RESOURCES
      .map((resource) => [
        resource.source_metadata!.krerResourceCode,
        resource.source_metadata!.normativeRatePer100M2,
      ]))
      .toEqual([
        ["46-04-011-11", 100],
        ["000-1003-1", 5.27],
        ["KRER_AGGREGATE_MACHINIST_LABOR", 1.1],
        ["05-0005", 1.1],
        ["33-0384", 2.2],
      ]);
  });

  test("turns 100 m2 into exact labor and pneumatic-tool resources", async () => {
    const compiled = await compileAggressiveEnvironmentPolymerCementOrEpoxyCompositionFloor5mmDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_SHORT_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.map((row) => [row.quantity, row.unit_id])).toEqual([
      ["100", "m2"],
      ["5.27", "man_hour"],
      ["1.1", "man_hour"],
      ["1.1", "machine_hour"],
      ["2.2", "machine_hour"],
    ]);
    expect(compiled.rows.every((row) => row.unit_price == null && row.amount == null)).toBe(true);
  });

  test("scales only by confirmed net covering area", async () => {
    const compiled = await compileAggressiveEnvironmentPolymerCementOrEpoxyCompositionFloor5mmDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
    });
    expect(compiled.rows.map((row) => row.quantity)).toEqual([
      "35.5", "1.87085", "0.3905", "0.3905", "0.781",
    ]);
  });

  test.each(Object.entries(AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_VARIANTS))(
    "%s identity keeps the exact rate without a classification factor",
    async (_variantKey, variant) => {
      const compiled = await compileAggressiveEnvironmentPolymerCementOrEpoxyCompositionFloor5mmDemolitionKrer46R1(
        { ...AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_SHORT_INPUT },
        { catalogId: variant.catalogId },
      );
      expect(compiled.revisionProjection.catalogId).toBe(variant.catalogId);
      expect(compiled.rows.map((row) => row.quantity)).toEqual([
        "100", "5.27", "1.1", "1.1", "2.2",
      ]);
    },
  );

  test("defers missing applicability and rejects another material profile", async () => {
    const incomplete = await compileAggressiveEnvironmentPolymerCementOrEpoxyCompositionFloor5mmDemolitionKrer46R1({
      floor_covering_area_m2: 100,
    });
    expect(incomplete.rows).toEqual([]);
    expect(incomplete.preliminaryNeeds).toHaveLength(5);
    await expect(compileAggressiveEnvironmentPolymerCementOrEpoxyCompositionFloor5mmDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_SHORT_INPUT,
      existing_polymer_cement_or_epoxy_composition_floor_5mm_aggressive_environment_confirmed: false,
    })).rejects.toThrow("AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_MATERIAL_NOT_CONFIRMED");
    await expect(compileAggressiveEnvironmentPolymerCementOrEpoxyCompositionFloor5mmDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_SHORT_INPUT,
      existing_aggressive_environment_polymer_cement_or_epoxy_composition_floor_5mm_profile:
        "KRER_46_04_011_10_BRICK_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_AGGRESSIVE_ENVIRONMENT",
    })).rejects.toThrow("AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
  });

  test("marks tile-or-brick cleaning inapplicable instead of inventing a row", () => {
    const cleanup = AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries
      .find((entry) => entry.operationId === "clean_salvageable_brick_from_mortar");
    expect(cleanup).toMatchObject({
      detailPrinciple: "REVIEWED_EXCLUSION",
      priceRelation: "NOT_APPLICABLE",
      resolution: { kind: "NOT_APPLICABLE" },
    });
    expect(AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(8);
  });

  test("contains no column-08 brick-floor or quantity residue", () => {
    const serialized = JSON.stringify({
      parameters: AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_PARAMETERS,
      formulas: AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_FORMULAS,
      resources: AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_RESOURCES,
      completeness: AGGRESSIVE_ENVIRONMENT_POLYMER_CEMENT_OR_EPOXY_COMPOSITION_FLOOR_5MM_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
    });
    expect(serialized).not.toMatch(/brick_floor|46[-_]04[-_]011[-_]08|колонка 08|104[.,]52|000-1003-6|grade_3_6/iu);
    expect(serialized).toMatch(/polymer_cement_or_epoxy|46[-_]04[-_]011[-_]11|5[.,]27|000-1003-1|grade_3_1/iu);
    expect(serialized).not.toMatch(/floor_install|floor_repair|ordinary_environment|truck_|classification_factor|minimum_area|mobilization_surcharge/iu);
  });
});
