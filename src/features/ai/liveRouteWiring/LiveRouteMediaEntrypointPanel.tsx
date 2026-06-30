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
  type LiveRouteMediaLocalPreview,
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
  LiveRouteMediaLocalPreview,
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

function isLocalPreviewUrl(value: string | null | undefined): boolean {
  return /^(blob|file|data):/i.test(String(value ?? "").trim());
}

function revokeLocalPreviewUrl(value: string | null | undefined): void {
  const url = String(value ?? "").trim();
  if (!url || !url.startsWith("blob:")) return;
  if (typeof URL === "undefined" || typeof URL.revokeObjectURL !== "function") return;
  URL.revokeObjectURL(url);
}

function createLocalDraftItem(
  input: LiveRouteMediaPickInput,
  preview: LiveRouteMediaLocalPreview,
): LiveRouteMediaDraftItem {
  return {
    mediaAssetId: `local:${input.mediaKind}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    mediaKind: input.mediaKind,
    publicUrl: preview.localPreviewUrl,
    uploadStatus: "uploading",
    durationMs: null,
    width: null,
    height: null,
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
    mediaPickerVisible: false,
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
    this.state.mediaItems.forEach((item) => {
      if (isLocalPreviewUrl(item.publicUrl)) {
        revokeLocalPreviewUrl(item.publicUrl);
      }
    });
  }

  private async pickMedia(input: LiveRouteMediaPickInput): Promise<LiveRouteMediaPickResult> {
    if (this.props.onPickMedia) {
      return this.props.onPickMedia(input);
    }
    return null;
  }

  private readonly addMedia = async (input: LiveRouteMediaPickInput) => {
    if (this.suggestionTimer) {
      clearTimeout(this.suggestionTimer);
      this.suggestionTimer = null;
    }
    const copy = copyForVariant(this.props.variant);
    const currentCount = input.mediaKind === "photo"
      ? this.state.mediaItems.filter((item) => item.mediaKind === "photo").length
      : this.state.mediaItems.filter((item) => item.mediaKind === "video").length;
    const maxCount = mediaCountLimit(input, copy);
    const availableSlots = Math.max(0, maxCount - currentCount);
    if (availableSlots < 1) {
      this.setState({
        checking: false,
        mediaPickerVisible: false,
        suggestionVisible: this.state.mediaItems.some((item) => item.uploadStatus === "uploaded"),
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
      mediaPickerVisible: false,
      errorText: null,
    }, () => {
      this.emitSnapshot();
    });
    if (this.props.onPickMedia) {
      const localMediaAssetIds: string[] = [];
      try {
        const picked = await this.pickMedia({
          ...pickInput,
          onLocalPreview: (preview) => {
            if (localMediaAssetIds.length >= availableSlots) return;
            const draftItem = createLocalDraftItem({
              ...pickInput,
              mediaKind: preview.mediaKind,
            }, preview);
            localMediaAssetIds.push(draftItem.mediaAssetId);
            this.setState((prev) => {
              const mediaItems = [...prev.mediaItems, draftItem];
              return {
                checking: true,
                suggestionVisible: false,
                errorText: null,
                ...summarizeMediaItems(mediaItems),
                mediaItems,
              };
            }, () => {
              this.emitSnapshot();
            });
          },
        });
        const uploadedItems = uploadResultsFromPickResult(picked).slice(0, availableSlots);
        if (uploadedItems.length < 1) {
          if (localMediaAssetIds.length < 1) {
            this.setState({ checking: false }, () => {
              this.emitSnapshot();
            });
            return;
          }
          this.setState((prev) => {
            const mediaItems = prev.mediaItems.map((item) =>
              localMediaAssetIds.includes(item.mediaAssetId)
                ? { ...item, uploadStatus: "failed" as const }
                : item,
            );
            return {
              checking: false,
              suggestionVisible: mediaItems.some((item) => item.uploadStatus === "uploaded"),
              errorText: input.mediaKind === "photo" ? "Не удалось загрузить фото." : "Не удалось загрузить видео.",
              ...summarizeMediaItems(mediaItems),
              mediaItems,
            };
          }, () => {
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
        this.setState((prev) => {
          const usedDraftIndexes = new Set<number>();
          const mediaItems = prev.mediaItems.map((item) => {
            const localIndex = localMediaAssetIds.indexOf(item.mediaAssetId);
            if (localIndex < 0) return item;
            const draftItem = draftItems[localIndex];
            if (!draftItem) return { ...item, uploadStatus: "failed" as const };
            if (isLocalPreviewUrl(item.publicUrl)) {
              revokeLocalPreviewUrl(item.publicUrl);
            }
            usedDraftIndexes.add(localIndex);
            return draftItem;
          });
          draftItems.forEach((draftItem, index) => {
            if (!usedDraftIndexes.has(index)) {
              mediaItems.push(draftItem);
            }
          });
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
        this.setState((prev) => {
          const mediaItems = localMediaAssetIds.length > 0
            ? prev.mediaItems.map((item) =>
              localMediaAssetIds.includes(item.mediaAssetId)
                ? { ...item, uploadStatus: "failed" as const }
                : item,
            )
            : prev.mediaItems;
          return {
            checking: false,
            suggestionVisible: mediaItems.some((item) => item.uploadStatus === "uploaded"),
            errorText: input.mediaKind === "photo" ? "Не удалось загрузить фото." : "Не удалось загрузить видео.",
            ...summarizeMediaItems(mediaItems),
            mediaItems,
          };
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
      selectionLimit: 1,
    };
    this.setState({ checking: true, mediaPickerVisible: false, errorText: null }, () => {
      this.emitSnapshot();
    });
    if (this.props.onPickMedia) {
      let localMediaAssetId: string | null = null;
      try {
        const uploaded = firstUploadResultFromPickResult(await this.pickMedia({
          ...input,
          onLocalPreview: (preview) => {
            const draftItem = createLocalDraftItem(input, preview);
            localMediaAssetId = draftItem.mediaAssetId;
            this.setState((prev) => {
              const previousItem = mediaAssetId
                ? prev.mediaItems.find((item) => item.mediaAssetId === mediaAssetId)
                : prev.mediaItems[0];
              if (previousItem && isLocalPreviewUrl(previousItem.publicUrl)) {
                revokeLocalPreviewUrl(previousItem.publicUrl);
              }
              const mediaItems = mediaAssetId
                ? prev.mediaItems.map((item) => item.mediaAssetId === mediaAssetId ? draftItem : item)
                : prev.mediaItems.length > 0
                  ? [draftItem, ...prev.mediaItems.slice(1)]
                  : [draftItem];
              return {
                checking: true,
                suggestionVisible: mediaItems.some((item) => item.uploadStatus === "uploaded"),
                errorText: null,
                previewItemId: prev.previewItemId === mediaAssetId ? draftItem.mediaAssetId : prev.previewItemId,
                ...summarizeMediaItems(mediaItems),
                mediaItems,
              };
            }, () => {
              this.emitSnapshot();
            });
          },
        }));
        if (!uploaded) {
          if (!localMediaAssetId) {
            this.setState({ checking: false }, () => {
              this.emitSnapshot();
            });
            return;
          }
          this.setState((prev) => {
            const mediaItems = prev.mediaItems.map((item) =>
              item.mediaAssetId === localMediaAssetId
                ? { ...item, uploadStatus: "failed" as const }
                : item,
            );
            return {
              checking: false,
              suggestionVisible: mediaItems.some((item) => item.uploadStatus === "uploaded"),
              ...summarizeMediaItems(mediaItems),
              mediaItems,
            };
          }, () => {
            this.emitSnapshot();
          });
          return;
        }
        const draftItem = createDraftItem(input, uploaded, {
          requireStablePublicUrl: copyForVariant(this.props.variant).targetType === "marketplace_product",
        });
        this.setState((prev) => {
          const targetMediaAssetId = localMediaAssetId ?? mediaAssetId;
          const previousLocalItem = targetMediaAssetId
            ? prev.mediaItems.find((item) => item.mediaAssetId === targetMediaAssetId)
            : null;
          if (previousLocalItem && isLocalPreviewUrl(previousLocalItem.publicUrl)) {
            revokeLocalPreviewUrl(previousLocalItem.publicUrl);
          }
          const replaced = targetMediaAssetId
            ? prev.mediaItems.map((item) => item.mediaAssetId === targetMediaAssetId ? draftItem : item)
            : prev.mediaItems.length > 0
              ? [draftItem, ...prev.mediaItems.slice(1)]
              : [draftItem];
          return {
            checking: false,
            suggestionVisible: true,
            errorText: null,
            previewItemId: prev.previewItemId === targetMediaAssetId || prev.previewItemId === mediaAssetId
              ? draftItem.mediaAssetId
              : prev.previewItemId,
            ...summarizeMediaItems(replaced),
            mediaItems: replaced,
          };
        }, () => {
          this.emitSnapshot();
        });
      } catch {
        if (localMediaAssetId) {
          this.setState((prev) => {
            const mediaItems = prev.mediaItems.map((item) =>
              item.mediaAssetId === localMediaAssetId
                ? { ...item, uploadStatus: "failed" as const }
                : item,
            );
            return {
              checking: false,
              suggestionVisible: mediaItems.some((item) => item.uploadStatus === "uploaded"),
              ...summarizeMediaItems(mediaItems),
              mediaItems,
            };
          }, () => {
            this.emitSnapshot();
          });
          return;
        }
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
    this.state.mediaItems.forEach((item) => {
      if (isLocalPreviewUrl(item.publicUrl)) {
        revokeLocalPreviewUrl(item.publicUrl);
      }
    });
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
      mediaPickerVisible: false,
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
    const removedItem = this.state.mediaItems.find((item) => item.mediaAssetId === mediaAssetId);
    if (removedItem && isLocalPreviewUrl(removedItem.publicUrl)) {
      revokeLocalPreviewUrl(removedItem.publicUrl);
    }
    this.setState((prev) => {
      const mediaItems = prev.mediaItems.filter((item) => item.mediaAssetId !== mediaAssetId);
      return {
        suggestionVisible: mediaItems.some((item) => item.uploadStatus === "uploaded"),
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
    const mediaProps: CompactMediaButtonsProps = {
      targetType: copy.targetType,
      photoCount: this.state.mediaItems.length > 0
        ? this.state.mediaItems.filter((item) => item.mediaKind === "photo").length
        : copy.photoCount,
      videoCount: this.state.mediaItems.length > 0
        ? this.state.mediaItems.filter((item) => item.mediaKind === "video").length
        : copy.videoCount,
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
        {marketplace ? this.renderAddMediaTile(copy, mediaProps) : this.renderButtons(copy)}
        {this.state.checking ? (
          <Text style={styles.checkingText}>
            {copy.checkingText ?? "Фото добавлено · проверяю..."}
          </Text>
        ) : null}
        {this.state.errorText ? (
          <Text style={styles.errorText}>{this.state.errorText}</Text>
        ) : null}
        {this.renderMediaPicker(copy)}
        {this.renderPreviewModal(copy)}
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

  private renderAddMediaTile(copy: DirectMediaCopy, mediaProps: CompactMediaButtonsProps) {
    const disabled =
      mediaProps.photoCount >= mediaProps.maxPhotos &&
      mediaProps.videoCount >= mediaProps.maxVideos;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Добавить фото или видео"
        accessibilityState={{ disabled }}
        testID={`${copy.testID}.add-media-tile`}
        disabled={disabled}
        onPress={() => this.setState({ mediaPickerVisible: true })}
        style={[styles.addMediaTile, disabled ? styles.addMediaTileDisabled : null]}
      >
        <View style={styles.addMediaTileIcon}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </View>
        <View style={styles.addMediaTileBody}>
          <Text style={styles.addMediaTileTitle}>Добавить медиа</Text>
          <Text style={styles.addMediaTileSub}>
            Фото до {MARKET_ADD_MEDIA_LIMITS.maxPhotos}, видео {MARKET_ADD_MEDIA_LIMITS.maxVideos} до {MARKET_ADD_MEDIA_LIMITS.maxVideoDurationMs / 1000} сек
          </Text>
        </View>
        <Ionicons name="chevron-up-outline" size={18} color="#0F766E" />
      </Pressable>
    );
  }

  private renderMediaPicker(copy: DirectMediaCopy) {
    if (copy.targetType !== "marketplace_product" || !this.state.mediaPickerVisible) {
      return null;
    }

    const photoCount = this.state.mediaItems.filter((item) => item.mediaKind === "photo").length;
    const videoCount = this.state.mediaItems.filter((item) => item.mediaKind === "video").length;
    const photoLimitReached = photoCount >= MARKET_ADD_MEDIA_LIMITS.maxPhotos;
    const videoLimitReached = videoCount >= MARKET_ADD_MEDIA_LIMITS.maxVideos;

    return (
      <React19SafeModal
        isVisible
        onBackdropPress={() => this.setState({ mediaPickerVisible: false })}
        onBackButtonPress={() => this.setState({ mediaPickerVisible: false })}
        backdropOpacity={0.35}
        hideModalContentWhileAnimating
        style={styles.mediaPickerHost}
      >
        <View testID={`${copy.testID}.picker-sheet`} style={styles.mediaPickerSheet}>
          <Text style={styles.mediaPickerTitle}>Добавить фото или видео</Text>
          {this.renderMediaPickerOption({
            copy,
            testSuffix: "camera_photo_button",
            icon: "camera-outline",
            title: "Снять фото",
            subtitle: photoLimitReached ? "Лимит 5 фото уже выбран" : "Камера устройства",
            disabled: photoLimitReached,
            input: { mediaKind: "photo", source: "camera" },
          })}
          {this.renderMediaPickerOption({
            copy,
            testSuffix: "gallery_photo_button",
            icon: "images-outline",
            title: "Выбрать фото",
            subtitle: photoLimitReached ? "Лимит 5 фото уже выбран" : "Из галереи или файла",
            disabled: photoLimitReached,
            input: { mediaKind: "photo", source: "library" },
          })}
          {this.renderMediaPickerOption({
            copy,
            testSuffix: "camera_video_button",
            icon: "videocam-outline",
            title: "Снять видео",
            subtitle: videoLimitReached ? "Можно добавить только 1 видео" : "До 15 секунд",
            disabled: videoLimitReached,
            input: { mediaKind: "video", source: "camera" },
          })}
          {this.renderMediaPickerOption({
            copy,
            testSuffix: "gallery_video_button",
            icon: "film-outline",
            title: "Выбрать видео",
            subtitle: videoLimitReached ? "Можно добавить только 1 видео" : "До 15 секунд",
            disabled: videoLimitReached,
            input: { mediaKind: "video", source: "library" },
          })}
          <Pressable
            accessibilityRole="button"
            testID={`${copy.testID}.picker-sheet.close`}
            onPress={() => this.setState({ mediaPickerVisible: false })}
            style={styles.inlineActionGhost}
          >
            <Text style={styles.inlineActionGhostText}>Закрыть</Text>
          </Pressable>
        </View>
      </React19SafeModal>
    );
  }

  private renderMediaPickerOption(params: {
    copy: DirectMediaCopy;
    testSuffix: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    title: string;
    subtitle: string;
    disabled: boolean;
    input: LiveRouteMediaPickInput;
  }) {
    return (
      <Pressable
        testID={`${params.copy.testID}.${params.testSuffix}`}
        accessibilityRole="button"
        accessibilityLabel={params.title}
        accessibilityState={{ disabled: params.disabled }}
        disabled={params.disabled}
        onPress={() => {
          void this.addMedia(params.input);
        }}
        style={[
          styles.mediaPickerOption,
          params.disabled ? styles.mediaPickerOptionDisabled : null,
        ]}
      >
        <View style={styles.mediaPickerOptionIcon}>
          <Ionicons name={params.icon} size={18} color="#0F172A" />
        </View>
        <View style={styles.mediaPickerOptionBody}>
          <Text style={styles.mediaPickerOptionTitle}>{params.title}</Text>
          <Text style={styles.mediaPickerOptionSub}>{params.subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward-outline" size={16} color="#64748B" />
      </Pressable>
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
          <View style={styles.previewModalHeader}>
            <Text style={styles.suggestionTitle}>{item.mediaKind === "photo" ? "Фото" : "Видео"}</Text>
            <Text testID={`${copy.testID}.preview-modal.kind-badge`} style={styles.previewKindBadge}>
              {item.mediaKind === "photo" ? "Фото" : "Видео"}
            </Text>
          </View>
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
          <View style={styles.previewModalActions}>
            <Pressable
              accessibilityRole="button"
              testID={`${copy.testID}.preview-modal.replace`}
              onPress={() => {
                void this.replaceMedia(item.mediaAssetId);
              }}
              style={styles.inlineActionGhost}
            >
              <Text style={styles.inlineActionGhostText}>Заменить</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              testID={`${copy.testID}.preview-modal.remove`}
              onPress={() => {
                this.removeMediaItem(item.mediaAssetId);
              }}
              style={styles.inlineActionDanger}
            >
              <Text style={styles.inlineActionDangerText}>Удалить</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              testID={`${copy.testID}.preview-modal.close`}
              onPress={() => this.setState({ previewItemId: null })}
              style={styles.inlineAction}
            >
              <Text style={styles.inlineActionText}>Закрыть</Text>
            </Pressable>
          </View>
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
