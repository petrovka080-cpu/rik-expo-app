export type ProcurementApprovedRequestItem = {
  id?: string;
  materialLabel: string;
  quantity?: number;
  unit?: string;
  category?: string;
};

export type ProcurementInternalSupplierEvidence = {
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

export type ProcurementExternalCitedPreviewEvidence = {
  supplierName: string;
  matchedItems: string[];
  citationRefs: string[];
  risks?: string[];
  missingData?: string[];
};

export type ProcurementReadySupplierProposalBundle = {
  requestId: string;
  approvalStatus: "approved";
  generatedFrom: "internal_first";
  supplierOptions: {
    supplierId?: string;
    supplierName: string;
    source: "internal" | "external_cited_preview";
    matchedItems: string[];
    priceSignal?: string;
    deliverySignal?: string;
    reliabilitySignal?: string;
    risks: string[];
    evidence: string[];
    missingData: string[];
    recommendedNextAction:
      | "request_quote"
      | "compare"
      | "draft_supplier_request"
      | "submit_supplier_choice_for_approval";
  }[];
  recommendedOptionId?: string;
  directOrderAllowed: false;
  requiresApprovalForOrder: true;
};

export const NO_INTERNAL_SUPPLIERS_MESSAGE =
  "Готовых внутренних поставщиков не найдено. Можно подготовить запрос на рынок / проверить внешние источники с цитированием.";
