import {
  AERATION_TANKS_ACCEPTANCE_INPUT, AERATION_TANKS_CATALOG_ID,
  AERATION_TANKS_FORMULAS, AERATION_TANKS_PARAMETERS, AERATION_TANKS_RESOURCES,
  AERATION_TANKS_RUNTIME_INPUT, AERATION_TANKS_SHORT_INPUT, compileAerationTanksR1,
} from "../../src/lib/estimate/v4/aerationTanksR1";

describe("S27.24 aeration tanks owner", () => {
  test("replaces the capacity-coefficient template with one exact fine-bubble tank boundary", () => {
    expect(AERATION_TANKS_CATALOG_ID).toBe("canonical-work:expanded:aeration_tanks");
    expect(AERATION_TANKS_PARAMETERS).toHaveLength(61);
    expect(AERATION_TANKS_FORMULAS).toHaveLength(39);
    expect(AERATION_TANKS_RESOURCES).toHaveLength(39);
    expect(AERATION_TANKS_RUNTIME_INPUT).toEqual({
      aer_diffuser_retained_spare_piece: 0,
      aer_diffuser_supplier_package_quantity_piece: 1,
    });
    expect(JSON.stringify(AERATION_TANKS_FORMULAS)).not.toMatch(
      /tank_(?:length|width)\w*\s*\*|process_train_count\s*\*|design_air_flow\w*\s*\*|golden_rate|normFactor/iu,
    );
    expect(JSON.stringify(AERATION_TANKS_RESOURCES)).not.toMatch(
      /wtp_membrane|wtp_uv|sludge_dewatering|sewer_pipe_lm|rc09:wtp_/iu,
    );
  });

  test("selected tanks give useful rows and local project needs", async () => {
    const compiled = await compileAerationTanksR1({ ...AERATION_TANKS_SHORT_INPUT });
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.preliminaryNeeds.length).toBeGreaterThan(0);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:aer_acceptance", quantity: "2" }),
      expect.objectContaining({ row_id: "rc09:aer_diffusers", quantity: "240" }),
      expect.objectContaining({ row_id: "rc09:aer-diffuser-balance:installed-net", quantity: "240" }),
    ]));
  });

  test("compiles the thirty-four-row approved project fixture", async () => {
    const compiled = await compileAerationTanksR1({ ...AERATION_TANKS_ACCEPTANCE_INPUT });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(34);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:aer_structural_concrete", quantity: "980" }),
      expect.objectContaining({ row_id: "rc09:aer_air_headers", quantity: "520" }),
      expect.objectContaining({ row_id: "rc09:aer_header_supports", quantity: "180" }),
      expect.objectContaining({ row_id: "rc09:aer_internal_cable", quantity: "460" }),
      expect.objectContaining({ row_id: "rc09:labor:aer-diffuser-grid", quantity: "1280" }),
      expect.objectContaining({ row_id: "rc09:equipment:aer-crane", quantity: "180" }),
      expect.objectContaining({ row_id: "rc09:logistics:aer-material-delivery", quantity: "72" }),
    ]));
  });

  test("separates installed diffusers from supplier-package rounding", async () => {
    const compiled = await compileAerationTanksR1({
      ...AERATION_TANKS_ACCEPTANCE_INPUT,
      aer_diffuser_retained_spare_piece: 10,
      aer_diffuser_supplier_package_quantity_piece: 20,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:aer-diffuser-balance:installed-net")?.quantity).toBe("240");
    expect(rows.get("rc09:aer-diffuser-balance:retained-spare")?.quantity).toBe("10");
    expect(rows.get("rc09:aer-diffuser-balance:total-need")?.quantity).toBe("250");
    expect(rows.get("rc09:aer-diffuser-balance:package-count")?.quantity).toBe("13");
    expect(rows.get("rc09:aer_diffusers")?.quantity).toBe("260");
    expect(rows.get("rc09:aer-diffuser-balance:remainder")?.quantity).toBe("20");
    expect(rows.get("rc09:aer-diffuser-balance:surplus-beyond-spare")?.quantity).toBe("10");
  });

  test("keeps acceptance and QA records informational beside explicit labor", () => {
    for (const rowId of ["rc09:aer_acceptance", "rc09:aer_leak_tests",
      "rc09:aer_air_distribution_tests", "rc09:aer_asbuilt_documents"]) {
      expect(AERATION_TANKS_RESOURCES.find((row) => row.row_id === rowId)
        ?.resource_graph).toEqual(expect.objectContaining({ costTreatment: "INFORMATIONAL_SCOPE" }));
    }
  });

  test("keeps neighboring equipment and temporary operations conditional", async () => {
    const compiled = await compileAerationTanksR1({
      ...AERATION_TANKS_ACCEPTANCE_INPUT,
      aer_blower_mode: "INCLUDED", aer_blower_designation: "BLOWER-75KW-VFD",
      aer_blower_quantity_piece: 3,
      aer_mixer_mode: "INCLUDED", aer_mixer_designation: "MIXER-7.5KW",
      aer_mixer_quantity_piece: 4,
      aer_recycle_pump_mode: "INCLUDED", aer_recycle_pump_designation: "RECYCLE-Q80-H8",
      aer_recycle_pump_quantity_piece: 3,
      aer_draining_bypass_mode: "REQUIRED", aer_draining_bypass_designation: "BYPASS-Q100",
      aer_draining_bypass_machine_h: 96,
      aer_odor_control_mode: "REQUIRED", aer_odor_control_designation: "BIOFILTER-8000M3H",
      aer_odor_control_quantity_set: 1,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(39);
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileAerationTanksR1({
      ...AERATION_TANKS_SHORT_INPUT, aer_tank_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileAerationTanksR1(
      { ...AERATION_TANKS_ACCEPTANCE_INPUT },
      { catalogId: `${AERATION_TANKS_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("AERATION_TANKS_CATALOG_UNSUPPORTED");
  });
});
