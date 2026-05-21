import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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

type DirectMediaCopy = {
  testID: string;
  targetType: CompactMediaButtonsProps["targetType"];
  title?: string;
  countPrefix?: string;
  introLines: string[];
  positionLines: string[];
  photoCount: number;
  videoCount: number;
  suggestion: InlineMediaSuggestion;
  bundle?: DraftMediaBundle;
  statusLine?: string;
};

type LiveRouteMediaEntrypointPanelState = {
  suggestionVisible: boolean;
  checking: boolean;
};

const buttonLabels: CompactMediaButtonsProps["labels"] = {
  photo: "Фото",
  video: "Видео",
};

function createBundle(draftId: string, target: DraftMediaBundle["target"]): DraftMediaBundle {
  return {
    draftId,
    mediaAssetIds: ["media-local-photo-1"],
    mediaLinkIds: ["media-link-local-1"],
    target,
    sendWithDraft: true,
    finalLinkRequiresHuman: true,
  };
}

function copyForVariant(variant: LiveRouteMediaEntrypointVariant): DirectMediaCopy {
  if (variant === "marketplace") {
    return {
      testID: "marketplace.media.entrypoints",
      targetType: "marketplace_product",
      title: "Фото и видео",
      introLines: [`До ${MEDIA_LIMITS.maxPhotosPerGroup} фото · видео до ${MEDIA_LIMITS.maxVideoDurationMs / 1000} сек`],
      positionLines: [],
      photoCount: 0,
      videoCount: 0,
      suggestion: {
        mediaAssetId: "media-marketplace-photo-1",
        targetType: "marketplace_product",
        status: "suggested",
        titleRu: "Заполнено по фото · проверьте данные",
        textRu: "Позиция: Профиль металлический для ГКЛ. Описание: металлический профиль для гипсокартонных конструкций.",
        missingData: ["цена", "остаток", "поставщик", "размер"],
        actions: ["accept", "edit", "remove"],
        visibleAsCard: false,
      },
      bundle: createBundle("marketplace-product-draft", "marketplace_product"),
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
      suggestion: {
        mediaAssetId: "media-request-draft-photo-1",
        targetType: "request_draft",
        status: "suggested",
        titleRu: "Предложено по фото",
        textRu: "ГКЛ 12.5 мм. Работа: ГКЛ перегородки. Количество: укажите вручную.",
        missingData: ["количество"],
        actions: ["accept", "edit", "remove"],
        visibleAsCard: false,
      },
      bundle: createBundle("request-draft-124", "request_draft"),
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
      suggestion: {
        mediaAssetId: "media-contractor-work-photo-1",
        targetType: "work",
        status: "suggested",
        titleRu: "Фото добавлено",
        textRu: "Отправить на проверку прорабу?",
        missingData: [],
        actions: ["accept", "remove"],
        visibleAsCard: false,
      },
      bundle: createBundle("work-confirmation-draft", "work"),
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
    suggestion: {
      mediaAssetId: "media-work-photo-1",
      targetType: "work",
      status: "suggested",
      titleRu: "Фото добавлено",
      textRu: "Похоже: работа «ГКЛ перегородки», Дом 1 · этаж 1.",
      missingData: [],
      actions: ["accept", "choose_target", "remove"],
      visibleAsCard: false,
    },
    bundle: createBundle("work-attachment-draft", "work"),
  };
}

export class LiveRouteMediaEntrypointPanel extends React.PureComponent<
  { variant: LiveRouteMediaEntrypointVariant },
  LiveRouteMediaEntrypointPanelState
> {
  override state: LiveRouteMediaEntrypointPanelState = {
    suggestionVisible: false,
    checking: false,
  };

  private suggestionTimer: ReturnType<typeof setTimeout> | null = null;

  override componentWillUnmount() {
    if (this.suggestionTimer) {
      clearTimeout(this.suggestionTimer);
      this.suggestionTimer = null;
    }
  }

  private readonly addMedia = () => {
    if (this.suggestionTimer) {
      clearTimeout(this.suggestionTimer);
    }
    this.setState({ checking: true, suggestionVisible: false });
    this.suggestionTimer = setTimeout(() => {
      this.suggestionTimer = null;
      this.setState({ checking: false, suggestionVisible: true });
    }, 250);
  };

  override render() {
    const copy = copyForVariant(this.props.variant);
    const mediaProps: CompactMediaButtonsProps = {
      targetType: copy.targetType,
      photoCount: this.state.suggestionVisible ? 1 : copy.photoCount,
      videoCount: copy.videoCount,
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
        {this.state.checking ? <Text style={styles.checkingText}>Фото добавлено · проверяю...</Text> : null}
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

  private renderButtons(copy: DirectMediaCopy) {
    return (
      <View style={styles.mediaButtons}>
        <Pressable
          testID={`${copy.testID}.photo`}
          accessibilityRole="button"
          accessibilityLabel="Фото"
          onPress={this.addMedia}
          style={styles.mediaButton}
        >
          <Ionicons name="camera-outline" size={17} color="#0F172A" />
          <Text style={styles.mediaButtonText}>Фото</Text>
        </Pressable>
        <Pressable
          testID={`${copy.testID}.video`}
          accessibilityRole="button"
          accessibilityLabel="Видео"
          onPress={this.addMedia}
          style={styles.mediaButton}
        >
          <Ionicons name="videocam-outline" size={17} color="#0F172A" />
          <Text style={styles.mediaButtonText}>Видео</Text>
        </Pressable>
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
          <Pressable accessibilityRole="button" style={styles.inlineAction}>
            <Text style={styles.inlineActionText}>Оставить</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.inlineActionGhost}>
            <Text style={styles.inlineActionGhostText}>Изменить</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.inlineActionGhost}>
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
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.14)",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
  },
  mediaButtonText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "800",
  },
  checkingText: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "700",
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
