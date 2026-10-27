import type { MediaAsset, MediaAssetGroup } from "./mediaTypes";

export type MediaDeepLink = {
  route: string;
  params: Record<string, string>;
  anchor?: string;
};

export function buildMediaAssetDeepLink(asset: Pick<MediaAsset, "id">): MediaDeepLink {
  return {
    route: "/media/viewer",
    params: { mediaAssetId: asset.id },
    anchor: `media-${asset.id}`,
  };
}

export function buildMediaGroupDeepLink(group: Pick<MediaAssetGroup, "id">): MediaDeepLink {
  return {
    route: "/media/viewer",
    params: { mediaAssetGroupId: group.id },
    anchor: `media-group-${group.id}`,
  };
}
