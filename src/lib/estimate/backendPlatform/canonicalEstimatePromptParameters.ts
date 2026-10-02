import type {
  CanonicalEstimateCatalogItem,
  CanonicalEstimateParameterInputValue,
} from "./contracts";
import { isCanonicalEstimateUserEditableParameter } from "./canonicalEstimateParameterSemantics";
import { formatEstimateUnitLabel } from "../../ai/globalEstimate/formatEstimateUnitLabel";

function normalizedUnit(value: string | null | undefined): string {
  return String(value ?? "")
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/gu, "е")
    .replace(/²/gu, "2")
    .replace(/³/gu, "3")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function parameterAcceptsParsedQuantity(
  parameter: CanonicalEstimateCatalogItem["parameterSchema"][number],
  parsedUnit: string,
): boolean {
  if (!isCanonicalEstimateUserEditableParameter(parameter)) return false;
  if (parameter.valueType !== "decimal" && parameter.valueType !== "integer") return false;
  const parameterUnit = normalizedUnit(formatEstimateUnitLabel(parameter.unitId));
  return parameterUnit.length > 0 && parameterUnit === normalizedUnit(parsedUnit);
}

/**
 * Seeds only the explicitly measured quantity from the user's prompt. Professional
 * norm values stay definition-owned and every other refinement remains optional.
 */
export function canonicalEstimateInitialParameterInputs(input: {
  catalog: CanonicalEstimateCatalogItem;
  parsedQuantity: number | null;
  parsedUnit: string | null;
}): Record<string, CanonicalEstimateParameterInputValue> {
  const values: Record<string, CanonicalEstimateParameterInputValue> = Object.fromEntries(
    input.catalog.parameterSchema.map((parameter) => [
      parameter.parameterId,
      parameter.defaultValue == null
        ? (parameter.valueType === "array_object" ? [] : "")
        : (parameter.valueType === "array_object" && Array.isArray(parameter.defaultValue)
          ? parameter.defaultValue
          : String(parameter.defaultValue)),
    ]),
  );
  if (input.parsedQuantity == null || !Number.isFinite(input.parsedQuantity) || input.parsedQuantity <= 0 || !input.parsedUnit) {
    return values;
  }
  const quantityParameter = [...input.catalog.parameterSchema]
    .sort((left, right) => left.ordinal - right.ordinal)
    .find((parameter) => parameterAcceptsParsedQuantity(parameter, input.parsedUnit!));
  if (quantityParameter) values[quantityParameter.parameterId] = input.parsedQuantity;
  return values;
}
