import {
  RAINWATER_INLETS_ACCEPTANCE_INPUT,
  RAINWATER_INLETS_CATALOG_ID,
  RAINWATER_INLETS_FORMULAS,
  RAINWATER_INLETS_PARAMETERS,
  RAINWATER_INLETS_RESOURCES,
  RAINWATER_INLETS_RUNTIME_INPUT,
  RAINWATER_INLETS_SHORT_INPUT,
  compileRainwaterInletsR1,
} from "../../src/lib/estimate/v4/rainwaterInletsR1";

describe("S27.24 rainwater-inlet assembly owner", () => {
  test("replaces the network template and generic route coefficients", () => {
    expect(RAINWATER_INLETS_CATALOG_ID).toBe("canonical-work:expanded:rainwater_inlets");
    expect(RAINWATER_INLETS_PARAMETERS).toHaveLength(45);
    expect(RAINWATER_INLETS_FORMULAS).toHaveLength(31);
    expect(RAINWATER_INLETS_RESOURCES).toHaveLength(31);
    expect(RAINWATER_INLETS_RUNTIME_INPUT).toEqual({
      rwi_body_retained_spare_piece: 0,
      rwi_body_supplier_package_quantity_piece: 1,
    });
    expect(JSON.stringify(RAINWATER_INLETS_FORMULAS)).not.toMatch(
      /length_m|ceil\(5\s*\/\s*4\)|golden_rate|normFactor/iu,
    );
    expect(JSON.stringify(RAINWATER_INLETS_RESOURCES)).not.toMatch(
      /stormwater_pipe|stormwater_manholes|silt_traps|outlet_structure/iu,
    );
  });

  test("selected inlet assembly gives useful rows and local needs", async () => {
    const compiled = await compileRainwaterInletsR1({ ...RAINWATER_INLETS_SHORT_INPUT });
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.preliminaryNeeds).toHaveLength(23);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:rwi_install_acceptance", quantity: "28" }),
      expect.objectContaining({ row_id: "rc09:rwi_body", quantity: "28" }),
      expect.objectContaining({ row_id: "rc09:rwi-body-balance:installed-net", quantity: "28" }),
    ]));
  });

  test("compiles the twenty-eight-row project fixture", async () => {
    const compiled = await compileRainwaterInletsR1({ ...RAINWATER_INLETS_ACCEPTANCE_INPUT });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(28);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:rwi_grating", quantity: "28" }),
      expect.objectContaining({ row_id: "rc09:rwi_silt_basket", quantity: "28" }),
      expect.objectContaining({ row_id: "rc09:rwi_bedding", quantity: "8.4" }),
      expect.objectContaining({ row_id: "rc09:rwi_setting_mortar", quantity: "420" }),
      expect.objectContaining({ row_id: "rc09:rwi_excavation", quantity: "56" }),
      expect.objectContaining({ row_id: "rc09:labor:rwi-install", quantity: "168" }),
      expect.objectContaining({ row_id: "rc09:equipment:rwi-crane", quantity: "28" }),
      expect.objectContaining({ row_id: "rc09:logistics:rwi-delivery", quantity: "4" }),
    ]));
  });

  test("separates installed bodies from supplier-package rounding", async () => {
    const compiled = await compileRainwaterInletsR1({
      ...RAINWATER_INLETS_ACCEPTANCE_INPUT,
      rwi_body_retained_spare_piece: 3,
      rwi_body_supplier_package_quantity_piece: 4,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:rwi-body-balance:installed-net")?.quantity).toBe("28");
    expect(rows.get("rc09:rwi-body-balance:retained-spare")?.quantity).toBe("3");
    expect(rows.get("rc09:rwi-body-balance:total-need")?.quantity).toBe("31");
    expect(rows.get("rc09:rwi-body-balance:package-count")?.quantity).toBe("8");
    expect(rows.get("rc09:rwi_body")?.quantity).toBe("32");
    expect(rows.get("rc09:rwi-body-balance:remainder")?.quantity).toBe("4");
    expect(rows.get("rc09:rwi-body-balance:surplus-beyond-spare")?.quantity).toBe("1");
  });

  test("keeps acceptance and QA scope informational beside explicit labor", () => {
    for (const rowId of ["rc09:rwi_install_acceptance", "rc09:rwi_flow_test",
      "rc09:rwi_asbuilt_documents"]) {
      expect(RAINWATER_INLETS_RESOURCES.find((row) => row.row_id === rowId)
        ?.resource_graph).toEqual(expect.objectContaining({ costTreatment: "INFORMATIONAL_SCOPE" }));
    }
  });

  test("keeps dewatering, shoring and pavement restoration conditional", async () => {
    const compiled = await compileRainwaterInletsR1({
      ...RAINWATER_INLETS_ACCEPTANCE_INPUT,
      rwi_dewatering_mode: "REQUIRED",
      rwi_dewatering_designation: "Дренажный насос по ППР",
      rwi_dewatering_machine_h: 48,
      rwi_shoring_mode: "REQUIRED",
      rwi_shoring_designation: "Инвентарное крепление котлованов",
      rwi_shoring_area_m2: 112,
      rwi_pavement_restoration_mode: "REQUIRED",
      rwi_pavement_restoration_designation: "Асфальтобетонное покрытие по ведомости",
      rwi_pavement_restoration_area_m2: 84,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(31);
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileRainwaterInletsR1({
      ...RAINWATER_INLETS_SHORT_INPUT, rwi_inlet_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileRainwaterInletsR1(
      { ...RAINWATER_INLETS_ACCEPTANCE_INPUT },
      { catalogId: `${RAINWATER_INLETS_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("RAINWATER_INLETS_CATALOG_UNSUPPORTED");
  });
});
