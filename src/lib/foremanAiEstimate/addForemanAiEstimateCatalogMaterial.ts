import type { GlobalEstimateConfidence } from "../ai/globalEstimate";
import type { StructuredEstimateRow } from "../estimateStructuredPipeline";
import type {
  ForemanAiEstimateDraftMapping,
  ForemanDraftEstimateRow,
  ForemanRequestDraftLine,
} from "./foremanAiEstimateContracts";
import { shouldIncludeForemanRowInBuyerProcurement } from "./foremanAiEstimateSectionPolicy";
import { buildForemanAiEstimateVisibleContextNote } from "./foremanAiEstimateVisibleNote";

export type ForemanAiEstimateCatalogMaterialInput = {
  rik_code: string;
  name_human?: string | null;
  name_human_ru?: string | null;
  display_name?: string | null;
  uom_code?: string | null;
  kind?: string | null;
};

const trim = (value: unknown): string => String(value ?? "").trim();
const roundMoney = (value: number): number => Math.round(value * 100) / 100;

const formatMoney = (value: number, currency: string): string =>
  `${Math.round(value).toLocaleString("ru-RU")} ${currency}`.trim();

const nextCatalogRowId = (mapping: ForemanAiEstimateDraftMapping, rikCode: string): string => {
  const base = `catalog:${rikCode}`;
  if (!mapping.rows.some((row) => row.rowId === base)) return base;
  let index = 2;
  while (mapping.rows.some((row) => row.rowId === `${base}:${index}`)) index += 1;
  return `${base}:${index}`;
};

const refreshNote = (row: ForemanDraftEstimateRow): string => {
  const contextText = [
    row.context.objectName,
    row.context.levelName,
    row.context.systemName,
    row.context.zoneName,
  ]
    .map(trim)
    .filter(Boolean)
    .join(" / ");
  return JSON.stringify({
    source: row.source,
    estimateId: row.estimateId,
    estimateRevisionId: row.estimateRevisionId,
    rowId: row.rowId,
    sectionType: row.structuredRow.sectionType,
    includedInProcurement: row.includedInProcurement,
    buyerProcurementEligible: row.buyerProcurementEligible,
    unitPrice: row.unitPrice,
    total: row.total,
    currency: row.currency,
    context: contextText || null,
  });
};

const toRequestDraftLine = (row: ForemanDraftEstimateRow): ForemanRequestDraftLine | null => {
  if (!row.includedInEstimate) return null;
  const qty = Number(row.quantity);
  if (!Number.isFinite(qty) || qty <= 0) return null;
  return {
    rik_code: row.rik_code,
    qty,
    errorLabel: row.visibleName,
    meta: {
      note: buildForemanAiEstimateVisibleContextNote(row.context),
      app_code: null,
      kind: row.requestDraftKind,
      name_human: row.visibleName,
      uom: row.unit,
    },
  };
};

export function addForemanAiEstimateCatalogMaterial(
  mapping: ForemanAiEstimateDraftMapping,
  item: ForemanAiEstimateCatalogMaterialInput,
  input: {
    quantity?: number | null;
    unitPrice?: number | null;
    confidence?: GlobalEstimateConfidence;
  } = {},
): ForemanAiEstimateDraftMapping {
  const rikCode = trim(item.rik_code);
  if (!rikCode) return mapping;

  const visibleName =
    trim(item.name_human_ru) ||
    trim(item.name_human) ||
    trim(item.display_name) ||
    rikCode;
  const quantity = Number(input.quantity ?? 1);
  const unitPrice = Number(input.unitPrice ?? 0);
  const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
  const safeUnitPrice = Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0;
  const total = roundMoney(safeQuantity * safeUnitPrice);
  const currency = mapping.totals.currency || "KGS";
  const rowId = nextCatalogRowId(mapping, rikCode);
  const rowNumber = String(mapping.rows.length + 1);
  const unit = trim(item.uom_code) || "pcs";

  const structuredRow: StructuredEstimateRow = {
    rowId,
    sectionNumber: "1",
    sectionTitle: "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b",
    sectionType: "materials",
    rowNumber,
    code: rikCode,
    visibleName,
    quantity: safeQuantity,
    unit,
    displayQuantity: `${safeQuantity} ${unit}`.trim(),
    unitPrice: safeUnitPrice,
    displayUnitPrice: formatMoney(safeUnitPrice, currency),
    total,
    displayTotal: formatMoney(total, currency),
    currency,
    confidence: input.confidence ?? "medium",
    visibleSourceLabel: "\u041a\u0430\u0442\u0430\u043b\u043e\u0433",
    sourceId: "foreman_catalog_manual_add",
    catalogItemId: rikCode,
    includedInEstimate: true,
    includedInProcurement: true,
    optional: false,
    editable: true,
  };

  const draftRow: ForemanDraftEstimateRow = {
    source: mapping.source,
    approvalStatus: "draft",
    estimateId: mapping.payload.estimateId,
    estimateRevisionId: mapping.estimateRevisionId,
    payloadFingerprint: mapping.payloadFingerprint,
    rowId,
    rowNumber,
    section: "materials",
    sectionTitle: structuredRow.sectionTitle,
    code: rikCode,
    rik_code: rikCode,
    visibleName,
    quantity: safeQuantity,
    unit,
    unitPrice: safeUnitPrice,
    total,
    currency,
    confidence: structuredRow.confidence,
    priceStatus: safeUnitPrice > 0 ? "priced" : "manual_price_required",
    includedInEstimate: true,
    includedInProcurement: true,
    buyerProcurementEligible: true,
    requestDraftKind: "material",
    note: null,
    context: mapping.context,
    structuredRow,
  };
  draftRow.buyerProcurementEligible = shouldIncludeForemanRowInBuyerProcurement(draftRow);
  draftRow.note = refreshNote(draftRow);

  const rows = [...mapping.rows, draftRow];
  const payloadRows = [...mapping.payload.rows, structuredRow];
  const patchedSections = mapping.payload.sections.map((section) =>
    section.type === "materials"
      ? { ...section, rows: [...section.rows, structuredRow] }
      : section,
  );
  const nextSections = patchedSections.some((section) => section.type === "materials")
    ? patchedSections
    : [
        ...patchedSections,
        {
          sectionNumber: "1",
          title: structuredRow.sectionTitle,
          type: structuredRow.sectionType,
          rows: [structuredRow],
        },
      ];
  const requestDraftLines = rows
    .map(toRequestDraftLine)
    .filter((row): row is ForemanRequestDraftLine => Boolean(row));
  const buyerPreviewRows = rows.filter((row) => shouldIncludeForemanRowInBuyerProcurement(row));

  return {
    ...mapping,
    payload: {
      ...mapping.payload,
      rows: payloadRows,
      sections: nextSections,
      boq: {
        ...mapping.payload.boq,
        sections: nextSections,
        totals: {
          ...mapping.payload.boq.totals,
          subtotal: rows.reduce((sum, row) => sum + (Number(row.total) || 0), 0),
          manualPriceRequired: mapping.payload.boq.totals.manualPriceRequired || safeUnitPrice <= 0,
        },
      },
    },
    rows,
    requestDraftLines,
    buyerPreviewRows,
    totals: {
      estimateTotal: rows.reduce((sum, row) => sum + (Number(row.total) || 0), 0),
      buyerProcurementTotal: buyerPreviewRows.reduce((sum, row) => sum + (Number(row.total) || 0), 0),
      currency,
    },
  };
}
