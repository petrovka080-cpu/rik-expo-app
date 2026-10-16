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
  | Readonly<{ quantityMode?: "supply_quantum"; orderQuantumExpression: string;
    manualQuantumViolationPolicy?: "retain-raw-and-block-quantum" }> & (
    | Readonly<{ balanceScope?: never; requirementBasis?: never; plannedConsumptionExpression?: never }>
    | SelectedOrderBasis
  )
  | Readonly<{ quantityMode: "canonical_decimal"; balanceScope: "new_order_vs_required_consumption";
    stockExpression: "0"; reserveExpression: "0"; orderQuantumExpression?: never; manualQuantumViolationPolicy?: never }> & (
      | Readonly<{ requirementBasis?: never; plannedConsumptionExpression?: never }>
      | SelectedOrderBasis
    )
);

function canonicalPurchaseBalancePlanV1(
  raw: unknown,
  rowId: string,
  unitId: string,
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
  if (Object.hasOwn(policy, "manualQuantumViolationPolicy")
    && (decimal || policy.manualQuantumViolationPolicy !== "retain-raw-and-block-quantum")) {
    fail("DEFINITION_INTEGRITY_FAILED", "manual purchase quantum policy invalid");
  }
  const scoped = policy.balanceScope === "new_order_vs_required_consumption";
  const selectedOrder = scoped && (policy.requirementBasis === "selected_order_including_contingency"
    || policy.requirementBasis === "selected_supply_order");
  if ((Object.hasOwn(policy, "requirementBasis") && !selectedOrder) || (Object.hasOwn(policy, "plannedConsumptionExpression") && !selectedOrder)) {
    fail("DEFINITION_INTEGRITY_FAILED", "purchase requirement basis invalid");
  }
  const fields = ["consumedExpression", "stockExpression", "reserveExpression", ...(decimal ? [] : ["orderQuantumExpression"]),
    ...(selectedOrder ? ["plannedConsumptionExpression"] : [])];
  if (policy.unitId !== unitId || Object.keys(policy).some(key => !["unitId", "quantityMode", ...(!decimal ? ["manualQuantumViolationPolicy"] : []), ...((decimal || scoped) ? ["balanceScope", "requirementBasis"] : []), ...fields].includes(key))
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
  for (const compiled of cached.graphs) {
    if (compiled.inputParameterIds.some(id => !declaredParameters.has(id))) fail("DEFINITION_INTEGRITY_FAILED", "purchase balance parameter undeclared");
  }
  return { fail, policy, quantityMode, decimal, scoped, selectedOrder, fields, cached };
}

export const CANONICAL_MANUAL_QUANTUM_RETENTION_POLICY_V1 = "retain-raw-and-block-quantum" as const;

export type CanonicalManualPurchaseSupplyBlockV1 = Readonly<{
  version: "canonical-manual-purchase-supply-block/v1";
  policy: typeof CANONICAL_MANUAL_QUANTUM_RETENTION_POLICY_V1;
  ownerRowId: string;
  unitId: string;
  rawManualQuantity: string;
  manualProvenance: Readonly<{ kind: "manual"; reason?: string }>;
  reasonCode: "ORDER_QUANTUM_VIOLATION" | "ORDER_QUANTUM_UNCONFIRMED";
  quantum: string | null;
  procurementReady: false;
  physicalBalanceReady: false;
  derivedQuantityPublishable: false;
}>;

/** The existing decimal domain, without Number conversion, rounding or trimming.
 * The compile caller supplies its already normalized quantity text; the original
 * request remains in the immutable amendment contract. */
export function canonicalExactManualPurchaseQuantityV1(quantity: unknown): string {
  if (typeof quantity !== "string" || !/^\+?\d+(?:\.\d+)?$/u.test(quantity)
    || !isFormulaGraphExactDecimal(quantity) || compareFormulaGraphDecimals(quantity, "0") < 0) {
    throw Object.assign(new Error("manual purchase quantity is outside the exact canonical decimal domain"), {
      code: "ROW_AMENDMENT_INVALID",
    });
  }
  return quantity;
}

function canonicalRetainedManualProvenanceV1(raw: unknown): { kind: "manual"; reason?: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)
    || (raw as Record<string, unknown>).kind !== "manual") {
    throw Object.assign(new Error("manual purchase quantity requires validated row-override provenance"), {
      code: "ROW_AMENDMENT_INVALID",
    });
  }
  const reason = (raw as Record<string, unknown>).reason;
  if (reason != null && (typeof reason !== "string" || reason.trim().length > 500)) {
    throw Object.assign(new Error("manual purchase quantity provenance reason invalid"), { code: "ROW_AMENDMENT_INVALID" });
  }
  return { kind: "manual", ...(typeof reason === "string" ? { reason: reason.trim() } : {}) };
}

/** Inspect only an actual validated row override. A null result is NOT readiness:
 * the caller must still run the ordinary balance/need path. Automatic quantities
 * never enter this exception, and both existing strict functions remain strict.
 * No consumption, stock, reserve, package count or price is invented here. */
export function resolveCanonicalManualPurchaseSupplyBlockV1(
  raw: unknown, rowId: string, unitId: string, manualQuantity: string | null,
  manualProvenance: unknown, parameters: Record<string, FormulaParameterValue>,
  declaredParameters: ReadonlySet<string>,
): CanonicalManualPurchaseSupplyBlockV1 | null {
  const plan = canonicalPurchaseBalancePlanV1(raw, rowId, unitId, declaredParameters);
  if (!plan || plan.policy.manualQuantumViolationPolicy !== CANONICAL_MANUAL_QUANTUM_RETENTION_POLICY_V1
    || manualQuantity == null) return null;
  const rawManualQuantity = canonicalExactManualPurchaseQuantityV1(manualQuantity);
  const provenance = canonicalRetainedManualProvenanceV1(manualProvenance);
  // A retained order must not mask a known invalid physical/source input.
  // Unknown expressions remain null; no missing norm or site fact is supplied.
  const evaluated: Record<string, string | null> = Object.fromEntries(plan.fields.map((field, index) => {
    const graph = plan.cached.graphs[index];
    const value = graph.inputParameterIds.every(id => parameters[id] != null && parameters[id] !== "")
      ? evaluateFormulaGraph(graph.ast, parameters) : null;
    if (value != null && compareFormulaGraphDecimals(value, "0") < 0) {
      plan.fail("DEFINITION_INTEGRITY_FAILED", "purchase balance source negative");
    }
    return [field, value];
  }));
  if (plan.selectedOrder && evaluated.plannedConsumptionExpression != null && evaluated.consumedExpression != null
    && compareFormulaGraphDecimals(evaluated.plannedConsumptionExpression, evaluated.consumedExpression) > 0) {
    plan.fail("DEFINITION_INTEGRITY_FAILED", "selected order requirement below planned consumption");
  }
  const quantum = evaluated.orderQuantumExpression;
  if (quantum != null && compareFormulaGraphDecimals(quantum, "0") <= 0) {
    plan.fail("DEFINITION_INTEGRITY_FAILED", "purchase quantum must be positive");
  }
  if (quantum != null && isFormulaGraphDecimalMultiple(rawManualQuantity, quantum)) return null;
  return {
    version: "canonical-manual-purchase-supply-block/v1",
    policy: CANONICAL_MANUAL_QUANTUM_RETENTION_POLICY_V1,
    ownerRowId: rowId, unitId, rawManualQuantity, manualProvenance: provenance,
    reasonCode: quantum == null ? "ORDER_QUANTUM_UNCONFIRMED" : "ORDER_QUANTUM_VIOLATION",
    quantum, procurementReady: false, physicalBalanceReady: false, derivedQuantityPublishable: false,
  };
}

/** Validate saved evidence. Downstream references may carry the same block, but
 * the owner reader must additionally bind ownerRowId, unit and exact quantity to
 * the saved row/amendment. This parser is not an authorization or migration gate. */
export function parseCanonicalManualPurchaseSupplyBlockV1(raw: unknown): CanonicalManualPurchaseSupplyBlockV1 | null {
  if (raw == null) return null;
  const fail = (): never => {
    throw Object.assign(new Error("saved manual purchase supply block invalid"), {
      code: "ARTIFACT_PURCHASE_SUPPLY_BLOCK_INVALID",
    });
  };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail();
  const saved = raw as Record<string, unknown>;
  const keys = ["version", "policy", "ownerRowId", "unitId", "rawManualQuantity", "manualProvenance", "reasonCode",
    "quantum", "procurementReady", "physicalBalanceReady", "derivedQuantityPublishable"];
  if (Object.keys(saved).length !== keys.length || Object.keys(saved).some(key => !keys.includes(key))
    || saved.version !== "canonical-manual-purchase-supply-block/v1"
    || saved.policy !== CANONICAL_MANUAL_QUANTUM_RETENTION_POLICY_V1
    || typeof saved.ownerRowId !== "string" || !saved.ownerRowId.trim()
    || typeof saved.unitId !== "string" || !saved.unitId.trim()
    || saved.procurementReady !== false || saved.physicalBalanceReady !== false || saved.derivedQuantityPublishable !== false) return fail();
  let quantity: string;
  let provenance: { kind: "manual"; reason?: string };
  try {
    quantity = canonicalExactManualPurchaseQuantityV1(saved.rawManualQuantity);
    provenance = canonicalRetainedManualProvenanceV1(saved.manualProvenance);
  } catch { return fail(); }
  const rawProvenance = saved.manualProvenance as Record<string, unknown>;
  if (Object.keys(rawProvenance).some(key => !["kind", "reason"].includes(key))
    || (Object.hasOwn(rawProvenance, "reason") && rawProvenance.reason !== provenance.reason)) return fail();
  if (saved.reasonCode === "ORDER_QUANTUM_UNCONFIRMED") {
    if (saved.quantum !== null) return fail();
  } else if (saved.reasonCode === "ORDER_QUANTUM_VIOLATION") {
    if (typeof saved.quantum !== "string" || !isFormulaGraphExactDecimal(saved.quantum)
      || compareFormulaGraphDecimals(saved.quantum, "0") <= 0
      || isFormulaGraphDecimalMultiple(quantity, saved.quantum)) return fail();
  } else return fail();
  return {
    version: "canonical-manual-purchase-supply-block/v1", policy: CANONICAL_MANUAL_QUANTUM_RETENTION_POLICY_V1,
    ownerRowId: saved.ownerRowId, unitId: saved.unitId, rawManualQuantity: quantity, manualProvenance: provenance,
    reasonCode: saved.reasonCode, quantum: saved.quantum as string | null,
    procurementReady: false, physicalBalanceReady: false, derivedQuantityPublishable: false,
  };
}

/** Use a public unit label from the existing unit registry and the saved/manual
 * public title. This message never derives or rounds physical quantities. */
export function canonicalManualPurchaseSupplyBlockMessageV1(
  block: CanonicalManualPurchaseSupplyBlockV1, titleRu: string, unitLabelRu: string,
): string {
  const reason = block.reasonCode === "ORDER_QUANTUM_VIOLATION"
    ? `количество не кратно подтверждённому шагу поставки ${block.quantum} ${unitLabelRu}`
    : "шаг поставки не подтверждён";
  return `${titleRu}: сохранено ручное количество ${block.rawManualQuantity} ${unitLabelRu}. Закупка не готова: ${reason}. `
    + "Уточните количество или подтверждённые условия поставки. Сохранённое значение не изменено.";
}

function assertCanonicalPurchaseOrderQuantityV1(
  plan: NonNullable<ReturnType<typeof canonicalPurchaseBalancePlanV1>>,
  quantity: string,
  quantum: string | null,
) {
  if ((plan.decimal || plan.scoped) && (!isFormulaGraphExactDecimal(quantity) || compareFormulaGraphDecimals(quantity, "0") < 0)) {
    plan.fail("ROW_AMENDMENT_INVALID", "purchase quantity is outside the exact canonical decimal domain");
  }
  if (quantum != null && compareFormulaGraphDecimals(quantum, "0") <= 0) plan.fail("DEFINITION_INTEGRITY_FAILED", "purchase quantum must be positive");
  if (quantum != null && !isFormulaGraphDecimalMultiple(quantity, quantum)) {
    plan.fail("ROW_AMENDMENT_INVALID", "purchase quantity violates declared whole supply quantum");
  }
}

/** A known supply step still constrains a manual order when consumption is
 * unknown. This validates the order only; it never supplies a missing norm,
 * creates a consumption balance or marks procurement ready. */
export function validateCanonicalPurchaseOrderQuantityV1(
  raw: unknown, rowId: string, unitId: string, quantity: string,
  parameters: Record<string, FormulaParameterValue>, declaredParameters: ReadonlySet<string>,
): void {
  const plan = canonicalPurchaseBalancePlanV1(raw, rowId, unitId, declaredParameters);
  if (!plan) return;
  const graph = plan.decimal ? null : plan.cached.graphs[plan.fields.indexOf("orderQuantumExpression")];
  const quantum = graph && graph.inputParameterIds.every(id => parameters[id] != null && parameters[id] !== "")
    ? evaluateFormulaGraph(graph.ast, parameters) : null;
  assertCanonicalPurchaseOrderQuantityV1(plan, quantity, quantum);
}

export function resolveCanonicalPurchaseBalanceV1(
  raw: unknown, rowId: string, unitId: string, quantity: string,
  parameters: Record<string, FormulaParameterValue>, declaredParameters: ReadonlySet<string>,
) {
  const plan = canonicalPurchaseBalancePlanV1(raw, rowId, unitId, declaredParameters);
  if (!plan) return null;
  const { fail, policy, quantityMode, decimal, scoped, selectedOrder, fields, cached } = plan;
  const values = cached.graphs.map(compiled => {
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
  assertCanonicalPurchaseOrderQuantityV1(plan, quantity, quantum);
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

/** A known requirement survives unknown stock, reserve, packaging or order.
 * This uses the same validated policy and decimal FormulaGraph as the full
 * balance. It never supplies a missing commercial/site value or a ready order. */
export function resolveCanonicalKnownPurchaseRequirementV1(
  raw: unknown, rowId: string, unitId: string,
  parameters: Record<string, FormulaParameterValue>, declaredParameters: ReadonlySet<string>, conditional: boolean,
  preliminaryParameterIds?: ReadonlySet<string>,
) {
  const plan = canonicalPurchaseBalancePlanV1(raw, rowId, unitId, declaredParameters);
  if (!plan) return null;
  const known = (field: string): string | null => {
    const graph = plan.cached.graphs[plan.fields.indexOf(field)];
    if (!graph || graph.inputParameterIds.some(id => parameters[id] == null || parameters[id] === "")) return null;
    const value = evaluateFormulaGraph(graph.ast, parameters);
    if (compareFormulaGraphDecimals(value, "0") < 0) plan.fail("DEFINITION_INTEGRITY_FAILED", "purchase balance source negative");
    return value;
  };
  const consumed = known("consumedExpression");
  const plannedConsumption = plan.selectedOrder ? known("plannedConsumptionExpression") : null;
  if (consumed == null && plannedConsumption == null) return null;
  if (plannedConsumption != null && consumed != null && compareFormulaGraphDecimals(plannedConsumption, consumed) > 0) {
    plan.fail("DEFINITION_INTEGRITY_FAILED", "selected order requirement below planned consumption");
  }
  const displayedGraph = plan.cached.graphs[plan.fields.indexOf(plannedConsumption == null ? "consumedExpression" : "plannedConsumptionExpression")];
  const preliminaryInputs = displayedGraph.inputParameterIds.filter(id => preliminaryParameterIds?.has(id));
  return { version: "canonical-purchase-requirement:v1" as const, ownerRowId: rowId, unitId, consumed, plannedConsumption,
    ...(plan.selectedOrder ? { requirementBasis: plan.policy.requirementBasis } : {}), conditional,
    ...(preliminaryInputs.length ? { preliminaryParameterIds: preliminaryInputs } : {}) };
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
      ? row.requirementBasis === "selected_supply_order" || row.discreteOrderScope
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
