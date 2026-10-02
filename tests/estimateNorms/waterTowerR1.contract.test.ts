import {
  WATER_TOWER_ACCEPTANCE_INPUT, WATER_TOWER_CATALOG_ID, WATER_TOWER_FORMULAS,
  WATER_TOWER_PARAMETERS, WATER_TOWER_RESOURCES, WATER_TOWER_RUNTIME_INPUT,
  WATER_TOWER_SHORT_INPUT, compileWaterTowerR1,
} from "../../src/lib/estimate/v4/waterTowerR1";

describe("S27.24 water-tower owner", () => {
  test("replaces the village-network calculator with one exact tower boundary", () => {
    expect(WATER_TOWER_CATALOG_ID).toBe("canonical-work:expanded:water_tower");
    expect(WATER_TOWER_PARAMETERS).toHaveLength(65);
    expect(WATER_TOWER_FORMULAS).toHaveLength(45);
    expect(WATER_TOWER_RESOURCES).toHaveLength(45);
    expect(WATER_TOWER_RUNTIME_INPUT).toEqual({
      wt_coating_retained_spare_area_m2: 0,
      wt_coating_supplier_package_coverage_m2: 1,
    });
    expect(JSON.stringify(WATER_TOWER_FORMULAS)).not.toMatch(
      /tank_capacity\w*\s*\*|support_height\w*\s*\*|length_m\s*\*\s*0\.|villageWaterSupply|golden_rate|normFactor/iu,
    );
    expect(JSON.stringify(WATER_TOWER_RESOURCES.map((row) => row.row_id)))
      .not.toMatch(/trench|hydrant|manhole|village_water|water_intake|treatment_plant|reservoir|sewer/iu);
  });

  test("selected tower gives useful rows and local project needs", async () => {
    const compiled = await compileWaterTowerR1({ ...WATER_TOWER_SHORT_INPUT });
    expect(compiled.rows).toHaveLength(11);
    expect(compiled.preliminaryNeeds).toHaveLength(34);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:wt_acceptance", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:wt_tower_assembly", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:wt_coating", quantity: "620" }),
      expect.objectContaining({ row_id: "rc09:wt_riser_pipe", quantity: "38" }),
      expect.objectContaining({ row_id: "rc09:wt_overflow_pipe", quantity: "22" }),
    ]));
  });

  test("compiles the forty-two-row approved project fixture", async () => {
    const compiled = await compileWaterTowerR1({ ...WATER_TOWER_ACCEPTANCE_INPUT });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(42);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:wt_foundation_concrete", quantity: "145" }),
      expect.objectContaining({ row_id: "rc09:wt_rebar", quantity: "18500" }),
      expect.objectContaining({ row_id: "rc09:wt_anchor_bolts", quantity: "24" }),
      expect.objectContaining({ row_id: "rc09:wt_level_controls", quantity: "2" }),
      expect.objectContaining({ row_id: "rc09:labor:wt-civil", quantity: "2400" }),
      expect.objectContaining({ row_id: "rc09:equipment:wt-crane", quantity: "160" }),
      expect.objectContaining({ row_id: "rc09:logistics:wt-material-delivery", quantity: "32" }),
    ]));
  });

  test("separates applied coating from supplier-package rounding", async () => {
    const compiled = await compileWaterTowerR1({
      ...WATER_TOWER_ACCEPTANCE_INPUT,
      wt_coating_retained_spare_area_m2: 20,
      wt_coating_supplier_package_coverage_m2: 25,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:wt-coating-balance:installed-net")?.quantity).toBe("620");
    expect(rows.get("rc09:wt-coating-balance:retained-spare")?.quantity).toBe("20");
    expect(rows.get("rc09:wt-coating-balance:total-need")?.quantity).toBe("640");
    expect(rows.get("rc09:wt-coating-balance:package-count")?.quantity).toBe("26");
    expect(rows.get("rc09:wt_coating")?.quantity).toBe("650");
    expect(rows.get("rc09:wt-coating-balance:remainder")?.quantity).toBe("30");
    expect(rows.get("rc09:wt-coating-balance:surplus-beyond-spare")?.quantity).toBe("10");
  });

  test("keeps acceptance and QA records informational beside explicit labor", () => {
    for (const rowId of ["rc09:wt_acceptance", "rc09:wt_hydrostatic_tests",
      "rc09:wt_disinfection_cycles", "rc09:wt_electrical_tests",
      "rc09:wt_water_quality_tests", "rc09:wt_asbuilt_documents"]) {
      expect(WATER_TOWER_RESOURCES.find((row) => row.row_id === rowId)
        ?.resource_graph).toEqual(expect.objectContaining({
        costTreatment: "INFORMATIONAL_SCOPE",
      }));
    }
  });

  test("keeps shoring, dewatering and road reinstatement conditional", async () => {
    const compiled = await compileWaterTowerR1({
      ...WATER_TOWER_ACCEPTANCE_INPUT,
      wt_excavation_shoring_mode: "REQUIRED",
      wt_excavation_shoring_designation: "SHEET-PILE-LIGHT",
      wt_excavation_shoring_area_m2: 600,
      wt_groundwater_dewatering_mode: "REQUIRED",
      wt_groundwater_dewatering_designation: "WELLPOINT-60M3H",
      wt_groundwater_dewatering_machine_h: 120,
      wt_road_reinstatement_mode: "REQUIRED",
      wt_road_reinstatement_designation: "ASPHALT-2L-ROAD-REINSTATEMENT",
      wt_road_reinstatement_area_m2: 300,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(45);
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileWaterTowerR1({
      ...WATER_TOWER_SHORT_INPUT, wt_tower_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileWaterTowerR1(
      { ...WATER_TOWER_ACCEPTANCE_INPUT },
      { catalogId: `${WATER_TOWER_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("WATER_TOWER_CATALOG_UNSUPPORTED");
  });
});
