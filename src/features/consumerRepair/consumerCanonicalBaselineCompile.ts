import {
  compileCanonicalEstimateAndLoad,
  getCanonicalEstimateCatalogItem,
} from "../../lib/estimate/backendPlatform/canonicalEstimateClient";
import { adaptCanonicalRevisionToStructuredEstimate } from "../../lib/estimate/backendPlatform/canonicalEstimateForemanAdapter";
import { validateCanonicalEstimateParameterInputs } from "../../lib/estimate/backendPlatform/canonicalEstimateParameterValidation";
import {
  CanonicalEstimateApiError,
  type CanonicalEstimateCatalogItem,
  type CanonicalEstimateParameterInputValue,
} from "../../lib/estimate/backendPlatform/contracts";
/*
 * This module is deliberately backend-only: it may derive typed inputs from
 * the user's prompt, but it never compiles a fallback estimate on the client.
 */
import {
  mapAiEstimateToForemanDraft,
  verifyForemanAiEstimatePayloadParity,
  type ForemanAiEstimateDraftMapping,
} from "../../lib/foremanAiEstimate";

type UserQuantity = { value: string; unit: "pcs" | "m2" | "m3" | "m" | "kg" | "t" | null };
type CanonicalBaselinePlan = {
  parameters: Record<string, CanonicalEstimateParameterInputValue>;
  assumptions: string[];
};

function extractUserQuantity(prompt: string): UserQuantity | null {
  const normalizedPrompt = prompt
    .replace(/м²/giu, "м2")
    .replace(/м³/giu, "м3")
    .replace(/(?:кв\.?\s*|квадратн(?:ый|ая|ое|ые|ого|ой|ую|ых|ым|ыми)?\s+)метр(?:а|ов)?/giu, "м2")
    .replace(/(?:куб\.?\s*|кубическ(?:ий|ая|ое|ие|ого|ой|ую|их|им|ими)?\s+)метр(?:а|ов)?/giu, "м3");
  const match = /\b(\d+(?:[,.]\d+)?)\s*(штук(?:а|и)?|шт\.?|м2|м3|м|кг|тонн(?:а|ы)?|т)\b/iu.exec(normalizedPrompt);
  if (!match) return null;
  const rawUnit = match[2]
    .toLocaleLowerCase("ru-RU")
    .replace("²", "2")
    .replace("³", "3")
    .replace(/[.\s]+/gu, "");
  const unit = /^шт|^штук/u.test(rawUnit) ? "pcs"
    : rawUnit === "м2" || rawUnit.startsWith("кв") || rawUnit.startsWith("квадратн") ? "m2"
      : rawUnit === "м3" || rawUnit.startsWith("куб") || rawUnit.startsWith("кубическ") ? "m3"
        : rawUnit === "м" ? "m"
          : rawUnit === "кг" ? "kg"
            : rawUnit === "т" || rawUnit.startsWith("тонн") ? "t"
              : null;
  return { value: match[1].replace(",", "."), unit };
}

function parameterAcceptsQuantity(
  parameter: CanonicalEstimateCatalogItem["parameterSchema"][number],
  quantity: UserQuantity,
): boolean {
  if (parameter.valueType !== "decimal" && parameter.valueType !== "integer") return false;
  const identity = `${parameter.parameterId} ${parameter.semanticParameterKey ?? ""} ${parameter.titleRu}`.toLocaleLowerCase("ru-RU");
  const isCount = /количеств|число|count|quantity|qty/u.test(identity);
  if (quantity.unit === "pcs") return isCount || /шт|сва|тумб/u.test(identity);
  const unit = String(parameter.unitId ?? "").toLocaleLowerCase("en").replace("²", "2").replace("³", "3");
  return quantity.unit != null && unit === quantity.unit;
}

function allowedValues(parameter: CanonicalEstimateCatalogItem["parameterSchema"][number]): unknown[] {
  const raw = parameter.constraints.values
    ?? parameter.constraints.allowedValues
    ?? parameter.constraints.enum;
  return Array.isArray(raw) ? raw : [];
}

function boundedPositiveNumber(
  parameter: CanonicalEstimateCatalogItem["parameterSchema"][number],
): string {
  const minimum = parameter.constraints.min == null ? null : Number(parameter.constraints.min);
  const minimumExclusive = parameter.constraints.minExclusive == null
    ? null
    : Number(parameter.constraints.minExclusive);
  const maximum = parameter.constraints.max == null ? null : Number(parameter.constraints.max);
  let value = 1;
  if (Number.isFinite(minimum) && value < Number(minimum)) value = Number(minimum);
  if (Number.isFinite(minimumExclusive) && value <= Number(minimumExclusive)) {
    value = Number(minimumExclusive) + (parameter.valueType === "integer" ? 1 : 0.01);
  }
  if (Number.isFinite(maximum) && value > Number(maximum)) value = Number(maximum);
  if (parameter.valueType === "integer") value = Math.ceil(value);
  return String(value);
}

function baselineValue(
  parameter: CanonicalEstimateCatalogItem["parameterSchema"][number],
): CanonicalEstimateParameterInputValue | undefined {
  if (parameter.defaultValue != null) {
    return parameter.defaultValue as CanonicalEstimateParameterInputValue;
  }
  if (parameter.valueType === "boolean") return true;
  if (parameter.valueType === "enum") {
    const first = allowedValues(parameter)[0];
    return first == null ? undefined : String(first);
  }
  if (parameter.valueType === "decimal" || parameter.valueType === "integer") {
    return boundedPositiveNumber(parameter);
  }
  if (parameter.valueType === "text") return "1";
  if (parameter.valueType === "array_object") return [];
  return undefined;
}

function conditionMatches(
  raw: unknown,
  values: Record<string, CanonicalEstimateParameterInputValue>,
): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const condition = raw as Record<string, unknown>;
  return typeof condition.parameterId === "string"
    && values[condition.parameterId] === condition.equals;
}

function normalizeCrossFieldBaseline(
  catalog: CanonicalEstimateCatalogItem,
  values: Record<string, CanonicalEstimateParameterInputValue>,
): void {
  const enabledBooleanGroups = new Set<string>();
  for (const parameter of catalog.parameterSchema) {
    const group = parameter.constraints.mutuallyExclusiveBooleanGroup;
    if (parameter.valueType !== "boolean" || group == null) continue;
    const key = String(group);
    if (enabledBooleanGroups.has(key)) values[parameter.parameterId] = false;
    else enabledBooleanGroups.add(key);
  }
  for (let pass = 0; pass < 4; pass += 1) {
    for (const parameter of catalog.parameterSchema) {
      if (conditionMatches(parameter.constraints.forbiddenWhen, values) && !parameter.required) {
        delete values[parameter.parameterId];
        continue;
      }
      if (parameter.valueType !== "decimal" && parameter.valueType !== "integer") continue;
      const current = Number(values[parameter.parameterId]);
      if (!Number.isFinite(current)) continue;
      let next = current;
      for (const [constraint, adjustment] of [
        ["greaterThanOrEqualParameter", 0],
        ["greaterThanParameter", parameter.valueType === "integer" ? 1 : 0.01],
      ] as const) {
        const peerId = parameter.constraints[constraint];
        const peer = peerId == null ? Number.NaN : Number(values[String(peerId)]);
        if (Number.isFinite(peer)) next = Math.max(next, peer + adjustment);
      }
      for (const [constraint, adjustment] of [
        ["lessThanOrEqualParameter", 0],
        ["lessThanParameter", parameter.valueType === "integer" ? 1 : 0.01],
      ] as const) {
        const peerId = parameter.constraints[constraint];
        const peer = peerId == null ? Number.NaN : Number(values[String(peerId)]);
        if (Number.isFinite(peer)) next = Math.min(next, peer - adjustment);
      }
      values[parameter.parameterId] = String(parameter.valueType === "integer" ? Math.trunc(next) : next);
    }
  }
}

export function buildCanonicalBaselinePlan(input: {
  catalog: CanonicalEstimateCatalogItem;
  prompt: string;
}): CanonicalBaselinePlan {
  const rawInputs: Record<string, CanonicalEstimateParameterInputValue> = {};
  for (const parameter of input.catalog.parameterSchema) {
    const value = baselineValue(parameter);
    if (value !== undefined) rawInputs[parameter.parameterId] = value;
  }
  const userQuantity = extractUserQuantity(input.prompt);
  let userQuantityParameterId: string | null = null;
  if (userQuantity) {
    const target = input.catalog.parameterSchema.find((parameter) => parameterAcceptsQuantity(parameter, userQuantity));
    if (target) {
      rawInputs[target.parameterId] = userQuantity.value;
      userQuantityParameterId = target.parameterId;
    }
  }
  normalizeCrossFieldBaseline(input.catalog, rawInputs);
  const validation = validateCanonicalEstimateParameterInputs({
    schema: input.catalog.parameterSchema,
    rawInputs,
  });
  if (!validation.ok) {
    const missing = validation.issues
      .filter((issue) => issue.code === "REQUIRED" || issue.code === "REQUIRED_WHEN")
      .map((issue) => issue.parameterId);
    throw new Error(`CANONICAL_BASELINE_CONTRACT_MISSING:${[...new Set(missing)].join(",") || validation.issues.map((issue) => issue.code).join(",")}`);
  }
  const assumptions = input.catalog.parameterSchema
    .filter((parameter) => parameter.visibilityRole !== "INTERNAL_ONLY")
    .filter((parameter) => parameter.parameterId !== userQuantityParameterId)
    .filter((parameter) => validation.parameters[parameter.parameterId] != null)
    .map((parameter) => `${parameter.titleRu}: ${String(validation.parameters[parameter.parameterId])}${parameter.unitId ? ` ${parameter.unitId}` : ""}`);
  return {
    parameters: validation.parameters,
    assumptions: [
      "Исходная смета рассчитана по явно показанным базовым допущениям; их необходимо проверить перед договором.",
      ...assumptions,
    ],
  };
}

export function buildCanonicalBaselineInputs(input: {
  catalog: CanonicalEstimateCatalogItem;
  prompt: string;
}): Record<string, CanonicalEstimateParameterInputValue> {
  return buildCanonicalBaselinePlan(input).parameters;
}

function stableId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export async function compileConsumerCanonicalBaseline(input: {
  catalogId: string;
  prompt: string;
}): Promise<ForemanAiEstimateDraftMapping> {
  const catalog = await getCanonicalEstimateCatalogItem(input.catalogId).catch((error: unknown) => {
    if (error instanceof CanonicalEstimateApiError && error.code === "NOT_FOUND") {
      throw new Error(`CANONICAL_BACKEND_DEFINITION_MISSING:${input.catalogId}`);
    }
    throw error;
  });
  const baseline = buildCanonicalBaselinePlan({ catalog, prompt: input.prompt });
  const parameters = baseline.parameters;
  const compiled = await compileCanonicalEstimateAndLoad({
    request: {
      idempotencyKey: `consumer-baseline-${stableId(`${catalog.catalogId}|${input.prompt}|${JSON.stringify(parameters)}`)}`,
      catalogId: catalog.catalogId,
      parameters,
      currencyCode: "KGS",
    },
  });
  const estimate = adaptCanonicalRevisionToStructuredEstimate({
    catalog,
    revision: compiled.revision,
    rows: compiled.rows,
    inputText: input.prompt,
    assumptions: baseline.assumptions,
  });
  const mapping = mapAiEstimateToForemanDraft({
    estimate,
    context: {
      objectName: "Заявка на ремонт",
      levelName: "",
      systemName: "",
      zoneName: "",
      sourceScreen: "foreman_materials",
    },
    estimateRevisionId: compiled.revision.revisionId,
    estimateReleaseId: compiled.revision.releaseId,
  });
  const parity = verifyForemanAiEstimatePayloadParity(mapping);
  if (!parity.ok) throw new Error(`CANONICAL_BASELINE_PARITY_FAILED:${parity.issues.map((issue) => issue.code).join(",")}`);
  return mapping;
}
