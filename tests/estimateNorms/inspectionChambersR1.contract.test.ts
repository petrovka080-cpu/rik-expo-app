import {
  INSPECTION_CHAMBERS_ACCEPTANCE_INPUT,
  INSPECTION_CHAMBERS_CATALOG_ID,
  INSPECTION_CHAMBERS_FORMULAS,
  INSPECTION_CHAMBERS_PARAMETERS,
  INSPECTION_CHAMBERS_RESOURCES,
  INSPECTION_CHAMBERS_RUNTIME_INPUT,
  INSPECTION_CHAMBERS_SHORT_INPUT,
  compileInspectionChambersR1,
} from "../../src/lib/estimate/v4/inspectionChambersR1";

describe("S27.24 inspection-chamber assembly owner", () => {
  test("replaces the whole-network template and generic route coefficients", () => {
    expect(INSPECTION_CHAMBERS_CATALOG_ID).toBe(
      "canonical-work:expanded:inspection_chambers",
    );
    expect(INSPECTION_CHAMBERS_PARAMETERS).toHaveLength(55);
    expect(INSPECTION_CHAMBERS_FORMULAS).toHaveLength(36);
    expect(INSPECTION_CHAMBERS_RESOURCES).toHaveLength(36);
    expect(INSPECTION_CHAMBERS_RUNTIME_INPUT).toEqual({
      ich_body_retained_spare_piece: 0,
      ich_body_supplier_package_quantity_piece: 1,
    });
    expect(JSON.stringify(INSPECTION_CHAMBERS_FORMULAS)).not.toMatch(
      /length_m|ceil\(length|golden_rate|normFactor/iu,
    );
    expect(JSON.stringify(INSPECTION_CHAMBERS_RESOURCES)).not.toMatch(
      /sewer_pipe|sanitary_sewer_route|manhole_spacing/iu,
    );
  });

  test("selected chamber assembly gives useful rows and local needs", async () => {
    const compiled = await compileInspectionChambersR1({
      ...INSPECTION_CHAMBERS_SHORT_INPUT,
    });
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.preliminaryNeeds).toHaveLength(28);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:ich_install_acceptance", quantity: "12" }),
      expect.objectContaining({ row_id: "rc09:ich_body", quantity: "12" }),
      expect.objectContaining({ row_id: "rc09:ich-body-balance:installed-net", quantity: "12" }),
    ]));
  });

  test("compiles the thirty-three-row project fixture", async () => {
    const compiled = await compileInspectionChambersR1({
      ...INSPECTION_CHAMBERS_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(33);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:ich_base_slab", quantity: "12" }),
      expect.objectContaining({ row_id: "rc09:ich_steps", quantity: "72" }),
      expect.objectContaining({ row_id: "rc09:ich_benching_concrete", quantity: "9.6" }),
      expect.objectContaining({ row_id: "rc09:ich_waterproofing", quantity: "216" }),
      expect.objectContaining({ row_id: "rc09:ich_excavation", quantity: "360" }),
      expect.objectContaining({ row_id: "rc09:labor:ich-install", quantity: "360" }),
      expect.objectContaining({ row_id: "rc09:equipment:ich-crane", quantity: "84" }),
      expect.objectContaining({ row_id: "rc09:logistics:ich-delivery", quantity: "18" }),
    ]));
  });

  test("separates installed bodies from supplier-package rounding", async () => {
    const compiled = await compileInspectionChambersR1({
      ...INSPECTION_CHAMBERS_ACCEPTANCE_INPUT,
      ich_body_retained_spare_piece: 1,
      ich_body_supplier_package_quantity_piece: 2,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:ich-body-balance:installed-net")?.quantity).toBe("12");
    expect(rows.get("rc09:ich-body-balance:retained-spare")?.quantity).toBe("1");
    expect(rows.get("rc09:ich-body-balance:total-need")?.quantity).toBe("13");
    expect(rows.get("rc09:ich-body-balance:package-count")?.quantity).toBe("7");
    expect(rows.get("rc09:ich_body")?.quantity).toBe("14");
    expect(rows.get("rc09:ich-body-balance:remainder")?.quantity).toBe("2");
    expect(rows.get("rc09:ich-body-balance:surplus-beyond-spare")?.quantity).toBe("1");
  });

  test("keeps acceptance and QA scope informational beside explicit labor", () => {
    for (const rowId of [
      "rc09:ich_install_acceptance", "rc09:ich_test", "rc09:ich_asbuilt_documents",
    ]) {
      expect(INSPECTION_CHAMBERS_RESOURCES.find((row) => row.row_id === rowId)
        ?.resource_graph).toEqual(expect.objectContaining({
          costTreatment: "INFORMATIONAL_SCOPE",
        }));
    }
  });

  test("keeps dewatering, shoring and pavement restoration conditional", async () => {
    const compiled = await compileInspectionChambersR1({
      ...INSPECTION_CHAMBERS_ACCEPTANCE_INPUT,
      ich_dewatering_mode: "REQUIRED",
      ich_dewatering_designation: "Дренажный насос по ППР",
      ich_dewatering_machine_h: 96,
      ich_shoring_mode: "REQUIRED",
      ich_shoring_designation: "Инвентарное крепление котлованов",
      ich_shoring_area_m2: 480,
      ich_pavement_restoration_mode: "REQUIRED",
      ich_pavement_restoration_designation: "Асфальтобетонное покрытие по ведомости",
      ich_pavement_restoration_area_m2: 144,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(36);
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileInspectionChambersR1({
      ...INSPECTION_CHAMBERS_SHORT_INPUT,
      ich_chamber_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileInspectionChambersR1(
      { ...INSPECTION_CHAMBERS_ACCEPTANCE_INPUT },
      { catalogId: `${INSPECTION_CHAMBERS_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("INSPECTION_CHAMBERS_CATALOG_UNSUPPORTED");
  });
});
