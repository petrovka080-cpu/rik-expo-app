import type { GlobalEstimateResult } from "../ai/globalEstimate";
import {
  buildStructuredEstimatePayload,
  stableStructuredEstimateHash,
  type StructuredEstimatePayload,
  type StructuredEstimateRow,
} from "../estimateStructuredPipeline";
import {
  classifyForemanEstimateSection,
  resolveForemanEstimatePriceStatus,
  shouldIncludeForemanRowInBuyerProcurement,
  toForemanRequestDraftKind,
} from "./foremanAiEstimateSectionPolicy";
import { buildForemanAiEstimateVisibleContextNote } from "./foremanAiEstimateVisibleNote";
import type {
  ForemanAiEstimateDraftMapping,
  ForemanDraftEstimateRow,
  ForemanEstimateContext,
  ForemanEstimateSource,
  ForemanRequestDraftLine,
} from "./foremanAiEstimateContracts";

const FOREMAN_AI_ESTIMATE_SOURCE: ForemanEstimateSource = "foreman_ai_professional_estimate";

const trim = (value: unknown): string => String(value ?? "").trim();

const normalizeCodePart = (value: unknown): string =>
  trim(value)
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);

const rowCodeForDraft = (row: StructuredEstimateRow): string => {
  const candidates = [
    row.catalogItemId,
    row.code,
    row.materialKey,
    row.rateKey,
    row.rowId,
  ];
  const resolved = candidates.map(normalizeCodePart).find(Boolean);
  return resolved ? `AI-${resolved}`.slice(0, 64) : `AI-${stableStructuredEstimateHash(row.rowId).slice(0, 12)}`;
};

const buildForemanAiNote = (params: {
  row: StructuredEstimateRow;
  context: ForemanEstimateContext;
  estimateId: string;
  estimateRevisionId: string;
  buyerProcurementEligible: boolean;
}): string => {
  const contextText = [
    params.context.objectName,
    params.context.levelName,
    params.context.systemName,
    params.context.zoneName,
  ]
    .map(trim)
    .filter(Boolean)
    .join(" / ");
  return JSON.stringify({
    source: FOREMAN_AI_ESTIMATE_SOURCE,
    estimateId: params.estimateId,
    estimateRevisionId: params.estimateRevisionId,
    rowId: params.row.rowId,
    sectionType: params.row.sectionType,
    includedInProcurement: params.row.includedInProcurement,
    buyerProcurementEligible: params.buyerProcurementEligible,
    unitPrice: params.row.unitPrice,
    total: params.row.total,
    currency: params.row.currency,
    context: contextText || null,
  });
};

const toForemanDraftEstimateRow = (params: {
  row: StructuredEstimateRow;
  context: ForemanEstimateContext;
  estimateId: string;
  estimateRevisionId: string;
  payloadFingerprint: string;
}): ForemanDraftEstimateRow => {
  const section = classifyForemanEstimateSection(params.row);
  const requestDraftKind = toForemanRequestDraftKind(section);
  const buyerProcurementEligible = shouldIncludeForemanRowInBuyerProcurement({
    section,
    includedInEstimate: params.row.includedInEstimate,
    includedInProcurement: params.row.includedInProcurement,
    quantity: params.row.quantity,
    deletedByUser: params.row.deletedByUser,
  });
  const note = buildForemanAiNote({
    row: params.row,
    context: params.context,
    estimateId: params.estimateId,
    estimateRevisionId: params.estimateRevisionId,
    buyerProcurementEligible,
  });

  return {
    source: FOREMAN_AI_ESTIMATE_SOURCE,
    approvalStatus: "draft",
    estimateId: params.estimateId,
    estimateRevisionId: params.estimateRevisionId,
    payloadFingerprint: params.payloadFingerprint,
    rowId: params.row.rowId,
    rowNumber: params.row.rowNumber,
    section,
    sectionTitle: params.row.sectionTitle,
    code: params.row.code,
    rik_code: rowCodeForDraft(params.row),
    visibleName: params.row.visibleName,
    quantity: params.row.quantity,
    unit: params.row.unit,
    unitPrice: params.row.unitPrice,
    total: params.row.total,
    currency: params.row.currency,
    confidence: params.row.confidence,
    priceStatus: resolveForemanEstimatePriceStatus(params.row, section),
    includedInEstimate: params.row.includedInEstimate,
    includedInProcurement: params.row.includedInProcurement,
    buyerProcurementEligible,
    requestDraftKind,
    note,
    context: params.context,
    structuredRow: params.row,
  };
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

function normalizePayload(input: GlobalEstimateResult | StructuredEstimatePayload): StructuredEstimatePayload {
  if ("version" in input && input.version === "structured-estimate-v1") return input;
  return buildStructuredEstimatePayload(input as GlobalEstimateResult, { source: "foreman" });
}

export function mapAiEstimateToForemanDraft(input: {
  estimate: GlobalEstimateResult | StructuredEstimatePayload;
  context: ForemanEstimateContext;
  estimateRevisionId?: string | null;
}): ForemanAiEstimateDraftMapping {
  const payload = normalizePayload(input.estimate);
  const payloadFingerprint = payload.fingerprint || stableStructuredEstimateHash(payload.rows);
  const estimateRevisionId =
    trim(input.estimateRevisionId) ||
    `foreman-ai-${payload.estimateId}-${payloadFingerprint}`;
  const rows = payload.rows.map((row) =>
    toForemanDraftEstimateRow({
      row,
      context: input.context,
      estimateId: payload.estimateId,
      estimateRevisionId,
      payloadFingerprint,
    }),
  );
  const requestDraftLines = rows
    .map(toRequestDraftLine)
    .filter((row): row is ForemanRequestDraftLine => Boolean(row));
  const buyerPreviewRows = rows.filter((row) =>
    shouldIncludeForemanRowInBuyerProcurement(row),
  );
  const currency = payload.totals.currency || rows.find((row) => row.currency)?.currency || "";

  return {
    source: FOREMAN_AI_ESTIMATE_SOURCE,
    approvalStatus: "draft",
    context: input.context,
    payload,
    payloadFingerprint,
    estimateRevisionId,
    rows,
    requestDraftLines,
    buyerPreviewRows,
    totals: {
      estimateTotal: rows.reduce((sum, row) => sum + (Number(row.total) || 0), 0),
      buyerProcurementTotal: buyerPreviewRows.reduce((sum, row) => sum + (Number(row.total) || 0), 0),
      currency,
    },
    fakeGreenClaimed: false,
  };
}
