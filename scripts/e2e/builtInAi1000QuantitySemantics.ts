import type { SourceBackedEstimateRow } from "../../src/lib/ai/globalEstimate/globalEstimateTypes";

export type BuiltInAiQuantitySemanticsRow = Pick<
  SourceBackedEstimateRow,
  | "applicabilityReason"
  | "displayQuantity"
  | "includedInEstimate"
  | "includedInProcurement"
  | "optional"
  | "priceStatus"
  | "quantity"
  | "sourceParameters"
  | "total"
  | "unitPrice"
>;

function nonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function explicitConditionalReason(
  row: BuiltInAiQuantitySemanticsRow,
): boolean {
  const sourceParameters = row.sourceParameters;
  if (!sourceParameters) return false;
  const blockerIds = Array.isArray(sourceParameters.parameterBlockerIds)
    ? sourceParameters.parameterBlockerIds.filter(nonEmptyString)
    : [];
  return (
    sourceParameters.conditionalStatus === "blocked_missing_parameters" &&
    blockerIds.length > 0 &&
    (nonEmptyString(sourceParameters.conditionalReason) ||
      nonEmptyString(row.applicabilityReason))
  );
}

export function hasSafeBuiltInAiQuantitySemantics(
  row: BuiltInAiQuantitySemanticsRow,
): boolean {
  if (
    !Number.isFinite(row.quantity) ||
    row.quantity < 0 ||
    !Number.isFinite(row.total) ||
    row.total < 0 ||
    row.displayQuantity.trim().length === 0
  ) {
    return false;
  }
  if (row.quantity > 0) return true;

  return (
    row.total === 0 &&
    row.unitPrice === 0 &&
    row.includedInEstimate === false &&
    row.includedInProcurement === false &&
    row.optional === true &&
    row.priceStatus === "unavailable" &&
    explicitConditionalReason(row)
  );
}
