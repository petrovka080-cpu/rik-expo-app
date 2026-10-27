import {
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256,
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_CATALOG_ID,
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_CATALOG_IDS,
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_FORMULAS,
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_PARAMETERS,
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_RESOURCES,
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SHORT_INPUT,
  ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_VARIANTS,
  compileAsphaltFloorCoveringDemolitionKrer46R1,
  validateAsphaltFloorCoveringDemolitionKrer46Completeness,
} from "../../src/lib/estimate/v4/asphaltFloorCoveringDemolitionKrer46R1";

describe("KRER 46 asphalt floor-covering demolition", () => {
  test("binds the exact official rate and narrow asphalt floor-covering boundary", () => {
    expect(ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_CATALOG_ID)
      .toBe("canonical-work:base:demolition_interior_flooring_dismantle_standard");
    expect(ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_CATALOG_IDS).toHaveLength(2);
    expect(ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_ARTIFACT_SHA256)
      .toMatch(/^[0-9a-f]{64}$/u);
    expect(ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_PARAMETERS).toHaveLength(3);
    expect(ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_FORMULAS).toHaveLength(5);
    expect(ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_RESOURCES).toHaveLength(5);
    expect(validateAsphaltFloorCoveringDemolitionKrer46Completeness()).toBe(true);
    expect(ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(7);
    expect(ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({
          operationId: "internal_debris_handling_within_object",
          resolution: expect.objectContaining({ kind: "INCLUDED_IN_PARENT" }),
        }),
        expect.objectContaining({
          operationId: "offsite_waste_haul",
          resolution: expect.objectContaining({ kind: "NOT_APPLICABLE" }),
        }),
      ]));
  });

  test("turns 100 m2 into the exact labor and pneumatic-tool resources", async () => {
    const compiled = await compileAsphaltFloorCoveringDemolitionKrer46R1({
      ...ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SHORT_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toEqual([
      expect.objectContaining({ quantity: "100", unit_id: "m2" }),
      expect.objectContaining({ quantity: "23.78", unit_id: "man_hour" }),
      expect.objectContaining({ quantity: "4.71", unit_id: "man_hour" }),
      expect.objectContaining({ quantity: "4.71", unit_id: "machine_hour" }),
      expect.objectContaining({ quantity: "9.42", unit_id: "machine_hour" }),
    ]);
    expect(compiled.rows.every((row) => row.unit_price == null && row.amount == null))
      .toBe(true);
  });

  test("scales only by confirmed net floor-covering area", async () => {
    const compiled = await compileAsphaltFloorCoveringDemolitionKrer46R1({
      ...ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
    });
    expect(compiled.rows.map((row) => row.quantity)).toEqual([
      "35.5",
      "8.4419",
      "1.67205",
      "1.67205",
      "3.3441",
    ]);
  });

  test.each(Object.entries(ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_VARIANTS))(
    "%s identity uses the same exact rate without a classification factor",
    async (_variantKey, variant) => {
      const compiled = await compileAsphaltFloorCoveringDemolitionKrer46R1(
        { ...ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SHORT_INPUT },
        { catalogId: variant.catalogId },
      );
      expect(compiled.revisionProjection.catalogId).toBe(variant.catalogId);
      expect(compiled.rows.map((row) => row.quantity)).toEqual([
        "100", "23.78", "4.71", "4.71", "9.42",
      ]);
      expect(compiled.preliminaryNeeds).toEqual([]);
    },
  );

  test("defers missing applicability and rejects wrong floor-covering type or identity", async () => {
    const incomplete = await compileAsphaltFloorCoveringDemolitionKrer46R1({
      floor_covering_area_m2: 100,
    });
    expect(incomplete.rows).toEqual([]);
    expect(incomplete.preliminaryNeeds).toHaveLength(5);
    await expect(compileAsphaltFloorCoveringDemolitionKrer46R1({
      ...ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SHORT_INPUT,
      existing_asphalt_floor_covering_confirmed: false,
    })).rejects.toThrow("ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_FLOOR_COVERING_TYPE_NOT_CONFIRMED");
    await expect(compileAsphaltFloorCoveringDemolitionKrer46R1({
      ...ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SHORT_INPUT,
      existing_floor_covering_profile:
        "KRER_46_04_010_02_STONE_TILE_FLOOR_COVERING",
    })).rejects.toThrow("ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
    await expect(compileAsphaltFloorCoveringDemolitionKrer46R1(
      { ...ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_SHORT_INPUT },
      { catalogId: `${ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_CATALOG_ID}:other` },
    )).rejects.toThrow("ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_CATALOG_UNSUPPORTED");
  });

  test("keeps adjacent floor scopes and offsite haul outside the exact rate", () => {
    const serialized = JSON.stringify({
      formulas: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_FORMULAS,
      resources: ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_RESOURCES,
    });
    expect(serialized).not.toMatch(
      /floor_install|floor_repair|floor_base_krer|offsite_waste_haul|truck_|area_factor/iu,
    );
    expect(JSON.stringify(
      ASPHALT_FLOOR_COVERING_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
    )).toMatch(/offsite_waste_haul/iu);
  });});
