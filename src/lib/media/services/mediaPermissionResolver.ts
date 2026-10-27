import type { MediaAsset, MediaOwnerRole } from "../mediaTypes";
import { resolveMediaRoleAccess } from "../mediaRoleAccessPolicy";

export function canRequesterOpenMedia(input: {
  asset: Pick<MediaAsset, "orgId" | "ownerUserId" | "visibility">;
  requesterUserId: string;
  requesterRole: MediaOwnerRole;
  orgId: string;
}): boolean {
  return resolveMediaRoleAccess(input.asset, {
    userId: input.requesterUserId,
    role: input.requesterRole,
    orgId: input.orgId,
  }).canOpen;
}
