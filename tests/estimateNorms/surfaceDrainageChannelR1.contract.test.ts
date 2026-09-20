import {
  SURFACE_DRAINAGE_CHANNEL_ACCEPTANCE_INPUT,
  SURFACE_DRAINAGE_CHANNEL_CATALOG_ID,
  SURFACE_DRAINAGE_CHANNEL_FORMULAS,
  SURFACE_DRAINAGE_CHANNEL_PARAMETERS,
  SURFACE_DRAINAGE_CHANNEL_RESOURCES,
  SURFACE_DRAINAGE_CHANNEL_SHORT_INPUT,
  compileSurfaceDrainageChannelR1,
} from "../../src/lib/estimate/v4/surfaceDrainageChannelR1";

const REQUIRED = [
  "rc09:drainage_channel_install",
  "rc09:polymer_concrete_channel_dn200_d400",
  "rc09:ductile_iron_grating_d400",
  "rc09:channel_grating_fastener",
  "rc09:channel_concrete_encasement_b25",
  "rc09:channel_end_cap_dn200",
  "rc09:channel_joint_sealant",
  "rc09:channel_level_slope_control",
] as const;
const CONDITIONAL = [
  "rc09:channel_silt_trap",
  "rc09:channel_reinforcement_mesh",
  "rc09:pavement_reinstatement",
] as const;

describe("MASTER surface-drainage-channel owner", () => {
  test("uses the narrow tray owner without importing historical scalar rates", () => {
    expect(SURFACE_DRAINAGE_CHANNEL_CATALOG_ID)
      .toBe("canonical-work:base:paving_roads_landscape_interior_asphalt_drain_large_area");
    expect(SURFACE_DRAINAGE_CHANNEL_PARAMETERS).toHaveLength(25);
    expect(SURFACE_DRAINAGE_CHANNEL_FORMULAS).toHaveLength(11);
    expect(SURFACE_DRAINAGE_CHANNEL_RESOURCES).toHaveLength(11);
    expect(JSON.stringify(SURFACE_DRAINAGE_CHANNEL_FORMULAS))
      .not.toMatch(/golden_rate|normFactor|length_m\s*\*\s*(?:1\.02|2|0\.12|0\.08)/iu);
    expect(SURFACE_DRAINAGE_CHANNEL_RESOURCES.map((row) => row.row_id))
      .not.toEqual(expect.arrayContaining([
        "rc09:storm_sewer_network",
        "rc09:road_full_pavement_package",
      ]));
  });

  test("known 80 m and D400 give work plus row-local voluntary needs", async () => {
    const compiled = await compileSurfaceDrainageChannelR1({
      ...SURFACE_DRAINAGE_CHANNEL_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "80", unit_id: "m" }),
    ]);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([...REQUIRED.slice(1), ...CONDITIONAL]));
    expect(compiled.preliminaryNeeds).toHaveLength(10);
  });

  test("compiles the evidence-bound eight-row fixture", async () => {
    const compiled = await compileSurfaceDrainageChannelR1({
      ...SURFACE_DRAINAGE_CHANNEL_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "80", unit_id: "m" }),
      expect.objectContaining({ row_id: REQUIRED[1], quantity: "81.6", unit_id: "m" }),
      expect.objectContaining({ row_id: REQUIRED[2], quantity: "81.6", unit_id: "m" }),
      expect.objectContaining({ row_id: REQUIRED[3], quantity: "160", unit_id: "set" }),
      expect.objectContaining({ row_id: REQUIRED[4], quantity: "9.6", unit_id: "m3" }),
      expect.objectContaining({ row_id: REQUIRED[5], quantity: "2", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[6], quantity: "1.44", unit_id: "l" }),
      expect.objectContaining({ row_id: REQUIRED[7], quantity: "2", unit_id: "test" }),
    ]));
    expect(compiled.rows).toHaveLength(8);
  });

  test("keeps silt traps, reinforcement and pavement reinstatement conditional", async () => {
    const compiled = await compileSurfaceDrainageChannelR1({
      ...SURFACE_DRAINAGE_CHANNEL_ACCEPTANCE_INPUT,
      silt_trap_mode: "REQUIRED",
      silt_trap_designation: "Пескоуловитель DN200 выбранной системы",
      silt_trap_quantity_piece: 2,
      reinforcement_mesh_mode: "REQUIRED",
      reinforcement_mesh_designation: "Сетка арматурная по рабочему узлу обоймы",
      reinforcement_mesh_area_m2: 45,
      pavement_reinstatement_mode: "REQUIRED",
      pavement_reinstatement_designation: "Локальное восстановление покрытия по рабочему узлу",
      pavement_reinstatement_area_m2: 16,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(11);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: CONDITIONAL[0], quantity: "2", unit_id: "pcs" }),
      expect.objectContaining({ row_id: CONDITIONAL[1], quantity: "45", unit_id: "m2" }),
      expect.objectContaining({ row_id: CONDITIONAL[2], quantity: "16", unit_id: "m2" }),
    ]));
  });

  test("rejects invalid values and unrelated identities", async () => {
    await expect(compileSurfaceDrainageChannelR1({
      ...SURFACE_DRAINAGE_CHANNEL_SHORT_INPUT,
      channel_quantity_m: -1,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileSurfaceDrainageChannelR1(
      { ...SURFACE_DRAINAGE_CHANNEL_ACCEPTANCE_INPUT },
      { catalogId: `${SURFACE_DRAINAGE_CHANNEL_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("SURFACE_DRAINAGE_CHANNEL_CATALOG_UNSUPPORTED");
  });
});
