import {
  ASPHALT_UPPER_COURSE_ACCEPTANCE_INPUT,
  ASPHALT_UPPER_COURSE_CATALOG_ID,
  ASPHALT_UPPER_COURSE_FORMULAS,
  ASPHALT_UPPER_COURSE_INDEPENDENT_COMPLETENESS_MAP,
  ASPHALT_UPPER_COURSE_PARAMETERS,
  ASPHALT_UPPER_COURSE_RESOURCES,
  ASPHALT_UPPER_COURSE_SHORT_INPUT,
  compileAsphaltUpperCourseR1,
} from "../../src/lib/estimate/v4/asphaltUpperCourseR1";
import { validateIndependentCompletenessMapReferences } from "../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1";

type Compiled = Awaited<ReturnType<typeof compileAsphaltUpperCourseR1>>;

function row(result: Compiled, rowId: string) {
  const found = result.rows.find((candidate) => candidate.row_id === rowId);
  if (!found) throw new Error(`compiled row missing: ${rowId}`);
  return found;
}

describe("MASTER asphalt upper-course automatic operation", () => {
  test("keeps only area and thickness as ordinary user geometry", () => {
    expect(ASPHALT_UPPER_COURSE_CATALOG_ID)
      .toBe("canonical-work:base:paving_roads_landscape_interior_asphalt_lay_standard");
    expect(ASPHALT_UPPER_COURSE_PARAMETERS).toHaveLength(30);
    expect(ASPHALT_UPPER_COURSE_FORMULAS).toHaveLength(23);
    expect(ASPHALT_UPPER_COURSE_RESOURCES).toHaveLength(57);
    expect(validateIndependentCompletenessMapReferences({
      completenessMap: ASPHALT_UPPER_COURSE_INDEPENDENT_COMPLETENESS_MAP,
      formulaDefinitions: ASPHALT_UPPER_COURSE_FORMULAS,
      resourceDefinitions: ASPHALT_UPPER_COURSE_RESOURCES,
    })).toEqual([]);

    const userParameters = ASPHALT_UPPER_COURSE_PARAMETERS.filter((parameter) =>
      parameter.truth_metadata?.visibility_role === "USER_INPUT");
    expect(userParameters.map((parameter) => parameter.parameter_id))
      .toEqual(["area_m2", "layer_thickness_mm"]);
    expect(ASPHALT_UPPER_COURSE_PARAMETERS.find((parameter) =>
      parameter.parameter_id === "asphalt_mix_base_t_per_1000m2")?.truth_metadata)
      .toMatchObject({ preliminary_compilation_allowed: true });
  });

  test("calculates 900 m2 x 50 mm without asking for mass or machine-hours", async () => {
    const result = await compileAsphaltUpperCourseR1({ ...ASPHALT_UPPER_COURSE_SHORT_INPUT });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows).toHaveLength(ASPHALT_UPPER_COURSE_RESOURCES.length);
    expect(row(result, "asphalt:control:geometric-compacted-volume")).toMatchObject({
      quantity: "45", unit_id: "m3",
    });
    expect(row(result, "asphalt:material:hot-dense-fine-mix")).toMatchObject({
      quantity: "108.72", unit_id: "t", included_in_procurement: true,
      title_ru: "Горячая асфальтобетонная смесь, тип и марка по проекту",
    });
    expect(row(result, "asphalt:labor:road-workers")).toMatchObject({
      quantity: "34.632", unit_id: "man_hour",
    });
    expect(row(result, "asphalt:equipment:smooth-roller-8t")).toMatchObject({
      quantity: "3.564", unit_id: "machine_hour",
    });
    expect(row(result, "asphalt:equipment:asphalt-paver")).toMatchObject({
      quantity: "2.871", unit_id: "machine_hour",
    });
    expect(row(result, "asphalt:delivery:truck-trips")).toMatchObject({
      quantity: "6", unit_id: "trip",
    });
    expect(row(result, "asphalt:delivery:ton-km")).toMatchObject({
      quantity: "2174.4", unit_id: "t_km",
    });
    expect(row(result, "asphalt:delivery:truck-machine-hours")).toMatchObject({
      quantity: "9", unit_id: "machine_hour",
    });
  });

  test("acceptance input and ordinary input produce the same complete operation", async () => {
    const ordinary = await compileAsphaltUpperCourseR1({ ...ASPHALT_UPPER_COURSE_SHORT_INPUT });
    const accepted = await compileAsphaltUpperCourseR1({ ...ASPHALT_UPPER_COURSE_ACCEPTANCE_INPUT });
    expect(accepted.preliminaryNeeds).toEqual([]);
    expect(accepted.rows).toEqual(ordinary.rows);
  });

  test("recalculates the profile after a supported thickness edit", async () => {
    const result = await compileAsphaltUpperCourseR1({
      ...ASPHALT_UPPER_COURSE_SHORT_INPUT,
      layer_thickness_mm: 55,
    });
    expect(row(result, "asphalt:control:geometric-compacted-volume").quantity).toBe("49.5");
    expect(row(result, "asphalt:material:hot-dense-fine-mix").quantity).toBe("119.61");
    expect(row(result, "asphalt:labor:road-workers").quantity).toBe("34.713");
  });

  test("rejects invalid values and unrelated identities", async () => {
    await expect(compileAsphaltUpperCourseR1({
      ...ASPHALT_UPPER_COURSE_SHORT_INPUT,
      layer_thickness_mm: 52,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileAsphaltUpperCourseR1(
      { ...ASPHALT_UPPER_COURSE_ACCEPTANCE_INPUT },
      { catalogId: `${ASPHALT_UPPER_COURSE_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("ASPHALT_UPPER_COURSE_CATALOG_UNSUPPORTED");
  });
});
