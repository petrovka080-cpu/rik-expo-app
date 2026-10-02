import {
  SEWAGE_TREATMENT_TANKS_ACCEPTANCE_INPUT, SEWAGE_TREATMENT_TANKS_CATALOG_ID,
  SEWAGE_TREATMENT_TANKS_FORMULAS, SEWAGE_TREATMENT_TANKS_PARAMETERS,
  SEWAGE_TREATMENT_TANKS_RESOURCES, SEWAGE_TREATMENT_TANKS_RUNTIME_INPUT,
  SEWAGE_TREATMENT_TANKS_SHORT_INPUT, compileSewageTreatmentTanksR1,
} from "../../src/lib/estimate/v4/sewageTreatmentTanksR1";

describe("S27.24 sewage treatment tanks owner", () => {
  test("replaces the capacity template with one exact reinforced-concrete tank boundary", () => {
    expect(SEWAGE_TREATMENT_TANKS_CATALOG_ID)
      .toBe("canonical-work:expanded:sewage_treatment_tanks");
    expect(SEWAGE_TREATMENT_TANKS_PARAMETERS).toHaveLength(57);
    expect(SEWAGE_TREATMENT_TANKS_FORMULAS).toHaveLength(41);
    expect(SEWAGE_TREATMENT_TANKS_RESOURCES).toHaveLength(41);
    expect(SEWAGE_TREATMENT_TANKS_RUNTIME_INPUT).toEqual({
      stt_waterstop_retained_spare_m: 0,
      stt_waterstop_supplier_coil_length_m: 1,
    });
    expect(JSON.stringify(SEWAGE_TREATMENT_TANKS_FORMULAS)).not.toMatch(
      /tank_(?:length|width)\w*\s*\*|operating_liquid_depth\w*\s*\*|golden_rate|normFactor/iu,
    );
    expect(JSON.stringify(SEWAGE_TREATMENT_TANKS_RESOURCES.map((row) => row.row_id))).not.toMatch(
      /wtp_membrane|aer_diffuser|sdw_press|septic|sewer_pipe_lm/iu,
    );
  });

  test("selected tanks give useful rows and local project needs", async () => {
    const compiled = await compileSewageTreatmentTanksR1({
      ...SEWAGE_TREATMENT_TANKS_SHORT_INPUT,
    });
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.preliminaryNeeds.length).toBeGreaterThan(0);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:stt_acceptance", quantity: "2" }),
      expect.objectContaining({ row_id: "rc09:stt_waterstop", quantity: "260" }),
      expect.objectContaining({
        row_id: "rc09:stt-waterstop-balance:installed-net", quantity: "260",
      }),
    ]));
  });

  test("compiles the thirty-eight-row approved project fixture", async () => {
    const compiled = await compileSewageTreatmentTanksR1({
      ...SEWAGE_TREATMENT_TANKS_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(38);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:stt_excavation", quantity: "2200" }),
      expect.objectContaining({ row_id: "rc09:stt_structural_concrete", quantity: "760" }),
      expect.objectContaining({ row_id: "rc09:stt_reinforcement", quantity: "112000" }),
      expect.objectContaining({ row_id: "rc09:stt_penetration_sleeves", quantity: "36" }),
      expect.objectContaining({
        row_id: "rc09:labor:stt-reinforcement-formwork", quantity: "4600",
      }),
      expect.objectContaining({ row_id: "rc09:equipment:stt-crane", quantity: "140" }),
      expect.objectContaining({
        row_id: "rc09:logistics:stt-material-delivery", quantity: "64",
      }),
    ]));
  });

  test("separates installed waterstop from supplier-coil rounding", async () => {
    const compiled = await compileSewageTreatmentTanksR1({
      ...SEWAGE_TREATMENT_TANKS_ACCEPTANCE_INPUT,
      stt_waterstop_retained_spare_m: 10,
      stt_waterstop_supplier_coil_length_m: 25,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:stt-waterstop-balance:installed-net")?.quantity).toBe("260");
    expect(rows.get("rc09:stt-waterstop-balance:retained-spare")?.quantity).toBe("10");
    expect(rows.get("rc09:stt-waterstop-balance:total-need")?.quantity).toBe("270");
    expect(rows.get("rc09:stt-waterstop-balance:package-count")?.quantity).toBe("11");
    expect(rows.get("rc09:stt_waterstop")?.quantity).toBe("275");
    expect(rows.get("rc09:stt-waterstop-balance:remainder")?.quantity).toBe("15");
    expect(rows.get("rc09:stt-waterstop-balance:surplus-beyond-spare")?.quantity).toBe("5");
  });

  test("keeps acceptance and QA records informational beside explicit labor", () => {
    for (const rowId of ["rc09:stt_acceptance", "rc09:stt_concrete_tests",
      "rc09:stt_watertightness_tests", "rc09:stt_coating_inspections",
      "rc09:stt_asbuilt_documents"]) {
      expect(SEWAGE_TREATMENT_TANKS_RESOURCES.find((row) => row.row_id === rowId)
        ?.resource_graph).toEqual(expect.objectContaining({ costTreatment: "INFORMATIONAL_SCOPE" }));
    }
  });

  test("keeps shoring, dewatering and odor cover conditional", async () => {
    const compiled = await compileSewageTreatmentTanksR1({
      ...SEWAGE_TREATMENT_TANKS_ACCEPTANCE_INPUT,
      stt_excavation_shoring_mode: "REQUIRED",
      stt_excavation_shoring_designation: "SHEET-PILE-AZ18",
      stt_excavation_shoring_area_m2: 850,
      stt_groundwater_dewatering_mode: "REQUIRED",
      stt_groundwater_dewatering_designation: "WELLPOINT-120M3H",
      stt_groundwater_dewatering_machine_h: 220,
      stt_odor_cover_mode: "INCLUDED", stt_odor_cover_designation: "FRP-ODOR-COVER",
      stt_odor_cover_area_m2: 288,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(41);
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileSewageTreatmentTanksR1({
      ...SEWAGE_TREATMENT_TANKS_SHORT_INPUT, stt_tank_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileSewageTreatmentTanksR1(
      { ...SEWAGE_TREATMENT_TANKS_ACCEPTANCE_INPUT },
      { catalogId: `${SEWAGE_TREATMENT_TANKS_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("SEWAGE_TREATMENT_TANKS_CATALOG_UNSUPPORTED");
  });
});
