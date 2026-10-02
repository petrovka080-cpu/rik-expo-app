import {
  STORMWATER_DRAINAGE_ACCEPTANCE_INPUT,
  STORMWATER_DRAINAGE_CATALOG_ID,
  STORMWATER_DRAINAGE_FORMULAS,
  STORMWATER_DRAINAGE_PARAMETERS,
  STORMWATER_DRAINAGE_RESOURCES,
  STORMWATER_DRAINAGE_RUNTIME_INPUT,
  STORMWATER_DRAINAGE_SHORT_INPUT,
  compileStormwaterDrainageR1,
} from "../../src/lib/estimate/v4/stormwaterDrainageR1";

describe("S27.24 stormwater-drainage owner", () => {
  test("replaces generic spacing and route coefficients with project quantities", () => {
    expect(STORMWATER_DRAINAGE_CATALOG_ID)
      .toBe("canonical-work:expanded:stormwater_drainage");
    expect(STORMWATER_DRAINAGE_PARAMETERS).toHaveLength(56);
    expect(STORMWATER_DRAINAGE_FORMULAS).toHaveLength(37);
    expect(STORMWATER_DRAINAGE_RESOURCES).toHaveLength(37);
    expect(STORMWATER_DRAINAGE_RUNTIME_INPUT).toEqual({
      swd_pipe_retained_spare_m: 0,
      swd_pipe_supplier_segment_length_m: 1,
    });
    expect(JSON.stringify(STORMWATER_DRAINAGE_FORMULAS)).not.toMatch(
      /length_m\s*\*\s*(?:0\.0066667|0\.85|1\.02|1\.4)|length_m\s*\/\s*(?:60|200)|ceil\(5\/4\)|golden_rate|normFactor/iu,
    );
  });

  test("known route and selected pipe give useful rows and local needs", async () => {
    const compiled = await compileStormwaterDrainageR1({
      ...STORMWATER_DRAINAGE_SHORT_INPUT,
    });
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.preliminaryNeeds).toHaveLength(29);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:swd_network_install_acceptance", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:swd_pipe", quantity: "900" }),
      expect.objectContaining({ row_id: "rc09:swd-pipe-balance:installed-net", quantity: "900" }),
    ]));
  });

  test("compiles the thirty-four-row project fixture", async () => {
    const compiled = await compileStormwaterDrainageR1({
      ...STORMWATER_DRAINAGE_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(34);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:swd_trench_excavation", quantity: "2160" }),
      expect.objectContaining({ row_id: "rc09:swd_bedding", quantity: "180" }),
      expect.objectContaining({ row_id: "rc09:swd_inlet", quantity: "30" }),
      expect.objectContaining({ row_id: "rc09:swd_manhole", quantity: "16" }),
      expect.objectContaining({ row_id: "rc09:swd_silt_trap", quantity: "4" }),
      expect.objectContaining({ row_id: "rc09:labor:swd-pipe-structure-install", quantity: "760" }),
      expect.objectContaining({ row_id: "rc09:equipment:swd-pipe-laser", quantity: "110" }),
      expect.objectContaining({ row_id: "rc09:logistics:swd-delivery", quantity: "24" }),
    ]));
  });

  test("separates installed pipe from supplier-segment rounding", async () => {
    const compiled = await compileStormwaterDrainageR1({
      ...STORMWATER_DRAINAGE_ACCEPTANCE_INPUT,
      swd_pipe_retained_spare_m: 10,
      swd_pipe_supplier_segment_length_m: 6,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:swd-pipe-balance:installed-net")?.quantity).toBe("900");
    expect(rows.get("rc09:swd-pipe-balance:retained-spare")?.quantity).toBe("10");
    expect(rows.get("rc09:swd-pipe-balance:total-need")?.quantity).toBe("910");
    expect(rows.get("rc09:swd-pipe-balance:segment-count")?.quantity).toBe("152");
    expect(rows.get("rc09:swd_pipe")?.quantity).toBe("912");
    expect(rows.get("rc09:swd-pipe-balance:remainder")?.quantity).toBe("12");
    expect(rows.get("rc09:swd-pipe-balance:surplus-beyond-spare")?.quantity).toBe("2");
  });

  test("keeps acceptance scope informational beside explicit labor", () => {
    for (const rowId of [
      "rc09:swd_network_install_acceptance", "rc09:swd_leak_test",
      "rc09:swd_cctv_inspection", "rc09:swd_asbuilt_documents",
    ]) expect(STORMWATER_DRAINAGE_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph).toEqual(expect.objectContaining({ costTreatment: "INFORMATIONAL_SCOPE" }));
  });

  test("keeps dewatering, shoring and road restoration conditional", async () => {
    const compiled = await compileStormwaterDrainageR1({
      ...STORMWATER_DRAINAGE_ACCEPTANCE_INPUT,
      swd_dewatering_mode: "REQUIRED",
      swd_dewatering_designation: "Иглофильтровая установка по ППР",
      swd_dewatering_machine_h: 280,
      swd_shoring_mode: "REQUIRED",
      swd_shoring_designation: "Инвентарное крепление траншеи по ППР",
      swd_shoring_area_m2: 2520,
      swd_road_restoration_mode: "REQUIRED",
      swd_road_restoration_designation: "Дорожная одежда по ведомости восстановления",
      swd_road_restoration_area_m2: 1080,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(37);
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileStormwaterDrainageR1({
      ...STORMWATER_DRAINAGE_SHORT_INPUT,
      swd_route_length_m: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileStormwaterDrainageR1(
      { ...STORMWATER_DRAINAGE_ACCEPTANCE_INPUT },
      { catalogId: `${STORMWATER_DRAINAGE_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("STORMWATER_DRAINAGE_CATALOG_UNSUPPORTED");
  });
});
