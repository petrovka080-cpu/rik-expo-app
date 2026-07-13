import type { GlobalEstimateResult } from "../globalEstimate";
import {
  buildStructuredEstimatePayload,
  type StructuredEstimatePayload,
  type StructuredEstimateRow,
} from "../../estimateStructuredPipeline";

export type SharedAiEstimateViewModelRow = {
  rowId: string;
  sectionType: StructuredEstimateRow["sectionType"];
  visibleName: string;
  quantity: number;
  unit: string;
  unitPrice: number | null;
  total: number | null;
  currency: string;
  includedInEstimate: boolean;
  includedInProcurement: boolean;
  formulaId?: string | null;
  quantityFormula?: string | null;
  calculationTrace?: string | null;
};

export type SharedAiEstimateViewModelSection = {
  sectionNumber: string;
  title: string;
  type: StructuredEstimateRow["sectionType"];
  rowIds: string[];
};

export type SharedAiEstimateViewModel = {
  source: "shared_ai_estimate_view_model";
  estimateId: string;
  workKey: string;
  workTitle: string;
  originalText: string;
  payload: StructuredEstimatePayload;
  payloadFingerprint: string;
  rows: SharedAiEstimateViewModelRow[];
  sections: SharedAiEstimateViewModelSection[];
  totals: StructuredEstimatePayload["totals"];
  assumptions: string[];
  clarifications: string[];
  selectedWorkInputActive: true;
  usesGlobalEstimatePipeline: true;
  usesProfessionalBoqSnapshot: true;
  supportsEditableRevisions: true;
  supportsPdf: true;
  supportsBuyerHandoff: true;
  fakeGreenClaimed: false;
};

function isStructuredEstimatePayload(
  estimate: GlobalEstimateResult | StructuredEstimatePayload,
): estimate is StructuredEstimatePayload {
  return "version" in estimate && estimate.version === "structured-estimate-v1";
}

function rowViewModel(row: StructuredEstimateRow): SharedAiEstimateViewModelRow {
  return {
    rowId: row.rowId,
    sectionType: row.sectionType,
    visibleName: row.visibleName,
    quantity: row.quantity,
    unit: row.unit,
    unitPrice: row.unitPrice,
    total: row.total,
    currency: row.currency,
    includedInEstimate: row.includedInEstimate,
    includedInProcurement: row.includedInProcurement,
    formulaId: row.formulaId ?? null,
    quantityFormula: row.quantityFormula ?? null,
    calculationTrace: row.calculationTrace ?? null,
  };
}

export function buildSharedAiEstimateViewModel(input: {
  estimate: GlobalEstimateResult | StructuredEstimatePayload;
}): SharedAiEstimateViewModel {
  const payload = isStructuredEstimatePayload(input.estimate)
    ? input.estimate
    : buildStructuredEstimatePayload(input.estimate, { source: "foreman" });

  return {
    source: "shared_ai_estimate_view_model",
    estimateId: payload.estimateId,
    workKey: payload.workKey,
    workTitle: payload.workTitle,
    originalText: payload.inputText,
    payload,
    payloadFingerprint: payload.fingerprint,
    rows: payload.rows.map(rowViewModel),
    sections: payload.sections.map((section) => ({
      sectionNumber: section.sectionNumber,
      title: section.title,
      type: section.type,
      rowIds: section.rows.map((row) => row.rowId),
    })),
    totals: payload.totals,
    assumptions: payload.assumptions,
    clarifications: payload.clarifications,
    selectedWorkInputActive: true,
    usesGlobalEstimatePipeline: true,
    usesProfessionalBoqSnapshot: true,
    supportsEditableRevisions: true,
    supportsPdf: true,
    supportsBuyerHandoff: true,
    fakeGreenClaimed: false,
  };
}
