import type { GlobalEstimateResult } from "../globalEstimate/globalEstimateTypes";
import type { AiEstimatePdfSectionType, AiEstimatePdfSource } from "./estimatePdfTypes";

/**
 * Pure presentation adapter for an estimate already compiled by the canonical
 * backend. Keep this adapter isolated from every estimate compiler so backend
 * revisions cannot pull a client-side calculation engine into a live route.
 */
export function buildAiEstimatePdfSourceFromGlobalEstimate(
  result: GlobalEstimateResult,
  input: { userId?: string; sourceType?: AiEstimatePdfSource["sourceType"]; createdAt?: string } = {},
): AiEstimatePdfSource {
  const sections = result.sections.map((section) => ({
    title: section.title,
    type: section.type as AiEstimatePdfSectionType,
    rows: section.rows.map((row) => ({
      rowNumber: row.rowNumber,
      name: row.name,
      quantity: row.quantity,
      unit: row.unit,
      unitPrice: row.unitPrice,
      total: row.total,
      currency: row.currency,
      sourceId: row.sourceId,
      sourceEvidence: row.sourceEvidence.map((evidence) => ({
        sourceId: evidence.sourceId,
        label: evidence.label,
        checkedAt: evidence.checkedAt,
        freshness: evidence.freshness,
        confidence: evidence.confidence,
        url: evidence.url,
      })),
      confidence: row.confidence,
    })),
  }));

  return {
    sourceType: input.sourceType ?? "global_estimate_result",
    sourceId: result.estimateId,
    userId: input.userId,
    structuredEstimate: result,
    title: `РЎРјРµС‚Р°: ${result.work.title}`,
    language: result.locale.language,
    locale: result.locale.locale,
    currency: result.totals.currency,
    estimate: {
      workTitle: result.work.title,
      description: result.input.originalText,
      sections,
      totals: {
        materialsTotal: result.totals.materialsTotal,
        laborTotal: result.totals.laborTotal,
        taxTotal: result.totals.taxTotal,
        grandTotal: result.totals.grandTotal,
        currency: result.totals.currency,
      },
      tax: {
        label: result.tax.taxLabel,
        included: result.tax.included,
        amount: result.tax.taxAmount,
        warning: result.tax.warning,
      },
      assumptions: result.assumptions,
      costIncreaseFactors: result.costIncreaseFactors,
      clarifyingQuestions: result.clarifyingQuestions,
      sources: result.sources.map((source) => ({
        id: source.id,
        label: source.label,
        checkedAt: source.checkedAt,
        url: source.url,
      })),
    },
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}
