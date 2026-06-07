import type { EstimatePresentationViewModel } from "../ai/estimatePresentation";
import type {
  GlobalEstimateConfidence,
  GlobalEstimateResult,
  GlobalEstimateSectionType,
} from "../ai/globalEstimate/globalEstimateTypes";

export type StructuredEstimatePayloadVersion = "structured-estimate-v1";

export type StructuredEstimatePayloadSource =
  | "ai_estimate"
  | "marketplace_estimate"
  | "request"
  | "history"
  | "foreman";

export type StructuredEstimateSelectedWorkBinding = {
  selectedWorkKey: string;
  selectedTitleRu: string;
  selectedCategoryKey: string;
  selectedCategoryTitleRu: string;
  rawInput: string;
  source: "user_selected";
  resolverReGuessed: false;
};

export type StructuredEstimateVisiblePolicy = {
  noInternalKeysVisible: true;
  noGenericRowsVisible: true;
  controlRowsAreNotPaidItems: true;
  uiPdfSameRows: true;
};

export type StructuredEstimateRow = {
  rowId: string;
  sectionNumber: string;
  sectionTitle: string;
  sectionType: GlobalEstimateSectionType;
  rowNumber: string;
  code: string;
  visibleName: string;
  quantity: number;
  unit: string;
  displayQuantity: string;
  unitPrice: number;
  displayUnitPrice: string;
  total: number;
  displayTotal: string;
  currency: string;
  confidence: GlobalEstimateConfidence;
  visibleSourceLabel?: string;
  sourceId: string;
  rateKey?: string;
  materialKey?: string;
  catalogItemId?: string | null;
};

export type StructuredEstimateSection = {
  sectionNumber: string;
  title: string;
  type: GlobalEstimateSectionType;
  rows: StructuredEstimateRow[];
};

export type StructuredEstimatePayload = {
  version: StructuredEstimatePayloadVersion;
  id: string;
  source: StructuredEstimatePayloadSource;
  inputText: string;
  estimateId: string;
  workKey: string;
  workTitle: string;
  workCategory: string;
  selectedWork?: StructuredEstimateSelectedWorkBinding;
  locale: GlobalEstimateResult["locale"];
  sourceEstimate: GlobalEstimateResult;
  classification: {
    status: "accepted" | "ambiguous" | "unknown";
    workKey: string;
    domainKey: string;
    titleRu: string;
    confidence: number;
    evidence: unknown[];
  };
  quantity: {
    status: "accepted" | "missing" | "ambiguous" | "conflict";
    quantity: number;
    unit: string;
    measurementKind: string;
    dimensions?: unknown;
    assumptions: string[];
  };
  boq: {
    sections: StructuredEstimateSection[];
    totals: {
      subtotal: number;
      currency: string;
      manualPriceRequired: boolean;
    };
  };
  presentation: EstimatePresentationViewModel;
  pdf: {
    rows: EstimatePresentationViewModel["rows"];
    tableFormat: true;
    noMojibakeRequired: true;
  };
  catalogBinding: {
    searchLabels: {
      rowId: string;
      visibleQueryRu: string;
      internalKey?: string;
      internalKeyVisible: false;
    }[];
  };
  assumptions: string[];
  clarifications: string[];
  risks: string[];
  debug?: {
    workKey?: string;
    materialKeys?: string[];
  };
  sections: StructuredEstimateSection[];
  rows: StructuredEstimateRow[];
  totals: EstimatePresentationViewModel["totals"];
  tax: EstimatePresentationViewModel["tax"];
  fingerprint: string;
  visiblePolicy: StructuredEstimateVisiblePolicy;
  fakeGreenClaimed: false;
};

export type StructuredEstimateBindingMatrix = {
  payloadFingerprint: string;
  rowCount: number;
  uiRowsFingerprint: string;
  pdfRowsFingerprint: string;
  catalogRowsFingerprint: string;
  uiPdfRowsMatch: boolean;
  internalKeysVisible: boolean;
  genericRowsVisible: boolean;
  controlRowsAsPaidItems: number;
  fakeGreenClaimed: false;
};
