import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ListRenderItemInfo,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type FlatList,
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import { FlashList } from "../../ui/FlashList";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import MarketCategoryRail from "./components/MarketCategoryRail";
import MarketAssistantBanner from "./components/MarketAssistantBanner";
import MarketContactSupplierModal from "./components/MarketContactSupplierModal";
import MarketFeedCard from "./components/MarketFeedCard";
import MarketHeaderBar from "./components/MarketHeaderBar";
import MarketHeroCarousel from "./components/MarketHeroCarousel";
import MarketTenderBanner from "./components/MarketTenderBanner";
import {
  MARKET_HOME_BANNERS,
  MARKET_HOME_CATEGORIES,
  MARKET_HOME_COLORS,
  getCategoryLabel,
} from "./marketHome.config";
import {
  buildListingAssistantPrompt,
  buildMarketAssistantPrompt,
  buildMarketMapParams,
  filterMarketHomeListings,
  getCategoryKind,
  getFeedHeading,
} from "./marketHome.data";
import {
  contactMarketplaceSupplier,
  MARKET_PAGE_SIZE,
  addMarketplaceListingToRequest,
  createMarketplaceProposal,
  loadMarketHomePage,
  loadMarketRoleCapabilities,
} from "./market.repository";
import {
  buildMarketProductRoute,
  buildMarketSupplierMapRoute,
  buildMarketSupplierShowcaseRoute,
  MARKET_AI_ROUTE,
  MARKET_PROFILE_ROUTE,
} from "./market.routes";
import type { MarketHomeListingCard, MarketRoleCapabilities } from "./marketHome.types";
import { useMarketHeaderProfile } from "./useMarketHeaderProfile";
import { useMarketUiStore } from "./marketUi.store";

type FeedState = {
  listings: MarketHomeListingCard[];
  activeDemandCount: number;
  totalCount: number;
  hasMore: boolean;
  offset: number;
};

const DEFAULT_FEED_STATE: FeedState = {
  listings: [],
  activeDemandCount: 0,
  totalCount: 0,
  hasMore: true,
  offset: 0,
};

const DEFAULT_CAPABILITIES: MarketRoleCapabilities = {
  role: null,
  canAddToRequest: false,
  canCreateProposal: false,
};
const MARKET_HOME_SURFACE = "home_feed";

const trim = (value: unknown) => String(value ?? "").trim();
const buildActionKey = (action: "contact" | "request" | "proposal", listingId: string) =>
  `${action}:${trim(listingId)}`;

export default function MarketHomeScreen() {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<MarketHomeListingCard>>(null);
  const headerProfile = useMarketHeaderProfile();

  const activeCategory = useMarketUiStore((state) => state.activeCategory);
  const query = useMarketUiStore((state) => state.query);
  const side = useMarketUiStore((state) => state.side);
  const kind = useMarketUiStore((state) => state.kind);
  const selectedItemId = useMarketUiStore((state) => state.selectedItemId);
  const loadingMore = useMarketUiStore((state) => state.loadingMore);
  const setActiveCategory = useMarketUiStore((state) => state.setActiveCategory);
  const setQuery = useMarketUiStore((state) => state.setQuery);
  const setSide = useMarketUiStore((state) => state.setSide);
  const setKind = useMarketUiStore((state) => state.setKind);
  const setSelectedItemId = useMarketUiStore((state) => state.setSelectedItemId);
  const setLoadingMore = useMarketUiStore((state) => state.setLoadingMore);

  const [feed, setFeed] = useState<FeedState>(DEFAULT_FEED_STATE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [capabilities, setCapabilities] = useState<MarketRoleCapabilities>(DEFAULT_CAPABILITIES);
  const [feedAnchorOffset, setFeedAnchorOffset] = useState(640);
  const [busyActionKey, setBusyActionKey] = useState<string | null>(null);
  const [contactListing, setContactListing] = useState<MarketHomeListingCard | null>(null);
  const [contactMessage, setContactMessage] = useState("");
  const [contactErrorText, setContactErrorText] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      query,
      side,
      kind,
      category: activeCategory,
    }),
    [activeCategory, kind, query, side],
  );
  const numColumns = width >= 1180 ? 3 : 2;
  const horizontalPadding = 20;
  const gap = 14;
  const columnWidth = useMemo(() => {
    const usableWidth = Math.min(width, 1240) - horizontalPadding * 2 - gap * (numColumns - 1);
    return Math.max(154, usableWidth / numColumns);
  }, [gap, horizontalPadding, numColumns, width]);

  const openPhone = useCallback(async (phone: string | null) => {
    const cleaned = String(phone || "").replace(/[^\d+]/g, "");
    if (!cleaned) return;
    const url = `tel:${cleaned}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Маркет", "Не удалось открыть звонок.");
      return;
    }
    await Linking.openURL(url);
  }, []);

  const openWhatsApp = useCallback(async (phone: string | null) => {
    const cleaned = String(phone || "").replace(/[^\d]/g, "");
    if (!cleaned) return;
    const url = `https://wa.me/${cleaned}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Маркет", "Не удалось открыть WhatsApp.");
      return;
    }
    await Linking.openURL(url);
  }, []);

  const pushSupplierMap = useCallback(
    (row?: MarketHomeListingCard, sideOverride?: "offer" | "demand") => {
      const params = buildMarketMapParams(
        { side: filters.side, kind: filters.kind },
        {
          row: row ?? null,
          side: sideOverride,
        },
      );
      router.push(buildMarketSupplierMapRoute(params));
    },
    [filters.kind, filters.side],
  );

  const pushSupplierShowcase = useCallback((row: Pick<MarketHomeListingCard, "sellerUserId" | "sellerCompanyId">) => {
    router.push(buildMarketSupplierShowcaseRoute(row.sellerUserId, row.sellerCompanyId));
  }, []);

  const openAssistant = useCallback((prompt: string) => {
    router.push(MARKET_AI_ROUTE(prompt));
  }, []);

  const loadInitialPage = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);

      try {
        const capabilitiesPromise = loadMarketRoleCapabilities().catch((error: unknown) => {
          recordPlatformObservability({
            screen: "market",
            surface: MARKET_HOME_SURFACE,
            category: "fetch",
            event: "market_load_capabilities",
            result: "error",
            errorStage: "role_capabilities",
            errorMessage: error instanceof Error ? error.message : String(error ?? "unknown"),
          });
          return DEFAULT_CAPABILITIES;
        });

        const [page, nextCapabilities] = await Promise.all([
          loadMarketHomePage({
            offset: 0,
            limit: MARKET_PAGE_SIZE,
            filters: { side, kind },
          }),
          capabilitiesPromise,
        ]);
        setFeed({
          listings: page.listings,
          activeDemandCount: page.activeDemandCount,
          totalCount: page.totalCount,
          hasMore: page.hasMore,
          offset: page.listings.length,
        });
        setCapabilities(nextCapabilities);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Не удалось загрузить маркет.";
        Alert.alert("Маркет", message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [kind, side],
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || refreshing || !feed.hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = await loadMarketHomePage({
        offset: feed.offset,
        limit: MARKET_PAGE_SIZE,
        filters: { side, kind },
      });
      setFeed((prev) => {
        const nextListings = [...prev.listings];
        const seen = new Set(prev.listings.map((item) => item.id));
        nextPage.listings.forEach((item) => {
          if (!seen.has(item.id)) nextListings.push(item);
        });
        return {
          listings: nextListings,
          activeDemandCount: nextPage.activeDemandCount,
          totalCount: nextPage.totalCount,
          hasMore: nextPage.hasMore,
          offset: nextListings.length,
        };
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Не удалось догрузить маркет.";
      Alert.alert("Маркет", message);
    } finally {
      setLoadingMore(false);
    }
  }, [feed.hasMore, feed.offset, kind, loading, loadingMore, refreshing, setLoadingMore, side]);

  useFocusEffect(
    useCallback(() => {
      void loadInitialPage("initial");
    }, [loadInitialPage]),
  );

  const filteredListings = useMemo(
    () => filterMarketHomeListings(feed.listings, filters),
    [feed.listings, filters],
  );

  const handleCategorySelect = useCallback(
    (category: typeof activeCategory) => {
      if (activeCategory === category) {
        setActiveCategory("all");
        setKind("all");
        return;
      }
      setActiveCategory(category);
      setKind(getCategoryKind(category));
    },
    [activeCategory, setActiveCategory, setKind],
  );

  const handleBannerPress = useCallback(
    (action: "scroll_feed" | "open_map" | "open_offer_map") => {
      if (action === "scroll_feed") {
        listRef.current?.scrollToOffset({ offset: feedAnchorOffset, animated: true });
        return;
      }
      if (action === "open_offer_map") {
        pushSupplierMap(undefined, "offer");
        return;
      }
      pushSupplierMap();
    },
    [feedAnchorOffset, pushSupplierMap],
  );

  const handleOpenListing = useCallback((listing: MarketHomeListingCard) => {
    recordPlatformObservability({
      screen: "market",
      surface: MARKET_HOME_SURFACE,
      category: "ui",
      event: "market_open_item",
      result: "success",
      extra: {
        listingId: listing.id,
        source: listing.source,
      },
    });
    setSelectedItemId(listing.id);
    router.push(buildMarketProductRoute(listing.id));
  }, [setSelectedItemId]);

  const handleAddToRequest = useCallback(async (listing: MarketHomeListingCard) => {
    const actionKey = buildActionKey("request", listing.id);
    if (busyActionKey) return;
    setBusyActionKey(actionKey);
    try {
      const result = await addMarketplaceListingToRequest(listing, 1);
      Alert.alert("Маркет", `Добавлено в заявку: ${result.addedCount} поз. Черновик ${result.requestId}.`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Не удалось добавить товар в заявку.";
      Alert.alert("Маркет", message);
    } finally {
      setBusyActionKey(null);
    }
  }, [busyActionKey]);

  const handleCreateProposal = useCallback(async (listing: MarketHomeListingCard) => {
    const actionKey = buildActionKey("proposal", listing.id);
    if (busyActionKey) return;
    setBusyActionKey(actionKey);
    try {
      const result = await createMarketplaceProposal(listing, 1);
      Alert.alert(
        "Маркет",
        `Предложение создано${result.proposalNo ? `: ${result.proposalNo}` : ""}.`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Не удалось создать предложение.";
      Alert.alert("Маркет", message);
    } finally {
      setBusyActionKey(null);
    }
  }, [busyActionKey]);

  const handleOpenContactSupplier = useCallback((listing: MarketHomeListingCard) => {
    setContactListing(listing);
    setContactMessage(`Здравствуйте. Хочу уточнить условия по позиции "${listing.title}".`);
    setContactErrorText(null);
  }, []);

  const handleCloseContactSupplier = useCallback(() => {
    if (busyActionKey?.startsWith("contact:")) return;
    setContactListing(null);
    setContactMessage("");
    setContactErrorText(null);
  }, [busyActionKey]);

  const handleSubmitContactSupplier = useCallback(async () => {
    if (!contactListing) return;
    const actionKey = buildActionKey("contact", contactListing.id);
    if (busyActionKey) return;
    setBusyActionKey(actionKey);
    setContactErrorText(null);
    try {
      await contactMarketplaceSupplier({
        listing: contactListing,
        message: contactMessage,
      });
      Alert.alert("Маркет", "Сообщение поставщику отправлено.");
      setContactListing(null);
      setContactMessage("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Не удалось отправить сообщение поставщику.";
      setContactErrorText(message);
    } finally {
      setBusyActionKey(null);
    }
  }, [busyActionKey, contactListing, contactMessage]);

  const renderCard = useCallback(
    ({ item }: ListRenderItemInfo<MarketHomeListingCard>) => (
      <View style={[styles.feedCell, { width: columnWidth }]}>
        <MarketFeedCard
          listing={item}
          onOpen={() => handleOpenListing(item)}
          onMapPress={() => pushSupplierMap(item)}
          onShowcasePress={() => pushSupplierShowcase(item)}
          onAssistantPress={() => openAssistant(buildListingAssistantPrompt(item))}
          onPhonePress={item.phone ? () => void openPhone(item.phone) : undefined}
          onWhatsAppPress={item.whatsapp ? () => void openWhatsApp(item.whatsapp) : undefined}
          onContactSupplierPress={(item.supplierId || item.sellerUserId) ? () => handleOpenContactSupplier(item) : undefined}
          onAddToRequestPress={
            capabilities.canAddToRequest && item.erpItems.length
              ? () => void handleAddToRequest(item)
              : undefined
          }
          onCreateProposalPress={
            capabilities.canCreateProposal && item.erpItems.length
              ? () => void handleCreateProposal(item)
              : undefined
          }
          contactBusy={busyActionKey === buildActionKey("contact", item.id)}
          addToRequestBusy={busyActionKey === buildActionKey("request", item.id)}
          createProposalBusy={busyActionKey === buildActionKey("proposal", item.id)}
          actionsDisabled={busyActionKey != null}
        />
      </View>
    ),
    [
      busyActionKey,
      capabilities.canAddToRequest,
      capabilities.canCreateProposal,
      columnWidth,
      handleAddToRequest,
      handleCreateProposal,
      handleOpenContactSupplier,
      handleOpenListing,
      openAssistant,
      openPhone,
      openWhatsApp,
      pushSupplierMap,
      pushSupplierShowcase,
    ],
  );

  const header = (
    <View style={styles.headerContent}>
      <MarketHeaderBar
        query={query}
        onChangeQuery={setQuery}
        onMapPress={() => pushSupplierMap()}
        onProfilePress={() => router.push(MARKET_PROFILE_ROUTE)}
        avatarText={headerProfile.avatarText}
        avatarLabel={headerProfile.fullName}
        avatarUrl={headerProfile.avatarUrl}
      />

      <MarketHeroCarousel
        banners={MARKET_HOME_BANNERS}
        onPressBanner={(banner) => handleBannerPress(banner.action)}
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Категории</Text>
        <Pressable
          style={styles.sectionAction}
          onPress={() => {
            setActiveCategory("all");
            setSide("all");
            setKind("all");
          }}
        >
          <Text style={styles.sectionActionText}>Смотреть все</Text>
        </Pressable>
      </View>

      <MarketCategoryRail
        categories={MARKET_HOME_CATEGORIES}
        activeCategory={activeCategory}
        onSelect={handleCategorySelect}
      />

      <MarketTenderBanner count={feed.activeDemandCount} comingSoon />

      <MarketAssistantBanner
        onOpenAssistant={() => openAssistant(buildMarketAssistantPrompt(filters))}
        onOpenMap={() => pushSupplierMap()}
      />

      <View style={styles.feedHeader} onLayout={(event) => setFeedAnchorOffset(event.nativeEvent.layout.y)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.feedTitle}>{getFeedHeading(activeCategory)}</Text>
          <Text style={styles.feedSubtitle}>
            {activeCategory === "all"
              ? `${filteredListings.length} объявлений из ${feed.totalCount.toLocaleString("ru-RU")}`
              : `${getCategoryLabel(activeCategory)} • ${filteredListings.length} объявлений`}
          </Text>
          {selectedItemId ? (
            <Text style={styles.feedHint}>Открыта карточка: {selectedItemId}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator color={MARKET_HOME_COLORS.accent} size="large" />
        <Text style={styles.loadingText}>Собираем маркетплейс...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlashList
        ref={listRef}
        data={filteredListings}
        key={numColumns}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        numColumns={numColumns}
        estimatedItemSize={360}
        ListHeaderComponent={header}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={MARKET_HOME_COLORS.accent} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Ничего не найдено</Text>
            <Text style={styles.emptyText}>Попробуйте изменить запрос или сбросить выбранную категорию.</Text>
          </View>
        }
        contentContainerStyle={styles.contentContainer}
        columnWrapperStyle={numColumns > 1 ? styles.feedRow : undefined}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadInitialPage("refresh")}
            tintColor={MARKET_HOME_COLORS.accent}
          />
        }
        showsVerticalScrollIndicator={false}
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.35}
      />

      <MarketContactSupplierModal
        visible={contactListing != null}
        supplierName={contactListing?.sellerDisplayName ?? "Поставщик"}
        message={contactMessage}
        busy={busyActionKey?.startsWith("contact:") === true}
        errorText={contactErrorText}
        onChangeMessage={setContactMessage}
        onClose={handleCloseContactSupplier}
        onSubmit={() => void handleSubmitContactSupplier()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: MARKET_HOME_COLORS.background,
  },
  loadingState: {
    flex: 1,
    backgroundColor: MARKET_HOME_COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: MARKET_HOME_COLORS.textSoft,
    fontSize: 15,
    fontWeight: "600",
  },
  contentContainer: {
    paddingTop: 14,
    paddingBottom: 28,
  },
  headerContent: {
    gap: 26,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 22,
    fontWeight: "900",
  },
  sectionAction: {
    paddingVertical: 4,
  },
  sectionActionText: {
    color: MARKET_HOME_COLORS.textSoft,
    fontSize: 16,
    fontWeight: "700",
  },
  feedHeader: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  feedTitle: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "900",
  },
  feedSubtitle: {
    marginTop: 6,
    color: MARKET_HOME_COLORS.textSoft,
    fontSize: 14,
    fontWeight: "600",
  },
  feedHint: {
    marginTop: 6,
    color: MARKET_HOME_COLORS.accentStrong,
    fontSize: 12,
    fontWeight: "700",
  },
  feedRow: {
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  feedCell: {
    marginBottom: 14,
  },
  footerLoader: {
    paddingBottom: 12,
    paddingTop: 4,
  },
  emptyCard: {
    marginHorizontal: 20,
    marginTop: 4,
    padding: 22,
    borderRadius: 28,
    backgroundColor: MARKET_HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    gap: 8,
  },
  emptyTitle: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 18,
    fontWeight: "800",
  },
  emptyText: {
    color: MARKET_HOME_COLORS.textSoft,
    fontSize: 14,
    lineHeight: 20,
  },
});
