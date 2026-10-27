export type DocumentKind =
  | "invoice"
  | "act"
  | "contract"
  | "delivery_note"
  | "estimate"
  | "specification"
  | "certificate"
  | "payment_order"
  | "warehouse_note"
  | "work_report"
  | "client_report"
  | "photo_document_scan"
  | "unknown";

export type DocumentOwnerRole =
  | "director"
  | "foreman"
  | "contractor"
  | "buyer"
  | "supplier"
  | "warehouse"
  | "accountant"
  | "office"
  | "client"
  | "admin"
  | "security";

export type DocumentReviewStatus =
  | "draft"
  | "needs_review"
  | "pending_review"
  | "human_confirmed"
  | "approved"
  | "rejected";

export type DocumentAiStatus =
  | "not_processed"
  | "processing"
  | "processed"
  | "needs_human_review"
  | "failed";

export type DocumentAsset = {
  id: string;
  orgId: string;
  projectId?: string;
  objectId?: string;
  buildingId?: string;
  floorId?: string;
  zoneId?: string;
  workId?: string;
  requestId?: string;
  purchaseOrderId?: string;
  warehouseEventId?: string;
  paymentId?: string;
  invoiceId?: string;
  actId?: string;
  contractId?: string;
  reportId?: string;
  contractorId?: string;
  supplierId?: string;
  companyId?: string;
  ownerUserId: string;
  ownerRole: DocumentOwnerRole;
  documentKind: DocumentKind;
  originalFileName?: string;
  mimeType: string;
  byteSize: number;
  pageCount?: number;
  storageKey: string;
  contentHash: string;
  createdAt: string;
  updatedAt?: string;
  preview: {
    thumbnail?: string;
    pageImages?: string[];
  };
  visibility: {
    rolesAllowed: DocumentOwnerRole[];
    clientVisible: boolean;
    requiresSignedUrl: boolean;
  };
  reviewStatus: DocumentReviewStatus;
  aiStatus: DocumentAiStatus;
  finalLinkedByHuman: boolean;
  extractedDataStatus:
    | "not_extracted"
    | "extracted_as_suggestion"
    | "human_confirmed"
    | "rejected";
};

export type DocumentChunkField =
  | "document_number"
  | "document_date"
  | "company_name"
  | "counterparty_name"
  | "amount"
  | "currency"
  | "line_item"
  | "quantity"
  | "unit"
  | "material"
  | "work_type"
  | "object"
  | "floor"
  | "signature"
  | "stamp"
  | "unknown";

export type DocumentChunk = {
  id: string;
  documentId: string;
  pageNumber?: number;
  chunkIndex: number;
  textRu?: string;
  rawText?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  extractedFields: {
    field: DocumentChunkField;
    valueRu: string;
    confidence: "high" | "medium" | "low";
    requiresReview: boolean;
  }[];
  source: "pdf_text" | "ocr" | "manual_upload" | "media_scan" | "unknown";
  confidence: "high" | "medium" | "low";
  createdAt: string;
};

export type DocumentSourceRef = {
  id: string;
  origin: "document_asset" | "pdf_document" | "document_chunk";
  entityType: "document" | "pdf_document" | "document_chunk";
  entityId: string;
  labelRu: string;
  descriptionRu?: string;
  documentKind: DocumentKind;
  appLink: {
    route: string;
    params: Record<string, string>;
    page?: number;
    chunkId?: string;
    highlightText?: string;
    anchor?: string;
  };
  permission: {
    canOpen: boolean;
    reasonRu?: string;
  };
  evidence?: {
    field?: string;
    valuePreviewRu?: string;
    pageNumber?: number;
    chunkId?: string;
    confidence?: "high" | "medium" | "low";
  };
  canBePresentedAsFact: boolean;
  requiresReview: boolean;
};

export type DocumentExtractedField<T> = {
  valueRu?: string;
  value?: T;
  currency?: string;
  sourceChunkId: string;
  confidence: "high" | "medium" | "low";
  requiresReview: boolean;
};

export type DocumentAiExtraction = {
  id: string;
  documentId: string;
  extractedAt: string;
  detectedKind: DocumentKind;
  confidence: "high" | "medium" | "low";
  fields: {
    documentNumber?: DocumentExtractedField<string>;
    documentDate?: DocumentExtractedField<string>;
    amount?: DocumentExtractedField<number>;
    companyName?: DocumentExtractedField<string>;
    counterpartyName?: DocumentExtractedField<string>;
    lineItems: {
      titleRu: string;
      quantity?: number;
      unit?: string;
      amount?: number;
      sourceChunkId: string;
      confidence: "high" | "medium" | "low";
      requiresReview: boolean;
    }[];
    signatures?: {
      present: boolean;
      sourceChunkId?: string;
      confidence: "high" | "medium" | "low";
      requiresReview: true;
    };
    stamps?: {
      present: boolean;
      sourceChunkId?: string;
      confidence: "high" | "medium" | "low";
      requiresReview: true;
    };
  };
  safetyFlags: (
    | "low_confidence"
    | "possible_wrong_document_type"
    | "contains_sensitive_info"
    | "amount_needs_review"
    | "company_needs_review"
    | "signature_needs_review"
    | "stamp_needs_review"
  )[];
  finalFact: false;
};

export type DocumentLinkSuggestion = {
  id: string;
  documentId: string;
  targetType:
    | "payment"
    | "invoice"
    | "act"
    | "contract"
    | "procurement_request"
    | "purchase_order"
    | "warehouse_event"
    | "work"
    | "report"
    | "contractor"
    | "supplier"
    | "company"
    | "object"
    | "floor";
  targetId: string;
  labelRu: string;
  reasonRu: string;
  confidence: "high" | "medium" | "low";
  matchedFields: {
    documentField: string;
    documentValueRu: string;
    appEntityField: string;
    appEntityValueRu: string;
    sourceChunkId?: string;
  }[];
  finalLinkAllowed: false;
  requiresHumanConfirm: true;
};

export type DocumentEvidenceRequirement =
  | "invoice_required"
  | "act_required"
  | "contract_required"
  | "delivery_note_required"
  | "photo_evidence_required"
  | "signature_required"
  | "stamp_required"
  | "amount_match_required"
  | "company_match_required"
  | "work_match_required"
  | "object_floor_match_required";

export type DocumentEvidenceMatrix = {
  documentId: string;
  relatedEntity: {
    type:
      | "payment"
      | "work"
      | "procurement_request"
      | "warehouse_event"
      | "act"
      | "report";
    id: string;
    labelRu: string;
  };
  evidenceItems: {
    requirement: DocumentEvidenceRequirement;
    status:
      | "confirmed_by_document"
      | "suggested_by_ai"
      | "missing"
      | "mismatch"
      | "needs_review";
    sourceRefIds: string[];
    reasonRu: string;
  }[];
  blockers: {
    blockerRu: string;
    severity: "low" | "medium" | "high";
    sourceRefIds: string[];
  }[];
  finalDecisionByAi: false;
};

export type DocumentAiAnswer = {
  documentId: string;
  textRu: string;
  sourceRefs: DocumentSourceRef[];
  openLinks: {
    labelRu: string;
    sourceRefId: string;
    enabled: boolean;
    route?: string;
  }[];
  statusRu: "Документ не изменён" | "Требуется проверка" | "Черновик связи подготовлен";
};

export type DocumentAiSafetyGuardResult = {
  documentId: string;
  passed: boolean;
  extractionIsFinalFact: false;
  finalLinkByAi: false;
  paymentMutated: false;
  workClosed: false;
  actSigned: false;
  stockMutated: false;
  didNotInventAmount: boolean;
  didNotInventCompany: boolean;
  didNotInventDocumentNumber: boolean;
  didNotInventDate: boolean;
  sourceRefsForExtractedFields: boolean;
  chunksForExtractedFields: boolean;
  roleScopePassed: boolean;
  failureReason?:
    | "extraction_presented_as_final_fact"
    | "document_final_linked_by_ai"
    | "payment_mutated"
    | "work_closed"
    | "act_signed"
    | "stock_mutated"
    | "invented_amount"
    | "invented_company"
    | "invented_document_number"
    | "invented_date"
    | "missing_source_ref"
    | "missing_chunk_ref"
    | "cross_role_document_leak"
    | "signed_url_leaked"
    | "storage_key_leaked";
};
