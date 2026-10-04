import { compileFormulaGraph, evaluateFormulaGraph, compareFormulaGraphDecimals, isFormulaGraphDecimalMultiple, isFormulaGraphExactDecimal,
  type FormulaParameterValue, type CompiledFormulaGraph } from "./formulaGraph";
const purchaseBalanceGraphs = new WeakMap<object, { sources: string[]; graphs: CompiledFormulaGraph[] }>();

type PurchaseBalanceSources = Readonly<{
  unitId: string;
  consumedExpression: string;
  stockExpression: string;
  reserveExpression: string;
}>;
type SelectedOrderBasis = Readonly<{
  balanceScope: "new_order_vs_required_consumption";
  stockExpression: "0";
  reserveExpression: "0";
  requirementBasis: "selected_order_including_contingency" | "selected_supply_order";
  plannedConsumptionExpression: string;
}>;
export type CanonicalPurchaseBalanceV1 = PurchaseBalanceSources & (
  | Readonly<{ quantityMode?: "supply_quantum"; orderQuantumExpression: string }> & (
    | Readonly<{ balanceScope?: never; requirementBasis?: never; plannedConsumptionExpression?: never }>
    | SelectedOrderBasis
  )
  | Readonly<{ quantityMode: "canonical_decimal"; balanceScope: "new_order_vs_required_consumption";
    stockExpression: "0"; reserveExpression: "0"; orderQuantumExpression?: never }> & (
      | Readonly<{ requirementBasis?: never; plannedConsumptionExpression?: never }>
      | Readonly<{ requirementBasis: "selected_order_including_contingency"; plannedConsumptionExpression: string }>
    )
);

export function resolveCanonicalPurchaseBalanceV1(
  raw: unknown,
  rowId: string,
  unitId: string,
  quantity: string,
  parameters: Record<string, FormulaParameterValue>,
  declaredParameters: ReadonlySet<string>,
) {
  if (raw == null) return null;
  const fail = (code: string, detail: string): never => {
    throw Object.assign(new Error(`${detail}: ${rowId}`), { code });
  };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) fail("DEFINITION_INTEGRITY_FAILED", "purchase balance invalid");
  const policy = raw as Record<string, unknown>;
  const quantityMode = policy.quantityMode === undefined ? "supply_quantum" : policy.quantityMode;
  if (quantityMode !== "supply_quantum" && quantityMode !== "canonical_decimal") fail("DEFINITION_INTEGRITY_FAILED", "purchase quantity mode invalid");
  const decimal = quantityMode === "canonical_decimal";
  const scoped = policy.balanceScope === "new_order_vs_required_consumption";
  const selectedOrder = scoped && (policy.requirementBasis === "selected_order_including_contingency"
    || (!decimal && policy.requirementBasis === "selected_supply_order"));
  if ((Object.hasOwn(policy, "requirementBasis") && !selectedOrder) || (Object.hasOwn(policy, "plannedConsumptionExpression") && !selectedOrder)) {
    fail("DEFINITION_INTEGRITY_FAILED", "purchase requirement basis invalid");
  }
  const fields = ["consumedExpression", "stockExpression", "reserveExpression", ...(decimal ? [] : ["orderQuantumExpression"]),
    ...(selectedOrder ? ["plannedConsumptionExpression"] : [])];
  if (policy.unitId !== unitId || Object.keys(policy).some(key => !["unitId", "quantityMode", ...((decimal || scoped) ? ["balanceScope", "requirementBasis"] : []), ...fields].includes(key))
    || (decimal && !scoped) || (scoped && (policy.stockExpression !== "0" || policy.reserveExpression !== "0"))
    || (!decimal && scoped && !selectedOrder)) {
    fail("DEFINITION_INTEGRITY_FAILED", "purchase balance unit/keys invalid");
  }
  const sources = fields.map(field => {
    if (typeof policy[field] !== "string") fail("DEFINITION_INTEGRITY_FAILED", `purchase balance ${field} invalid`);
    return policy[field] as string;
  });
  let cached = purchaseBalanceGraphs.get(policy);
  if (!cached || cached.sources.length !== sources.length || sources.some((source, index) => cached!.sources[index] !== source)) {
    cached = { sources, graphs: sources.map(source => compileFormulaGraph(source)) };
    purchaseBalanceGraphs.set(policy, cached);
  }
  const values = cached.graphs.map(compiled => {
    if (compiled.inputParameterIds.some(id => !declaredParameters.has(id))) fail("DEFINITION_INTEGRITY_FAILED", "purchase balance parameter undeclared");
    const value = evaluateFormulaGraph(compiled.ast, parameters);
    if (compareFormulaGraphDecimals(value, "0") < 0) fail("DEFINITION_INTEGRITY_FAILED", "purchase balance source negative");
    return value;
  });
  const evaluated = Object.fromEntries(fields.map((field, index) => [field, values[index]]));
  const consumed = evaluated.consumedExpression;
  const stock = evaluated.stockExpression;
  const reserve = evaluated.reserveExpression;
  const quantum = decimal ? null : evaluated.orderQuantumExpression;
  const plannedConsumption = selectedOrder ? evaluated.plannedConsumptionExpression : null;
  if (plannedConsumption != null && compareFormulaGraphDecimals(plannedConsumption, consumed) > 0) {
    fail("DEFINITION_INTEGRITY_FAILED", "selected order requirement below planned consumption");
  }
  if ((decimal || scoped) && (!isFormulaGraphExactDecimal(quantity) || compareFormulaGraphDecimals(quantity, "0") < 0)) {
    fail("ROW_AMENDMENT_INVALID", "purchase quantity is outside the exact canonical decimal domain");
  }
  if (quantum != null && compareFormulaGraphDecimals(quantum, "0") <= 0) fail("DEFINITION_INTEGRITY_FAILED", "purchase quantum must be positive");
  if (quantum != null && !isFormulaGraphDecimalMultiple(quantity, quantum)) {
    fail("ROW_AMENDMENT_INVALID", "purchase quantity violates declared whole supply quantum");
  }
  const evaluate = (expression: string) => evaluateFormulaGraph(compileFormulaGraph(expression).ast, {});
  const available = `${stock}+${quantity}-${consumed}`;
  const remaining = evaluate(`max(0,${available})`);
  const consumptionShortage = evaluate(`max(0,-(${available}))`);
  const reserveDeficit = evaluate(`max(0,${reserve}-(${remaining}))`);
  const freeBeyondReserve = evaluate(`max(0,${remaining}-${reserve})`);
  return { ownerRowId: rowId, unitId, consumed, stock, reserve, quantum, quantityMode,
    ...(scoped ? { balanceScope: policy.balanceScope, excessOrderAboveRequiredConsumption: remaining } : {}),
    ...(selectedOrder ? { requirementBasis: policy.requirementBasis, plannedConsumption, requiredSelectedOrder: consumed } : {}), effectiveOrder: quantity,
    remaining, freeBeyondReserve, consumptionShortage, reserveDeficit,
    procurementReady: consumptionShortage === "0" && reserveDeficit === "0" };
}

export function validateCanonicalManualTransportQuantityV1(
  raw: unknown,
  rowId: string,
  unitId: string,
  manualQuantity: string | null,
  formulaQuantity: string,
) {
  if (raw == null) return null;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)
    || (raw as Record<string, unknown>).unitId !== unitId
    || (raw as Record<string, unknown>).minimum !== "calculated_quantity"
    || Object.keys(raw).some(key => !["unitId", "minimum", "integer"].includes(key))) {
    throw Object.assign(new Error(`manual transport policy invalid ${rowId}`), { code: "DEFINITION_INTEGRITY_FAILED" });
  }
  if (manualQuantity != null && (!isFormulaGraphExactDecimal(manualQuantity) || compareFormulaGraphDecimals(manualQuantity, formulaQuantity) < 0
    || ((raw as Record<string, unknown>).integer === true && !isFormulaGraphDecimalMultiple(manualQuantity, "1")))) {
    throw Object.assign(new Error(`manual transport below physical minimum ${rowId}`), { code: "ROW_AMENDMENT_INVALID" });
  }
  return { minimumQuantity: formulaQuantity, acceptedQuantity: manualQuantity ?? formulaQuantity,
    manualQuantity, differsFromCalculated: manualQuantity != null && compareFormulaGraphDecimals(manualQuantity, formulaQuantity) !== 0 };
}

/** Reads the persisted calculation trace, so a writer/read mapper cannot lose
 * shortage readiness merely by omitting a new optional top-level row field. */
type PurchaseTraceRow = { calculation_trace?: unknown; calculationTrace?: unknown; row_id?: unknown; rowId?: unknown;
  title_ru?: unknown; titleRu?: unknown; unit_id?: unknown; unitId?: unknown };
export function canonicalPurchaseShortagesV1(rows: readonly PurchaseTraceRow[]) {
  return rows.flatMap(row => {
    const trace = (row.calculation_trace ?? row.calculationTrace) as Record<string, unknown> | undefined;
    const balance = trace?.purchaseBalance as Record<string, unknown> | undefined;
    if (!balance || (balance.procurementReady !== false && !(Number(balance.consumptionShortage) > 0) && !(Number(balance.reserveDeficit) > 0))) return [];
    return [{ rowId: String(row.row_id ?? row.rowId ?? ""), titleRu: String(row.title_ru ?? row.titleRu ?? "Материал"),
      unitId: String(balance.unitId ?? row.unit_id ?? row.unitId ?? ""),
      requirementBasis: balance.requirementBasis,
      ...(balance.quantityMode === "supply_quantum" && balance.balanceScope === "new_order_vs_required_consumption"
        ? { discreteOrderScope: true } : {}),
      consumptionShortage: String(balance.consumptionShortage ?? "0"), reserveDeficit: String(balance.reserveDeficit ?? "0") }];
  });
}

export function canonicalPurchaseShortageMessageV1(rows: readonly PurchaseTraceRow[]): string | null {
  const shortages = canonicalPurchaseShortagesV1(rows);
  if (shortages.length) {
    const reasons = shortages.map(row => row.requirementBasis === "selected_order_including_contingency" || row.requirementBasis === "selected_supply_order"
      ? row.discreteOrderScope
        ? `${row.titleRu}: не хватает до расчётного заказа ${row.consumptionShortage} ${row.unitId}`
        : `${row.titleRu}: заказ с выбранным резервом не покрыт на ${row.consumptionShortage} ${row.unitId}`
      : `${row.titleRu}: не хватает для расхода ${row.consumptionShortage} ${row.unitId}; резерв не покрыт на ${row.reserveDeficit} ${row.unitId}`).join("; ");
    return `Закупка не готова: ${reasons}. Уточните заказ или подтверждённое снабжение.`;
  }
  return null;
}
export function assertCanonicalPurchaseReadinessV1(rows: readonly PurchaseTraceRow[]): void {
  const message = canonicalPurchaseShortageMessageV1(rows);
  if (message) throw Object.assign(new Error(message), { code: "PROCUREMENT_MATERIAL_SHORTAGE",
    shortages: canonicalPurchaseShortagesV1(rows) });
}
