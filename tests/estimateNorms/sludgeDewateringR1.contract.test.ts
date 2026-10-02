import { SLUDGE_DEWATERING_ACCEPTANCE_INPUT, SLUDGE_DEWATERING_CATALOG_ID,
  SLUDGE_DEWATERING_FORMULAS, SLUDGE_DEWATERING_PARAMETERS, SLUDGE_DEWATERING_RESOURCES,
  SLUDGE_DEWATERING_RUNTIME_INPUT, SLUDGE_DEWATERING_SHORT_INPUT, compileSludgeDewateringR1,
} from "../../src/lib/estimate/v4/sludgeDewateringR1";

describe("S27.24 sludge dewatering owner", () => {
  test("replaces the capacity template with one exact screw-press package boundary", () => {
    expect(SLUDGE_DEWATERING_CATALOG_ID).toBe("canonical-work:expanded:sludge_dewatering");
    expect(SLUDGE_DEWATERING_PARAMETERS).toHaveLength(62);
    expect(SLUDGE_DEWATERING_FORMULAS).toHaveLength(41);
    expect(SLUDGE_DEWATERING_RESOURCES).toHaveLength(41);
    expect(SLUDGE_DEWATERING_RUNTIME_INPUT).toEqual({
      sdw_press_unit_retained_spare_piece: 0,
      sdw_press_unit_supplier_package_quantity_piece: 1,
    });
    expect(JSON.stringify(SLUDGE_DEWATERING_FORMULAS)).not.toMatch(
      /sludge_feed_flow\w*\s*\*|dry_solids\w*\s*\*|operating_hours\w*\s*\*|golden_rate|normFactor/iu,
    );
    expect(JSON.stringify(SLUDGE_DEWATERING_RESOURCES.map((row) => row.row_id))).not.toMatch(
      /wtp_membrane|aer_diffuser|sludge_digestion|drying_bed|incineration/iu,
    );
  });
  test("selected package gives useful rows and local project needs", async () => {
    const compiled = await compileSludgeDewateringR1({ ...SLUDGE_DEWATERING_SHORT_INPUT });
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.preliminaryNeeds.length).toBeGreaterThan(0);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:sdw_acceptance", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:sdw_press_units", quantity: "2" }),
      expect.objectContaining({ row_id: "rc09:sdw-press-balance:installed-net", quantity: "2" }),
    ]));
  });
  test("compiles the thirty-eight-row approved project fixture", async () => {
    const compiled = await compileSludgeDewateringR1({ ...SLUDGE_DEWATERING_ACCEPTANCE_INPUT });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(38);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:sdw_feed_pumps", quantity: "3" }),
      expect.objectContaining({ row_id: "rc09:sdw_process_piping", quantity: "190" }),
      expect.objectContaining({ row_id: "rc09:sdw_base_concrete", quantity: "18" }),
      expect.objectContaining({ row_id: "rc09:sdw_commissioning_polymer", quantity: "280" }),
      expect.objectContaining({ row_id: "rc09:labor:sdw-mechanical-installation", quantity: "420" }),
      expect.objectContaining({ row_id: "rc09:equipment:sdw-crane", quantity: "56" }),
      expect.objectContaining({ row_id: "rc09:logistics:sdw-material-delivery", quantity: "28" }),
    ]));
  });
  test("separates installed presses from supplier-package rounding", async () => {
    const compiled = await compileSludgeDewateringR1({
      ...SLUDGE_DEWATERING_ACCEPTANCE_INPUT,
      sdw_press_unit_retained_spare_piece: 1,
      sdw_press_unit_supplier_package_quantity_piece: 2,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:sdw-press-balance:installed-net")?.quantity).toBe("2");
    expect(rows.get("rc09:sdw-press-balance:retained-spare")?.quantity).toBe("1");
    expect(rows.get("rc09:sdw-press-balance:total-need")?.quantity).toBe("3");
    expect(rows.get("rc09:sdw-press-balance:package-count")?.quantity).toBe("2");
    expect(rows.get("rc09:sdw_press_units")?.quantity).toBe("4");
    expect(rows.get("rc09:sdw-press-balance:remainder")?.quantity).toBe("2");
    expect(rows.get("rc09:sdw-press-balance:surplus-beyond-spare")?.quantity).toBe("1");
  });
  test("keeps acceptance and QA records informational beside explicit labor", () => {
    for (const rowId of ["rc09:sdw_acceptance", "rc09:sdw_cake_samples",
      "rc09:sdw_functional_tests", "rc09:sdw_asbuilt_documents"]) {
      expect(SLUDGE_DEWATERING_RESOURCES.find((row) => row.row_id === rowId)
        ?.resource_graph).toEqual(expect.objectContaining({ costTreatment: "INFORMATIONAL_SCOPE" }));
    }
  });
  test("keeps odor, cake storage and standby power conditional", async () => {
    const compiled = await compileSludgeDewateringR1({
      ...SLUDGE_DEWATERING_ACCEPTANCE_INPUT,
      sdw_odor_control_mode: "REQUIRED", sdw_odor_control_designation: "CARBON-FILTER-5000",
      sdw_odor_control_quantity_set: 1,
      sdw_cake_storage_mode: "INCLUDED", sdw_cake_storage_designation: "CAKE-BIN-20M3",
      sdw_cake_storage_quantity_set: 2,
      sdw_standby_power_mode: "REQUIRED", sdw_standby_power_designation: "GENSET-250KVA",
      sdw_standby_power_quantity_set: 1,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(41);
  });
  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileSludgeDewateringR1({
      ...SLUDGE_DEWATERING_SHORT_INPUT, sdw_system_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileSludgeDewateringR1(
      { ...SLUDGE_DEWATERING_ACCEPTANCE_INPUT },
      { catalogId: `${SLUDGE_DEWATERING_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("SLUDGE_DEWATERING_CATALOG_UNSUPPORTED");
  });
});
