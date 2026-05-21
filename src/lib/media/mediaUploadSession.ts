import type { MediaOwnerRole, MediaPurpose, MediaUploadDescriptor, MediaUploadSession } from "./mediaTypes";
import { validateMediaUploadGroup } from "./services/mediaValidationService";

export type CreateMediaUploadSessionInput = {
  id: string;
  orgId: string;
  projectId?: string;
  ownerUserId: string;
  ownerRole: MediaOwnerRole;
  purpose: MediaPurpose;
  descriptors: MediaUploadDescriptor[];
  createdAt: string;
};

export function createMediaUploadSession(input: CreateMediaUploadSessionInput): MediaUploadSession {
  const validation = validateMediaUploadGroup(input.descriptors);

  return {
    id: input.id,
    orgId: input.orgId,
    projectId: input.projectId,
    ownerUserId: input.ownerUserId,
    ownerRole: input.ownerRole,
    purpose: input.purpose,
    descriptors: validation.accepted,
    status: validation.passed ? "validated" : "rejected",
    rejectionReasonsRu: validation.rejected.map((item) => item.reasonRu),
    createdAt: input.createdAt,
  };
}
