import {
  buildAiAppContextGraph,
  type AiContextGraphBuildResult,
  type AiContextGraphEntityInput,
  type AiContextGraphRole,
} from "../ai/appContextGraph";
import type { MediaAsset, MediaAssetGroup } from "./mediaTypes";
import { createMediaAssetSourceRef, createMediaGroupSourceRef, mediaSourceRefToAiSourceRef } from "./mediaSourceRefAdapter";

export function mediaAssetToContextGraphEntity(asset: MediaAsset): AiContextGraphEntityInput {
  const sourceRef = mediaSourceRefToAiSourceRef(
    createMediaAssetSourceRef({
      asset,
      canOpen: true,
    }),
  );

  return {
    entityType: "media_asset",
    entityId: asset.id,
    labelRu: asset.mediaKind === "video" ? "Видео" : "Фото",
    titleRu: asset.mediaKind === "video" ? "Видео evidence" : "Фото evidence",
    descriptionRu: `Назначение: ${asset.purpose}`,
    origin: "media_asset",
    appLink: sourceRef.appLink,
    evidence: sourceRef.evidence,
    canBePresentedAsFact: sourceRef.canBePresentedAsFact,
    requiresReview: sourceRef.requiresReview,
    facts: [
      { key: "mediaKind", valueRu: asset.mediaKind },
      { key: "purpose", valueRu: asset.purpose },
      { key: "aiStatus", valueRu: asset.aiStatus },
    ],
  };
}

export function mediaGroupToContextGraphEntity(group: MediaAssetGroup): AiContextGraphEntityInput {
  const sourceRef = mediaSourceRefToAiSourceRef(
    createMediaGroupSourceRef({
      group,
      canOpen: true,
    }),
  );

  return {
    entityType: "media_group",
    entityId: group.id,
    labelRu: "Группа медиа",
    titleRu: "Группа фото/видео",
    descriptionRu: `Назначение: ${group.purpose}`,
    origin: "media_asset",
    appLink: sourceRef.appLink,
    canBePresentedAsFact: sourceRef.canBePresentedAsFact,
    requiresReview: sourceRef.requiresReview,
    facts: [
      { key: "assets", valueRu: String(group.assetIds.length) },
      { key: "status", valueRu: group.status },
    ],
  };
}

export function buildMediaContextGraph(input: {
  assets: MediaAsset[];
  groups?: MediaAssetGroup[];
  role: AiContextGraphRole;
  screenId: string;
}): AiContextGraphBuildResult {
  return buildAiAppContextGraph({
    role: input.role,
    screenId: input.screenId,
    entities: [
      ...input.assets.map(mediaAssetToContextGraphEntity),
      ...(input.groups ?? []).map(mediaGroupToContextGraphEntity),
    ],
  });
}
