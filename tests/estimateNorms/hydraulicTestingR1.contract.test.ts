import {
  HYDRAULIC_TESTING_ACCEPTANCE_INPUT, HYDRAULIC_TESTING_CATALOG_ID,
  HYDRAULIC_TESTING_FORMULAS, HYDRAULIC_TESTING_PARAMETERS,
  HYDRAULIC_TESTING_RESOURCES, HYDRAULIC_TESTING_RUNTIME_INPUT,
  HYDRAULIC_TESTING_SHORT_INPUT, compileHydraulicTestingR1,
} from "../../src/lib/estimate/v4/hydraulicTestingR1";

describe("S27.24 hydraulic testing owner", () => {
  test("replaces the whole-network template with an exact pressure-test boundary", () => {
    expect(HYDRAULIC_TESTING_CATALOG_ID).toBe("canonical-work:expanded:hydraulic_testing");
    expect(HYDRAULIC_TESTING_PARAMETERS).toHaveLength(45);
    expect(HYDRAULIC_TESTING_FORMULAS).toHaveLength(31);
    expect(HYDRAULIC_TESTING_RESOURCES).toHaveLength(31);
    expect(HYDRAULIC_TESTING_RUNTIME_INPUT).toEqual({
      hyd_closure_retained_spare_piece: 0,
      hyd_closure_supplier_package_quantity_piece: 1,
    });
    expect(JSON.stringify(HYDRAULIC_TESTING_FORMULAS)).not.toMatch(
      /tested_length_m\s*\*|route_length_m\s*\*|ceil\(route_length|golden_rate|normFactor/iu,
    );
    expect(JSON.stringify(HYDRAULIC_TESTING_RESOURCES)).not.toMatch(
      /sewer_pipe_lm|inspection_manhole|rc09:pbb_|rc09:mnh_/iu,
    );
  });

  test("selected pressure-test scope gives useful rows and local needs", async () => {
    const compiled = await compileHydraulicTestingR1({ ...HYDRAULIC_TESTING_SHORT_INPUT });
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.preliminaryNeeds.length).toBeGreaterThan(0);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:hyd_acceptance", quantity: "1200" }),
      expect.objectContaining({ row_id: "rc09:hyd_closures", quantity: "8" }),
      expect.objectContaining({ row_id: "rc09:hyd-closure-balance:installed-net", quantity: "8" }),
    ]));
  });

  test("compiles the twenty-eight-row project fixture", async () => {
    const compiled = await compileHydraulicTestingR1({ ...HYDRAULIC_TESTING_ACCEPTANCE_INPUT });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(28);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:hyd_pressure_gauges", quantity: "8" }),
      expect.objectContaining({ row_id: "rc09:hyd_recorder", quantity: "4" }),
      expect.objectContaining({ row_id: "rc09:hyd_fill_water", quantity: "75" }),
      expect.objectContaining({ row_id: "rc09:labor:hyd-filling-pressurizing", quantity: "120" }),
      expect.objectContaining({ row_id: "rc09:equipment:hyd-pressure-test-pump", quantity: "80" }),
      expect.objectContaining({ row_id: "rc09:logistics:hyd-water", quantity: "8" }),
    ]));
  });

  test("separates installed closures from supplier-package rounding", async () => {
    const compiled = await compileHydraulicTestingR1({
      ...HYDRAULIC_TESTING_ACCEPTANCE_INPUT,
      hyd_closure_retained_spare_piece: 2,
      hyd_closure_supplier_package_quantity_piece: 4,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:hyd-closure-balance:installed-net")?.quantity).toBe("8");
    expect(rows.get("rc09:hyd-closure-balance:retained-spare")?.quantity).toBe("2");
    expect(rows.get("rc09:hyd-closure-balance:total-need")?.quantity).toBe("10");
    expect(rows.get("rc09:hyd-closure-balance:package-count")?.quantity).toBe("3");
    expect(rows.get("rc09:hyd_closures")?.quantity).toBe("12");
    expect(rows.get("rc09:hyd-closure-balance:remainder")?.quantity).toBe("4");
    expect(rows.get("rc09:hyd-closure-balance:surplus-beyond-spare")?.quantity).toBe("2");
  });

  test("keeps acceptance and QA records informational beside explicit labor", () => {
    for (const rowId of ["rc09:hyd_acceptance", "rc09:hyd_leak_checks",
      "rc09:hyd_pressure_records", "rc09:hyd_acceptance_documents"]) {
      expect(HYDRAULIC_TESTING_RESOURCES.find((row) => row.row_id === rowId)
        ?.resource_graph).toEqual(expect.objectContaining({ costTreatment: "INFORMATIONAL_SCOPE" }));
    }
  });

  test("keeps imported water, treatment and off-site disposal conditional", async () => {
    const compiled = await compileHydraulicTestingR1({
      ...HYDRAULIC_TESTING_ACCEPTANCE_INPUT,
      hyd_imported_water_mode: "REQUIRED", hyd_imported_water_designation: "TANKER-POTABLE",
      hyd_imported_water_volume_m3: 75,
      hyd_water_treatment_mode: "REQUIRED", hyd_water_treatment_designation: "NEUTRALIZATION-PACK",
      hyd_water_treatment_volume_m3: 75,
      hyd_offsite_disposal_mode: "REQUIRED", hyd_offsite_disposal_designation: "LICENSED-WATER-FACILITY",
      hyd_offsite_disposal_volume_m3: 75,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(31);
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileHydraulicTestingR1({
      ...HYDRAULIC_TESTING_SHORT_INPUT, hyd_tested_length_m: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileHydraulicTestingR1(
      { ...HYDRAULIC_TESTING_ACCEPTANCE_INPUT },
      { catalogId: `${HYDRAULIC_TESTING_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("HYDRAULIC_TESTING_CATALOG_UNSUPPORTED");
  });
});
