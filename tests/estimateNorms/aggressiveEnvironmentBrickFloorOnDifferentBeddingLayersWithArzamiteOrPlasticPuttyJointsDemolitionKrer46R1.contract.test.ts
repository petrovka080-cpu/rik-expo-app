import {
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_ARTIFACT_SHA256,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_CATALOG_ID,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_CATALOG_IDS,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_FORMULAS,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_PARAMETERS,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_RESOURCES,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_SHORT_INPUT,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_VARIANTS,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_CATALOG_IDS,
  compileAggressiveEnvironmentBrickFloorOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsDemolitionKrer46R1,
  validateAggressiveEnvironmentBrickFloorOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsDemolitionKrer46Completeness,
} from "../../src/lib/estimate/v4/aggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46R1";

describe("KRER 46-04-011-10 aggressive-environment brick-floor demolition", () => {
  test("owns four distinct appended identities", () => {
    expect(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_CATALOG_ID)
      .toBe("canonical-work:master:demolition_aggressive_environment_brick_floor_different_bedding_layers_with_arzamite_or_plastic_putty_joints_standard");
    expect(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_CATALOG_IDS)
      .toHaveLength(4);
    expect(new Set(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_CATALOG_IDS).size)
      .toBe(4);
    expect(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_CATALOG_IDS
      .some((catalogId) => AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_DEMOLITION_KRER46_CATALOG_IDS.includes(catalogId as never)))
      .toBe(false);
  });

  test("binds the exact two-row column-10 composition", () => {
    expect(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_ARTIFACT_SHA256)
      .toMatch(/^[0-9a-f]{64}$/u);
    expect(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_PARAMETERS)
      .toHaveLength(3);
    expect(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_FORMULAS)
      .toHaveLength(2);
    expect(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_RESOURCES)
      .toHaveLength(2);
    expect(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_RESOURCES
      .map((resource) => [
        resource.source_metadata!.krerResourceCode,
        resource.source_metadata!.normativeRatePer100M2,
      ]))
      .toEqual([
        ["46-04-011-10", 100],
        ["000-1003-1", 67.1],
      ]);
    expect(validateAggressiveEnvironmentBrickFloorOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsDemolitionKrer46Completeness())
      .toBe(true);
    expect(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(5);
  });

  test("turns 100 m2 into the exact operation and labor only", async () => {
    const compiled = await compileAggressiveEnvironmentBrickFloorOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_SHORT_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.map((row) => [row.quantity, row.unit_id])).toEqual([
      ["100", "m2"],
      ["67.1", "man_hour"],
    ]);
    expect(compiled.rows.every((row) => row.unit_price == null && row.amount == null)).toBe(true);
  });

  test("scales only by confirmed net covering area", async () => {
    const compiled = await compileAggressiveEnvironmentBrickFloorOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
    });
    expect(compiled.rows.map((row) => row.quantity)).toEqual(["35.5", "23.8205"]);
  });

  test.each(Object.entries(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_VARIANTS))(
    "%s identity keeps the exact rate without a classification factor",
    async (_variantKey, variant) => {
      const compiled = await compileAggressiveEnvironmentBrickFloorOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsDemolitionKrer46R1(
        { ...AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_SHORT_INPUT },
        { catalogId: variant.catalogId },
      );
      expect(compiled.revisionProjection.catalogId).toBe(variant.catalogId);
      expect(compiled.rows.map((row) => row.quantity)).toEqual(["100", "67.1"]);
    },
  );

  test("defers missing applicability and rejects column 09", async () => {
    const incomplete = await compileAggressiveEnvironmentBrickFloorOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsDemolitionKrer46R1({
      floor_covering_area_m2: 100,
    });
    expect(incomplete.rows).toEqual([]);
    expect(incomplete.preliminaryNeeds).toHaveLength(2);
    await expect(compileAggressiveEnvironmentBrickFloorOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_SHORT_INPUT,
      existing_brick_floor_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_aggressive_environment_confirmed: false,
    })).rejects.toThrow("AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_MATERIAL_NOT_CONFIRMED");
    await expect(compileAggressiveEnvironmentBrickFloorOnDifferentBeddingLayersWithArzamiteOrPlasticPuttyJointsDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_SHORT_INPUT,
      existing_aggressive_environment_brick_floor_on_different_bedding_layers_with_arzamite_or_plastic_putty_joints_profile:
        "KRER_46_04_011_09_BRICK_ON_SULFUR_CEMENT_OR_PLASTIC_OR_ARZAMITE_PUTTY_AGGRESSIVE_ENVIRONMENT",
    })).rejects.toThrow("AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
  });

  test("contains no column-09 bedding, machines or quantity residue", () => {
    const serialized = JSON.stringify({
      parameters: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_PARAMETERS,
      formulas: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_FORMULAS,
      resources: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_RESOURCES,
      completeness: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_DIFFERENT_BEDDING_LAYERS_WITH_ARZAMITE_OR_PLASTIC_PUTTY_JOINTS_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
    });
    expect(serialized).not.toMatch(/sulfur_cement|46[-_]04[-_]011[-_]09|колонка 09|66[.,]10/iu);
    expect(serialized).toMatch(/46[-_]04[-_]011[-_]10|67[.,]10|000-1003-1|grade_3_1/iu);
    expect(serialized).not.toMatch(/machinist|compressor|pneumatic_breaker|05-0005|33-0384|1[.,]91|3[.,]82/iu);
    expect(serialized).not.toMatch(/floor_install|floor_repair|ordinary_environment|truck_|classification_factor|minimum_area|mobilization_surcharge/iu);
  });
});
