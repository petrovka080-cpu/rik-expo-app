import {
  VALVES_CHAMBERS_ACCEPTANCE_INPUT,
  VALVES_CHAMBERS_CATALOG_ID,
  VALVES_CHAMBERS_FORMULAS,
  VALVES_CHAMBERS_PARAMETERS,
  VALVES_CHAMBERS_RESOURCES,
  VALVES_CHAMBERS_RUNTIME_CLASSIFICATION,
  VALVES_CHAMBERS_RUNTIME_INPUT,
  VALVES_CHAMBERS_SHORT_INPUT,
  compileValvesChambersR1,
} from "../../src/lib/estimate/v4/valvesChambersR1";

const quantity = async (input: Record<string, unknown>, rowId: string) => {
  const result = await compileValvesChambersR1(input);
  return Number(result.rows.find((row) => row.row_id === rowId)?.quantity);
};

describe("S27.26 automatic complete potable-water valve-chamber owner", () => {
  test("asks only nine primary facts and keeps seventy engineering assumptions visible", () => {
    expect(VALVES_CHAMBERS_CATALOG_ID).toBe(
      "canonical-work:expanded:valves_chambers",
    );
    expect(Object.keys(VALVES_CHAMBERS_SHORT_INPUT)).toHaveLength(9);
    expect(Object.keys(VALVES_CHAMBERS_RUNTIME_INPUT)).toHaveLength(70);
    expect(VALVES_CHAMBERS_PARAMETERS).toHaveLength(85);
    expect(VALVES_CHAMBERS_FORMULAS).toHaveLength(61);
    expect(VALVES_CHAMBERS_RESOURCES).toHaveLength(61);
    expect(Object.values(VALVES_CHAMBERS_RUNTIME_CLASSIFICATION))
      .toEqual(expect.arrayContaining(["ASSUMPTION"]));
    expect(Object.keys(VALVES_CHAMBERS_SHORT_INPUT).join(" ")).not.toMatch(
      /excavation|concrete_volume|reinforcement_mass|labor|machine|trip|test_water|package_count/iu,
    );
  });

  test("ordinary facts compile the complete non-conditional resource chain", async () => {
    const result = await compileValvesChambersR1({
      ...VALVES_CHAMBERS_SHORT_INPUT,
    });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows).toHaveLength(58);
    expect(result.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:vch_excavation", quantity: "146.718" }),
      expect.objectContaining({ row_id: "rc09:vch_structural_concrete", quantity: "34.14862" }),
      expect.objectContaining({ row_id: "rc09:vch_reinforcement", quantity: "4.31002" }),
      expect.objectContaining({ row_id: "rc09:vch_pipeline_spool", quantity: "14" }),
      expect.objectContaining({ row_id: "rc09:vch_valves", quantity: "5" }),
      expect.objectContaining({ row_id: "rc09:vch_penetration_seals", quantity: "8" }),
      expect.objectContaining({ row_id: "rc09:vch_flanged_joint_sets", quantity: "12" }),
      expect.objectContaining({ row_id: "rc09:vch_test_water", quantity: "6" }),
    ]));
  });

  test("recalculates civil quantities from primary chamber geometry", async () => {
    const baseline = await compileValvesChambersR1({
      ...VALVES_CHAMBERS_SHORT_INPUT,
    });
    const changed = await compileValvesChambersR1({
      ...VALVES_CHAMBERS_SHORT_INPUT,
      vch_internal_length_m: 3,
      vch_internal_width_m: 2.4,
    });
    const q = (result: typeof baseline, rowId: string) => Number(
      result.rows.find((row) => row.row_id === rowId)?.quantity,
    );
    expect(q(changed, "rc09:vch_excavation"))
      .toBeGreaterThan(q(baseline, "rc09:vch_excavation"));
    expect(q(changed, "rc09:vch_structural_concrete"))
      .toBeGreaterThan(q(baseline, "rc09:vch_structural_concrete"));
    expect(q(changed, "rc09:vch_reinforcement"))
      .toBeGreaterThan(q(baseline, "rc09:vch_reinforcement"));
    expect(q(changed, "rc09:vch_pipeline_spool"))
      .toBeGreaterThan(q(baseline, "rc09:vch_pipeline_spool"));
    expect(q(changed, "rc09:vch_valves")).toBe(q(baseline, "rc09:vch_valves"));
  });

  test("recalculates valve purchase from spare, stock and supplier package", async () => {
    const changed = await compileValvesChambersR1({
      ...VALVES_CHAMBERS_SHORT_INPUT,
      vch_valve_available_stock_piece: 2,
      vch_valve_supplier_package_quantity_piece: 4,
    });
    const q = (rowId: string) => Number(
      changed.rows.find((row) => row.row_id === rowId)?.quantity,
    );
    expect(q("rc09:vch-valve-balance:installed-net")).toBe(4);
    expect(q("rc09:vch-valve-balance:retained-spare")).toBe(1);
    expect(q("rc09:vch-valve-balance:total-need")).toBe(5);
    expect(q("rc09:vch-valve-balance:net-order-need")).toBe(3);
    expect(q("rc09:vch-valve-balance:package-count")).toBe(1);
    expect(q("rc09:vch_valves")).toBe(4);
    expect(q("rc09:vch-valve-balance:remainder")).toBe(2);
    expect(q("rc09:vch-valve-balance:surplus-beyond-spare")).toBe(1);
  });

  test("contains materials, fittings, labor, mechanisms, QA and logistics", () => {
    const requiredRows = [
      "rc09:vch_blinding", "rc09:vch_structural_concrete",
      "rc09:vch_reinforcement", "rc09:vch_formwork",
      "rc09:vch_waterproofing", "rc09:vch_imported_backfill",
      "rc09:vch_pipeline_spool", "rc09:vch_valves",
      "rc09:vch_dismantling_joints", "rc09:vch_flanged_joint_sets",
      "rc09:vch_penetration_seals", "rc09:vch_puddle_flanges",
      "rc09:vch_valve_supports", "rc09:vch_extension_spindles",
      "rc09:vch_hatches", "rc09:vch_ladders", "rc09:vch_sumps",
      "rc09:vch_vent_pipe", "rc09:vch_waterstop",
      "rc09:vch_joint_sealant", "rc09:vch_curing_compound",
      "rc09:vch_test_water", "rc09:vch_disinfection_reagent",
      "rc09:labor:vch-earthworks", "rc09:labor:vch-mechanical",
      "rc09:equipment:vch-excavator", "rc09:equipment:vch-crane",
      "rc09:logistics:vch-concrete-delivery", "rc09:vch_asbuilt",
    ];
    expect(requiredRows.every((rowId) => VALVES_CHAMBERS_RESOURCES.some(
      (row) => row.row_id === rowId,
    ))).toBe(true);
  });

  test("keeps shoring, dewatering and pavement reinstatement conditional", async () => {
    const result = await compileValvesChambersR1({
      ...VALVES_CHAMBERS_ACCEPTANCE_INPUT,
      vch_excavation_shoring_mode: "REQUIRED",
      vch_excavation_shoring_designation: "SHEET-PILE-LIGHT",
      vch_excavation_shoring_area_m2: 180,
      vch_groundwater_dewatering_mode: "REQUIRED",
      vch_groundwater_dewatering_designation: "WELLPOINT-60M3H",
      vch_groundwater_dewatering_machine_h: 96,
      vch_pavement_reinstatement_mode: "REQUIRED",
      vch_pavement_reinstatement_designation: "ASPHALT-2L-ROAD-REINSTATEMENT",
      vch_pavement_reinstatement_area_m2: 72,
    });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows).toHaveLength(61);
  });

  test("rejects invalid primary facts and unrelated identities", async () => {
    await expect(compileValvesChambersR1({
      ...VALVES_CHAMBERS_SHORT_INPUT,
      vch_chamber_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileValvesChambersR1({
      ...VALVES_CHAMBERS_SHORT_INPUT,
      vch_nominal_diameter_mm: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileValvesChambersR1(
      { ...VALVES_CHAMBERS_ACCEPTANCE_INPUT },
      { catalogId: `${VALVES_CHAMBERS_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("VALVES_CHAMBERS_CATALOG_UNSUPPORTED");
  });

  test("changes calculated outputs rather than accepting final resource quantities", async () => {
    await expect(quantity({
      ...VALVES_CHAMBERS_SHORT_INPUT,
      vch_valve_installed_piece: 7,
    }, "rc09:vch_flanged_joint_sets")).resolves.toBe(21);
  });
});
