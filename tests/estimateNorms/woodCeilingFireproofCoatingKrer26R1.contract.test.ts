import {
  WOOD_CEILING_FIREPROOF_COATING_KRER26_ACCEPTANCE_INPUT,
  WOOD_CEILING_FIREPROOF_COATING_KRER26_ARTIFACT_SHA256,
  WOOD_CEILING_FIREPROOF_COATING_KRER26_CATALOG_ID,
  WOOD_CEILING_FIREPROOF_COATING_KRER26_FORMULAS,
  WOOD_CEILING_FIREPROOF_COATING_KRER26_INDEPENDENT_COMPLETENESS_MAP,
  WOOD_CEILING_FIREPROOF_COATING_KRER26_PARAMETERS,
  WOOD_CEILING_FIREPROOF_COATING_KRER26_RESOURCES,
  WOOD_CEILING_FIREPROOF_COATING_KRER26_SOURCE_METADATA,
  compileWoodCeilingFireproofCoatingKrer26R1,
  validateWoodCeilingFireproofCoatingKrer26Completeness,
} from "../../src/lib/estimate/v4/woodCeilingFireproofCoatingKrer26R1";

describe("S27.3 F09 exact KRER 26 wooden-ceiling fireproof coating owner", () => {
  test("binds only protect-standard to exact E26-02-015-02", () => {
    expect(WOOD_CEILING_FIREPROOF_COATING_KRER26_CATALOG_ID)
      .toBe("canonical-work:base:special_repair_interior_fireproof_protect_standard");
    expect(WOOD_CEILING_FIREPROOF_COATING_KRER26_PARAMETERS).toHaveLength(1);
    expect(WOOD_CEILING_FIREPROOF_COATING_KRER26_FORMULAS).toHaveLength(7);
    expect(WOOD_CEILING_FIREPROOF_COATING_KRER26_RESOURCES).toHaveLength(7);
    expect(WOOD_CEILING_FIREPROOF_COATING_KRER26_SOURCE_METADATA).toMatchObject({
      artifact_sha256: WOOD_CEILING_FIREPROOF_COATING_KRER26_ARTIFACT_SHA256,
      source_kind: "OFFICIAL_KG_UNIT_RATE_AMENDMENT",
      effective_from: "2022-04-28",
    });
    expect(WOOD_CEILING_FIREPROOF_COATING_KRER26_SOURCE_METADATA.exact_locator)
      .toMatch(/Е26-02-015-02.*209.*100 м²/u);
  });

  test("100 m2 compiles exact labor, machines and paint quantities", async () => {
    const compiled = await compileWoodCeilingFireproofCoatingKrer26R1({
      ...WOOD_CEILING_FIREPROOF_COATING_KRER26_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.map((row) => ({ rowId: row.row_id, quantity: row.quantity })))
      .toEqual([
        { rowId: "f09:wood_ceiling_fireproof_coating_operation", quantity: "100" },
        { rowId: "f09:wood_ceiling_fireproof_coating_labor", quantity: "3.73" },
        { rowId: "f09:wood_ceiling_fireproof_machinist_labor_aggregate", quantity: "0.01" },
        { rowId: "f09:wood_ceiling_fireproof_forklift_1t", quantity: "0.002" },
        { rowId: "f09:wood_ceiling_fireproof_mast_lift_500kg", quantity: "0.004" },
        { rowId: "f09:wood_ceiling_fireproof_airless_unit_1kw", quantity: "1.8" },
        { rowId: "f09:wood_ceiling_fireproof_paint_evrika", quantity: "0.0412" },
      ]);
  });

  test("prevents duplicate pricing of operation and aggregate machinist labor", () => {
    const operation = WOOD_CEILING_FIREPROOF_COATING_KRER26_RESOURCES.find((row) =>
      row.row_id === "f09:wood_ceiling_fireproof_coating_operation");
    const machinists = WOOD_CEILING_FIREPROOF_COATING_KRER26_RESOURCES.find((row) =>
      row.row_id === "f09:wood_ceiling_fireproof_machinist_labor_aggregate");
    expect(operation?.resource_graph).toMatchObject({
      costTreatment: "INCLUDED_IN_RESOURCE_ROWS",
      payable: false,
      parentCostOwnerId: "f09:wood_ceiling_fireproof_coating_labor",
    });
    expect(machinists?.resource_graph).toMatchObject({
      costTreatment: "INFORMATIONAL_SCOPE",
      payable: false,
    });
  });

  test("independent completeness detects a missing exact-rate component", () => {
    expect(WOOD_CEILING_FIREPROOF_COATING_KRER26_INDEPENDENT_COMPLETENESS_MAP)
      .toMatchObject({ generatedFromCurrentRows: false, rateTable: "KRER_26_02_015_02" });
    expect(WOOD_CEILING_FIREPROOF_COATING_KRER26_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(7);
    expect(validateWoodCeilingFireproofCoatingKrer26Completeness()).toBe(true);
    expect(() => validateWoodCeilingFireproofCoatingKrer26Completeness(
      WOOD_CEILING_FIREPROOF_COATING_KRER26_RESOURCES.slice(1),
    )).toThrow("WOOD_CEILING_FIREPROOF_COATING_KRER26_COMPLETENESS_COUNT_MISMATCH");
  });

  test("rejects zero area and all neighboring fireproof identities", async () => {
    await expect(compileWoodCeilingFireproofCoatingKrer26R1({ wood_ceiling_area_m2: 0 }))
      .rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileWoodCeilingFireproofCoatingKrer26R1(
      { ...WOOD_CEILING_FIREPROOF_COATING_KRER26_ACCEPTANCE_INPUT },
      { catalogId: "canonical-work:base:special_repair_interior_fireproof_repair_standard" },
    )).rejects.toThrow("WOOD_CEILING_FIREPROOF_COATING_KRER26_CATALOG_UNSUPPORTED");
  });

  test("contains no cross-substrate or repair substitution", () => {
    const rows = JSON.stringify(WOOD_CEILING_FIREPROOF_COATING_KRER26_RESOURCES.map((row) => ({
      rowId: row.row_id,
      titleRu: row.title_ru,
      formulaId: row.formula_id,
    })));
    expect(rows).not.toMatch(
      /steel|concrete|reinforced|wall|cable|penetration|inject|repair|seal|strengthen|металл|бетон|стен|кабел|проходк|инъект|ремонт|гермет|усилен/iu,
    );
  });
});

test("the standard coating method rejects retired area identities without hidden factors", async () => {
  expect(JSON.stringify(WOOD_CEILING_FIREPROOF_COATING_KRER26_RESOURCES))
    .not.toMatch(/small_area_factor|minimum_area|mobilization_surcharge/iu);
  for (const catalogId of [
    "canonical-work:base:special_repair_interior_fireproof_protect_small_area",
    "canonical-work:base:special_repair_interior_fireproof_repair_small_area",
  ]) {
    await expect(compileWoodCeilingFireproofCoatingKrer26R1(
      { ...WOOD_CEILING_FIREPROOF_COATING_KRER26_ACCEPTANCE_INPUT }, { catalogId },
    )).rejects.toThrow("WOOD_CEILING_FIREPROOF_COATING_KRER26_CATALOG_UNSUPPORTED");
  }
});
