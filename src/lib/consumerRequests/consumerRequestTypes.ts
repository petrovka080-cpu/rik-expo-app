export type ConsumerRepairRole = "consumer";
export type ConsumerRepairContextKind = "consumer_repair_request";
export type ConsumerRepairDataScope = "consumer_only";

export type ConsumerRepairContext = {
  role: ConsumerRepairRole;
  context: ConsumerRepairContextKind;
  dataScope: ConsumerRepairDataScope;
  companyDataAccess: false;
  officeAccess: false;
  marketplaceAccess: true;
  ownPdfAccess: true;
};

export type ConsumerRepairStatus =
  | "draft"
  | "consumer_approved"
  | "sent_to_marketplace"
  | "cancelled"
  | "archived";

export type ConsumerRepairItemType = "work" | "material" | "service" | "document" | "other";
export type ConsumerRepairItemSource =
  | "ai_suggested"
  | "user_added"
  | "marketplace"
  | "reference_price_book"
  | "catalog_item"
  | "custom";

export type ConsumerRepairRequestDraft = {
  id: string;
  consumerUserId: string;
  orgId?: string | null;
  title?: string | null;
  problemText?: string | null;
  repairType: string;
  city?: string | null;
  addressText?: string | null;
  preferredTimeText?: string | null;
  contactPhone?: string | null;
  status: ConsumerRepairStatus;
  aiSummaryRu?: string | null;
  missingData: string[];
  marketplaceReadyAt?: string | null;
  marketplaceValidationErrors?: ConsumerRequestValidationErrorItem[];
  lastMarketplaceSubmitAttemptAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  approvedAt?: string | null;
};

export type ConsumerRepairRequestItem = {
  id: string;
  requestDraftId: string;
  itemType: ConsumerRepairItemType;
  titleRu: string;
  quantity?: number | null;
  unit?: string | null;
  unitPrice?: number | null;
  totalPrice?: number | null;
  currency: string;
  source: ConsumerRepairItemSource;
  catalogItemId?: string | null;
  category?: string | null;
  unitLabel?: string | null;
  sourceId?: string | null;
  sourceLabel?: string | null;
  confidence?: "high" | "medium" | "low";
  addedBy?: "ai" | "user" | "system";
  editableByConsumer: boolean;
  createdAt: string;
};

export type ConsumerRepairRequestMedia = {
  id: string;
  requestDraftId: string;
  mediaAssetId: string;
  mediaKind: "photo" | "video" | "document";
  purpose: "request_evidence";
  createdAt: string;
};

export type ConsumerRepairRequestPdf = {
  id: string;
  requestDraftId: string;
  documentAssetId?: string | null;
  storageBucket: string;
  storageKey: string;
  titleRu: string;
  pdfStatus: "generated" | "failed" | "archived";
  contentType: "application/pdf";
  uploadedAt: string;
  storageVerifiedAt: string;
  createdAt: string;
};

export type ConsumerRepairPdfSupplement = {
  estimateAssumptions?: string[];
  costIncreaseFactors?: string[];
  clarifyingQuestions?: string[];
  taxStatus?: string;
  sourceConfidence?: "high" | "medium" | "low";
  sourceLabels?: string[];
  safetyMessage?: string;
  originSourceType?: string;
};

export type ConsumerRepairPdfOpenResult = {
  requestId: string;
  pdfId: string;
  titleRu: string;
  signedUrl: string;
  expiresAt: string;
  contentType: "application/pdf";
};

export type ConsumerRepairRequestEvent = {
  id: string;
  requestDraftId: string;
  eventType: string;
  actorUserId?: string | null;
  actorType: "consumer" | "ai" | "system" | "marketplace";
  payload: Record<string, unknown>;
  createdAt: string;
};

export type ConsumerMarketplaceLink = {
  id: string;
  requestDraftId: string;
  marketplaceDemandId?: string | null;
  status: "not_sent" | "sent" | "offers_received" | "closed";
  idempotencyKey?: string | null;
  createdAt: string;
  sentAt?: string | null;
};

export type ConsumerRepairDraftBundle = {
  draft: ConsumerRepairRequestDraft;
  items: ConsumerRepairRequestItem[];
  media: ConsumerRepairRequestMedia[];
  pdfs: ConsumerRepairRequestPdf[];
  marketplaceLink: ConsumerMarketplaceLink;
  events: ConsumerRepairRequestEvent[];
};

export type ConsumerRepairAiDraft = {
  titleRu: string;
  summaryRu: string;
  repairType: string;
  items: {
    itemType: ConsumerRepairItemType;
    titleRu: string;
    quantity: number;
    unit: string;
    unitPrice?: number;
    currency?: string;
    source: ConsumerRepairItemSource;
    catalogItemId?: string | null;
    category?: string | null;
    unitLabel?: string | null;
    sourceId?: string | null;
    sourceLabel?: string | null;
    confidence?: "high" | "medium" | "low";
    addedBy?: "ai" | "user" | "system";
  }[];
  missingData: string[];
  safetyMessageRu?: string;
  dangerousDiyBlocked: boolean;
};

export type ConsumerRequestValidationErrorCode =
  | "CONTACT_REQUIRED"
  | "DESCRIPTION_REQUIRED"
  | "MEDIA_REQUIRED"
  | "ITEMS_REQUIRED"
  | "PDF_REQUIRED"
  | "PDF_FILE_MISSING"
  | "REQUEST_NOT_APPROVED"
  | "REPAIR_TYPE_REQUIRED"
  | "OWNER_MISMATCH";

export type ConsumerRequestValidationErrorItem = {
  code: ConsumerRequestValidationErrorCode;
  messageRu: string;
  field?: string;
};

export type ConsumerRequestValidationResult = {
  ok: boolean;
  errors: ConsumerRequestValidationErrorItem[];
};
