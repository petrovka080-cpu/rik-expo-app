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
  primaryMeasureParameterId: string;
};

type PromptParameterRule = {
  parameterIds: readonly string[];
  pattern: RegExp;
};

const PROMPT_PARAMETER_RULES: readonly PromptParameterRule[] = [
  {
    parameterIds: ["route_length_m", "cable_length_m"],
    pattern: /(?:длин[а-яё]*\s+)?(?:кабельн[а-яё]*\s+)?трасс[а-яё]*\s*(\d+(?:[,.]\d+)?)\s*(?:м(?:етр[а-яё]*)?)(?![\p{L}\p{N}])/iu,
  },
  {
    parameterIds: ["outlet_count"],
    pattern: /(\d+(?:[,.]\d+)?)\s*розет[а-яё]*/iu,
  },
  {
    parameterIds: ["switch_count"],
    pattern: /(\d+(?:[,.]\d+)?)\s*выключател[а-яё]*/iu,
  },
  {
    parameterIds: ["lighting_point_count"],
    pattern: /(\d+(?:[,.]\d+)?)\s*(?:точ[а-яё]*\s+)?освещен[а-яё]*/iu,
  },
] as const;

const DERIVED_QUANTITY_PARAMETER = /(?:^quantity_|^unit_price_|(?:^|_)(?:compacted_volume|coverage_area|work_quantity|factor|coefficient|calculated|derived|consumption_total|material_m3|labor_man_hours|machine_hours|trip_count|service_count|test_count|test_frequency|test_interval|inspection_interval|control_interval|protocol_count|documentation_count|productivity)(?:_|$))/iu;
const DIRECT_USER_QUANTITY_SOURCE = new Set([
  "USER_MEASURED",
  "USER_DECLARED",
  "USER_INPUT",
  "PROJECT_SPECIFIC_INPUT",
  "USER_INPUT_REQUIRED",
  "PROJECT_DOCUMENTATION",
  "ENGINEERING_DESIGN",
  "SITE_SURVEY",
  // A visible baseline is only a pre-filled value. USER_INPUT remains the
  // owner, so an explicit value in the current request must replace it.
  "VISIBLE_BASELINE_ASSUMPTION",
]);

export function extractUserQuantity(prompt: string): UserQuantity | null {
  const normalizedPrompt = prompt
    .replace(/м²/giu, "м2")
    .replace(/м³/giu, "м3")
    .replace(/(?:кв(?:адратн[\p{L}]*)?\.?\s*м(?:етр[\p{L}]*)?)/giu, "м2")
    .replace(/(?:куб(?:ическ[\p{L}]*)?\.?\s*м(?:етр[\p{L}]*)?)/giu, "м3");
  const match = /(?<![\p{L}\p{N}])(\d+(?:[,.]\d+)?)\s*(штук(?:а|и)?|шт\.?|м2|м3|м|кг|тонн(?:а|ы)?|т)(?![\p{L}\p{N}])/iu.exec(normalizedPrompt);
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
  if (parameter.visibilityRole != null && parameter.visibilityRole !== "USER_INPUT") return false;
  if (parameter.valueSourceRole != null && !DIRECT_USER_QUANTITY_SOURCE.has(String(parameter.valueSourceRole))) return false;
  const identity = `${parameter.parameterId} ${parameter.semanticParameterKey ?? ""} ${parameter.titleRu}`.toLocaleLowerCase("ru-RU");
  if (DERIVED_QUANTITY_PARAMETER.test(identity)) return false;
  const isCount = /количеств|число|count|quantity|qty/u.test(identity);
  if (quantity.unit === "pcs") return isCount || /шт|сва|тумб/u.test(identity);
  const rawUnit = String(parameter.unitId ?? "")
    .toLocaleLowerCase("ru-RU")
    .replace("²", "2")
    .replace("³", "3")
    .replace(/[.\s]+/gu, "");
  const unit: UserQuantity["unit"] = rawUnit === "m2" || rawUnit === "м2" || rawUnit === "sqm" || rawUnit === "sq_m"
    ? "m2"
    : rawUnit === "m3" || rawUnit === "м3" || rawUnit === "cbm"
      ? "m3"
      : rawUnit === "m" || rawUnit === "м"
        ? "m"
        : rawUnit === "kg" || rawUnit === "кг"
          ? "kg"
          : rawUnit === "t" || rawUnit === "т"
            ? "t"
            : rawUnit === "pcs" || rawUnit === "pc" || rawUnit === "шт"
              ? "pcs"
              : null;
  return quantity.unit != null && unit === quantity.unit;
}

function quantityParameterScore(
  parameter: CanonicalEstimateCatalogItem["parameterSchema"][number],
  quantity: UserQuantity,
): number | null {
  if (!parameterAcceptsQuantity(parameter, quantity)) return null;
  const semanticKey = String(parameter.semanticParameterKey ?? parameter.parameterId).toLocaleLowerCase("en-US");
  const exactSourceByUnit: Record<Exclude<UserQuantity["unit"], null>, RegExp> = {
    m2: /^(?:area_m2|(?:work|surface|floor|wall|roof|parking|paving|site)_area_m2)$/u,
    m3: /^(?:volume_m3|(?:work|excavation|fill|concrete)_volume_m3)$/u,
    m: /^(?:length_m|(?:work|route|pipeline|cable)_length_m)$/u,
    kg: /^(?:weight_kg|mass_kg)$/u,
    t: /^(?:weight_t|mass_t)$/u,
    pcs: /^(?:count|quantity|qty)$/u,
  };
  if (quantity.unit != null && exactSourceByUnit[quantity.unit].test(semanticKey)) return 120;
  if (/(?:^|_)(?:area|volume|length|count|quantity|qty|weight|mass)(?:_|$)/u.test(semanticKey)) return 80;
  return 20;
}

function baselineValue(
  parameter: CanonicalEstimateCatalogItem["parameterSchema"][number],
): CanonicalEstimateParameterInputValue | undefined {
  if (parameter.defaultValue != null) {
    return parameter.defaultValue as CanonicalEstimateParameterInputValue;
  }
  return undefined;
}

function promptOwnedNamedParameters(
  schema: CanonicalEstimateCatalogItem["parameterSchema"],
  prompt: string,
): Record<string, CanonicalEstimateParameterInputValue> {
  const byId = new Map(schema.map((parameter) => [parameter.parameterId, parameter]));
  const values: Record<string, CanonicalEstimateParameterInputValue> = {};
  for (const rule of PROMPT_PARAMETER_RULES) {
    const parameterId = rule.parameterIds.find((candidate) => byId.has(candidate));
    if (!parameterId) continue;
    const parameter = byId.get(parameterId)!;
    if ((parameter.valueType !== "decimal" && parameter.valueType !== "integer")
      || (parameter.visibilityRole != null && parameter.visibilityRole !== "USER_INPUT")
      || (parameter.valueSourceRole != null
        && !DIRECT_USER_QUANTITY_SOURCE.has(String(parameter.valueSourceRole)))) continue;
    const match = rule.pattern.exec(prompt);
    if (!match) continue;
    values[parameterId] = match[1].replace(",", ".");
  }
  return values;
}

export function buildCanonicalBaselinePlan(input: {
  catalog: CanonicalEstimateCatalogItem;
  prompt: string;
}): CanonicalBaselinePlan {
  const baselineInputs: Record<string, CanonicalEstimateParameterInputValue> = {};
  for (const parameter of input.catalog.parameterSchema) {
    const value = baselineValue(parameter);
    if (value !== undefined) baselineInputs[parameter.parameterId] = value;
  }
  const submittedInputs: Record<string, CanonicalEstimateParameterInputValue> = {};
  const userQuantity = extractUserQuantity(input.prompt);
  let userQuantityParameterId: string | null = null;
  if (userQuantity) {
    const candidates = input.catalog.parameterSchema
      .map((parameter) => ({ parameter, score: quantityParameterScore(parameter, userQuantity) }))
      .filter((candidate): candidate is { parameter: CanonicalEstimateCatalogItem["parameterSchema"][number]; score: number } => candidate.score != null)
      .sort((left, right) => right.score - left.score || left.parameter.ordinal - right.parameter.ordinal);
    const target = candidates[0];
    if (target && (candidates.length === 1 || target.score > candidates[1].score)) {
      submittedInputs[target.parameter.parameterId] = userQuantity.value;
      userQuantityParameterId = target.parameter.parameterId;
    }
  }
  Object.assign(submittedInputs, promptOwnedNamedParameters(input.catalog.parameterSchema, input.prompt));
  const primaryMeasureParameterId = userQuantityParameterId
    ?? input.catalog.parameterSchema
      .filter((parameter) => parameter.visibilityRole == null || parameter.visibilityRole === "USER_INPUT")
      .filter((parameter) => parameter.valueType === "decimal" || parameter.valueType === "integer")
      .filter((parameter) => !DERIVED_QUANTITY_PARAMETER.test(
        `${parameter.parameterId} ${parameter.semanticParameterKey ?? ""} ${parameter.titleRu}`,
      ))
      .sort((left, right) => {
        const score = (parameter: typeof left) => /^(?:area_m2|volume_m3|length_m|count|quantity|qty)$/u.test(
          String(parameter.semanticParameterKey ?? parameter.parameterId).toLocaleLowerCase("en-US"),
        ) ? 0 : 1;
        return score(left) - score(right) || left.ordinal - right.ordinal;
      })[0]?.parameterId;
  if (!primaryMeasureParameterId) throw new Error("CANONICAL_PRIMARY_MEASURE_NOT_RESOLVED");
  const validation = validateCanonicalEstimateParameterInputs({
    schema: input.catalog.parameterSchema,
    rawInputs: { ...baselineInputs, ...submittedInputs },
  });
  if (!validation.ok) {
    const missing = validation.issues
      .filter((issue) => issue.code === "REQUIRED" || issue.code === "REQUIRED_WHEN")
      .map((issue) => issue.parameterId);
    throw new Error(`CANONICAL_BASELINE_CONTRACT_MISSING:${[...new Set(missing)].join(",") || validation.issues.map((issue) => issue.code).join(",")}`);
  }
  const assumptions = input.catalog.parameterSchema
    .filter((parameter) => parameter.visibilityRole === "USER_INPUT")
    .filter((parameter) => parameter.valueSourceRole == null || DIRECT_USER_QUANTITY_SOURCE.has(String(parameter.valueSourceRole)))
    .filter((parameter) => !DERIVED_QUANTITY_PARAMETER.test(`${parameter.parameterId} ${parameter.semanticParameterKey ?? ""} ${parameter.titleRu}`))
    .filter((parameter) => parameter.guide?.guideKind !== "DERIVED_VALUE_RULE")
    .filter((parameter) => parameter.parameterId !== userQuantityParameterId)
    .filter((parameter) => validation.parameters[parameter.parameterId] != null)
    .map((parameter) => `${parameter.titleRu}: ${String(validation.parameters[parameter.parameterId])}${parameter.unitId ? ` ${parameter.unitId}` : ""}`);
  return {
    // Persisted baseline values are merged and owned by the backend worker.
    // Sending only prompt-owned values prevents baseline assumptions and
    // derived outputs from being misclassified as user input.
    parameters: submittedInputs,
    primaryMeasureParameterId,
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
  draftId: string;
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
      idempotencyKey: `consumer-baseline-${stableId(`${input.draftId}|${catalog.releaseId}|${catalog.catalogId}|${input.prompt}|${JSON.stringify(parameters)}`)}`,
      catalogId: catalog.catalogId,
      sourceRequestText: input.prompt.trim(),
      primaryMeasureParameterId: baseline.primaryMeasureParameterId,
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
