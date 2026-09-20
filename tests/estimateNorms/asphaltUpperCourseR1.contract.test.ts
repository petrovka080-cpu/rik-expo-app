import {
  ASPHALT_UPPER_COURSE_ACCEPTANCE_INPUT,
  ASPHALT_UPPER_COURSE_CATALOG_ID,
  ASPHALT_UPPER_COURSE_FORMULAS,
  ASPHALT_UPPER_COURSE_PARAMETERS,
  ASPHALT_UPPER_COURSE_RESOURCES,
  ASPHALT_UPPER_COURSE_SHORT_INPUT,
  compileAsphaltUpperCourseR1,
} from "../../src/lib/estimate/v4/asphaltUpperCourseR1";

const REQUIRED = [
  "rc09:asphalt_upper_course_lay_compact",
  "rc09:dense_hot_asphalt_mix_upper_course",
  "rc09:cationic_bitumen_emulsion_tack_coat",
  "rc09:asphalt_joint_edge_sealant",
  "rc09:asphalt_paver_operation",
  "rc09:tandem_roller_operation",
  "rc09:asphalt_density_temperature_control",
] as const;
const CONDITIONAL = "rc09:asphalt_core_sampling";

describe("MASTER asphalt upper-course owner", () => {
  test("uses the direct owner without importing unselected KRER resource rates", () => {
    expect(ASPHALT_UPPER_COURSE_CATALOG_ID)
      .toBe("canonical-work:base:paving_roads_landscape_interior_asphalt_lay_standard");
    expect(ASPHALT_UPPER_COURSE_PARAMETERS).toHaveLength(16);
    expect(ASPHALT_UPPER_COURSE_FORMULAS).toHaveLength(8);
    expect(ASPHALT_UPPER_COURSE_RESOURCES).toHaveLength(8);
    expect(JSON.stringify(ASPHALT_UPPER_COURSE_FORMULAS))
      .not.toMatch(/golden_rate|normFactor|area_m2\s*\*\s*(?:0\.123|0\.35|0\.08|0\.012|0\.018|0\.025)/iu);
    expect(ASPHALT_UPPER_COURSE_RESOURCES.map((row) => row.row_id)).not.toEqual(expect.arrayContaining([
      "rc09:road_subgrade", "rc09:sand_base", "rc09:crushed_stone_base",
      "rc09:road_geotextile", "rc09:asphalt_lower_course",
    ]));
  });

  test("known 120 m2 and 50 mm give work plus row-local needs", async () => {
    const compiled = await compileAsphaltUpperCourseR1({ ...ASPHALT_UPPER_COURSE_SHORT_INPUT });
    expect(compiled.rows).toEqual([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "120", unit_id: "m2" }),
    ]);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([...REQUIRED.slice(1), CONDITIONAL]));
    expect(compiled.preliminaryNeeds).toHaveLength(7);
  });

  test("compiles the evidence-bound seven-row fixture", async () => {
    const compiled = await compileAsphaltUpperCourseR1({ ...ASPHALT_UPPER_COURSE_ACCEPTANCE_INPUT });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "120", unit_id: "m2" }),
      expect.objectContaining({ row_id: REQUIRED[1], quantity: "14.76", unit_id: "t" }),
      expect.objectContaining({ row_id: REQUIRED[2], quantity: "42", unit_id: "kg" }),
      expect.objectContaining({ row_id: REQUIRED[3], quantity: "9.6", unit_id: "kg" }),
      expect.objectContaining({ row_id: REQUIRED[4], quantity: "1.44", unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: REQUIRED[5], quantity: "2.16", unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: REQUIRED[6], quantity: "3", unit_id: "test" }),
    ]));
    expect(compiled.rows).toHaveLength(7);
  });

  test("keeps core sampling conditional", async () => {
    const compiled = await compileAsphaltUpperCourseR1({
      ...ASPHALT_UPPER_COURSE_ACCEPTANCE_INPUT,
      core_sampling_mode: "REQUIRED",
      core_sampling_count_test: 2,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.rows).toContainEqual(expect.objectContaining({
      row_id: CONDITIONAL, quantity: "2", unit_id: "test",
    }));
  });

  test("rejects invalid values and unrelated identities", async () => {
    await expect(compileAsphaltUpperCourseR1({
      ...ASPHALT_UPPER_COURSE_SHORT_INPUT, asphalt_mix_quantity_t: -1,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileAsphaltUpperCourseR1(
      { ...ASPHALT_UPPER_COURSE_ACCEPTANCE_INPUT },
      { catalogId: `${ASPHALT_UPPER_COURSE_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("ASPHALT_UPPER_COURSE_CATALOG_UNSUPPORTED");
  });
});
