import {
  PIPE_BEDDING_BACKFILL_ACCEPTANCE_INPUT, PIPE_BEDDING_BACKFILL_CATALOG_ID,
  PIPE_BEDDING_BACKFILL_FORMULAS, PIPE_BEDDING_BACKFILL_PARAMETERS,
  PIPE_BEDDING_BACKFILL_RESOURCES, PIPE_BEDDING_BACKFILL_RUNTIME_INPUT,
  PIPE_BEDDING_BACKFILL_SHORT_INPUT, compilePipeBeddingBackfillR1,
} from "../../src/lib/estimate/v4/pipeBeddingBackfillR1";

describe("S27.24 pipe bedding and backfill owner", () => {
  test("replaces the whole-network template with an exact support-zone boundary", () => {
    expect(PIPE_BEDDING_BACKFILL_CATALOG_ID).toBe(
      "canonical-work:expanded:pipe_bedding_backfill",
    );
    expect(PIPE_BEDDING_BACKFILL_PARAMETERS).toHaveLength(42);
    expect(PIPE_BEDDING_BACKFILL_FORMULAS).toHaveLength(30);
    expect(PIPE_BEDDING_BACKFILL_RESOURCES).toHaveLength(30);
    expect(PIPE_BEDDING_BACKFILL_RUNTIME_INPUT).toEqual({
      pbb_bedding_retained_reserve_m3: 0, pbb_bedding_supplier_load_m3: 1,
    });
    expect(JSON.stringify(PIPE_BEDDING_BACKFILL_FORMULAS)).not.toMatch(
      /route_length_m\s*\*|ceil\(route_length|golden_rate|normFactor/iu,
    );
    expect(JSON.stringify(PIPE_BEDDING_BACKFILL_RESOURCES)).not.toMatch(
      /sewer_pipe_lm|inspection_manhole|hydraulic_testing_lm/iu,
    );
  });

  test("selected support-zone scope gives useful rows and local needs", async () => {
    const compiled = await compilePipeBeddingBackfillR1({ ...PIPE_BEDDING_BACKFILL_SHORT_INPUT });
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.preliminaryNeeds).toHaveLength(22);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:pbb_acceptance", quantity: "850" }),
      expect.objectContaining({ row_id: "rc09:pbb_bedding_surround", quantity: "180" }),
      expect.objectContaining({ row_id: "rc09:pbb-bedding-balance:installed-net", quantity: "180" }),
    ]));
  });

  test("compiles the twenty-seven-row project fixture", async () => {
    const compiled = await compilePipeBeddingBackfillR1({
      ...PIPE_BEDDING_BACKFILL_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(27);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:pbb_geotextile", quantity: "1100" }),
      expect.objectContaining({ row_id: "rc09:pbb_foundation_aggregate", quantity: "95" }),
      expect.objectContaining({ row_id: "rc09:pbb_selected_backfill", quantity: "620" }),
      expect.objectContaining({ row_id: "rc09:pbb_warning_tape", quantity: "880" }),
      expect.objectContaining({ row_id: "rc09:labor:pbb-material-placing", quantity: "520" }),
      expect.objectContaining({ row_id: "rc09:equipment:pbb-compactor", quantity: "120" }),
      expect.objectContaining({ row_id: "rc09:logistics:pbb-delivery", quantity: "58" }),
    ]));
  });

  test("separates installed material from supplier-load rounding", async () => {
    const compiled = await compilePipeBeddingBackfillR1({
      ...PIPE_BEDDING_BACKFILL_ACCEPTANCE_INPUT,
      pbb_bedding_retained_reserve_m3: 12, pbb_bedding_supplier_load_m3: 25,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:pbb-bedding-balance:installed-net")?.quantity).toBe("180");
    expect(rows.get("rc09:pbb-bedding-balance:retained-reserve")?.quantity).toBe("12");
    expect(rows.get("rc09:pbb-bedding-balance:total-need")?.quantity).toBe("192");
    expect(rows.get("rc09:pbb-bedding-balance:load-count")?.quantity).toBe("8");
    expect(rows.get("rc09:pbb_bedding_surround")?.quantity).toBe("200");
    expect(rows.get("rc09:pbb-bedding-balance:remainder")?.quantity).toBe("20");
    expect(rows.get("rc09:pbb-bedding-balance:surplus-beyond-reserve")?.quantity).toBe("8");
  });

  test("keeps acceptance and QA scope informational beside explicit labor", () => {
    for (const rowId of ["rc09:pbb_acceptance", "rc09:pbb_compaction_tests",
      "rc09:pbb_asbuilt_documents"]) {
      expect(PIPE_BEDDING_BACKFILL_RESOURCES.find((row) => row.row_id === rowId)
        ?.resource_graph).toEqual(expect.objectContaining({ costTreatment: "INFORMATIONAL_SCOPE" }));
    }
  });

  test("keeps replacement, dewatering and shoring conditional", async () => {
    const compiled = await compilePipeBeddingBackfillR1({
      ...PIPE_BEDDING_BACKFILL_ACCEPTANCE_INPUT,
      pbb_unsuitable_soil_replacement_mode: "REQUIRED",
      pbb_unsuitable_soil_replacement_designation: "Щебень 20-40 по геологии",
      pbb_unsuitable_soil_replacement_volume_m3: 140,
      pbb_dewatering_mode: "REQUIRED", pbb_dewatering_designation: "Дренажный насос по ППР",
      pbb_dewatering_machine_h: 96, pbb_shoring_mode: "REQUIRED",
      pbb_shoring_designation: "Инвентарное крепление траншеи", pbb_shoring_area_m2: 2100,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(30);
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compilePipeBeddingBackfillR1({
      ...PIPE_BEDDING_BACKFILL_SHORT_INPUT, pbb_route_length_m: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compilePipeBeddingBackfillR1(
      { ...PIPE_BEDDING_BACKFILL_ACCEPTANCE_INPUT },
      { catalogId: `${PIPE_BEDDING_BACKFILL_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("PIPE_BEDDING_BACKFILL_CATALOG_UNSUPPORTED");
  });
});
