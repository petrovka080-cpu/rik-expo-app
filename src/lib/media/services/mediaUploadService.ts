import { createDraftMediaAsset } from "../mediaAsset";
import { createDraftMediaAssetGroup } from "../mediaAssetGroup";
import type { MediaAsset, MediaAssetGroup, MediaOwnerRole, MediaPurpose, MediaUploadDescriptor } from "../mediaTypes";
import { validateMediaUploadGroup } from "./mediaValidationService";

export type MediaUploadServiceInput = {
  orgId: string;
  projectId?: string;
  ownerUserId: string;
  ownerRole: MediaOwnerRole;
  purpose: MediaPurpose;
  descriptors: MediaUploadDescriptor[];
  now: string;
  idPrefix?: string;
};

export type MediaUploadServiceResult = {
  acceptedAssets: MediaAsset[];
  group?: MediaAssetGroup;
  rejectedReasonsRu: string[];
  changedData: false;
};

export function prepareMediaUploadDraft(input: MediaUploadServiceInput): MediaUploadServiceResult {
  const validation = validateMediaUploadGroup(input.descriptors);
  const acceptedAssets = validation.accepted.map((descriptor, index) =>
    createDraftMediaAsset({
      id: `${input.idPrefix ?? "media"}-${index + 1}`,
      orgId: input.orgId,
      projectId: input.projectId,
      ownerUserId: input.ownerUserId,
      ownerRole: input.ownerRole,
      purpose: input.purpose,
      descriptor,
      createdAt: input.now,
    }),
  );

  return {
    acceptedAssets,
    group: acceptedAssets.length
      ? createDraftMediaAssetGroup({
          id: `${input.idPrefix ?? "media"}-group`,
          orgId: input.orgId,
          projectId: input.projectId,
          ownerUserId: input.ownerUserId,
          ownerRole: input.ownerRole,
          purpose: input.purpose,
          assets: acceptedAssets,
          createdAt: input.now,
        })
      : undefined,
    rejectedReasonsRu: validation.rejected.map((item) => item.reasonRu),
    changedData: false,
  };
}
