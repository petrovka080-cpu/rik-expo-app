import {
  WELL_CONSTRUCTION_ACCEPTANCE_INPUT,
  WELL_CONSTRUCTION_CATALOG_ID,
  WELL_CONSTRUCTION_FORMULAS,
  WELL_CONSTRUCTION_PARAMETERS,
  WELL_CONSTRUCTION_RESOURCES,
  WELL_CONSTRUCTION_RUNTIME_INPUT,
  WELL_CONSTRUCTION_SHORT_INPUT,
  compileWellConstructionR1,
} from "../../src/lib/estimate/v4/wellConstructionR1";

describe("S27.24 shallow shaft water-intake-well owner", () => {
  test("replaces the generic drilled-well calculator with one exact shaft-well boundary", () => {
    expect(WELL_CONSTRUCTION_CATALOG_ID).toBe("canonical-work:expanded:well_construction");
    expect(WELL_CONSTRUCTION_PARAMETERS).toHaveLength(68);
    expect(WELL_CONSTRUCTION_FORMULAS).toHaveLength(45);
    expect(WELL_CONSTRUCTION_RESOURCES).toHaveLength(45);
    expect(WELL_CONSTRUCTION_RUNTIME_INPUT).toEqual({
      wiw_joint_seal_retained_spare_m: 0,
      wiw_joint_seal_supplier_roll_length_m: 1,
    });
    expect(JSON.stringify(WELL_CONSTRUCTION_FORMULAS)).not.toMatch(
      /80\s*\*|length_m\s*\*|wellConstructionCalculator|golden_rate|normFactor/iu,
    );
    expect(JSON.stringify(WELL_CONSTRUCTION_RESOURCES.map((row) => row.row_id)))
      .not.toMatch(/borehole|distribution|reservoir|treatment_plant|sewer/iu);
  });

  test("selected shallow shaft well gives useful rows and local project needs", async () => {
    const compiled = await compileWellConstructionR1({ ...WELL_CONSTRUCTION_SHORT_INPUT });
    expect(compiled.rows).toHaveLength(13);
    expect(compiled.preliminaryNeeds).toHaveLength(32);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:wiw_acceptance", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:wiw_shaft_excavation", quantity: "18" }),
      expect.objectContaining({ row_id: "rc09:wiw_lining_rings", quantity: "20" }),
      expect.objectContaining({ row_id: "rc09:wiw_joint_seal", quantity: "65" }),
      expect.objectContaining({ row_id: "rc09:wiw_pumps", quantity: "2" }),
    ]));
  });

  test("compiles the forty-two-row approved shaft-well project", async () => {
    const compiled = await compileWellConstructionR1({
      ...WELL_CONSTRUCTION_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(42);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:wiw_base_filter_gravel", quantity: "12" }),
      expect.objectContaining({ row_id: "rc09:wiw_sanitary_clay_seal", quantity: "22" }),
      expect.objectContaining({ row_id: "rc09:labor:wiw-excavation-lining", quantity: "960" }),
      expect.objectContaining({ row_id: "rc09:equipment:wiw-excavator-crane", quantity: "240" }),
      expect.objectContaining({ row_id: "rc09:logistics:wiw-material-delivery", quantity: "24" }),
    ]));
  });

  test("separates installed joint seal from supplier-roll rounding", async () => {
    const compiled = await compileWellConstructionR1({
      ...WELL_CONSTRUCTION_ACCEPTANCE_INPUT,
      wiw_joint_seal_retained_spare_m: 5,
      wiw_joint_seal_supplier_roll_length_m: 20,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:wiw-seal-balance:installed-net")?.quantity).toBe("65");
    expect(rows.get("rc09:wiw-seal-balance:retained-spare")?.quantity).toBe("5");
    expect(rows.get("rc09:wiw-seal-balance:total-need")?.quantity).toBe("70");
    expect(rows.get("rc09:wiw-seal-balance:roll-count")?.quantity).toBe("4");
    expect(rows.get("rc09:wiw_joint_seal")?.quantity).toBe("80");
    expect(rows.get("rc09:wiw-seal-balance:remainder")?.quantity).toBe("15");
    expect(rows.get("rc09:wiw-seal-balance:surplus-beyond-spare")?.quantity).toBe("10");
  });

  test("keeps acceptance and quality records informational beside explicit labor", () => {
    for (const rowId of [
      "rc09:wiw_acceptance", "rc09:wiw_shaft_excavation", "rc09:wiw_cleaning",
      "rc09:wiw_pumping_test", "rc09:wiw_water_analysis", "rc09:wiw_disinfection",
      "rc09:wiw_electrical_tests", "rc09:wiw_asbuilt_documents",
    ]) {
      expect(WELL_CONSTRUCTION_RESOURCES.find((row) => row.row_id === rowId)
        ?.resource_graph).toEqual(expect.objectContaining({
        costTreatment: "INFORMATIONAL_SCOPE",
      }));
    }
  });

  test("keeps shaft shoring, extra dewatering and temporary access conditional", async () => {
    const compiled = await compileWellConstructionR1({
      ...WELL_CONSTRUCTION_ACCEPTANCE_INPUT,
      wiw_excavation_shoring_mode: "REQUIRED",
      wiw_excavation_shoring_designation: "HYDRAULIC-SHAFT-SHORING",
      wiw_excavation_shoring_area_m2: 140,
      wiw_groundwater_dewatering_mode: "REQUIRED",
      wiw_groundwater_dewatering_designation: "WELLPOINT-80M3H",
      wiw_groundwater_dewatering_machine_h: 240,
      wiw_temporary_access_mode: "REQUIRED",
      wiw_temporary_access_designation: "ROAD-MAT-HEAVY-DUTY",
      wiw_temporary_access_area_m2: 600,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(45);
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileWellConstructionR1({
      ...WELL_CONSTRUCTION_SHORT_INPUT,
      wiw_well_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileWellConstructionR1(
      { ...WELL_CONSTRUCTION_ACCEPTANCE_INPUT },
      { catalogId: `${WELL_CONSTRUCTION_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("WELL_CONSTRUCTION_CATALOG_UNSUPPORTED");
  });
});
