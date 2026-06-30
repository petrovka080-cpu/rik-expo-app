import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";

import { MARKET_ADD_MEDIA_LIMITS, MEDIA_LIMITS } from "../../../lib/media/mediaLimits";
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
  type LiveRouteMediaPickResult,
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
  LiveRouteMediaPickResult,
  LiveRouteMediaUploadResult,
} from "./LiveRouteMediaEntrypointPanel.model";

function isStableMarketplaceMediaUrl(value: string | null | undefined): boolean {
  const url = String(value ?? "").trim();
  return Boolean(url) && !/^(blob|data|file):/i.test(url);
}

function summarizeMediaItems(mediaItems: readonly LiveRouteMediaDraftItem[]) {
  const uploadedItems = mediaItems.filter((item) => item.uploadStatus === "uploaded");
  const photoItems = uploadedItems.filter((item) => item.mediaKind === "photo");
  const videoItems = uploadedItems.filter((item) => item.mediaKind === "video");
  return {
    mediaAssetIds: uploadedItems.map((item) => item.mediaAssetId),
    photoAssetIds: photoItems.map((item) => item.mediaAssetId),
    videoAssetIds: videoItems.map((item) => item.mediaAssetId),
    mediaPublicUrls: uploadedItems.flatMap((item) => item.publicUrl ? [item.publicUrl] : []),
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

function uploadResultsFromPickResult(result: LiveRouteMediaPickResult): LiveRouteMediaUploadResult[] {
  if (!result) return [];
  return Array.isArray(result) ? result : [result];
}

function firstUploadResultFromPickResult(result: LiveRouteMediaPickResult): LiveRouteMediaUploadResult | null {
  return uploadResultsFromPickResult(result)[0] ?? null;
}

function uploadErrorText(mediaKind: "photo" | "video", action: "add" | "replace"): string {
  if (action === "replace") {
    return mediaKind === "photo"
      ? "Не удалось заменить фото."
      : "Не удалось заменить видео.";
  }
  return mediaKind === "photo"
    ? "Не удалось загрузить фото."
    : "Не удалось загрузить видео.";
}

export class LiveRouteMediaEntrypointPanel extends React.PureComponent<
  {
    variant: LiveRouteMediaEntrypointVariant;
    onPickMedia?: (input: LiveRouteMediaPickInput) => Promise<LiveRouteMediaPickResult>;
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
    errorText: null,
  };

  private async pickMedia(input: LiveRouteMediaPickInput): Promise<LiveRouteMediaPickResult> {
    if (this.props.onPickMedia) {
      return this.props.onPickMedia(input);
    }
    return null;
  }

  private applyMediaItems(
    mediaItems: LiveRouteMediaDraftItem[],
    extra: Partial<LiveRouteMediaEntrypointPanelState> = {},
  ) {
    this.setState({
      checking: false,
      suggestionVisible: mediaItems.some((item) => item.uploadStatus === "uploaded"),
      errorText: null,
      ...summarizeMediaItems(mediaItems),
      mediaItems,
      ...extra,
    }, () => {
      this.emitSnapshot();
    });
  }

  private readonly addMedia = async (input: LiveRouteMediaPickInput) => {
    const copy = copyForVariant(this.props.variant);
    const currentCount = input.mediaKind === "photo"
      ? this.state.mediaItems.filter((item) => item.mediaKind === "photo").length
      : this.state.mediaItems.filter((item) => item.mediaKind === "video").length;
    const maxCount = mediaCountLimit(input, copy);
    const availableSlots = Math.max(0, maxCount - currentCount);
    if (availableSlots < 1) {
      this.setState({
        checking: false,
        errorText: input.mediaKind === "photo"
          ? `Можно добавить не больше ${maxCount} фото.`
          : "Можно добавить не больше 1 видео.",
      }, () => {
        this.emitSnapshot();
      });
      return;
    }

    const pickInput: LiveRouteMediaPickInput = {
      ...input,
      selectionLimit: input.source === "library" && input.mediaKind === "photo" ? availableSlots : 1,
    };

    this.setState({
      checking: true,
      suggestionVisible: false,
      errorText: null,
    }, () => {
      this.emitSnapshot();
    });

    try {
      const picked = await this.pickMedia(pickInput);
      const uploadedItems = uploadResultsFromPickResult(picked).slice(0, availableSlots);
      if (uploadedItems.length < 1) {
        this.setState({ checking: false }, () => {
          this.emitSnapshot();
        });
        return;
      }
      const draftItems = uploadedItems.map((uploaded) =>
        createDraftItem({
          ...pickInput,
          mediaKind: uploaded.mediaKind ?? pickInput.mediaKind,
        }, uploaded, {
          requireStablePublicUrl: copy.targetType === "marketplace_product",
        })
      );
      this.applyMediaItems([...this.state.mediaItems, ...draftItems]);
    } catch {
      this.setState({
        checking: false,
        errorText: uploadErrorText(input.mediaKind, "add"),
      }, () => {
        this.emitSnapshot();
      });
    }
  };

  private readonly replaceMedia = async (mediaAssetId?: string) => {
    const currentItem = mediaAssetId
      ? this.state.mediaItems.find((item) => item.mediaAssetId === mediaAssetId)
      : this.state.mediaItems[0];
    const input: LiveRouteMediaPickInput = {
      mediaKind: currentItem?.mediaKind ?? "photo",
      source: "library",
      selectionLimit: 1,
    };
    this.setState({ checking: true, errorText: null }, () => {
      this.emitSnapshot();
    });

    try {
      const uploaded = firstUploadResultFromPickResult(await this.pickMedia(input));
      if (!uploaded) {
        this.setState({ checking: false }, () => {
          this.emitSnapshot();
        });
        return;
      }
      const draftItem = createDraftItem(input, uploaded, {
        requireStablePublicUrl: copyForVariant(this.props.variant).targetType === "marketplace_product",
      });
      const targetMediaAssetId = mediaAssetId ?? currentItem?.mediaAssetId ?? null;
      let replaced = false;
      const mediaItems = this.state.mediaItems.map((item) => {
        if (targetMediaAssetId && item.mediaAssetId === targetMediaAssetId) {
          replaced = true;
          return draftItem;
        }
        return item;
      });
      if (!replaced) mediaItems.push(draftItem);
      this.applyMediaItems(mediaItems);
    } catch {
      this.setState({
        checking: false,
        errorText: uploadErrorText(input.mediaKind, "replace"),
      }, () => {
        this.emitSnapshot();
      });
    }
  };

  private readonly removeMedia = () => {
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
      errorText: null,
    }, () => {
      this.emitSnapshot();
    });
  };

  private readonly removeMediaItem = (mediaAssetId: string) => {
    const mediaItems = this.state.mediaItems.filter((item) => item.mediaAssetId !== mediaAssetId);
    this.applyMediaItems(mediaItems, {
      suggestionVisible: mediaItems.some((item) => item.uploadStatus === "uploaded"),
    });
  };

  private emitSnapshot() {
    const copy = copyForVariant(this.props.variant);
    const mediaItems = this.state.mediaItems;
    const uploadedItems = mediaItems.filter((item) => item.uploadStatus === "uploaded");
    const hasMedia = uploadedItems.length > 0;
    const mediaAssetIds = uploadedItems.map((item) => item.mediaAssetId);
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
    const mediaAssets = uploadedItems.map((item) => ({
      mediaAssetId: item.mediaAssetId,
      mediaKind: item.mediaKind,
    }));
    const photoCount = uploadedItems.filter((item) => item.mediaKind === "photo").length;
    const videoCount = uploadedItems.filter((item) => item.mediaKind === "video").length;
    const uploadInProgress =
      this.state.checking || mediaItems.some((item) => item.uploadStatus === "uploading");
    const failedMediaCount = mediaItems.filter((item) => item.uploadStatus === "failed").length;
    this.props.onSnapshotChange?.({
      photoCount: hasMedia ? photoCount : copy.photoCount,
      videoCount: hasMedia ? videoCount : copy.videoCount,
      mediaDraftCount: mediaItems.length,
      uploadInProgress,
      failedMediaCount,
      mediaAssetIds: hasMedia ? mediaAssetIds : [],
      mediaAssets: hasMedia ? mediaAssets : [],
      mediaPublicUrls: hasMedia ? uploadedItems.flatMap((item) => item.publicUrl ? [item.publicUrl] : []) : [],
      photoPublicUrls: hasMedia ? this.state.photoPublicUrls : [],
      videoPublicUrls: hasMedia ? this.state.videoPublicUrls : [],
      bundle,
      suggestion,
    });
  }

  override render() {
    const copy = copyForVariant(this.props.variant);
    const marketplace = copy.targetType === "marketplace_product";
    const photoCount = this.state.mediaItems.length > 0
      ? this.state.mediaItems.filter((item) => item.mediaKind === "photo").length
      : copy.photoCount;
    const videoCount = this.state.mediaItems.length > 0
      ? this.state.mediaItems.filter((item) => item.mediaKind === "video").length
      : copy.videoCount;
    const mediaProps: CompactMediaButtonsProps = {
      targetType: copy.targetType,
      photoCount,
      videoCount,
      maxPhotos: marketplace ? MARKET_ADD_MEDIA_LIMITS.maxPhotos : MEDIA_LIMITS.maxPhotosPerGroup,
      maxVideos: marketplace ? MARKET_ADD_MEDIA_LIMITS.maxVideos : MEDIA_LIMITS.maxVideosPerGroup,
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
        {marketplace ? copy.introLines.map((line) => (
          <Text key={line} style={styles.marketplaceIntro}>
            {line}
          </Text>
        )) : null}
        {this.renderMediaStrip(copy)}
        {this.renderButtons(copy, mediaProps)}
        {this.state.checking ? (
          <Text style={styles.checkingText}>
            {copy.checkingText ?? "Фото добавлено · проверяю..."}
          </Text>
        ) : null}
        {this.state.errorText ? (
          <Text style={styles.errorText}>{this.state.errorText}</Text>
        ) : null}
        {this.renderSuggestion(copy)}
        {!marketplace ? copy.introLines.map((line) => (
          <Text key={line} style={line === "Пока пусто" ? styles.emptyText : styles.bodyText}>
            {line}
          </Text>
        )) : null}
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
    if (copy.targetType !== "marketplace_product") {
      return null;
    }

    if (this.state.mediaItems.length < 1) {
      return (
        <View testID={`${copy.testID}.thumbnail-empty-strip`} style={styles.previewRow}>
          {Array.from({ length: MARKET_ADD_MEDIA_LIMITS.maxPhotos }).map((_, index) => (
            <View
              key={`empty-photo-slot:${index}`}
              testID={`${copy.testID}.thumbnail-empty.${index}`}
              style={styles.previewEmptySlot}
            >
              <Ionicons name="image-outline" size={18} color="#94A3B8" />
            </View>
          ))}
        </View>
      );
    }

    const coverPhotoMediaAssetId =
      this.state.mediaItems.find((item) => item.mediaKind === "photo")?.mediaAssetId ?? null;

    return (
      <View testID={`${copy.testID}.thumbnail-strip`} style={styles.previewRow}>
        {this.state.mediaItems.map((item, index) => {
          const isCoverPhoto =
            item.mediaKind === "photo" && item.mediaAssetId === coverPhotoMediaAssetId;
          return (
            <View
              key={item.mediaAssetId}
              testID={`${copy.testID}.thumbnail.${index}`}
              style={[styles.mediaDraftItem, isCoverPhoto ? styles.mediaDraftCoverItem : null]}
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
              <Text style={styles.mediaKindBadge}>
                {item.mediaKind === "photo" ? "Фото" : "Видео"}
              </Text>
              {isCoverPhoto ? (
                <Text testID={`${copy.testID}.thumbnail.cover-badge.${index}`} style={styles.mediaCoverBadge}>
                  Обложка
                </Text>
              ) : null}
              {item.mediaKind === "video" ? (
                <Text testID={`${copy.testID}.thumbnail.video-duration.${index}`} style={styles.videoDurationBadge}>
                  {formatDuration(item.durationMs)}
                </Text>
              ) : null}
              <Text
                testID={`${copy.testID}.thumbnail.upload-status.${index}`}
                style={[
                  styles.mediaUploadStatus,
                  item.uploadStatus === "failed" ? styles.mediaUploadStatusFailed : null,
                ]}
              >
                {item.uploadStatus === "uploading"
                  ? "Загрузка..."
                  : item.uploadStatus === "failed"
                    ? "Ошибка"
                    : "Загружено"}
              </Text>
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
          );
        })}
      </View>
    );
  }

  private renderButtons(copy: DirectMediaCopy, mediaProps: CompactMediaButtonsProps) {
    const photoLimitReached = mediaProps.photoCount >= mediaProps.maxPhotos;
    const videoLimitReached = mediaProps.videoCount >= mediaProps.maxVideos;
    return (
      <View style={styles.mediaButtons}>
        {this.renderMediaButton({
          copy,
          testSuffix: "camera_photo_button",
          icon: "camera-outline",
          label: copy.photoButtonLabel ?? "Фото",
          disabled: photoLimitReached,
          input: { mediaKind: "photo", source: "camera" },
        })}
        {copy.targetType === "marketplace_product" ? this.renderMediaButton({
          copy,
          testSuffix: "gallery_photo_button",
          icon: "images-outline",
          label: "Фото из галереи",
          disabled: photoLimitReached,
          input: { mediaKind: "photo", source: "library" },
        }) : null}
        {this.renderMediaButton({
          copy,
          testSuffix: "camera_video_button",
          icon: "videocam-outline",
          label: copy.videoButtonLabel ?? "Видео",
          disabled: videoLimitReached,
          input: { mediaKind: "video", source: "camera" },
        })}
        {copy.targetType === "marketplace_product" ? this.renderMediaButton({
          copy,
          testSuffix: "gallery_video_button",
          icon: "film-outline",
          label: "Видео из галереи",
          disabled: videoLimitReached,
          input: { mediaKind: "video", source: "library" },
        }) : null}
      </View>
    );
  }

  private renderMediaButton(params: {
    copy: DirectMediaCopy;
    testSuffix: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    label: string;
    disabled: boolean;
    input: LiveRouteMediaPickInput;
  }) {
    return (
      <Pressable
        testID={`${params.copy.testID}.${params.testSuffix}`}
        accessibilityRole="button"
        accessibilityLabel={params.label}
        accessibilityState={{ disabled: params.disabled }}
        disabled={params.disabled}
        onPress={() => {
          void this.addMedia(params.input);
        }}
        style={[styles.mediaButton, params.disabled ? styles.mediaButtonDisabled : null]}
      >
        <Ionicons name={params.icon} size={17} color="#0F172A" />
      </Pressable>
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
