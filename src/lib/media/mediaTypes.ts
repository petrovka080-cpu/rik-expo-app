import type { MEDIA_LIMITS } from "./mediaLimits";

export type MediaOwnerRole =
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

export type MediaPurpose =
  | "work_evidence"
  | "before_photo"
  | "after_photo"
  | "progress_video"
  | "defect"
  | "remark"
  | "product_photo"
  | "product_video"
  | "service_portfolio"
  | "warehouse_incoming"
  | "warehouse_issue"
  | "warehouse_discrepancy"
  | "document_scan"
  | "act_attachment"
  | "report_attachment"
  | "client_progress"
  | "unknown";

export type MediaKind = "photo" | "video";

export type MediaVariant = "original" | "preview" | "thumbnail" | "tiny" | "poster";

export type MediaModerationStatus =
  | "draft"
  | "needs_review"
  | "pending_moderation"
  | "approved"
  | "rejected";

export type MediaAiStatus =
  | "not_processed"
  | "processing"
  | "processed"
  | "needs_human_review"
  | "failed";

export type MediaAsset = {
  id: string;
  orgId: string;
  projectId?: string;
  objectId?: string;
  buildingId?: string;
  floorId?: string;
  zoneId?: string;
  workId?: string;
  taskId?: string;
  requestId?: string;
  productId?: string;
  marketplaceOfferId?: string;
  supplierId?: string;
  warehouseEventId?: string;
  documentId?: string;
  actId?: string;
  reportId?: string;
  remarkId?: string;
  paymentId?: string;
  invoiceId?: string;
  ownerUserId: string;
  ownerRole: MediaOwnerRole;
  mediaKind: MediaKind;
  purpose: MediaPurpose;
  storageKey: string;
  mimeType: string;
  byteSize: number;
  durationMs?: number;
  width?: number;
  height?: number;
  contentHash: string;
  createdAt: string;
  updatedAt?: string;
  variants: {
    original?: string;
    preview?: string;
    thumbnail?: string;
    tiny?: string;
    poster?: string;
  };
  visibility: {
    rolesAllowed: MediaOwnerRole[];
    clientVisible: boolean;
    publicMarketplaceVisible: boolean;
    requiresSignedUrl: boolean;
  };
  moderationStatus: MediaModerationStatus;
  aiStatus: MediaAiStatus;
  finalLinkedByHuman: boolean;
  safety: {
    containsPeople?: boolean;
    containsPrivateDocument?: boolean;
    containsSensitiveInfo?: boolean;
    faceIdentificationAttempted: false;
  };
};

export type MediaAssetGroup = {
  id: string;
  orgId: string;
  projectId?: string;
  ownerUserId: string;
  ownerRole: MediaOwnerRole;
  purpose: MediaPurpose;
  assetIds: string[];
  limits: {
    maxPhotos: typeof MEDIA_LIMITS.maxPhotosPerGroup;
    maxVideos: typeof MEDIA_LIMITS.maxVideosPerGroup;
    maxVideoDurationMs: typeof MEDIA_LIMITS.maxVideoDurationMs;
  };
  linkedContext: {
    workId?: string;
    requestId?: string;
    warehouseEventId?: string;
    productId?: string;
    documentId?: string;
    actId?: string;
    reportId?: string;
    remarkId?: string;
  };
  status: "draft" | "ready_for_review" | "human_confirmed" | "rejected" | "archived";
  createdAt: string;
};

export type MediaUploadDescriptor = {
  localId: string;
  mediaKind: MediaKind;
  mimeType: string;
  byteSize: number;
  durationMs?: number;
  width?: number;
  height?: number;
  fileName?: string;
};

export type MediaUploadSession = {
  id: string;
  orgId: string;
  projectId?: string;
  ownerUserId: string;
  ownerRole: MediaOwnerRole;
  purpose: MediaPurpose;
  descriptors: MediaUploadDescriptor[];
  status: "draft" | "validated" | "rejected" | "uploaded";
  rejectionReasonsRu: string[];
  createdAt: string;
};

export type MediaHandoffRef = {
  mediaAssetId: string;
  mediaAssetGroupId?: string;
  fromScreenId: string;
  toScreenId: string;
  reasonRu: string;
  allowedTargetPurposes: MediaPurpose[];
  requiresRoleCheck: true;
  requiresFreshSignedUrl: true;
};

export type MediaSourceRef = {
  id: string;
  origin: "media_asset";
  entityType: "media_asset" | "media_group";
  entityId: string;
  labelRu: string;
  descriptionRu?: string;
  mediaKind: MediaKind;
  purpose: MediaPurpose;
  appLink: {
    route: string;
    params: Record<string, string>;
    anchor?: string;
  };
  previewVariant: "tiny" | "thumbnail" | "preview" | "poster";
  permission: {
    canOpen: boolean;
    reasonRu?: string;
  };
  evidence?: {
    linkedTo:
      | "work"
      | "request"
      | "warehouse_event"
      | "document"
      | "act"
      | "report"
      | "remark"
      | "product"
      | "client_progress"
      | "unknown";
    confidence?: "high" | "medium" | "low";
  };
  canBePresentedAsFact: boolean;
  requiresReview: boolean;
};

export type MediaCachePolicy = {
  assetId: string;
  variant: MediaVariant;
  cacheScope: "public_marketplace" | "org_private" | "user_private" | "no_cache";
  ttlSeconds: number;
  requiresRoleCheck: boolean;
  purgeOnLogout: boolean;
  purgeOnRoleChange: boolean;
  purgeOnOrgChange: boolean;
  allowPrefetch: boolean;
  allowOriginalPrefetch: false;
};

export type MediaSignedUrlPolicy = {
  assetId: string;
  variant: MediaVariant;
  requesterUserId: string;
  requesterRole: MediaOwnerRole;
  orgId: string;
  ttlSeconds: number;
  canIssue: boolean;
  reasonRu?: string;
  logSafe: {
    canLogUrl: false;
    canLogStorageKey: false;
    canLogAssetId: true;
  };
};

export type MediaValidationResult = {
  passed: boolean;
  accepted: MediaUploadDescriptor[];
  rejected: {
    descriptor: MediaUploadDescriptor;
    reasonRu: string;
  }[];
  groupCounts: {
    photos: number;
    videos: number;
    total: number;
  };
};

export type MediaLifecycleTransition =
  | "ai_processing_started"
  | "ai_processed"
  | "ai_needs_human_review"
  | "ai_failed"
  | "human_confirmed"
  | "approved"
  | "rejected"
  | "archived";

export type MediaLifecycleDecision = {
  allowed: boolean;
  reasonRu: string;
  aiMayPerform: boolean;
};

export type MediaProofCheckResult = {
  passed: boolean;
  detailsRu: string;
};
