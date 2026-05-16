export type ProcurementReadyBuyRequestStatus =
  | "incoming"
  | "director_approved"
  | "buyer_review"
  | "needs_more_data";

export type ProcurementReadyBuyOptionAction =
  | "request_quote"
  | "compare"
  | "draft_supplier_request"
  | "submit_supplier_choice_for_approval";

export type ProcurementReadyBuyBundleAction =
  | "compare_options"
  | "draft_supplier_request"
  | "request_market_options"
  | "submit_supplier_choice_for_approval";

export type ProcurementReadyBuyOption = {
  id: string;
  supplierName: string;
  source: "internal" | "external_cited_preview";
  matchedItems: string[];
  coverageLabel: string;
  priceSignal?: string;
  deliverySignal?: string;
  reliabilitySignal?: string;
  risks: string[];
  missingData: string[];
  evidence: string[];
  recommendedAction: ProcurementReadyBuyOptionAction;
};

export type ProcurementReadyBuyOptionBundle = {
  requestId: string;
  requestStatus: ProcurementReadyBuyRequestStatus;
  generatedFrom: "internal_first";
  options: ProcurementReadyBuyOption[];
  missingData: string[];
  risks: string[];
  recommendedNextAction: ProcurementReadyBuyBundleAction;
  directOrderAllowed: false;
  directPaymentAllowed: false;
  directWarehouseMutationAllowed: false;
};

export type ProcurementReadyBuyRequestItem = {
  id?: string | number | null;
  materialLabel: string;
  quantity?: number | null;
  unit?: string | null;
  urgency?: "critical" | "high" | "normal" | "low" | null;
};

export type ProcurementReadyBuyInternalSupplierEvidence = {
  supplierId?: string;
  supplierName: string;
  matchedItems: string[];
  priceSignal?: string;
  deliverySignal?: string;
  reliabilitySignal?: string;
  risks?: string[];
  evidence: string[];
  missingData?: string[];
};

export type ProcurementReadyBuyExternalCitedPreview = {
  supplierName: string;
  matchedItems: string[];
  citationRefs: string[];
  risks?: string[];
  missingData?: string[];
};

export const NO_READY_INTERNAL_BUY_OPTIONS_MESSAGE =
  "Готовых внутренних поставщиков не найдено. Можно подготовить запрос на рынок или собрать недостающие данные.";
