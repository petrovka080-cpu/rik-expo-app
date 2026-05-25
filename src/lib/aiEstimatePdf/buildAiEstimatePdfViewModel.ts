import { formatEstimateMoney } from "../ai/globalEstimate/formatEstimateMoney";
import { formatEstimateUnitLabel } from "../ai/globalEstimate/formatEstimateUnitLabel";
import type {
  EstimateRowSourceEvidence,
  GlobalEstimateConfidence,
  GlobalEstimateResult,
  GlobalEstimateSourceFreshness,
} from "../ai/globalEstimate/globalEstimateTypes";
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
  const suffix = estimate.estimateId.replace(/[^a-zA-Z0-9_-]+/g, "").slice(-12) || "ESTIMATE";
  return `AI-EST-${suffix}`;
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

function humanizeText(value: string): string {
  return compact(value)
    .replace(/\bGlobalEstimateResult\b/g, "структурированной сметы")
    .replace(/\bPDF layer\b/gi, "PDF")
    .replace(/\bConfigured backend regional reference rate\b/gi, "Региональный справочник цен")
    .replace(/\bbackend pricebook\b/gi, "справочник цен")
    .replace(/\breference price book\b/gi, "справочник цен")
    .replace(/\bAI estimate backend\b/gi, "сервис сметы");
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
    source.url,
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
      name: humanizeText(row.name),
      category: compact(section.title || section.type),
      quantity: displayQuantity(row.quantity, row.unit),
      unit: compact(formatEstimateUnitLabel(row.unit)),
      unitPrice: compact(row.displayUnitPrice),
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
      { label: "Налоговый статус", value: estimate.tax.taxLabel },
      { label: "Точность расчёта", value: confidenceLabel(estimate.confidence) },
      { label: "Служебный ID", value: input.runtimeTraceId },
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
