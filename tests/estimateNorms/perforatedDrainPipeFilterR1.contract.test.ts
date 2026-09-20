import {
  PERFORATED_DRAIN_PIPE_FILTER_ACCEPTANCE_INPUT,
  PERFORATED_DRAIN_PIPE_FILTER_CATALOG_ID,
  PERFORATED_DRAIN_PIPE_FILTER_FORMULAS,
  PERFORATED_DRAIN_PIPE_FILTER_PARAMETERS,
  PERFORATED_DRAIN_PIPE_FILTER_RESOURCES,
  PERFORATED_DRAIN_PIPE_FILTER_SHORT_INPUT,
  compilePerforatedDrainPipeFilterR1,
} from "../../src/lib/estimate/v4/perforatedDrainPipeFilterR1";

const REQUIRED = [
  "rc09:perforated_drain_pipe_lay",
  "rc09:perforated_drain_pipe_d110",
  "rc09:drain_pipe_coupler_d110",
  "rc09:needle_punched_geotextile_300",
  "rc09:washed_granite_crushed_stone_20_40",
  "rc09:drainage_laser_level",
  "rc09:drainage_flush_flow_test",
] as const;
const CONDITIONAL = [
  "rc09:drain_inspection_chamber",
  "rc09:sand_drain_bedding",
] as const;

describe("MASTER perforated-drain-pipe filter owner", () => {
  test("uses the narrow drainage-laying owner without importing historical scalar rates", () => {
    expect(PERFORATED_DRAIN_PIPE_FILTER_CATALOG_ID)
      .toBe("canonical-work:base:paving_roads_landscape_interior_drainage_lay_standard");
    expect(PERFORATED_DRAIN_PIPE_FILTER_PARAMETERS).toHaveLength(24);
    expect(PERFORATED_DRAIN_PIPE_FILTER_FORMULAS).toHaveLength(9);
    expect(PERFORATED_DRAIN_PIPE_FILTER_RESOURCES).toHaveLength(9);
    expect(JSON.stringify(PERFORATED_DRAIN_PIPE_FILTER_FORMULAS))
      .not.toMatch(/golden_rate|normFactor|length_m\s*\*\s*(?:1\.03|0\.17|2\.8|0\.48|0\.02|0\.017)/iu);
    expect(PERFORATED_DRAIN_PIPE_FILTER_RESOURCES.map((row) => row.row_id))
      .not.toEqual(expect.arrayContaining([
        "rc09:stormwater_main_collector",
        "rc09:road_drainage_full_system",
      ]));
  });

  test("known 60 m D110 filter scope gives work plus row-local voluntary needs", async () => {
    const compiled = await compilePerforatedDrainPipeFilterR1({
      ...PERFORATED_DRAIN_PIPE_FILTER_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "60", unit_id: "m" }),
    ]);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([...REQUIRED.slice(1), ...CONDITIONAL]));
    expect(compiled.preliminaryNeeds).toHaveLength(8);
  });

  test("compiles the evidence-bound seven-row fixture", async () => {
    const compiled = await compilePerforatedDrainPipeFilterR1({
      ...PERFORATED_DRAIN_PIPE_FILTER_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "60", unit_id: "m" }),
      expect.objectContaining({ row_id: REQUIRED[1], quantity: "61.8", unit_id: "m" }),
      expect.objectContaining({ row_id: REQUIRED[2], quantity: "11", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[3], quantity: "168", unit_id: "m2" }),
      expect.objectContaining({ row_id: REQUIRED[4], quantity: "28.8", unit_id: "m3" }),
      expect.objectContaining({ row_id: REQUIRED[5], quantity: "1.2", unit_id: "shift" }),
      expect.objectContaining({ row_id: REQUIRED[6], quantity: "2", unit_id: "test" }),
    ]));
    expect(compiled.rows).toHaveLength(7);
  });

  test("keeps inspection chambers and sand bedding conditional", async () => {
    const compiled = await compilePerforatedDrainPipeFilterR1({
      ...PERFORATED_DRAIN_PIPE_FILTER_ACCEPTANCE_INPUT,
      inspection_chamber_mode: "REQUIRED",
      inspection_chamber_designation: "Колодец дренажный смотровой по плану трассы",
      inspection_chamber_quantity_piece: 3,
      sand_bedding_mode: "REQUIRED",
      sand_bedding_designation: "Песок мытый для постели по проектному узлу",
      sand_bedding_volume_m3: 8.5,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(9);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: CONDITIONAL[0], quantity: "3", unit_id: "pcs" }),
      expect.objectContaining({ row_id: CONDITIONAL[1], quantity: "8.5", unit_id: "m3" }),
    ]));
  });

  test("rejects invalid values and unrelated identities", async () => {
    await expect(compilePerforatedDrainPipeFilterR1({
      ...PERFORATED_DRAIN_PIPE_FILTER_SHORT_INPUT,
      length_m: -1,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compilePerforatedDrainPipeFilterR1(
      { ...PERFORATED_DRAIN_PIPE_FILTER_ACCEPTANCE_INPUT },
      { catalogId: `${PERFORATED_DRAIN_PIPE_FILTER_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("PERFORATED_DRAIN_PIPE_FILTER_CATALOG_UNSUPPORTED");
  });
});
