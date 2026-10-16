import { canonicalExactManualPurchaseQuantityV1 } from "../../lib/estimate/backendPlatform/canonicalPurchaseBalanceV1";
import { compileFormulaGraph, evaluateFormulaGraph } from "../../lib/estimate/backendPlatform/formulaGraph";
import { canonicalPurchaseSupplyWarningV1, parseCanonicalExactPurchaseQuantityV1,
  type CanonicalExactPurchaseQuantityV1 } from "../../lib/estimate/backendPlatform/canonicalPurchaseSupplyReadinessV1";

type Carrier = { id?: string; titleRu?: string; unit?: string | null;
  sourceParameters?: Readonly<Record<string, unknown>> | null };

/** Source-approved capability arrives from the immutable row. This UI metadata
 * never grants permission to the backend or changes the source supply policy. */
export function canonicalExactPurchaseEditingV1(item: Carrier | null | undefined): CanonicalExactPurchaseQuantityV1 | null {
  return parseCanonicalExactPurchaseQuantityV1(item?.sourceParameters?.canonicalExactPurchaseQuantityV1);
}

export function canonicalExactPurchaseInputV1(item: Carrier): string | null {
  const exact = canonicalExactPurchaseEditingV1(item);
  return exact ? exact.manualQuantityText ?? exact.quantityText ?? "" : null;
}

/** Decimal text is the amendment authority; no parseFloat/Number or rounding. */
export function normalizeCanonicalExactPurchaseEditV1(value: string): string | null {
  const text = value.trim().replace(",", ".");
  return text === "" ? null : canonicalExactManualPurchaseQuantityV1(text);
}

export function canonicalExactPurchaseEditMatchesV1(left: string, right: string): boolean {
  try { return normalizeCanonicalExactPurchaseEditV1(left) === normalizeCanonicalExactPurchaseEditV1(right); }
  catch { return false; }
}

/** Uses the existing exact FormulaGraph arithmetic. A missing value remains
 * missing; the stepper does not turn an unresolved quantity into zero. */
export function stepCanonicalExactPurchaseV1(text: string, delta: number): string | null {
  if (delta !== -1 && delta !== 1) throw new Error("exact purchase step must be -1 or +1");
  const value = normalizeCanonicalExactPurchaseEditV1(text);
  if (value == null) return null;
  return evaluateFormulaGraph(compileFormulaGraph(`max(0, Q ${delta === 1 ? "+" : "-"} 1)`).ast, { Q: value });
}

/** Unsaved UI preview only. The saved supply warning remains until the server
 * recompiles the revision; this does not claim the edited order is ready. */
export function previewCanonicalExactPurchaseEditV1(current: CanonicalExactPurchaseQuantityV1,
  next: string | null): CanonicalExactPurchaseQuantityV1 {
  const manual = next == null ? null : canonicalExactManualPurchaseQuantityV1(next);
  return { ...current, manualQuantityText: manual, quantityText: manual ?? current.calculatedQuantityText };
}

export function canonicalPurchaseItemSupplyWarningV1(item: Carrier): string | null {
  return canonicalPurchaseSupplyWarningV1({ rowId: item.sourceParameters?.rowCode ?? item.id,
    titleRu: item.titleRu, unitId: item.unit,
    calculationTrace: { purchaseSupplyBlocksV1: item.sourceParameters?.canonicalPurchaseSupplyBlocksV1 } });
}
