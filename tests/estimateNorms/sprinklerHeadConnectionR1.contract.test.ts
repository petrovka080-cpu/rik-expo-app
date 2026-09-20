import {
  SPRINKLER_HEAD_CONNECTION_ACCEPTANCE_INPUT,
  SPRINKLER_HEAD_CONNECTION_CATALOG_ID,
  SPRINKLER_HEAD_CONNECTION_FORMULAS,
  SPRINKLER_HEAD_CONNECTION_PARAMETERS,
  SPRINKLER_HEAD_CONNECTION_RESOURCES,
  SPRINKLER_HEAD_CONNECTION_SHORT_INPUT,
  compileSprinklerHeadConnectionR1,
} from "../../src/lib/estimate/v4/sprinklerHeadConnectionR1";

const REQUIRED = [
  "rc09:sprinkler_head_install", "rc09:sprinkler_head_k80_68c",
  "rc09:sprinkler_reducing_socket_half_inch", "rc09:approved_thread_seal_sprinkler",
  "rc09:sprinkler_decorative_escutcheon", "rc09:sprinkler_protective_cap",
  "rc09:manufacturer_sprinkler_wrench", "rc09:sprinkler_head_visual_record",
] as const;
const CONDITIONAL = "rc09:listed_flexible_sprinkler_hose";

describe("MASTER sprinkler-head connection owner", () => {
  test("uses an atomic owner without importing historical rates or whole-system scope", () => {
    expect(SPRINKLER_HEAD_CONNECTION_CATALOG_ID).toBe("canonical-work:expanded:sprinkler_system");
    expect(SPRINKLER_HEAD_CONNECTION_PARAMETERS).toHaveLength(17);
    expect(SPRINKLER_HEAD_CONNECTION_FORMULAS).toHaveLength(9);
    expect(SPRINKLER_HEAD_CONNECTION_RESOURCES).toHaveLength(9);
    expect(JSON.stringify(SPRINKLER_HEAD_CONNECTION_FORMULAS))
      .not.toMatch(/golden_rate|normFactor|sprinkler_count\s*\*\s*(?:0\.8|0\.08)/iu);
    expect(SPRINKLER_HEAD_CONNECTION_RESOURCES.map((row) => row.row_id))
      .not.toEqual(expect.arrayContaining([
        "rc09:sprinkler_pipe_network", "rc09:fire_pump",
        "rc09:alarm_valve_station", "rc09:full_fire_suppression_system",
      ]));
  });

  test("known 40 heads give work, product and visual records plus local needs", async () => {
    const compiled = await compileSprinklerHeadConnectionR1({
      ...SPRINKLER_HEAD_CONNECTION_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "40", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[1], quantity: "40", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[7], quantity: "40", unit_id: "test" }),
    ]));
    expect(compiled.rows).toHaveLength(3);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([...REQUIRED.slice(2, 7), CONDITIONAL]));
    expect(compiled.preliminaryNeeds).toHaveLength(6);
  });

  test("compiles the evidence-bound eight-row fixture", async () => {
    const compiled = await compileSprinklerHeadConnectionR1({
      ...SPRINKLER_HEAD_CONNECTION_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[2], quantity: "40", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[3], quantity: "32", unit_id: "m" }),
      expect.objectContaining({ row_id: REQUIRED[6], quantity: "3.2", unit_id: "machine_hour" }),
    ]));
  });

  test("keeps the listed flexible hose conditional", async () => {
    const compiled = await compileSprinklerHeadConnectionR1({
      ...SPRINKLER_HEAD_CONNECTION_ACCEPTANCE_INPUT,
      flexible_hose_mode: "REQUIRED",
      flexible_hose_designation: "Сертифицированная гибкая подводка по узлу",
      flexible_hose_quantity_piece: 40,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(9);
    expect(compiled.rows).toContainEqual(expect.objectContaining({
      row_id: CONDITIONAL, quantity: "40", unit_id: "pcs",
    }));
  });

  test("rejects invalid values and unrelated identities", async () => {
    await expect(compileSprinklerHeadConnectionR1({
      ...SPRINKLER_HEAD_CONNECTION_SHORT_INPUT,
      sprinkler_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileSprinklerHeadConnectionR1(
      { ...SPRINKLER_HEAD_CONNECTION_ACCEPTANCE_INPUT },
      { catalogId: `${SPRINKLER_HEAD_CONNECTION_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("SPRINKLER_HEAD_CONNECTION_CATALOG_UNSUPPORTED");
  });
});
