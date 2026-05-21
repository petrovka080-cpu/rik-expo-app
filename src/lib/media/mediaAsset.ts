import type { MediaAsset, MediaOwnerRole, MediaPurpose, MediaUploadDescriptor } from "./mediaTypes";
import { createMediaContentHash } from "./services/mediaHashService";
import { createMediaVariants } from "./services/mediaVariantService";

export type CreateMediaAssetInput = {
  id: string;
  orgId: string;
  projectId?: string;
  ownerUserId: string;
  ownerRole: MediaOwnerRole;
  purpose: MediaPurpose;
  descriptor: MediaUploadDescriptor;
  createdAt: string;
  context?: Partial<
    Pick<
      MediaAsset,
      | "objectId"
      | "buildingId"
      | "floorId"
      | "zoneId"
      | "workId"
      | "taskId"
      | "requestId"
      | "productId"
      | "marketplaceOfferId"
      | "supplierId"
      | "warehouseEventId"
      | "documentId"
      | "actId"
      | "reportId"
      | "remarkId"
      | "paymentId"
      | "invoiceId"
    >
  >;
};

export function createDraftMediaAsset(input: CreateMediaAssetInput): MediaAsset {
  const storageKey = `media/${input.orgId}/${input.id}/original`;
  const contentHash = createMediaContentHash({
    id: input.id,
    mimeType: input.descriptor.mimeType,
    byteSize: input.descriptor.byteSize,
    durationMs: input.descriptor.durationMs,
  });

  return {
    id: input.id,
    orgId: input.orgId,
    projectId: input.projectId,
    ...input.context,
    ownerUserId: input.ownerUserId,
    ownerRole: input.ownerRole,
    mediaKind: input.descriptor.mediaKind,
    purpose: input.purpose,
    storageKey,
    mimeType: input.descriptor.mimeType,
    byteSize: input.descriptor.byteSize,
    durationMs: input.descriptor.durationMs,
    width: input.descriptor.width,
    height: input.descriptor.height,
    contentHash,
    createdAt: input.createdAt,
    variants: createMediaVariants({
      assetId: input.id,
      mediaKind: input.descriptor.mediaKind,
    }),
    visibility: {
      rolesAllowed: [input.ownerRole, "admin", "security"],
      clientVisible: false,
      publicMarketplaceVisible: false,
      requiresSignedUrl: true,
    },
    moderationStatus: "draft",
    aiStatus: "not_processed",
    finalLinkedByHuman: false,
    safety: {
      faceIdentificationAttempted: false,
    },
  };
}

export function isMediaAssetHumanConfirmed(asset: Pick<MediaAsset, "finalLinkedByHuman" | "moderationStatus">): boolean {
  return asset.finalLinkedByHuman && asset.moderationStatus === "approved";
}
