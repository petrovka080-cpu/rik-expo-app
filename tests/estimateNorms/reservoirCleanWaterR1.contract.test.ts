import {
  RESERVOIR_CLEAN_WATER_ACCEPTANCE_INPUT,
  RESERVOIR_CLEAN_WATER_CATALOG_ID,
  RESERVOIR_CLEAN_WATER_FORMULAS,
  RESERVOIR_CLEAN_WATER_PARAMETERS,
  RESERVOIR_CLEAN_WATER_RESOURCES,
  RESERVOIR_CLEAN_WATER_RUNTIME_INPUT,
  RESERVOIR_CLEAN_WATER_SHORT_INPUT,
  compileReservoirCleanWaterR1,
  parseReservoirCleanWaterOrdinaryPromptR1,
} from "../../src/lib/estimate/v4/reservoirCleanWaterR1";

function quantity(
  rows: readonly { row_id: string; quantity: string }[],
  rowId: string,
): number {
  const value = rows.find((row) => row.row_id === rowId)?.quantity;
  if (value == null) throw new Error(`TEST_ROW_MISSING:${rowId}`);
  return Number(value);
}

describe("S27.26 automatic reinforced-concrete clean-water reservoir owner", () => {
  test("asks seven primary facts and does not ask the user for derived quantities", () => {
    expect(RESERVOIR_CLEAN_WATER_CATALOG_ID).toBe(
      "canonical-work:expanded:reservoir_clean_water",
    );
    expect(Object.keys(RESERVOIR_CLEAN_WATER_SHORT_INPUT)).toHaveLength(7);
    expect(Object.keys(RESERVOIR_CLEAN_WATER_RUNTIME_INPUT)).toHaveLength(60);
    expect(RESERVOIR_CLEAN_WATER_PARAMETERS).toHaveLength(71);
    expect(RESERVOIR_CLEAN_WATER_FORMULAS).toHaveLength(82);
    expect(RESERVOIR_CLEAN_WATER_RESOURCES).toHaveLength(82);
    const ordinary = RESERVOIR_CLEAN_WATER_PARAMETERS.filter((parameter) =>
      parameter.truth_metadata.value_source_role === "USER_INPUT"
    );
    const profile = RESERVOIR_CLEAN_WATER_PARAMETERS.filter((parameter) =>
      parameter.truth_metadata.value_source_role
        === "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
    );
    expect(ordinary).toHaveLength(7);
    expect(profile).toHaveLength(60);
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
    expect(Object.keys(RESERVOIR_CLEAN_WATER_SHORT_INPUT).join(" ")).not.toMatch(
      /excavat|concrete|rebar|formwork|waterproof|waterstop|labor|machine|order/iu,
    );
  });

  test("extracts only primary geometry explicitly stated in the request", () => {
    expect(parseReservoirCleanWaterOrdinaryPromptR1(
      "Два резервуара RC-CWR-2X1000, рабочая глубина воды 5 м",
    )).toEqual({
      rcw_reservoir_designation: "RC-CWR-2X1000",
      rcw_operating_water_depth_m: "5",
    });
    expect(parseReservoirCleanWaterOrdinaryPromptR1(
      "Строительство 2 подземных монолитных ЖБ резервуаров RC-CWR-2X1000, внутренние размеры каждого 20x10 м, рабочая глубина воды 5 м, по 2 переключаемые секции.",
    )).toEqual(Object.fromEntries(Object.entries(RESERVOIR_CLEAN_WATER_SHORT_INPUT)
      .map(([key, value]) => [key, String(value)])));
  });

  test("derives geometry, structure and the complete ordinary construction chain", async () => {
    const result = await compileReservoirCleanWaterR1({
      ...RESERVOIR_CLEAN_WATER_SHORT_INPUT,
    });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows).toHaveLength(77);
    expect(quantity(result.rows, "rc14:rcw_useful_capacity")).toBeCloseTo(2000, 9);
    expect(quantity(result.rows, "rc14:rcw_excavation")).toBeCloseTo(4015.116, 9);
    expect(quantity(result.rows, "rc14:rcw_structural_concrete_installed"))
      .toBeCloseTo(518.608, 9);
    expect(quantity(result.rows, "rc14:rcw_rebar_installed"))
      .toBeCloseTo(72605.12, 9);
    expect(quantity(result.rows, "rc14:rcw_waterstop_installed"))
      .toBeCloseTo(232.8, 9);
    for (const rowId of [
      "rc14:rcw_blinding_order", "rc14:rcw_structural_concrete_order",
      "rc14:rcw_rebar_order", "rc14:rcw_formwork",
      "rc14:rcw_external_waterproofing_order", "rc14:rcw_internal_coating_order",
      "rc14:rcw_waterstop_order", "rc14:rcw_binding_wire", "rc14:rcw_spacers",
      "rc14:rcw_appurtenance_kits", "rc14:rcw_access_hatches",
      "rc14:rcw_hydrostatic_fill_water", "rc14:rcw_disinfectant",
      "rc14:labor:rcw-rebar", "rc14:labor:rcw-formwork",
      "rc14:labor:rcw-concrete", "rc14:equipment:rcw-excavator",
      "rc14:equipment:rcw-concrete-pump", "rc14:logistics:rcw-concrete-delivery",
      "rc14:rcw_hidden_works", "rc14:rcw_asbuilt",
    ]) {
      expect(RESERVOIR_CLEAN_WATER_RESOURCES.some((row) => row.row_id === rowId))
        .toBe(true);
    }
  });

  test("recalculates capacity, earthworks, concrete, reinforcement and waterstop from geometry", async () => {
    const result = await compileReservoirCleanWaterR1({
      ...RESERVOIR_CLEAN_WATER_SHORT_INPUT,
      rcw_internal_length_m: 25,
      rcw_internal_width_m: 12,
      rcw_operating_water_depth_m: 6,
    });
    expect(quantity(result.rows, "rc14:rcw_useful_capacity")).toBeCloseTo(3600, 9);
    expect(quantity(result.rows, "rc14:rcw_excavation")).toBeCloseTo(6487.656, 9);
    expect(quantity(result.rows, "rc14:rcw_structural_concrete_installed"))
      .toBeCloseTo(768.248, 9);
    expect(quantity(result.rows, "rc14:rcw_rebar_order")).toBe(112000);
    expect(quantity(result.rows, "rc14:rcw_waterstop_order")).toBe(325);
  });

  test("recalculates supplier lots and remainders from stock, loss and retained spare", async () => {
    const result = await compileReservoirCleanWaterR1({
      ...RESERVOIR_CLEAN_WATER_ACCEPTANCE_INPUT,
      rcw_rebar_available_stock_kg: 10000,
      rcw_rebar_retained_spare_kg: 1000,
      rcw_rebar_supplier_lot_kg: 2000,
      rcw_waterstop_available_stock_m: 100,
      rcw_waterstop_retained_spare_m: 20,
      rcw_waterstop_supplier_roll_m: 50,
    });
    expect(quantity(result.rows, "rc14:rcw_rebar_total_need"))
      .toBeCloseTo(75783.2736, 9);
    expect(quantity(result.rows, "rc14:rcw_rebar_net_need"))
      .toBeCloseTo(65783.2736, 9);
    expect(quantity(result.rows, "rc14:rcw_rebar_lot_count")).toBe(33);
    expect(quantity(result.rows, "rc14:rcw_rebar_order")).toBe(66000);
    expect(quantity(result.rows, "rc14:rcw_rebar_surplus"))
      .toBeCloseTo(216.7264, 9);
    expect(quantity(result.rows, "rc14:rcw_waterstop_net_need")).toBeCloseTo(164.44, 9);
    expect(quantity(result.rows, "rc14:rcw_waterstop_roll_count")).toBe(4);
    expect(quantity(result.rows, "rc14:rcw_waterstop_order")).toBe(200);
    expect(quantity(result.rows, "rc14:rcw_waterstop_surplus")).toBeCloseTo(35.56, 9);
  });

  test("keeps shoring and dewatering fail-closed and excludes adjacent owners", async () => {
    const result = await compileReservoirCleanWaterR1({
      ...RESERVOIR_CLEAN_WATER_ACCEPTANCE_INPUT,
      rcw_shoring_mode: "REQUIRED",
      rcw_shoring_designation: "STEEL-SHEET-PILE",
      rcw_dewatering_mode: "REQUIRED",
      rcw_dewatering_pump_designation: "DRAIN-PUMP-20M3H",
      rcw_dewatering_duration_h: 40,
      rcw_dewatering_flow_m3_h: 12,
    });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows).toHaveLength(82);
    expect(quantity(result.rows, "rc14:rcw_shoring")).toBeCloseTo(992.64, 9);
    expect(quantity(result.rows, "rc14:rcw_dewatering_volume")).toBe(480);
    expect(JSON.stringify(RESERVOIR_CLEAN_WATER_RESOURCES.map((row) => row.row_id)))
      .not.toMatch(/external.pipeline|pump.station|treatment.station|road.restoration|pile/iu);
    expect(JSON.stringify(RESERVOIR_CLEAN_WATER_FORMULAS)).not.toMatch(
      /villageWaterSupplyCalculator|golden_rate|normFactor/iu,
    );
  });

  test("rejects impossible primary geometry", async () => {
    await expect(compileReservoirCleanWaterR1({
      ...RESERVOIR_CLEAN_WATER_SHORT_INPUT,
      rcw_internal_length_m: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileReservoirCleanWaterR1({
      ...RESERVOIR_CLEAN_WATER_SHORT_INPUT,
      rcw_cell_count_per_reservoir: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
  });
});
