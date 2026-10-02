import {
  PRESSURE_SEWER_PIPELINE_ACCEPTANCE_INPUT,
  PRESSURE_SEWER_PIPELINE_CATALOG_ID,
  PRESSURE_SEWER_PIPELINE_FORMULAS,
  PRESSURE_SEWER_PIPELINE_PARAMETERS,
  PRESSURE_SEWER_PIPELINE_RESOURCES,
  PRESSURE_SEWER_PIPELINE_RUNTIME_INPUT,
  PRESSURE_SEWER_PIPELINE_SHORT_INPUT,
  compilePressureSewerPipelineR1,
} from "../../src/lib/estimate/v4/pressureSewerPipelineR1";

describe("S27.24 pressure-sewer pipeline owner", () => {
  test("replaces generic sewer length coefficients with project quantities", () => {
    expect(PRESSURE_SEWER_PIPELINE_CATALOG_ID)
      .toBe("canonical-work:expanded:pressure_sewer_pipeline");
    expect(PRESSURE_SEWER_PIPELINE_PARAMETERS).toHaveLength(56);
    expect(PRESSURE_SEWER_PIPELINE_FORMULAS).toHaveLength(37);
    expect(PRESSURE_SEWER_PIPELINE_RESOURCES).toHaveLength(37);
    expect(PRESSURE_SEWER_PIPELINE_RUNTIME_INPUT).toEqual({
      psp_pipe_retained_spare_m: 0,
      psp_pipe_supplier_segment_length_m: 1,
    });
    expect(JSON.stringify(PRESSURE_SEWER_PIPELINE_FORMULAS)).not.toMatch(
      /length_m\s*\*\s*(?:1\.107|0\.005|0\.70|1\.02)|length_m\s*\/\s*(?:50|200)|0\.75\s*\*\s*(?:0\.22|1\.8)|golden_rate|normFactor/iu,
    );
  });

  test("known route and selected pipe give useful rows and local needs", async () => {
    const compiled = await compilePressureSewerPipelineR1({
      ...PRESSURE_SEWER_PIPELINE_SHORT_INPUT,
    });
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.preliminaryNeeds).toHaveLength(29);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:psp_pipeline_install_acceptance", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:psp_pipe", quantity: "800" }),
      expect.objectContaining({ row_id: "rc09:psp-pipe-balance:installed-net", quantity: "800" }),
    ]));
  });

  test("compiles the thirty-four-row project fixture", async () => {
    const compiled = await compilePressureSewerPipelineR1({
      ...PRESSURE_SEWER_PIPELINE_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(34);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:psp_trench_excavation", quantity: "1760" }),
      expect.objectContaining({ row_id: "rc09:psp_bedding", quantity: "144" }),
      expect.objectContaining({ row_id: "rc09:psp_isolation_valve", quantity: "6" }),
      expect.objectContaining({ row_id: "rc09:psp_air_valve", quantity: "4" }),
      expect.objectContaining({ row_id: "rc09:psp_washout", quantity: "3" }),
      expect.objectContaining({ row_id: "rc09:labor:psp-pipe-appurtenance-install", quantity: "680" }),
      expect.objectContaining({ row_id: "rc09:equipment:psp-jointing", quantity: "96" }),
      expect.objectContaining({ row_id: "rc09:logistics:psp-delivery", quantity: "20" }),
    ]));
  });

  test("separates installed pipe from supplier-segment rounding", async () => {
    const compiled = await compilePressureSewerPipelineR1({
      ...PRESSURE_SEWER_PIPELINE_ACCEPTANCE_INPUT,
      psp_pipe_retained_spare_m: 15,
      psp_pipe_supplier_segment_length_m: 12,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:psp-pipe-balance:installed-net")?.quantity).toBe("800");
    expect(rows.get("rc09:psp-pipe-balance:retained-spare")?.quantity).toBe("15");
    expect(rows.get("rc09:psp-pipe-balance:total-need")?.quantity).toBe("815");
    expect(rows.get("rc09:psp-pipe-balance:segment-count")?.quantity).toBe("68");
    expect(rows.get("rc09:psp_pipe")?.quantity).toBe("816");
    expect(rows.get("rc09:psp-pipe-balance:remainder")?.quantity).toBe("16");
    expect(rows.get("rc09:psp-pipe-balance:surplus-beyond-spare")?.quantity).toBe("1");
  });

  test("keeps acceptance scope informational beside explicit labor", () => {
    for (const rowId of ["rc09:psp_pipeline_install_acceptance", "rc09:psp_pressure_test",
      "rc09:psp_flushing", "rc09:psp_asbuilt_documents"]) {
      expect(PRESSURE_SEWER_PIPELINE_RESOURCES.find((row) => row.row_id === rowId)
        ?.resource_graph).toEqual(expect.objectContaining({ costTreatment: "INFORMATIONAL_SCOPE" }));
    }
  });

  test("keeps casing, dewatering and road restoration conditional", async () => {
    const compiled = await compilePressureSewerPipelineR1({
      ...PRESSURE_SEWER_PIPELINE_ACCEPTANCE_INPUT,
      psp_crossing_casing_mode: "REQUIRED",
      psp_crossing_casing_designation: "Стальной футляр по узлу пересечения",
      psp_crossing_casing_length_m: 36,
      psp_dewatering_mode: "REQUIRED",
      psp_dewatering_designation: "Иглофильтровая установка по ППР",
      psp_dewatering_machine_h: 220,
      psp_road_restoration_mode: "REQUIRED",
      psp_road_restoration_designation: "Дорожная одежда по ведомости восстановления",
      psp_road_restoration_area_m2: 960,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(37);
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compilePressureSewerPipelineR1({
      ...PRESSURE_SEWER_PIPELINE_SHORT_INPUT, psp_route_length_m: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compilePressureSewerPipelineR1(
      { ...PRESSURE_SEWER_PIPELINE_ACCEPTANCE_INPUT },
      { catalogId: `${PRESSURE_SEWER_PIPELINE_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("PRESSURE_SEWER_PIPELINE_CATALOG_UNSUPPORTED");
  });
});
