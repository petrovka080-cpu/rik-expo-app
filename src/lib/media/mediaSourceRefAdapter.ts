import type { AiSourceRef } from "../ai/appContextGraph/aiSourceRef";
import { buildMediaAssetDeepLink, buildMediaGroupDeepLink } from "./mediaDeepLinkRegistry";
import { chooseDefaultPreviewVariant } from "./mediaVariantPolicy";
import type { MediaAsset, MediaAssetGroup, MediaSourceRef } from "./mediaTypes";

function resolveEvidenceLink(asset: MediaAsset): MediaSourceRef["evidence"] {
  if (asset.workId) return { linkedTo: "work", confidence: "medium" };
  if (asset.requestId) return { linkedTo: "request", confidence: "medium" };
  if (asset.warehouseEventId) return { linkedTo: "warehouse_event", confidence: "medium" };
  if (asset.documentId) return { linkedTo: "document", confidence: "medium" };
  if (asset.actId) return { linkedTo: "act", confidence: "medium" };
  if (asset.reportId) return { linkedTo: "report", confidence: "medium" };
  if (asset.remarkId) return { linkedTo: "remark", confidence: "medium" };
  if (asset.productId) return { linkedTo: "product", confidence: "medium" };
  if (asset.purpose === "client_progress") return { linkedTo: "client_progress", confidence: "medium" };
  return { linkedTo: "unknown", confidence: "low" };
}

export function createMediaAssetSourceRef(input: {
  asset: MediaAsset;
  canOpen: boolean;
  reasonRu?: string;
}): MediaSourceRef {
  return {
    id: `media:asset:${input.asset.id}`,
    origin: "media_asset",
    entityType: "media_asset",
    entityId: input.asset.id,
    labelRu: input.asset.mediaKind === "video" ? "Видео" : "Фото",
    descriptionRu: `Медиа: ${input.asset.purpose}`,
    mediaKind: input.asset.mediaKind,
    purpose: input.asset.purpose,
    appLink: buildMediaAssetDeepLink(input.asset),
    previewVariant: chooseDefaultPreviewVariant(input.asset.mediaKind),
    permission: {
      canOpen: input.canOpen,
      reasonRu: input.reasonRu,
    },
    evidence: resolveEvidenceLink(input.asset),
    canBePresentedAsFact: input.asset.finalLinkedByHuman && input.asset.moderationStatus === "approved",
    requiresReview: !input.asset.finalLinkedByHuman || input.asset.moderationStatus !== "approved",
  };
}

export function createMediaGroupSourceRef(input: {
  group: MediaAssetGroup;
  mediaKind?: "photo" | "video";
  canOpen: boolean;
  reasonRu?: string;
}): MediaSourceRef {
  return {
    id: `media:group:${input.group.id}`,
    origin: "media_asset",
    entityType: "media_group",
    entityId: input.group.id,
    labelRu: "Группа медиа",
    descriptionRu: `Медиа-группа: ${input.group.purpose}`,
    mediaKind: input.mediaKind ?? "photo",
    purpose: input.group.purpose,
    appLink: buildMediaGroupDeepLink(input.group),
    previewVariant: input.mediaKind === "video" ? "poster" : "thumbnail",
    permission: {
      canOpen: input.canOpen,
      reasonRu: input.reasonRu,
    },
    evidence: { linkedTo: "unknown", confidence: "low" },
    canBePresentedAsFact: input.group.status === "human_confirmed",
    requiresReview: input.group.status !== "human_confirmed",
  };
}

export function mediaSourceRefToAiSourceRef(ref: MediaSourceRef): AiSourceRef {
  return {
    id: ref.id,
    origin: "media_asset",
    entityType: ref.entityType,
    entityId: ref.entityId,
    labelRu: ref.labelRu,
    descriptionRu: ref.descriptionRu,
    appLink: ref.appLink,
    permission: ref.permission,
    evidence: {
      field: ref.purpose,
      valuePreviewRu: ref.mediaKind === "video" ? "Видео evidence" : "Фото evidence",
      confidence: ref.evidence?.confidence,
    },
    canBePresentedAsFact: ref.canBePresentedAsFact,
    requiresReview: ref.requiresReview,
  };
}
