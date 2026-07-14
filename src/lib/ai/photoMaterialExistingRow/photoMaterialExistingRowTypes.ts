import type { EditableEstimateRow, EditableEstimateSnapshot } from "../editableEstimate";
import type { EstimateRevisionState } from "../estimateRevisions";

export const PHOTO_MATERIAL_EXISTING_ROW_WAVE =
  "S_AI_ESTIMATE_PHOTO_MATERIAL_EXISTING_ROW_PRODUCTION_VERTICAL_SLICE_CLOSEOUT_POINT_OF_NO_RETURN" as const;

export const GREEN_PHOTO_MATERIAL_EXISTING_ROW_STATUS =
  "GREEN_AI_ESTIMATE_PHOTO_MATERIAL_EXISTING_ROW_VERTICAL_SLICE_READY" as const;

export const PHOTO_MATERIAL_EXISTING_ROW_FEATURE_FLAG =
  "ai_estimate_photo_existing_row_binding" as const;

export type PhotoMaterialScanPurpose = "BIND_EXISTING_ESTIMATE_ROW";

export type PhotoMaterialScanStatus =
  | "CAPTURING"
  | "UPLOADING"
  | "QUEUED"
  | "RECOGNIZING"
  | "NEEDS_CONFIRMATION"
  | "APPLYING"
  | "APPLIED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED";

export type PhotoMaterialImageKind =
  | "PRODUCT_FRONT"
  | "BARCODE"
  | "PRICE_TAG"
  | "OTHER";

export type PhotoMaterialScanSession = {
  scanId: string;
  userId: string;
  estimateId: string;
  baseRevisionId: string;
  targetRowId: string;
  scanPurpose: PhotoMaterialScanPurpose;
  status: PhotoMaterialScanStatus;
  version: number;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export type PhotoMaterialStoredImage = {
  imageId: string;
  scanId: string;
  kind: PhotoMaterialImageKind;
  mimeType: "image/jpeg" | "image/png" | "image/heic";
  byteSize: number;
  width: number;
  height: number;
  decodedPixelCount: number;
  contentSha256: string;
  storageBucket: "private-media";
  storagePath: string;
  privateObject: true;
  exifGpsStripped: true;
  signedUrlExposed: false;
};

export type PhotoMaterialQualityIssueCode =
  | "IMAGE_COUNT_EXCEEDED"
  | "IMAGE_TOO_LARGE"
  | "UNSUPPORTED_MIME"
  | "IMAGE_TOO_SMALL"
  | "DECODED_PIXELS_EXCEEDED"
  | "CONTENT_SHA256_REQUIRED"
  | "PRIVATE_STORAGE_REQUIRED"
  | "SIGNED_URL_FORBIDDEN"
  | "EXIF_GPS_NOT_STRIPPED";

export type PhotoMaterialQualityValidation = {
  ok: boolean;
  issues: PhotoMaterialQualityIssueCode[];
  rescanRequired: boolean;
};

export type PhotoMaterialObservationSource = "BARCODE" | "OCR" | "VISION";

export type PhotoMaterialObservation = {
  observationId: string;
  scanId: string;
  imageId: string;
  source: PhotoMaterialObservationSource;
  field: "barcode" | "product_name" | "package" | "price" | "currency" | "unit" | "material_key";
  value: string | number;
  confidence: number;
};

export type PhotoMaterialCatalogProduct = {
  productId: string;
  catalogItemId?: string | null;
  visibleName: string;
  packageLabel?: string | null;
  packageQuantity?: number | null;
  packageUnit?: string | null;
  barcode?: string | null;
  materialKey: string;
  category?: string | null;
  unit: string;
  unitLabel: string;
  governedUnitPrice?: number | null;
  governedPriceSourceId?: string | null;
  governedPriceSourceLabel?: string | null;
  currency: string;
  source: "catalog_item" | "material_master";
};

export type PhotoMaterialCandidateSource = "EXACT_BARCODE" | "CATALOG_MATCH" | "MATERIAL_MASTER_MATCH";

export type PhotoMaterialCandidate = {
  candidateId: string;
  scanId: string;
  productId: string;
  catalogItemId?: string | null;
  visibleName: string;
  packageLabel?: string | null;
  packageQuantity?: number | null;
  packageUnit?: string | null;
  barcode?: string | null;
  materialKey: string;
  unit: string;
  unitLabel: string;
  confidence: number;
  source: PhotoMaterialCandidateSource;
  evidenceObservationIds: string[];
  photoUnitPrice?: number | null;
  governedUnitPrice?: number | null;
  governedPriceSourceId?: string | null;
  governedPriceSourceLabel?: string | null;
  currency: string;
  payloadHash: string;
};

export type PhotoMaterialRecognitionResult = {
  scanId: string;
  status: "NEEDS_CONFIRMATION" | "FAILED";
  observations: PhotoMaterialObservation[];
  candidates: PhotoMaterialCandidate[];
  quality: PhotoMaterialQualityValidation;
  automatic_estimate_mutations: 0;
  automatic_revision_creation: 0;
  automatic_price_application: 0;
  automatic_catalog_mutations: 0;
  fake_green_claimed: false;
};

export type PhotoMaterialCompatibilityStatus =
  | "COMPATIBLE"
  | "PRODUCT_INCOMPATIBLE_WITH_ESTIMATE_ROW"
  | "LOW_CONFIDENCE_RESCAN_REQUIRED";

export type PhotoMaterialCompatibilityResult = {
  status: PhotoMaterialCompatibilityStatus;
  compatible: boolean;
  targetRowId: string;
  candidateId: string;
  reasonCodes: string[];
};

export type PhotoMaterialPriceDecision =
  | "KEEP_EXISTING_PRICE"
  | "APPLY_PHOTO_PRICE"
  | "APPLY_GOVERNED_CATALOG_PRICE"
  | "KEEP_PRICE_MISSING";

export type PhotoMaterialQuantityDecision =
  | "KEEP_REQUIREMENT_QUANTITY"
  | "RECALCULATE_FROM_PACKAGE";

export type PhotoMaterialConfirmationPayload = {
  scanId: string;
  candidateId: string;
  candidatePayloadHash: string;
  targetRowId: string;
  baseRevisionId: string;
  priceDecision: PhotoMaterialPriceDecision;
  quantityDecision: PhotoMaterialQuantityDecision;
  confirmedByUserId: string;
  idempotencyKey: string;
  confirmedAt?: string;
};

export type PhotoMaterialConfirmationLedgerEntry = {
  idempotencyKey: string;
  payloadHash: string;
  scanId: string;
  candidateId: string;
  createdRevisionId: string;
  createdAt: string;
};

export type PhotoMaterialConfirmationLedger = PhotoMaterialConfirmationLedgerEntry[];

export type PhotoMaterialConfirmationResult = {
  state: EstimateRevisionState;
  session: PhotoMaterialScanSession;
  ledger: PhotoMaterialConfirmationLedger;
  createdRevisionId: string;
  selectedRow: EditableEstimateRow;
  idempotentReplay: boolean;
  automatic_estimate_mutations_before_confirmation: 0;
  automatic_revisions_before_confirmation: 0;
  approved_revisions_modified: 0;
  atomic_partial_writes: 0;
  fake_green_claimed: false;
};

export type PhotoMaterialRowActionState = {
  visible: boolean;
  enabled: boolean;
  testID: string;
  reason: string;
};

export type PhotoMaterialRevisionParityMarker = {
  uiRevisionId: string;
  historyRevisionId: string;
  pdfRevisionId: string;
  sameRevision: boolean;
};

export type PhotoMaterialAtomicApplyInput = {
  session: PhotoMaterialScanSession;
  recognition: PhotoMaterialRecognitionResult;
  state: EstimateRevisionState;
  snapshot: EditableEstimateSnapshot;
  payload: PhotoMaterialConfirmationPayload;
  ledger?: PhotoMaterialConfirmationLedger;
  simulateFailureAfterValidation?: boolean;
};
