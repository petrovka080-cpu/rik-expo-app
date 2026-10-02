import {
  BOREHOLE_WATER_SUPPLY_ACCEPTANCE_INPUT,
  BOREHOLE_WATER_SUPPLY_CATALOG_ID,
  BOREHOLE_WATER_SUPPLY_FORMULAS,
  BOREHOLE_WATER_SUPPLY_PARAMETERS,
  BOREHOLE_WATER_SUPPLY_RESOURCES,
  BOREHOLE_WATER_SUPPLY_RUNTIME_INPUT,
  BOREHOLE_WATER_SUPPLY_SHORT_INPUT,
  compileBoreholeWaterSupplyR1,
} from "../../src/lib/estimate/v4/boreholeWaterSupplyR1";

describe("S27.24 production borehole water-supply owner", () => {
  test("replaces the generic well calculator with one exact project boundary", () => {
    expect(BOREHOLE_WATER_SUPPLY_CATALOG_ID)
      .toBe("canonical-work:expanded:borehole_water_supply");
    expect(BOREHOLE_WATER_SUPPLY_PARAMETERS).toHaveLength(67);
    expect(BOREHOLE_WATER_SUPPLY_FORMULAS).toHaveLength(45);
    expect(BOREHOLE_WATER_SUPPLY_RESOURCES).toHaveLength(45);
    expect(BOREHOLE_WATER_SUPPLY_RUNTIME_INPUT).toEqual({
      bh_casing_retained_spare_m: 0,
      bh_casing_supplier_joint_length_m: 1,
    });
    expect(JSON.stringify(BOREHOLE_WATER_SUPPLY_FORMULAS)).not.toMatch(
      /80\s*\*|length_m\s*\*|wellConstructionCalculator|golden_rate|normFactor/iu,
    );
    expect(JSON.stringify(BOREHOLE_WATER_SUPPLY_RESOURCES.map((row) => row.row_id)))
      .not.toMatch(/village_water|distribution|reservoir|treatment_plant|sewer/iu);
  });

  test("selected production borehole gives useful rows and local project needs", async () => {
    const compiled = await compileBoreholeWaterSupplyR1({
      ...BOREHOLE_WATER_SUPPLY_SHORT_INPUT,
    });
    expect(compiled.rows).toHaveLength(13);
    expect(compiled.preliminaryNeeds).toHaveLength(32);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:bh_acceptance", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:bh_drilling", quantity: "180" }),
      expect.objectContaining({ row_id: "rc09:bh_casing", quantity: "180" }),
      expect.objectContaining({ row_id: "rc09:bh_screen", quantity: "36" }),
      expect.objectContaining({ row_id: "rc09:bh_submersible_pump", quantity: "1" }),
    ]));
  });

  test("compiles the forty-two-row approved project fixture", async () => {
    const compiled = await compileBoreholeWaterSupplyR1({
      ...BOREHOLE_WATER_SUPPLY_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(42);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:bh_gravel_pack", quantity: "28" }),
      expect.objectContaining({ row_id: "rc09:bh_annular_grout", quantity: "42" }),
      expect.objectContaining({ row_id: "rc09:labor:bh-drilling", quantity: "1600" }),
      expect.objectContaining({ row_id: "rc09:equipment:bh-drilling-rig", quantity: "720" }),
      expect.objectContaining({ row_id: "rc09:logistics:bh-material-delivery", quantity: "32" }),
    ]));
  });

  test("separates installed casing from supplier-joint rounding", async () => {
    const compiled = await compileBoreholeWaterSupplyR1({
      ...BOREHOLE_WATER_SUPPLY_ACCEPTANCE_INPUT,
      bh_casing_retained_spare_m: 12,
      bh_casing_supplier_joint_length_m: 6,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:bh-casing-balance:installed-net")?.quantity).toBe("180");
    expect(rows.get("rc09:bh-casing-balance:retained-spare")?.quantity).toBe("12");
    expect(rows.get("rc09:bh-casing-balance:total-need")?.quantity).toBe("192");
    expect(rows.get("rc09:bh-casing-balance:joint-count")?.quantity).toBe("32");
    expect(rows.get("rc09:bh_casing")?.quantity).toBe("192");
    expect(rows.get("rc09:bh-casing-balance:remainder")?.quantity).toBe("12");
    expect(rows.get("rc09:bh-casing-balance:surplus-beyond-spare")?.quantity).toBe("0");
  });

  test("keeps acceptance and quality records informational beside explicit labor", () => {
    for (const rowId of [
      "rc09:bh_acceptance", "rc09:bh_drilling", "rc09:bh_development",
      "rc09:bh_test_pumping", "rc09:bh_water_analysis", "rc09:bh_disinfection",
      "rc09:bh_electrical_tests", "rc09:bh_asbuilt_documents",
    ]) {
      expect(BOREHOLE_WATER_SUPPLY_RESOURCES.find((row) => row.row_id === rowId)
        ?.resource_graph).toEqual(expect.objectContaining({
        costTreatment: "INFORMATIONAL_SCOPE",
      }));
    }
  });

  test("keeps access, drilling-fluid disposal and standby power conditional", async () => {
    const compiled = await compileBoreholeWaterSupplyR1({
      ...BOREHOLE_WATER_SUPPLY_ACCEPTANCE_INPUT,
      bh_temporary_access_mode: "REQUIRED",
      bh_temporary_access_designation: "ROAD-MAT-HEAVY-DUTY",
      bh_temporary_access_area_m2: 1200,
      bh_drilling_fluid_disposal_mode: "REQUIRED",
      bh_drilling_fluid_disposal_designation: "LICENSED-DRILLING-SLURRY-DISPOSAL",
      bh_drilling_fluid_disposal_trip_count: 60,
      bh_standby_power_mode: "REQUIRED",
      bh_standby_power_designation: "GENSET-250KVA",
      bh_standby_power_machine_h: 240,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(45);
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileBoreholeWaterSupplyR1({
      ...BOREHOLE_WATER_SUPPLY_SHORT_INPUT,
      bh_borehole_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileBoreholeWaterSupplyR1(
      { ...BOREHOLE_WATER_SUPPLY_ACCEPTANCE_INPUT },
      { catalogId: `${BOREHOLE_WATER_SUPPLY_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("BOREHOLE_WATER_SUPPLY_CATALOG_UNSUPPORTED");
  });
});
