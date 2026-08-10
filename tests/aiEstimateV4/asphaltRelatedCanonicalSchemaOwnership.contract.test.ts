import {
  ASPHALT_CANONICAL_PARAMETER_SCHEMA,
  ASPHALT_RELATED_CANONICAL_PARAMETER_SCHEMAS_V4,
  REGISTERED_CANONICAL_PARAMETER_SCHEMAS,
} from "../../src/lib/estimate/canonicalParameters/registeredCanonicalParameterSchemas";

describe("asphalt-related canonical parameter schema ownership", () => {
  test("reuses the established asphalt_concrete_pavement schema owner without duplicate registration", () => {
    expect(ASPHALT_CANONICAL_PARAMETER_SCHEMA.canonicalWorkKey).toBe("asphalt_concrete_pavement");
    expect(ASPHALT_RELATED_CANONICAL_PARAMETER_SCHEMAS_V4).toHaveLength(8);
    expect(ASPHALT_RELATED_CANONICAL_PARAMETER_SCHEMAS_V4.some(
      (schema) => schema.canonicalWorkKey === "asphalt_concrete_pavement",
    )).toBe(false);
    expect(REGISTERED_CANONICAL_PARAMETER_SCHEMAS.getByCanonicalWorkKey(
      "asphalt_concrete_pavement",
    )).toBe(ASPHALT_CANONICAL_PARAMETER_SCHEMA);
    expect(new Set(REGISTERED_CANONICAL_PARAMETER_SCHEMAS.schemas.map(
      (schema) => schema.schemaId,
    )).size).toBe(REGISTERED_CANONICAL_PARAMETER_SCHEMAS.schemas.length);
  });
});
