import {
  buildEstimatePresentationViewModel as buildAiEstimatePresentationViewModel,
  validateEstimatePresentationViewModel,
  type EstimatePresentationViewModel,
} from "../ai/estimatePresentation";
import type { GlobalEstimateResult } from "../ai/globalEstimate/globalEstimateTypes";
import type {
  StructuredEstimateSelectedWorkBinding,
  StructuredEstimatePayload,
  StructuredEstimatePayloadSource,
  StructuredEstimateRow,
  StructuredEstimateSection,
} from "./structuredEstimateTypes";

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function stableStructuredEstimateHash(value: unknown): string {
  let hash = 2166136261;
  const text = stableStringify(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function rowIdFor(row: EstimatePresentationViewModel["rows"][number]): string {
  return [row.sectionType, row.code || row.rowNumber, row.rowNumber]
    .filter(Boolean)
    .join(":");
}

function buildRows(presentation: EstimatePresentationViewModel): StructuredEstimateSection[] {
  return presentation.sections.map((section): StructuredEstimateSection => ({
    sectionNumber: section.sectionNumber,
    title: section.title,
    type: section.type,
    rows: section.rows.map((row): StructuredEstimateRow => ({
      rowId: rowIdFor(row),
      sectionNumber: row.sectionNumber,
      sectionTitle: row.sectionTitle,
      sectionType: row.sectionType,
      rowNumber: row.rowNumber,
      code: row.code,
      visibleName: row.name,
      quantity: row.quantity,
      unit: row.unit,
      displayQuantity: row.displayQuantity,
      unitPrice: row.unitPrice,
      displayUnitPrice: row.displayUnitPrice,
      total: row.total,
      displayTotal: row.displayTotal,
      currency: row.currency,
      confidence: row.confidence,
      visibleSourceLabel: row.sourceLabel,
      sourceId: row.sourceId,
      rateKey: row.rateKey,
      materialKey: row.materialKey,
      catalogItemId: row.catalogItemId,
    })),
  }));
}

export function buildStructuredEstimatePayload(
  estimate: GlobalEstimateResult,
  input: {
    source?: StructuredEstimatePayloadSource;
    presentation?: EstimatePresentationViewModel;
    selectedWork?: StructuredEstimateSelectedWorkBinding;
  } = {},
): StructuredEstimatePayload {
  if (!estimate || estimate.outputContract?.format !== "professional_boq") {
    throw new Error("STRUCTURED_ESTIMATE_PAYLOAD_REQUIRES_PROFESSIONAL_BOQ_GLOBAL_ESTIMATE_RESULT");
  }
  const presentation = input.presentation ?? buildAiEstimatePresentationViewModel(estimate);
  const validation = validateEstimatePresentationViewModel(presentation);
  if (!validation.passed) {
    throw new Error(`STRUCTURED_ESTIMATE_PRESENTATION_INVALID:${validation.failures.join("|")}`);
  }
  const sections = buildRows(presentation);
  const rows = sections.flatMap((section) => section.rows);
  const materialRows = rows.filter((row) => row.sectionType === "materials");
  const fingerprint = stableStructuredEstimateHash({
    estimateId: estimate.estimateId,
    workKey: estimate.work.workKey,
    selectedWorkKey: input.selectedWork?.selectedWorkKey,
    rows: rows.map((row) => ({
      rowId: row.rowId,
      visibleName: row.visibleName,
      quantity: row.quantity,
      unit: row.unit,
      unitPrice: row.unitPrice,
      total: row.total,
      currency: row.currency,
    })),
    totals: presentation.totals,
  });

  return {
    version: "structured-estimate-v1",
    id: estimate.estimateId,
    source: input.source ?? "ai_estimate",
    inputText: estimate.input.originalText ?? presentation.originalText ?? estimate.work.title,
    estimateId: estimate.estimateId,
    workKey: estimate.work.workKey,
    workTitle: presentation.workTitle,
    workCategory: presentation.workCategory,
    selectedWork: input.selectedWork,
    locale: estimate.locale,
    sourceEstimate: estimate,
    classification: {
      status: "accepted",
      workKey: estimate.work.workKey,
      domainKey: estimate.work.category,
      titleRu: presentation.workTitle,
      confidence: estimate.confidence === "high" ? 1 : estimate.confidence === "medium" ? 0.75 : 0.5,
      evidence: estimate.sources,
    },
    quantity: {
      status: Number.isFinite(estimate.input.volume) && estimate.input.volume > 0 ? "accepted" : "missing",
      quantity: estimate.input.volume,
      unit: estimate.input.unit,
      measurementKind: estimate.input.unit,
      dimensions: estimate.input.dimensions,
      assumptions: estimate.assumptions,
    },
    boq: {
      sections,
      totals: {
        subtotal: estimate.totals.materialsTotal + estimate.totals.laborTotal + estimate.totals.equipmentTotal + estimate.totals.deliveryTotal,
        currency: estimate.totals.currency,
        manualPriceRequired: rows.some((row) => row.unitPrice <= 0),
      },
    },
    presentation,
    pdf: {
      rows: presentation.rows,
      tableFormat: true,
      noMojibakeRequired: true,
    },
    catalogBinding: {
      searchLabels: materialRows.map((row) => ({
        rowId: row.rowId,
        visibleQueryRu: row.visibleName,
        internalKey: row.materialKey,
        internalKeyVisible: false,
      })),
    },
    assumptions: estimate.assumptions,
    clarifications: estimate.clarifyingQuestions,
    risks: estimate.regionalRisks.map((risk) => risk.text || risk.title),
    debug: {
      workKey: estimate.work.workKey,
      materialKeys: materialRows.map((row) => row.materialKey).filter((key): key is string => Boolean(key)),
    },
    sections,
    rows,
    totals: presentation.totals,
    tax: presentation.tax,
    fingerprint,
    visiblePolicy: {
      noInternalKeysVisible: true,
      noGenericRowsVisible: true,
      controlRowsAreNotPaidItems: true,
      uiPdfSameRows: true,
    },
    fakeGreenClaimed: false,
  };
}
