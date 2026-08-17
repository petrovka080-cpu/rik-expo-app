import {
  compileCanonicalEstimateAndLoad,
  getCanonicalEstimateCatalogItem,
} from "../../lib/estimate/backendPlatform/canonicalEstimateClient";
import { adaptCanonicalRevisionToStructuredEstimate } from "../../lib/estimate/backendPlatform/canonicalEstimateForemanAdapter";
import { validateCanonicalEstimateParameterInputs } from "../../lib/estimate/backendPlatform/canonicalEstimateParameterValidation";
import type {
  CanonicalEstimateCatalogItem,
  CanonicalEstimateParameterInputValue,
} from "../../lib/estimate/backendPlatform/contracts";
import {
  mapAiEstimateToForemanDraft,
  verifyForemanAiEstimatePayloadParity,
  type ForemanAiEstimateDraftMapping,
} from "../../lib/foremanAiEstimate";

type UserQuantity = { value: string; unit: "pcs" | "m2" | "m3" | "m" | "kg" | "t" | null };

function extractUserQuantity(prompt: string): UserQuantity | null {
  const match = /\b(\d+(?:[,.]\d+)?)\s*(штук(?:а|и)?|шт\.?|м2|м²|м3|м³|м|кг|тонн(?:а|ы)?|т)\b/iu.exec(prompt);
  if (!match) return null;
  const rawUnit = match[2].toLocaleLowerCase("ru-RU").replace("²", "2").replace("³", "3");
  const unit = /^шт|^штук/u.test(rawUnit) ? "pcs"
    : rawUnit === "м2" ? "m2"
      : rawUnit === "м3" ? "m3"
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

export function buildCanonicalBaselineInputs(input: {
  catalog: CanonicalEstimateCatalogItem;
  prompt: string;
}): Record<string, CanonicalEstimateParameterInputValue> {
  const rawInputs: Record<string, CanonicalEstimateParameterInputValue> = {};
  for (const parameter of input.catalog.parameterSchema) {
    if (parameter.defaultValue == null) continue;
    rawInputs[parameter.parameterId] = parameter.defaultValue as CanonicalEstimateParameterInputValue;
  }
  const userQuantity = extractUserQuantity(input.prompt);
  if (userQuantity) {
    const target = input.catalog.parameterSchema.find((parameter) => parameterAcceptsQuantity(parameter, userQuantity));
    if (target) rawInputs[target.parameterId] = userQuantity.value;
  }
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
  return validation.parameters;
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
  const catalog = await getCanonicalEstimateCatalogItem(input.catalogId);
  const parameters = buildCanonicalBaselineInputs({ catalog, prompt: input.prompt });
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
