import {
  MANHOLES_ACCEPTANCE_INPUT,
  MANHOLES_CATALOG_ID,
  MANHOLES_FORMULAS,
  MANHOLES_PARAMETERS,
  MANHOLES_RESOURCES,
  MANHOLES_RUNTIME_INPUT,
  MANHOLES_SHORT_INPUT,
  compileManholesR1,
} from "../../src/lib/estimate/v4/manholesR1";

describe("S27.24 cast-in-place RC manhole owner", () => {
  test("replaces the network template and distinguishes the structural scope", () => {
    expect(MANHOLES_CATALOG_ID).toBe("canonical-work:expanded:manholes");
    expect(MANHOLES_PARAMETERS).toHaveLength(62);
    expect(MANHOLES_FORMULAS).toHaveLength(39);
    expect(MANHOLES_RESOURCES).toHaveLength(39);
    expect(MANHOLES_RUNTIME_INPUT).toEqual({
      mnh_cover_retained_spare_piece: 0,
      mnh_cover_supplier_package_quantity_piece: 1,
    });
    expect(JSON.stringify(MANHOLES_FORMULAS)).not.toMatch(
      /\blength_m\b|ceil\(length|golden_rate|normFactor/iu,
    );
    expect(JSON.stringify(MANHOLES_RESOURCES)).not.toMatch(
      /sewer_pipe|inspection_manhole_pcs|sanitary_sewer_route/iu,
    );
  });

  test("selected manhole gives useful rows and local needs", async () => {
    const compiled = await compileManholesR1({ ...MANHOLES_SHORT_INPUT });
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.preliminaryNeeds).toHaveLength(31);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:mnh_install_acceptance", quantity: "6" }),
      expect.objectContaining({ row_id: "rc09:mnh_cover_frame", quantity: "6" }),
      expect.objectContaining({ row_id: "rc09:mnh-cover-balance:installed-net", quantity: "6" }),
    ]));
  });

  test("compiles the thirty-six-row project fixture", async () => {
    const compiled = await compileManholesR1({ ...MANHOLES_ACCEPTANCE_INPUT });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(36);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:mnh_structural_concrete", quantity: "72" }),
      expect.objectContaining({ row_id: "rc09:mnh_reinforcement", quantity: "8640" }),
      expect.objectContaining({ row_id: "rc09:mnh_formwork", quantity: "540" }),
      expect.objectContaining({ row_id: "rc09:mnh_waterstop", quantity: "144" }),
      expect.objectContaining({ row_id: "rc09:mnh_excavation", quantity: "540" }),
      expect.objectContaining({ row_id: "rc09:labor:mnh-rebar-formwork", quantity: "720" }),
      expect.objectContaining({ row_id: "rc09:equipment:mnh-concrete-pump", quantity: "72" }),
      expect.objectContaining({ row_id: "rc09:logistics:mnh-delivery", quantity: "24" }),
    ]));
  });

  test("separates installed covers from supplier-package rounding", async () => {
    const compiled = await compileManholesR1({
      ...MANHOLES_ACCEPTANCE_INPUT,
      mnh_cover_retained_spare_piece: 2,
      mnh_cover_supplier_package_quantity_piece: 4,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:mnh-cover-balance:installed-net")?.quantity).toBe("6");
    expect(rows.get("rc09:mnh-cover-balance:retained-spare")?.quantity).toBe("2");
    expect(rows.get("rc09:mnh-cover-balance:total-need")?.quantity).toBe("8");
    expect(rows.get("rc09:mnh-cover-balance:package-count")?.quantity).toBe("2");
    expect(rows.get("rc09:mnh_cover_frame")?.quantity).toBe("8");
    expect(rows.get("rc09:mnh-cover-balance:remainder")?.quantity).toBe("2");
    expect(rows.get("rc09:mnh-cover-balance:surplus-beyond-spare")?.quantity).toBe("0");
  });

  test("keeps acceptance and QA scope informational beside explicit labor", () => {
    for (const rowId of [
      "rc09:mnh_install_acceptance", "rc09:mnh_test", "rc09:mnh_asbuilt_documents",
    ]) {
      expect(MANHOLES_RESOURCES.find((row) => row.row_id === rowId)?.resource_graph)
        .toEqual(expect.objectContaining({ costTreatment: "INFORMATIONAL_SCOPE" }));
    }
  });

  test("keeps dewatering, shoring and pavement restoration conditional", async () => {
    const compiled = await compileManholesR1({
      ...MANHOLES_ACCEPTANCE_INPUT,
      mnh_dewatering_mode: "REQUIRED", mnh_dewatering_designation: "Дренажный насос по ППР",
      mnh_dewatering_machine_h: 120, mnh_shoring_mode: "REQUIRED",
      mnh_shoring_designation: "Инвентарное крепление котлованов", mnh_shoring_area_m2: 360,
      mnh_pavement_restoration_mode: "REQUIRED",
      mnh_pavement_restoration_designation: "Асфальтобетонное покрытие по ведомости",
      mnh_pavement_restoration_area_m2: 108,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(39);
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileManholesR1({
      ...MANHOLES_SHORT_INPUT, mnh_manhole_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileManholesR1(
      { ...MANHOLES_ACCEPTANCE_INPUT }, { catalogId: `${MANHOLES_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("MANHOLES_CATALOG_UNSUPPORTED");
  });
});
