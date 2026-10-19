import type { AutomaticRowSpec } from "./automaticConstructionOwnerR1";

export function effectiveResourceQuantityParameterId(rowId: string): string {
  return `effective_resource_quantity_${rowId.replace(/[^A-Za-z0-9_]/gu, "_")}`;
}

/** Explicit descriptors describe a single compatible homogeneous supply.
 * Source-specific geometry/consumption expressions remain with their owner. */
type BalanceExpressionSources = Readonly<{ ownerRowId: string; orderUnitId: string; consumed: string; stock: string; reserve: string }>;
type SupplyQuantumInput = BalanceExpressionSources & Readonly<{ quantityMode?: "supply_quantum"; quantum: string;
  manualQuantumViolationPolicy?: "retain-raw-and-block-quantum" }>;
type DecimalOrderInput = BalanceExpressionSources & Readonly<{ quantityMode: "canonical_decimal";
  balanceScope: "new_order_vs_required_consumption"; stock: "0"; reserve: "0"; quantum?: never; manualQuantumViolationPolicy?: never }>;
type BalanceExpressions = { effective: string; remaining: string; free: string; consumptionShortage: string; reserveDeficit: string;
  owner: Pick<AutomaticRowSpec, "effectiveQuantityOutput" | "purchaseBalance"> };
export function effectivePurchaseBalanceExpressionsR1(input: SupplyQuantumInput): BalanceExpressions & { packages: string };
export function effectivePurchaseBalanceExpressionsR1(input: DecimalOrderInput): BalanceExpressions & { packages: null };
export function effectivePurchaseBalanceExpressionsR1(input: SupplyQuantumInput | DecimalOrderInput): BalanceExpressions & { packages: string | null } {
  const effective = effectiveResourceQuantityParameterId(input.ownerRowId);
  const remaining = `max(0,(${input.stock})+${effective}-(${input.consumed}))`;
  return {
    effective, remaining,
    free: `max(0,(${remaining})-(${input.reserve}))`,
    consumptionShortage: `max(0,(${input.consumed})-(${input.stock})-${effective})`,
    reserveDeficit: `max(0,(${input.reserve})-(${remaining}))`,
    packages: input.quantityMode === "canonical_decimal" ? null : `${effective}/(${input.quantum})`,
    owner: {
      effectiveQuantityOutput: { parameterId: effective, unitId: input.orderUnitId },
      purchaseBalance: input.quantityMode === "canonical_decimal"
        ? { unitId: input.orderUnitId, consumedExpression: input.consumed, stockExpression: input.stock,
          reserveExpression: input.reserve, quantityMode: input.quantityMode, balanceScope: input.balanceScope }
        : { unitId: input.orderUnitId, consumedExpression: input.consumed, stockExpression: input.stock,
          reserveExpression: input.reserve, orderQuantumExpression: input.quantum,
          ...(input.quantityMode ? { quantityMode: input.quantityMode } : {}),
          ...(input.manualQuantumViolationPolicy ? { manualQuantumViolationPolicy: input.manualQuantumViolationPolicy } : {}) },
    } satisfies Pick<AutomaticRowSpec, "effectiveQuantityOutput" | "purchaseBalance">,
  };
}

export type DeclaredPurchaseBalanceRowsR1 = Readonly<{
  ownerRowId: string;
  consumedRowId: string;
  stock: string;
  reserve: string;
  quantum: string;
  packagesRowId: string;
  remainingRowId: string;
  freeRowId: string;
  /** Explicit conversion of whole-section controls to the owner's metre unit. */
  controlUnitFactor?: string;
  orderedUnitsRowId?: string;
}>;

export function reconcileDeclaredPurchaseBalanceRowsR1(
  rows: readonly AutomaticRowSpec[],
  declarations: readonly DeclaredPurchaseBalanceRowsR1[],
): AutomaticRowSpec[] {
  const byId = new Map(rows.map(row => [row.rowId, row]));
  const replacements = new Map<string, AutomaticRowSpec>();
  const deficits = new Map<string, AutomaticRowSpec[]>();
  for (const declaration of declarations) {
    const owner = byId.get(declaration.ownerRowId);
    const consumed = byId.get(declaration.consumedRowId);
    const factor = declaration.controlUnitFactor ?? "1";
    if (!owner || !consumed || !owner.procurement || owner.costTreatment !== "OWN_COST"
      || (factor === "1" && consumed.unitId !== owner.unitId)) throw new Error(`DECLARED_PURCHASE_BALANCE_SOURCE_INVALID:${declaration.ownerRowId}`);
    const balance = effectivePurchaseBalanceExpressionsR1({ ownerRowId: owner.rowId, orderUnitId: owner.unitId,
      consumed: `(${consumed.expression})*(${factor})`, stock: `(${declaration.stock})*(${factor})`,
      reserve: `(${declaration.reserve})*(${factor})`, quantum: `(${declaration.quantum})*(${factor})` });
    replacements.set(owner.rowId, { ...owner, ...balance.owner });
    if (declaration.orderedUnitsRowId) {
      const row = byId.get(declaration.orderedUnitsRowId);
      if (!row) throw new Error(`DECLARED_PURCHASE_BALANCE_CONTROL_MISSING:${declaration.orderedUnitsRowId}`);
      replacements.set(row.rowId, { ...row, expression: `${balance.effective}/(${factor})` });
    }
    for (const [rowId, expression] of [[declaration.packagesRowId, balance.packages],
      [declaration.remainingRowId, `(${balance.remaining})/(${factor})`], [declaration.freeRowId, `(${balance.free})/(${factor})`]]) {
      const row = byId.get(rowId);
      if (!row) throw new Error(`DECLARED_PURCHASE_BALANCE_CONTROL_MISSING:${rowId}`);
      replacements.set(rowId, { ...row, expression });
    }
    deficits.set(owner.rowId, [["consumption_shortage", "Недостающий материал для расхода", balance.consumptionShortage],
      ["reserve_deficit", "Непокрытый сохраняемый резерв", balance.reserveDeficit]].map(([key, title, expression]) => ({
        ...owner, rowId: `${owner.rowId}:${key}`, formulaId: `${owner.formulaId}:${key}`, title: `${title}: ${owner.title}; закупка не готова`,
        section: `Баланс: ${owner.title}`, expression, procurement: false, costTreatment: "INFORMATIONAL_SCOPE",
        effectiveQuantityOutput: undefined, purchaseBalance: undefined,
        purchaseBalanceOwnerRowId: owner.rowId,
        inclusion: { kind: "and", operands: [
          ...(owner.inclusion ? [owner.inclusion] : []),
          { kind: "formula_greater_than", expression, unitId: owner.unitId, value: 0 },
        ] },
      })));
  }
  return rows.flatMap(row => [replacements.get(row.rowId) ?? row, ...(deficits.get(row.rowId) ?? [])]);
}
