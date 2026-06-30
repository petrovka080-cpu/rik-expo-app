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
  mediaDraftCount?: number;
  uploadInProgress?: boolean;
  failedMediaCount?: number;
  mediaAssetIds: string[];
  mediaAssets?: {
    mediaAssetId: string;
    mediaKind: "photo" | "video";
  }[];
  mediaPublicUrls?: string[];
  photoPublicUrls?: string[];
  videoPublicUrls?: string[];
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

export type LiveRouteMediaPickResult = LiveRouteMediaUploadResult | LiveRouteMediaUploadResult[] | null;

export type LiveRouteMediaLocalPreview = {
  mediaKind: "photo" | "video";
  localPreviewUrl: string;
  mimeType?: string;
  fileName?: string;
};

export type LiveRouteMediaPickInput = {
  mediaKind: "photo" | "video";
  source: "camera" | "library";
  selectionLimit?: number;
  onLocalPreview?: (preview: LiveRouteMediaLocalPreview) => void;
};

export type LiveRouteMediaDraftItem = {
  mediaAssetId: string;
  mediaKind: "photo" | "video";
  publicUrl: string | null;
  uploadStatus: "uploading" | "uploaded" | "failed";
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
  mediaPickerVisible: boolean;
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
      title: "Добавьте фото и видео",
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
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.10)",
    backgroundColor: "#FFFFFF",
    padding: 12,
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
  marketplaceIntro: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  addMediaTile: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(22,163,74,0.55)",
    backgroundColor: "rgba(240,253,244,0.82)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addMediaTileDisabled: {
    opacity: 0.6,
  },
  addMediaTileIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#16A34A",
  },
  addMediaTileBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  addMediaTileTitle: {
    color: "#0F172A",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "900",
  },
  addMediaTileSub: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  mediaPickerHost: {
    margin: 0,
    alignItems: "center",
    justifyContent: "flex-end",
    padding: 12,
  },
  mediaPickerSheet: {
    width: 460,
    maxWidth: "100%",
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.12)",
    backgroundColor: "#FFFFFF",
    padding: 14,
  },
  mediaPickerTitle: {
    color: "#0F172A",
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900",
  },
  mediaPickerOption: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.12)",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  mediaPickerOptionDisabled: {
    opacity: 0.52,
  },
  mediaPickerOptionIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
  },
  mediaPickerOptionBody: {
    flex: 1,
    minWidth: 0,
  },
  mediaPickerOptionTitle: {
    color: "#0F172A",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
  },
  mediaPickerOptionSub: {
    color: "#64748B",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
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
  previewEmptySlot: {
    width: 76,
    height: 76,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(148,163,184,0.8)",
    backgroundColor: "rgba(248,250,252,0.72)",
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
  mediaDraftCoverItem: {
    borderColor: "rgba(22,163,74,0.45)",
    backgroundColor: "#F0FDF4",
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
  mediaCoverBadge: {
    alignSelf: "flex-start",
    color: "#166534",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "900",
    borderRadius: 999,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mediaUploadStatus: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
  },
  mediaUploadStatusFailed: {
    color: "#B91C1C",
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
  videoDurationBadge: {
    alignSelf: "flex-start",
    color: "#0F766E",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "900",
    borderRadius: 999,
    backgroundColor: "#CCFBF1",
    paddingHorizontal: 6,
    paddingVertical: 2,
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
  previewModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  previewKindBadge: {
    color: "#0F766E",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "900",
    borderRadius: 999,
    backgroundColor: "#CCFBF1",
    paddingHorizontal: 8,
    paddingVertical: 3,
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
  previewModalActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
  inlineActionDanger: {
    minHeight: 30,
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(185,28,28,0.28)",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 10,
  },
  inlineActionDangerText: {
    color: "#B91C1C",
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
