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
    "affectsFormula" | "affectsRows" | "allowedValues" | "referenceValue" | "requiredLevel" | "value" | "valueType" | "resourceSelectionInput"
  >,
): boolean {
  if (parameter.affectsFormula.length > 0) return true;
  if (parameter.affectsRows.length === 0) return false;
  // A replaceable runtime profile can own a text designation used directly
  // by resource rows without appearing in a numeric formula. Its immutable
  // accepted reference distinguishes it from an unrelated document field.
  if (parameter.referenceValue != null && parameter.value != null) return true;
  if (parameter.requiredLevel === "OPTIONAL") return false;
  // A backend-selected preliminary need or required user designation can
  // choose a concrete BOQ resource without entering a numeric formula. A
  // document-only field still has no row consumer and was returned above.
  if (parameter.requiredLevel === "BLOCKING_REQUIRED") return true;
  return parameter.resourceSelectionInput === true
    || parameter.valueType === "boolean"
    || parameter.allowedValues.length > 0;
}
