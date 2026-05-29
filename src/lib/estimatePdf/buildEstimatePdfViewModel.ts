import type { EstimatePdfInput, EstimatePdfViewModel } from "./estimatePdfTypes";

function percent(rate: number | undefined): string | undefined {
  if (rate === undefined) return undefined;
  return `${Math.round(rate * 10000) / 100}%`;
}

function sourceLine(source: EstimatePdfInput["estimate"]["sources"][number]): string {
  return [
    source.id,
    source.label,
    source.checkedAt ? `checked ${source.checkedAt.slice(0, 10)}` : null,
    source.url,
  ].filter(Boolean).join(" | ");
}

export function buildEstimatePdfViewModel(input: EstimatePdfInput): EstimatePdfViewModel {
  const estimate = input.estimate;
  const runtimeTrace = input.runtimeTrace ?? {};
  return {
    estimateId: estimate.estimateId,
    title: `Смета: ${estimate.work.title}`,
    workKey: estimate.work.workKey,
    workTitle: estimate.work.title,
    generatedAt: input.generatedAt,
    language: input.language,
    originalText: estimate.input.originalText,
    sections: estimate.sections.map((section) => ({
      sectionNumber: section.sectionNumber,
      title: section.title,
      type: section.type,
      rows: section.rows.map((row) => ({
        rowNumber: row.rowNumber,
        sectionTitle: section.title,
        name: row.name,
        quantity: row.displayQuantity,
        unitPrice: row.displayUnitPrice,
        total: row.displayTotal,
        sourceLabels: row.sourceEvidence.map((evidence) =>
          [
            evidence.label,
            evidence.checkedAt ? `checked ${evidence.checkedAt.slice(0, 10)}` : null,
            `freshness ${evidence.freshness}`,
            `confidence ${evidence.confidence}`,
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
