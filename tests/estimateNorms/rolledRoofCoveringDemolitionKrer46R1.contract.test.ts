import {
  ROLLED_ROOF_COVERING_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  ROLLED_ROOF_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256,
  ROLLED_ROOF_COVERING_DEMOLITION_KRER46_CATALOG_ID,
  ROLLED_ROOF_COVERING_DEMOLITION_KRER46_CATALOG_IDS,
  ROLLED_ROOF_COVERING_DEMOLITION_KRER46_FORMULAS,
  ROLLED_ROOF_COVERING_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  ROLLED_ROOF_COVERING_DEMOLITION_KRER46_PARAMETERS,
  ROLLED_ROOF_COVERING_DEMOLITION_KRER46_RESOURCES,
  ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SHORT_INPUT,
  ROLLED_ROOF_COVERING_DEMOLITION_KRER46_VARIANTS,
  compileRolledRoofCoveringDemolitionKrer46R1,
  validateRolledRoofCoveringDemolitionKrer46Completeness,
} from "../../src/lib/estimate/v4/rolledRoofCoveringDemolitionKrer46R1";

describe("KRER 46 rolled-roof-covering demolition", () => {
  test("binds the exact official rate and narrow rolled-covering boundary", () => {
    expect(ROLLED_ROOF_COVERING_DEMOLITION_KRER46_CATALOG_ID)
      .toBe("canonical-work:base:demolition_interior_roof_layer_dismantle_standard");
    expect(ROLLED_ROOF_COVERING_DEMOLITION_KRER46_CATALOG_IDS).toHaveLength(2);
    expect(ROLLED_ROOF_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256)
      .toMatch(/^[0-9a-f]{64}$/u);
    expect(ROLLED_ROOF_COVERING_DEMOLITION_KRER46_PARAMETERS).toHaveLength(3);
    expect(ROLLED_ROOF_COVERING_DEMOLITION_KRER46_FORMULAS).toHaveLength(3);
    expect(ROLLED_ROOF_COVERING_DEMOLITION_KRER46_RESOURCES).toHaveLength(3);
    expect(validateRolledRoofCoveringDemolitionKrer46Completeness()).toBe(true);
    expect(ROLLED_ROOF_COVERING_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(6);
  });

  test("turns 100 m2 into the exact labor and electric-winch resources", async () => {
    const compiled = await compileRolledRoofCoveringDemolitionKrer46R1({
      ...ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SHORT_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toEqual([
      expect.objectContaining({ quantity: "100", unit_id: "m2" }),
      expect.objectContaining({ quantity: "14.38", unit_id: "man_hour" }),
      expect.objectContaining({ quantity: "6.22", unit_id: "machine_hour" }),
    ]);
    expect(compiled.rows.every((row) => row.unit_price == null && row.amount == null))
      .toBe(true);
  });

  test("scales only by confirmed net area", async () => {
    const compiled = await compileRolledRoofCoveringDemolitionKrer46R1({
      ...ROLLED_ROOF_COVERING_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
    });
    expect(compiled.rows.map((row) => row.quantity)).toEqual([
      "35.5",
      "5.1049",
      "2.2081",
    ]);
  });

  test.each(Object.entries(ROLLED_ROOF_COVERING_DEMOLITION_KRER46_VARIANTS))(
    "%s identity uses the same exact rate without a classification factor",
    async (_variantKey, variant) => {
      const compiled = await compileRolledRoofCoveringDemolitionKrer46R1(
        { ...ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SHORT_INPUT },
        { catalogId: variant.catalogId },
      );
      expect(compiled.revisionProjection.catalogId).toBe(variant.catalogId);
      expect(compiled.rows.map((row) => row.quantity)).toEqual([
        "100", "14.38", "6.22",
      ]);
      expect(compiled.preliminaryNeeds).toEqual([]);
    },
  );

  test("defers missing applicability and rejects wrong covering type or identity", async () => {
    const incomplete = await compileRolledRoofCoveringDemolitionKrer46R1({
      roof_covering_area_m2: 100,
    });
    expect(incomplete.rows).toEqual([]);
    expect(incomplete.preliminaryNeeds).toHaveLength(3);
    await expect(compileRolledRoofCoveringDemolitionKrer46R1({
      ...ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SHORT_INPUT,
      existing_rolled_roof_covering_confirmed: false,
    })).rejects.toThrow(
      "ROLLED_ROOF_COVERING_DEMOLITION_KRER46_ROOF_COVERING_TYPE_NOT_CONFIRMED",
    );
    await expect(compileRolledRoofCoveringDemolitionKrer46R1({
      ...ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SHORT_INPUT,
      existing_roof_covering_profile:
        "KRER_46_04_008_02_SHEET_STEEL_ROOF_COVERING",
    })).rejects.toThrow("ROLLED_ROOF_COVERING_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
    await expect(compileRolledRoofCoveringDemolitionKrer46R1(
      { ...ROLLED_ROOF_COVERING_DEMOLITION_KRER46_SHORT_INPUT },
      { catalogId: `${ROLLED_ROOF_COVERING_DEMOLITION_KRER46_CATALOG_ID}:other` },
    )).rejects.toThrow("ROLLED_ROOF_COVERING_DEMOLITION_KRER46_CATALOG_UNSUPPORTED");
  });

  test("does not add installation, repair, haul or a zone factor", () => {
    const serialized = JSON.stringify({
      formulas: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_FORMULAS,
      resources: ROLLED_ROOF_COVERING_DEMOLITION_KRER46_RESOURCES,
    });
    expect(serialized).not.toMatch(
      /roof_install|roof_repair|junction_repair|machinist_labor|landfill|truck|area_factor/iu,
    );
  });
});
