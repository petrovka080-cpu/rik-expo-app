import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";

import { MEDIA_LIMITS } from "../../../lib/media/mediaLimits";
import {
  buttonLabels,
  copyForVariant,
  createBundle,
  toBundleTarget,
  type CompactMediaButtonsProps,
  type DirectMediaCopy,
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
  LiveRouteMediaEntrypointSnapshot,
  LiveRouteMediaPickInput,
  LiveRouteMediaUploadResult,
} from "./LiveRouteMediaEntrypointPanel.model";

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
        errorText: "Достигнут лимит медиа.",
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
          errorText: "Не удалось заменить фото.",
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

export default LiveRouteMediaEntrypointPanel;
