import {
  SERVER_RACK_42U_GROUNDING_ACCEPTANCE_INPUT,
  SERVER_RACK_42U_GROUNDING_CATALOG_ID,
  SERVER_RACK_42U_GROUNDING_FORMULAS,
  SERVER_RACK_42U_GROUNDING_PARAMETERS,
  SERVER_RACK_42U_GROUNDING_RESOURCES,
  SERVER_RACK_42U_GROUNDING_RUNTIME_INPUT,
  SERVER_RACK_42U_GROUNDING_SHORT_INPUT,
  compileServerRack42uGroundingR1,
} from "../../src/lib/estimate/v4/serverRack42uGroundingR1";

const REQUIRED = [
  "rc09:server_rack_42u_install_ground",
  "rc09:server_rack_42u_600x1200",
  "rc09:server_rack_anchor_set",
  "rc09:server_rack_bonding_kit",
  "rc09:copper_pe_conductor_16mm2",
  "rc09:copper_lug_16mm2",
  "rc09:rack_cage_nut_bolt_m6",
  "rc09:rack_cable_organizer",
  "rc09:rack_ground_continuity_test",
] as const;
const CONDITIONAL = [
  "rc09:rack_plinth",
  "rc09:rack_pdu",
  "rc09:vertical_cable_organizer",
] as const;
const BALANCE = [
  "rc09:server-rack-balance:installed-net",
  "rc09:server-rack-balance:retained-spare",
  "rc09:server-rack-balance:total-need",
  "rc09:server-rack-balance:package-count",
  "rc09:server-rack-balance:remainder",
  "rc09:server-rack-balance:surplus-beyond-spare",
] as const;

describe("MASTER server-rack 42U installation and grounding owner", () => {
  test("uses the exact expanded data-center MEP owner without historical project rates", () => {
    expect(SERVER_RACK_42U_GROUNDING_CATALOG_ID)
      .toBe("canonical-work:expanded:data_center_mep");
    expect(SERVER_RACK_42U_GROUNDING_PARAMETERS).toHaveLength(37);
    expect(SERVER_RACK_42U_GROUNDING_FORMULAS).toHaveLength(26);
    expect(SERVER_RACK_42U_GROUNDING_RESOURCES).toHaveLength(26);
    expect(SERVER_RACK_42U_GROUNDING_RUNTIME_INPUT).toEqual({
      rack_retained_spare_piece: 0,
      rack_supplier_pack_size_piece: 1,
    });
    expect(JSON.stringify(SERVER_RACK_42U_GROUNDING_FORMULAS))
      .not.toMatch(/golden_rate|normFactor|rack_count\s*\*\s*(?:4|24|2)/iu);
    expect(SERVER_RACK_42U_GROUNDING_RESOURCES.map((row) => row.row_id))
      .toEqual(expect.not.arrayContaining([
        "rc09:ups",
        "rc09:battery_system",
        "rc09:server_room_cooling",
        "rc09:server_room_fire_suppression",
        "rc09:access_control",
        "rc09:full_server_room",
      ]));
  });

  test("known rack identity and dimensions give work, procurement balance and QA rows plus local needs", async () => {
    const compiled = await compileServerRack42uGroundingR1({
      ...SERVER_RACK_42U_GROUNDING_SHORT_INPUT,
    });
    expect(compiled.rows).toHaveLength(9);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "6", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[1], quantity: "6", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[8], quantity: "6", unit_id: "test" }),
      expect.objectContaining({ row_id: BALANCE[0], quantity: "6", unit_id: "pcs" }),
      expect.objectContaining({ row_id: BALANCE[3], quantity: "6", unit_id: "package" }),
    ]));
    expect(compiled.preliminaryNeeds).toHaveLength(17);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([...REQUIRED.slice(2, 8), ...CONDITIONAL]));
  });

  test("compiles the twenty-three-row evidence-bound mandatory fixture", async () => {
    const compiled = await compileServerRack42uGroundingR1({
      ...SERVER_RACK_42U_GROUNDING_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(23);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[1], quantity: "6", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[2], quantity: "6", unit_id: "set" }),
      expect.objectContaining({ row_id: REQUIRED[3], quantity: "6", unit_id: "set" }),
      expect.objectContaining({ row_id: REQUIRED[4], quantity: "27", unit_id: "m" }),
      expect.objectContaining({ row_id: REQUIRED[5], quantity: "30", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[6], quantity: "132", unit_id: "set" }),
      expect.objectContaining({ row_id: REQUIRED[7], quantity: "18", unit_id: "pcs" }),
      expect.objectContaining({ row_id: "rc09:rack_ground_continuity_report", quantity: "1", unit_id: "document" }),
      expect.objectContaining({ row_id: "rc09:labor:rack-installation-grounding", quantity: "72", unit_id: "man_hour" }),
      expect.objectContaining({ row_id: "rc09:labor:rack-grounding-test", quantity: "12", unit_id: "man_hour" }),
      expect.objectContaining({ row_id: "rc09:equipment:rack-handling", quantity: "10", unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: "rc09:equipment:rack-torque-tool", quantity: "8", unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: "rc09:equipment:ground-continuity-tester", quantity: "6", unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: "rc09:logistics:rack-delivery", quantity: "1", unit_id: "trip" }),
      expect.objectContaining({ row_id: "rc09:logistics:rack-packaging-removal", quantity: "1", unit_id: "trip" }),
    ]));
  });

  test("separates installed racks from rounded supplier procurement", async () => {
    const compiled = await compileServerRack42uGroundingR1({
      ...SERVER_RACK_42U_GROUNDING_ACCEPTANCE_INPUT,
      rack_retained_spare_piece: 1,
      rack_supplier_pack_size_piece: 4,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get(BALANCE[0])?.quantity).toBe("6");
    expect(rows.get(BALANCE[1])?.quantity).toBe("1");
    expect(rows.get(BALANCE[2])?.quantity).toBe("7");
    expect(rows.get(BALANCE[3])?.quantity).toBe("2");
    expect(rows.get(REQUIRED[1])?.quantity).toBe("8");
    expect(rows.get(BALANCE[4])?.quantity).toBe("2");
    expect(rows.get(BALANCE[5])?.quantity).toBe("1");
  });

  test("keeps operation, continuity check and report informational beside explicit labor", () => {
    for (const rowId of [
      "rc09:server_rack_42u_install_ground",
      "rc09:rack_ground_continuity_test",
      "rc09:rack_ground_continuity_report",
    ]) {
      const row = SERVER_RACK_42U_GROUNDING_RESOURCES.find((item) => item.row_id === rowId);
      expect(row?.resource_graph).toEqual(expect.objectContaining({
        costTreatment: "INFORMATIONAL_SCOPE",
      }));
    }
  });

  test("keeps plinth, PDU and vertical organizers conditional", async () => {
    const compiled = await compileServerRack42uGroundingR1({
      ...SERVER_RACK_42U_GROUNDING_ACCEPTANCE_INPUT,
      rack_plinth_mode: "REQUIRED",
      rack_plinth_designation: "Цоколь 100 мм по спецификации шкафа",
      rack_plinth_quantity: 6,
      rack_pdu_mode: "REQUIRED",
      rack_pdu_designation: "PDU 32 A по электрической спецификации",
      rack_pdu_quantity: 12,
      vertical_cable_organizer_mode: "REQUIRED",
      vertical_cable_organizer_designation: "Органайзер вертикальный по раскладке",
      vertical_cable_organizer_quantity: 12,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(26);
    expect(compiled.rows.map((row) => row.row_id))
      .toEqual(expect.arrayContaining([...CONDITIONAL]));
  });

  test("rejects invalid values and unrelated identities", async () => {
    await expect(compileServerRack42uGroundingR1({
      ...SERVER_RACK_42U_GROUNDING_SHORT_INPUT,
      rack_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileServerRack42uGroundingR1(
      { ...SERVER_RACK_42U_GROUNDING_ACCEPTANCE_INPUT },
      { catalogId: `${SERVER_RACK_42U_GROUNDING_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("SERVER_RACK_42U_GROUNDING_CATALOG_UNSUPPORTED");
  });
});
