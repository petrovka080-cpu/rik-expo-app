import {
  WASTEWATER_TREATMENT_PLANT_ACCEPTANCE_INPUT,
  WASTEWATER_TREATMENT_PLANT_CATALOG_ID,
  WASTEWATER_TREATMENT_PLANT_FORMULAS,
  WASTEWATER_TREATMENT_PLANT_PARAMETERS,
  WASTEWATER_TREATMENT_PLANT_RESOURCES,
  WASTEWATER_TREATMENT_PLANT_RUNTIME_INPUT,
  WASTEWATER_TREATMENT_PLANT_SHORT_INPUT,
  compileWastewaterTreatmentPlantR1,
} from "../../src/lib/estimate/v4/wastewaterTreatmentPlantR1";

describe("S27.24 wastewater treatment plant owner", () => {
  test("replaces the capacity-coefficient template with one exact two-train MBR boundary", () => {
    expect(WASTEWATER_TREATMENT_PLANT_CATALOG_ID).toBe(
      "canonical-work:expanded:wastewater_treatment_plant",
    );
    expect(WASTEWATER_TREATMENT_PLANT_PARAMETERS).toHaveLength(73);
    expect(WASTEWATER_TREATMENT_PLANT_FORMULAS).toHaveLength(46);
    expect(WASTEWATER_TREATMENT_PLANT_RESOURCES).toHaveLength(46);
    expect(WASTEWATER_TREATMENT_PLANT_RUNTIME_INPUT).toEqual({
      wtp_membrane_cassette_retained_spare_piece: 0,
      wtp_membrane_cassette_supplier_package_quantity_piece: 1,
    });
    expect(JSON.stringify(WASTEWATER_TREATMENT_PLANT_FORMULAS)).not.toMatch(
      /(?:design|peak)_flow\w*\s*\*|process_train_count\s*\*|golden_rate|normFactor/iu,
    );
    expect(JSON.stringify(WASTEWATER_TREATMENT_PLANT_RESOURCES)).not.toMatch(
      /sewer_pipe_lm|sewer_pumping_station|sludge_dewatering|rc09:sps_/iu,
    );
  });

  test("selected MBR plant gives useful rows and local project needs", async () => {
    const compiled = await compileWastewaterTreatmentPlantR1({
      ...WASTEWATER_TREATMENT_PLANT_SHORT_INPUT,
    });
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.preliminaryNeeds.length).toBeGreaterThan(0);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:wtp_acceptance", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:wtp_membrane_cassettes", quantity: "8" }),
      expect.objectContaining({ row_id: "rc09:wtp-membrane-balance:installed-net", quantity: "8" }),
    ]));
  });

  test("compiles the forty-three-row approved project fixture", async () => {
    const compiled = await compileWastewaterTreatmentPlantR1({
      ...WASTEWATER_TREATMENT_PLANT_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(43);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:wtp_screen", quantity: "2" }),
      expect.objectContaining({ row_id: "rc09:wtp_aerobic_tank", quantity: "1200" }),
      expect.objectContaining({ row_id: "rc09:wtp_aeration_diffusers", quantity: "240" }),
      expect.objectContaining({ row_id: "rc09:wtp_process_piping", quantity: "680" }),
      expect.objectContaining({ row_id: "rc09:wtp_structural_concrete", quantity: "840" }),
      expect.objectContaining({ row_id: "rc09:labor:wtp-process-mechanical", quantity: "2800" }),
      expect.objectContaining({ row_id: "rc09:equipment:wtp-crane", quantity: "280" }),
      expect.objectContaining({ row_id: "rc09:logistics:wtp-material-delivery", quantity: "96" }),
    ]));
  });

  test("separates installed membrane cassettes from supplier-package rounding", async () => {
    const compiled = await compileWastewaterTreatmentPlantR1({
      ...WASTEWATER_TREATMENT_PLANT_ACCEPTANCE_INPUT,
      wtp_membrane_cassette_retained_spare_piece: 2,
      wtp_membrane_cassette_supplier_package_quantity_piece: 3,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:wtp-membrane-balance:installed-net")?.quantity).toBe("8");
    expect(rows.get("rc09:wtp-membrane-balance:retained-spare")?.quantity).toBe("2");
    expect(rows.get("rc09:wtp-membrane-balance:total-need")?.quantity).toBe("10");
    expect(rows.get("rc09:wtp-membrane-balance:package-count")?.quantity).toBe("4");
    expect(rows.get("rc09:wtp_membrane_cassettes")?.quantity).toBe("12");
    expect(rows.get("rc09:wtp-membrane-balance:remainder")?.quantity).toBe("4");
    expect(rows.get("rc09:wtp-membrane-balance:surplus-beyond-spare")?.quantity).toBe("2");
  });

  test("keeps acceptance and QA records informational beside explicit labor", () => {
    for (const rowId of [
      "rc09:wtp_acceptance", "rc09:wtp_effluent_samples",
      "rc09:wtp_functional_tests", "rc09:wtp_asbuilt_documents",
    ]) {
      expect(WASTEWATER_TREATMENT_PLANT_RESOURCES.find((row) => row.row_id === rowId)
        ?.resource_graph).toEqual(expect.objectContaining({ costTreatment: "INFORMATIONAL_SCOPE" }));
    }
  });

  test("keeps odor control, tertiary polishing and standby power conditional", async () => {
    const compiled = await compileWastewaterTreatmentPlantR1({
      ...WASTEWATER_TREATMENT_PLANT_ACCEPTANCE_INPUT,
      wtp_odor_control_mode: "REQUIRED",
      wtp_odor_control_designation: "BIOFILTER-ODOUR-12000M3H",
      wtp_odor_control_quantity_set: 1,
      wtp_tertiary_polishing_mode: "REQUIRED",
      wtp_tertiary_polishing_designation: "DISC-FILTER-UV-POLISH",
      wtp_tertiary_polishing_capacity_m3_day: 1000,
      wtp_standby_power_mode: "REQUIRED",
      wtp_standby_power_designation: "GENSET-800KVA-AMF",
      wtp_standby_power_quantity_set: 1,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(46);
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileWastewaterTreatmentPlantR1({
      ...WASTEWATER_TREATMENT_PLANT_SHORT_INPUT,
      wtp_plant_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileWastewaterTreatmentPlantR1(
      { ...WASTEWATER_TREATMENT_PLANT_ACCEPTANCE_INPUT },
      { catalogId: `${WASTEWATER_TREATMENT_PLANT_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("WASTEWATER_TREATMENT_PLANT_CATALOG_UNSUPPORTED");
  });
});
