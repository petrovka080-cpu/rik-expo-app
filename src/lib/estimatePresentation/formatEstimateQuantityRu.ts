import { FORMULA_DECIMAL_SCALE, isFormulaGraphExactDecimal } from "../estimate/backendPlatform/formulaGraph";

let numberFormatter: Intl.NumberFormat | undefined;
let smallNumberFormatter: Intl.NumberFormat | undefined;

/** Presentation only. Decimal strings retain all digits, including very small quantities. */
export function formatEstimateQuantityRu(value: number | string): string {
  if (typeof value === "string") {
    if (!isFormulaGraphExactDecimal(value)) throw new Error("ESTIMATE_DISPLAY_QUANTITY_INVALID");
    const [integer, fraction] = value.split(".");
    const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/gu, " ");
    return fraction ? `${grouped},${fraction}` : grouped;
  }
  if (!Number.isFinite(value)) return "Количество нужно уточнить";
  numberFormatter ??= new Intl.NumberFormat("ru-RU", { maximumFractionDigits: FORMULA_DECIMAL_SCALE });
  // Legacy positive values below the canonical scale still must not appear as zero.
  smallNumberFormatter ??= new Intl.NumberFormat("ru-RU", { maximumSignificantDigits: FORMULA_DECIMAL_SCALE });
  const formatter = value !== 0 && Math.abs(value) < 10 ** -FORMULA_DECIMAL_SCALE
    ? smallNumberFormatter : numberFormatter;
  return formatter.format(value).replace(/[\u00a0\u202f]/gu, " ");
}
