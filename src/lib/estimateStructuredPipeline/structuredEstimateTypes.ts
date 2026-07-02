import type { EstimatePresentationViewModel } from "../ai/estimatePresentation";
import type {
  EstimateCostConfidence,
  EstimatePriceCandidateSummary,
  EstimatePriceTrace,
} from "../../features/estimates/pricing/priceResolutionEngine";
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
  unitPrice: number | null;
  displayUnitPrice: string;
  total: number | null;
  displayTotal: string;
  currency: string;
  confidence: GlobalEstimateConfidence;
  visibleSourceLabel?: string;
  sourceId: string;
  priceTrace?: EstimatePriceTrace | null;
  priceCandidates?: EstimatePriceCandidateSummary[];
  costConfidence?: EstimateCostConfidence;
  formulaId?: string | null;
  quantityFormula?: string | null;
  calculationTrace?: string | null;
  sourceParameters?: Record<string, unknown> | null;
  templateId?: string | null;
  templateVersion?: string | null;
  rateKey?: string;
  materialKey?: string;
  catalogItemId?: string | null;
  includedInEstimate: boolean;
  includedInProcurement: boolean;
  optional: boolean;
  editable: boolean;
  deletedByUser?: boolean;
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
      pricedSubtotal: number;
      missingPriceRowsCount: number;
      allPricedRowsHaveSource: boolean;
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
