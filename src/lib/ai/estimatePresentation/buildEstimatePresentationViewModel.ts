import type { GlobalEstimateResult } from "../globalEstimate/globalEstimateTypes";
import { assertNoGenericKnownWorkRows } from "./assertNoGenericKnownWorkRows";
import type {
  EstimatePresentationAction,
  EstimatePresentationLocalContext,
  EstimatePresentationSection,
  EstimatePresentationViewModel,
} from "./estimatePresentationTypes";

const ACTIONS: EstimatePresentationAction[] = [
  { id: "make_estimate_pdf", label: "PDF", visible: true },
  { id: "save_estimate", label: "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c", visible: true },
  { id: "create_request", label: "\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0437\u0430\u044f\u0432\u043a\u0443", visible: true },
  { id: "update_prices", label: "\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u0446\u0435\u043d\u044b", visible: true },
  { id: "clarify_estimate", label: "\u0423\u0442\u043e\u0447\u043d\u0438\u0442\u044c", visible: true },
];

function sourceLabelForUser(label: string | undefined, language: string): string | undefined {
  if (!label) return undefined;
  if (language !== "ru") {
    if (/configured backend regional reference rate/i.test(label)) return "Source: regional reference rate";
    if (/backend|pricebook|reference rate/i.test(label)) return "Source: reference rate";
    return label;
  }
  if (/configured backend regional reference rate/i.test(label)) {
    return "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a: \u0441\u043f\u0440\u0430\u0432\u043e\u0447\u043d\u0438\u043a \u0440\u0435\u0433\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0445 \u0441\u0442\u0430\u0432\u043e\u043a";
  }
  if (/backend|pricebook|reference rate/i.test(label)) {
    return "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a: \u0441\u043f\u0440\u0430\u0432\u043e\u0447\u043d\u0438\u043a \u0441\u0442\u0430\u0432\u043e\u043a";
  }
  return label;
}

function countryLabel(countryCode: string, language: string): string {
  const labels: Record<string, { ru: string; en: string }> = {
    KG: { ru: "\u041a\u044b\u0440\u0433\u044b\u0437\u0441\u0442\u0430\u043d", en: "Kyrgyzstan" },
    KZ: { ru: "\u041a\u0430\u0437\u0430\u0445\u0441\u0442\u0430\u043d", en: "Kazakhstan" },
    US: { ru: "\u0421\u0428\u0410", en: "United States" },
    GB: { ru: "\u0412\u0435\u043b\u0438\u043a\u043e\u0431\u0440\u0438\u0442\u0430\u043d\u0438\u044f", en: "United Kingdom" },
    DE: { ru: "\u0413\u0435\u0440\u043c\u0430\u043d\u0438\u044f", en: "Germany" },
    FR: { ru: "\u0424\u0440\u0430\u043d\u0446\u0438\u044f", en: "France" },
    CA: { ru: "\u041a\u0430\u043d\u0430\u0434\u0430", en: "Canada" },
    AE: { ru: "\u041e\u0410\u042d", en: "UAE" },
    IN: { ru: "\u0418\u043d\u0434\u0438\u044f", en: "India" },
    SG: { ru: "\u0421\u0438\u043d\u0433\u0430\u043f\u0443\u0440", en: "Singapore" },
    XX: { ru: "\u0440\u0435\u0433\u0438\u043e\u043d \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d", en: "location not specified" },
  };
  const fallback = countryCode || (language === "ru" ? "\u0440\u0435\u0433\u0438\u043e\u043d \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d" : "location not specified");
  return labels[countryCode]?.[language === "ru" ? "ru" : "en"] ?? fallback;
}

function placeLabel(value: string | undefined, language: string): string | undefined {
  if (!value) return undefined;
  const labels: Record<string, { ru: string; en: string }> = {
    Almaty: { ru: "\u0410\u043b\u043c\u0430\u0442\u044b", en: "Almaty" },
    Astana: { ru: "\u0410\u0441\u0442\u0430\u043d\u0430", en: "Astana" },
    Bishkek: { ru: "\u0411\u0438\u0448\u043a\u0435\u043a", en: "Bishkek" },
    Chui: { ru: "\u0427\u0443\u0439\u0441\u043a\u0430\u044f \u043e\u0431\u043b\u0430\u0441\u0442\u044c", en: "Chui region" },
    TX: { ru: "Texas", en: "Texas" },
  };
  return labels[value]?.[language === "ru" ? "ru" : "en"] ?? value;
}

function taxLabelForUser(taxMode: string, language: string): string {
  if (taxMode === "nds") return "\u041d\u0414\u0421";
  if (taxMode === "vat") return "VAT";
  if (taxMode === "gst") return "GST";
  if (taxMode === "sales_tax") return "sales tax";
  if (taxMode === "no_tax") return language === "ru" ? "\u0431\u0435\u0437 \u043d\u0430\u043b\u043e\u0433\u0430" : "no tax";
  return language === "ru" ? "\u043d\u0430\u043b\u043e\u0433 \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u0443\u0442\u043e\u0447\u043d\u0435\u043d\u0438\u044f" : "tax requires clarification";
}

function buildEstimatePresentationLocalContext(result: GlobalEstimateResult): EstimatePresentationLocalContext {
  const language = result.locale.language;
  const locationParts = [
    countryLabel(result.locale.countryCode, language),
    placeLabel(result.locale.stateOrRegion, language),
    placeLabel(result.locale.city, language),
  ].filter(Boolean);
  const locationLabel = locationParts.join(", ");
  const taxLabel = taxLabelForUser(result.locale.taxMode, language);
  const displayLine = language === "ru"
    ? `\u041b\u043e\u043a\u0430\u043b\u044c\u043d\u044b\u0439 \u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442: ${locationLabel}; \u0432\u0430\u043b\u044e\u0442\u0430 ${result.locale.currency}; \u043d\u0430\u043b\u043e\u0433 ${taxLabel}.`
    : `Local context: ${locationLabel}; currency ${result.locale.currency}; tax ${taxLabel}.`;
  return {
    countryCode: result.locale.countryCode,
    locationLabel,
    currency: result.locale.currency,
    taxLabel,
    confidence: result.locale.confidence,
    displayLine,
  };
}

export function buildEstimatePresentationViewModel(
  result: GlobalEstimateResult,
): EstimatePresentationViewModel {
  const sections: EstimatePresentationSection[] = result.sections.map((section) => ({
    sectionNumber: section.sectionNumber,
    title: section.title,
    type: section.type,
    rows: section.rows.map((row) => ({
      sectionNumber: section.sectionNumber,
      sectionTitle: section.title,
      sectionType: section.type,
      rowNumber: row.rowNumber,
      code: row.code,
      rateKey: row.rateKey,
      materialKey: row.materialKey,
      catalogItemId: null,
      name: row.name,
      quantity: row.quantity,
      unit: row.unit,
      displayQuantity: row.displayQuantity,
      unitPrice: row.unitPrice,
      displayUnitPrice: row.displayUnitPrice,
      total: row.total,
      displayTotal: row.displayTotal,
      currency: row.currency,
      priceStatus: row.priceStatus,
      sourceId: row.sourceId,
      sourceEvidence: row.sourceEvidence,
      sourceLabel: sourceLabelForUser(row.sourceEvidence[0]?.label, result.locale.language),
      confidence: row.confidence,
    })),
  }));
  const rows = sections.flatMap((section) => section.rows);
  assertNoGenericKnownWorkRows({
    workKey: result.work.workKey,
    rows,
  });

  return {
    estimateId: result.estimateId,
    workKey: result.work.workKey,
    workTitle: result.work.title,
    workCategory: result.work.category,
    originalText: result.input.originalText,
    localContext: buildEstimatePresentationLocalContext(result),
    assumptions: result.assumptions,
    sections,
    rows,
    totals: result.totals,
    tax: result.tax,
    sourceConfidence: result.confidence,
    sourceLabels: result.sources
      .map((source) => sourceLabelForUser(source.label, result.locale.language))
      .filter((label): label is string => Boolean(label)),
    costIncreaseFactors: result.costIncreaseFactors,
    clarifyingQuestions: result.clarifyingQuestions,
    actions: ACTIONS,
  };
}
