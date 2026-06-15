import type { EditableEstimateRow, EditableEstimateTotals } from "./editableEstimateTypes";

export function roundEditableEstimateMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function rowTotal(row: EditableEstimateRow): number {
  if (row.totalPrice != null && Number.isFinite(row.totalPrice)) return row.totalPrice;
  if (row.quantity != null && row.unitPrice != null) {
    return roundEditableEstimateMoney(row.quantity * row.unitPrice);
  }
  return 0;
}

export function recalculateEditableEstimateTotals(rows: EditableEstimateRow[], currency = "KGS"): EditableEstimateTotals {
  const activeRows = rows.filter((row) => !row.removed);
  return activeRows.reduce<EditableEstimateTotals>(
    (totals, row) => {
      const total = rowTotal(row);
      if (row.unitPrice != null && row.totalPrice != null) totals.pricedRows += 1;
      if (row.unitPrice == null || row.totalPrice == null || row.priceStatus === "PRICE_MISSING") {
        totals.missingPriceRows += 1;
      }
      if (row.priceStatus === "USER_PRICE_OVERRIDE" || row.priceStatus === "USER_ENTERED_PRICE") {
        totals.userPricedRows += 1;
      }

      if (row.rowType === "material") totals.materialsTotal = roundEditableEstimateMoney(totals.materialsTotal + total);
      else if (row.rowType === "work") totals.laborTotal = roundEditableEstimateMoney(totals.laborTotal + total);
      else if (row.rowType === "service") totals.equipmentTotal = roundEditableEstimateMoney(totals.equipmentTotal + total);
      else totals.otherTotal = roundEditableEstimateMoney(totals.otherTotal + total);

      totals.grandTotal = roundEditableEstimateMoney(
        totals.materialsTotal + totals.laborTotal + totals.equipmentTotal + totals.otherTotal,
      );
      return totals;
    },
    {
      pricedRows: 0,
      missingPriceRows: 0,
      userPricedRows: 0,
      materialsTotal: 0,
      laborTotal: 0,
      equipmentTotal: 0,
      otherTotal: 0,
      grandTotal: 0,
      currency,
    },
  );
}

export function recalculateEditableEstimateRow(row: EditableEstimateRow): EditableEstimateRow {
  const totalPrice = row.quantity != null && row.unitPrice != null
    ? roundEditableEstimateMoney(row.quantity * row.unitPrice)
    : null;
  return { ...row, totalPrice };
}
