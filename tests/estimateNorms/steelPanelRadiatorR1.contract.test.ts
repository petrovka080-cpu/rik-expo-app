import {
  STEEL_PANEL_RADIATOR_ACCEPTANCE_INPUT,
  STEEL_PANEL_RADIATOR_CATALOG_ID,
  STEEL_PANEL_RADIATOR_FORMULAS,
  STEEL_PANEL_RADIATOR_PARAMETERS,
  STEEL_PANEL_RADIATOR_RESOURCES,
  STEEL_PANEL_RADIATOR_SHORT_INPUT,
  compileSteelPanelRadiatorR1,
} from "../../src/lib/estimate/v4/steelPanelRadiatorR1";

const REQUIRED = [
  "rc09:panel_radiator_install",
  "rc09:steel_panel_radiator_type22_500x1000",
  "rc09:radiator_wall_bracket",
  "rc09:thermostatic_radiator_valve",
  "rc09:radiator_lockshield_valve",
  "rc09:manual_air_vent",
  "rc09:radiator_connection_fitting_set",
  "rc09:radiator_connection_leak_test",
] as const;
const CONDITIONAL = [
  "rc09:radiator_thermostatic_head",
  "rc09:concealed_pipe_insulation",
] as const;

describe("MASTER steel-panel radiator owner", () => {
  test("uses the narrow radiator-install owner without importing historical unit rates", () => {
    expect(STEEL_PANEL_RADIATOR_CATALOG_ID)
      .toBe("canonical-work:base:heating_hvac_interior_radiator_install_standard");
    expect(STEEL_PANEL_RADIATOR_PARAMETERS).toHaveLength(25);
    expect(STEEL_PANEL_RADIATOR_FORMULAS).toHaveLength(10);
    expect(STEEL_PANEL_RADIATOR_RESOURCES).toHaveLength(10);
    expect(JSON.stringify(STEEL_PANEL_RADIATOR_FORMULAS))
      .not.toMatch(/golden_rate|normFactor|radiator_count\s*\*\s*1(?:\.0+)?/iu);
    expect(STEEL_PANEL_RADIATOR_RESOURCES.map((row) => row.row_id))
      .not.toEqual(expect.arrayContaining([
        "rc09:heating_full_distribution",
        "rc09:building_heating_balance",
      ]));
  });

  test("known eight radiators give work plus row-local voluntary needs", async () => {
    const compiled = await compileSteelPanelRadiatorR1({
      ...STEEL_PANEL_RADIATOR_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "8", unit_id: "pcs" }),
    ]);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([...REQUIRED.slice(1), ...CONDITIONAL]));
    expect(compiled.preliminaryNeeds).toHaveLength(9);
  });

  test("compiles the evidence-bound eight-row fixture", async () => {
    const compiled = await compileSteelPanelRadiatorR1({
      ...STEEL_PANEL_RADIATOR_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "8", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[1], quantity: "8", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[2], quantity: "8", unit_id: "set" }),
      expect.objectContaining({ row_id: REQUIRED[3], quantity: "8", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[4], quantity: "8", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[5], quantity: "8", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[6], quantity: "8", unit_id: "set" }),
      expect.objectContaining({ row_id: REQUIRED[7], quantity: "8", unit_id: "test" }),
    ]));
    expect(compiled.rows).toHaveLength(8);
  });

  test("keeps thermostatic heads and concealed-pipe insulation conditional", async () => {
    const compiled = await compileSteelPanelRadiatorR1({
      ...STEEL_PANEL_RADIATOR_ACCEPTANCE_INPUT,
      thermostatic_head_mode: "REQUIRED",
      thermostatic_head_designation: "Термостатическая головка по спецификации",
      thermostatic_head_quantity_piece: 8,
      concealed_pipe_insulation_mode: "REQUIRED",
      concealed_pipe_insulation_designation: "Теплоизоляция скрытой подводки по узлу",
      concealed_pipe_insulation_length_m: 24,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(10);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: CONDITIONAL[0], quantity: "8", unit_id: "pcs" }),
      expect.objectContaining({ row_id: CONDITIONAL[1], quantity: "24", unit_id: "m" }),
    ]));
  });

  test("rejects invalid values and unrelated identities", async () => {
    await expect(compileSteelPanelRadiatorR1({
      ...STEEL_PANEL_RADIATOR_SHORT_INPUT,
      radiator_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileSteelPanelRadiatorR1(
      { ...STEEL_PANEL_RADIATOR_ACCEPTANCE_INPUT },
      { catalogId: `${STEEL_PANEL_RADIATOR_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("STEEL_PANEL_RADIATOR_CATALOG_UNSUPPORTED");
  });
});
