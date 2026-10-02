import {
  SEPTIC_TREATMENT_FACILITY_ACCEPTANCE_INPUT, SEPTIC_TREATMENT_FACILITY_CATALOG_ID,
  SEPTIC_TREATMENT_FACILITY_FORMULAS, SEPTIC_TREATMENT_FACILITY_PARAMETERS,
  SEPTIC_TREATMENT_FACILITY_RESOURCES, SEPTIC_TREATMENT_FACILITY_RUNTIME_INPUT,
  SEPTIC_TREATMENT_FACILITY_SHORT_INPUT, compileSepticTreatmentFacilityR1,
} from "../../src/lib/estimate/v4/septicTreatmentFacilityR1";

describe("S27.24 septic treatment facility owner", () => {
  test("replaces the capacity template with one exact three-chamber septic boundary", () => {
    expect(SEPTIC_TREATMENT_FACILITY_CATALOG_ID)
      .toBe("canonical-work:expanded:septic_treatment_facility");
    expect(SEPTIC_TREATMENT_FACILITY_PARAMETERS).toHaveLength(58);
    expect(SEPTIC_TREATMENT_FACILITY_FORMULAS).toHaveLength(42);
    expect(SEPTIC_TREATMENT_FACILITY_RESOURCES).toHaveLength(42);
    expect(SEPTIC_TREATMENT_FACILITY_RUNTIME_INPUT).toEqual({
      stf_ring_retained_spare_piece: 0,
      stf_ring_supplier_package_quantity_piece: 1,
    });
    expect(JSON.stringify(SEPTIC_TREATMENT_FACILITY_FORMULAS)).not.toMatch(
      /design_flow\w*\s*\*|working_volume\w*\s*\*|chamber_count\s*\*|golden_rate|normFactor/iu,
    );
    expect(JSON.stringify(SEPTIC_TREATMENT_FACILITY_RESOURCES.map((row) => row.row_id)))
      .not.toMatch(/wtp_membrane|aer_diffuser|sdw_press|sewer_pipe_lm|stt_waterstop/iu);
  });

  test("selected facility gives useful rows and local project needs", async () => {
    const compiled = await compileSepticTreatmentFacilityR1({
      ...SEPTIC_TREATMENT_FACILITY_SHORT_INPUT,
    });
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.preliminaryNeeds.length).toBeGreaterThan(0);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:stf_acceptance", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:stf_rings", quantity: "18" }),
      expect.objectContaining({
        row_id: "rc09:stf-ring-balance:installed-net", quantity: "18",
      }),
    ]));
  });

  test("compiles the thirty-nine-row approved project fixture", async () => {
    const compiled = await compileSepticTreatmentFacilityR1({
      ...SEPTIC_TREATMENT_FACILITY_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(39);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:stf_excavation", quantity: "850" }),
      expect.objectContaining({ row_id: "rc09:stf_base_slab_concrete", quantity: "45" }),
      expect.objectContaining({ row_id: "rc09:stf_cover_slabs", quantity: "3" }),
      expect.objectContaining({ row_id: "rc09:stf_internal_piping", quantity: "85" }),
      expect.objectContaining({
        row_id: "rc09:labor:stf-precast-installation", quantity: "680",
      }),
      expect.objectContaining({ row_id: "rc09:equipment:stf-crane", quantity: "72" }),
      expect.objectContaining({
        row_id: "rc09:logistics:stf-material-delivery", quantity: "22",
      }),
    ]));
  });

  test("separates installed rings from supplier-package rounding", async () => {
    const compiled = await compileSepticTreatmentFacilityR1({
      ...SEPTIC_TREATMENT_FACILITY_ACCEPTANCE_INPUT,
      stf_ring_retained_spare_piece: 1,
      stf_ring_supplier_package_quantity_piece: 4,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:stf-ring-balance:installed-net")?.quantity).toBe("18");
    expect(rows.get("rc09:stf-ring-balance:retained-spare")?.quantity).toBe("1");
    expect(rows.get("rc09:stf-ring-balance:total-need")?.quantity).toBe("19");
    expect(rows.get("rc09:stf-ring-balance:package-count")?.quantity).toBe("5");
    expect(rows.get("rc09:stf_rings")?.quantity).toBe("20");
    expect(rows.get("rc09:stf-ring-balance:remainder")?.quantity).toBe("2");
    expect(rows.get("rc09:stf-ring-balance:surplus-beyond-spare")?.quantity).toBe("1");
  });

  test("keeps acceptance and QA records informational beside explicit labor", () => {
    for (const rowId of ["rc09:stf_acceptance", "rc09:stf_concrete_tests",
      "rc09:stf_watertightness_tests", "rc09:stf_internal_piping_tests",
      "rc09:stf_asbuilt_documents"]) {
      expect(SEPTIC_TREATMENT_FACILITY_RESOURCES.find((row) => row.row_id === rowId)
        ?.resource_graph).toEqual(expect.objectContaining({ costTreatment: "INFORMATIONAL_SCOPE" }));
    }
  });

  test("keeps shoring, dewatering and dispersal field conditional", async () => {
    const compiled = await compileSepticTreatmentFacilityR1({
      ...SEPTIC_TREATMENT_FACILITY_ACCEPTANCE_INPUT,
      stf_excavation_shoring_mode: "REQUIRED",
      stf_excavation_shoring_designation: "SHEET-PILE-LIGHT",
      stf_excavation_shoring_area_m2: 320,
      stf_groundwater_dewatering_mode: "REQUIRED",
      stf_groundwater_dewatering_designation: "WELLPOINT-60M3H",
      stf_groundwater_dewatering_machine_h: 120,
      stf_effluent_dispersal_mode: "INCLUDED",
      stf_effluent_dispersal_designation: "INFILTRATION-MODULE-240",
      stf_effluent_dispersal_area_m2: 240,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(42);
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileSepticTreatmentFacilityR1({
      ...SEPTIC_TREATMENT_FACILITY_SHORT_INPUT, stf_facility_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileSepticTreatmentFacilityR1(
      { ...SEPTIC_TREATMENT_FACILITY_ACCEPTANCE_INPUT },
      { catalogId: `${SEPTIC_TREATMENT_FACILITY_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("SEPTIC_TREATMENT_FACILITY_CATALOG_UNSUPPORTED");
  });
});
