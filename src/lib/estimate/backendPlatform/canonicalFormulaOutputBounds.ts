import { compareFormulaGraphDecimals, evaluateFormulaGraph } from "./formulaGraph";

const limitKeys = ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum"] as const;
export type CanonicalFormulaOutputBoundsV1 = Readonly<{
  schemaVersion: "canonical_formula_output_bounds_v1";
  unitId: string;
  reasonRu: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
}>;

function invalid(rowId: string): never {
  throw Object.assign(new Error(`formula output bounds invalid ${rowId}`), { code: "DEFINITION_INTEGRITY_FAILED" });
}

/** Definition metadata, not another calculator or a user-editable norm. */
export function parseCanonicalFormulaOutputBoundsV1(
  raw: unknown, resourceUnitId: string, formulaUnitId: string | undefined, rowId: string,
): CanonicalFormulaOutputBoundsV1 | null {
  if (raw === undefined) return null;
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return invalid(rowId);
  const record = raw as Record<string, unknown>;
  const keys = ["schemaVersion", "unitId", "reasonRu", ...limitKeys];
  if (Object.keys(record).some(key => !keys.includes(key))
    || record.schemaVersion !== "canonical_formula_output_bounds_v1"
    || typeof record.unitId !== "string" || !record.unitId.trim()
    || record.unitId !== resourceUnitId || record.unitId !== formulaUnitId
    || typeof record.reasonRu !== "string" || !record.reasonRu.trim() || record.reasonRu.length > 2_000
    || !limitKeys.some(key => Object.prototype.hasOwnProperty.call(record, key))) return invalid(rowId);
  for (const key of limitKeys) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) continue;
    const value = record[key];
    if (typeof value !== "number" || !Number.isFinite(value)) return invalid(rowId);
    try {
      const normalized = evaluateFormulaGraph({ kind: "literal", value: String(value) }, {});
      // Reject limits outside the evaluator's range/precision instead of
      // silently changing an authored engineering boundary.
      if (Number(normalized) !== value) return invalid(rowId);
    } catch { return invalid(rowId); }
  }
  const policy = record as CanonicalFormulaOutputBoundsV1;
  for (const lower of ["minimum", "exclusiveMinimum"] as const) {
    for (const upper of ["maximum", "exclusiveMaximum"] as const) {
      if (policy[lower] == null || policy[upper] == null) continue;
      const comparison = compareFormulaGraphDecimals(policy[lower], policy[upper]);
      if (comparison > 0 || (comparison === 0 && (lower === "exclusiveMinimum" || upper === "exclusiveMaximum"))) return invalid(rowId);
    }
  }
  return policy;
}

export function validateCanonicalFormulaOutputBoundsV1(
  policy: CanonicalFormulaOutputBoundsV1, formulaQuantity: string, rowId: string,
): Readonly<{ status: "PASSED"; formulaQuantity: string; unitId: string }> {
  const outside = (policy.minimum != null && compareFormulaGraphDecimals(formulaQuantity, policy.minimum) < 0)
    || (policy.maximum != null && compareFormulaGraphDecimals(formulaQuantity, policy.maximum) > 0)
    || (policy.exclusiveMinimum != null && compareFormulaGraphDecimals(formulaQuantity, policy.exclusiveMinimum) <= 0)
    || (policy.exclusiveMaximum != null && compareFormulaGraphDecimals(formulaQuantity, policy.exclusiveMaximum) >= 0);
  if (outside) throw Object.assign(new Error(`${policy.reasonRu} (${rowId}: ${formulaQuantity} ${policy.unitId})`), {
    code: "FORMULA_OUTPUT_BOUNDS_FAILED",
  });
  return { status: "PASSED", formulaQuantity, unitId: policy.unitId };
}
