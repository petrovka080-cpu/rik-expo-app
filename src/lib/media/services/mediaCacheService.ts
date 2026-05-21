import type { MediaCachePolicy } from "../mediaTypes";

export function shouldPrefetchMediaVariant(policy: MediaCachePolicy): boolean {
  return policy.allowPrefetch && policy.variant !== "original" && !policy.allowOriginalPrefetch;
}

export function shouldPurgeMediaCacheOnScopeChange(policy: MediaCachePolicy): boolean {
  return policy.purgeOnLogout || policy.purgeOnRoleChange || policy.purgeOnOrgChange;
}
