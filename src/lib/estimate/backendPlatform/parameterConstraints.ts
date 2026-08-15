export type CanonicalParameterDefinitionRecord = {
  parameter_id?: unknown;
  value_type?: unknown;
  required?: unknown;
  default_value?: unknown;
  constraints_json?: unknown;
};

type JsonRecord = Record<string, unknown>;

export class CanonicalParameterValidationError extends Error {
  readonly code = "PARAMETER_VALIDATION_FAILED" as const;

  constructor(message: string) {
    super(message);
    this.name = "CanonicalParameterValidationError";
  }
}

function fail(message: string): never {
  throw new CanonicalParameterValidationError(message);
}

function conditionMatches(raw: unknown, values: JsonRecord): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const condition = raw as JsonRecord;
  const parameterId = String(condition.parameterId ?? "");
  if (!parameterId) return false;
  return values[parameterId] === condition.equals;
}

function finiteNumber(value: unknown, field: string): number {
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(String(value)) || !Number.isFinite(Number(value))) {
    return fail(`invalid number ${field}`);
  }
  return Number(value);
}

export function validateCanonicalEstimateParameters(
  definitions: readonly CanonicalParameterDefinitionRecord[],
  input: JsonRecord,
): JsonRecord {
  if (!input || typeof input !== "object" || Array.isArray(input)) return fail("parameters must be an object");
  const values = { ...input };
  const byId = new Map(definitions.map((definition) => [String(definition.parameter_id ?? ""), definition]));
  const accepted = new Set(byId.keys());
  const unknown = Object.keys(values).filter((key) => !accepted.has(key));
  if (unknown.length) return fail(`unknown estimate parameters: ${unknown.slice(0, 10).join(",")}`);

  // Declared defaults are resolved before conditional rules. Numeric project
  // quantities in canonical content intentionally have no hidden defaults.
  for (const definition of definitions) {
    const id = String(definition.parameter_id ?? "");
    if (!id) return fail("parameter definition identity is empty");
    if (values[id] == null && definition.default_value != null) values[id] = definition.default_value;
  }

  for (const definition of definitions) {
    const id = String(definition.parameter_id);
    const constraints = definition.constraints_json && typeof definition.constraints_json === "object" && !Array.isArray(definition.constraints_json)
      ? definition.constraints_json as JsonRecord
      : {};
    const requiredByCondition = conditionMatches(constraints.requiredWhen, values);
    const forbiddenByCondition = conditionMatches(constraints.forbiddenWhen, values);
    const value = values[id];
    if (value == null) {
      if (definition.required === true || requiredByCondition) return fail(`missing parameter ${id}`);
      continue;
    }
    if (forbiddenByCondition) return fail(`parameter ${id} is forbidden by cross-field rule`);

    const valueType = String(definition.value_type ?? "");
    if (valueType === "boolean" && typeof value !== "boolean") return fail(`invalid boolean ${id}`);
    if (valueType === "text") {
      if (typeof value !== "string" || !value.trim()) return fail(`invalid text ${id}`);
      if (constraints.maxLength != null && value.length > Number(constraints.maxLength)) return fail(`text too long ${id}`);
    }
    if (valueType === "enum") {
      if (!Array.isArray(constraints.values) || constraints.values.length < 1 || !constraints.values.includes(value)) {
        return fail(`invalid enum ${id}`);
      }
    }
    if (valueType === "decimal" || valueType === "integer") {
      const numeric = finiteNumber(value, id);
      if (valueType === "integer" && !Number.isInteger(numeric)) return fail(`invalid integer ${id}`);
      if (constraints.min != null && numeric < Number(constraints.min)) return fail(`parameter below minimum ${id}`);
      if (constraints.max != null && numeric > Number(constraints.max)) return fail(`parameter above maximum ${id}`);
      for (const [rule, compare] of [
        ["greaterThanOrEqualParameter", (left: number, right: number) => left >= right],
        ["greaterThanParameter", (left: number, right: number) => left > right],
        ["lessThanOrEqualParameter", (left: number, right: number) => left <= right],
        ["lessThanParameter", (left: number, right: number) => left < right],
      ] as const) {
        const peerId = constraints[rule];
        if (peerId == null) continue;
        const peerValue = values[String(peerId)];
        if (peerValue == null || !compare(numeric, finiteNumber(peerValue, String(peerId)))) {
          return fail(`cross-field rule ${id}.${rule}=${String(peerId)} failed`);
        }
      }
    }
  }

  const booleanGroups = new Map<string, string[]>();
  for (const definition of definitions) {
    const constraints = definition.constraints_json && typeof definition.constraints_json === "object" && !Array.isArray(definition.constraints_json)
      ? definition.constraints_json as JsonRecord
      : {};
    const group = constraints.mutuallyExclusiveBooleanGroup;
    if (group == null || values[String(definition.parameter_id)] !== true) continue;
    const members = booleanGroups.get(String(group)) ?? [];
    members.push(String(definition.parameter_id));
    booleanGroups.set(String(group), members);
  }
  for (const [group, members] of booleanGroups) {
    if (members.length > 1) return fail(`mutually exclusive boolean group ${group} enabled simultaneously: ${members.join(",")}`);
  }
  return values;
}
