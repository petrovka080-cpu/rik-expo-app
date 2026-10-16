import {
  CANONICAL_MANUAL_QUANTUM_RETENTION_POLICY_V1, canonicalExactManualPurchaseQuantityV1,
  canonicalManualPurchaseSupplyBlockMessageV1, parseCanonicalManualPurchaseSupplyBlockV1,
  type CanonicalManualPurchaseSupplyBlockV1,
} from "./canonicalPurchaseBalanceV1";
import { compareFormulaGraphDecimals } from "./formulaGraph";
import { canonicalEstimateStableJson } from "./canonicalEstimateDeterminism";
import { formatEstimateUnitLabel } from "../../ai/globalEstimate/formatEstimateUnitLabel";

type Row = { row_id?: unknown; rowId?: unknown; unit_id?: unknown; unitId?: unknown; quantity?: unknown;
  title_ru?: unknown; titleRu?: unknown; calculation_trace?: unknown; calculationTrace?: unknown;
  included_in_procurement?: unknown; includedInProcurement?: unknown; included_in_estimate?: unknown;
  includedInEstimate?: unknown; amount?: unknown; need_state?: unknown; needState?: unknown };
const object = (raw: unknown): Record<string, unknown> => raw != null && typeof raw === "object" && !Array.isArray(raw)
  ? raw as Record<string, unknown> : {};
const id = (row: Row) => String(row.row_id ?? row.rowId ?? "");
const unit = (row: Row) => String(row.unit_id ?? row.unitId ?? "");
const traceOf = (row: Row) => object(row.calculation_trace ?? row.calculationTrace);
const fail = (): never => { throw Object.assign(new Error("Сохранённое количество и условия поставки не совпадают с версией сметы."), {
  code: "ARTIFACT_PURCHASE_SUPPLY_BLOCK_INVALID", httpStatus: 409,
}); };
const same = (left: unknown, right: unknown) => canonicalEstimateStableJson(left) === canonicalEstimateStableJson(right);
const quantityEquals = (stored: unknown, expected: string): boolean => {
  try { return compareFormulaGraphDecimals(canonicalExactManualPurchaseQuantityV1(String(stored)), expected) === 0; }
  catch { return fail(); }
};

export type CanonicalExactPurchaseQuantityV1 = Readonly<{
  version: "canonical-exact-purchase-quantity/v1";
  quantityText: string | null;
  manualQuantityText: string | null;
  calculatedQuantityText: string | null;
}>;
export type CanonicalPurchaseSupplyIndexV1 = Readonly<{
  version: "canonical-purchase-supply-index/v1";
  owners: readonly CanonicalManualPurchaseSupplyBlockV1[];
  rows: Readonly<Record<string, readonly string[]>>;
}>;

export function hasCanonicalExactPurchaseQuantityPolicyV1(graph: unknown): boolean {
  return object(object(graph).purchaseBalanceV1).manualQuantumViolationPolicy === CANONICAL_MANUAL_QUANTUM_RETENTION_POLICY_V1;
}

export function canonicalPurchaseSupplyBlocksV1(raw: unknown): CanonicalManualPurchaseSupplyBlockV1[] {
  if (raw == null) return [];
  if (!Array.isArray(raw) || raw.length === 0) return fail();
  const result = raw.map(value => {
    try { return parseCanonicalManualPurchaseSupplyBlockV1(value) ?? fail(); }
    catch { return fail(); }
  });
  const owners = result.map(block => block.ownerRowId);
  if (new Set(owners).size !== owners.length || !same(owners, [...owners].sort())) return fail();
  return result;
}

export function mergeCanonicalPurchaseSupplyBlocksV1(
  values: readonly CanonicalManualPurchaseSupplyBlockV1[],
): CanonicalManualPurchaseSupplyBlockV1[] {
  const byOwner = new Map<string, CanonicalManualPurchaseSupplyBlockV1>();
  for (const block of values) {
    const old = byOwner.get(block.ownerRowId);
    if (old && !same(old, block)) return fail();
    byOwner.set(block.ownerRowId, block);
  }
  return [...byOwner.keys()].sort().map(key => byOwner.get(key)!);
}

/** No numeric conversion: this projection is an editing value, not a second
 * quantity calculation. The compiler supplies its existing exact strings. */
export function buildCanonicalExactPurchaseQuantityV1(graph: unknown, quantityText: string | null,
  manualQuantityText: string | null, calculatedQuantityText: string | null): CanonicalExactPurchaseQuantityV1 | null {
  if (!hasCanonicalExactPurchaseQuantityPolicyV1(graph)) return null;
  for (const value of [quantityText, manualQuantityText, calculatedQuantityText]) {
    if (value != null) canonicalExactManualPurchaseQuantityV1(value);
  }
  return { version: "canonical-exact-purchase-quantity/v1", quantityText, manualQuantityText, calculatedQuantityText };
}

export function parseCanonicalExactPurchaseQuantityV1(raw: unknown): CanonicalExactPurchaseQuantityV1 | null {
  if (raw == null) return null;
  const value = object(raw);
  if (Object.keys(value).length !== 4 || Object.keys(value).some(key => ![
    "version", "quantityText", "manualQuantityText", "calculatedQuantityText",
  ].includes(key)) || value.version !== "canonical-exact-purchase-quantity/v1") return fail();
  try {
    for (const key of ["quantityText", "manualQuantityText", "calculatedQuantityText"]) {
      if (value[key] !== null) canonicalExactManualPurchaseQuantityV1(value[key]);
    }
  } catch { return fail(); }
  return value as CanonicalExactPurchaseQuantityV1;
}

function normalizedManual(raw: unknown): { quantity: string; provenance: Record<string, unknown> } {
  const override = object(raw), provenance = object(override.provenance);
  if (!Object.hasOwn(override, "quantity") || override.quantity == null || provenance.kind !== "manual"
    || provenance.reason != null && (typeof provenance.reason !== "string" || provenance.reason.trim().length > 500)) return fail();
  let quantity: string;
  try { quantity = canonicalExactManualPurchaseQuantityV1(String(override.quantity).trim()); } catch { return fail(); }
  return { quantity, provenance: { kind: "manual", ...(typeof provenance.reason === "string" ? { reason: provenance.reason.trim() } : {}) } };
}

function readIndex(amendmentContract: unknown): CanonicalPurchaseSupplyIndexV1 | null {
  const amendment = object(amendmentContract);
  const raw = object(amendment.parameterSources).purchaseSupplyIndexV1;
  if (raw == null) return null;
  const value = object(raw), owners = canonicalPurchaseSupplyBlocksV1(value.owners), rows = object(value.rows);
  if (Object.keys(value).length !== 3 || value.version !== "canonical-purchase-supply-index/v1"
    || value.rows == null || Array.isArray(value.rows) || !owners.length || !Object.keys(rows).length) return fail();
  const known = new Set(owners.map(block => block.ownerRowId));
  for (const block of owners) {
    const manual = normalizedManual(object(amendment.rowOverrides)[block.ownerRowId]);
    if (manual.quantity !== block.rawManualQuantity || !same(manual.provenance, block.manualProvenance)) return fail();
  }
  for (const [rowId, ids] of Object.entries(rows)) {
    if (!rowId || !Array.isArray(ids) || !ids.length || ids.some(owner => typeof owner !== "string" || !known.has(owner))
      || new Set(ids).size !== ids.length || !same(ids, [...ids].sort())) return fail();
  }
  if (owners.some(block => !Array.isArray(rows[block.ownerRowId]) || !(rows[block.ownerRowId] as unknown[]).includes(block.ownerRowId))) return fail();
  return { version: "canonical-purchase-supply-index/v1", owners, rows: rows as Record<string, string[]> };
}

/** Called with the immutable revision amendment, including on paginated reads.
 * The index is generated afresh by compile and included in its checksum basis. */
export function assertCanonicalPurchaseSupplyRowV1(row: Row, amendmentContract: unknown): void {
  const trace = traceOf(row), graph = object(trace.resourceGraph);
  const blocks = canonicalPurchaseSupplyBlocksV1(trace.purchaseSupplyBlocksV1);
  const index = readIndex(amendmentContract);
  const expected = index?.rows[id(row)] ?? [];
  if (!same(blocks.map(block => block.ownerRowId), expected)) return fail();
  for (const block of blocks) {
    if (!same(index?.owners.find(owner => owner.ownerRowId === block.ownerRowId), block)) return fail();
    if (block.ownerRowId === id(row)) {
      if (!hasCanonicalExactPurchaseQuantityPolicyV1(graph) || block.unitId !== unit(row)
        || trace.manualQuantityOverride !== true || !same(trace.manualAmendment, block.manualProvenance)) return fail();
      if (row.quantity == null || !quantityEquals(row.quantity, block.rawManualQuantity)) return fail();
    }
  }
  if (blocks.length && (trace.purchaseBalance != null || trace.effectiveQuantityOutput != null
    || row.included_in_procurement === true || row.includedInProcurement === true
    || row.included_in_estimate === true || row.includedInEstimate === true || row.amount != null)) return fail();
  if (blocks.length && !blocks.some(block => block.ownerRowId === id(row)) && row.quantity != null) return fail();
  const state = row.need_state ?? row.needState;
  if (state === "SUPPLY_CONFIRMATION_REQUIRED" && !blocks.length) return fail();
  const exact = parseCanonicalExactPurchaseQuantityV1(trace.exactPurchaseQuantityV1);
  if (hasCanonicalExactPurchaseQuantityPolicyV1(graph) !== (exact != null)) return fail();
  if (exact) {
    const assessment = object(trace.manualPurchaseSupplyAssessmentV1);
    if (Object.keys(assessment).length !== 4 || assessment.version !== "canonical-manual-supply-assessment/v1"
      || assessment.manualQuantityPresent !== (exact.manualQuantityText != null)
      || assessment.blocked !== blocks.some(block => block.ownerRowId === id(row))
      || assessment.physicalExcluded !== (trace.physicalScopeExcludedV1 != null)) return fail();
    if (assessment.physicalExcluded === true && assessment.blocked === true) return fail();
    if ((row.quantity == null) !== (exact.quantityText == null)
      || row.quantity != null && !quantityEquals(row.quantity, exact.quantityText!)) return fail();
    if (exact.manualQuantityText != null) {
      const manual = normalizedManual(object(object(amendmentContract).rowOverrides)[id(row)]);
      if (manual.quantity !== exact.manualQuantityText || trace.manualQuantityOverride !== true
        || !same(trace.manualAmendment, manual.provenance)) return fail();
    } else if (trace.manualQuantityOverride === true) return fail();
  } else if (trace.manualPurchaseSupplyAssessmentV1 != null) return fail();
}

/** The only producer of the cross-row index. Existing revisions without the new
 * policy/block fields keep their prior payload shape. */
export function buildCanonicalPurchaseSupplyIndexV1(rows: readonly Row[], rowOverrides: unknown): CanonicalPurchaseSupplyIndexV1 | null {
  if (!rows.some(row => { const trace = traceOf(row); return trace.purchaseSupplyBlocksV1 != null
    || trace.exactPurchaseQuantityV1 != null || hasCanonicalExactPurchaseQuantityPolicyV1(trace.resourceGraph); })) return null;
  const blocked = rows.filter(row => canonicalPurchaseSupplyBlocksV1(traceOf(row).purchaseSupplyBlocksV1).length);
  const owners = mergeCanonicalPurchaseSupplyBlocksV1(blocked.flatMap(row =>
    canonicalPurchaseSupplyBlocksV1(traceOf(row).purchaseSupplyBlocksV1).filter(block => block.ownerRowId === id(row))));
  const index: CanonicalPurchaseSupplyIndexV1 | null = owners.length ? {
    version: "canonical-purchase-supply-index/v1", owners,
    rows: Object.fromEntries(blocked.map(row => [id(row), canonicalPurchaseSupplyBlocksV1(traceOf(row).purchaseSupplyBlocksV1).map(block => block.ownerRowId)])),
  } : null;
  const amendment = { rowOverrides, parameterSources: { ...(index ? { purchaseSupplyIndexV1: index } : {}) } };
  if (new Set(rows.map(id)).size !== rows.length) return fail();
  for (const row of rows) assertCanonicalPurchaseSupplyRowV1(row, amendment);
  return index;
}

export function assertCanonicalPurchaseSupplyRevisionV1(rows: readonly Row[], amendmentContract: unknown): void {
  const index = readIndex(amendmentContract);
  if ((index || rows.some(row => traceOf(row).exactPurchaseQuantityV1 != null))
    && new Set(rows.map(id)).size !== rows.length) return fail();
  for (const row of rows) assertCanonicalPurchaseSupplyRowV1(row, amendmentContract);
  if (index && Object.keys(index.rows).some(rowId => !rows.some(row => id(row) === rowId))) return fail();
}

export function canonicalPurchaseSupplyWarningV1(row: Row): string | null {
  const blocks = canonicalPurchaseSupplyBlocksV1(traceOf(row).purchaseSupplyBlocksV1);
  if (!blocks.length) return null;
  const title = String(row.title_ru ?? row.titleRu ?? "Позиция");
  return blocks.map(block => block.ownerRowId === id(row)
    ? canonicalManualPurchaseSupplyBlockMessageV1(block, title, formatEstimateUnitLabel(block.unitId))
    : `${title}: расчёт зависит от сохранённого ручного количества ${block.rawManualQuantity} ${formatEstimateUnitLabel(block.unitId)}. `
      + "Условия поставки исходной позиции не подтверждены; закупка не готова.").join(" ");
}

export function assertCanonicalPurchaseSupplyReadyV1(rows: readonly Row[]): void {
  const blocked = rows.flatMap(row => {
    const messageRu = canonicalPurchaseSupplyWarningV1(row);
    return messageRu ? [{ rowId: id(row), messageRu, blocks: canonicalPurchaseSupplyBlocksV1(traceOf(row).purchaseSupplyBlocksV1) }] : [];
  });
  if (blocked.length) throw Object.assign(new Error(blocked.map(row => row.messageRu).join(" ")), {
    code: "PROCUREMENT_SUPPLY_QUANTUM_BLOCKED", httpStatus: 409, reasons: blocked,
  });
}
