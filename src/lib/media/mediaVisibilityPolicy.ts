import type { MediaAsset, MediaOwnerRole, MediaPurpose } from "./mediaTypes";

export type MediaVisibilityDecision = {
  rolesAllowed: MediaOwnerRole[];
  clientVisible: boolean;
  publicMarketplaceVisible: boolean;
  requiresSignedUrl: boolean;
};

export function buildDefaultMediaVisibilityPolicy(input: {
  ownerRole: MediaOwnerRole;
  purpose: MediaPurpose;
}): MediaVisibilityDecision {
  const marketplace = input.purpose === "product_photo" || input.purpose === "product_video";
  const clientProgress = input.purpose === "client_progress";

  return {
    rolesAllowed: [input.ownerRole, "admin", "security"],
    clientVisible: clientProgress,
    publicMarketplaceVisible: false,
    requiresSignedUrl: !marketplace,
  };
}

export function isMediaVisibleToClient(asset: Pick<MediaAsset, "visibility" | "moderationStatus">): boolean {
  return asset.visibility.clientVisible && asset.moderationStatus === "approved";
}
