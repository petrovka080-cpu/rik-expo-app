import { formatEstimateMoney } from "../ai/globalEstimate/formatEstimateMoney";
import { formatEstimateUnitLabel } from "../ai/globalEstimate/formatEstimateUnitLabel";
import type {
  EstimateRowSourceEvidence,
  GlobalEstimateConfidence,
  GlobalEstimateResult,
  GlobalEstimateSourceFreshness,
} from "../ai/globalEstimate/globalEstimateTypes";
import { toVisibleEstimateLabel } from "../estimatePresentation/visibleEstimateLabelPolicy";
import type { AiEstimatePdfInput, AiEstimatePdfViewModel } from "./aiEstimatePdfTypes";

function compact(value: string): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function percent(rate: number | undefined): string {
  if (rate === undefined) return "не указана";
  return `${Math.round(rate * 10000) / 100}%`;
}

function displayDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString();
}

function documentStatus(mode: AiEstimatePdfInput["documentMode"]): string {
  if (mode === "proposal") return "Предложение";
  if (mode === "estimate") return "Смета";
  return "Черновик";
}

function documentNumber(estimate: GlobalEstimateResult): string {
  let hash = 2166136261;
  const source = `${estimate.estimateId}:${estimate.work.title}:${estimate.totals.grandTotal}`;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `AI-EST-${(hash >>> 0).toString().padStart(10, "0")}`;
}

function confidenceLabel(confidence: GlobalEstimateConfidence): string {
  if (confidence === "high") return "высокая";
  if (confidence === "medium") return "средняя";
  return "низкая";
}

function freshnessLabel(freshness: GlobalEstimateSourceFreshness): string {
  if (freshness === "fresh") return "актуальный";
  if (freshness === "aging") return "требует проверки";
  if (freshness === "stale") return "устаревший";
  if (freshness === "expired") return "требует обновления";
  return "неизвестно";
}

function displayQuantity(value: number, unit: string): string {
  const formatted = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 }).format(value);
  return `${formatted} ${formatEstimateUnitLabel(unit)}`;
}

function displayUnitPrice(value: number, unit: string, currency: string): string {
  return `${formatEstimateMoney(value, currency)} / ${formatEstimateUnitLabel(unit)}`;
}

function humanizeText(value: string): string {
  return compact(value)
    .replace(/\bGlobalEstimateResult\b/g, "структурированной сметы")
    .replace(/\bPDF layer\b/gi, "PDF")
    .replace(/\bConfigured backend regional reference rate\b/gi, "Региональный справочник цен")
    .replace(/\bcatalog_items\b/gi, "каталог материалов")
    .replace(/\bbackend-справочником\b/gi, "справочником цен")
    .replace(/\bbackend pricebook\b/gi, "справочник цен")
    .replace(/\bbackend\b/gi, "серверным контуром")
    .replace(/\breference price book\b/gi, "справочник цен")
    .replace(/\bAI estimate backend\b/gi, "сервис сметы");
}

function countryLabel(countryCode: string, language: string): string {
  const ru: Record<string, string> = {
    KG: "Кыргызстан",
    KZ: "Казахстан",
    US: "США",
    GB: "Великобритания",
    DE: "Германия",
    FR: "Франция",
  };
  const en: Record<string, string> = {
    KG: "Kyrgyzstan",
    KZ: "Kazakhstan",
    US: "United States",
    GB: "United Kingdom",
    DE: "Germany",
    FR: "France",
  };
  return (language === "ru" ? ru[countryCode] : en[countryCode]) ?? countryCode;
}

function regionLabel(region: string | undefined, language: string): string | null {
  if (!region) return null;
  if (region === "TX") return language === "ru" ? "Техас / Texas" : "Texas";
  if (region === "CA") return language === "ru" ? "Калифорния / California" : "California";
  if (region === "NY") return language === "ru" ? "Нью-Йорк / New York" : "New York";
  if (region === "Chuy") return language === "ru" ? "Чуйская область" : "Chuy";
  return region;
}

function inferredRegionFromCity(countryCode: string, city: string | undefined, language: string): string | null {
  const normalized = city?.toLowerCase();
  if (countryCode === "US" && (normalized === "austin" || normalized === "dallas")) {
    return language === "ru" ? "Техас / Texas" : "Texas";
  }
  if (countryCode === "US" && normalized === "los angeles") {
    return language === "ru" ? "Калифорния / California" : "California";
  }
  return null;
}

function cityLabel(city: string | undefined, countryCode: string, language: string): string | null {
  if (!city) return null;
  const normalized = city.toLowerCase();
  if (countryCode === "KG" && normalized === "bishkek") return language === "ru" ? "Бишкек" : "Bishkek";
  if (countryCode === "KZ" && normalized === "almaty") return language === "ru" ? "Алматы" : "Almaty";
  if (countryCode === "KZ" && normalized === "astana") return language === "ru" ? "Астана" : "Astana";
  return city;
}

function locationLine(estimate: GlobalEstimateResult): string {
  const locale = estimate.locale;
  const region = regionLabel(locale.stateOrRegion, locale.language) ?? inferredRegionFromCity(locale.countryCode, locale.city, locale.language);
  const parts = [
    countryLabel(locale.countryCode, locale.language),
    region,
    cityLabel(locale.city, locale.countryCode, locale.language),
    locale.postalCode,
  ].filter((item): item is string => Boolean(item));
  const precision = locale.addressPrecision === "unknown"
    ? locale.language === "ru" ? "регион не указан" : "location missing"
    : locale.language === "ru" ? `точность: ${locale.addressPrecision}` : `precision: ${locale.addressPrecision}`;
  return [parts.join(", ") || countryLabel(locale.countryCode, locale.language), precision].filter(Boolean).join("; ");
}

function evidenceLine(evidence: EstimateRowSourceEvidence): string {
  return [
    humanizeText(evidence.label),
    evidence.checkedAt ? `проверено ${evidence.checkedAt.slice(0, 10)}` : null,
    `актуальность: ${freshnessLabel(evidence.freshness)}`,
    `точность: ${confidenceLabel(evidence.confidence)}`,
  ].filter(Boolean).join(", ");
}

function sourceLine(source: GlobalEstimateResult["sources"][number]): string {
  return [
    humanizeText(source.label),
    source.checkedAt ? `проверено ${source.checkedAt.slice(0, 10)}` : null,
  ].filter(Boolean).join(" | ");
}

export function buildAiEstimatePdfViewModel(input: AiEstimatePdfInput): AiEstimatePdfViewModel {
  const estimate = input.estimate;
  if (!estimate || estimate.outputContract?.format !== "professional_boq") {
    throw new Error("AI Estimate PDF requires GlobalEstimateResult with professional_boq output contract.");
  }

  const rows = estimate.sections.flatMap((section) =>
    section.rows.map((row, index) => ({
      index: String(index + 1),
      rowNumber: row.rowNumber,
      code: row.code,
      name: humanizeText(toVisibleEstimateLabel({
        label: row.name,
        materialKey: row.materialKey,
        sectionType: section.type,
      })),
      category: compact(section.title || section.type),
      quantity: displayQuantity(row.quantity, row.unit),
      unit: compact(formatEstimateUnitLabel(row.unit)),
      unitPrice: compact(displayUnitPrice(row.unitPrice, row.unit, estimate.totals.currency)),
      total: compact(row.displayTotal),
      confidence: row.confidence,
      sourceLabels: row.sourceEvidence.map(evidenceLine),
    })),
  );

  const number = documentNumber(estimate);
  const generatedAt = displayDate(input.generatedAt);
  const inputVolume = displayQuantity(estimate.input.volume, estimate.input.unit);
  const taxWarning =
    estimate.tax.warning ||
    (estimate.tax.requiresLocationPrecision
      ? "Для точного налога требуется уточнить адрес объекта."
      : "Налоговый статус рассчитан по текущей структурированной смете.");

  return {
    estimateId: estimate.estimateId,
    documentNumber: number,
    title: "Сметное предложение / Смета работ",
    status: documentStatus(input.documentMode),
    generatedAt,
    route: input.route,
    documentMode: input.documentMode,
    runtimeTraceId: input.runtimeTraceId,
    work: {
      workKey: estimate.work.workKey,
      title: humanizeText(estimate.work.title),
      category: estimate.work.category,
      inputVolume,
      locale: estimate.locale.locale,
      currency: estimate.totals.currency,
    },
    metadata: [
      { label: "Документ №", value: number },
      { label: "Дата", value: generatedAt },
      { label: "Статус", value: documentStatus(input.documentMode) },
      { label: "Объект / вид работ", value: humanizeText(estimate.work.title) },
      { label: "Объём", value: inputVolume },
      { label: "Регион расчёта", value: locationLine(estimate) },
      { label: "Налоговый статус", value: estimate.tax.taxLabel },
      { label: "Точность расчёта", value: confidenceLabel(estimate.confidence) },
    ],
    assumptions: estimate.assumptions.length ? estimate.assumptions.map(humanizeText) : ["Допущения не указаны."],
    rows,
    totals: [
      { label: "Материалы", value: estimate.totals.displayMaterialsTotal },
      { label: "Работы", value: estimate.totals.displayLaborTotal },
      {
        label: "Доставка / техника",
        value: formatEstimateMoney(estimate.totals.deliveryTotal + estimate.totals.equipmentTotal, estimate.totals.currency),
      },
      { label: "Налог", value: estimate.totals.displayTaxTotal },
      { label: "Итого", value: estimate.totals.displayGrandTotal },
    ],
    tax: {
      label: estimate.tax.taxLabel,
      rate: percent(estimate.tax.taxRate),
      included: estimate.tax.included ? "включён в цену" : "добавлен к итогу",
      amount: estimate.totals.displayTaxTotal,
      warning: taxWarning,
    },
    sources: estimate.sources.length ? estimate.sources.map(sourceLine) : ["Источники не указаны."],
    confidence: confidenceLabel(estimate.confidence),
    clarifyingQuestions: estimate.clarifyingQuestions.length
      ? estimate.clarifyingQuestions.map(humanizeText)
      : ["Вопросы для уточнения не указаны."],
    footer: [
      "Документ сформирован по структурированной смете. PDF не рассчитывает объёмы, цены или налоги.",
      "Подпись заказчика: ____________________    Подпись исполнителя: ____________________",
    ],
  };
}
