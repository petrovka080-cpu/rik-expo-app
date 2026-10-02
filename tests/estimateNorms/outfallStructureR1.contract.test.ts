import {
  OUTFALL_STRUCTURE_ACCEPTANCE_INPUT, OUTFALL_STRUCTURE_CATALOG_ID,
  OUTFALL_STRUCTURE_FORMULAS, OUTFALL_STRUCTURE_PARAMETERS,
  OUTFALL_STRUCTURE_RESOURCES, OUTFALL_STRUCTURE_RUNTIME_INPUT,
  OUTFALL_STRUCTURE_SHORT_INPUT, compileOutfallStructureR1,
} from "../../src/lib/estimate/v4/outfallStructureR1";

describe("S27.24 outfall structure owner", () => {
  test("replaces the whole-network template with one exact outfall boundary", () => {
    expect(OUTFALL_STRUCTURE_CATALOG_ID).toBe("canonical-work:expanded:outfall_structure");
    expect(OUTFALL_STRUCTURE_PARAMETERS).toHaveLength(55);
    expect(OUTFALL_STRUCTURE_FORMULAS).toHaveLength(36);
    expect(OUTFALL_STRUCTURE_RESOURCES).toHaveLength(36);
    expect(OUTFALL_STRUCTURE_RUNTIME_INPUT).toEqual({
      out_concrete_process_allowance_m3: 0, out_concrete_supplier_batch_m3: 1,
    });
    expect(JSON.stringify(OUTFALL_STRUCTURE_FORMULAS)).not.toMatch(
      /structure_count\s*\*|structure_(?:length|width|height)_m\s*\*|golden_rate|normFactor/iu,
    );
    expect(JSON.stringify(OUTFALL_STRUCTURE_RESOURCES)).not.toMatch(
      /sewer_pipe_lm|inspection_manhole|hydraulic_testing_lm|rc09:pbb_|rc09:hyd_/iu,
    );
  });

  test("selected outfall gives useful rows and local needs", async () => {
    const compiled = await compileOutfallStructureR1({ ...OUTFALL_STRUCTURE_SHORT_INPUT });
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.preliminaryNeeds.length).toBeGreaterThan(0);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:out_acceptance", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:out_structural_concrete", quantity: "28" }),
      expect.objectContaining({ row_id: "rc09:out-concrete-balance:installed-net", quantity: "28" }),
    ]));
  });

  test("compiles the thirty-three-row project fixture", async () => {
    const compiled = await compileOutfallStructureR1({ ...OUTFALL_STRUCTURE_ACCEPTANCE_INPUT });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(33);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:out_rebar", quantity: "3800" }),
      expect.objectContaining({ row_id: "rc09:out_formwork", quantity: "220" }),
      expect.objectContaining({ row_id: "rc09:out_apron_material", quantity: "65" }),
      expect.objectContaining({ row_id: "rc09:labor:out-formwork-rebar", quantity: "256" }),
      expect.objectContaining({ row_id: "rc09:equipment:out-crane", quantity: "72" }),
      expect.objectContaining({ row_id: "rc09:logistics:out-material-delivery", quantity: "18" }),
    ]));
  });

  test("separates placed concrete from supplier-batch rounding", async () => {
    const compiled = await compileOutfallStructureR1({
      ...OUTFALL_STRUCTURE_ACCEPTANCE_INPUT,
      out_concrete_process_allowance_m3: 1.5, out_concrete_supplier_batch_m3: 8,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:out-concrete-balance:installed-net")?.quantity).toBe("28");
    expect(rows.get("rc09:out-concrete-balance:process-allowance")?.quantity).toBe("1.5");
    expect(rows.get("rc09:out-concrete-balance:total-need")?.quantity).toBe("29.5");
    expect(rows.get("rc09:out-concrete-balance:batch-count")?.quantity).toBe("4");
    expect(rows.get("rc09:out_structural_concrete")?.quantity).toBe("32");
    expect(rows.get("rc09:out-concrete-balance:remainder")?.quantity).toBe("4");
    expect(rows.get("rc09:out-concrete-balance:surplus-beyond-allowance")?.quantity).toBe("2.5");
  });

  test("keeps acceptance and QA rows informational beside explicit labor", () => {
    for (const rowId of ["rc09:out_acceptance", "rc09:out_concrete_tests",
      "rc09:out_survey_control", "rc09:out_asbuilt_documents"]) {
      expect(OUTFALL_STRUCTURE_RESOURCES.find((row) => row.row_id === rowId)
        ?.resource_graph).toEqual(expect.objectContaining({ costTreatment: "INFORMATIONAL_SCOPE" }));
    }
  });

  test("keeps dewatering, bank protection and live tie-in conditional", async () => {
    const compiled = await compileOutfallStructureR1({
      ...OUTFALL_STRUCTURE_ACCEPTANCE_INPUT,
      out_dewatering_mode: "REQUIRED", out_dewatering_designation: "SUMP-PUMP-80",
      out_dewatering_machine_h: 96,
      out_bank_protection_mode: "REQUIRED", out_bank_protection_designation: "GABION-MAT-300",
      out_bank_protection_area_m2: 180,
      out_live_tie_in_mode: "REQUIRED", out_live_tie_in_designation: "LIVE-TIE-IN-DN600",
      out_live_tie_in_count: 1,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(36);
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileOutfallStructureR1({
      ...OUTFALL_STRUCTURE_SHORT_INPUT, out_structure_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileOutfallStructureR1(
      { ...OUTFALL_STRUCTURE_ACCEPTANCE_INPUT },
      { catalogId: `${OUTFALL_STRUCTURE_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("OUTFALL_STRUCTURE_CATALOG_UNSUPPORTED");
  });
});
