import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  type ImageSourcePropType,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { MARKET_HOME_COLORS } from "./marketHome.colors";
import { buildListingAssistantPrompt, buildMarketMapParams } from "./marketHome.data";
import type { MarketHomeListingCard, MarketRoleCapabilities } from "./marketHome.types";
import {
  buildMarketSupplierMapRoute,
  buildMarketSupplierShowcaseRoute,
  MARKET_AI_ROUTE,
  MARKET_TAB_ROUTE,
} from "./market.routes";
import { waitForProductDetailBackgroundSlot } from "./productDetailBackgroundSlot";

type MarketContactSupplierModalComponent = typeof import("./components/MarketContactSupplierModal").default;

type ProductGalleryItem =
  | { kind: "photo"; uri: string }
  | { kind: "video"; uri: string }
  | { kind: "placeholder"; source: ImageSourcePropType };

export type ProductDetailsContentProps = {
  row: MarketHomeListingCard;
  capabilities: MarketRoleCapabilities;
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

function openAssistantForProduct(row: MarketHomeListingCard) {
  router.push(MARKET_AI_ROUTE(buildListingAssistantPrompt(row)));
}

export default function ProductDetailsContent({ row, capabilities }: ProductDetailsContentProps) {
  const [qtyMultiplier, setQtyMultiplier] = useState(1);
  const [actionBusy, setActionBusy] = useState<"request" | "proposal" | "contact" | null>(null);
  const [contactVisible, setContactVisible] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [contactErrorText, setContactErrorText] = useState<string | null>(null);
  const [ContactSupplierModal, setContactSupplierModal] = useState<MarketContactSupplierModalComponent | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [secondaryContentReady, setSecondaryContentReady] = useState(false);

  useEffect(() => {
    setSelectedImageIndex(0);
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

  const openUrl = async (url: string, unavailableMessage: string) => {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert(MARKET_ALERT_TITLE, unavailableMessage);
      return;
    }
    await Linking.openURL(url);
  };

  const changeQty = (next: number) => {
    setQtyMultiplier(Math.max(1, Math.min(999, Math.round(next))));
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

  const handleAddToRequest = async () => {
    setActionBusy("request");
    try {
      const { addMarketplaceListingToRequest } = await import("./market.repository");
      const result = await addMarketplaceListingToRequest(row, qtyMultiplier);
      Alert.alert(MARKET_ALERT_TITLE, `Добавлено в заявку: ${result.addedCount} поз. Черновик ${result.requestId}.`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Не удалось добавить товар в заявку.";
      Alert.alert(MARKET_ALERT_TITLE, message);
    } finally {
      setActionBusy(null);
    }
  };

  const handleCreateProposal = async () => {
    setActionBusy("proposal");
    try {
      const { createMarketplaceProposal } = await import("./market.repository");
      const result = await createMarketplaceProposal(row, qtyMultiplier);
      Alert.alert(
        MARKET_ALERT_TITLE,
        `Предложение создано${result.proposalNo ? `: ${result.proposalNo}` : ""}.`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Не удалось создать предложение.";
      Alert.alert(MARKET_ALERT_TITLE, message);
    } finally {
      setActionBusy(null);
    }
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
  const galleryMediaItems: ProductGalleryItem[] = galleryItems.length
    ? galleryItems
    : [{ kind: "placeholder", source: row.imageSource }];
  const selectedGalleryIndex = Math.min(selectedImageIndex, galleryMediaItems.length - 1);
  const heroMediaItem = galleryMediaItems[selectedGalleryIndex] ?? galleryMediaItems[0];

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.heroLayout} testID="market_product_gallery">
            <View style={styles.heroMediaColumn}>
              <View style={styles.heroImageShell}>
                {heroMediaItem?.kind === "video" ? (
                  <React.Suspense fallback={<ProductHeroVideoLoading />}>
                    <ProductHeroVideo uri={heroMediaItem.uri} />
                  </React.Suspense>
                ) : (
                  <Image
                    testID="market_product_hero_image"
                    source={heroMediaItem?.kind === "photo" ? { uri: heroMediaItem.uri } : heroMediaItem?.source ?? row.imageSource}
                    style={styles.heroImage}
                    resizeMode="cover"
                  />
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
                  {galleryMediaItems.map((item, index) => (
                    <Pressable
                      key={`${row.id}:gallery:${index}`}
                      style={[
                        styles.galleryThumbButton,
                        index === selectedGalleryIndex ? styles.galleryThumbButtonActive : null,
                      ]}
                      onPress={() => setSelectedImageIndex(index)}
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
        </View>

        {secondaryContentReady ? (
          <>
            <View style={styles.card}>
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

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Ещё в маркете</Text>
              <View style={styles.routeRow}>
                <Pressable style={styles.routeChip} onPress={() => router.push(MARKET_TAB_ROUTE)}>
                  <Text style={styles.routeChipText}>Маркет</Text>
                </Pressable>
                <Pressable
                  style={styles.routeChip}
                  onPress={() => router.push(buildMarketSupplierShowcaseRoute(row.sellerUserId, row.sellerCompanyId))}
                  disabled={actionBusy != null}
                >
                  <Text style={styles.routeChipText}>Витрина</Text>
                </Pressable>
                <Pressable
                  style={styles.routeChip}
                  onPress={() => openSupplierMapForProduct(row)}
                  disabled={actionBusy != null}
                >
                  <Text style={styles.routeChipText}>Карта</Text>
                </Pressable>
                <Pressable
                  style={styles.routeChip}
                  onPress={() => openAssistantForProduct(row)}
                  disabled={actionBusy != null}
                >
                  <Text style={styles.routeChipText}>Спросить AI</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Для ERP и закупок</Text>
              <View style={styles.qtyRow}>
                <Text style={styles.qtyLabel}>Количество</Text>
                <View style={styles.qtyControls}>
                  <Pressable style={styles.qtyButton} onPress={() => changeQty(qtyMultiplier - 1)}>
                    <Text style={styles.qtyButtonText}>−</Text>
                  </Pressable>
                  <Text style={styles.qtyValue}>{qtyMultiplier}</Text>
                  <Pressable style={styles.qtyButton} onPress={() => changeQty(qtyMultiplier + 1)}>
                    <Text style={styles.qtyButtonText}>+</Text>
                  </Pressable>
                </View>
              </View>
              <Text style={styles.erpHint}>
                {row.erpItems.length
                  ? `ERP-позиций: ${row.erpItems.length}. Множитель применяется ко всем позициям объявления.`
                  : "Это объявление пока не связано с каталогом ERP."}
              </Text>
              <View style={styles.erpActions}>
                {capabilities.canAddToRequest ? (
                  <Pressable
                    style={[styles.actionBtn, styles.callBtn, !row.erpItems.length ? styles.disabledBtn : null]}
                    onPress={() => void handleAddToRequest()}
                    disabled={!row.erpItems.length || actionBusy != null}
                    nativeID="market-product-add-to-request"
                    testID="market_product_add_to_request"
                    accessibilityLabel="market:product:add-to-request"
                  >
                    <Text style={styles.actionText}>
                      {actionBusy === "request" ? "Добавляем..." : "Добавить в заявку"}
                    </Text>
                  </Pressable>
                ) : null}
                {capabilities.canCreateProposal ? (
                  <Pressable
                    style={[styles.actionBtn, styles.secondaryBtn, !row.erpItems.length ? styles.disabledBtn : null]}
                    onPress={() => void handleCreateProposal()}
                    disabled={!row.erpItems.length || actionBusy != null}
                    nativeID="market-product-create-proposal"
                    testID="market_product_create_proposal"
                    accessibilityLabel="market:product:create-proposal"
                  >
                    <Text style={styles.secondaryActionText}>
                      {actionBusy === "proposal" ? "Создаем..." : "Создать предложение"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            {row.items.length ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Позиции</Text>
                {row.items.map((item, index) => (
                  <View key={`${row.id}:${index}`} style={styles.itemRow}>
                    <View style={styles.itemCopy}>
                      <Text style={styles.itemName}>{item.name || item.rik_code || "Позиция"}</Text>
                      <Text style={styles.itemMeta}>
                        {item.kind || "—"}
                        {item.rik_code ? ` • ${item.rik_code}` : ""}
                      </Text>
                    </View>
                    <Text style={styles.itemQty}>
                      {item.qty != null ? item.qty : "—"} {item.uom || ""}
                    </Text>
                  </View>
                ))}
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
  routeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  routeChip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: MARKET_HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  routeChipText: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 12,
    fontWeight: "800",
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
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  qtyLabel: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  qtyButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyButtonText: {
    color: MARKET_HOME_COLORS.accentStrong,
    fontSize: 20,
    fontWeight: "900",
  },
  qtyValue: {
    minWidth: 28,
    textAlign: "center",
    color: MARKET_HOME_COLORS.text,
    fontSize: 16,
    fontWeight: "900",
  },
  erpHint: {
    color: MARKET_HOME_COLORS.textSoft,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  erpActions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  itemRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
  },
  itemCopy: {
    flex: 1,
  },
  itemName: {
    color: MARKET_HOME_COLORS.text,
    fontWeight: "800",
  },
  itemMeta: {
    color: MARKET_HOME_COLORS.textSoft,
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
  },
  itemQty: {
    color: MARKET_HOME_COLORS.accentStrong,
    fontWeight: "900",
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
  disabledBtn: {
    opacity: 0.45,
  },
  actionText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  secondaryActionText: {
    color: MARKET_HOME_COLORS.accentStrong,
    fontWeight: "800",
  },
});
