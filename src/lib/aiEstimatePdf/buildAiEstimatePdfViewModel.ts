import type { GlobalEstimateResult } from "../ai/globalEstimate/globalEstimateTypes";
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

function sourceLine(source: GlobalEstimateResult["sources"][number]): string {
  return [
    source.id,
    source.label,
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
      name: compact(row.name),
      category: compact(section.title || section.type),
      quantity: compact(row.displayQuantity || String(row.quantity)),
      unit: compact(row.unit),
      unitPrice: compact(row.displayUnitPrice),
      total: compact(row.displayTotal),
      confidence: row.confidence,
      sourceLabels: row.sourceEvidence.map((evidence) =>
        [
          evidence.label,
          evidence.checkedAt ? `проверено ${evidence.checkedAt.slice(0, 10)}` : null,
          `freshness ${evidence.freshness}`,
          `confidence ${evidence.confidence}`,
        ].filter(Boolean).join(", "),
      ),
    })),
  );

  const number = documentNumber(estimate);
  const generatedAt = displayDate(input.generatedAt);
  const inputVolume = `${estimate.input.volume} ${estimate.input.unit}`;
  const taxWarning =
    estimate.tax.warning ||
    (estimate.tax.requiresLocationPrecision
      ? "Для точного налога требуется уточнить адрес объекта."
      : "Налоговый статус рассчитан по текущему структурированному результату.");

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
      title: estimate.work.title,
      category: estimate.work.category,
      inputVolume,
      locale: estimate.locale.locale,
      currency: estimate.totals.currency,
    },
    metadata: [
      { label: "Номер документа", value: number },
      { label: "Статус", value: documentStatus(input.documentMode) },
      { label: "Дата формирования", value: generatedAt },
      { label: "Estimate ID", value: estimate.estimateId },
      { label: "Work key", value: estimate.work.workKey },
      { label: "Объем", value: inputVolume },
      { label: "Маршрут", value: input.route },
      { label: "Runtime trace ID", value: input.runtimeTraceId },
    ],
    assumptions: estimate.assumptions.length ? estimate.assumptions : ["Допущения не указаны."],
    rows,
    totals: [
      { label: "Материалы", value: estimate.totals.displayMaterialsTotal },
      { label: "Работы", value: estimate.totals.displayLaborTotal },
      { label: "Доставка / техника", value: `${estimate.totals.deliveryTotal + estimate.totals.equipmentTotal} ${estimate.totals.currency}` },
      { label: "Налог", value: estimate.totals.displayTaxTotal },
      { label: "Итого", value: estimate.totals.displayGrandTotal },
    ],
    tax: {
      label: estimate.tax.taxLabel,
      rate: percent(estimate.tax.taxRate),
      included: estimate.tax.included ? "включен в цену" : "добавлен к итогу",
      amount: estimate.totals.displayTaxTotal,
      warning: taxWarning,
    },
    sources: estimate.sources.length ? estimate.sources.map(sourceLine) : ["Источники не указаны."],
    confidence: estimate.confidence,
    clarifyingQuestions: estimate.clarifyingQuestions.length
      ? estimate.clarifyingQuestions
      : ["Вопросы для уточнения не указаны."],
    footer: [
      "Документ сформирован из GlobalEstimateResult. PDF layer не рассчитывает объемы, цены или налоги.",
      "Подпись заказчика: ____________________    Подпись исполнителя: ____________________",
    ],
  };
}
