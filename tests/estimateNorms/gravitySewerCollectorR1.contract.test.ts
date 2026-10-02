import {
  GRAVITY_SEWER_COLLECTOR_ACCEPTANCE_INPUT,
  GRAVITY_SEWER_COLLECTOR_CATALOG_ID,
  GRAVITY_SEWER_COLLECTOR_FORMULAS,
  GRAVITY_SEWER_COLLECTOR_PARAMETERS,
  GRAVITY_SEWER_COLLECTOR_RESOURCES,
  GRAVITY_SEWER_COLLECTOR_RUNTIME_INPUT,
  GRAVITY_SEWER_COLLECTOR_SHORT_INPUT,
  compileGravitySewerCollectorR1,
} from "../../src/lib/estimate/v4/gravitySewerCollectorR1";

describe("S27.24 gravity-sewer collector owner", () => {
  test("replaces generic length coefficients with exact project quantities", () => {
    expect(GRAVITY_SEWER_COLLECTOR_CATALOG_ID)
      .toBe("canonical-work:expanded:gravity_sewer_collector");
    expect(GRAVITY_SEWER_COLLECTOR_PARAMETERS).toHaveLength(51);
    expect(GRAVITY_SEWER_COLLECTOR_FORMULAS).toHaveLength(34);
    expect(GRAVITY_SEWER_COLLECTOR_RESOURCES).toHaveLength(34);
    expect(GRAVITY_SEWER_COLLECTOR_RUNTIME_INPUT).toEqual({
      gsc_pipe_retained_spare_m: 0,
      gsc_pipe_supplier_stick_length_m: 1,
    });
    expect(JSON.stringify(GRAVITY_SEWER_COLLECTOR_FORMULAS)).not.toMatch(
      /length_m\s*\*\s*(?:1\.107|0\.75|0\.70)|ceil\(length_m\/(?:50|200)\)|\b432\b|golden_rate|normFactor/iu,
    );
  });

  test("known route and selected pipe give useful rows and local needs", async () => {
    const compiled = await compileGravitySewerCollectorR1({
      ...GRAVITY_SEWER_COLLECTOR_SHORT_INPUT,
    });
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.preliminaryNeeds).toHaveLength(26);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:gsc_collector_install_acceptance", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:gsc_pipe", quantity: "600" }),
      expect.objectContaining({ row_id: "rc09:gsc-pipe-balance:installed-net", quantity: "600" }),
      expect.objectContaining({ row_id: "rc09:gsc-pipe-balance:stick-count", quantity: "600" }),
    ]));
  });

  test("compiles the thirty-one-row complete project fixture", async () => {
    const compiled = await compileGravitySewerCollectorR1({
      ...GRAVITY_SEWER_COLLECTOR_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(31);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:gsc_trench_excavation", quantity: "1260" }),
      expect.objectContaining({ row_id: "rc09:gsc_bedding", quantity: "108" }),
      expect.objectContaining({ row_id: "rc09:gsc_surround", quantity: "252" }),
      expect.objectContaining({ row_id: "rc09:gsc_manhole", quantity: "13" }),
      expect.objectContaining({ row_id: "rc09:gsc_fitting", quantity: "18" }),
      expect.objectContaining({ row_id: "rc09:gsc_cctv_inspection", quantity: "600" }),
      expect.objectContaining({ row_id: "rc09:labor:gsc-earthworks", quantity: "420" }),
      expect.objectContaining({ row_id: "rc09:labor:gsc-pipe-manhole-install", quantity: "560" }),
      expect.objectContaining({ row_id: "rc09:equipment:gsc-excavator", quantity: "140" }),
      expect.objectContaining({ row_id: "rc09:logistics:gsc-delivery", quantity: "18" }),
    ]));
  });

  test("separates installed pipe from supplier-stick rounding", async () => {
    const compiled = await compileGravitySewerCollectorR1({
      ...GRAVITY_SEWER_COLLECTOR_ACCEPTANCE_INPUT,
      gsc_pipe_retained_spare_m: 10,
      gsc_pipe_supplier_stick_length_m: 6,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:gsc-pipe-balance:installed-net")?.quantity).toBe("600");
    expect(rows.get("rc09:gsc-pipe-balance:retained-spare")?.quantity).toBe("10");
    expect(rows.get("rc09:gsc-pipe-balance:total-need")?.quantity).toBe("610");
    expect(rows.get("rc09:gsc-pipe-balance:stick-count")?.quantity).toBe("102");
    expect(rows.get("rc09:gsc_pipe")?.quantity).toBe("612");
    expect(rows.get("rc09:gsc-pipe-balance:remainder")?.quantity).toBe("12");
    expect(rows.get("rc09:gsc-pipe-balance:surplus-beyond-spare")?.quantity).toBe("2");
  });

  test("keeps acceptance scope informational beside explicit labor", () => {
    for (const rowId of [
      "rc09:gsc_collector_install_acceptance", "rc09:gsc_leak_test",
      "rc09:gsc_cctv_inspection", "rc09:gsc_asbuilt_documents",
    ]) expect(GRAVITY_SEWER_COLLECTOR_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph).toEqual(expect.objectContaining({ costTreatment: "INFORMATIONAL_SCOPE" }));
  });

  test("keeps dewatering, shoring and road restoration conditional", async () => {
    const compiled = await compileGravitySewerCollectorR1({
      ...GRAVITY_SEWER_COLLECTOR_ACCEPTANCE_INPUT,
      gsc_dewatering_mode: "REQUIRED",
      gsc_dewatering_designation: "Иглофильтровая установка по ППР",
      gsc_dewatering_machine_h: 240,
      gsc_shoring_mode: "REQUIRED",
      gsc_shoring_designation: "Инвентарное крепление траншеи",
      gsc_shoring_area_m2: 1800,
      gsc_road_restoration_mode: "REQUIRED",
      gsc_road_restoration_designation: "Дорожная одежда по ведомости восстановления",
      gsc_road_restoration_area_m2: 720,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(34);
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileGravitySewerCollectorR1({
      ...GRAVITY_SEWER_COLLECTOR_SHORT_INPUT,
      gsc_route_length_m: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileGravitySewerCollectorR1(
      { ...GRAVITY_SEWER_COLLECTOR_ACCEPTANCE_INPUT },
      { catalogId: `${GRAVITY_SEWER_COLLECTOR_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("GRAVITY_SEWER_COLLECTOR_CATALOG_UNSUPPORTED");
  });
});
