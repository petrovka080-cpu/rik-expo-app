import {
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_CATALOG_IDS,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_ARTIFACT_SHA256,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_CATALOG_ID,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_CATALOG_IDS,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_FORMULAS,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_PARAMETERS,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_RESOURCES,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_SHORT_INPUT,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_VARIANTS,
  compileAggressiveEnvironmentBrickFloorOnCementAcidResistantMortarOrAcidResistantPuttyDemolitionKrer46R1,
  validateAggressiveEnvironmentBrickFloorOnCementAcidResistantMortarOrAcidResistantPuttyDemolitionKrer46Completeness,
} from "../../src/lib/estimate/v4/aggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46R1";

describe("KRER 46-04-011-08 aggressive-environment brick-floor demolition", () => {
  test("owns four distinct appended identities", () => {
    expect(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_CATALOG_ID)
      .toBe("canonical-work:master:demolition_aggressive_environment_brick_floor_cement_acid_resistant_mortar_or_acid_resistant_putty_standard");
    expect(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_CATALOG_IDS)
      .toHaveLength(4);
    expect(new Set(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_CATALOG_IDS).size)
      .toBe(4);
    expect(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_CATALOG_IDS
      .some((catalogId) => AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_CATALOG_IDS.includes(catalogId as never)))
      .toBe(false);
  });

  test("binds the exact column-08 composition", () => {
    expect(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_ARTIFACT_SHA256)
      .toMatch(/^[0-9a-f]{64}$/u);
    expect(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_PARAMETERS)
      .toHaveLength(3);
    expect(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_FORMULAS)
      .toHaveLength(5);
    expect(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_RESOURCES)
      .toHaveLength(5);
    expect(validateAggressiveEnvironmentBrickFloorOnCementAcidResistantMortarOrAcidResistantPuttyDemolitionKrer46Completeness())
      .toBe(true);
    expect(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(8);
  });

  test("turns 100 m2 into exact labor and pneumatic-tool resources", async () => {
    const compiled = await compileAggressiveEnvironmentBrickFloorOnCementAcidResistantMortarOrAcidResistantPuttyDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_SHORT_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.map((row) => [row.quantity, row.unit_id])).toEqual([
      ["100", "m2"],
      ["104.52", "man_hour"],
      ["1.91", "man_hour"],
      ["1.91", "machine_hour"],
      ["3.82", "machine_hour"],
    ]);
    expect(compiled.rows.every((row) => row.unit_price == null && row.amount == null)).toBe(true);
  });

  test("scales only by confirmed net covering area", async () => {
    const compiled = await compileAggressiveEnvironmentBrickFloorOnCementAcidResistantMortarOrAcidResistantPuttyDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
    });
    expect(compiled.rows.map((row) => row.quantity)).toEqual([
      "35.5", "37.1046", "0.67805", "0.67805", "1.3561",
    ]);
  });

  test.each(Object.entries(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_VARIANTS))(
    "%s identity keeps the exact rate without a classification factor",
    async (_variantKey, variant) => {
      const compiled = await compileAggressiveEnvironmentBrickFloorOnCementAcidResistantMortarOrAcidResistantPuttyDemolitionKrer46R1(
        { ...AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_SHORT_INPUT },
        { catalogId: variant.catalogId },
      );
      expect(compiled.revisionProjection.catalogId).toBe(variant.catalogId);
      expect(compiled.rows.map((row) => row.quantity)).toEqual([
        "100", "104.52", "1.91", "1.91", "3.82",
      ]);
    },
  );

  test("defers missing applicability and rejects column 07", async () => {
    const incomplete = await compileAggressiveEnvironmentBrickFloorOnCementAcidResistantMortarOrAcidResistantPuttyDemolitionKrer46R1({
      floor_covering_area_m2: 100,
    });
    expect(incomplete.rows).toEqual([]);
    expect(incomplete.preliminaryNeeds).toHaveLength(5);
    await expect(compileAggressiveEnvironmentBrickFloorOnCementAcidResistantMortarOrAcidResistantPuttyDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_SHORT_INPUT,
      existing_brick_floor_on_cement_acid_resistant_mortar_or_acid_resistant_putty_aggressive_environment_confirmed: false,
    })).rejects.toThrow("AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_MATERIAL_NOT_CONFIRMED");
    await expect(compileAggressiveEnvironmentBrickFloorOnCementAcidResistantMortarOrAcidResistantPuttyDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_SHORT_INPUT,
      existing_aggressive_environment_brick_floor_on_cement_acid_resistant_mortar_or_acid_resistant_putty_profile:
        "KRER_46_04_011_07_BRICK_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_AGGRESSIVE_ENVIRONMENT",
    })).rejects.toThrow("AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
  });

  test("contains no column-07 bedding, resource or quantity residue", () => {
    const serialized = JSON.stringify({
      parameters: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_PARAMETERS,
      formulas: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_FORMULAS,
      resources: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_RESOURCES,
      completeness: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_CEMENT_ACID_RESISTANT_MORTAR_OR_ACID_RESISTANT_PUTTY_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
    });
    expect(serialized).not.toMatch(/bituminous|46[-_]04[-_]011[-_]07|колонка 07|152[.,]89|000-1003-8|grade_3_8/iu);
    expect(serialized).toMatch(/46[-_]04[-_]011[-_]08|104[.,]52|000-1003-6|grade_3_6/iu);
    expect(serialized).not.toMatch(/floor_install|floor_repair|ordinary_environment|truck_|classification_factor|minimum_area|mobilization_surcharge/iu);
  });
});
