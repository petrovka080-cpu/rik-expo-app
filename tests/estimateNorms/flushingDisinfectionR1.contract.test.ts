import {
  FLUSHING_DISINFECTION_ACCEPTANCE_INPUT,
  FLUSHING_DISINFECTION_CATALOG_ID,
  FLUSHING_DISINFECTION_FORMULAS,
  FLUSHING_DISINFECTION_PARAMETERS,
  FLUSHING_DISINFECTION_RESOURCES,
  FLUSHING_DISINFECTION_RUNTIME_INPUT,
  FLUSHING_DISINFECTION_SHORT_INPUT,
  compileFlushingDisinfectionR1,
  parseFlushingDisinfectionOrdinaryPromptR1,
} from "../../src/lib/estimate/v4/flushingDisinfectionR1";

describe("S27.26 automatic pipeline flushing and disinfection owner", () => {
  test("asks eight primary facts and keeps execution assumptions in a visible profile", () => {
    expect(FLUSHING_DISINFECTION_CATALOG_ID).toBe(
      "canonical-work:expanded:flushing_disinfection",
    );
    expect(Object.keys(FLUSHING_DISINFECTION_SHORT_INPUT)).toHaveLength(8);
    expect(Object.keys(FLUSHING_DISINFECTION_RUNTIME_INPUT)).toHaveLength(51);
    expect(FLUSHING_DISINFECTION_PARAMETERS).toHaveLength(63);
    expect(FLUSHING_DISINFECTION_FORMULAS).toHaveLength(55);
    expect(FLUSHING_DISINFECTION_RESOURCES).toHaveLength(55);
    const ordinary = FLUSHING_DISINFECTION_PARAMETERS.slice(0, 8);
    const profile = FLUSHING_DISINFECTION_PARAMETERS.filter((parameter) =>
      parameter.truth_metadata.value_source_role
        === "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
    );
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
    expect(Object.keys(FLUSHING_DISINFECTION_SHORT_INPUT).join(" ")).not.toMatch(
      /volume|water_need|reagent_mass|labor|machine|trip|package_count/iu,
    );
  });

  test("extracts stated facts and leaves genuinely unknown method facts for the form", () => {
    expect(parseFlushingDisinfectionOrdinaryPromptR1(
      "промыть и дезинфицировать 1000 м трубопровода, внутренний диаметр 100 мм",
    )).toEqual({
      fld_pipeline_length_m: "1000",
      fld_pipeline_internal_diameter_mm: "100",
    });
    expect(parseFlushingDisinfectionOrdinaryPromptR1(
      "Промывка и дезинфекция трубопровода PE100-RC-SDR17-OD110-ID100 длиной 1000 м, внутренний диаметр 100 мм, 2 изолированных участка, гипохлорит натрия, активный хлор 50 мг/л, раствор концентрацией 12.5%, выдержка 24 ч.",
    )).toEqual(Object.fromEntries(Object.entries(FLUSHING_DISINFECTION_SHORT_INPUT)
      .map(([key, value]) => [key, String(value)])));
  });

  test("primary facts compile the complete non-conditional completion chain", async () => {
    const result = await compileFlushingDisinfectionR1({
      ...FLUSHING_DISINFECTION_SHORT_INPUT,
    });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows).toHaveLength(52);
    expect(result.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc12:fld_pipeline_volume", quantity: "7.853982" }),
      expect.objectContaining({ row_id: "rc12:fld_required_flush_flow", quantity: "28.2743352" }),
      expect.objectContaining({ row_id: "rc12:fld_flush_water", quantity: "16.17920292" }),
      expect.objectContaining({ row_id: "rc12:fld_disinfection_water", quantity: "8.08960146" }),
      expect.objectContaining({ row_id: "rc12:fld_total_water", quantity: "24.26880438" }),
      expect.objectContaining({ row_id: "rc12:fld_active_chlorine", quantity: "0.404480073" }),
      expect.objectContaining({ row_id: "rc12:fld_flushing_pumps", quantity: "2" }),
      expect.objectContaining({ row_id: "rc12:fld_lab_analyses", quantity: "8" }),
      expect.objectContaining({ row_id: "rc12:fld_reagent_order", quantity: "30" }),
    ]));
  });

  test("recalculates water, flow, reagent and equipment from pipeline geometry", async () => {
    const baseline = await compileFlushingDisinfectionR1({
      ...FLUSHING_DISINFECTION_SHORT_INPUT,
    });
    const changed = await compileFlushingDisinfectionR1({
      ...FLUSHING_DISINFECTION_SHORT_INPUT,
      fld_pipeline_length_m: 2000,
      fld_pipeline_internal_diameter_mm: 150,
    });
    const q = (result: typeof baseline, rowId: string) => Number(
      result.rows.find((row) => row.row_id === rowId)?.quantity,
    );
    expect(q(changed, "rc12:fld_pipeline_volume"))
      .toBeGreaterThan(q(baseline, "rc12:fld_pipeline_volume"));
    expect(q(changed, "rc12:fld_required_flush_flow"))
      .toBeGreaterThan(q(baseline, "rc12:fld_required_flush_flow"));
    expect(q(changed, "rc12:fld_total_water"))
      .toBeGreaterThan(q(baseline, "rc12:fld_total_water"));
    expect(q(changed, "rc12:fld_active_chlorine"))
      .toBeGreaterThan(q(baseline, "rc12:fld_active_chlorine"));
    expect(q(changed, "rc12:fld_flushing_pumps"))
      .toBeGreaterThan(q(baseline, "rc12:fld_flushing_pumps"));
  });

  test("recalculates reagent purchase from reserve, stock and supplier package", async () => {
    const changed = await compileFlushingDisinfectionR1({
      ...FLUSHING_DISINFECTION_SHORT_INPUT,
      fld_reagent_available_stock_kg: 2,
      fld_reagent_supplier_package_kg: 5,
    });
    const q = (rowId: string) => Number(
      changed.rows.find((row) => row.row_id === rowId)?.quantity,
    );
    expect(q("rc12:fld-reagent-balance:installed")).toBeCloseTo(3.235840584, 9);
    expect(q("rc12:fld-reagent-balance:retained-spare")).toBeCloseTo(0.323584058, 9);
    expect(q("rc12:fld-reagent-balance:available-stock")).toBe(2);
    expect(q("rc12:fld-reagent-balance:total-need")).toBeCloseTo(3.559424642, 9);
    expect(q("rc12:fld-reagent-balance:net-order-need")).toBeCloseTo(1.559424642, 9);
    expect(q("rc12:fld-reagent-balance:package-count")).toBe(1);
    expect(q("rc12:fld_reagent_order")).toBe(5);
    expect(q("rc12:fld-reagent-balance:remainder")).toBeCloseTo(3.764159416, 9);
    expect(q("rc12:fld-reagent-balance:surplus-beyond-spare"))
      .toBeCloseTo(3.440575358, 9);
  });

  test("contains temporary works, monitoring, laboratory, labor, equipment and records", () => {
    const requiredRows = [
      "rc12:fld_fill_connections", "rc12:fld_injection_connections",
      "rc12:fld_drain_connections", "rc12:fld_sampling_connections",
      "rc12:fld_supply_hose", "rc12:fld_discharge_hose",
      "rc12:fld_temporary_valves", "rc12:fld_backflow_preventers",
      "rc12:fld_fittings", "rc12:fld_hose_supports",
      "rc12:fld_flushing_pumps", "rc12:fld_dosing_skids",
      "rc12:fld_flowmeters", "rc12:fld_chlorine_meters",
      "rc12:fld_turbidity_meters", "rc12:fld_sample_bottles",
      "rc12:fld_dpd_kits", "rc12:fld_lab_analyses",
      "rc12:fld_ppe", "rc12:fld_spill_kits",
      "rc12:labor:fld-setup", "rc12:labor:fld-flushing",
      "rc12:labor:fld-dosing", "rc12:labor:fld-sampling",
      "rc12:equipment:fld-pumps", "rc12:equipment:fld-dosing",
      "rc12:fld_asbuilt", "rc12:fld_acceptance_protocol",
      "rc12:logistics:fld-reagent", "rc12:logistics:fld-equipment",
    ];
    expect(requiredRows.every((rowId) => FLUSHING_DISINFECTION_RESOURCES.some(
      (row) => row.row_id === rowId,
    ))).toBe(true);
    expect(JSON.stringify(FLUSHING_DISINFECTION_FORMULAS)).not.toMatch(
      /villageWaterSupplyCalculator|trench|backfill|hydrant|pressure_testing|hydro_testing/iu,
    );
  });

  test("keeps water delivery, disposal and dechlorination conditional", async () => {
    const result = await compileFlushingDisinfectionR1({
      ...FLUSHING_DISINFECTION_ACCEPTANCE_INPUT,
      fld_water_source_mode: "TANKER",
      fld_water_tanker_designation: "POTABLE-WATER-TANKER-10M3",
      fld_disposal_mode: "TANKER",
      fld_disposal_tanker_designation: "WASH-WATER-TANKER-10M3",
      fld_dechlorination_mode: "REQUIRED",
      fld_dechlorination_reagent_designation: "SODIUM-THIOSULFATE-TECHNICAL",
      fld_dechlorination_kg_per_active_chlorine_kg: 7,
    });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows).toHaveLength(55);
  });

  test("rejects invalid primary facts and unrelated identities", async () => {
    await expect(compileFlushingDisinfectionR1({
      ...FLUSHING_DISINFECTION_SHORT_INPUT,
      fld_pipeline_length_m: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileFlushingDisinfectionR1({
      ...FLUSHING_DISINFECTION_SHORT_INPUT,
      fld_solution_concentration_percent: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileFlushingDisinfectionR1(
      { ...FLUSHING_DISINFECTION_ACCEPTANCE_INPUT },
      { catalogId: `${FLUSHING_DISINFECTION_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("FLUSHING_DISINFECTION_CATALOG_UNSUPPORTED");
  });
});
