import { compareFormulaGraphDecimals, isFormulaGraphExactDecimal } from "./formulaGraph";

function objectValue(value: unknown): Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

/** Read the exact saved balance for UI and documents; do not round or recalculate an order. */
export function canonicalArtifactPurchaseBalance(row: {
  row_id: unknown;
  unit_id?: unknown;
  calculation_trace?: unknown;
}) {
  const trace = objectValue(row.calculation_trace);
  const balance = objectValue(trace.purchaseBalance);
  if (!Object.keys(balance).length) return null;
  const fields = ["consumed", "stock", "reserve", "effectiveOrder", "remaining", "freeBeyondReserve", "consumptionShortage", "reserveDeficit"] as const;
  if (balance.ownerRowId !== String(row.row_id) || balance.unitId !== String(row.unit_id)
    || fields.some(key => typeof balance[key] !== "string" || !isFormulaGraphExactDecimal(balance[key] as string))
    || (balance.plannedConsumption !== undefined && (typeof balance.plannedConsumption !== "string"
      || !isFormulaGraphExactDecimal(balance.plannedConsumption) || compareFormulaGraphDecimals(balance.plannedConsumption, "0") < 0))
    || (balance.quantum != null && (typeof balance.quantum !== "string"
      || !isFormulaGraphExactDecimal(balance.quantum) || compareFormulaGraphDecimals(balance.quantum, "0") <= 0))) {
    throw Object.assign(new Error(`saved purchase balance invalid: ${row.row_id}`), { code: "ARTIFACT_PURCHASE_BALANCE_INVALID" });
  }
  const exact = balance as Record<typeof fields[number], string> & { unitId: string; quantum: string | null;
    plannedConsumption?: string; requirementBasis?: string; balanceScope?: string };
  return { ...balance, ...exact, version: "canonical-persisted-purchase-balance/v1" as const,
    netQuantity: exact.plannedConsumption ?? exact.consumed,
    grossQuantity: exact.consumed, procurementQuantity: exact.effectiveOrder,
    lossQuantity: null, lossPercent: null, wastePercent: null,
    procurementPackageSize: exact.quantum ?? null };
}
