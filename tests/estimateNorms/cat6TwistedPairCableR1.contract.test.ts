import {
  CAT6_TWISTED_PAIR_CABLE_ACCEPTANCE_INPUT,
  CAT6_TWISTED_PAIR_CABLE_CATALOG_ID,
  CAT6_TWISTED_PAIR_CABLE_FORMULAS,
  CAT6_TWISTED_PAIR_CABLE_PARAMETERS,
  CAT6_TWISTED_PAIR_CABLE_RESOURCES,
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

describe("MASTER Cat.6 twisted-pair cable owner", () => {
  test("uses route and line geometry without importing historical rates", () => {
    expect(CAT6_TWISTED_PAIR_CABLE_CATALOG_ID)
      .toBe("canonical-work:expanded:site_telecom_connection");
    expect(CAT6_TWISTED_PAIR_CABLE_PARAMETERS).toHaveLength(23);
    expect(CAT6_TWISTED_PAIR_CABLE_FORMULAS).toHaveLength(11);
    expect(CAT6_TWISTED_PAIR_CABLE_RESOURCES).toHaveLength(11);
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
    expect(compiled.rows).toHaveLength(3);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([...REQUIRED.slice(2, 6), ...CONDITIONAL]));
    expect(compiled.preliminaryNeeds).toHaveLength(8);
  });

  test("compiles the evidence-bound seven-row fixture", async () => {
    const compiled = await compileCat6TwistedPairCableR1({
      ...CAT6_TWISTED_PAIR_CABLE_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(7);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[2], quantity: "24", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[3], quantity: "18", unit_id: "m" }),
      expect.objectContaining({ row_id: REQUIRED[4], quantity: "3.6", unit_id: "l" }),
      expect.objectContaining({ row_id: REQUIRED[5], quantity: "3", unit_id: "shift" }),
    ]));
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
    expect(compiled.rows).toHaveLength(11);
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
