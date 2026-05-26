import type { GlobalEstimateResult } from "../globalEstimate/globalEstimateTypes";
import { assertNoGenericKnownWorkRows } from "./assertNoGenericKnownWorkRows";
import type {
  EstimatePresentationAction,
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
      sourceLabel: row.sourceEvidence[0]?.label,
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
    assumptions: result.assumptions,
    sections,
    rows,
    totals: result.totals,
    tax: result.tax,
    sourceConfidence: result.confidence,
    sourceLabels: result.sources.map((source) => source.label).filter(Boolean),
    costIncreaseFactors: result.costIncreaseFactors,
    clarifyingQuestions: result.clarifyingQuestions,
    actions: ACTIONS,
  };
}
