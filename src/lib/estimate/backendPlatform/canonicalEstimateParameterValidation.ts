import type {
  CanonicalEstimateCatalogItem,
  CanonicalEstimateCompositeItem,
  CanonicalEstimateParameterInputValue,
} from "./contracts";
import { evaluateInclusionGraph } from "./inclusionGraph";

type ParameterSchema = CanonicalEstimateCatalogItem["parameterSchema"][number];
type ParameterValue = CanonicalEstimateParameterInputValue;

export type CanonicalParameterValidationIssue = {
  code:
    | "REQUIRED"
    | "TYPE"
    | "ENUM"
    | "MIN"
    | "MAX"
    | "COMPOSITE_SCHEMA"
    | "COMPOSITE_ITEM"
    | "COMPOSITE_SUBFIELD"
    | "MUTUALLY_EXCLUSIVE"
    | "REQUIRES"
    | "REQUIRED_WHEN"
    | "FORBIDDEN_WHEN"
    | "GEOMETRY_CONFLICT";
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
  if (Array.isArray(value)) return value.length > 0;
  return value === true || (typeof value === "number" && value !== 0) || (typeof value === "string" && value.trim() !== "" && value !== "false" && value !== "0");
}

function conditionMatches(raw: unknown, values: Record<string, ParameterValue>): { parameterId: string; matches: boolean } | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const condition = raw as Record<string, unknown>;
  const parameterId = typeof condition.parameterId === "string" ? condition.parameterId : "";
  if (typeof condition.kind === "string" && condition.kind.trim()) {
    return {
      parameterId,
      matches: evaluateInclusionGraph(condition, values),
    };
  }
  if (!parameterId || !Object.prototype.hasOwnProperty.call(condition, "equals")) return null;
  return { parameterId, matches: values[parameterId] === condition.equals };
}

function isCompositeItem(value: unknown): value is CanonicalEstimateCompositeItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return typeof item.itemId === "string" && item.itemId.length > 0
    && Number.isInteger(item.position) && Number(item.position) >= 0
    && Number.isInteger(item.version) && Number(item.version) >= 1
    && Boolean(item.values) && typeof item.values === "object" && !Array.isArray(item.values);
}

function parseScalarValue(valueType: Exclude<ParameterSchema["valueType"], "array_object">, source: unknown): string | number | boolean | undefined {
  if (valueType === "boolean") {
    if (typeof source === "boolean") return source;
    if (source === "true" || source === "1" || source === 1) return true;
    if (source === "false" || source === "0" || source === 0) return false;
    return undefined;
  }
  if (valueType === "decimal" || valueType === "integer") {
    const normalized = String(source).trim().replace(",", ".");
    if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized) || !Number.isFinite(Number(normalized))) return undefined;
    if (valueType === "integer" && !/^[+-]?\d+$/.test(normalized)) return undefined;
    return normalized;
  }
  if (typeof source !== "string" && typeof source !== "number") return undefined;
  return String(source);
}

function parseValue(schema: ParameterSchema, rawInput: unknown): ParameterValue | undefined {
  const source = isPresent(rawInput) ? rawInput : schema.defaultValue;
  if (!isPresent(source)) return undefined;
  if (schema.valueType === "array_object") {
    return Array.isArray(source) && source.every(isCompositeItem) ? source : undefined;
  }
  return parseScalarValue(schema.valueType, source);
}

/** Client projection of the backend parameter contract; never evaluates formulas or ResourceGraph. */
export function validateCanonicalEstimateParameterInputs(input: {
  schema: ParameterSchema[];
  rawInputs: Record<string, unknown>;
}): CanonicalParameterValidationResult {
  const parameters: Record<string, ParameterValue> = {};
  const issues: CanonicalParameterValidationIssue[] = [];

  for (const definition of input.schema) {
    if (definition.visibilityRole === "INTERNAL_ONLY" || definition.visibilityRole === "USER_DERIVED_READONLY") continue;
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
    if (definition.valueType === "array_object") {
      const items = value as CanonicalEstimateCompositeItem[];
      const itemSchema = definition.compositeItemSchema;
      if (!itemSchema?.subfields.length) {
        issues.push({ code: "COMPOSITE_SCHEMA", parameterId: definition.parameterId });
        continue;
      }
      const uniqueIds = new Set(items.map((item) => item.itemId));
      const positions = items.map((item) => item.position).sort((a, b) => a - b);
      if (uniqueIds.size !== items.length || positions.some((position, index) => position !== index)) {
        issues.push({ code: "COMPOSITE_ITEM", parameterId: definition.parameterId });
      }
      if (itemSchema.minimumItems != null && items.length < itemSchema.minimumItems) {
        issues.push({ code: "MIN", parameterId: definition.parameterId });
      }
      if (itemSchema.maximumItems != null && items.length > itemSchema.maximumItems) {
        issues.push({ code: "MAX", parameterId: definition.parameterId });
      }
      for (const item of items) {
        for (const subfield of itemSchema.subfields) {
          const raw = item.values[subfield.subfieldId];
          if (!isPresent(raw)) {
            if (subfield.required) issues.push({ code: "COMPOSITE_SUBFIELD", parameterId: definition.parameterId, relatedParameterId: `${item.itemId}:${subfield.subfieldId}` });
            continue;
          }
          const parsed = parseScalarValue(subfield.valueType, raw);
          const choices = Array.isArray(subfield.constraints.values) ? subfield.constraints.values : [];
          const numeric = typeof parsed === "string" ? Number(parsed) : Number.NaN;
          const minimum = subfield.constraints.min == null ? null : Number(subfield.constraints.min);
          const maximum = subfield.constraints.max == null ? null : Number(subfield.constraints.max);
          if (parsed === undefined
            || (subfield.valueType === "enum" && !choices.some((choice) => String(choice) === String(parsed)))
            || (minimum != null && Number.isFinite(minimum) && numeric < minimum)
            || (maximum != null && Number.isFinite(maximum) && numeric > maximum)) {
            issues.push({ code: "COMPOSITE_SUBFIELD", parameterId: definition.parameterId, relatedParameterId: `${item.itemId}:${subfield.subfieldId}` });
          }
        }
      }
      continue;
    }
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
    if (definition.visibilityRole === "INTERNAL_ONLY" || definition.visibilityRole === "USER_DERIVED_READONLY") continue;
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

  const schemaIds = new Set(input.schema.map((definition) => definition.parameterId));
  if (schemaIds.has("area_m2") && schemaIds.has("length_m") && schemaIds.has("width_m")) {
    const area = Number(parameters.area_m2);
    const length = Number(parameters.length_m);
    const width = Number(parameters.width_m);
    if (Number.isFinite(area) && Number.isFinite(length) && Number.isFinite(width)
      && area > 0 && length > 0 && width > 0) {
      const derivedArea = length * width;
      const tolerance = Math.max(0.01, derivedArea * 0.001);
      if (Math.abs(area - derivedArea) > tolerance) {
        issues.push({
          code: "GEOMETRY_CONFLICT",
          parameterId: "area_m2",
          relatedParameterId: "length_m,width_m",
        });
      }
    }
  }

  const unique = new Map(issues.map((issue) => [`${issue.code}:${issue.parameterId}:${issue.relatedParameterId ?? ""}`, issue]));
  return { ok: unique.size === 0, parameters, issues: [...unique.values()] };
}
