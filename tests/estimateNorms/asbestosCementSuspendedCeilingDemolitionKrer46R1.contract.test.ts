import {
  ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
  ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_ARTIFACT_SHA256,
  ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_CATALOG_ID,
  ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_CATALOG_IDS,
  ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_FORMULAS,
  ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_PARAMETERS,
  ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_RESOURCES,
  ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_SHORT_INPUT,
  ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_VARIANTS,
  compileAsbestosCementSuspendedCeilingDemolitionKrer46R1,
  validateAsbestosCementSuspendedCeilingDemolitionKrer46Completeness,
} from "../../src/lib/estimate/v4/asbestosCementSuspendedCeilingDemolitionKrer46R1";

describe("KRER 46 asbestos-cement suspended-ceiling demolition", () => {
  test("binds the exact official rate and narrow suspended-ceiling boundary", () => {
    expect(ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_CATALOG_ID)
      .toBe("canonical-work:base:demolition_interior_ceiling_remove_standard");
    expect(ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_CATALOG_IDS).toHaveLength(2);
    expect(ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_ARTIFACT_SHA256)
      .toMatch(/^[0-9a-f]{64}$/u);
    expect(ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_PARAMETERS).toHaveLength(3);
    expect(ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_FORMULAS).toHaveLength(4);
    expect(ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_RESOURCES).toHaveLength(4);
    expect(validateAsbestosCementSuspendedCeilingDemolitionKrer46Completeness()).toBe(true);
    expect(ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(9);
    expect(ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({
          operationId: "asbestos_hazard_control_plan",
          resolution: expect.objectContaining({ kind: "NOT_APPLICABLE" }),
        }),
        expect.objectContaining({
          operationId: "hazardous_asbestos_waste_packaging_transport_and_disposal",
          resolution: expect.objectContaining({ kind: "NOT_APPLICABLE" }),
        }),
      ]));
  });

  test("turns 100 m2 into the exact labor and lift resources", async () => {
    const compiled = await compileAsbestosCementSuspendedCeilingDemolitionKrer46R1({
      ...ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_SHORT_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toEqual([
      expect.objectContaining({ quantity: "100", unit_id: "m2" }),
      expect.objectContaining({ quantity: "112.62", unit_id: "man_hour" }),
      expect.objectContaining({ quantity: "2.2", unit_id: "man_hour" }),
      expect.objectContaining({ quantity: "2.2", unit_id: "machine_hour" }),
    ]);
    expect(compiled.rows.every((row) => row.unit_price == null && row.amount == null))
      .toBe(true);
  });

  test("scales only by confirmed net area", async () => {
    const compiled = await compileAsbestosCementSuspendedCeilingDemolitionKrer46R1({
      ...ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_ACCEPTANCE_INPUT,
    });
    expect(compiled.rows.map((row) => row.quantity)).toEqual([
      "35.5",
      "39.9801",
      "0.781",
      "0.781",
    ]);
  });

  test.each(Object.entries(ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_VARIANTS))(
    "%s identity uses the same exact rate without a classification factor",
    async (_variantKey, variant) => {
      const compiled = await compileAsbestosCementSuspendedCeilingDemolitionKrer46R1(
        { ...ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_SHORT_INPUT },
        { catalogId: variant.catalogId },
      );
      expect(compiled.revisionProjection.catalogId).toBe(variant.catalogId);
      expect(compiled.rows.map((row) => row.quantity)).toEqual([
        "100", "112.62", "2.2", "2.2",
      ]);
      expect(compiled.preliminaryNeeds).toEqual([]);
    },
  );

  test("defers missing applicability and rejects wrong ceiling type or identity", async () => {
    const incomplete = await compileAsbestosCementSuspendedCeilingDemolitionKrer46R1({
      ceiling_area_m2: 100,
    });
    expect(incomplete.rows).toEqual([]);
    expect(incomplete.preliminaryNeeds).toHaveLength(4);
    await expect(compileAsbestosCementSuspendedCeilingDemolitionKrer46R1({
      ...ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_SHORT_INPUT,
      existing_wooden_suspended_ceiling_asbestos_cement_panel_confirmed: false,
    })).rejects.toThrow("ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_CEILING_TYPE_NOT_CONFIRMED");
    await expect(compileAsbestosCementSuspendedCeilingDemolitionKrer46R1({
      ...ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_SHORT_INPUT,
      existing_suspended_ceiling_profile:
        "KRER_46_04_007_06_WOODEN_SUSPENDED_CEILING_AKMIGRAN_PANEL",
    })).rejects.toThrow("ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_PROFILE_UNSUPPORTED");
    await expect(compileAsbestosCementSuspendedCeilingDemolitionKrer46R1(
      { ...ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_SHORT_INPUT },
      { catalogId: `${ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_CATALOG_ID}:other` },
    )).rejects.toThrow("ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_CATALOG_UNSUPPORTED");
  });

  test("keeps safety controls and hazardous-waste routing visible but outside the exact rate", () => {
    const serialized = JSON.stringify({
      formulas: ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_FORMULAS,
      resources: ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_RESOURCES,
    });
    expect(serialized).not.toMatch(
      /ceiling_install|ceiling_repair|junction_repair|landfill|truck|area_factor/iu,
    );
    expect(serialized).not.toMatch(/asbestos_hazard_control|hazardous_asbestos_waste/iu);
    expect(JSON.stringify(
      ASBESTOS_CEMENT_SUSPENDED_CEILING_DEMOLITION_KRER46_INDEPENDENT_COMPLETENESS_MAP,
    )).toMatch(/asbestos_hazard_control_plan/iu);
  });
});
