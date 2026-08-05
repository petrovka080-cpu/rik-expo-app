import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  type ImageSourcePropType,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { MARKET_HOME_COLORS } from "./marketHome.colors";
import MarketFeedCard from "./components/MarketFeedCard";
import {
  buildMarketMapParams,
  filterMarketHomeListings,
  getCategoryKind,
} from "./marketHome.data";
import type { MarketHomeListingCard } from "./marketHome.types";
import {
  buildMarketProductRoute,
  buildMarketSupplierMapRoute,
} from "./market.routes";
import { waitForProductDetailBackgroundSlot } from "./productDetailBackgroundSlot";

type MarketContactSupplierModalComponent = typeof import("./components/MarketContactSupplierModal").default;

type ProductGalleryItem =
  | { kind: "photo"; uri: string }
  | { kind: "video"; uri: string }
  | { kind: "placeholder"; source: ImageSourcePropType };

const PRODUCT_GALLERY_MAX_ITEMS = 24;
const RELATED_LISTINGS_MAX_ITEMS = 6;

export type ProductDetailsContentProps = {
  row: MarketHomeListingCard;
};

const MARKET_ALERT_TITLE = "Маркет";

const ProductHeroVideo = React.lazy(async () => {
  const { ResizeMode, Video } = await import("expo-av");
  return {
    default: function ProductHeroVideoView({ uri }: { uri: string }) {
      return (
        <Video
          testID="market_product_hero_video"
          source={{ uri }}
          style={styles.heroImage}
          resizeMode={ResizeMode.COVER}
          useNativeControls
          shouldPlay={false}
          isLooping={false}
        />
      );
    },
  };
});

function ProductHeroVideoLoading() {
  return (
    <View style={[styles.heroImage, styles.galleryVideoThumb]}>
      <Text style={styles.heroPlayIcon}>▶</Text>
    </View>
  );
}

function openSupplierMapForProduct(row: MarketHomeListingCard) {
  router.push(buildMarketSupplierMapRoute(buildMarketMapParams({ side: "all", kind: "all" }, { row })));
}

export default function ProductDetailsContent({ row }: ProductDetailsContentProps) {
  const [actionBusy, setActionBusy] = useState<"contact" | null>(null);
  const [contactVisible, setContactVisible] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [contactErrorText, setContactErrorText] = useState<string | null>(null);
  const [ContactSupplierModal, setContactSupplierModal] = useState<MarketContactSupplierModalComponent | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [viewerImageIndex, setViewerImageIndex] = useState(0);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [secondaryContentReady, setSecondaryContentReady] = useState(false);
  const [relatedListings, setRelatedListings] = useState<MarketHomeListingCard[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  useEffect(() => {
    setSelectedImageIndex(0);
    setViewerImageIndex(0);
    setImageViewerVisible(false);
  }, [row.id]);

  useEffect(() => {
    let active = true;
    setSecondaryContentReady(false);
    void waitForProductDetailBackgroundSlot().then(() => {
      if (active) setSecondaryContentReady(true);
    });
    return () => {
      active = false;
    };
  }, [row.id]);

  useEffect(() => {
    if (!contactVisible || ContactSupplierModal) return undefined;
    let active = true;
    void import("./components/MarketContactSupplierModal").then((module) => {
      if (active) setContactSupplierModal(() => module.default);
    });
    return () => {
      active = false;
    };
  }, [ContactSupplierModal, contactVisible]);

  useEffect(() => {
    let active = true;
    setRelatedListings([]);
    setRelatedLoading(true);

    void waitForProductDetailBackgroundSlot()
      .then(async () => {
        const { loadMarketHomePage } = await import("./market.repository");
        const page = await loadMarketHomePage({
          limit: 12,
          offset: 0,
          filters: {
            side: "all",
            kind: getCategoryKind(row.presentationCategory),
          },
        });
        if (!active) return;

        const sameCategory = filterMarketHomeListings(page.listings, {
          query: "",
          side: "all",
          kind: "all",
          category: row.presentationCategory,
        });
        const sourceListings = sameCategory.length ? sameCategory : page.listings;
        const seen = new Set<string>([row.id]);
        const nextListings: MarketHomeListingCard[] = [];
        sourceListings.forEach((item) => {
          if (!item.id || seen.has(item.id)) return;
          seen.add(item.id);
          nextListings.push(item);
        });
        setRelatedListings(nextListings.slice(0, 6));
      })
      .catch(() => {
        if (active) setRelatedListings([]);
      })
      .finally(() => {
        if (active) setRelatedLoading(false);
      });

    return () => {
      active = false;
    };
  }, [row.id, row.presentationCategory]);

  const openUrl = async (url: string, unavailableMessage: string) => {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert(MARKET_ALERT_TITLE, unavailableMessage);
      return;
    }
    await Linking.openURL(url);
  };

  const handleOpenContact = () => {
    setContactErrorText(null);
    setContactMessage(`Здравствуйте. Хочу уточнить условия по позиции "${row.title}".`);
    setContactVisible(true);
  };

  const handleCloseContact = () => {
    if (actionBusy === "contact") return;
    setContactVisible(false);
    setContactMessage("");
    setContactErrorText(null);
  };

  const handleSubmitContact = async () => {
    if (actionBusy) return;
    setActionBusy("contact");
    setContactErrorText(null);
    try {
      const { contactMarketplaceSupplier } = await import("./market.repository");
      await contactMarketplaceSupplier({
        listing: row,
        message: contactMessage,
      });
      Alert.alert(MARKET_ALERT_TITLE, "Сообщение поставщику отправлено.");
      setContactVisible(false);
      setContactMessage("");
    } catch (error: unknown) {
      setContactErrorText(
        error instanceof Error ? error.message : "Не удалось отправить сообщение поставщику.",
      );
    } finally {
      setActionBusy(null);
    }
  };

  const galleryImageUrls = row.imageUrls.length ? row.imageUrls : row.imageUrl ? [row.imageUrl] : [];
  const galleryItems: ProductGalleryItem[] = [
    ...galleryImageUrls.map((uri) => ({ kind: "photo" as const, uri })),
    ...row.videoUrls.map((uri) => ({ kind: "video" as const, uri })),
  ];
  const galleryMediaItems: ProductGalleryItem[] = (
    galleryItems.length
      ? galleryItems
      : [{ kind: "placeholder" as const, source: row.imageSource }]
  ).slice(0, PRODUCT_GALLERY_MAX_ITEMS);
  const selectedGalleryIndex = Math.min(selectedImageIndex, galleryMediaItems.length - 1);
  const heroMediaItem = galleryMediaItems[selectedGalleryIndex] ?? galleryMediaItems[0];
  const viewerPhotoIndexes = galleryMediaItems
    .map((item, index) => (item.kind === "video" ? null : index))
    .filter((index): index is number => index != null);
  const safeViewerImageIndex = viewerPhotoIndexes.includes(viewerImageIndex)
    ? viewerImageIndex
    : viewerPhotoIndexes[0] ?? 0;
  const viewerMediaItem = galleryMediaItems[safeViewerImageIndex];
  const viewerPhotoPosition = Math.max(0, viewerPhotoIndexes.indexOf(safeViewerImageIndex));

  const openImageViewer = (index: number) => {
    const item = galleryMediaItems[index];
    if (!item || item.kind === "video") return;
    setSelectedImageIndex(index);
    setViewerImageIndex(index);
    setImageViewerVisible(true);
  };

  const moveImageViewer = (direction: -1 | 1) => {
    const nextPosition = Math.max(0, Math.min(viewerPhotoIndexes.length - 1, viewerPhotoPosition + direction));
    const nextIndex = viewerPhotoIndexes[nextPosition];
    if (nextIndex == null) return;
    setViewerImageIndex(nextIndex);
    setSelectedImageIndex(nextIndex);
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card} testID="market_product_card">
          <View style={styles.heroLayout} testID="market_product_gallery">
            <View style={styles.heroMediaColumn}>
              <View style={styles.heroImageShell}>
                {heroMediaItem?.kind === "video" ? (
                  <React.Suspense fallback={<ProductHeroVideoLoading />}>
                    <ProductHeroVideo uri={heroMediaItem.uri} />
                  </React.Suspense>
                ) : (
                  <Pressable
                    style={styles.heroImage}
                    onPress={() => openImageViewer(selectedGalleryIndex)}
                    testID="market_product_hero_image_open"
                    accessibilityLabel="market:product:image-open"
                  >
                    <Image
                      testID="market_product_hero_image"
                      source={heroMediaItem?.kind === "photo" ? { uri: heroMediaItem.uri } : heroMediaItem?.source ?? row.imageSource}
                      style={styles.heroImageFill}
                      resizeMode="cover"
                    />
                  </Pressable>
                )}
                <View style={styles.galleryCounter} testID="market_product_gallery_counter">
                  <Text style={styles.galleryCounterText}>
                    {selectedGalleryIndex + 1} / {galleryMediaItems.length}
                  </Text>
                </View>
              </View>
              {secondaryContentReady && galleryMediaItems.length > 1 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.galleryStrip}
                  testID="market_product_gallery_strip"
                >
                  {galleryMediaItems.slice(0, PRODUCT_GALLERY_MAX_ITEMS).map((item, index) => (
                    <Pressable
                      key={`${row.id}:gallery:${index}`}
                      style={[
                        styles.galleryThumbButton,
                        index === selectedGalleryIndex ? styles.galleryThumbButtonActive : null,
                      ]}
                      onPress={() => setSelectedImageIndex(index)}
                      onLongPress={() => openImageViewer(index)}
                      testID={`market_product_gallery_thumb_${index}`}
                    >
                      {item.kind === "video" ? (
                        <View style={styles.galleryVideoThumb} testID={`market_product_gallery_video_${index}`}>
                          <Text style={styles.galleryPlayIcon}>▶</Text>
                          <Text style={styles.galleryVideoThumbText}>Видео</Text>
                        </View>
                      ) : (
                        <Image
                          source={item.kind === "photo" ? { uri: item.uri } : item.source}
                          style={styles.galleryThumbImage}
                          resizeMode="cover"
                          testID={`market_product_gallery_image_${index}`}
                        />
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
              <View style={styles.heroMeta}>
                <View style={[styles.sideBadge, row.isDemand ? styles.sideBadgeDemand : styles.sideBadgeOffer]}>
                  <Text style={styles.sideBadgeText}>{row.sideLabel}</Text>
                </View>
                <Text style={styles.heroStatus}>{row.statusLabel}</Text>
              </View>
            </View>
            <View style={styles.heroInfoColumn}>
              <Text style={styles.title}>{row.title}</Text>
              <Text style={styles.price}>
                {row.price != null
                  ? `${row.price.toLocaleString("ru-RU")} сом${row.uom ? ` / ${row.uom}` : ""}`
                  : "Цена по запросу"}
              </Text>
              <Text style={styles.meta}>{row.city || "Город не указан"}</Text>
              <Text style={styles.metaStrong}>{row.sellerDisplayName}</Text>
              {row.description ? <Text style={styles.description}>{row.description}</Text> : null}
              {row.stockLabel ? (
                <Text style={styles.stockText} testID="market_product_stock_label">
                  {row.stockLabel}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.contactPanel} testID="market_product_contact_panel">
            <Text style={styles.sectionTitle}>Связаться с продавцом</Text>
            <View style={styles.actions}>
              {row.supplierId || row.sellerUserId ? (
                <Pressable
                  style={[styles.actionBtn, styles.secondaryBtn]}
                  onPress={handleOpenContact}
                  disabled={actionBusy != null}
                  testID="market_product_contact_supplier"
                  accessibilityLabel="market:product:contact-supplier"
                >
                  {actionBusy === "contact" ? (
                    <ActivityIndicator color={MARKET_HOME_COLORS.accentStrong} size="small" />
                  ) : (
                    <Text style={styles.secondaryActionText}>Связаться с поставщиком</Text>
                  )}
                </Pressable>
              ) : null}
              {row.whatsapp ? (
                <Pressable
                  style={[styles.actionBtn, styles.whatsBtn]}
                  onPress={() =>
                    openUrl(`https://wa.me/${String(row.whatsapp).replace(/[^\d]/g, "")}`, "Не удалось открыть WhatsApp.")
                  }
                  disabled={actionBusy != null}
                >
                  <Text style={styles.actionText}>Связаться (WhatsApp)</Text>
                </Pressable>
              ) : null}
              {row.phone ? (
                <Pressable
                  style={[styles.actionBtn, styles.callBtn]}
                  onPress={() =>
                    openUrl(`tel:${String(row.phone).replace(/[^\d+]/g, "")}`, "Не удалось открыть звонок.")
                  }
                  disabled={actionBusy != null}
                >
                  <Text style={styles.actionText}>Позвонить</Text>
                </Pressable>
              ) : null}
              {row.email ? (
                <Pressable
                  style={[styles.actionBtn, styles.secondaryBtn]}
                  onPress={() => openUrl(`mailto:${row.email}`, "Не удалось открыть email.")}
                  disabled={actionBusy != null}
                >
                  <Text style={styles.secondaryActionText}>Email</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>

        {secondaryContentReady ? (
          <>
            {relatedLoading || relatedListings.length ? (
              <View style={styles.relatedSection} testID="market_product_related_feed">
                <Text style={styles.sectionTitle}>Другие объявления</Text>
                {relatedLoading ? (
                  <View style={styles.relatedLoader}>
                    <ActivityIndicator color={MARKET_HOME_COLORS.accentStrong} />
                  </View>
                ) : (
                  <View style={styles.relatedList}>
                    {relatedListings.slice(0, RELATED_LISTINGS_MAX_ITEMS).map((listing) => (
                      <MarketFeedCard
                        key={listing.id}
                        variant="market-primary"
                        listing={listing}
                        onOpen={() => router.push(buildMarketProductRoute(listing.id))}
                        onMapPress={() => openSupplierMapForProduct(listing)}
                        onPhonePress={
                          listing.phone
                            ? () => openUrl(`tel:${String(listing.phone).replace(/[^\d+]/g, "")}`, "Не удалось открыть звонок.")
                            : undefined
                        }
                        onWhatsAppPress={
                          listing.whatsapp
                            ? () => openUrl(`https://wa.me/${String(listing.whatsapp).replace(/[^\d]/g, "")}`, "Не удалось открыть WhatsApp.")
                            : undefined
                        }
                        actionsDisabled={actionBusy != null}
                      />
                    ))}
                  </View>
                )}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {contactVisible && ContactSupplierModal ? (
        <ContactSupplierModal
          visible={contactVisible}
          supplierName={row.sellerDisplayName}
          message={contactMessage}
          busy={actionBusy === "contact"}
          errorText={contactErrorText}
          onChangeMessage={setContactMessage}
          onClose={handleCloseContact}
          onSubmit={() => void handleSubmitContact()}
        />
      ) : null}

      <Modal
        visible={imageViewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageViewerVisible(false)}
        testID="market_product_image_viewer"
      >
        <View style={styles.viewerRoot}>
          <Pressable
            style={styles.viewerBackdrop}
            onPress={() => setImageViewerVisible(false)}
            testID="market_product_image_viewer_backdrop"
          />
          <View style={styles.viewerFrame}>
            {viewerMediaItem?.kind === "photo" || viewerMediaItem?.kind === "placeholder" ? (
              <Image
                testID="market_product_viewer_image"
                source={viewerMediaItem.kind === "photo" ? { uri: viewerMediaItem.uri } : viewerMediaItem.source}
                style={styles.viewerImage}
                resizeMode="contain"
              />
            ) : null}
            <View style={styles.viewerCounter} testID="market_product_image_viewer_counter">
              <Text style={styles.viewerCounterText}>
                {viewerPhotoPosition + 1} / {Math.max(1, viewerPhotoIndexes.length)}
              </Text>
            </View>
            {viewerPhotoIndexes.length > 1 ? (
              <>
                <Pressable
                  style={[styles.viewerArrow, styles.viewerArrowLeft]}
                  onPress={() => moveImageViewer(-1)}
                  disabled={viewerPhotoPosition <= 0}
                  testID="market_product_image_viewer_prev"
                  accessibilityLabel="market:product:image-prev"
                >
                  <Text style={styles.viewerArrowText}>‹</Text>
                </Pressable>
                <Pressable
                  style={[styles.viewerArrow, styles.viewerArrowRight]}
                  onPress={() => moveImageViewer(1)}
                  disabled={viewerPhotoPosition >= viewerPhotoIndexes.length - 1}
                  testID="market_product_image_viewer_next"
                  accessibilityLabel="market:product:image-next"
                >
                  <Text style={styles.viewerArrowText}>›</Text>
                </Pressable>
              </>
            ) : null}
            <Pressable
              style={styles.viewerClose}
              onPress={() => setImageViewerVisible(false)}
              testID="market_product_image_viewer_close"
              accessibilityLabel="market:product:image-close"
            >
              <Text style={styles.viewerCloseText}>×</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 14,
    paddingBottom: 32,
    maxWidth: 860,
    width: "100%",
    alignSelf: "center",
  },
  card: {
    backgroundColor: MARKET_HOME_COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
    padding: 18,
    gap: 12,
    ...Platform.select({
      web: { boxShadow: "0px 10px 18px rgba(15, 23, 42, 0.06)" },
      default: {
        shadowColor: "#0F172A",
        shadowOpacity: 0.06,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 4,
      },
    }),
  },
  heroLayout: {
    flexDirection: "column",
    gap: 16,
    alignItems: "stretch",
  },
  heroMediaColumn: {
    width: "100%",
    gap: 8,
  },
  heroInfoColumn: {
    width: "100%",
    gap: 10,
  },
  heroImageShell: {
    width: "100%",
    position: "relative",
  },
  heroImage: {
    width: "100%",
    aspectRatio: 16 / 9,
    maxHeight: Platform.OS === "web" ? 320 : 300,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
  },
  heroImageFill: {
    width: "100%",
    height: "100%",
  },
  galleryCounter: {
    position: "absolute",
    right: 10,
    bottom: 10,
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  galleryCounterText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  galleryStrip: {
    gap: 8,
    paddingVertical: 2,
  },
  galleryThumbButton: {
    width: 74,
    height: 58,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
  galleryThumbButtonActive: {
    borderColor: MARKET_HOME_COLORS.accentStrong,
  },
  galleryThumbImage: {
    width: "100%",
    height: "100%",
  },
  galleryVideoThumb: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    backgroundColor: "#0F172A",
  },
  heroPlayIcon: {
    color: "#FFFFFF",
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900",
  },
  galleryPlayIcon: {
    color: "#FFFFFF",
    fontSize: 20,
    lineHeight: 22,
    fontWeight: "900",
  },
  galleryVideoThumbText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  heroMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sideBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  sideBadgeOffer: {
    backgroundColor: MARKET_HOME_COLORS.accentSoft,
  },
  sideBadgeDemand: {
    backgroundColor: "#FDE7E1",
  },
  sideBadgeText: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },
  heroStatus: {
    color: MARKET_HOME_COLORS.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 24,
    fontWeight: "900",
  },
  price: {
    color: MARKET_HOME_COLORS.accentStrong,
    fontSize: 20,
    fontWeight: "900",
  },
  meta: {
    color: MARKET_HOME_COLORS.textSoft,
    fontWeight: "600",
  },
  metaStrong: {
    color: MARKET_HOME_COLORS.text,
    fontWeight: "800",
  },
  stockText: {
    color: MARKET_HOME_COLORS.emerald,
    fontWeight: "800",
  },
  description: {
    color: MARKET_HOME_COLORS.text,
    lineHeight: 22,
    fontSize: 15,
  },
  sectionTitle: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 18,
    fontWeight: "900",
  },
  contactPanel: {
    borderTopWidth: 1,
    borderTopColor: MARKET_HOME_COLORS.border,
    paddingTop: 14,
    gap: 10,
  },
  relatedSection: {
    gap: 12,
  },
  relatedList: {
    gap: 14,
  },
  relatedLoader: {
    minHeight: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  actionBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  callBtn: {
    backgroundColor: MARKET_HOME_COLORS.accentStrong,
  },
  whatsBtn: {
    backgroundColor: MARKET_HOME_COLORS.emerald,
  },
  secondaryBtn: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  actionText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  secondaryActionText: {
    color: MARKET_HOME_COLORS.accentStrong,
    fontWeight: "800",
  },
  viewerRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2, 6, 23, 0.88)",
  },
  viewerBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  viewerFrame: {
    width: Platform.OS === "web" ? "86%" : "92%",
    height: Platform.OS === "web" ? "84%" : "78%",
    maxWidth: 1180,
    maxHeight: 860,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
  },
  viewerImage: {
    width: "100%",
    height: "100%",
  },
  viewerCounter: {
    position: "absolute",
    left: 16,
    bottom: 16,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerCounterText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  viewerClose: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerCloseText: {
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "700",
  },
  viewerArrow: {
    position: "absolute",
    top: "50%",
    width: 48,
    height: 64,
    marginTop: -32,
    borderRadius: 24,
    backgroundColor: "rgba(15, 23, 42, 0.66)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerArrowLeft: {
    left: 14,
  },
  viewerArrowRight: {
    right: 14,
  },
  viewerArrowText: {
    color: "#FFFFFF",
    fontSize: 44,
    lineHeight: 48,
    fontWeight: "500",
  },
});
