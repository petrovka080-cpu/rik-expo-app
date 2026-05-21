import type { MediaAsset, MediaCachePolicy, MediaVariant } from "./mediaTypes";

export function buildMediaCachePolicy(input: {
  asset: Pick<MediaAsset, "id" | "visibility">;
  variant: MediaVariant;
}): MediaCachePolicy {
  const publicVariant = input.asset.visibility.publicMarketplaceVisible;
  const original = input.variant === "original";

  return {
    assetId: input.asset.id,
    variant: input.variant,
    cacheScope: publicVariant ? "public_marketplace" : original ? "no_cache" : "org_private",
    ttlSeconds: original ? 300 : 3600,
    requiresRoleCheck: !publicVariant,
    purgeOnLogout: !publicVariant,
    purgeOnRoleChange: !publicVariant,
    purgeOnOrgChange: !publicVariant,
    allowPrefetch: !original,
    allowOriginalPrefetch: false,
  };
}
