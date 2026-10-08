import { compareFormulaGraphDecimals, isFormulaGraphExactDecimal } from "./formulaGraph";

/** Display the already saved requirement. Missing supply fields remain absent;
 * neither a UI nor an artifact reader recalculates consumption or an order. */
export function canonicalArtifactPurchaseRequirement(row: { row_id: unknown; unit_id?: unknown; calculation_trace?: unknown }) {
  const raw = objectValue(row.calculation_trace).purchaseRequirementV1;
  if (raw == null) return null;
  const saved = objectValue(raw);
  const fields = [saved.consumed, saved.plannedConsumption];
  const selectedOrder = saved.requirementBasis === "selected_order_including_contingency" || saved.requirementBasis === "selected_supply_order";
  if (saved.version !== "canonical-purchase-requirement:v1" || saved.ownerRowId !== String(row.row_id)
    || saved.unitId !== String(row.unit_id) || typeof saved.conditional !== "boolean"
    || Object.keys(saved).some(key => !["version", "ownerRowId", "unitId", "consumed", "plannedConsumption", "conditional", "requirementBasis"].includes(key))
    || (saved.requirementBasis !== undefined && !selectedOrder)
    || (saved.plannedConsumption != null && !selectedOrder)
    || fields.every(value => value == null)
    || fields.some(value => value != null && (typeof value !== "string" || !isFormulaGraphExactDecimal(value)
      || compareFormulaGraphDecimals(value, "0") < 0))
    || (typeof saved.plannedConsumption === "string" && typeof saved.consumed === "string"
      && compareFormulaGraphDecimals(saved.plannedConsumption, saved.consumed) > 0)) {
    throw Object.assign(new Error(`saved purchase requirement invalid: ${row.row_id}`), { code: "ARTIFACT_PURCHASE_REQUIREMENT_INVALID" });
  }
  return { ...saved, quantity: (saved.plannedConsumption ?? saved.consumed) as string, unitId: String(saved.unitId), conditional: saved.conditional,
    labelRu: saved.conditional ? "Условная потребность" : selectedOrder ? "Расчётная потребность" : "Расход по расчёту" };
}

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
