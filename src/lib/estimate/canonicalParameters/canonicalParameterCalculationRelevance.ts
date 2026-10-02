import type { CanonicalParameter } from "./canonicalParameterCore";

/**
 * A persisted parameter belongs to the calculation form only when the
 * canonical contract names a formula or BOQ/resource branch that consumes it.
 * Document references without either link may be collected later for the
 * contract package, but cannot change or block the preliminary estimate.
 */
export function canonicalParameterAffectsEstimateCalculation(
  parameter: Pick<
    CanonicalParameter,
    "affectsFormula" | "affectsRows" | "allowedValues" | "requiredLevel" | "valueType"
  >,
): boolean {
  if (parameter.affectsFormula.length > 0) return true;
  if (parameter.affectsRows.length === 0) return false;
  if (parameter.requiredLevel === "OPTIONAL") return false;
  // A backend-selected preliminary need can use a text designation to choose
  // a concrete resource branch. It is calculation-relevant once promoted to
  // BLOCKING_REQUIRED, unlike a document-only field with no row consumer.
  if (parameter.requiredLevel === "BLOCKING_REQUIRED") return true;
  return parameter.valueType === "boolean" || parameter.allowedValues.length > 0;
}
