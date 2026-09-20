import { validateCanonicalEstimateParameterInputs } from "./canonicalEstimateParameterValidation";
import type { CanonicalEstimateCatalogItem } from "./contracts";

const schema: CanonicalEstimateCatalogItem["parameterSchema"] = [
  { parameterId: "area", ordinal: 0, valueType: "decimal", unitId: "m2", titleRu: "Площадь", required: true, defaultValue: null, constraints: { min: 1, max: 10 } },
  { parameterId: "variant", ordinal: 1, valueType: "enum", unitId: null, titleRu: "Вариант", required: true, defaultValue: null, constraints: { values: ["a", "b"] } },
  { parameterId: "left", ordinal: 2, valueType: "boolean", unitId: null, titleRu: "Левый", required: false, defaultValue: false, constraints: { mutuallyExclusiveWith: ["right"] } },
  { parameterId: "right", ordinal: 3, valueType: "boolean", unitId: null, titleRu: "Правый", required: false, defaultValue: false, constraints: { mutuallyExclusiveWith: ["left"] } },
];

describe("canonical estimate parameter validation", () => {
  it("preserves exact decimal text and accepts one mutually-exclusive branch", () => {
    const result = validateCanonicalEstimateParameterInputs({ schema, rawInputs: { area: "2,50", variant: "a", left: "true", right: "false" } });
    expect(result).toEqual({ ok: true, parameters: { area: "2.50", variant: "a", left: true, right: false }, issues: [] });
  });

  it("rejects bounds, enum and simultaneous mutually-exclusive values", () => {
    const result = validateCanonicalEstimateParameterInputs({ schema, rawInputs: { area: "11", variant: "c", left: "true", right: "true" } });
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(["MAX", "ENUM", "MUTUALLY_EXCLUSIVE"]));
  });

  it("does not coerce arbitrary boolean text to false", () => {
    const result = validateCanonicalEstimateParameterInputs({ schema, rawInputs: { area: "1", variant: "b", left: "yes" } });
    expect(result.issues).toContainEqual({ code: "TYPE", parameterId: "left" });
  });

  it("rejects contradictory area and rectangular dimensions", () => {
    const geometrySchema: CanonicalEstimateCatalogItem["parameterSchema"] = [
      { parameterId: "area_m2", ordinal: 0, valueType: "decimal", unitId: "m2", titleRu: "Площадь", required: true, defaultValue: null, constraints: { min: 1 } },
      { parameterId: "length_m", ordinal: 1, valueType: "decimal", unitId: "m", titleRu: "Длина", required: true, defaultValue: null, constraints: { min: 1 } },
      { parameterId: "width_m", ordinal: 2, valueType: "decimal", unitId: "m", titleRu: "Ширина", required: true, defaultValue: null, constraints: { min: 1 } },
    ];

    expect(validateCanonicalEstimateParameterInputs({
      schema: geometrySchema,
      rawInputs: { area_m2: 640, length_m: 200, width_m: 32 },
    }).issues).toContainEqual({
      code: "GEOMETRY_CONFLICT",
      parameterId: "area_m2",
      relatedParameterId: "length_m,width_m",
    });
    expect(validateCanonicalEstimateParameterInputs({
      schema: geometrySchema,
      rawInputs: { area_m2: 6400, length_m: 200, width_m: 32 },
    }).ok).toBe(true);
  });
});
