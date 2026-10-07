import { canonicalNumericPeerConstraintMessageRu, validateCanonicalEstimateParameterInputs } from "./canonicalEstimateParameterValidation";
import type { CanonicalEstimateCatalogItem } from "./contracts";
import { NUMERIC_PARAMETER_RELATIONS } from "./numericParameterRelations";
import { canonicalNumericRelationDependencies, missingCanonicalNumericRelationParameterIds, validateCanonicalEstimateParameters } from "./parameterConstraints";

type Schema = CanonicalEstimateCatalogItem["parameterSchema"];
function schema(rule: string): Schema {
  return [
    { parameterId: "left", ordinal: 0, valueType: "decimal", unitId: "mm", titleRu: "Внутренний диаметр", required: true, defaultValue: null, constraints: { [rule]: "right" } },
    { parameterId: "right", ordinal: 1, valueType: "decimal", unitId: "mm", titleRu: "Диаметр сборки", required: false, defaultValue: null, constraints: {} },
  ];
}
function backendDefinitions(definitions: Schema) {
  return definitions.map(d => ({
    parameter_id: d.parameterId, value_type: d.valueType, required: d.required,
    default_value: d.defaultValue, constraints_json: d.constraints,
  }));
}
function backend(definitions: Schema, parameters: Record<string, unknown>) {
  return validateCanonicalEstimateParameters(backendDefinitions(definitions), parameters);
}

describe("existing numeric peer constraints: client/backend parity", () => {
  const cases = [
    ["equalToParameter", 10, 10, true], ["equalToParameter", 11, 10, false],
    ["greaterThanOrEqualParameter", 10, 10, true], ["greaterThanOrEqualParameter", 9, 10, false],
    ["greaterThanParameter", 11, 10, true], ["greaterThanParameter", 10, 10, false],
    ["lessThanOrEqualParameter", 10, 10, true], ["lessThanOrEqualParameter", 11, 10, false],
    ["lessThanParameter", 9, 10, true], ["lessThanParameter", 10, 10, false],
    ["equalToParameter", 0, 0, true], ["greaterThanParameter", 0, 0, false],
  ] as const;
  it.each(cases)("%s compares %s to %s -> %s in either parameter order", (rule, left, right, expected) => {
    for (const definitions of [schema(rule), schema(rule).reverse()]) {
      const result = validateCanonicalEstimateParameterInputs({ schema: definitions, rawInputs: { left, right } });
      expect(result.ok).toBe(expected);
      if (expected) expect(backend(definitions, result.parameters)).toEqual(result.parameters);
      else {
        expect(result.issues).toContainEqual({ code: "CROSS_FIELD", parameterId: "left", relatedParameterId: "right", constraint: rule });
        expect(() => backend(definitions, result.parameters)).toThrow("cross-field rule");
      }
    }
  });

  it.each([undefined, null, ""])("retains missing peer %s as an unresolved dependency, never zero or a numeric conflict", right => {
    for (const [rule] of NUMERIC_PARAMETER_RELATIONS) {
      const definitions = schema(rule);
      const result = validateCanonicalEstimateParameterInputs({ schema: definitions, rawInputs: { left: 0, right } });
      expect(result.ok).toBe(false);
      expect(result.issues).toEqual([{ code: "REQUIRED", parameterId: "right" }]);
      const resolved = backend(definitions, result.parameters);
      expect(resolved).toEqual({ left: "0" });
      expect(missingCanonicalNumericRelationParameterIds(canonicalNumericRelationDependencies(backendDefinitions(definitions)), ["left"], resolved)).toEqual(["right"]);
    }
  });

  it.each(["not-a-number", "Infinity", "NaN"])("rejects supplied invalid peer %s through client and raw server input", right => {
    for (const [rule] of NUMERIC_PARAMETER_RELATIONS) {
      const definitions = schema(rule);
      const result = validateCanonicalEstimateParameterInputs({ schema: definitions, rawInputs: { left: 0, right } });
      expect(result.ok).toBe(false);
      expect(result.issues).toContainEqual({ code: "TYPE", parameterId: "right" });
      expect(result.issues).toContainEqual({ code: "CROSS_FIELD", parameterId: "left", relatedParameterId: "right", constraint: rule });
      expect(() => backend(definitions, { left: 0, right })).toThrow("invalid number right");
    }
  });

  it("normalizes comma input once before sending exact decimal text to the backend", () => {
    const definitions = schema("greaterThanParameter");
    const result = validateCanonicalEstimateParameterInputs({ schema: definitions, rawInputs: { left: "10,50", right: "10,25" } });
    expect(result).toEqual({ ok: true, parameters: { left: "10.50", right: "10.25" }, issues: [] });
    expect(backend(definitions, result.parameters)).toEqual(result.parameters);
  });

  it.each(["INTERNAL_ONLY", "USER_DERIVED_READONLY"] as const)("uses %s peer evidence without adding a protected override", visibilityRole => {
    const definitions = schema("greaterThanParameter");
    definitions[1] = { ...definitions[1]!, visibilityRole, defaultValue: 10 };
    const result = validateCanonicalEstimateParameterInputs({ schema: definitions, rawInputs: { left: 11, right: 10 } });
    expect(result).toEqual({ ok: true, parameters: { left: "11" }, issues: [] });
    expect(backend(definitions, result.parameters)).toEqual({ left: "11", right: 10 });
    expect(validateCanonicalEstimateParameterInputs({ schema: definitions, rawInputs: { left: 10 } }).ok).toBe(false);
  });

  it("rejects unknown peers, but leaves a missing left operand to the ordinary required contract", () => {
    expect(validateCanonicalEstimateParameterInputs({ schema: schema("greaterThanParameter").slice(0, 1), rawInputs: { left: 11, right: 10 } }).ok).toBe(false);
    const missing = validateCanonicalEstimateParameterInputs({ schema: schema("greaterThanParameter"), rawInputs: { right: 10 } });
    expect(missing.issues).toEqual([{ code: "REQUIRED", parameterId: "left" }]);
  });

  it("explains a rejected comparison by human field names rather than an internal rule ID", () => {
    expect(canonicalNumericPeerConstraintMessageRu(schema("greaterThanParameter"), {
      code: "CROSS_FIELD", parameterId: "left", relatedParameterId: "right", constraint: "greaterThanParameter",
    })).toBe("Параметры не сохранены: должно выполняться «Внутренний диаметр > Диаметр сборки». Уточните связанные значения.");
    expect(canonicalNumericPeerConstraintMessageRu(schema("greaterThanParameter"), { code: "REQUIRED", parameterId: "left" })).toBeNull();
  });
});
