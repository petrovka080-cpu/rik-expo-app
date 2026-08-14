import { stableStructuredEstimateHash } from "../../estimateStructuredPipeline/buildStructuredEstimatePayload";
import type {
  StructuredEstimatePayload,
  StructuredEstimateRow,
  StructuredEstimateSection,
} from "../../estimateStructuredPipeline/structuredEstimateTypes";
import type { GlobalEstimateSectionType, GlobalEstimateResult } from "../../ai/globalEstimate/globalEstimateTypes";
import type { EstimatePresentationViewModel } from "../../ai/estimatePresentation";
import type {
  CanonicalEstimateCatalogItem,
  CanonicalEstimateRevisionRowView,
  CanonicalEstimateRevisionView,
} from "./contracts";

function sectionType(category: string): GlobalEstimateSectionType {
  const value = category.toLowerCase();
  if (value.includes("material") || value.includes("waste")) return "materials";
  if (value.includes("equipment") || value.includes("machinery")) return "equipment";
  if (value.includes("delivery") || value.includes("transport")) return "delivery";
  return "labor";
}

function finiteNumber(value: string | null): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sectionTitle(type: GlobalEstimateSectionType): string {
  if (type === "materials") return "Материалы";
  if (type === "equipment") return "Оборудование";
  if (type === "delivery") return "Доставка";
  if (type === "tax") return "Налоги";
  return "Работы и услуги";
}

export function adaptCanonicalRevisionToStructuredEstimate(input: {
  catalog: CanonicalEstimateCatalogItem;
  revision: CanonicalEstimateRevisionView;
  rows: CanonicalEstimateRevisionRowView[];
  inputText?: string;
}): StructuredEstimatePayload {
  const sectionOrder: GlobalEstimateSectionType[] = ["materials", "labor", "equipment", "delivery"];
  const currency = input.revision.currencyCode;
  const rows: StructuredEstimateRow[] = input.rows.map((row, index) => {
    const type = sectionType(row.category);
    const quantity = finiteNumber(row.quantity) ?? 0;
    const unitPrice = finiteNumber(row.unitPrice);
    const total = finiteNumber(row.amount);
    return {
      rowId: row.rowId,
      sectionNumber: String(sectionOrder.indexOf(type) + 1),
      sectionTitle: sectionTitle(type),
      sectionType: type,
      rowNumber: String(index + 1),
      code: row.rowId,
      visibleName: row.titleRu,
      quantity,
      unit: row.unitId,
      displayQuantity: row.quantity == null ? "—" : String(row.quantity),
      unitPrice,
      displayUnitPrice: unitPrice == null ? "PRICE_MISSING" : String(row.unitPrice),
      total,
      displayTotal: total == null ? "PRICE_MISSING" : String(row.amount),
      currency,
      confidence: "high",
      visibleSourceLabel: "Canonical Estimate Backend",
      sourceId: `backend-revision:${input.revision.revisionId}`,
      formulaId: String(row.calculationTrace?.formulaId ?? "") || null,
      quantityFormula: null,
      calculationTrace: JSON.stringify(row.calculationTrace),
      sourceParameters: {
        normativeTrace: row.normativeTrace,
        rowSha256: row.rowSha256,
        canonicalBackendRevisionId: input.revision.revisionId,
        canonicalBackendReleaseId: input.revision.releaseId,
        canonicalBackendCatalogId: input.revision.catalogId,
        canonicalBackendOwnershipStatus: row.ownershipStatus,
        includedInEstimate: row.includedInEstimate,
        includedInProcurement: row.includedInProcurement,
      },
      catalogItemId: null,
      includedInEstimate: row.includedInEstimate,
      includedInProcurement: row.includedInProcurement,
      optional: !row.includedInEstimate,
      editable: row.ownershipStatus !== "MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL",
    };
  });
  const sections: StructuredEstimateSection[] = sectionOrder.map((type) => ({
    sectionNumber: String(sectionOrder.indexOf(type) + 1),
    title: sectionTitle(type),
    type,
    rows: rows.filter((row) => row.sectionType === type),
  })).filter((section) => section.rows.length > 0);
  const grandTotal = finiteNumber(String(input.revision.totals.amount ?? "0")) ?? rows.reduce((sum, row) => sum + (row.total ?? 0), 0);
  const totals = {
    materialsTotal: rows.filter((row) => row.sectionType === "materials" && row.includedInEstimate).reduce((sum, row) => sum + (row.total ?? 0), 0),
    laborTotal: rows.filter((row) => row.sectionType === "labor" && row.includedInEstimate).reduce((sum, row) => sum + (row.total ?? 0), 0),
    equipmentTotal: rows.filter((row) => row.sectionType === "equipment" && row.includedInEstimate).reduce((sum, row) => sum + (row.total ?? 0), 0),
    deliveryTotal: rows.filter((row) => row.sectionType === "delivery" && row.includedInEstimate).reduce((sum, row) => sum + (row.total ?? 0), 0),
    taxTotal: 0,
    grandTotal,
    currency,
    displayMaterialsTotal: "",
    displayLaborTotal: "",
    displayTaxTotal: "0",
    displayGrandTotal: String(grandTotal),
  };
  const tax = {
    taxType: "unknown" as const,
    taxLabel: "Налог определяется проектом",
    taxableBase: grandTotal,
    taxAmount: 0,
    included: false,
    requiresLocationPrecision: false,
  };
  const presentationRows = rows.map((row) => ({
    ...row,
    name: row.visibleName,
    unitPrice: row.unitPrice ?? 0,
    total: row.total ?? 0,
    priceStatus: row.unitPrice == null ? "missing" as const : "resolved" as const,
    sourceEvidence: [],
  }));
  const presentation = {
    estimateId: input.revision.revisionId,
    workKey: input.catalog.workKey,
    workTitle: input.catalog.titleRu,
    workCategory: input.catalog.domain,
    originalText: input.inputText,
    localContext: {
      countryCode: "KG",
      locationLabel: "Кыргызстан",
      currency,
      taxLabel: tax.taxLabel,
      confidence: "high" as const,
      displayLine: `KG · ${currency}`,
    },
    assumptions: [],
    sections: sections.map((section) => ({ ...section, rows: presentationRows.filter((row) => row.sectionType === section.type) })),
    rows: presentationRows,
    totals,
    tax,
    sourceConfidence: "high" as const,
    sourceLabels: ["Canonical Estimate Backend"],
    costIncreaseFactors: [],
    clarifyingQuestions: [],
    actions: [],
  } as unknown as EstimatePresentationViewModel;
  const sourceEstimate = {
    estimateId: input.revision.revisionId,
    locale: {
      countryCode: "KG", city: "Bishkek", addressPrecision: "city", language: "ru",
      locale: "ru-KG", unitSystem: "metric", currency, taxMode: "unknown",
      taxIncludedByDefault: false, source: "project_address", confidence: "high",
    },
    work: { workKey: input.catalog.workKey, title: input.catalog.titleRu, category: input.catalog.domain },
    input: { volume: rows[0]?.quantity ?? 0, unit: rows[0]?.unit ?? "item", originalText: input.inputText },
    assumptions: [], sections: [], tax, totals, regionalRisks: [], costIncreaseFactors: [],
    clarifyingQuestions: [], sources: [], confidence: "high", requiresReview: false,
  } as unknown as GlobalEstimateResult;
  const fingerprint = input.revision.checksumSha256 || stableStructuredEstimateHash(rows);
  return {
    version: "structured-estimate-v1",
    id: input.revision.revisionId,
    source: "foreman",
    inputText: input.inputText ?? input.catalog.titleRu,
    estimateId: input.revision.revisionId,
    workKey: input.catalog.workKey,
    workTitle: input.catalog.titleRu,
    workCategory: input.catalog.domain,
    locale: sourceEstimate.locale,
    sourceEstimate,
    classification: { status: "accepted", workKey: input.catalog.workKey, domainKey: input.catalog.domain, titleRu: input.catalog.titleRu, confidence: 1, evidence: [] },
    quantity: { status: "accepted", quantity: rows[0]?.quantity ?? 0, unit: rows[0]?.unit ?? "item", measurementKind: "backend_formula_graph", assumptions: [] },
    boq: {
      sections,
      totals: {
        subtotal: grandTotal,
        pricedSubtotal: grandTotal,
        missingPriceRowsCount: rows.filter((row) => row.unitPrice == null).length,
        allPricedRowsHaveSource: true,
        currency,
        manualPriceRequired: rows.some((row) => row.unitPrice == null),
      },
    },
    presentation,
    pdf: { rows: presentation.rows, tableFormat: true, noMojibakeRequired: true },
    catalogBinding: { searchLabels: rows.map((row) => ({ rowId: row.rowId, visibleQueryRu: row.visibleName, internalKeyVisible: false as const })) },
    assumptions: [], clarifications: [], risks: [], sections, rows, totals, tax, fingerprint,
    visiblePolicy: { noInternalKeysVisible: true, noGenericRowsVisible: true, controlRowsAreNotPaidItems: true, uiPdfSameRows: true },
    fakeGreenClaimed: false,
  };
}
