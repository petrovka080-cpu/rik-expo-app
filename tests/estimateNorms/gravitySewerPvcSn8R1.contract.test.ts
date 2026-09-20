import {
  GRAVITY_SEWER_PVC_SN8_ACCEPTANCE_INPUT,
  GRAVITY_SEWER_PVC_SN8_CATALOG_ID,
  GRAVITY_SEWER_PVC_SN8_FORMULAS,
  GRAVITY_SEWER_PVC_SN8_PARAMETERS,
  GRAVITY_SEWER_PVC_SN8_RESOURCES,
  GRAVITY_SEWER_PVC_SN8_SHORT_INPUT,
  compileGravitySewerPvcSn8R1,
} from "../../src/lib/estimate/v4/gravitySewerPvcSn8R1";

const REQUIRED = [
  "rc09:pvc_sn8_sewer_pipe_lay",
  "rc09:pvc_sewer_pipe_sn8_d160",
  "rc09:pvc_sewer_socket_seal_d160",
  "rc09:pvc_sewer_assembly_lubricant",
  "rc09:washed_sand_pipe_bedding",
  "rc09:pipe_laser_level",
  "rc09:sewer_pipe_leak_test",
] as const;
const CONDITIONAL = [
  "rc09:sewer_fitting",
  "rc09:crossing_casing",
  "rc09:weak_ground_geotextile",
] as const;

describe("MASTER gravity-sewer PVC SN8 owner", () => {
  test("uses the narrow route owner without importing historical scalar rates", () => {
    expect(GRAVITY_SEWER_PVC_SN8_CATALOG_ID)
      .toBe("canonical-work:base:plumbing_interior_sewer_route_standard");
    expect(GRAVITY_SEWER_PVC_SN8_PARAMETERS).toHaveLength(26);
    expect(GRAVITY_SEWER_PVC_SN8_FORMULAS).toHaveLength(10);
    expect(GRAVITY_SEWER_PVC_SN8_RESOURCES).toHaveLength(10);
    expect(JSON.stringify(GRAVITY_SEWER_PVC_SN8_FORMULAS))
      .not.toMatch(/golden_rate|normFactor|length_m\s*\*\s*(?:1\.02|0\.17|0\.012|0\.32|0\.02|0\.01)/iu);
    expect(GRAVITY_SEWER_PVC_SN8_RESOURCES.map((row) => row.row_id))
      .not.toEqual(expect.arrayContaining(["rc09:sewer_manhole", "rc09:sewer_pumping_station"]));
  });

  test("known 100 m PVC-U SN8 D160 route gives work plus row-local voluntary needs", async () => {
    const compiled = await compileGravitySewerPvcSn8R1({
      ...GRAVITY_SEWER_PVC_SN8_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "100", unit_id: "m" }),
    ]);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([...REQUIRED.slice(1), ...CONDITIONAL]));
    expect(compiled.preliminaryNeeds).toHaveLength(9);
  });

  test("compiles the evidence-bound seven-row fixture", async () => {
    const compiled = await compileGravitySewerPvcSn8R1({
      ...GRAVITY_SEWER_PVC_SN8_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "100", unit_id: "m" }),
      expect.objectContaining({ row_id: REQUIRED[1], quantity: "102", unit_id: "m" }),
      expect.objectContaining({ row_id: REQUIRED[2], quantity: "17", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[3], quantity: "1.2", unit_id: "kg" }),
      expect.objectContaining({ row_id: REQUIRED[4], quantity: "32", unit_id: "m3" }),
      expect.objectContaining({ row_id: REQUIRED[5], quantity: "2", unit_id: "shift" }),
      expect.objectContaining({ row_id: REQUIRED[6], quantity: "1", unit_id: "test" }),
    ]));
    expect(compiled.rows).toHaveLength(7);
  });

  test("keeps fittings, crossing casing and weak-ground geotextile conditional", async () => {
    const compiled = await compileGravitySewerPvcSn8R1({
      ...GRAVITY_SEWER_PVC_SN8_ACCEPTANCE_INPUT,
      fitting_mode: "REQUIRED",
      fitting_designation: "Отвод PVC-U SN8 Ø160 по проекту",
      fitting_quantity_piece: 3,
      casing_mode: "REQUIRED",
      casing_designation: "Футляр стальной по узлу пересечения",
      casing_length_m: 12,
      geotextile_mode: "REQUIRED",
      geotextile_designation: "Геотекстиль по узлу слабого грунта",
      geotextile_area_m2: 65,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(10);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: CONDITIONAL[0], quantity: "3", unit_id: "pcs" }),
      expect.objectContaining({ row_id: CONDITIONAL[1], quantity: "12", unit_id: "m" }),
      expect.objectContaining({ row_id: CONDITIONAL[2], quantity: "65", unit_id: "m2" }),
    ]));
  });

  test("rejects invalid values and unrelated identities", async () => {
    await expect(compileGravitySewerPvcSn8R1({
      ...GRAVITY_SEWER_PVC_SN8_SHORT_INPUT,
      length_m: -1,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileGravitySewerPvcSn8R1(
      { ...GRAVITY_SEWER_PVC_SN8_ACCEPTANCE_INPUT },
      { catalogId: `${GRAVITY_SEWER_PVC_SN8_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("GRAVITY_SEWER_PVC_SN8_CATALOG_UNSUPPORTED");
  });
});
