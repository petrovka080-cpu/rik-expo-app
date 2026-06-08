import {
  buildEstimatePresentationViewModel as buildAiEstimatePresentationViewModel,
  validateEstimatePresentationViewModel,
  type EstimatePresentationRow,
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

const CONTROL_PAID_ROW_PATTERNS = [
  /\u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c\s+\u0441\u043c\u0435\u0442\u043d/i,
  /\u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c\s+\u043a\u0430\u0447\u0435\u0441\u0442\u0432\u0430/i,
  /\u0438\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d(?:\u0430\u044f|\u0443\u044e)\s+\u0444\u0438\u043a\u0441\u0430\u0446/i,
] as const;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatMoney(value: number, currency: string): string {
  return `${Math.round(value).toLocaleString("ru-RU")} ${currency}`.trim();
}

function isControlPaidRow(row: EstimatePresentationRow): boolean {
  if (row.sectionType !== "labor" && row.sectionType !== "equipment") return false;
  return CONTROL_PAID_ROW_PATTERNS.some((pattern) => pattern.test(row.name));
}

function sumRows(rows: readonly EstimatePresentationRow[], sectionType: EstimatePresentationRow["sectionType"]): number {
  return roundMoney(rows.filter((row) => row.sectionType === sectionType).reduce((sum, row) => sum + row.total, 0));
}

function closeMoney(left: number, right: number): boolean {
  return Math.abs(left - right) <= 0.01;
}

function taxableBaseForVisibleRows(params: {
  presentation: EstimatePresentationViewModel;
  materialsTotal: number;
  laborTotal: number;
  equipmentTotal: number;
  deliveryTotal: number;
}): number {
  const originalRows = params.presentation.rows;
  const originalTotals = {
    materials: sumRows(originalRows, "materials"),
    labor: sumRows(originalRows, "labor"),
    equipment: sumRows(originalRows, "equipment"),
    delivery: sumRows(originalRows, "delivery"),
  };
  const originalSubtotal = roundMoney(originalTotals.materials + originalTotals.labor + originalTotals.equipment + originalTotals.delivery);
  const visibleSubtotal = roundMoney(params.materialsTotal + params.laborTotal + params.equipmentTotal + params.deliveryTotal);
  const originalTaxableBase = params.presentation.tax.taxableBase;

  if (originalTaxableBase <= 0 || originalSubtotal <= 0) return 0;
  if (closeMoney(originalTaxableBase, originalTotals.materials)) return params.materialsTotal;
  if (closeMoney(originalTaxableBase, originalTotals.labor)) return params.laborTotal;
  if (closeMoney(originalTaxableBase, originalTotals.equipment)) return params.equipmentTotal;
  if (closeMoney(originalTaxableBase, originalTotals.delivery)) return params.deliveryTotal;
  if (closeMoney(originalTaxableBase, originalSubtotal)) return visibleSubtotal;
  return roundMoney(visibleSubtotal * (originalTaxableBase / originalSubtotal));
}

function withoutControlPaidRows(presentation: EstimatePresentationViewModel): EstimatePresentationViewModel {
  const sections = presentation.sections
    .map((section) => ({
      ...section,
      rows: section.rows.filter((row) => !isControlPaidRow(row)),
    }))
    .filter((section) => section.rows.length > 0);
  const rows = sections.flatMap((section) => section.rows);
  if (rows.length === presentation.rows.length) return presentation;

  const materialsTotal = sumRows(rows, "materials");
  const laborTotal = sumRows(rows, "labor");
  const equipmentTotal = sumRows(rows, "equipment");
  const deliveryTotal = sumRows(rows, "delivery");
  const taxableBase = taxableBaseForVisibleRows({ presentation, materialsTotal, laborTotal, equipmentTotal, deliveryTotal });
  const taxTotal = presentation.tax.included || !presentation.tax.taxRate ? 0 : roundMoney(taxableBase * presentation.tax.taxRate);
  const grandTotal = roundMoney(materialsTotal + laborTotal + equipmentTotal + deliveryTotal + taxTotal);
  const currency = presentation.totals.currency;

  return {
    ...presentation,
    sections,
    rows,
    totals: {
      ...presentation.totals,
      materialsTotal,
      laborTotal,
      equipmentTotal,
      deliveryTotal,
      taxTotal,
      grandTotal,
      displayMaterialsTotal: formatMoney(materialsTotal, currency),
      displayLaborTotal: formatMoney(laborTotal, currency),
      displayTaxTotal: formatMoney(taxTotal, currency),
      displayGrandTotal: formatMoney(grandTotal, currency),
    },
    tax: {
      ...presentation.tax,
      taxableBase,
      taxAmount: taxTotal,
    },
  };
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
  const rawPresentation = input.presentation ?? buildAiEstimatePresentationViewModel(estimate);
  const presentation = input.selectedWork ? withoutControlPaidRows(rawPresentation) : rawPresentation;
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
