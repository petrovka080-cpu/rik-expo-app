import { StyleSheet } from "react-native";

import { MARKET_ADD_MEDIA_LIMITS } from "../../../lib/media/mediaLimits";

export type LiveRouteMediaEntrypointVariant = "foreman" | "foremanMaterials" | "marketplace" | "contractor";

export type CompactMediaButtonsProps = {
  targetType:
    | "request_draft"
    | "procurement_request"
    | "work"
    | "act"
    | "report"
    | "remark"
    | "warehouse_event"
    | "marketplace_product"
    | "document";
  targetId?: string;
  photoCount: number;
  videoCount: number;
  maxPhotos: number;
  maxVideos: 1;
  showLabels: true;
  labels: {
    photo: "Фото";
    video: "Видео";
  };
  compact: true;
};

export type InlineMediaSuggestion = {
  mediaAssetId: string;
  targetType: "request_draft" | "work" | "marketplace_product" | "warehouse_event" | "document";
  status: "checking" | "suggested" | "applied" | "needs_input" | "rejected";
  titleRu: string;
  textRu: string;
  missingData: string[];
  actions: ("accept" | "edit" | "remove" | "choose_target")[];
  visibleAsCard: false;
};

export type DraftMediaBundle = {
  draftId: string;
  mediaAssetIds: string[];
  mediaLinkIds: string[];
  target: "request_draft" | "work" | "marketplace_product" | "act_draft" | "report_draft";
  sendWithDraft: true;
  finalLinkRequiresHuman: true;
};

export type LiveRouteMediaEntrypointSnapshot = {
  photoCount: number;
  videoCount: number;
  mediaAssetIds: string[];
  mediaAssets?: {
    mediaAssetId: string;
    mediaKind: "photo" | "video";
  }[];
  mediaPublicUrls?: string[];
  bundle?: DraftMediaBundle;
  suggestion?: InlineMediaSuggestion;
};

export type LiveRouteMediaUploadResult = {
  mediaAssetId: string;
  publicUrl?: string;
  mediaKind?: "photo" | "video";
  durationMs?: number;
  width?: number;
  height?: number;
  mimeType?: string;
};

export type LiveRouteMediaPickInput = {
  mediaKind: "photo" | "video";
  source: "camera" | "library";
};

export type LiveRouteMediaDraftItem = {
  mediaAssetId: string;
  mediaKind: "photo" | "video";
  publicUrl: string | null;
  uploadStatus: "uploaded";
  durationMs: number | null;
  width: number | null;
  height: number | null;
};

export type DirectMediaCopy = {
  testID: string;
  targetType: CompactMediaButtonsProps["targetType"];
  title?: string;
  photoButtonLabel?: string;
  videoButtonLabel?: string;
  checkingText?: string;
  countPrefix?: string;
  introLines: string[];
  positionLines: string[];
  photoCount: number;
  videoCount: number;
  draftId?: string;
  suggestion: InlineMediaSuggestion;
  bundle?: DraftMediaBundle;
  statusLine?: string;
};

export type LiveRouteMediaEntrypointPanelState = {
  suggestionVisible: boolean;
  checking: boolean;
  mediaAssetIds: string[];
  photoAssetIds: string[];
  videoAssetIds: string[];
  mediaPublicUrls: string[];
  photoPublicUrls: string[];
  videoPublicUrls: string[];
  mediaItems: LiveRouteMediaDraftItem[];
  previewItemId: string | null;
  errorText: string | null;
};

export const buttonLabels: CompactMediaButtonsProps["labels"] = {
  photo: "Фото",
  video: "Видео",
};

export function createBundle(
  draftId: string,
  target: DraftMediaBundle["target"],
  mediaAssetIds: string[],
  mediaLinkIds: string[] = [],
): DraftMediaBundle {
  return {
    draftId,
    mediaAssetIds,
    mediaLinkIds,
    target,
    sendWithDraft: true,
    finalLinkRequiresHuman: true,
  };
}

export function toBundleTarget(targetType: DirectMediaCopy["targetType"]): DraftMediaBundle["target"] | null {
  if (targetType === "request_draft") return "request_draft";
  if (targetType === "work") return "work";
  if (targetType === "marketplace_product") return "marketplace_product";
  if (targetType === "act") return "act_draft";
  if (targetType === "report") return "report_draft";
  return null;
}

export function copyForVariant(variant: LiveRouteMediaEntrypointVariant): DirectMediaCopy {
  if (variant === "marketplace") {
    return {
      testID: "marketplace.media.entrypoints",
      targetType: "marketplace_product",
      title: "Фото и видео",
      photoButtonLabel: "Фото",
      videoButtonLabel: "Видео",
      checkingText: "Проверяю товар...",
      introLines: [`До ${MARKET_ADD_MEDIA_LIMITS.maxPhotos} фото · видео до ${MARKET_ADD_MEDIA_LIMITS.maxVideoDurationMs / 1000} сек`],
      positionLines: [],
      photoCount: 0,
      videoCount: 0,
      draftId: "marketplace-product-draft",
      suggestion: {
        mediaAssetId: "",
        targetType: "marketplace_product",
        status: "suggested",
        titleRu: "Заполнено по фото · проверьте данные",
        textRu: "Позиция: профиль металлический для ГКЛ. Описание: металлический профиль для гипсокартонных конструкций.",
        missingData: ["цена", "остаток", "поставщик", "размер"],
        actions: ["accept", "edit", "remove"],
        visibleAsCard: false,
      },
      statusLine: "Проверьте данные перед публикацией",
    };
  }

  if (variant === "foremanMaterials") {
    return {
      testID: "foreman.materials.media.entrypoints",
      targetType: "request_draft",
      title: "Черновик заявки",
      countPrefix: "Вложения",
      introLines: ["Позиции", "Пока пусто"],
      positionLines: [],
      photoCount: 0,
      videoCount: 0,
      draftId: "request-draft-124",
      suggestion: {
        mediaAssetId: "",
        targetType: "request_draft",
        status: "suggested",
        titleRu: "Предложено по фото",
        textRu: "ГКЛ 12.5 мм. Работа: ГКЛ перегородки. Количество: укажите вручную.",
        missingData: ["количество"],
        actions: ["accept", "edit", "remove"],
        visibleAsCard: false,
      },
      statusLine: "Отправить директору",
    };
  }

  if (variant === "contractor") {
    return {
      testID: "contractor.media.entrypoints",
      targetType: "work",
      title: "Подтверждение",
      introLines: [],
      positionLines: [],
      photoCount: 0,
      videoCount: 0,
      draftId: "work-confirmation-draft",
      suggestion: {
        mediaAssetId: "",
        targetType: "work",
        status: "suggested",
        titleRu: "Фото добавлено",
        textRu: "Отправить на проверку прорабу?",
        missingData: [],
        actions: ["accept", "remove"],
        visibleAsCard: false,
      },
    };
  }

  return {
    testID: "foreman.media.entrypoints",
    targetType: "work",
    title: "Вложения",
    introLines: [],
    positionLines: [],
    photoCount: 0,
    videoCount: 0,
    draftId: "work-attachment-draft",
    suggestion: {
      mediaAssetId: "",
      targetType: "work",
      status: "suggested",
      titleRu: "Фото добавлено",
      textRu: "Похоже: работа «ГКЛ перегородки», дом 1 · этаж 1.",
      missingData: [],
      actions: ["accept", "choose_target", "remove"],
      visibleAsCard: false,
    },
  };
}

export const styles = StyleSheet.create({
  inlineSection: {
    width: "100%",
    maxWidth: 370,
    gap: 8,
  },
  marketplaceSection: {
    width: "100%",
    gap: 8,
  },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800",
  },
  smallLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
  },
  countText: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 18,
  },
  mediaButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  mediaButton: {
    width: 40,
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.14)",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 0,
  },
  checkingText: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "700",
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "700",
  },
  previewRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  previewImage: {
    width: 76,
    height: 76,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
  },
  mediaDraftItem: {
    width: 104,
    gap: 5,
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.12)",
    backgroundColor: "#FFFFFF",
  },
  mediaThumbnailButton: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaKindBadge: {
    alignSelf: "flex-start",
    color: "#0F766E",
    fontSize: 11,
    fontWeight: "800",
  },
  mediaUploadStatus: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
  },
  mediaItemActions: {
    flexDirection: "row",
    gap: 6,
  },
  mediaTinyAction: {
    width: 30,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.12)",
    backgroundColor: "#F8FAFC",
  },
  videoPreviewList: {
    gap: 6,
  },
  videoPreviewItem: {
    width: 76,
    height: 76,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    alignSelf: "flex-start",
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.12)",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 0,
  },
  videoDurationText: {
    color: "#0F766E",
    fontSize: 11,
    fontWeight: "800",
  },
  previewModalHost: {
    margin: 0,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  previewModalCard: {
    width: 420,
    maxWidth: "100%",
    gap: 12,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.12)",
    backgroundColor: "#FFFFFF",
  },
  previewModalImage: {
    width: "100%",
    height: 320,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
  },
  previewModalVideo: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.12)",
    backgroundColor: "#F8FAFC",
  },
  inlineSuggestion: {
    gap: 4,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
  },
  suggestionTitle: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "800",
  },
  suggestionText: {
    color: "#334155",
    fontSize: 12,
    lineHeight: 17,
  },
  suggestionActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 2,
  },
  inlineAction: {
    minHeight: 30,
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#0F766E",
    paddingHorizontal: 10,
  },
  inlineActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  inlineActionGhost: {
    minHeight: 30,
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.14)",
    paddingHorizontal: 10,
  },
  inlineActionGhostText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "800",
  },
  bodyText: {
    color: "#0F172A",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  emptyText: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 17,
  },
  statusLine: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "800",
  },
});
