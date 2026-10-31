import {
  FILTRATION_STATION_CATALOG_ID as pureCatalogId,
  parseFiltrationStationOrdinaryPromptR1 as parsePurePrompt,
} from "../../src/lib/estimate/v4/filtrationStationPromptR1";
import {
  FILTRATION_STATION_ACCEPTANCE_INPUT,
  FILTRATION_STATION_CATALOG_ID,
  FILTRATION_STATION_FORMULAS,
  FILTRATION_STATION_PARAMETERS,
  FILTRATION_STATION_RESOURCES,
  FILTRATION_STATION_RUNTIME_CLASSIFICATION,
  FILTRATION_STATION_RUNTIME_INPUT,
  FILTRATION_STATION_SHORT_INPUT,
  compileFiltrationStationR1,
  parseFiltrationStationOrdinaryPromptR1,
} from "../../src/lib/estimate/v4/filtrationStationR1";

const quantity = async (input: Record<string, unknown>, rowId: string) => {
  const result = await compileFiltrationStationR1(input);
  return Number(result.rows.find((row) => row.row_id === rowId)?.quantity);
};

describe("S27.26 automatic complete potable-water filtration-station owner", () => {
  test("preserves the existing ten-fact fixture through the pure parser and legacy exports", () => {
    const prompt = "Строительство 1 фильтровальной станции FS-RGF-5000-4C производительностью 5000 м3/сут: 4 фильтровальные ячейки внутренним размером 8 x 5 м; загрузка DUAL-MEDIA-ANTHRACITE-SAND-POTABLE глубиной 0.8 м; дренаж HDPE-BLOCK-UNDERDRAIN-AIR-WATER; промывочный пакет BW-2P2B-AIR-WATER-5000.";
    const expected = Object.fromEntries(Object.entries(FILTRATION_STATION_SHORT_INPUT)
      .map(([key, value]) => [key, String(value)]));
    expect(parsePurePrompt).toBe(parseFiltrationStationOrdinaryPromptR1);
    expect(pureCatalogId).toBe(FILTRATION_STATION_CATALOG_ID);
    expect(pureCatalogId).toBe("canonical-work:expanded:filtration_station");
    expect(parsePurePrompt(prompt)).toEqual(expected);
    expect(parsePurePrompt(prompt.replace("0.8 м", "0,8 м").replace("8 x 5 м", "8 × 5 м")))
      .toEqual(expected);
    expect(parsePurePrompt("смета на фильтровальную станцию производительностью 1000 м3 в сутки"))
      .toEqual({ flt_station_count: "1", flt_design_capacity_m3_day: "1000" });
    expect(parsePurePrompt("Смета на устройство водопровода")).toEqual({});
    expect(parsePurePrompt("")).toEqual({});
  });

  test("asks ten primary facts and keeps the engineering model in a visible profile", () => {
    expect(FILTRATION_STATION_CATALOG_ID).toBe(
      "canonical-work:expanded:filtration_station",
    );
    expect(Object.keys(FILTRATION_STATION_SHORT_INPUT)).toHaveLength(10);
    expect(Object.keys(FILTRATION_STATION_RUNTIME_INPUT)).toHaveLength(92);
    expect(FILTRATION_STATION_PARAMETERS).toHaveLength(108);
    expect(FILTRATION_STATION_FORMULAS).toHaveLength(76);
    expect(FILTRATION_STATION_RESOURCES).toHaveLength(76);
    expect(Object.values(FILTRATION_STATION_RUNTIME_CLASSIFICATION))
      .toEqual(expect.arrayContaining(["ASSUMPTION"]));
    expect(Object.keys(FILTRATION_STATION_SHORT_INPUT).join(" ")).not.toMatch(
      /excavation|concrete_volume|reinforcement_mass|labor|machine|trip|package_count|pipe_length/iu,
    );
    const ordinary = FILTRATION_STATION_PARAMETERS.slice(0, 10);
    const profile = FILTRATION_STATION_PARAMETERS.slice(10, 102);
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
  });

  test("extracts stated primary facts and leaves genuinely unknown facts for the form", () => {
    expect(parseFiltrationStationOrdinaryPromptR1(
      "смета на фильтровальную станцию производительностью 1000 м3 в сутки",
    )).toEqual({
      flt_station_count: "1",
      flt_design_capacity_m3_day: "1000",
    });
    expect(parseFiltrationStationOrdinaryPromptR1(
      "Строительство 1 фильтровальной станции FS-RGF-5000-4C производительностью 5000 м3/сут: 4 фильтровальные ячейки внутренним размером 8 x 5 м; загрузка DUAL-MEDIA-ANTHRACITE-SAND-POTABLE глубиной 0.8 м; дренаж HDPE-BLOCK-UNDERDRAIN-AIR-WATER; промывочный пакет BW-2P2B-AIR-WATER-5000.",
    )).toEqual(Object.fromEntries(Object.entries(FILTRATION_STATION_SHORT_INPUT)
      .map(([key, value]) => [key, String(value)])));
  });

  test("ordinary facts compile the complete non-conditional resource chain", async () => {
    const result = await compileFiltrationStationR1({
      ...FILTRATION_STATION_SHORT_INPUT,
    });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows).toHaveLength(73);
    expect(result.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc10:flt_design_capacity", quantity: "5000" }),
      expect.objectContaining({ row_id: "rc10:flt_hydraulic_loading", quantity: "1.302083333" }),
      expect.objectContaining({ row_id: "rc10:flt_excavation", quantity: "569.296" }),
      expect.objectContaining({ row_id: "rc10:flt_structural_concrete", quantity: "197.0802" }),
      expect.objectContaining({ row_id: "rc10:flt_reinforcement", quantity: "26.7876" }),
      expect.objectContaining({ row_id: "rc10:flt_filter_media", quantity: "174" }),
      expect.objectContaining({ row_id: "rc10:flt_underdrain_blocks", quantity: "640" }),
      expect.objectContaining({ row_id: "rc10:flt_underdrain_nozzles", quantity: "5760" }),
      expect.objectContaining({ row_id: "rc10:flt_process_valves", quantity: "20" }),
    ]));
  });

  test("recalculates civil, process and media quantities from primary filter geometry", async () => {
    const baseline = await compileFiltrationStationR1({
      ...FILTRATION_STATION_SHORT_INPUT,
    });
    const changed = await compileFiltrationStationR1({
      ...FILTRATION_STATION_SHORT_INPUT,
      flt_filter_internal_length_m: 10,
      flt_filter_internal_width_m: 6,
    });
    const q = (result: typeof baseline, rowId: string) => Number(
      result.rows.find((row) => row.row_id === rowId)?.quantity,
    );
    expect(q(changed, "rc10:flt_excavation"))
      .toBeGreaterThan(q(baseline, "rc10:flt_excavation"));
    expect(q(changed, "rc10:flt_structural_concrete"))
      .toBeGreaterThan(q(baseline, "rc10:flt_structural_concrete"));
    expect(q(changed, "rc10:flt_filter_media"))
      .toBeGreaterThan(q(baseline, "rc10:flt_filter_media"));
    expect(q(changed, "rc10:flt_underdrain_blocks"))
      .toBeGreaterThan(q(baseline, "rc10:flt_underdrain_blocks"));
    expect(q(changed, "rc10:flt_hydraulic_loading"))
      .toBeLessThan(q(baseline, "rc10:flt_hydraulic_loading"));
  });

  test("recalculates filter-media purchase from spare, stock and supplier package", async () => {
    const changed = await compileFiltrationStationR1({
      ...FILTRATION_STATION_SHORT_INPUT,
      flt_filter_media_available_stock_t: 20,
      flt_filter_media_supplier_package_t: 25,
    });
    const q = (rowId: string) => Number(
      changed.rows.find((row) => row.row_id === rowId)?.quantity,
    );
    expect(q("rc10:flt-media-balance:installed")).toBeCloseTo(171.392, 9);
    expect(q("rc10:flt-media-balance:retained-spare")).toBe(2);
    expect(q("rc10:flt-media-balance:available-stock")).toBe(20);
    expect(q("rc10:flt-media-balance:total-need")).toBeCloseTo(173.392, 9);
    expect(q("rc10:flt-media-balance:net-order-need")).toBeCloseTo(153.392, 9);
    expect(q("rc10:flt-media-balance:package-count")).toBe(7);
    expect(q("rc10:flt_filter_media")).toBe(175);
    expect(q("rc10:flt-media-balance:remainder")).toBeCloseTo(23.608, 9);
    expect(q("rc10:flt-media-balance:surplus-beyond-spare")).toBeCloseTo(21.608, 9);
  });

  test("contains the civil, process, electrical, labor, mechanism, QA and logistics chain", () => {
    const requiredRows = [
      "rc10:flt_blinding", "rc10:flt_structural_concrete",
      "rc10:flt_reinforcement", "rc10:flt_formwork",
      "rc10:flt_internal_lining", "rc10:flt_structural_steel",
      "rc10:flt_wall_panels", "rc10:flt_roof_panels",
      "rc10:flt_filter_media", "rc10:flt_support_gravel",
      "rc10:flt_underdrain_blocks", "rc10:flt_underdrain_nozzles",
      "rc10:flt_wash_troughs", "rc10:flt_inlet_pipe",
      "rc10:flt_outlet_pipe", "rc10:flt_backwash_pipe",
      "rc10:flt_air_pipe", "rc10:flt_drain_pipe",
      "rc10:flt_process_valves", "rc10:flt_pipe_supports",
      "rc10:flt_backwash_pumps", "rc10:flt_backwash_blowers",
      "rc10:flt_flowmeters", "rc10:flt_turbidity_meters",
      "rc10:flt_mcc", "rc10:flt_plc", "rc10:flt_power_cable",
      "rc10:flt_control_cable", "rc10:flt_test_water",
      "rc10:flt_disinfection_reagent", "rc10:labor:flt-civil",
      "rc10:labor:flt-process", "rc10:labor:flt-electrical",
      "rc10:equipment:flt-excavator", "rc10:equipment:flt-crane",
      "rc10:flt_asbuilt", "rc10:flt_process_commissioning",
      "rc10:logistics:flt-concrete", "rc10:logistics:flt-media",
    ];
    expect(requiredRows.every((rowId) => FILTRATION_STATION_RESOURCES.some(
      (row) => row.row_id === rowId,
    ))).toBe(true);
  });

  test("keeps shoring, dewatering and standby power conditional", async () => {
    const result = await compileFiltrationStationR1({
      ...FILTRATION_STATION_ACCEPTANCE_INPUT,
      flt_excavation_shoring_mode: "REQUIRED",
      flt_excavation_shoring_designation: "SHEET-PILE-FILTER-HALL",
      flt_excavation_shoring_area_m2: 420,
      flt_groundwater_dewatering_mode: "REQUIRED",
      flt_groundwater_dewatering_designation: "WELLPOINT-120M3H",
      flt_groundwater_dewatering_machine_h: 180,
      flt_standby_power_mode: "REQUIRED",
      flt_standby_power_designation: "DIESEL-GENSET-800KVA-AMF",
      flt_standby_power_kva: 800,
    });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows).toHaveLength(76);
  });

  test("rejects invalid primary facts and unrelated identities", async () => {
    await expect(compileFiltrationStationR1({
      ...FILTRATION_STATION_SHORT_INPUT,
      flt_station_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileFiltrationStationR1({
      ...FILTRATION_STATION_SHORT_INPUT,
      flt_filter_media_depth_m: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileFiltrationStationR1(
      { ...FILTRATION_STATION_ACCEPTANCE_INPUT },
      { catalogId: `${FILTRATION_STATION_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("FILTRATION_STATION_CATALOG_UNSUPPORTED");
  });

  test("changes calculated outputs instead of accepting final resource quantities", async () => {
    await expect(quantity({
      ...FILTRATION_STATION_SHORT_INPUT,
      flt_filter_cell_count: 6,
    }, "rc10:flt_process_valves")).resolves.toBe(30);
  });
});
