import { compileFormulaGraph, evaluateFormulaGraph, compareFormulaGraphDecimals, isFormulaGraphDecimalMultiple,
  type FormulaParameterValue, type CompiledFormulaGraph } from "./formulaGraph";
const purchaseBalanceGraphs = new WeakMap<object, { sources: string[]; graphs: CompiledFormulaGraph[] }>();

export type CanonicalPurchaseBalanceV1 = Readonly<{
  unitId: string;
  consumedExpression: string;
  stockExpression: string;
  reserveExpression: string;
  orderQuantumExpression: string;
}>;

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
  const fields = ["consumedExpression", "stockExpression", "reserveExpression", "orderQuantumExpression"];
  if (policy.unitId !== unitId || Object.keys(policy).some(key => !["unitId", ...fields].includes(key))) {
    fail("DEFINITION_INTEGRITY_FAILED", "purchase balance unit/keys invalid");
  }
  const sources = fields.map(field => {
    if (typeof policy[field] !== "string") fail("DEFINITION_INTEGRITY_FAILED", `purchase balance ${field} invalid`);
    return policy[field] as string;
  });
  let cached = purchaseBalanceGraphs.get(policy);
  if (!cached || sources.some((source, index) => cached!.sources[index] !== source)) {
    cached = { sources, graphs: sources.map(source => compileFormulaGraph(source)) };
    purchaseBalanceGraphs.set(policy, cached);
  }
  const values = cached.graphs.map(compiled => {
    if (compiled.inputParameterIds.some(id => !declaredParameters.has(id))) fail("DEFINITION_INTEGRITY_FAILED", "purchase balance parameter undeclared");
    const value = evaluateFormulaGraph(compiled.ast, parameters);
    if (Number(value) < 0) fail("DEFINITION_INTEGRITY_FAILED", "purchase balance source negative");
    return value;
  });
  const [consumed, stock, reserve, quantum] = values as [string, string, string, string];
  if (Number(quantum) <= 0) fail("DEFINITION_INTEGRITY_FAILED", "purchase quantum must be positive");
  if (!isFormulaGraphDecimalMultiple(quantity, quantum)) {
    fail("ROW_AMENDMENT_INVALID", "purchase quantity violates declared whole supply quantum");
  }
  const evaluate = (expression: string) => evaluateFormulaGraph(compileFormulaGraph(expression).ast, {});
  const available = `${stock}+${quantity}-${consumed}`;
  const remaining = evaluate(`max(0,${available})`);
  const consumptionShortage = evaluate(`max(0,-(${available}))`);
  const reserveDeficit = evaluate(`max(0,${reserve}-(${remaining}))`);
  const freeBeyondReserve = evaluate(`max(0,${remaining}-${reserve})`);
  return { ownerRowId: rowId, unitId, consumed, stock, reserve, quantum, effectiveOrder: quantity,
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
  if (manualQuantity != null && (compareFormulaGraphDecimals(manualQuantity, formulaQuantity) < 0
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
      consumptionShortage: String(balance.consumptionShortage ?? "0"), reserveDeficit: String(balance.reserveDeficit ?? "0") }];
  });
}

export function canonicalPurchaseShortageMessageV1(rows: readonly PurchaseTraceRow[]): string | null {
  const shortages = canonicalPurchaseShortagesV1(rows);
  if (shortages.length) {
    const reasons = shortages.map(row => `${row.titleRu}: не хватает для расхода ${row.consumptionShortage} ${row.unitId}; резерв не покрыт на ${row.reserveDeficit} ${row.unitId}`).join("; ");
    return `Закупка не готова: ${reasons}. Уточните заказ или подтверждённое снабжение.`;
  }
  return null;
}
export function assertCanonicalPurchaseReadinessV1(rows: readonly PurchaseTraceRow[]): void {
  const message = canonicalPurchaseShortageMessageV1(rows);
  if (message) throw Object.assign(new Error(message), { code: "PROCUREMENT_MATERIAL_SHORTAGE",
    shortages: canonicalPurchaseShortagesV1(rows) });
}
