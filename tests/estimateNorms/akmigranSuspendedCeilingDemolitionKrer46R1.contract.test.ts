import {
  AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_ARTIFACT_SHA256,
  AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_CATALOG_ID,
  AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_CATALOG_IDS,
  AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_FORMULAS,
  AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_PARAMETERS,
  AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_RESOURCES,
  AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SHORT_INPUT,
  AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_VARIANTS,
  compileAkmigranSuspendedCeilingDemolitionKrer46R1,
  validateAkmigranSuspendedCeilingDemolitionKrer46Completeness,
} from "../../src/lib/estimate/v4/akmigranSuspendedCeilingDemolitionKrer46R1";

describe("KRER 46 Akmigran suspended-ceiling demolition", () => {
  test("binds the exact official rate and narrow suspended-ceiling boundary", () => {
    expect(AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_CATALOG_ID)
      .toBe("canonical-work:base:demolition_interior_ceiling_dismantle_standard");
    expect(AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_CATALOG_IDS).toHaveLength(2);
    expect(AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_ARTIFACT_SHA256)
      .toMatch(/^[0-9a-f]{64}$/u);
    expect(AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_PARAMETERS).toHaveLength(3);
    expect(AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_FORMULAS).toHaveLength(4);
    expect(AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_RESOURCES).toHaveLength(4);
    expect(validateAkmigranSuspendedCeilingDemolitionKrer46Completeness()).toBe(true);
    expect(AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(8);
  });

  test("turns 100 m2 into the exact labor and lift resources", async () => {
    const compiled = await compileAkmigranSuspendedCeilingDemolitionKrer46R1({
      ...AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SHORT_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toEqual([
      expect.objectContaining({ quantity: "100", unit_id: "m2" }),
      expect.objectContaining({ quantity: "66.87", unit_id: "man_hour" }),
      expect.objectContaining({ quantity: "2.2", unit_id: "man_hour" }),
      expect.objectContaining({ quantity: "2.2", unit_id: "machine_hour" }),
    ]);
    expect(compiled.rows.every((row) => row.unit_price == null && row.amount == null))
      .toBe(true);
  });

  test("scales only by confirmed net area", async () => {
    const compiled = await compileAkmigranSuspendedCeilingDemolitionKrer46R1({
      ...AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
    });
    expect(compiled.rows.map((row) => row.quantity)).toEqual([
      "35.5",
      "23.73885",
      "0.781",
      "0.781",
    ]);
  });

  test.each(Object.entries(AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_VARIANTS))(
    "%s identity uses the same exact rate without a classification factor",
    async (_variantKey, variant) => {
      const compiled = await compileAkmigranSuspendedCeilingDemolitionKrer46R1(
        { ...AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SHORT_INPUT },
        { catalogId: variant.catalogId },
      );
      expect(compiled.revisionProjection.catalogId).toBe(variant.catalogId);
      expect(compiled.rows.map((row) => row.quantity)).toEqual([
        "100", "66.87", "2.2", "2.2",
      ]);
      expect(compiled.preliminaryNeeds).toEqual([]);
    },
  );

  test("defers missing applicability and rejects wrong ceiling type or identity", async () => {
    const incomplete = await compileAkmigranSuspendedCeilingDemolitionKrer46R1({
      ceiling_area_m2: 100,
    });
    expect(incomplete.rows).toEqual([]);
    expect(incomplete.preliminaryNeeds).toHaveLength(4);
    await expect(compileAkmigranSuspendedCeilingDemolitionKrer46R1({
      ...AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SHORT_INPUT,
      existing_wooden_suspended_ceiling_akmigran_panel_confirmed: false,
    })).rejects.toThrow("AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_CEILING_TYPE_NOT_CONFIRMED");
    await expect(compileAkmigranSuspendedCeilingDemolitionKrer46R1({
      ...AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SHORT_INPUT,
      existing_suspended_ceiling_profile:
        "KRER_46_04_007_05_WOODEN_SUSPENDED_CEILING_ASBESTOS_CEMENT_PANEL",
    })).rejects.toThrow("AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
    await expect(compileAkmigranSuspendedCeilingDemolitionKrer46R1(
      { ...AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_SHORT_INPUT },
      { catalogId: `${AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_CATALOG_ID}:other` },
    )).rejects.toThrow("AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_CATALOG_UNSUPPORTED");
  });

  test("does not add installation, repair, haul or a zone factor", () => {
    const serialized = JSON.stringify({
      formulas: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_FORMULAS,
      resources: AKMIGRAN_SUSPENDED_CEILING_DEMOLITION_KRER46_RESOURCES,
    });
    expect(serialized).not.toMatch(
      /ceiling_install|ceiling_repair|junction_repair|landfill|truck|area_factor/iu,
    );
  });
});
