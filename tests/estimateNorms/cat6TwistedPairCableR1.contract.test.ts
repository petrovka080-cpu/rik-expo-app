import {
  CAT6_TWISTED_PAIR_CABLE_ACCEPTANCE_INPUT,
  CAT6_TWISTED_PAIR_CABLE_CATALOG_ID,
  CAT6_TWISTED_PAIR_CABLE_FORMULAS,
  CAT6_TWISTED_PAIR_CABLE_PARAMETERS,
  CAT6_TWISTED_PAIR_CABLE_RESOURCES,
  CAT6_TWISTED_PAIR_CABLE_RUNTIME_INPUT,
  CAT6_TWISTED_PAIR_CABLE_SHORT_INPUT,
  compileCat6TwistedPairCableR1,
} from "../../src/lib/estimate/v4/cat6TwistedPairCableR1";

const REQUIRED = [
  "rc09:cat6_cable_lay", "rc09:uutp_cat6_4pair_lszh",
  "rc09:cat6_cable_identification_label", "rc09:reusable_velcro_cable_tie",
  "rc09:cat6_firestop_penetration", "rc09:structured_cable_certifier",
  "rc09:cat6_route_continuity_check",
] as const;
const CONDITIONAL = ["rc09:cat6_keystone", "rc09:cat6_patch_panel",
  "rc09:cat6_information_outlet", "rc09:cable_j_hook"] as const;
const DIRECT_RESOURCE_NEEDS = [
  "cat6:labor:installation", "cat6:labor:termination-labeling", "cat6:labor:testing",
  "cat6:equipment:payoff", "cat6:equipment:termination-tool",
  "cat6:logistics:delivery", "cat6:logistics:waste-removal",
] as const;
const MINIMUM_REAL_QUANTITY_NEEDS = Object.freeze({
  "rc09:cat6_cable_identification_label": ["label_quantity_piece"],
  "rc09:reusable_velcro_cable_tie": ["velcro_length_m"],
  "rc09:cat6_firestop_penetration": ["firestop_volume_l"],
  "rc09:structured_cable_certifier": ["certifier_shift"],
});

describe("MASTER Cat.6 twisted-pair cable owner", () => {
  test("uses route and line geometry without importing historical rates", () => {
    expect(CAT6_TWISTED_PAIR_CABLE_CATALOG_ID)
      .toBe("canonical-work:expanded:site_telecom_connection");
    expect(CAT6_TWISTED_PAIR_CABLE_PARAMETERS).toHaveLength(33);
    expect(CAT6_TWISTED_PAIR_CABLE_FORMULAS).toHaveLength(24);
    expect(CAT6_TWISTED_PAIR_CABLE_RESOURCES).toHaveLength(24);
    expect(CAT6_TWISTED_PAIR_CABLE_RUNTIME_INPUT).toEqual({
      cable_expected_loss_ratio: 0,
      cable_retained_reserve_m: 0,
      cable_supplier_cut_increment_m: 1,
    });
    expect(JSON.stringify(CAT6_TWISTED_PAIR_CABLE_FORMULAS))
      .not.toMatch(/golden_rate|normFactor|length_m\s*\*\s*(?:1\.05|0\.08|0\.06|0\.012|0\.01|0\.04)/iu);
    expect(CAT6_TWISTED_PAIR_CABLE_RESOURCES.map((row) => row.row_id))
      .not.toEqual(expect.arrayContaining([
        "rc09:network_switch", "rc09:server_rack", "rc09:full_structured_cabling_system",
      ]));
  });

  test("known route gives work, net cable and line checks plus local needs", async () => {
    const compiled = await compileCat6TwistedPairCableR1({
      ...CAT6_TWISTED_PAIR_CABLE_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "300", unit_id: "m" }),
      expect.objectContaining({ row_id: REQUIRED[1], quantity: "300", unit_id: "m" }),
      expect.objectContaining({ row_id: REQUIRED[6], quantity: "12", unit_id: "test" }),
    ]));
    expect(compiled.rows).toHaveLength(9);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([
        ...REQUIRED.slice(2, 6), ...CONDITIONAL, ...DIRECT_RESOURCE_NEEDS,
      ]));
    expect(compiled.preliminaryNeeds).toHaveLength(15);
    for (const [rowId, missingParameterIds] of Object.entries(MINIMUM_REAL_QUANTITY_NEEDS)) {
      expect(compiled.preliminaryNeeds.find((need) => need.row_id === rowId)
        ?.missing_parameter_ids).toEqual(missingParameterIds);
    }
    for (const parameterId of ["label_designation", "velcro_designation",
      "firestop_designation", "certifier_designation"]) {
      expect(CAT6_TWISTED_PAIR_CABLE_PARAMETERS.find((parameter) =>
        parameter.parameter_id === parameterId)?.required).toBe(false);
    }
  });

  test("compiles the evidence-bound fixture with labor, mechanisms and logistics", async () => {
    const compiled = await compileCat6TwistedPairCableR1({
      ...CAT6_TWISTED_PAIR_CABLE_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(20);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[2], quantity: "24", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[3], quantity: "18", unit_id: "m" }),
      expect.objectContaining({ row_id: REQUIRED[4], quantity: "3.6", unit_id: "l" }),
      expect.objectContaining({ row_id: REQUIRED[5], quantity: "3", unit_id: "shift" }),
      expect.objectContaining({ row_id: "cat6:labor:installation", quantity: "32" }),
      expect.objectContaining({ row_id: "cat6:labor:termination-labeling", quantity: "12" }),
      expect.objectContaining({ row_id: "cat6:labor:testing", quantity: "8" }),
      expect.objectContaining({ row_id: "cat6:equipment:payoff", quantity: "4" }),
      expect.objectContaining({ row_id: "cat6:equipment:termination-tool", quantity: "6" }),
      expect.objectContaining({ row_id: "cat6:logistics:delivery", quantity: "1" }),
      expect.objectContaining({ row_id: "cat6:logistics:waste-removal", quantity: "1" }),
    ]));
    expect(compiled.rows.find((row) => row.row_id === REQUIRED[0])?.included_in_estimate)
      .toBe(false);
    expect(compiled.rows.find((row) => row.row_id === REQUIRED[6])?.included_in_estimate)
      .toBe(false);
  });

  test("separates installed length, loss, retained reserve, order and remainder", async () => {
    const compiled = await compileCat6TwistedPairCableR1({
      ...CAT6_TWISTED_PAIR_CABLE_ACCEPTANCE_INPUT,
      cable_expected_loss_ratio: 0.05,
      cable_retained_reserve_m: 15,
      cable_supplier_cut_increment_m: 305,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("cat6:balance:installed-net-length")?.quantity).toBe("300");
    expect(rows.get("cat6:balance:expected-loss")?.quantity).toBe("15");
    expect(rows.get("cat6:balance:retained-reserve")?.quantity).toBe("15");
    expect(rows.get("cat6:balance:total-need")?.quantity).toBe("330");
    expect(rows.get("rc09:uutp_cat6_4pair_lszh")?.quantity).toBe("610");
    expect(rows.get("cat6:balance:remainder-after-installation-loss")?.quantity).toBe("295");
    expect(rows.get("cat6:balance:surplus-beyond-reserve")?.quantity).toBe("280");
  });

  test("keeps passive termination and J-hooks conditional", async () => {
    const compiled = await compileCat6TwistedPairCableR1({
      ...CAT6_TWISTED_PAIR_CABLE_ACCEPTANCE_INPUT,
      keystone_mode: "REQUIRED", keystone_designation: "Keystone Cat.6 по спецификации",
      keystone_quantity_piece: 24, patch_panel_mode: "REQUIRED",
      patch_panel_designation: "Патч-панель Cat.6 по спецификации", patch_panel_quantity_piece: 1,
      information_outlet_mode: "REQUIRED",
      information_outlet_designation: "Розетка Cat.6 по плану", information_outlet_quantity_piece: 12,
      j_hook_mode: "REQUIRED", j_hook_designation: "J-hook по раскладке", j_hook_quantity_piece: 60,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(24);
    expect(compiled.rows.map((row) => row.row_id)).toEqual(expect.arrayContaining([...CONDITIONAL]));
  });

  test("rejects invalid values and unrelated identities", async () => {
    await expect(compileCat6TwistedPairCableR1({
      ...CAT6_TWISTED_PAIR_CABLE_SHORT_INPUT, length_m: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileCat6TwistedPairCableR1(
      { ...CAT6_TWISTED_PAIR_CABLE_ACCEPTANCE_INPUT },
      { catalogId: `${CAT6_TWISTED_PAIR_CABLE_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("CAT6_TWISTED_PAIR_CABLE_CATALOG_UNSUPPORTED");
  });
});
