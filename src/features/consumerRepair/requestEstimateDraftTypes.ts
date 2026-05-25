export type RequestEstimateDraftStatus =
  | "idle"
  | "generating_estimate"
  | "draft_ready"
  | "editing"
  | "catalog_selecting"
  | "pdf_generating"
  | "saving"
  | "sending"
  | "sent"
  | "blocked_validation"
  | "failed";

export type RequestEstimateDraftEventType =
  | "GENERATE_ESTIMATE"
  | "ESTIMATE_READY"
  | "EDIT_QUANTITY"
  | "SELECT_CATALOG_ITEM"
  | "ADD_MANUAL_CATALOG_ITEM"
  | "ADD_CUSTOM_ITEM"
  | "REMOVE_ITEM"
  | "RESTORE_ITEM"
  | "MAKE_PDF"
  | "SAVE_DRAFT"
  | "SEND_REQUEST"
  | "VALIDATION_FAILED"
  | "RESET";

export type RequestEstimateDraftItemSource = "estimate" | "catalog_item" | "custom";
export type RequestEstimateDraftItemConfidence = "high" | "medium" | "low";

export type RequestEstimateDraftItem = {
  rowId: string;
  source: RequestEstimateDraftItemSource;
  name: string;
  quantity: number;
  unit: string;
  unitLabel: string;
  materialKey?: string;
  rateKey?: string;
  catalogItemId?: string;
  unitPrice?: number | null;
  total?: number | null;
  sourceId?: string;
  confidence: RequestEstimateDraftItemConfidence;
  bindingStatus?: string;
};

export type RequestEstimateDraftTotals = {
  materialsTotal: number;
  laborTotal: number;
  equipmentTotal: number;
  deliveryTotal: number;
  taxTotal: number;
  grandTotal: number;
};

export type RequestEstimateDraftValidation = {
  canSave: boolean;
  canSend: boolean;
  blockers: string[];
  warnings: string[];
};

export type RequestEstimateDraft = {
  draftId: string;
  estimateId: string;
  workKey: string;
  title: string;
  description: string;
  language: string;
  currency: string;
  items: RequestEstimateDraftItem[];
  totals: RequestEstimateDraftTotals;
  validation: RequestEstimateDraftValidation;
};

export type RequestEstimatePayloadKind =
  | "visible_ui"
  | "pdf_payload"
  | "save_draft_payload"
  | "send_request_payload"
  | "runtime_trace"
  | "proof_artifact";

export type RequestEstimateDraftPayload = {
  payloadKind: RequestEstimatePayloadKind;
  draft: RequestEstimateDraft;
  rowCount: number;
  catalogItemIds: string[];
  editedQuantityRows: { rowId: string; quantity: number }[];
  runtimeTrace: {
    draftId: string;
    estimateId: string;
    workKey: string;
    payloadKind: RequestEstimatePayloadKind;
    itemRowIds: string[];
  };
};

export type RequestEstimateDraftParityResult = {
  passed: boolean;
  visibleUiMatchesPdf: boolean;
  visibleUiMatchesSave: boolean;
  visibleUiMatchesSend: boolean;
  visibleUiMatchesRuntimeTrace: boolean;
  manualCatalogItemNotLost: boolean;
  editedQuantitiesNotLost: boolean;
  removedItemsNotSent: boolean;
  customItemsLowConfidence: boolean;
  failures: string[];
};
