import type {
  FinSupplierInput,
  FinSupplierInvoice,
  FinSupplierViewModel,
} from "./director.finance.types";
import {
  DASH,
  asFinanceRecord,
  financeText,
  optionalNumber,
} from "./director.finance.shared";

const pickSupplierText = (value: unknown): string => {
  const row = asFinanceRecord(value);
  if (typeof row.supplier === "string") return row.supplier.trim();
  if (row.supplier && typeof row.supplier === "object") {
    return financeText(asFinanceRecord(row.supplier).supplier);
  }
  return financeText(row.name);
};

export const normalizeFinSupplierInput = (
  value: FinSupplierInput | string,
): FinSupplierViewModel => {
  if (typeof value === "string") {
    return { supplier: value.trim() || DASH, _kindName: "" };
  }

  const row = asFinanceRecord(value);
  return {
    supplier: pickSupplierText(value) || DASH,
    name: financeText(row.name) || null,
    _kindName: financeText(row._kindName) || null,
    kindName: financeText(row.kindName) || null,
    amount: optionalNumber(row.amount),
    count: optionalNumber(row.count),
    overdueCount: optionalNumber(row.overdueCount),
    criticalCount: optionalNumber(row.criticalCount),
    invoices: Array.isArray(row.invoices) ? (row.invoices as FinSupplierInvoice[]) : undefined,
  };
};
