import type { EstimatePdfInput, EstimatePdfViewModel } from "./estimatePdfTypes";

function percent(rate: number | undefined): string | undefined {
  if (rate === undefined) return undefined;
  return `${Math.round(rate * 10000) / 100}%`;
}

function sourceLine(source: EstimatePdfInput["estimate"]["sources"][number]): string {
  return [
    humanizePdfText(source.label || source.id),
    source.checkedAt ? `проверено ${source.checkedAt.slice(0, 10)}` : null,
    source.url,
  ].filter(Boolean).join(" | ");
}

function humanizePdfText(value: string): string {
  return String(value ?? "")
    .replace(/\bConfigured backend regional reference rate\b/gi, "региональный справочник цен")
    .replace(/\bConfigured regional construction reference rates?\b/gi, "региональный справочник цен")
    .replace(/\bbackend pricebook\b/gi, "справочник цен")
    .replace(/\breference price book\b/gi, "справочник цен")
    .replace(/\bfreshness fresh\b/gi, "актуально")
    .replace(/\bconfidence high\b/gi, "точность высокая")
    .replace(/\bconfidence medium\b/gi, "точность средняя")
    .replace(/\bconfidence low\b/gi, "точность низкая")
    .replace(/\bwater well\b/gi, "скважина")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanWorkTitle(value: string): string {
  const title = humanizePdfText(value);
  return title
    .replace(/^Профессиональная\s+предварительная\s+смета\s*:\s*/i, "")
    .replace(/^Профессиональная\s+смета\s*:\s*/i, "")
    .trim() || title;
}

function compactOptional(value: unknown): string | null {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || null;
}

function formatDetailsDate(value: string | null | undefined): string | null {
  const text = compactOptional(value);
  if (!text) return null;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  return parsed.toISOString().slice(0, 10);
}

function buildRequestMetaFields(input: EstimatePdfInput, workTitle: string): { label: string; value: string }[] {
  const details = input.requestDetails;
  const address = [details?.city, details?.addressText].map(compactOptional).filter((value): value is string => Boolean(value)).join(", ");
  return [
    { label: "Дата", value: formatDetailsDate(details?.approvedAt ?? details?.createdAt) ?? input.generatedAt },
    { label: "Работа", value: workTitle },
    details?.status ? { label: "Статус", value: details.status } : null,
    details?.repairType ? { label: "Тип", value: details.repairType } : null,
    address ? { label: "Адрес", value: address } : null,
    details?.preferredTimeText ? { label: "Когда удобно", value: details.preferredTimeText } : null,
    details?.contactPhone ? { label: "Контакт", value: details.contactPhone } : null,
    typeof details?.attachmentsCount === "number" ? { label: "Вложения", value: String(details.attachmentsCount) } : null,
  ].filter((field): field is { label: string; value: string } => Boolean(field?.value));
}

export function buildEstimatePdfViewModel(input: EstimatePdfInput): EstimatePdfViewModel {
  const estimate = input.estimate;
  const runtimeTrace = input.runtimeTrace ?? {};
  const workTitle = cleanWorkTitle(estimate.work.title);
  return {
    estimateId: estimate.estimateId,
    title: `Смета: ${workTitle}`,
    workKey: estimate.work.workKey,
    workTitle,
    generatedAt: input.generatedAt,
    language: input.language,
    originalText: estimate.input.originalText,
    requestMetaFields: buildRequestMetaFields(input, workTitle),
    sections: estimate.sections.map((section) => ({
      sectionNumber: section.sectionNumber,
      title: section.title,
      type: section.type,
      rows: section.rows.map((row) => ({
        rowNumber: row.rowNumber,
        sectionTitle: section.title,
        name: humanizePdfText(row.name),
        quantity: row.displayQuantity,
        unitPrice: row.displayUnitPrice,
        total: row.displayTotal,
        sourceLabels: row.sourceEvidence.map((evidence) =>
          [
            humanizePdfText(evidence.label),
            evidence.checkedAt ? `проверено ${evidence.checkedAt.slice(0, 10)}` : null,
            humanizePdfText(`freshness ${evidence.freshness}`),
            humanizePdfText(`confidence ${evidence.confidence}`),
          ].filter(Boolean).join(", "),
        ),
        confidence: row.confidence,
      })),
    })),
    totals: {
      materials: estimate.totals.displayMaterialsTotal,
      labor: estimate.totals.displayLaborTotal,
      tax: estimate.totals.displayTaxTotal,
      grand: estimate.totals.displayGrandTotal,
    },
    tax: {
      label: estimate.tax.taxLabel,
      rate: percent(estimate.tax.taxRate),
      included: estimate.tax.included,
      amount: estimate.totals.displayTaxTotal,
      warning: estimate.tax.warning,
    },
    assumptions: estimate.assumptions,
    costIncreaseFactors: estimate.costIncreaseFactors,
    clarifyingQuestions: estimate.clarifyingQuestions,
    sources: estimate.sources.map(sourceLine),
    runtimeTrace: {
      ...runtimeTrace,
      workKey: runtimeTrace.workKey ?? estimate.work.workKey,
    },
  };
}
