import {
  PE110_ELECTROFUSION_JOINT_ACCEPTANCE_INPUT,
  PE110_ELECTROFUSION_JOINT_CATALOG_ID,
  PE110_ELECTROFUSION_JOINT_FORMULAS,
  PE110_ELECTROFUSION_JOINT_PARAMETERS,
  PE110_ELECTROFUSION_JOINT_RESOURCES,
  PE110_ELECTROFUSION_JOINT_SHORT_INPUT,
  compilePe110ElectrofusionJointR1,
} from "../../src/lib/estimate/v4/pe110ElectrofusionJointR1";

const REQUIRED = [
  "rc09:pe110_electrofusion_weld",
  "rc09:pe100_electrofusion_coupler_110_sdr17",
  "rc09:pe_joint_isopropyl_cleaner",
  "rc09:lint_free_pipe_wipe",
  "rc09:pe_joint_identification_label",
  "rc09:electrofusion_control_unit",
  "rc09:pe_pipe_rotary_scraper",
  "rc09:electrofusion_joint_protocol",
] as const;
const CONDITIONAL = [
  "rc09:electrofusion_generator",
  "rc09:pe_pipe_positioner",
] as const;

describe("MASTER PE110 electrofusion-joint owner", () => {
  test("uses the narrow joint owner without importing historical scalar rates", () => {
    expect(PE110_ELECTROFUSION_JOINT_CATALOG_ID)
      .toBe("canonical-work:base:plumbing_interior_pnd_pipe_connect_standard");
    expect(PE110_ELECTROFUSION_JOINT_PARAMETERS).toHaveLength(25);
    expect(PE110_ELECTROFUSION_JOINT_FORMULAS).toHaveLength(10);
    expect(PE110_ELECTROFUSION_JOINT_RESOURCES).toHaveLength(10);
    expect(JSON.stringify(PE110_ELECTROFUSION_JOINT_FORMULAS))
      .not.toMatch(/golden_rate|normFactor|count\s*\*\s*[\d.]+/iu);
    expect(PE110_ELECTROFUSION_JOINT_RESOURCES.map((row) => row.row_id))
      .not.toEqual(expect.arrayContaining([
        "rc09:pe_pipe_length",
        "rc09:pipeline_trench",
        "rc09:sand_bedding",
        "rc09:water_chamber",
        "rc09:network_disinfection",
      ]));
  });

  test("known 20 PE100 SDR17 110 mm PN10 joints give work plus row-local voluntary needs", async () => {
    const compiled = await compilePe110ElectrofusionJointR1({
      ...PE110_ELECTROFUSION_JOINT_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "20", unit_id: "pcs" }),
    ]);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([...REQUIRED.slice(1), ...CONDITIONAL]));
    expect(compiled.preliminaryNeeds).toHaveLength(9);
  });

  test("compiles the evidence-bound eight-row fixture", async () => {
    const compiled = await compilePe110ElectrofusionJointR1({
      ...PE110_ELECTROFUSION_JOINT_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "20", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[1], quantity: "20", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[2], quantity: "0.4", unit_id: "l" }),
      expect.objectContaining({ row_id: REQUIRED[3], quantity: "40", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[4], quantity: "20", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[5], quantity: "5", unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: REQUIRED[6], quantity: "3", unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: REQUIRED[7], quantity: "20", unit_id: "document" }),
    ]));
    expect(compiled.rows).toHaveLength(8);
  });

  test("keeps generator and pipe positioner conditional", async () => {
    const compiled = await compilePe110ElectrofusionJointR1({
      ...PE110_ELECTROFUSION_JOINT_ACCEPTANCE_INPUT,
      generator_mode: "REQUIRED",
      generator_designation: "Автономный генератор по ППР",
      generator_machine_h: 5,
      positioner_mode: "REQUIRED",
      positioner_designation: "Позиционер трубы ПЭ Ø110",
      positioner_machine_h: 4,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(10);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: CONDITIONAL[0], quantity: "5", unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: CONDITIONAL[1], quantity: "4", unit_id: "machine_hour" }),
    ]));
  });

  test("rejects invalid values and unrelated identities", async () => {
    await expect(compilePe110ElectrofusionJointR1({
      ...PE110_ELECTROFUSION_JOINT_SHORT_INPUT,
      count: -1,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compilePe110ElectrofusionJointR1(
      { ...PE110_ELECTROFUSION_JOINT_ACCEPTANCE_INPUT },
      { catalogId: `${PE110_ELECTROFUSION_JOINT_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("PE110_ELECTROFUSION_JOINT_CATALOG_UNSUPPORTED");
  });
});
