import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";

import { MARKET_ADD_MEDIA_LIMITS, MEDIA_LIMITS } from "../../../lib/media/mediaLimits";
import React19SafeModal from "../../../ui/React19SafeModal";
import {
  buttonLabels,
  copyForVariant,
  createBundle,
  toBundleTarget,
  type CompactMediaButtonsProps,
  type DirectMediaCopy,
  type LiveRouteMediaDraftItem,
  type LiveRouteMediaEntrypointPanelState,
  type LiveRouteMediaEntrypointSnapshot,
  type LiveRouteMediaEntrypointVariant,
  type LiveRouteMediaPickInput,
  type LiveRouteMediaUploadResult,
  styles,
} from "./LiveRouteMediaEntrypointPanel.model";

export type {
  CompactMediaButtonsProps,
  DraftMediaBundle,
  InlineMediaSuggestion,
  LiveRouteMediaDraftItem,
  LiveRouteMediaEntrypointSnapshot,
  LiveRouteMediaPickInput,
  LiveRouteMediaUploadResult,
} from "./LiveRouteMediaEntrypointPanel.model";

function isStableMarketplaceMediaUrl(value: string | null | undefined): boolean {
  const url = String(value ?? "").trim();
  return Boolean(url) && !/^(blob|data|file):/i.test(url);
}

function summarizeMediaItems(mediaItems: readonly LiveRouteMediaDraftItem[]) {
  const photoItems = mediaItems.filter((item) => item.mediaKind === "photo");
  const videoItems = mediaItems.filter((item) => item.mediaKind === "video");
  return {
    mediaAssetIds: mediaItems.map((item) => item.mediaAssetId),
    photoAssetIds: photoItems.map((item) => item.mediaAssetId),
    videoAssetIds: videoItems.map((item) => item.mediaAssetId),
    mediaPublicUrls: mediaItems.flatMap((item) => item.publicUrl ? [item.publicUrl] : []),
    photoPublicUrls: photoItems.flatMap((item) => item.publicUrl ? [item.publicUrl] : []),
    videoPublicUrls: videoItems.flatMap((item) => item.publicUrl ? [item.publicUrl] : []),
  };
}

function createDraftItem(
  input: LiveRouteMediaPickInput,
  uploaded: LiveRouteMediaUploadResult,
  options: { requireStablePublicUrl: boolean },
): LiveRouteMediaDraftItem {
  const uploadedKind = uploaded.mediaKind ?? input.mediaKind;
  if (uploadedKind !== input.mediaKind) {
    throw new Error(`MEDIA_KIND_ROUTING_MISMATCH:${input.mediaKind}->${uploadedKind}`);
  }
  if (options.requireStablePublicUrl && !isStableMarketplaceMediaUrl(uploaded.publicUrl)) {
    throw new Error("MARKETPLACE_MEDIA_STABLE_PUBLIC_URL_MISSING");
  }
  return {
    mediaAssetId: uploaded.mediaAssetId,
    mediaKind: input.mediaKind,
    publicUrl: uploaded.publicUrl ?? null,
    uploadStatus: "uploaded",
    durationMs: typeof uploaded.durationMs === "number" && Number.isFinite(uploaded.durationMs)
      ? Math.max(0, Math.round(uploaded.durationMs))
      : null,
    width: typeof uploaded.width === "number" && Number.isFinite(uploaded.width)
      ? Math.max(0, Math.round(uploaded.width))
      : null,
    height: typeof uploaded.height === "number" && Number.isFinite(uploaded.height)
      ? Math.max(0, Math.round(uploaded.height))
      : null,
  };
}

function mediaCountLimit(input: LiveRouteMediaPickInput, copy: DirectMediaCopy): number {
  if (copy.targetType === "marketplace_product") {
    return input.mediaKind === "photo"
      ? MARKET_ADD_MEDIA_LIMITS.maxPhotos
      : MARKET_ADD_MEDIA_LIMITS.maxVideos;
  }
  return input.mediaKind === "photo"
    ? MEDIA_LIMITS.maxPhotosPerGroup
    : MEDIA_LIMITS.maxVideosPerGroup;
}

function formatDuration(durationMs: number | null): string {
  if (durationMs == null) return "до 15 сек";
  return `${Math.max(1, Math.round(durationMs / 1000))} сек`;
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
    mediaItems: [],
    previewItemId: null,
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
    const copy = copyForVariant(this.props.variant);
    const currentCount = input.mediaKind === "photo"
      ? this.state.mediaItems.filter((item) => item.mediaKind === "photo").length
      : this.state.mediaItems.filter((item) => item.mediaKind === "video").length;
    const maxCount = mediaCountLimit(input, copy);
    if (currentCount >= maxCount) {
      this.setState({
        checking: false,
        suggestionVisible: this.state.mediaItems.length > 0,
        errorText: input.mediaKind === "photo"
          ? `Можно добавить не больше ${maxCount} фото.`
          : "Можно добавить не больше 1 видео.",
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
        const draftItem = createDraftItem(input, uploaded, {
          requireStablePublicUrl: copy.targetType === "marketplace_product",
        });
        this.setState((prev) => {
          const mediaItems = [...prev.mediaItems, draftItem];
          return {
            checking: false,
            suggestionVisible: true,
            errorText: null,
            ...summarizeMediaItems(mediaItems),
            mediaItems,
          };
        }, () => {
          this.emitSnapshot();
        });
      } catch {
        this.setState({
          checking: false,
          suggestionVisible: this.state.mediaItems.length > 0,
          errorText: input.mediaKind === "photo" ? "Не удалось загрузить фото." : "Не удалось загрузить видео.",
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

  private readonly replaceMedia = async (mediaAssetId?: string) => {
    if (this.suggestionTimer) {
      clearTimeout(this.suggestionTimer);
      this.suggestionTimer = null;
    }
    const currentItem = mediaAssetId
      ? this.state.mediaItems.find((item) => item.mediaAssetId === mediaAssetId)
      : this.state.mediaItems[0];
    const input: LiveRouteMediaPickInput = {
      mediaKind: currentItem?.mediaKind ?? "photo",
      source: "library",
    };
    this.setState({ checking: true, errorText: null });
    if (this.props.onPickMedia || this.props.onPickPhoto) {
      try {
        const uploaded = await this.pickMedia(input);
        if (!uploaded) {
          this.setState({ checking: false }, () => {
            this.emitSnapshot();
          });
          return;
        }
        const draftItem = createDraftItem(input, uploaded, {
          requireStablePublicUrl: copyForVariant(this.props.variant).targetType === "marketplace_product",
        });
        this.setState((prev) => {
          const replaced = mediaAssetId
            ? prev.mediaItems.map((item) => item.mediaAssetId === mediaAssetId ? draftItem : item)
            : prev.mediaItems.length > 0
              ? [draftItem, ...prev.mediaItems.slice(1)]
              : [draftItem];
          return {
            checking: false,
            suggestionVisible: true,
            errorText: null,
            previewItemId: prev.previewItemId === mediaAssetId ? draftItem.mediaAssetId : prev.previewItemId,
            ...summarizeMediaItems(replaced),
            mediaItems: replaced,
          };
        }, () => {
          this.emitSnapshot();
        });
      } catch {
        this.setState({
          checking: false,
          errorText: input.mediaKind === "photo" ? "Не удалось заменить фото." : "Не удалось заменить видео.",
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
      mediaItems: [],
      previewItemId: null,
      errorText: null,
    }, () => {
      this.emitSnapshot();
    });
  };

  private readonly removeMediaItem = (mediaAssetId: string) => {
    if (this.suggestionTimer) {
      clearTimeout(this.suggestionTimer);
      this.suggestionTimer = null;
    }
    this.setState((prev) => {
      const mediaItems = prev.mediaItems.filter((item) => item.mediaAssetId !== mediaAssetId);
      return {
        suggestionVisible: mediaItems.length > 0,
        checking: false,
        errorText: null,
        previewItemId: prev.previewItemId === mediaAssetId ? null : prev.previewItemId,
        ...summarizeMediaItems(mediaItems),
        mediaItems,
      };
    }, () => {
      this.emitSnapshot();
    });
  };

  private emitSnapshot() {
    const copy = copyForVariant(this.props.variant);
    const mediaItems = this.state.mediaItems;
    const hasMedia = mediaItems.length > 0;
    const mediaAssetIds = mediaItems.map((item) => item.mediaAssetId);
    const bundleTarget = copy.draftId ? toBundleTarget(copy.targetType) : null;
    const bundle =
      hasMedia && copy.draftId && bundleTarget
        ? createBundle(copy.draftId, bundleTarget, mediaAssetIds)
        : undefined;
    const suggestion =
      this.state.suggestionVisible && hasMedia
        ? {
            ...copy.suggestion,
            mediaAssetId: mediaAssetIds[0] ?? "",
          }
        : undefined;
    const mediaAssets = mediaItems.map((item) => ({
      mediaAssetId: item.mediaAssetId,
      mediaKind: item.mediaKind,
    }));
    const photoCount = mediaItems.filter((item) => item.mediaKind === "photo").length;
    const videoCount = mediaItems.filter((item) => item.mediaKind === "video").length;
    this.props.onSnapshotChange?.({
      photoCount: hasMedia ? photoCount : copy.photoCount,
      videoCount: hasMedia ? videoCount : copy.videoCount,
      mediaAssetIds: hasMedia ? mediaAssetIds : [],
      mediaAssets: hasMedia ? mediaAssets : [],
      mediaPublicUrls: hasMedia ? mediaItems.flatMap((item) => item.publicUrl ? [item.publicUrl] : []) : [],
      bundle,
      suggestion,
    });
  }

  override render() {
    const copy = copyForVariant(this.props.variant);
    const marketplace = copy.targetType === "marketplace_product";
    const mediaProps: CompactMediaButtonsProps = {
      targetType: copy.targetType,
      photoCount: this.state.mediaItems.length > 0 ? this.state.photoAssetIds.length : copy.photoCount,
      videoCount: this.state.mediaItems.length > 0 ? this.state.videoAssetIds.length : copy.videoCount,
      maxPhotos: marketplace ? MARKET_ADD_MEDIA_LIMITS.maxPhotos : MEDIA_LIMITS.maxPhotosPerGroup,
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
        {this.renderMediaStrip(copy)}
        {this.renderPreviewModal(copy)}
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

  private renderMediaStrip(copy: DirectMediaCopy) {
    if (copy.targetType !== "marketplace_product" || this.state.mediaItems.length < 1) {
      return null;
    }

    return (
      <View testID={`${copy.testID}.thumbnail-strip`} style={styles.previewRow}>
        {this.state.mediaItems.map((item, index) => (
          <View
            key={item.mediaAssetId}
            testID={`${copy.testID}.thumbnail.${index}`}
            style={styles.mediaDraftItem}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.mediaKind === "photo" ? "Открыть фото" : "Открыть видео"}
              testID={`${copy.testID}.thumbnail.open.${index}`}
              onPress={() => {
                this.setState({ previewItemId: item.mediaAssetId });
              }}
              style={styles.mediaThumbnailButton}
            >
              {item.mediaKind === "photo" && item.publicUrl ? (
                <Image
                  testID={`${copy.testID}.preview-image.${index}`}
                  source={{ uri: item.publicUrl }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.videoPreviewItem}>
                  <Ionicons name="videocam-outline" size={18} color="#0F766E" />
                  <Text style={styles.videoDurationText}>{formatDuration(item.durationMs)}</Text>
                </View>
              )}
            </Pressable>
            <Text style={styles.mediaKindBadge}>
              {item.mediaKind === "photo" ? "Фото" : "Видео"}
            </Text>
            <Text style={styles.mediaUploadStatus}>Загружено</Text>
            <View style={styles.mediaItemActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Заменить медиа"
                testID={`${copy.testID}.thumbnail.replace.${index}`}
                onPress={() => {
                  void this.replaceMedia(item.mediaAssetId);
                }}
                style={styles.mediaTinyAction}
              >
                <Ionicons name="swap-horizontal-outline" size={15} color="#334155" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Удалить медиа"
                testID={`${copy.testID}.thumbnail.remove.${index}`}
                onPress={() => {
                  this.removeMediaItem(item.mediaAssetId);
                }}
                style={styles.mediaTinyAction}
              >
                <Ionicons name="trash-outline" size={15} color="#B91C1C" />
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    );
  }

  private renderPreviewModal(copy: DirectMediaCopy) {
    if (copy.targetType !== "marketplace_product" || !this.state.previewItemId) {
      return null;
    }
    const item = this.state.mediaItems.find((entry) => entry.mediaAssetId === this.state.previewItemId);
    if (!item) return null;

    return (
      <React19SafeModal
        isVisible
        onBackdropPress={() => this.setState({ previewItemId: null })}
        onBackButtonPress={() => this.setState({ previewItemId: null })}
        backdropOpacity={0.55}
        hideModalContentWhileAnimating
        style={styles.previewModalHost}
      >
        <View testID={`${copy.testID}.preview-modal`} style={styles.previewModalCard}>
          <Text style={styles.suggestionTitle}>{item.mediaKind === "photo" ? "Фото" : "Видео"}</Text>
          {item.mediaKind === "photo" && item.publicUrl ? (
            <Image
              testID={`${copy.testID}.preview-modal.image`}
              source={{ uri: item.publicUrl }}
              style={styles.previewModalImage}
              resizeMode="contain"
            />
          ) : (
            <View testID={`${copy.testID}.preview-modal.video`} style={styles.previewModalVideo}>
              <Ionicons name="videocam-outline" size={32} color="#0F766E" />
              <Text style={styles.suggestionText}>Видео {formatDuration(item.durationMs)}</Text>
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            testID={`${copy.testID}.preview-modal.close`}
            onPress={() => this.setState({ previewItemId: null })}
            style={styles.inlineAction}
          >
            <Text style={styles.inlineActionText}>Закрыть</Text>
          </Pressable>
        </View>
      </React19SafeModal>
    );
  }

  private renderButtons(copy: DirectMediaCopy) {
    return (
      <View style={styles.mediaButtons}>
        <Pressable
          testID={`${copy.testID}.camera_photo_button`}
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
            testID={`${copy.testID}.gallery_photo_button`}
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
          testID={`${copy.testID}.camera_video_button`}
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
            testID={`${copy.testID}.gallery_video_button`}
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

export default LiveRouteMediaEntrypointPanel;
