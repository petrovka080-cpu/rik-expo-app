import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { MARKET_HOME_COLORS } from "../marketHome.config";
import type { MarketHomeListingCard } from "../marketHome.types";

type ListingMediaItem =
  | { kind: "photo"; uri: string }
  | { kind: "video"; uri: string }
  | { kind: "placeholder"; source: ImageSourcePropType };

type Props = {
  listing: MarketHomeListingCard;
  onOpen: () => void;
  onMapPress: () => void;
  onShowcasePress?: () => void;
  onAssistantPress?: () => void;
  onPhonePress?: () => void;
  onWhatsAppPress?: () => void;
  onContactSupplierPress?: () => void;
  onAddToRequestPress?: () => void;
  onCreateProposalPress?: () => void;
  contactBusy?: boolean;
  addToRequestBusy?: boolean;
  createProposalBusy?: boolean;
  actionsDisabled?: boolean;
  variant?: "full" | "market-primary";
};

const MarketFeedVideo = React.lazy(async () => {
  const { ResizeMode, Video } = await import("expo-av");
  return {
    default: function MarketFeedVideoView({ testID, uri }: { testID: string; uri: string }) {
      return (
        <Video
          testID={testID}
          source={{ uri }}
          style={styles.mediaFill}
          resizeMode={ResizeMode.COVER}
          useNativeControls
          shouldPlay={false}
          isLooping={false}
        />
      );
    },
  };
});

function MarketFeedVideoLoading() {
  return (
    <View style={[styles.mediaFill, styles.videoFallback]}>
      <Ionicons name="play-circle" size={42} color="#FFFFFF" />
      <Text style={styles.videoFallbackText}>Видео</Text>
    </View>
  );
}

export default function MarketFeedCard({
  listing,
  onOpen,
  onMapPress,
  onShowcasePress,
  onAssistantPress,
  onPhonePress,
  onWhatsAppPress,
  onContactSupplierPress,
  onAddToRequestPress,
  onCreateProposalPress,
  contactBusy = false,
  addToRequestBusy = false,
  createProposalBusy = false,
  actionsDisabled = false,
  variant = "full",
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const [mediaWidth, setMediaWidth] = useState(0);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [failedMediaKeys, setFailedMediaKeys] = useState<Record<string, boolean>>({});
  const isMarketPrimary = variant === "market-primary";
  const showPhoneAction = Boolean(onPhonePress);
  const showWhatsAppAction = Boolean(onWhatsAppPress);
  const showMapAction = Boolean(onMapPress);
  const showUtilityActions = !isMarketPrimary && (onMapPress || onShowcasePress || onAssistantPress || onPhonePress || onWhatsAppPress);
  const showErpActions = !isMarketPrimary && (onContactSupplierPress || onAddToRequestPress || onCreateProposalPress);
  const imageSource = useMemo<ImageSourcePropType>(
    () => (listing.imageUrl ? { uri: listing.imageUrl } : listing.imageSource),
    [listing.imageSource, listing.imageUrl],
  );
  const hasVideo = listing.videoUrls.length > 0;

  const mediaItems = useMemo<ListingMediaItem[]>(() => {
    const photoUrls = listing.imageUrls.length ? listing.imageUrls : listing.imageUrl ? [listing.imageUrl] : [];
    const items: ListingMediaItem[] = [
      ...Array.from(new Set(photoUrls)).map((uri) => ({ kind: "photo" as const, uri })),
      ...Array.from(new Set(listing.videoUrls)).map((uri) => ({ kind: "video" as const, uri })),
    ];
    return items.length ? items : [{ kind: "placeholder", source: photoUrls.length ? imageSource : listing.imageSource }];
  }, [imageSource, listing.imageSource, listing.imageUrl, listing.imageUrls, listing.videoUrls]);

  const currentMediaIndex = Math.min(mediaIndex, mediaItems.length - 1);
  const currentMediaItem = mediaItems[currentMediaIndex];
  const mediaHeight = mediaWidth ? Math.min(420, Math.max(220, Math.round(mediaWidth * 0.62))) : 260;

  useEffect(() => {
    setMediaIndex(0);
    setFailedMediaKeys({});
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [listing.id]);

  const handleMediaLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextWidth = Math.round(event.nativeEvent.layout.width);
      if (nextWidth > 0 && Math.abs(nextWidth - mediaWidth) > 1) {
        setMediaWidth(nextWidth);
      }
    },
    [mediaWidth],
  );

  const scrollToMedia = useCallback(
    (nextIndex: number) => {
      const boundedIndex = Math.max(0, Math.min(mediaItems.length - 1, nextIndex));
      setMediaIndex(boundedIndex);
      if (mediaWidth > 0) {
        scrollRef.current?.scrollTo({ x: boundedIndex * mediaWidth, animated: true });
      }
    },
    [mediaItems.length, mediaWidth],
  );

  const handleMediaMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const pageWidth = event.nativeEvent.layoutMeasurement.width || mediaWidth;
      if (!pageWidth) return;
      const nextIndex = Math.max(
        0,
        Math.min(mediaItems.length - 1, Math.round(event.nativeEvent.contentOffset.x / pageWidth)),
      );
      setMediaIndex(nextIndex);
    },
    [mediaItems.length, mediaWidth],
  );

  const handleMediaImageError = useCallback((mediaKey: string) => {
    setFailedMediaKeys((current) => (current[mediaKey] ? current : { ...current, [mediaKey]: true }));
  }, []);

  return (
    <View style={styles.shell} testID={`market_feed_card_${listing.id}`}>
      <View
        style={styles.mediaShell}
        onLayout={handleMediaLayout}
        testID={`market_feed_card_media_carousel_${listing.id}`}
      >
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMediaMomentumEnd}
          testID={`market_feed_card_media_scroll_${listing.id}`}
        >
          {mediaItems.map((item, index) => {
            const mediaKey = item.kind === "placeholder" ? "placeholder" : item.uri;
            const imageItemSource =
              item.kind === "photo"
                  ? { uri: item.uri }
                  : item.kind === "placeholder"
                    ? item.source
                    : null;

            return (
              <Pressable
                key={`${listing.id}:media:${index}:${mediaKey}`}
                style={[styles.mediaSlide, { width: mediaWidth || "100%", height: mediaHeight }]}
                onPress={onOpen}
                disabled={actionsDisabled}
                testID={`market_feed_card_media_item_${listing.id}_${index}`}
              >
                {item.kind === "photo" && failedMediaKeys[mediaKey] ? (
                  <View
                    style={[styles.mediaFill, styles.brokenMedia]}
                    testID={`market_feed_card_broken_media_${listing.id}_${index}`}
                  >
                    <Ionicons name="alert-circle-outline" size={28} color="#B91C1C" />
                    <Text style={styles.brokenMediaText}>Медиа недоступно</Text>
                  </View>
                ) : item.kind === "video" ? (
                  <React.Suspense fallback={<MarketFeedVideoLoading />}>
                    <MarketFeedVideo
                      uri={item.uri}
                      testID={`market_feed_card_video_${listing.id}_${index}`}
                    />
                  </React.Suspense>
                ) : (
                  <Image
                    testID={`market_feed_card_image_${listing.id}_${index}`}
                    source={imageItemSource ?? listing.imageSource}
                    style={styles.mediaFill}
                    resizeMode="cover"
                    onError={item.kind === "photo" ? () => handleMediaImageError(mediaKey) : undefined}
                  />
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.mediaCounter} testID={`market_feed_card_media_counter_${listing.id}`}>
          <Text style={styles.mediaCounterText}>
            {currentMediaIndex + 1} / {mediaItems.length}
          </Text>
        </View>

        {hasVideo ? (
          <View style={styles.videoBadge} testID={`market_feed_card_video_badge_${listing.id}`}>
            <Ionicons name="play-circle" size={14} color="#FFFFFF" />
            <Text style={styles.videoBadgeText}>
              {currentMediaItem?.kind === "video" ? "Видео" : "Есть видео"}
            </Text>
          </View>
        ) : null}

        {mediaItems.length > 1 ? (
          <>
            <Pressable
              style={[styles.mediaArrow, styles.mediaArrowLeft]}
              onPress={() => scrollToMedia(currentMediaIndex - 1)}
              disabled={actionsDisabled || currentMediaIndex === 0}
              accessibilityLabel="Предыдущее медиа"
              testID={`market_feed_card_media_prev_${listing.id}`}
            >
              <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
            </Pressable>
            <Pressable
              style={[styles.mediaArrow, styles.mediaArrowRight]}
              onPress={() => scrollToMedia(currentMediaIndex + 1)}
              disabled={actionsDisabled || currentMediaIndex >= mediaItems.length - 1}
              accessibilityLabel="Следующее медиа"
              testID={`market_feed_card_media_next_${listing.id}`}
            >
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </Pressable>
          </>
        ) : null}
      </View>

      <Pressable
        style={styles.body}
        onPress={onOpen}
        disabled={actionsDisabled}
        testID={`market_feed_card_body_${listing.id}`}
      >
        <View style={styles.badgeRow}>
          <View style={[styles.badge, listing.isDemand ? styles.badgeDemand : styles.badgeOffer]}>
            <Text style={styles.badgeText}>{listing.sideLabel}</Text>
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {listing.statusLabel}
          </Text>
        </View>

        <Text style={styles.price} numberOfLines={1}>
          {listing.price != null
            ? `${listing.price.toLocaleString("ru-RU")} сом${listing.unit ? ` / ${listing.unit}` : ""}`
            : "Цена по запросу"}
        </Text>

        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>

        <Text style={styles.subline} numberOfLines={2}>
          {listing.kindLabel}
          {listing.city ? ` • ${listing.city}` : ""}
        </Text>

        <Text style={styles.seller} numberOfLines={1}>
          {listing.sellerDisplayName}
        </Text>

        {!isMarketPrimary && listing.stockLabel ? (
          <Text style={styles.stockText} testID={`market_stock_${listing.id}`}>
            {listing.stockLabel}
          </Text>
        ) : null}

        {!isMarketPrimary && listing.itemsPreview.length ? (
          <View style={styles.itemsBox}>
            {listing.itemsPreview.slice(0, 2).map((item) => (
              <Text key={`${listing.id}:${item}`} style={styles.itemLine} numberOfLines={1}>
                • {item}
              </Text>
            ))}
          </View>
        ) : null}
      </Pressable>

      {isMarketPrimary ? (
        <View style={styles.primaryActions}>
          {showPhoneAction ? (
            <Pressable style={[styles.primaryAction, styles.primaryCallAction]} onPress={onPhonePress} disabled={actionsDisabled}>
              <Ionicons name="call" size={16} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>Позвонить</Text>
            </Pressable>
          ) : null}
          {showWhatsAppAction ? (
            <Pressable
              style={[styles.primaryAction, styles.primaryWhatsAppAction]}
              onPress={onWhatsAppPress}
              disabled={actionsDisabled}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>WhatsApp</Text>
            </Pressable>
          ) : null}
          {showMapAction ? (
            <Pressable style={[styles.primaryAction, styles.primaryMapAction]} onPress={onMapPress} disabled={actionsDisabled}>
              <Ionicons name="location-outline" size={16} color={MARKET_HOME_COLORS.accentStrong} />
              <Text style={styles.primaryMapActionText}>На карте</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {showUtilityActions ? (
        <View style={styles.actions}>
          <Pressable style={styles.mapAction} onPress={onMapPress} disabled={actionsDisabled}>
            <Text style={styles.mapActionText}>На карте</Text>
          </Pressable>
          {onShowcasePress ? (
            <Pressable style={styles.iconActionSoft} onPress={onShowcasePress} disabled={actionsDisabled}>
              <Ionicons name="storefront" size={16} color={MARKET_HOME_COLORS.accentStrong} />
            </Pressable>
          ) : null}
          {onAssistantPress ? (
            <Pressable style={styles.iconActionSoft} onPress={onAssistantPress} disabled={actionsDisabled}>
              <Ionicons name="sparkles" size={16} color={MARKET_HOME_COLORS.accentStrong} />
            </Pressable>
          ) : null}
          {onPhonePress ? (
            <Pressable style={styles.iconAction} onPress={onPhonePress} disabled={actionsDisabled}>
              <Ionicons name="call" size={16} color="#FFFFFF" />
            </Pressable>
          ) : null}
          {onWhatsAppPress ? (
            <Pressable style={[styles.iconAction, styles.whatsAction]} onPress={onWhatsAppPress} disabled={actionsDisabled}>
              <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {showErpActions ? (
        <View style={styles.erpActions}>
          {onContactSupplierPress ? (
            <Pressable
              style={[
                styles.erpButton,
                styles.erpButtonSecondary,
                (actionsDisabled || contactBusy) ? styles.buttonDisabled : null,
              ]}
              onPress={onContactSupplierPress}
              disabled={actionsDisabled || contactBusy}
              testID={`market_contact_supplier_${listing.id}`}
              accessibilityLabel={`market:contact-supplier:${listing.id}`}
            >
              {contactBusy ? (
                <ActivityIndicator color={MARKET_HOME_COLORS.accentStrong} size="small" />
              ) : (
                <Text style={styles.erpButtonSecondaryText}>Связаться</Text>
              )}
            </Pressable>
          ) : null}
          {onAddToRequestPress ? (
            <Pressable
              style={[
                styles.erpButton,
                styles.erpButtonPrimary,
                (actionsDisabled || addToRequestBusy) ? styles.buttonDisabled : null,
              ]}
              onPress={onAddToRequestPress}
              disabled={actionsDisabled || addToRequestBusy}
              testID={`market_add_to_request_${listing.id}`}
              accessibilityLabel={`market:add-to-request:${listing.id}`}
            >
              {addToRequestBusy ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.erpButtonPrimaryText}>В заявку</Text>
              )}
            </Pressable>
          ) : null}
          {onCreateProposalPress ? (
            <Pressable
              style={[
                styles.erpButton,
                styles.erpButtonSecondary,
                (actionsDisabled || createProposalBusy) ? styles.buttonDisabled : null,
              ]}
              onPress={onCreateProposalPress}
              disabled={actionsDisabled || createProposalBusy}
              testID={`market_create_proposal_${listing.id}`}
              accessibilityLabel={`market:create-proposal:${listing.id}`}
            >
              {createProposalBusy ? (
                <ActivityIndicator color={MARKET_HOME_COLORS.accentStrong} size="small" />
              ) : (
                <Text style={styles.erpButtonSecondaryText}>Создать предложение</Text>
              )}
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 8,
    backgroundColor: MARKET_HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
    overflow: "hidden",
    ...Platform.select({
      web: { boxShadow: "0px 10px 22px rgba(15, 23, 42, 0.09)" },
      default: {
        shadowColor: "#0F172A",
        shadowOpacity: 0.09,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 10 },
        elevation: 4,
      },
    }),
  },
  mediaShell: {
    width: "100%",
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
  mediaSlide: {
    backgroundColor: "#E2E8F0",
  },
  mediaFill: {
    width: "100%",
    height: "100%",
  },
  videoFallback: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0F172A",
  },
  videoFallbackText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  brokenMedia: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
  },
  brokenMediaText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "900",
  },
  mediaCounter: {
    position: "absolute",
    right: 10,
    bottom: 10,
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaCounterText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  videoBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(15, 23, 42, 0.78)",
  },
  videoBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  mediaArrow: {
    position: "absolute",
    top: "50%",
    width: 34,
    height: 34,
    marginTop: -17,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.58)",
  },
  mediaArrowLeft: {
    left: 8,
  },
  mediaArrowRight: {
    right: 8,
  },
  body: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 7,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeOffer: {
    backgroundColor: MARKET_HOME_COLORS.accentSoft,
  },
  badgeDemand: {
    backgroundColor: "#FDE7E1",
  },
  badgeText: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 11,
    fontWeight: "800",
  },
  meta: {
    flex: 1,
    textAlign: "right",
    color: MARKET_HOME_COLORS.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  price: {
    color: MARKET_HOME_COLORS.accentStrong,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900",
  },
  title: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
  },
  subline: {
    color: MARKET_HOME_COLORS.textSoft,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  seller: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },
  stockText: {
    color: MARKET_HOME_COLORS.emerald,
    fontSize: 12,
    fontWeight: "800",
  },
  itemsBox: {
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  itemLine: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 12,
    fontWeight: "600",
  },
  actions: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  primaryActions: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  primaryAction: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  primaryCallAction: {
    backgroundColor: MARKET_HOME_COLORS.accentStrong,
  },
  primaryWhatsAppAction: {
    backgroundColor: MARKET_HOME_COLORS.emerald,
  },
  primaryMapAction: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  primaryMapActionText: {
    color: MARKET_HOME_COLORS.accentStrong,
    fontSize: 13,
    fontWeight: "900",
  },
  mapAction: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  mapActionText: {
    color: MARKET_HOME_COLORS.accentStrong,
    fontSize: 13,
    fontWeight: "800",
  },
  iconAction: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MARKET_HOME_COLORS.accentStrong,
  },
  iconActionSoft: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  whatsAction: {
    backgroundColor: MARKET_HOME_COLORS.emerald,
  },
  erpActions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    gap: 8,
  },
  erpButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  erpButtonPrimary: {
    backgroundColor: MARKET_HOME_COLORS.accentStrong,
    borderColor: MARKET_HOME_COLORS.accentStrong,
  },
  erpButtonSecondary: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  erpButtonPrimaryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  erpButtonSecondaryText: {
    color: MARKET_HOME_COLORS.accentStrong,
    fontSize: 13,
    fontWeight: "900",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
