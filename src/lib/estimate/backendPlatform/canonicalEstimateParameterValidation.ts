import type { CanonicalEstimateCatalogItem } from "./contracts";

type ParameterSchema = CanonicalEstimateCatalogItem["parameterSchema"][number];
type ParameterValue = string | number | boolean;

export type CanonicalParameterValidationIssue = {
  code:
    | "REQUIRED"
    | "TYPE"
    | "ENUM"
    | "MIN"
    | "MAX"
    | "MUTUALLY_EXCLUSIVE"
    | "REQUIRES"
    | "REQUIRED_WHEN"
    | "FORBIDDEN_WHEN";
  parameterId: string;
  relatedParameterId?: string;
};

export type CanonicalParameterValidationResult = {
  ok: boolean;
  parameters: Record<string, ParameterValue>;
  issues: CanonicalParameterValidationIssue[];
};

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
    : [];
}

function allowedValues(schema: ParameterSchema): unknown[] {
  const raw = schema.constraints.values ?? schema.constraints.allowedValues ?? schema.constraints.enum;
  return Array.isArray(raw) ? raw : [];
}

function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function isActive(value: unknown): boolean {
  return value === true || (typeof value === "number" && value !== 0) || (typeof value === "string" && value.trim() !== "" && value !== "false" && value !== "0");
}

function conditionMatches(raw: unknown, values: Record<string, ParameterValue>): { parameterId: string; matches: boolean } | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const condition = raw as Record<string, unknown>;
  const parameterId = typeof condition.parameterId === "string" ? condition.parameterId : "";
  if (!parameterId) return null;
  return { parameterId, matches: values[parameterId] === condition.equals };
}

function parseValue(schema: ParameterSchema, rawInput: unknown): ParameterValue | undefined {
  const source = isPresent(rawInput) ? rawInput : schema.defaultValue;
  if (!isPresent(source)) return undefined;
  if (schema.valueType === "boolean") {
    if (typeof source === "boolean") return source;
    if (source === "true" || source === "1" || source === 1) return true;
    if (source === "false" || source === "0" || source === 0) return false;
    return undefined;
  }
  if (schema.valueType === "decimal" || schema.valueType === "integer") {
    const normalized = String(source).trim().replace(",", ".");
    if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized) || !Number.isFinite(Number(normalized))) return undefined;
    if (schema.valueType === "integer" && !/^[+-]?\d+$/.test(normalized)) return undefined;
    return normalized;
  }
  if (typeof source !== "string" && typeof source !== "number") return undefined;
  return String(source);
}

/** Client projection of the backend parameter contract; never evaluates formulas or ResourceGraph. */
export function validateCanonicalEstimateParameterInputs(input: {
  schema: ParameterSchema[];
  rawInputs: Record<string, unknown>;
}): CanonicalParameterValidationResult {
  const parameters: Record<string, ParameterValue> = {};
  const issues: CanonicalParameterValidationIssue[] = [];

  for (const definition of input.schema) {
    const supplied = isPresent(input.rawInputs[definition.parameterId]) || isPresent(definition.defaultValue);
    const value = parseValue(definition, input.rawInputs[definition.parameterId]);
    if (!supplied) {
      if (definition.required) issues.push({ code: "REQUIRED", parameterId: definition.parameterId });
      continue;
    }
    if (value === undefined) {
      issues.push({ code: "TYPE", parameterId: definition.parameterId });
      continue;
    }
    parameters[definition.parameterId] = value;
    const choices = allowedValues(definition);
    if (definition.valueType === "enum" && !choices.some((candidate) => String(candidate) === String(value))) {
      issues.push({ code: "ENUM", parameterId: definition.parameterId });
    }
    if (definition.valueType === "decimal" || definition.valueType === "integer") {
      const numeric = Number(value);
      const minimum = definition.constraints.min == null ? null : Number(definition.constraints.min);
      const maximum = definition.constraints.max == null ? null : Number(definition.constraints.max);
      if (minimum != null && Number.isFinite(minimum) && numeric < minimum) issues.push({ code: "MIN", parameterId: definition.parameterId });
      if (maximum != null && Number.isFinite(maximum) && numeric > maximum) issues.push({ code: "MAX", parameterId: definition.parameterId });
    }
  }

  for (const definition of input.schema) {
    const value = parameters[definition.parameterId];
    if (isActive(value)) {
      for (const relatedParameterId of stringList(definition.constraints.mutuallyExclusiveWith)) {
        if (isActive(parameters[relatedParameterId])) issues.push({ code: "MUTUALLY_EXCLUSIVE", parameterId: definition.parameterId, relatedParameterId });
      }
      for (const relatedParameterId of stringList(definition.constraints.requires)) {
        if (!isPresent(parameters[relatedParameterId])) issues.push({ code: "REQUIRES", parameterId: definition.parameterId, relatedParameterId });
      }
    }
    const requiredWhen = conditionMatches(definition.constraints.requiredWhen, parameters);
    if (requiredWhen?.matches && !isPresent(value)) issues.push({ code: "REQUIRED_WHEN", parameterId: definition.parameterId, relatedParameterId: requiredWhen.parameterId });
    const forbiddenWhen = conditionMatches(definition.constraints.forbiddenWhen, parameters);
    if (forbiddenWhen?.matches && isPresent(value)) issues.push({ code: "FORBIDDEN_WHEN", parameterId: definition.parameterId, relatedParameterId: forbiddenWhen.parameterId });
  }

  const unique = new Map(issues.map((issue) => [`${issue.code}:${issue.parameterId}:${issue.relatedParameterId ?? ""}`, issue]));
  return { ok: unique.size === 0, parameters, issues: [...unique.values()] };
}
