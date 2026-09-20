import {
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_ACCEPTANCE_INPUT,
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_CATALOG_ID,
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_FORMULAS,
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_PARAMETERS,
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_RESOURCES,
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SHORT_INPUT,
  compileIndustrialSteelPipeButtWeldR1,
} from "../../src/lib/estimate/v4/industrialSteelPipeButtWeldR1";

const REQUIRED = [
  "rc09:steel_process_pipe_butt_weld",
  "rc09:welding_wire_sv08g2s_d1_2",
  "rc09:welding_shielding_gas_mixture",
  "rc09:pipe_weld_degreaser",
  "rc09:pipe_weld_grinding_disc",
  "rc09:inverter_welding_power_source",
  "rc09:pipe_internal_external_clamp",
  "rc09:pipe_weld_ndt_control",
  "rc09:pipe_weld_log_record",
] as const;
const CONDITIONAL = [
  "rc09:root_purge_gas",
  "rc09:preheat_postweld_heat_treatment",
  "rc09:field_joint_coating_repair",
] as const;

describe("MASTER industrial steel pipe butt-weld owner", () => {
  test("uses the exact expanded pipeline-welding owner without historical project rates", () => {
    expect(INDUSTRIAL_STEEL_PIPE_BUTT_WELD_CATALOG_ID)
      .toBe("canonical-work:expanded:pipeline_welding");
    expect(INDUSTRIAL_STEEL_PIPE_BUTT_WELD_PARAMETERS).toHaveLength(25);
    expect(INDUSTRIAL_STEEL_PIPE_BUTT_WELD_FORMULAS).toHaveLength(12);
    expect(INDUSTRIAL_STEEL_PIPE_BUTT_WELD_RESOURCES).toHaveLength(12);
    expect(JSON.stringify(INDUSTRIAL_STEEL_PIPE_BUTT_WELD_FORMULAS))
      .not.toMatch(/golden_rate|normFactor|joint_count\s*\*\s*(?:0\.85|0\.42|0\.06|0\.4|1\.6|0\.8)/iu);
    expect(INDUSTRIAL_STEEL_PIPE_BUTT_WELD_RESOURCES.map((row) => row.row_id))
      .toEqual(expect.not.arrayContaining([
        "rc09:process_pipe_full_length",
        "rc09:pipe_fitting",
        "rc09:pipe_support",
        "rc09:whole_pipeline_pressure_test",
      ]));
  });

  test("known geometry gives useful work, NDT and weld-log rows plus local needs", async () => {
    const compiled = await compileIndustrialSteelPipeButtWeldR1({
      ...INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SHORT_INPUT,
    });
    expect(compiled.rows).toHaveLength(3);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "16", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[7], quantity: "16", unit_id: "test" }),
      expect.objectContaining({ row_id: REQUIRED[8], quantity: "16", unit_id: "document" }),
    ]));
    expect(compiled.preliminaryNeeds).toHaveLength(9);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([...REQUIRED.slice(1, 7), ...CONDITIONAL]));
  });

  test("compiles the nine-row evidence-bound mandatory fixture", async () => {
    const compiled = await compileIndustrialSteelPipeButtWeldR1({
      ...INDUSTRIAL_STEEL_PIPE_BUTT_WELD_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(9);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[1], quantity: "14.2", unit_id: "kg" }),
      expect.objectContaining({ row_id: REQUIRED[2], quantity: "7.1", unit_id: "m3" }),
      expect.objectContaining({ row_id: REQUIRED[3], quantity: "1", unit_id: "l" }),
      expect.objectContaining({ row_id: REQUIRED[4], quantity: "8", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[5], quantity: "26.5", unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: REQUIRED[6], quantity: "13.2", unit_id: "machine_hour" }),
    ]));
  });

  test("keeps purge, heat treatment and coating repair conditional", async () => {
    const compiled = await compileIndustrialSteelPipeButtWeldR1({
      ...INDUSTRIAL_STEEL_PIPE_BUTT_WELD_ACCEPTANCE_INPUT,
      root_purge_gas_mode: "REQUIRED",
      root_purge_gas_designation: "Аргон для продувки корня по WPS",
      root_purge_gas_quantity: 5.4,
      preheat_postweld_heat_treatment_mode: "REQUIRED",
      preheat_postweld_heat_treatment_designation: "Индукционный подогрев по WPS",
      preheat_postweld_heat_treatment_quantity: 12,
      field_joint_coating_repair_mode: "REQUIRED",
      field_joint_coating_repair_designation: "Система покрытия по проекту",
      field_joint_coating_repair_quantity: 6.8,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(12);
    expect(compiled.rows.map((row) => row.row_id))
      .toEqual(expect.arrayContaining([...CONDITIONAL]));
  });

  test("rejects invalid values and unrelated identities", async () => {
    await expect(compileIndustrialSteelPipeButtWeldR1({
      ...INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SHORT_INPUT,
      joint_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileIndustrialSteelPipeButtWeldR1(
      { ...INDUSTRIAL_STEEL_PIPE_BUTT_WELD_ACCEPTANCE_INPUT },
      { catalogId: `${INDUSTRIAL_STEEL_PIPE_BUTT_WELD_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("INDUSTRIAL_STEEL_PIPE_BUTT_WELD_CATALOG_UNSUPPORTED");
  });
});
