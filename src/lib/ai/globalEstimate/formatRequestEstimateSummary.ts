import type { GlobalEstimateConfidence, GlobalEstimateResult } from "./globalEstimateTypes";
import { formatEstimateMoney } from "./formatEstimateMoney";
import { formatEstimateUnitLabel } from "./formatEstimateUnitLabel";
import { formatEstimateUserTextRu } from "./formatEstimateUserTextRu";

function confidenceRu(confidence: GlobalEstimateConfidence): string {
  if (confidence === "high") return "высокая";
  if (confidence === "medium") return "средняя";
  return "низкая";
}

function formatNumberRu(value: number, max = 2): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: max }).format(value);
}

function taxStatusRu(result: GlobalEstimateResult): string {
  if (result.locale.countryCode === "KG" && result.tax.taxType === "nds") return "НДС Кыргызстан";
  return formatEstimateUserTextRu(result.tax.taxLabel || "требует уточнения");
}

function dimensionsLine(result: GlobalEstimateResult): string | null {
  const dimensions = result.input.dimensions;
  if (!dimensions?.length || !dimensions.width || !dimensions.height) return null;
  return `Параметры: длина ${formatNumberRu(dimensions.length)} м, ширина ${formatNumberRu(dimensions.width)} м, высота ${formatNumberRu(dimensions.height)} м.`;
}

function volumeLine(result: GlobalEstimateResult): string | null {
  const volume = result.input.dimensions?.concreteVolumeM3;
  if (volume == null) return null;
  return `Ориентировочный объём бетона: ${formatNumberRu(volume)} м³.`;
}

function mainQuantityLine(result: GlobalEstimateResult): string {
  const dimensions = result.input.dimensions;
  if (result.work.workKey === "strip_foundation" && dimensions?.length) {
    return `Ленточный фундамент — ${formatNumberRu(dimensions.length)} пог. м.`;
  }
  return `${result.work.title} — ${formatNumberRu(result.input.volume)} ${formatEstimateUnitLabel(result.input.unit)}.`;
}

export function formatRequestEstimateSummary(result: GlobalEstimateResult): string {
  const lines = [
    "Черновик сметы",
    "",
    "Коротко:",
    mainQuantityLine(result),
    dimensionsLine(result),
    volumeLine(result),
    `Итого: ${formatEstimateMoney(result.totals.grandTotal, result.totals.currency)}.`,
    `Налоговый статус: ${taxStatusRu(result)}.`,
    `Точность расчёта: ${confidenceRu(result.confidence)}.`,
    "Перед отправкой заявки проверьте объёмы и контакты.",
  ].filter((line): line is string => typeof line === "string");

  return formatEstimateUserTextRu(lines.join("\n"));
}
