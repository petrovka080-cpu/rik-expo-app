import type { AiEstimatePdfTableRowViewModel } from "./aiEstimatePdfTypes";

export type AiEstimatePdfTableColumn = {
  key: "index" | "name" | "category" | "quantity" | "unit" | "unitPrice" | "total";
  title: string;
  width: number;
  align: "left" | "right" | "center";
};

export const AI_ESTIMATE_PDF_TABLE_COLUMNS: AiEstimatePdfTableColumn[] = [
  { key: "index", title: "#", width: 24, align: "center" },
  { key: "name", title: "Наименование", width: 202, align: "left" },
  { key: "category", title: "Категория", width: 72, align: "left" },
  { key: "quantity", title: "Кол-во", width: 50, align: "right" },
  { key: "unit", title: "Ед.", width: 34, align: "center" },
  { key: "unitPrice", title: "Цена", width: 70, align: "right" },
  { key: "total", title: "Сумма", width: 70, align: "right" },
];

const APPROX_CHAR_WIDTH = 4.4;

export function aiEstimatePdfCellValue(row: AiEstimatePdfTableRowViewModel, column: AiEstimatePdfTableColumn): string {
  if (column.key === "index") return row.index;
  if (column.key === "name") return row.name;
  if (column.key === "category") return row.category;
  if (column.key === "quantity") return row.quantity;
  if (column.key === "unit") return row.unit;
  if (column.key === "unitPrice") return row.unitPrice;
  return row.total;
}

export function fitAiEstimatePdfCellText(value: string, width: number): string {
  const clean = String(value ?? "").replace(/\s+/g, " ").trim();
  const max = Math.max(4, Math.floor((width - 8) / APPROX_CHAR_WIDTH));
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(1, max - 3)).trimEnd()}...`;
}

export function aiEstimatePdfTableWidth(): number {
  return AI_ESTIMATE_PDF_TABLE_COLUMNS.reduce((sum, column) => sum + column.width, 0);
}
