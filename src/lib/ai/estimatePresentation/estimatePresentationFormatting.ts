import type { AiEstimatePdfSource } from "../estimatePdf";
import type { EstimatePresentationRow } from "./estimatePresentationTypes";

export function formatEstimatePresentationMoney(value: number | undefined, currency: string | undefined): string {
  if (value == null || !Number.isFinite(value)) return "цена недоступна";
  return `${Math.round(value).toLocaleString("ru-RU")} ${currency ?? ""}`.trim();
}

export function formatEstimatePresentationQuantity(value: number | string, unit: string): string {
  const quantity = typeof value === "number" ? value.toLocaleString("ru-RU") : value;
  return `${quantity} ${unit}`.trim();
}

export function formatEstimatePresentationConfidence(value: string | undefined): string {
  if (value === "high") return "высокая";
  if (value === "medium") return "средняя";
  if (value === "low") return "низкая";
  return "не указана";
}

export function buildEstimatePresentationRowsFromPdfSource(source: AiEstimatePdfSource): EstimatePresentationRow[] {
  const currency = source.currency ?? source.estimate.totals?.currency;
  return source.estimate.sections.flatMap((section) =>
    section.rows.map((row, index) => ({
      sectionNumber: String(index + 1),
      sectionTitle: section.title,
      sectionType: section.type === "other" ? "labor" : section.type,
      rowNumber: row.rowNumber ?? String(index + 1),
      code: `${section.type}_${row.rowNumber ?? index + 1}`,
      name: row.name,
      quantity: typeof row.quantity === "number" ? row.quantity : Number(row.quantity) || 1,
      unit: row.unit,
      displayQuantity: formatEstimatePresentationQuantity(row.quantity, row.unit),
      unitPrice: row.unitPrice ?? 0,
      displayUnitPrice: formatEstimatePresentationMoney(row.unitPrice, row.currency ?? currency),
      total: row.total ?? 0,
      displayTotal: formatEstimatePresentationMoney(row.total, row.currency ?? currency),
      currency: row.currency ?? currency ?? "KGS",
      priceStatus: row.unitPrice == null ? "unavailable" : "priced",
      sourceId: row.sourceId ?? "ai_estimate_pdf_source",
      sourceEvidence: [],
      sourceLabel: row.sourceEvidence?.[0]?.label ?? row.sourceId,
      confidence: row.confidence ?? "medium",
    })),
  );
}

export function getEstimatePresentationQuantityText(row: EstimatePresentationRow): string {
  return row.displayQuantity ?? formatEstimatePresentationQuantity(row.quantity, row.unit);
}

export function getEstimatePresentationUnitPriceText(row: EstimatePresentationRow, currency: string | undefined): string {
  return row.displayUnitPrice ?? formatEstimatePresentationMoney(row.unitPrice, row.currency ?? currency);
}

export function getEstimatePresentationTotalText(row: EstimatePresentationRow, currency: string | undefined): string {
  return row.displayTotal ?? formatEstimatePresentationMoney(row.total, row.currency ?? currency);
}
