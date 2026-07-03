import type { EstimatePresentationViewModel } from "../ai/estimatePresentation";
import type {
  EditableEstimatePriceSource,
  EditableEstimatePriceStatus,
  EditableEstimateSelectedProductBinding,
  EditableEstimateSnapshot,
} from "../ai/editableEstimate";
import type { EstimateRevisionState } from "../ai/estimateRevisions";
import type { ProjectExecutionDraft } from "../projectExecution/projectExecutionTypes";
import type { StructuredEstimatePayload } from "../estimateStructuredPipeline/structuredEstimateTypes";
import type {
  EstimateCostConfidence,
  EstimatePriceCandidateSummary,
  EstimatePriceTrace,
} from "../../features/estimates/pricing/priceResolutionEngine";

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
  | "archived"
  | "deleted_by_user";

export type ConsumerRepairItemType = "work" | "material" | "service" | "document" | "other";
export type ConsumerRepairItemSource =
  | "ai_suggested"
  | "user_added"
  | "marketplace"
  | "reference_price_book"
  | "catalog_item"
  | "custom";

export type ConsumerRepairCatalogBindingStatus =
  | "matched"
  | "multiple_candidates"
  | "no_catalog_match"
  | "not_material_row";

export type ConsumerRepairCatalogCandidate = {
  catalogItemId: string;
  name: string;
  unit: string;
  unitLabel: string;
  unitPrice?: number | null;
  currency?: string;
  sourceId?: string;
  sourceLabel?: string;
  confidence: "high" | "medium" | "low";
  availabilityStatus: "available" | "unavailable" | "unknown";
  stockStatus: "in_stock" | "out_of_stock" | "unknown";
  matchReason: string;
};

export type ConsumerRepairSelectedWork = {
  selectedWorkKey: string;
  selectedWorkTitleRu: string;
  selectedWorkCategoryKey: string;
  selectedWorkCategoryTitleRu: string;
  selectedWorkRawInput: string;
  selectedWorkSource: "user_selected";
  selectedWorkResolverReGuessed: false;
};

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
  selectedWorkKey?: string | null;
  selectedWorkTitleRu?: string | null;
  selectedWorkCategoryKey?: string | null;
  selectedWorkCategoryTitleRu?: string | null;
  selectedWorkRawInput?: string | null;
  selectedWorkSource?: ConsumerRepairSelectedWork["selectedWorkSource"] | null;
  selectedWorkResolverReGuessed?: false | null;
  status: ConsumerRepairStatus;
  aiSummaryRu?: string | null;
  missingData: string[];
  marketplaceReadyAt?: string | null;
  marketplaceValidationErrors?: ConsumerRequestValidationErrorItem[];
  lastMarketplaceSubmitAttemptAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  approvedAt?: string | null;
  deletedAt?: string | null;
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
  selectedCatalogItemId?: string | null;
  materialKey?: string | null;
  rateKey?: string | null;
  catalogBindingStatus?: ConsumerRepairCatalogBindingStatus | null;
  catalogCandidates?: ConsumerRepairCatalogCandidate[];
  category?: string | null;
  unitLabel?: string | null;
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
  priceStatus?: EditableEstimatePriceStatus;
  priceSource?: EditableEstimatePriceSource;
  priceSourceId?: string | null;
  priceSourceLabel?: string | null;
  priceTrace?: EstimatePriceTrace | null;
  priceCandidates?: EstimatePriceCandidateSummary[];
  costConfidence?: EstimateCostConfidence | null;
  selectedProductBinding?: EditableEstimateSelectedProductBinding | null;
  quantityEditedByConsumer?: boolean;
  priceEditedByConsumer?: boolean;
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
  revisionId?: string | null;
  snapshotId?: string | null;
  revisionRowsHash?: string | null;
  revisionTotalsHash?: string | null;
  revisionFullSnapshotHash?: string | null;
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
  editableEstimateSnapshot?: EditableEstimateSnapshot | null;
  estimateRevisionState?: EstimateRevisionState | null;
  structuredEstimatePayload?: StructuredEstimatePayload | null;
  projectExecutionDrafts: ProjectExecutionDraft[];
  marketplaceLink: ConsumerMarketplaceLink;
  events: ConsumerRepairRequestEvent[];
};

export type ConsumerRepairAiDraft = {
  titleRu: string;
  summaryRu: string;
  repairType: string;
  selectedWork?: ConsumerRepairSelectedWork;
  estimatePresentation?: EstimatePresentationViewModel;
  structuredEstimatePayload?: StructuredEstimatePayload;
  items: {
    itemType: ConsumerRepairItemType;
    titleRu: string;
    quantity: number;
    unit: string;
    unitPrice?: number | null;
    currency?: string;
    source: ConsumerRepairItemSource;
    catalogItemId?: string | null;
    selectedCatalogItemId?: string | null;
    materialKey?: string | null;
    rateKey?: string | null;
    catalogBindingStatus?: ConsumerRepairCatalogBindingStatus | null;
    catalogCandidates?: ConsumerRepairCatalogCandidate[];
    category?: string | null;
    unitLabel?: string | null;
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
    priceStatus?: EditableEstimatePriceStatus;
    priceSource?: EditableEstimatePriceSource;
    priceSourceId?: string | null;
    priceSourceLabel?: string | null;
    priceTrace?: EstimatePriceTrace | null;
    priceCandidates?: EstimatePriceCandidateSummary[];
    costConfidence?: EstimateCostConfidence | null;
    confidence?: "high" | "medium" | "low";
    addedBy?: "ai" | "user" | "system";
  }[];
  missingData: string[];
  safetyMessageRu?: string;
  dangerousDiyBlocked: boolean;
};

export type ConsumerRequestValidationErrorCode =
  | "CONTACT_REQUIRED"
  | "DELIVERY_ADDRESS_REQUIRED"
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
