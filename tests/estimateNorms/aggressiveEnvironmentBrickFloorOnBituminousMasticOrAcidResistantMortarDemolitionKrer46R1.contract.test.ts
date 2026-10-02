import {
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_ARTIFACT_SHA256,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_CATALOG_ID,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_CATALOG_IDS,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_FORMULAS,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_PARAMETERS,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_RESOURCES,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SHORT_INPUT,
  AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_VARIANTS,
  compileAggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46R1,
  validateAggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46Completeness,
} from "../../src/lib/estimate/v4/aggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46R1";

describe("KRER 46 aggressive-environment brick-floor demolition", () => {
  test("owns four new catalog identities instead of overwriting an unrelated generic identity", () => {
    expect(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_CATALOG_ID)
      .toBe("canonical-work:master:demolition_aggressive_environment_brick_floor_bituminous_mastic_or_acid_resistant_mortar_standard");
    expect(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_CATALOG_IDS)
      .toHaveLength(4);
    expect(new Set(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_CATALOG_IDS).size)
      .toBe(4);
    expect(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_CATALOG_IDS.every((catalogId) =>
      catalogId.startsWith("canonical-work:master:"))).toBe(true);
  });

  test("binds the exact official resource composition", () => {
    expect(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_ARTIFACT_SHA256)
      .toMatch(/^[0-9a-f]{64}$/u);
    expect(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_PARAMETERS)
      .toHaveLength(3);
    expect(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_FORMULAS)
      .toHaveLength(5);
    expect(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_RESOURCES)
      .toHaveLength(5);
    expect(validateAggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46Completeness())
      .toBe(true);
    expect(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(8);
  });

  test("turns 100 m2 into the exact labor and pneumatic-tool resources", async () => {
    const compiled = await compileAggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SHORT_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.map((row) => [row.quantity, row.unit_id])).toEqual([
      ["100", "m2"],
      ["152.89", "man_hour"],
      ["1.91", "man_hour"],
      ["1.91", "machine_hour"],
      ["3.82", "machine_hour"],
    ]);
    expect(compiled.rows.every((row) => row.unit_price == null && row.amount == null)).toBe(true);
  });

  test("scales only by confirmed net covering area", async () => {
    const compiled = await compileAggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
    });
    expect(compiled.rows.map((row) => row.quantity)).toEqual([
      "35.5",
      "54.27595",
      "0.67805",
      "0.67805",
      "1.3561",
    ]);
  });

  test.each(Object.entries(AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_VARIANTS))(
    "%s identity uses the same exact rate without a classification factor",
    async (_variantKey, variant) => {
      const compiled = await compileAggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46R1(
        { ...AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SHORT_INPUT },
        { catalogId: variant.catalogId },
      );
      expect(compiled.revisionProjection.catalogId).toBe(variant.catalogId);
      expect(compiled.rows.map((row) => row.quantity)).toEqual([
        "100", "152.89", "1.91", "1.91", "3.82",
      ]);
    },
  );

  test("defers missing applicability and rejects the wrong technology", async () => {
    const incomplete = await compileAggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46R1({
      floor_covering_area_m2: 100,
    });
    expect(incomplete.rows).toEqual([]);
    expect(incomplete.preliminaryNeeds).toHaveLength(5);
    await expect(compileAggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SHORT_INPUT,
      existing_brick_floor_on_bituminous_mastic_or_acid_resistant_mortar_aggressive_environment_confirmed: false,
    })).rejects.toThrow("AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_MATERIAL_NOT_CONFIRMED");
    await expect(compileAggressiveEnvironmentBrickFloorOnBituminousMasticOrAcidResistantMortarDemolitionKrer46R1({
      ...AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_SHORT_INPUT,
      existing_aggressive_environment_brick_floor_on_bituminous_mastic_or_acid_resistant_mortar_profile:
        "KRER_46_04_011_06_OTHER_TILE",
    })).rejects.toThrow("AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
  });

  test("keeps adjacent floor work and offsite haul outside the exact rate", () => {
    const serialized = JSON.stringify({
      formulas: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_FORMULAS,
      resources: AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_RESOURCES,
    });
    expect(serialized).not.toMatch(/floor_install|floor_repair|ordinary_environment|offsite_waste_haul|truck_|area_factor/iu);
    expect(JSON.stringify(
      AGGRESSIVE_ENVIRONMENT_BRICK_FLOOR_ON_BITUMINOUS_MASTIC_OR_ACID_RESISTANT_MORTAR_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
    )).toMatch(/offsite_waste_haul/iu);
  });
});
