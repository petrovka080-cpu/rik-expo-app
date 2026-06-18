import type {
  ForemanAiEstimateDraftMapping,
  ForemanAiEstimateRowEdit,
  ForemanDraftEstimateRow,
  ForemanRequestDraftLine,
} from "./foremanAiEstimateContracts";
import { shouldIncludeForemanRowInBuyerProcurement } from "./foremanAiEstimateSectionPolicy";
import { buildForemanAiEstimateVisibleContextNote } from "./foremanAiEstimateVisibleNote";

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

const formatQuantity = (value: number): string => {
  const rounded = Math.round(value * 1000) / 1000;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
};

const formatMoney = (value: number, currency: string): string =>
  `${Math.round(value).toLocaleString("ru-RU")} ${currency}`.trim();

const refreshNote = (row: ForemanDraftEstimateRow): string => {
  const contextText = [
    row.context.objectName,
    row.context.levelName,
    row.context.systemName,
    row.context.zoneName,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" / ");
  return JSON.stringify({
    source: row.source,
    estimateId: row.estimateId,
    estimateRevisionId: row.estimateRevisionId,
    rowId: row.rowId,
    sectionType: row.structuredRow.sectionType,
    includedInProcurement: row.includedInProcurement,
    buyerProcurementEligible: row.buyerProcurementEligible,
    unitPrice: row.unitPrice,
    total: row.total,
    currency: row.currency,
    context: contextText || null,
  });
};

const toRequestDraftLine = (row: ForemanDraftEstimateRow): ForemanRequestDraftLine | null => {
  if (!row.includedInEstimate) return null;
  const qty = Number(row.quantity);
  if (!Number.isFinite(qty) || qty <= 0) return null;
  return {
    rik_code: row.rik_code,
    qty,
    errorLabel: row.visibleName,
    meta: {
      note: buildForemanAiEstimateVisibleContextNote(row.context),
      app_code: null,
      kind: row.requestDraftKind,
      name_human: row.visibleName,
      uom: row.unit,
    },
  };
};

export function applyForemanAiEstimateDraftEdits(
  mapping: ForemanAiEstimateDraftMapping,
  edits: readonly ForemanAiEstimateRowEdit[],
): ForemanAiEstimateDraftMapping {
  const editsByRowId = new Map(edits.map((edit) => [edit.rowId, edit]));
  const rows = mapping.rows.map((row) => {
    const edit = editsByRowId.get(row.rowId);
    if (!edit) return row;

    const quantity = Number(edit.quantity ?? row.quantity);
    const unitPrice = Number(edit.unitPrice ?? row.unitPrice);
    const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : row.quantity;
    const safeUnitPrice = Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : row.unitPrice;
    const total = roundMoney(safeQuantity * safeUnitPrice);
    const visibleName = String(edit.visibleName ?? row.visibleName).trim() || row.visibleName;
    const includedInEstimate = edit.includedInEstimate == null ? row.includedInEstimate : edit.includedInEstimate === true;
    const includedInProcurement =
      edit.includedInProcurement == null ? row.includedInProcurement : edit.includedInProcurement === true;
    const priceStatus =
      !includedInProcurement || row.requestDraftKind !== "material"
        ? "not_for_procurement"
        : safeUnitPrice > 0
          ? "priced"
          : "manual_price_required";

    const next: ForemanDraftEstimateRow = {
      ...row,
      visibleName,
      quantity: safeQuantity,
      unitPrice: safeUnitPrice,
      total,
      priceStatus,
      includedInEstimate,
      includedInProcurement,
      structuredRow: {
        ...row.structuredRow,
        visibleName,
        quantity: safeQuantity,
        displayQuantity: `${formatQuantity(safeQuantity)} ${row.unit}`.trim(),
        unitPrice: safeUnitPrice,
        displayUnitPrice: formatMoney(safeUnitPrice, row.currency),
        total,
        displayTotal: formatMoney(total, row.currency),
        includedInEstimate,
        includedInProcurement,
      },
    };
    next.buyerProcurementEligible = shouldIncludeForemanRowInBuyerProcurement(next);
    next.note = refreshNote(next);
    return next;
  });
  const requestDraftLines = rows
    .map(toRequestDraftLine)
    .filter((row): row is ForemanRequestDraftLine => Boolean(row));
  const buyerPreviewRows = rows.filter((row) => shouldIncludeForemanRowInBuyerProcurement(row));

  return {
    ...mapping,
    rows,
    requestDraftLines,
    buyerPreviewRows,
    totals: {
      estimateTotal: rows.reduce((sum, row) => sum + (Number(row.total) || 0), 0),
      buyerProcurementTotal: buyerPreviewRows.reduce((sum, row) => sum + (Number(row.total) || 0), 0),
      currency: mapping.totals.currency,
    },
  };
}
