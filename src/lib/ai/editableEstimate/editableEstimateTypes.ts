export type EditableEstimatePriceStatus =
  | "REFERENCE_PRICE_ESTIMATE"
  | "CATALOG_PRICE_VERIFIED"
  | "PRICEBOOK_VERIFIED"
  | "USER_CONFIRMED_MARKET_PRICE"
  | "PRICE_MISSING"
  | "USER_PRICE_OVERRIDE"
  | "USER_ENTERED_PRICE";

export type EditableEstimatePriceSource =
  | "ai_estimate"
  | "reference_price_book"
  | "catalog_item"
  | "pricebook"
  | "photo_material_scan"
  | "user"
  | "missing";

export type EditableEstimateRowType = "work" | "material" | "service" | "document" | "other";
export type EditableEstimateRowConfidence = "high" | "medium" | "low";
export type EditableEstimateQuantitySource = "estimate" | "user_override";

export type EditableEstimateManualPrice = {
  unitPrice: number;
  currency: string;
  status: "USER_PRICE_OVERRIDE" | "USER_ENTERED_PRICE";
  actorUserId?: string | null;
  reason?: string | null;
  updatedAt: string;
};

export type EditableEstimateSelectedProductBinding = {
  productId: string;
  visibleName: string;
  packageLabel?: string | null;
  barcode?: string | null;
  materialKey?: string | null;
  catalogItemId?: string | null;
  scanId: string;
  candidateId: string;
  evidenceRefs: string[];
  source: "photo_material_scan";
  confirmedByUserId: string;
  confirmedAt: string;
};

export type EditableEstimateRow = {
  rowId: string;
  requestItemId?: string | null;
  rowType: EditableEstimateRowType;
  titleRu: string;
  quantity: number | null;
  unit: string | null;
  unitLabel?: string | null;
  unitPrice: number | null;
  totalPrice: number | null;
  currency: string;
  rowSource: string;
  catalogItemId?: string | null;
  selectedCatalogItemId?: string | null;
  materialKey?: string | null;
  rateKey?: string | null;
  catalogBindingStatus?: string | null;
  catalogCandidates?: unknown[];
  category?: string | null;
  sourceId?: string | null;
  sourceLabel?: string | null;
  formulaId?: string | null;
  quantityFormula?: string | null;
  calculationTrace?: string | null;
  sourceParameters?: Record<string, unknown> | null;
  templateId?: string | null;
  templateVersion?: string | null;
  normId?: string | null;
  normFamilyId?: string | null;
  normSourceId?: string | null;
  normSourceTitle?: string | null;
  normVersion?: string | null;
  normReviewStatus?: string | null;
  confidence?: EditableEstimateRowConfidence;
  addedBy?: "ai" | "user" | "system";
  editableByConsumer: boolean;
  quantitySource: EditableEstimateQuantitySource;
  priceStatus: EditableEstimatePriceStatus;
  priceSource: EditableEstimatePriceSource;
  priceSourceId?: string | null;
  priceSourceLabel?: string | null;
  manualPrice?: EditableEstimateManualPrice | null;
  selectedProductBinding?: EditableEstimateSelectedProductBinding | null;
  removed?: boolean;
};

export type EditableEstimateTotals = {
  pricedRows: number;
  missingPriceRows: number;
  userPricedRows: number;
  materialsTotal: number;
  laborTotal: number;
  equipmentTotal: number;
  otherTotal: number;
  grandTotal: number;
  currency: string;
};

export type EditableEstimateAuditEventType =
  | "snapshot_created"
  | "quantity_overridden"
  | "price_overridden"
  | "price_cleared"
  | "catalog_selected"
  | "row_added"
  | "row_removed"
  | "row_restored"
  | "ai_recalculated_user_overrides_preserved";

export type EditableEstimateAuditEvent = {
  id: string;
  type: EditableEstimateAuditEventType;
  rowId?: string | null;
  actorUserId?: string | null;
  reason?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  createdAt: string;
};

export type EditableEstimateSnapshot = {
  version: "editable-estimate-v1";
  snapshotId: string;
  requestDraftId: string;
  sourceEstimateId?: string | null;
  workKey?: string | null;
  currency: string;
  rows: EditableEstimateRow[];
  totals: EditableEstimateTotals;
  auditTrail: EditableEstimateAuditEvent[];
  hash: string;
  createdAt: string;
  updatedAt: string;
};

export type EditableEstimateValidationIssue = {
  code: string;
  rowId?: string;
  message: string;
};

export type EditableEstimateValidationResult = {
  valid: boolean;
  issues: EditableEstimateValidationIssue[];
};

export type EditableEstimateOverrideInput = {
  rowId: string;
  quantity?: number | null;
  unitPrice?: number | null;
  actorUserId?: string | null;
  reason?: string | null;
  at?: string;
};
