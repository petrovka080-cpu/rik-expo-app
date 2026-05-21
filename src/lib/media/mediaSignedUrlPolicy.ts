import type { MediaAsset, MediaOwnerRole, MediaSignedUrlPolicy, MediaVariant } from "./mediaTypes";
import { resolveMediaRoleAccess } from "./mediaRoleAccessPolicy";

export function buildMediaSignedUrlPolicy(input: {
  asset: Pick<MediaAsset, "id" | "orgId" | "ownerUserId" | "visibility">;
  variant: MediaVariant;
  requesterUserId: string;
  requesterRole: MediaOwnerRole;
  orgId: string;
  ttlSeconds?: number;
}): MediaSignedUrlPolicy {
  const access = resolveMediaRoleAccess(input.asset, {
    userId: input.requesterUserId,
    role: input.requesterRole,
    orgId: input.orgId,
  });

  return {
    assetId: input.asset.id,
    variant: input.variant,
    requesterUserId: input.requesterUserId,
    requesterRole: input.requesterRole,
    orgId: input.orgId,
    ttlSeconds: input.ttlSeconds ?? 300,
    canIssue: access.canOpen,
    reasonRu: access.reasonRu,
    logSafe: {
      canLogUrl: false,
      canLogStorageKey: false,
      canLogAssetId: true,
    },
  };
}
