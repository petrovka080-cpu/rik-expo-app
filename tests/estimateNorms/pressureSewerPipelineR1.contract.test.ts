import {
  PRESSURE_SEWER_PIPELINE_ACCEPTANCE_INPUT,
  PRESSURE_SEWER_PIPELINE_CATALOG_ID,
  PRESSURE_SEWER_PIPELINE_FORMULAS,
  PRESSURE_SEWER_PIPELINE_PARAMETERS,
  PRESSURE_SEWER_PIPELINE_RESOURCES,
  PRESSURE_SEWER_PIPELINE_RUNTIME_INPUT,
  PRESSURE_SEWER_PIPELINE_SHORT_INPUT,
  compilePressureSewerPipelineR1,
  parsePressureSewerPipelineOrdinaryPromptR1,
} from "../../src/lib/estimate/v4/pressureSewerPipelineR1";

function quantity(
  rows: readonly { row_id: string; quantity: string }[],
  rowId: string,
): number {
  const value = rows.find((row) => row.row_id === rowId)?.quantity;
  if (value == null) throw new Error(`TEST_ROW_MISSING:${rowId}`);
  return Number(value);
}

describe("S27.27 automatic pressure-sewer pipeline owner", () => {
  test("keeps only eight real project facts outside the visible preliminary profile", () => {
    expect(PRESSURE_SEWER_PIPELINE_CATALOG_ID)
      .toBe("canonical-work:expanded:pressure_sewer_pipeline");
    expect(Object.keys(PRESSURE_SEWER_PIPELINE_SHORT_INPUT)).toHaveLength(8);
    expect(Object.keys(PRESSURE_SEWER_PIPELINE_RUNTIME_INPUT)).toHaveLength(46);
    expect(PRESSURE_SEWER_PIPELINE_PARAMETERS).toHaveLength(61);
    expect(PRESSURE_SEWER_PIPELINE_FORMULAS).toHaveLength(47);
    expect(PRESSURE_SEWER_PIPELINE_RESOURCES).toHaveLength(47);

    const ordinary = PRESSURE_SEWER_PIPELINE_PARAMETERS.filter((parameter) =>
      parameter.truth_metadata.value_source_role === "USER_INPUT"
    );
    const profile = PRESSURE_SEWER_PIPELINE_PARAMETERS.filter((parameter) =>
      parameter.truth_metadata.value_source_role
        === "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
    );
    expect(ordinary).toHaveLength(8);
    expect(profile).toHaveLength(46);
    expect(Object.keys(PRESSURE_SEWER_PIPELINE_SHORT_INPUT).join(" ")).not.toMatch(
      /trench_excavation|bedding_volume|surround_volume|backfill_volume|joint_quantity|labor_h|machine_h|trip_count/iu,
    );
    expect(Object.keys(PRESSURE_SEWER_PIPELINE_RUNTIME_INPUT).join(" ")).not.toMatch(
      /trench_excavation_volume|bedding_volume|surround_volume|backfill_volume|joint_quantity|survey_labor_h$|excavator_machine_h$|delivery_trip_count/iu,
    );
  });

  test("extracts 100 metres from the exact short customer request without inventing count or geometry", () => {
    expect(parsePressureSewerPipelineOrdinaryPromptR1(
      "Строительство напорного канализационного трубопровода 100 метров",
    )).toEqual({ psp_route_length_m: "100" });
    expect(parsePressureSewerPipelineOrdinaryPromptR1(
      "Строительство 800 м напорной канализации PE100-RC-SDR17-OD110-PN10, средняя глубина траншеи 1,8 м, фасонных частей 24, запорной арматуры 6, воздушных клапанов 4, промывных узлов 3.",
    )).toEqual(Object.fromEntries(Object.entries(PRESSURE_SEWER_PIPELINE_SHORT_INPUT)
      .map(([key, value]) => [key, String(value)])));
  });

  test("derives earthworks, materials, labor, mechanisms, logistics and acceptance", async () => {
    const result = await compilePressureSewerPipelineR1({
      ...PRESSURE_SEWER_PIPELINE_SHORT_INPUT,
    });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows).toHaveLength(43);
    expect(quantity(result.rows, "rc09:psp_pipeline_install_acceptance")).toBe(800);
    expect(quantity(result.rows, "rc09:psp_trench_width")).toBeCloseTo(0.61, 9);
    expect(quantity(result.rows, "rc09:psp_trench_excavation")).toBeCloseTo(878.4, 9);
    expect(quantity(result.rows, "rc09:psp_bedding")).toBeCloseTo(56.12, 9);
    expect(quantity(result.rows, "rc09:psp_surround")).toBeCloseTo(221.348947649, 9);
    expect(quantity(result.rows, "rc09:psp_joint")).toBe(66);
    expect(quantity(result.rows, "rc09:psp_chamber")).toBe(13);
    expect(quantity(result.rows, "rc09:psp_cover")).toBe(13);
    expect(quantity(result.rows, "rc09:labor:psp-pipe-appurtenance-install"))
      .toBeCloseTo(523.2, 9);
    expect(quantity(result.rows, "rc09:equipment:psp-excavator"))
      .toBeCloseTo(25.097142857, 9);
    expect(quantity(result.rows, "rc09:logistics:psp-removal")).toBe(25);
  });

  test("recalculates the complete chain when primary length, diameter and depth change", async () => {
    const first = await compilePressureSewerPipelineR1({
      ...PRESSURE_SEWER_PIPELINE_SHORT_INPUT,
    });
    const changed = await compilePressureSewerPipelineR1({
      ...PRESSURE_SEWER_PIPELINE_SHORT_INPUT,
      psp_route_length_m: 100,
      psp_pipe_outside_diameter_mm: 160,
      psp_average_trench_depth_m: 2,
    });
    expect(quantity(changed.rows, "rc09:psp_pipeline_install_acceptance")).toBe(100);
    expect(quantity(changed.rows, "rc09:psp_trench_excavation"))
      .toBeLessThan(quantity(first.rows, "rc09:psp_trench_excavation"));
    expect(quantity(changed.rows, "rc09:psp_bedding"))
      .toBeLessThan(quantity(first.rows, "rc09:psp_bedding"));
    expect(quantity(changed.rows, "rc09:psp_joint")).toBe(8);
    expect(quantity(changed.rows, "rc09:psp_warning_tape")).toBe(105);
    expect(quantity(changed.rows, "rc09:psp_pressure_test")).toBe(100);
    expect(quantity(changed.rows, "rc09:psp_flushing")).toBe(100);
  });

  test("calculates supplier order and remainder from stock, loss, spare and package length", async () => {
    const result = await compilePressureSewerPipelineR1({
      ...PRESSURE_SEWER_PIPELINE_ACCEPTANCE_INPUT,
      psp_pipe_available_stock_m: 100,
      psp_pipe_retained_spare_m: 24,
      psp_pipe_supplier_segment_length_m: 12,
    });
    expect(quantity(result.rows, "rc09:psp-pipe-balance:installed-net")).toBe(800);
    expect(quantity(result.rows, "rc09:psp-pipe-balance:loss")).toBe(16);
    expect(quantity(result.rows, "rc09:psp-pipe-balance:total-need")).toBe(840);
    expect(quantity(result.rows, "rc09:psp-pipe-balance:net-need")).toBe(740);
    expect(quantity(result.rows, "rc09:psp-pipe-balance:segment-count")).toBe(62);
    expect(quantity(result.rows, "rc09:psp_pipe")).toBe(744);
    expect(quantity(result.rows, "rc09:psp-pipe-balance:remainder")).toBe(28);
    expect(quantity(result.rows, "rc09:psp-pipe-balance:surplus-beyond-spare")).toBe(4);
  });

  test("keeps casing, dewatering and road restoration conditional", async () => {
    const result = await compilePressureSewerPipelineR1({
      ...PRESSURE_SEWER_PIPELINE_ACCEPTANCE_INPUT,
      psp_crossing_casing_mode: "REQUIRED",
      psp_crossing_casing_designation: "Стальной футляр по узлу пересечения",
      psp_crossing_casing_length_m: 36,
      psp_dewatering_mode: "REQUIRED",
      psp_dewatering_designation: "Иглофильтровая установка по ППР",
      psp_dewatering_duration_h: 40,
      psp_dewatering_flow_m3_h: 12,
      psp_road_restoration_mode: "REQUIRED",
      psp_road_restoration_designation: "Дорожная одежда по ведомости восстановления",
      psp_road_restoration_area_m2: 96,
    });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows).toHaveLength(47);
    expect(quantity(result.rows, "rc09:psp_crossing_casing")).toBe(36);
    expect(quantity(result.rows, "rc09:psp_dewatering")).toBe(40);
    expect(quantity(result.rows, "rc09:psp_dewatering_volume")).toBe(480);
    expect(quantity(result.rows, "rc09:psp_road_restoration")).toBe(96);
  });

  test("rejects impossible project geometry and unrelated catalog identities", async () => {
    await expect(compilePressureSewerPipelineR1({
      ...PRESSURE_SEWER_PIPELINE_SHORT_INPUT,
      psp_route_length_m: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compilePressureSewerPipelineR1(
      { ...PRESSURE_SEWER_PIPELINE_ACCEPTANCE_INPUT },
      { catalogId: `${PRESSURE_SEWER_PIPELINE_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("PRESSURE_SEWER_PIPELINE_CATALOG_UNSUPPORTED");
  });
});
