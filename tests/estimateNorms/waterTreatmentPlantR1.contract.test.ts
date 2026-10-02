import {
  WATER_TREATMENT_PLANT_ACCEPTANCE_INPUT, WATER_TREATMENT_PLANT_CATALOG_ID,
  WATER_TREATMENT_PLANT_FORMULAS, WATER_TREATMENT_PLANT_PARAMETERS,
  WATER_TREATMENT_PLANT_RESOURCES, WATER_TREATMENT_PLANT_RUNTIME_INPUT,
  WATER_TREATMENT_PLANT_SHORT_INPUT, compileWaterTreatmentPlantR1,
} from "../../src/lib/estimate/v4/waterTreatmentPlantR1";

describe("S27.24 potable water-treatment-plant owner", () => {
  test("replaces the capacity calculator with one exact process boundary", () => {
    expect(WATER_TREATMENT_PLANT_CATALOG_ID)
      .toBe("canonical-work:expanded:water_treatment_plant");
    expect(WATER_TREATMENT_PLANT_PARAMETERS).toHaveLength(66);
    expect(WATER_TREATMENT_PLANT_FORMULAS).toHaveLength(45);
    expect(WATER_TREATMENT_PLANT_RESOURCES).toHaveLength(45);
    expect(WATER_TREATMENT_PLANT_RUNTIME_INPUT).toEqual({
      wtp_filter_media_retained_spare_t: 0,
      wtp_filter_media_supplier_package_mass_t: 1,
    });
    expect(JSON.stringify(WATER_TREATMENT_PLANT_FORMULAS)).not.toMatch(
      /design_capacity\w*\s*\*|capacity_m3_day\s*\*|waterTreatmentPlantCalculator|golden_rate|normFactor/iu,
    );
    expect(JSON.stringify(WATER_TREATMENT_PLANT_RESOURCES.map((row) => row.row_id)))
      .not.toMatch(/water_intake|village_water|reservoir|water_tower|wastewater|sewer/iu);
  });

  test("selected process gives useful rows and local project needs", async () => {
    const compiled = await compileWaterTreatmentPlantR1({
      ...WATER_TREATMENT_PLANT_SHORT_INPUT,
    });
    expect(compiled.rows).toHaveLength(11);
    expect(compiled.preliminaryNeeds).toHaveLength(34);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:wtp_acceptance", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:wtp_raw_water_pumps", quantity: "4" }),
      expect.objectContaining({ row_id: "rc09:wtp_treated_water_pumps", quantity: "4" }),
      expect.objectContaining({ row_id: "rc09:wtp_filter_media", quantity: "80" }),
      expect.objectContaining({ row_id: "rc09:wtp_filters", quantity: "4" }),
    ]));
  });

  test("compiles the forty-two-row approved project fixture", async () => {
    const compiled = await compileWaterTreatmentPlantR1({
      ...WATER_TREATMENT_PLANT_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(42);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:wtp_clarifiers", quantity: "2" }),
      expect.objectContaining({ row_id: "rc09:wtp_process_piping", quantity: "620" }),
      expect.objectContaining({ row_id: "rc09:wtp_structural_concrete", quantity: "3200" }),
      expect.objectContaining({ row_id: "rc09:wtp_rebar", quantity: "430000" }),
      expect.objectContaining({ row_id: "rc09:labor:wtp-mechanical", quantity: "6800" }),
      expect.objectContaining({ row_id: "rc09:equipment:wtp-crane", quantity: "780" }),
      expect.objectContaining({ row_id: "rc09:logistics:wtp-material-delivery", quantity: "320" }),
    ]));
  });

  test("separates installed media from supplier-package rounding", async () => {
    const compiled = await compileWaterTreatmentPlantR1({
      ...WATER_TREATMENT_PLANT_ACCEPTANCE_INPUT,
      wtp_filter_media_retained_spare_t: 4,
      wtp_filter_media_supplier_package_mass_t: 0.5,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:wtp-media-balance:installed-net")?.quantity).toBe("80");
    expect(rows.get("rc09:wtp-media-balance:retained-spare")?.quantity).toBe("4");
    expect(rows.get("rc09:wtp-media-balance:total-need")?.quantity).toBe("84");
    expect(rows.get("rc09:wtp-media-balance:package-count")?.quantity).toBe("168");
    expect(rows.get("rc09:wtp_filter_media")?.quantity).toBe("84");
    expect(rows.get("rc09:wtp-media-balance:remainder")?.quantity).toBe("4");
    expect(rows.get("rc09:wtp-media-balance:surplus-beyond-spare")?.quantity).toBe("0");
  });

  test("keeps acceptance and QA records informational beside explicit labor", () => {
    for (const rowId of ["rc09:wtp_acceptance",
      "rc09:wtp_mechanical_commissioning_tests", "rc09:wtp_electrical_tests",
      "rc09:wtp_water_quality_tests", "rc09:wtp_asbuilt_documents"]) {
      expect(WATER_TREATMENT_PLANT_RESOURCES.find((row) => row.row_id === rowId)
        ?.resource_graph).toEqual(expect.objectContaining({
        costTreatment: "INFORMATIONAL_SCOPE",
      }));
    }
  });

  test("keeps shoring, dewatering and road reinstatement conditional", async () => {
    const compiled = await compileWaterTreatmentPlantR1({
      ...WATER_TREATMENT_PLANT_ACCEPTANCE_INPUT,
      wtp_excavation_shoring_mode: "REQUIRED",
      wtp_excavation_shoring_designation: "SHEET-PILE-AZ18",
      wtp_excavation_shoring_area_m2: 4000,
      wtp_groundwater_dewatering_mode: "REQUIRED",
      wtp_groundwater_dewatering_designation: "WELLPOINT-240M3H",
      wtp_groundwater_dewatering_machine_h: 1800,
      wtp_road_reinstatement_mode: "REQUIRED",
      wtp_road_reinstatement_designation: "ASPHALT-2L-ROAD-REINSTATEMENT",
      wtp_road_reinstatement_area_m2: 1800,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(45);
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileWaterTreatmentPlantR1({
      ...WATER_TREATMENT_PLANT_SHORT_INPUT, wtp_facility_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileWaterTreatmentPlantR1(
      { ...WATER_TREATMENT_PLANT_ACCEPTANCE_INPUT },
      { catalogId: `${WATER_TREATMENT_PLANT_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("WATER_TREATMENT_PLANT_CATALOG_UNSUPPORTED");
  });
});
