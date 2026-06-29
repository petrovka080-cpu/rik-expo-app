import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { MEDIA_LIMITS } from "../../../lib/media/mediaLimits";

type LiveRouteMediaEntrypointVariant = "foreman" | "foremanMaterials" | "marketplace" | "contractor";

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
  maxPhotos: 5;
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
};

export type LiveRouteMediaPickInput = {
  mediaKind: "photo" | "video";
  source: "camera" | "library";
};

type DirectMediaCopy = {
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

type LiveRouteMediaEntrypointPanelState = {
  suggestionVisible: boolean;
  checking: boolean;
  mediaAssetIds: string[];
  photoAssetIds: string[];
  videoAssetIds: string[];
  mediaPublicUrls: string[];
  photoPublicUrls: string[];
  videoPublicUrls: string[];
  errorText: string | null;
};

const buttonLabels: CompactMediaButtonsProps["labels"] = {
  photo: "Фото",
  video: "Видео",
};

function createBundle(
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

function toBundleTarget(targetType: DirectMediaCopy["targetType"]): DraftMediaBundle["target"] | null {
  if (targetType === "request_draft") return "request_draft";
  if (targetType === "work") return "work";
  if (targetType === "marketplace_product") return "marketplace_product";
  if (targetType === "act") return "act_draft";
  if (targetType === "report") return "report_draft";
  return null;
}

function copyForVariant(variant: LiveRouteMediaEntrypointVariant): DirectMediaCopy {
  if (variant === "marketplace") {
    return {
      testID: "marketplace.media.entrypoints",
      targetType: "marketplace_product",
      title: "Фото и видео",
      photoButtonLabel: "＋ Фото",
      videoButtonLabel: "＋ Видео",
      checkingText: "Проверяю товар...",
      introLines: [`До ${MEDIA_LIMITS.maxPhotosPerGroup} фото · видео до ${MEDIA_LIMITS.maxVideoDurationMs / 1000} сек`],
      positionLines: [],
      photoCount: 0,
      videoCount: 0,
      draftId: "marketplace-product-draft",
      suggestion: {
        mediaAssetId: "",
        targetType: "marketplace_product",
        status: "suggested",
        titleRu: "Заполнено по фото · проверьте данные",
        textRu: "Позиция: Профиль металлический для ГКЛ. Описание: металлический профиль для гипсокартонных конструкций.",
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
      textRu: "Похоже: работа «ГКЛ перегородки», Дом 1 · этаж 1.",
      missingData: [],
      actions: ["accept", "choose_target", "remove"],
      visibleAsCard: false,
    },
  };
}

export class LiveRouteMediaEntrypointPanel extends React.PureComponent<
  {
    variant: LiveRouteMediaEntrypointVariant;
    onPickMedia?: (input: LiveRouteMediaPickInput) => Promise<LiveRouteMediaUploadResult | null>;
    onPickPhoto?: () => Promise<LiveRouteMediaUploadResult | null>;
    onSnapshotChange?: (snapshot: LiveRouteMediaEntrypointSnapshot) => void;
  },
  LiveRouteMediaEntrypointPanelState
> {
  override state: LiveRouteMediaEntrypointPanelState = {
    suggestionVisible: false,
    checking: false,
    mediaAssetIds: [],
    photoAssetIds: [],
    videoAssetIds: [],
    mediaPublicUrls: [],
    photoPublicUrls: [],
    videoPublicUrls: [],
    errorText: null,
  };

  private suggestionTimer: ReturnType<typeof setTimeout> | null = null;

  override componentWillUnmount() {
    if (this.suggestionTimer) {
      clearTimeout(this.suggestionTimer);
      this.suggestionTimer = null;
    }
  }

  private async pickMedia(input: LiveRouteMediaPickInput): Promise<LiveRouteMediaUploadResult | null> {
    if (this.props.onPickMedia) {
      return this.props.onPickMedia(input);
    }
    if (input.mediaKind === "photo" && this.props.onPickPhoto) {
      return this.props.onPickPhoto();
    }
    return null;
  }

  private readonly addMedia = async (input: LiveRouteMediaPickInput) => {
    if (this.suggestionTimer) {
      clearTimeout(this.suggestionTimer);
    }
    const currentCount = input.mediaKind === "photo"
      ? this.state.photoAssetIds.length
      : this.state.videoAssetIds.length;
    const maxCount = input.mediaKind === "photo"
      ? MEDIA_LIMITS.maxPhotosPerGroup
      : MEDIA_LIMITS.maxVideosPerGroup;
    if (currentCount >= maxCount) {
      this.setState({
        checking: false,
        suggestionVisible: true,
        errorText: "Р”РѕСЃС‚РёРіРЅСѓС‚ Р»РёРјРёС‚ С„РѕС‚Рѕ.",
      }, () => {
        this.emitSnapshot();
      });
      return;
    }
    this.setState({ checking: true, suggestionVisible: false, errorText: null });
    if (this.props.onPickMedia || this.props.onPickPhoto) {
      try {
        const uploaded = await this.pickMedia(input);
        if (!uploaded) {
          this.setState({ checking: false }, () => {
            this.emitSnapshot();
          });
          return;
        }
        const uploadedKind = uploaded.mediaKind ?? input.mediaKind;
        this.setState((prev) => ({
          checking: false,
          suggestionVisible: true,
          mediaAssetIds: [...prev.mediaAssetIds, uploaded.mediaAssetId],
          photoAssetIds: uploadedKind === "photo" ? [...prev.photoAssetIds, uploaded.mediaAssetId] : prev.photoAssetIds,
          videoAssetIds: uploadedKind === "video" ? [...prev.videoAssetIds, uploaded.mediaAssetId] : prev.videoAssetIds,
          mediaPublicUrls: uploaded.publicUrl ? [...prev.mediaPublicUrls, uploaded.publicUrl] : prev.mediaPublicUrls,
          photoPublicUrls: uploaded.publicUrl && uploadedKind === "photo" ? [...prev.photoPublicUrls, uploaded.publicUrl] : prev.photoPublicUrls,
          videoPublicUrls: uploaded.publicUrl && uploadedKind === "video" ? [...prev.videoPublicUrls, uploaded.publicUrl] : prev.videoPublicUrls,
        }), () => {
          this.emitSnapshot();
        });
      } catch {
        this.setState({
          checking: false,
          suggestionVisible: false,
          errorText: "Не удалось загрузить фото.",
        }, () => {
          this.emitSnapshot();
        });
      }
      return;
    }
    this.suggestionTimer = setTimeout(() => {
      this.suggestionTimer = null;
      this.setState({ checking: false, suggestionVisible: true }, () => {
        this.emitSnapshot();
      });
    }, 250);
  };

  private readonly replaceMedia = async () => {
    if (this.suggestionTimer) {
      clearTimeout(this.suggestionTimer);
      this.suggestionTimer = null;
    }
    this.setState({ checking: true, errorText: null });
    if (this.props.onPickMedia || this.props.onPickPhoto) {
      try {
        const uploaded = await this.pickMedia({ mediaKind: "photo", source: "library" });
        if (!uploaded) {
          this.setState({ checking: false }, () => {
            this.emitSnapshot();
          });
          return;
        }
        this.setState({
          checking: false,
          suggestionVisible: true,
          mediaAssetIds: [uploaded.mediaAssetId],
          photoAssetIds: [uploaded.mediaAssetId],
          videoAssetIds: [],
          mediaPublicUrls: uploaded.publicUrl ? [uploaded.publicUrl] : [],
          photoPublicUrls: uploaded.publicUrl ? [uploaded.publicUrl] : [],
          videoPublicUrls: [],
        }, () => {
          this.emitSnapshot();
        });
      } catch {
        this.setState({
          checking: false,
          errorText: "РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РјРµРЅРёС‚СЊ С„РѕС‚Рѕ.",
        }, () => {
          this.emitSnapshot();
        });
      }
      return;
    }
    this.setState({ checking: false, suggestionVisible: true, errorText: null }, () => {
      this.emitSnapshot();
    });
  };

  private readonly removeMedia = () => {
    if (this.suggestionTimer) {
      clearTimeout(this.suggestionTimer);
      this.suggestionTimer = null;
    }
    this.setState({
      suggestionVisible: false,
      checking: false,
      mediaAssetIds: [],
      photoAssetIds: [],
      videoAssetIds: [],
      mediaPublicUrls: [],
      photoPublicUrls: [],
      videoPublicUrls: [],
      errorText: null,
    }, () => {
      this.emitSnapshot();
    });
  };

  private emitSnapshot() {
    const copy = copyForVariant(this.props.variant);
    const mediaAssetIds = this.state.mediaAssetIds;
    const bundleTarget = copy.draftId ? toBundleTarget(copy.targetType) : null;
    const bundle =
      this.state.suggestionVisible && copy.draftId && bundleTarget && mediaAssetIds.length
        ? createBundle(copy.draftId, bundleTarget, mediaAssetIds)
        : undefined;
    const suggestion =
      this.state.suggestionVisible
        ? {
            ...copy.suggestion,
            mediaAssetId: mediaAssetIds[0] ?? "",
          }
        : undefined;
    const mediaAssets = [
      ...this.state.photoAssetIds.map((mediaAssetId) => ({ mediaAssetId, mediaKind: "photo" as const })),
      ...this.state.videoAssetIds.map((mediaAssetId) => ({ mediaAssetId, mediaKind: "video" as const })),
    ];
    this.props.onSnapshotChange?.({
      photoCount: this.state.suggestionVisible ? this.state.photoAssetIds.length : copy.photoCount,
      videoCount: this.state.suggestionVisible ? this.state.videoAssetIds.length : copy.videoCount,
      mediaAssetIds: this.state.suggestionVisible ? mediaAssetIds : [],
      mediaAssets: this.state.suggestionVisible ? mediaAssets : [],
      mediaPublicUrls: this.state.suggestionVisible ? this.state.mediaPublicUrls : [],
      bundle,
      suggestion,
    });
  }

  override render() {
    const copy = copyForVariant(this.props.variant);
    const mediaProps: CompactMediaButtonsProps = {
      targetType: copy.targetType,
      photoCount: this.state.suggestionVisible ? this.state.photoAssetIds.length : copy.photoCount,
      videoCount: this.state.suggestionVisible ? this.state.videoAssetIds.length : copy.videoCount,
      maxPhotos: MEDIA_LIMITS.maxPhotosPerGroup,
      maxVideos: MEDIA_LIMITS.maxVideosPerGroup,
      showLabels: true,
      labels: buttonLabels,
      compact: true,
    };

    return (
      <View
        testID={copy.testID}
        style={copy.targetType === "marketplace_product" ? styles.marketplaceSection : styles.inlineSection}
      >
        {copy.title ? <Text style={styles.sectionTitle}>{copy.title}</Text> : null}
        {copy.countPrefix ? <Text style={styles.smallLabel}>{copy.countPrefix}</Text> : null}
        {this.renderCounts(mediaProps)}
        {this.renderButtons(copy)}
        {this.state.checking ? (
          <Text style={styles.checkingText}>
            {copy.checkingText ?? "Фото добавлено · проверяю..."}
          </Text>
        ) : null}
        {this.state.errorText ? (
          <Text style={styles.errorText}>{this.state.errorText}</Text>
        ) : null}
        {this.renderPreview(copy)}
        {this.renderVideoPreview(copy)}
        {this.renderSuggestion(copy)}
        {copy.introLines.map((line) => (
          <Text key={line} style={line === "Пока пусто" ? styles.emptyText : styles.bodyText}>
            {line}
          </Text>
        ))}
        {copy.statusLine ? <Text style={styles.statusLine}>{copy.statusLine}</Text> : null}
      </View>
    );
  }

  private renderCounts(mediaProps: CompactMediaButtonsProps) {
    return (
      <Text style={styles.countText}>
        Фото: {mediaProps.photoCount} / {mediaProps.maxPhotos} · Видео: {mediaProps.videoCount} / {mediaProps.maxVideos}
      </Text>
    );
  }

  private renderPreview(copy: DirectMediaCopy) {
    if (copy.targetType !== "marketplace_product" || this.state.photoPublicUrls.length < 1) {
      return null;
    }

    return (
      <View testID={`${copy.testID}.preview-list`} style={styles.previewRow}>
        {this.state.photoPublicUrls.map((url, index) => (
          <Image
            key={`${url}:${index}`}
            testID={`${copy.testID}.preview-image.${index}`}
            source={{ uri: url }}
            style={styles.previewImage}
            resizeMode="cover"
          />
        ))}
      </View>
    );
  }

  private renderVideoPreview(copy: DirectMediaCopy) {
    if (copy.targetType !== "marketplace_product" || this.state.videoPublicUrls.length < 1) {
      return null;
    }

    return (
      <View testID={`${copy.testID}.video-preview-list`} style={styles.videoPreviewList}>
        {this.state.videoPublicUrls.map((url, index) => (
          <View key={`${url}:${index}`} style={styles.videoPreviewItem}>
            <Ionicons name="videocam-outline" size={16} color="#0F766E" />
          </View>
        ))}
      </View>
    );
  }

  private renderButtons(copy: DirectMediaCopy) {
    return (
      <View style={styles.mediaButtons}>
        <Pressable
          testID={`${copy.testID}.photo`}
          accessibilityRole="button"
          accessibilityLabel={copy.photoButtonLabel ?? "Фото"}
          onPress={() => {
            void this.addMedia({ mediaKind: "photo", source: "camera" });
          }}
          style={styles.mediaButton}
        >
          <Ionicons name="camera-outline" size={17} color="#0F172A" />
        </Pressable>
        {copy.targetType === "marketplace_product" ? (
          <Pressable
            testID={`${copy.testID}.photo.library`}
            accessibilityRole="button"
            accessibilityLabel="Фото из галереи"
            onPress={() => {
              void this.addMedia({ mediaKind: "photo", source: "library" });
            }}
            style={styles.mediaButton}
          >
            <Ionicons name="images-outline" size={17} color="#0F172A" />
          </Pressable>
        ) : null}
        <Pressable
          testID={`${copy.testID}.video`}
          accessibilityRole="button"
          accessibilityLabel={copy.videoButtonLabel ?? "Видео"}
          onPress={() => {
            void this.addMedia({ mediaKind: "video", source: "camera" });
          }}
          style={styles.mediaButton}
        >
          <Ionicons name="videocam-outline" size={17} color="#0F172A" />
        </Pressable>
        {copy.targetType === "marketplace_product" ? (
          <Pressable
            testID={`${copy.testID}.video.library`}
            accessibilityRole="button"
            accessibilityLabel="Видео из галереи"
            onPress={() => {
              void this.addMedia({ mediaKind: "video", source: "library" });
            }}
            style={styles.mediaButton}
          >
            <Ionicons name="film-outline" size={17} color="#0F172A" />
          </Pressable>
        ) : null}
      </View>
    );
  }

  private renderSuggestion(copy: DirectMediaCopy) {
    if (!this.state.suggestionVisible) return null;

    const missing = copy.suggestion.missingData.length
      ? `Не хватает: ${copy.suggestion.missingData.join(", ")}.`
      : "";

    return (
      <View testID={`${copy.testID}.inline-suggestion`} style={styles.inlineSuggestion}>
        <Text style={styles.suggestionTitle}>{copy.suggestion.titleRu}</Text>
        <Text style={styles.suggestionText}>{copy.suggestion.textRu}</Text>
        {missing ? <Text style={styles.suggestionText}>{missing}</Text> : null}
        <View style={styles.suggestionActions}>
          <Pressable
            accessibilityRole="button"
            testID={`${copy.testID}.suggestion.keep`}
            style={styles.inlineAction}
          >
            <Text style={styles.inlineActionText}>Оставить</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            testID={`${copy.testID}.suggestion.change`}
            onPress={() => {
              void this.replaceMedia();
            }}
            style={styles.inlineActionGhost}
          >
            <Text style={styles.inlineActionGhostText}>Изменить</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            testID={`${copy.testID}.suggestion.remove`}
            onPress={this.removeMedia}
            style={styles.inlineActionGhost}
          >
            <Text style={styles.inlineActionGhostText}>Удалить</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
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
  videoPreviewList: {
    gap: 6,
  },
  videoPreviewItem: {
    width: 34,
    height: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    gap: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.12)",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 0,
  },
  videoPreviewText: {
    display: "none",
    width: 0,
    height: 0,
    opacity: 0,
    color: "transparent",
    fontSize: 0,
    lineHeight: 0,
    fontWeight: "900",
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

export default LiveRouteMediaEntrypointPanel;
