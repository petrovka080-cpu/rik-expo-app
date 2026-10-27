import {
  WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_ACCEPTANCE_INPUT,
  WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_ARTIFACT_SHA256,
  WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_CATALOG_ID,
  WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_FORMULAS,
  WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_INDEPENDENT_COMPLETENESS_MAP,
  WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_PARAMETERS,
  WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_RESOURCES,
  WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SHORT_INPUT,
  WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SOURCE_METADATA,
  compileWoodFireproofingQualityControlSpKr54R1,
  validateWoodFireproofingQualityControlSpKr54Completeness,
} from "../../src/lib/estimate/v4/woodFireproofingQualityControlSpKr54R1";

const ROW_IDS = [
  "f09:wood_fireproofing_controlled_area",
  "f09:wood_fireproofing_surface_condition_inspection",
  "f09:wood_fireproofing_application_technology_check",
  "f09:wood_fireproofing_qualitative_evaluation",
  "f09:wood_fireproofing_quality_control_protocol",
] as const;

describe("S27.3 F09 wood-fireproofing quality-control owner", () => {
  test("binds only test-standard to the official SP KR 54-101:2023 boundary", () => {
    expect(WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_CATALOG_ID)
      .toBe("canonical-work:base:special_repair_interior_fireproof_test_standard");
    expect(WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_PARAMETERS).toHaveLength(5);
    expect(WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_FORMULAS).toHaveLength(5);
    expect(WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_RESOURCES).toHaveLength(5);
    expect(WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_RESOURCES.map((row) => row.row_id))
      .toEqual(ROW_IDS);
    expect(WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SOURCE_METADATA).toMatchObject({
      artifact_sha256: WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_ARTIFACT_SHA256,
      source_kind: "OFFICIAL_NORMATIVE_TECHNICAL_BOUNDARY",
      effective_from: "2024-01-10",
    });
    expect(WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SOURCE_METADATA.exact_locator)
      .toMatch(/10\.24–10\.27.*80/iu);
  });

  test("known area emits only informational scope and four honest local needs", async () => {
    const compiled = await compileWoodFireproofingQualityControlSpKr54R1({
      ...WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual([
      expect.objectContaining({ row_id: ROW_IDS[0], quantity: "100", unit_id: "m2" }),
    ]);
    expect(compiled.preliminaryNeeds).toHaveLength(4);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id)).toEqual(ROW_IDS.slice(1));
    expect(WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_RESOURCES[0]?.resource_graph)
      .toMatchObject({
      costTreatment: "INFORMATIONAL_SCOPE",
      payable: false,
      });
  });

  test("full approved control-plan fixture emits direct quantities without hidden factors", async () => {
    const compiled = await compileWoodFireproofingQualityControlSpKr54R1({
      ...WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.map((row) => ({ rowId: row.row_id, quantity: row.quantity })))
      .toEqual([
        { rowId: ROW_IDS[0], quantity: "100" },
        { rowId: ROW_IDS[1], quantity: "5" },
        { rowId: ROW_IDS[2], quantity: "3" },
        { rowId: ROW_IDS[3], quantity: "5" },
        { rowId: ROW_IDS[4], quantity: "1" },
      ]);
    expect(WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_FORMULAS.map((formula) =>
      (formula as typeof formula & { expression_source: string }).expression_source))
      .toEqual(WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_PARAMETERS.map((parameter) =>
        parameter.parameter_id));
  });

  test("independent completeness detects a missing quality-control component", () => {
    expect(WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_INDEPENDENT_COMPLETENESS_MAP)
      .toMatchObject({
        sourceKind: "PROJECT_SYSTEM",
        generatedFromCurrentRows: false,
      });
    expect(WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(5);
    expect(validateWoodFireproofingQualityControlSpKr54Completeness()).toBe(true);
    expect(() => validateWoodFireproofingQualityControlSpKr54Completeness(
      WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_RESOURCES.slice(1),
    )).toThrow("WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_COMPLETENESS_COUNT_MISMATCH");
  });

  test("rejects invented zero counts and neighboring fireproof identities", async () => {
    await expect(compileWoodFireproofingQualityControlSpKr54R1({
      ...WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_ACCEPTANCE_INPUT,
      qualitative_evaluation_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileWoodFireproofingQualityControlSpKr54R1(
      { ...WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_ACCEPTANCE_INPUT },
      { catalogId: "canonical-work:base:special_repair_interior_fireproof_test_small_area" },
    )).rejects.toThrow("WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_CATALOG_UNSUPPORTED");
  });

  test("contains no application, repair, cross-substrate or hidden sampling rate", () => {
    const rows = JSON.stringify(WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_RESOURCES.map((row) => ({
      rowId: row.row_id,
      titleRu: row.title_ru,
      formulaId: row.formula_id,
    })));
    expect(rows).not.toMatch(
      /нанесение краски|ремонт|удаление|metal|concrete|cable|penetration|металл|бетон|кабел|проходк/iu,
    );
    expect(WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_FORMULAS)
      .not.toEqual(expect.arrayContaining([
        expect.objectContaining({ expression_source: expect.stringMatching(/[*/]|factor|норм/iu) }),
      ]));
    expect(WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_SOURCE_METADATA.use_restriction)
      .toMatch(/не задаёт универсальное число проверок/iu);
  });
});

test("the standard control method rejects retired area repair identities and invented sampling", async () => {
  expect(JSON.stringify(WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_RESOURCES))
    .not.toMatch(/small_area_factor|minimum_area|sampling_density|mobilization_surcharge/iu);
  await expect(compileWoodFireproofingQualityControlSpKr54R1(
    { ...WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_ACCEPTANCE_INPUT },
    { catalogId: "canonical-work:base:special_repair_interior_fireproof_repair_small_area" },
  )).rejects.toThrow("WOOD_FIREPROOFING_QUALITY_CONTROL_SP_KR54_CATALOG_UNSUPPORTED");
});
