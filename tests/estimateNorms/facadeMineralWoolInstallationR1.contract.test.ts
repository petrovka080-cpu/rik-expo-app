import {
  FACADE_MINERAL_WOOL_INSTALLATION_ACCEPTANCE_INPUT,
  FACADE_MINERAL_WOOL_INSTALLATION_CATALOG_ID,
  FACADE_MINERAL_WOOL_INSTALLATION_FORMULAS,
  FACADE_MINERAL_WOOL_INSTALLATION_PARAMETERS,
  FACADE_MINERAL_WOOL_INSTALLATION_RESOURCES,
  FACADE_MINERAL_WOOL_INSTALLATION_SHORT_INPUT,
  compileFacadeMineralWoolInstallationR1,
} from "../../src/lib/estimate/v4/facadeMineralWoolInstallationR1";

const REQUIRED_ROW_IDS = [
  "rc09:facade_mineral_wool_install",
  "rc09:facade_mineral_wool_board_120mm",
  "rc09:facade_mineral_wool_adhesive",
  "rc09:facade_disc_dowel_200mm_metal_pin",
  "rc09:facade_insulation_lift",
  "rc09:facade_insulation_pullout_control",
] as const;

const CONDITIONAL_ROW_IDS = [
  "rc09:mineral_wool_fire_barrier_lamella",
  "rc09:facade_start_profile",
] as const;

describe("MASTER facade mineral-wool installation owner", () => {
  test("uses the direct facade-insulation owner with the narrow system boundary", () => {
    expect(FACADE_MINERAL_WOOL_INSTALLATION_CATALOG_ID)
      .toBe("canonical-work:base:insulation_interior_facade_install_standard");
    expect(FACADE_MINERAL_WOOL_INSTALLATION_PARAMETERS).toHaveLength(17);
    expect(FACADE_MINERAL_WOOL_INSTALLATION_FORMULAS).toHaveLength(8);
    expect(FACADE_MINERAL_WOOL_INSTALLATION_RESOURCES).toHaveLength(8);
    const serialized = JSON.stringify({
      formulas: FACADE_MINERAL_WOOL_INSTALLATION_FORMULAS,
      resources: FACADE_MINERAL_WOOL_INSTALLATION_RESOURCES,
    });
    expect(serialized).not.toMatch(/golden_rate|normFactor|area_m2\s*\*\s*(?:1\.05|5|6|0\.2)/iu);
    expect(serialized).not.toMatch(/facade_decorative_plaster|facade_paint|facade_base_coat_mesh/iu);
  });

  test("turns known 300 m2 into installation work and keeps system quantities visible", async () => {
    const compiled = await compileFacadeMineralWoolInstallationR1({
      ...FACADE_MINERAL_WOOL_INSTALLATION_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual([
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[0], quantity: "300", unit_id: "m2" }),
    ]);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id)).toEqual(
      expect.arrayContaining([...REQUIRED_ROW_IDS.slice(1), ...CONDITIONAL_ROW_IDS]),
    );
    expect(compiled.preliminaryNeeds).toHaveLength(7);
    expect(compiled.preliminaryNeeds.every((need) => need.quantity == null)).toBe(true);
  });

  test("compiles the evidence-bound six-row fixture without unresolved needs", async () => {
    const compiled = await compileFacadeMineralWoolInstallationR1({
      ...FACADE_MINERAL_WOOL_INSTALLATION_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(6);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[0], quantity: "300", unit_id: "m2" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[1], quantity: "315", unit_id: "m2" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[2], quantity: "1500", unit_id: "kg" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[3], quantity: "1800", unit_id: "piece" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[4], quantity: "12", unit_id: "shift" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[5], quantity: "8", unit_id: "test" }),
    ]));
  });

  test("keeps fire barriers and the start profile fail-closed", async () => {
    const compiled = await compileFacadeMineralWoolInstallationR1({
      ...FACADE_MINERAL_WOOL_INSTALLATION_ACCEPTANCE_INPUT,
      fire_barrier_lamella_mode: "REQUIRED",
      fire_barrier_lamella_designation: "Минераловатная ламель по противопожарным узлам",
      fire_barrier_lamella_length_m: 42,
      start_profile_mode: "REQUIRED",
      start_profile_designation: "Стартовый профиль по фасадному узлу",
      start_profile_length_m: 65,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: CONDITIONAL_ROW_IDS[0], quantity: "42" }),
      expect.objectContaining({ row_id: CONDITIONAL_ROW_IDS[1], quantity: "65" }),
    ]));
  });

  test("rejects invalid supplied values and unrelated identities", async () => {
    await expect(compileFacadeMineralWoolInstallationR1({
      ...FACADE_MINERAL_WOOL_INSTALLATION_SHORT_INPUT,
      disc_dowel_quantity_piece: -1,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileFacadeMineralWoolInstallationR1(
      { ...FACADE_MINERAL_WOOL_INSTALLATION_ACCEPTANCE_INPUT },
      { catalogId: `${FACADE_MINERAL_WOOL_INSTALLATION_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("FACADE_MINERAL_WOOL_INSTALLATION_CATALOG_UNSUPPORTED");
  });
});
