import {
  PRESSURE_PIPELINE_ACCEPTANCE_INPUT,
  PRESSURE_PIPELINE_CATALOG_ID,
  PRESSURE_PIPELINE_FORMULAS,
  PRESSURE_PIPELINE_PARAMETERS,
  PRESSURE_PIPELINE_RESOURCES,
  PRESSURE_PIPELINE_RUNTIME_INPUT,
  PRESSURE_PIPELINE_SHORT_INPUT,
  compilePressurePipelineR1,
  parsePressurePipelineOrdinaryPromptR1,
} from "../../src/lib/estimate/v4/pressurePipelineR1";

function quantity(
  rows: readonly { row_id: string; quantity: string }[],
  rowId: string,
): number {
  const value = rows.find((row) => row.row_id === rowId)?.quantity;
  if (value == null) throw new Error(`TEST_ROW_MISSING:${rowId}`);
  return Number(value);
}

describe("S27.26 automatic pressure HDPE pipeline owner", () => {
  test("asks seven primary facts and keeps replaceable norms in one visible profile", () => {
    expect(PRESSURE_PIPELINE_CATALOG_ID).toBe(
      "canonical-work:expanded:pressure_pipeline",
    );
    expect(Object.keys(PRESSURE_PIPELINE_SHORT_INPUT)).toHaveLength(7);
    expect(Object.keys(PRESSURE_PIPELINE_RUNTIME_INPUT)).toHaveLength(38);
    expect(PRESSURE_PIPELINE_PARAMETERS).toHaveLength(50);
    expect(PRESSURE_PIPELINE_FORMULAS).toHaveLength(53);
    expect(PRESSURE_PIPELINE_RESOURCES).toHaveLength(53);
    const ordinary = PRESSURE_PIPELINE_PARAMETERS.filter((parameter) =>
      parameter.truth_metadata.value_source_role === "USER_INPUT"
    );
    const profile = PRESSURE_PIPELINE_PARAMETERS.filter((parameter) =>
      parameter.truth_metadata.value_source_role
        === "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
    );
    expect(ordinary).toHaveLength(7);
    expect(profile).toHaveLength(38);
    expect(ordinary.every((parameter) =>
      parameter.truth_metadata.preliminary_compilation_allowed === false
      && (parameter.truth_metadata.guide as Record<string, unknown>)
        .guide_validation_policy === "MANDATORY_BLOCK"
    )).toBe(true);
    expect(profile.every((parameter) =>
      parameter.truth_metadata.preliminary_compilation_allowed === true
      && (parameter.truth_metadata.guide as Record<string, unknown>)
        .guide_validation_policy === "ADVISORY_REASON_REQUIRED"
    )).toBe(true);
    expect(Object.keys(PRESSURE_PIPELINE_SHORT_INPUT).join(" ")).not.toMatch(
      /excavation|bedding|surround|backfill|joint|labor|machine|trip|order/iu,
    );
  });

  test("extracts only stated primary facts and leaves real unknowns to the compact form", () => {
    expect(parsePressurePipelineOrdinaryPromptR1(
      "Проложить 1000 м PE100-RC-SDR17-OD160-PN10 стыковой сваркой",
    )).toEqual({
      ppl_route_length_m: "1000",
      ppl_pipe_designation: "PE100-RC-SDR17-OD160-PN10",
      ppl_pipe_outside_diameter_mm: "160",
      ppl_installation_technology: "HDPE_BUTT_FUSION_OPEN_TRENCH",
    });
    expect(parsePressurePipelineOrdinaryPromptR1(
      "Строительство 1000 м напорного трубопровода PE100-RC-SDR17-OD160-PN10, наружный диаметр 160 мм, средняя глубина траншеи 1,6 м, 2 проектных узла подключения, 2 самостоятельных строительных участка, стыковая сварка открытым способом.",
    )).toEqual(Object.fromEntries(Object.entries(PRESSURE_PIPELINE_SHORT_INPUT)
      .map(([key, value]) => [key, String(value)])));
  });

  test("derives geometry and the complete ordinary construction chain", async () => {
    const result = await compilePressurePipelineR1({ ...PRESSURE_PIPELINE_SHORT_INPUT });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows).toHaveLength(48);
    expect(quantity(result.rows, "rc13:ppl_trench_width")).toBeCloseTo(0.66, 9);
    expect(quantity(result.rows, "rc13:ppl_excavation")).toBeCloseTo(1056, 9);
    expect(quantity(result.rows, "rc13:ppl_bedding_installed")).toBeCloseTo(66, 9);
    expect(quantity(result.rows, "rc13:ppl_surround_installed"))
      .toBeCloseTo(283.493807027, 9);
    expect(quantity(result.rows, "rc13:ppl_native_backfill")).toBeCloseTo(686.4, 9);
    expect(quantity(result.rows, "rc13:ppl_excess_soil")).toBeCloseTo(369.6, 9);
    expect(quantity(result.rows, "rc13:ppl_pipe_order")).toBeCloseTo(1032, 9);
    expect(quantity(result.rows, "rc13:ppl_fusion_joints")).toBeCloseTo(82, 9);
  });

  test("recalculates earthworks, pipe supply and joints when primary geometry changes", async () => {
    const result = await compilePressurePipelineR1({
      ...PRESSURE_PIPELINE_SHORT_INPUT,
      ppl_route_length_m: 2000,
      ppl_pipe_outside_diameter_mm: 225,
      ppl_average_trench_depth_m: 2,
    });
    expect(quantity(result.rows, "rc13:ppl_excavation")).toBeCloseTo(2900, 9);
    expect(quantity(result.rows, "rc13:ppl_bedding_installed")).toBeCloseTo(145, 9);
    expect(quantity(result.rows, "rc13:ppl_surround_installed"))
      .toBeCloseTo(681.728435996, 9);
    expect(quantity(result.rows, "rc13:ppl_pipe_order")).toBeCloseTo(2052, 9);
    expect(quantity(result.rows, "rc13:ppl_fusion_joints")).toBeCloseTo(165, 9);
  });

  test("recalculates supplier order and remainder from stock, loss, spare and segment length", async () => {
    const result = await compilePressurePipelineR1({
      ...PRESSURE_PIPELINE_ACCEPTANCE_INPUT,
      ppl_pipe_available_stock_m: 100,
      ppl_pipe_retained_spare_m: 24,
      ppl_pipe_supplier_segment_length_m: 12,
    });
    expect(quantity(result.rows, "rc13:ppl_pipe_installed")).toBe(1000);
    expect(quantity(result.rows, "rc13:ppl_pipe_loss")).toBe(20);
    expect(quantity(result.rows, "rc13:ppl_pipe_total_need")).toBe(1044);
    expect(quantity(result.rows, "rc13:ppl_pipe_net_need")).toBe(944);
    expect(quantity(result.rows, "rc13:ppl_pipe_segment_count")).toBe(79);
    expect(quantity(result.rows, "rc13:ppl_pipe_order")).toBe(948);
    expect(quantity(result.rows, "rc13:ppl_pipe_remainder")).toBe(28);
    expect(quantity(result.rows, "rc13:ppl_pipe_surplus")).toBe(4);
  });

  test("keeps shoring and dewatering conditional and excludes adjacent estimate owners", async () => {
    const result = await compilePressurePipelineR1({
      ...PRESSURE_PIPELINE_ACCEPTANCE_INPUT,
      ppl_shoring_mode: "REQUIRED",
      ppl_shoring_designation: "TRENCH-BOX-STEEL-H2M",
      ppl_shored_length_m: 120,
      ppl_dewatering_mode: "REQUIRED",
      ppl_dewatering_pump_designation: "DRAIN-PUMP-20M3H",
      ppl_dewatering_duration_h: 40,
      ppl_dewatering_flow_m3_h: 12,
    });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows).toHaveLength(53);
    expect(quantity(result.rows, "rc13:ppl_shoring")).toBeCloseTo(384, 9);
    expect(quantity(result.rows, "rc13:ppl_dewatering_volume")).toBeCloseTo(480, 9);
    expect(JSON.stringify(PRESSURE_PIPELINE_RESOURCES.map((row) => row.row_id)))
      .not.toMatch(/valve|hydrant|chamber|manhole|pressure.test|hydro.test|disinfection/iu);
    expect(JSON.stringify(PRESSURE_PIPELINE_FORMULAS)).not.toMatch(
      /villageWaterSupplyCalculator|golden_rate|normFactor/iu,
    );
  });

  test("rejects impossible primary geometry", async () => {
    await expect(compilePressurePipelineR1({
      ...PRESSURE_PIPELINE_SHORT_INPUT,
      ppl_route_length_m: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compilePressurePipelineR1({
      ...PRESSURE_PIPELINE_SHORT_INPUT,
      ppl_average_trench_depth_m: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
});
