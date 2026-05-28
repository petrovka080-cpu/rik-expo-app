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

function sourceLabelRu(label?: string | null): string {
  if (!label) return "ставки требуют локального подтверждения";
  if (/configured backend regional reference rate/i.test(label)) return "справочник региональных ставок";
  if (/backend|pricebook|reference rate/i.test(label)) return "справочник ставок";
  return formatEstimateUserTextRu(label);
}

function countryLabelRu(result: GlobalEstimateResult): string | null {
  const labels: Record<string, string> = {
    KG: "Кыргызстан",
    KZ: "Казахстан",
    US: "США",
    GB: "Великобритания",
    DE: "Германия",
    FR: "Франция",
  };
  if (result.locale.countryCode === "XX" || result.locale.addressPrecision === "unknown") return null;
  return labels[result.locale.countryCode] ?? result.locale.countryCode;
}

function localContextLine(result: GlobalEstimateResult): string {
  const location = [
    countryLabelRu(result),
    result.locale.stateOrRegion,
    result.locale.city,
  ].filter(Boolean).join(", ") || "регион не указан";
  const rateSource = result.sources.find((source) => !/tax|vat|gst|nds|sales/i.test(`${source.id} ${source.label}`));
  return [
    `Локальный контекст: регион ${location}`,
    `валюта ${result.totals.currency}`,
    `источник ставок: ${sourceLabelRu(rateSource?.label ?? result.sources[0]?.label)}`,
    `уверенность ${confidenceRu(result.confidence)}`,
  ].join("; ") + ".";
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
    localContextLine(result),
    `Точность расчёта: ${confidenceRu(result.confidence)}.`,
    "Перед отправкой заявки проверьте объёмы и контакты.",
  ].filter((line): line is string => typeof line === "string");

  return formatEstimateUserTextRu(lines.join("\n"));
}
