import { MEDIA_LIMITS } from "./mediaLimits";
import type { MediaAsset, MediaAssetGroup, MediaOwnerRole, MediaPurpose } from "./mediaTypes";

export type CreateMediaAssetGroupInput = {
  id: string;
  orgId: string;
  projectId?: string;
  ownerUserId: string;
  ownerRole: MediaOwnerRole;
  purpose: MediaPurpose;
  assets: Pick<MediaAsset, "id">[];
  linkedContext?: MediaAssetGroup["linkedContext"];
  createdAt: string;
};

export function createDraftMediaAssetGroup(input: CreateMediaAssetGroupInput): MediaAssetGroup {
  return {
    id: input.id,
    orgId: input.orgId,
    projectId: input.projectId,
    ownerUserId: input.ownerUserId,
    ownerRole: input.ownerRole,
    purpose: input.purpose,
    assetIds: input.assets.map((asset) => asset.id),
    limits: {
      maxPhotos: MEDIA_LIMITS.maxPhotosPerGroup,
      maxVideos: MEDIA_LIMITS.maxVideosPerGroup,
      maxVideoDurationMs: MEDIA_LIMITS.maxVideoDurationMs,
    },
    linkedContext: input.linkedContext ?? {},
    status: "draft",
    createdAt: input.createdAt,
  };
}

export function mediaAssetGroupUsesCentralLimits(group: MediaAssetGroup): boolean {
  return (
    group.limits.maxPhotos === MEDIA_LIMITS.maxPhotosPerGroup &&
    group.limits.maxVideos === MEDIA_LIMITS.maxVideosPerGroup &&
    group.limits.maxVideoDurationMs === MEDIA_LIMITS.maxVideoDurationMs
  );
}
