import type {
  ProfessionalEstimateLine,
  ProfessionalEstimateVisibleLine,
} from "./professionalEstimateTypes";

const MOJIBAKE_PATTERN = /[РС][\u0400-\u04ff]|Ð|Ñ|â€|В/;
const INTERNAL_KEY_PATTERN = /[a-z0-9]+_[a-z0-9_]+/i;

export function buildProfessionalVisibleRows(
  lines: readonly ProfessionalEstimateLine[],
): ProfessionalEstimateVisibleLine[] {
  return lines.map((line) => ({
    row_kind: line.row_kind,
    visible_name_ru: line.visible_name_ru,
    quantity: line.quantity,
    unit: line.unit,
    price_status: line.price.price_status,
    unit_price: line.price.unit_price,
    line_total: line.price.line_total,
    currency: line.price.currency,
  }));
}

export function countInternalKeysVisible(rows: readonly ProfessionalEstimateVisibleLine[]): number {
  return rows.filter((row) => INTERNAL_KEY_PATTERN.test(row.visible_name_ru)).length;
}

export function countMojibakeVisible(rows: readonly ProfessionalEstimateVisibleLine[]): number {
  return rows.filter((row) => MOJIBAKE_PATTERN.test(row.visible_name_ru)).length;
}
