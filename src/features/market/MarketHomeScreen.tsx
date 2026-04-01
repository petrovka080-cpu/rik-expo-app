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

import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import { FlashList } from "../../ui/FlashList";
import MarketAssistantBanner from "./components/MarketAssistantBanner";
import MarketCategoryRail from "./components/MarketCategoryRail";
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
  buildMarketAssistantPrompt,
  buildMarketMapParams,
  filterMarketHomeListings,
  getCategoryKind,
  getFeedHeading,
} from "./marketHome.data";
import type { MarketplaceAuctionSummary } from "./marketplace.auctions.service";
import {
  loadMarketplaceHomeFeedStage,
  loadMarketplaceHomeStage1,
} from "./marketplace.home.service";
import {
  MARKET_AI_ROUTE,
  MARKET_AUCTIONS_ROUTE,
  MARKET_PROFILE_ROUTE,
  buildMarketProductRoute,
  buildMarketSupplierMapRoute,
} from "./market.routes";
import type { MarketHomeListingCard } from "./marketHome.types";
import { useMarketHeaderProfile } from "./useMarketHeaderProfile";
import { useMarketUiStore } from "./marketUi.store";

type FeedState = {
  listings: MarketHomeListingCard[];
  totalCount: number;
  hasMore: boolean;
  offset: number;
};

type FeedPhase = "loading" | "ready" | "empty" | "error";

const DEFAULT_FEED_STATE: FeedState = {
  listings: [],
  totalCount: 0,
  hasMore: true,
  offset: 0,
};

const MARKET_HOME_SURFACE = "home_feed";

export default function MarketHomeScreen() {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<MarketHomeListingCard>>(null);
  const headerProfile = useMarketHeaderProfile();

  const activeCategory = useMarketUiStore((state) => state.activeCategory);
  const query = useMarketUiStore((state) => state.query);
  const side = useMarketUiStore((state) => state.side);
  const kind = useMarketUiStore((state) => state.kind);
  const loadingMore = useMarketUiStore((state) => state.loadingMore);
  const setActiveCategory = useMarketUiStore((state) => state.setActiveCategory);
  const setQuery = useMarketUiStore((state) => state.setQuery);
  const setSide = useMarketUiStore((state) => state.setSide);
  const setKind = useMarketUiStore((state) => state.setKind);
  const setLoadingMore = useMarketUiStore((state) => state.setLoadingMore);

  const [feed, setFeed] = useState<FeedState>(DEFAULT_FEED_STATE);
  const [feedPhase, setFeedPhase] = useState<FeedPhase>("loading");
  const [feedErrorText, setFeedErrorText] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [auctionsSummary, setAuctionsSummary] = useState<MarketplaceAuctionSummary | null>(null);
  const [auctionsLoading, setAuctionsLoading] = useState(true);
  const [feedAnchorOffset, setFeedAnchorOffset] = useState(640);

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

  const openAssistant = useCallback((prompt: string) => {
    router.push(MARKET_AI_ROUTE(prompt));
  }, []);

  const loadStage1 = useCallback(async () => {
    setAuctionsLoading(true);
    try {
      const stage1 = await loadMarketplaceHomeStage1();
      setAuctionsSummary(stage1.auctionsSummary);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Не удалось подготовить маркет.";
      recordPlatformObservability({
        screen: "market",
        surface: "home_stage1",
        category: "fetch",
        event: "market_home_stage1_set_state",
        result: "error",
        errorStage: "screen_state",
        errorMessage: message,
      });
      setAuctionsSummary({
        activeCount: 0,
        pendingCount: 0,
        hasVisibleAuctions: false,
        primaryCtaRoute: MARKET_AUCTIONS_ROUTE,
        updatedAt: null,
        state: "error",
        message,
        sourceKind: "canonical:auctions.summary",
      });
    } finally {
      setAuctionsLoading(false);
    }
  }, []);

  const loadFeedStage = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else setFeedPhase("loading");

      try {
        const page = await loadMarketplaceHomeFeedStage(
          { side, kind },
          {
            offset: 0,
          },
        );
        setFeed({
          listings: page.listings,
          totalCount: page.totalCount,
          hasMore: page.hasMore,
          offset: page.listings.length,
        });
        setFeedErrorText(null);
        setFeedPhase(page.listings.length > 0 ? "ready" : "empty");
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Не удалось загрузить маркет.";
        setFeedErrorText(message);
        setFeedPhase("error");
      } finally {
        setRefreshing(false);
      }
    },
    [kind, side],
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || feedPhase === "loading" || refreshing || !feed.hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = await loadMarketplaceHomeFeedStage(
        { side, kind },
        {
          offset: feed.offset,
        },
      );
      setFeed((prev) => {
        const nextListings = [...prev.listings];
        const seen = new Set(prev.listings.map((item) => item.id));
        nextPage.listings.forEach((item) => {
          if (!seen.has(item.id)) nextListings.push(item);
        });
        return {
          listings: nextListings,
          totalCount: nextPage.totalCount,
          hasMore: nextPage.hasMore,
          offset: nextListings.length,
        };
      });
      setFeedPhase("ready");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Не удалось догрузить маркет.";
      Alert.alert("Маркет", message);
    } finally {
      setLoadingMore(false);
    }
  }, [feed.hasMore, feed.offset, feedPhase, kind, loadingMore, refreshing, setLoadingMore, side]);

  useFocusEffect(
    useCallback(() => {
      void loadStage1();
      void loadFeedStage("initial");
    }, [loadFeedStage, loadStage1]),
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

  const handleOpenAuctions = useCallback(() => {
    const route = auctionsSummary?.primaryCtaRoute ?? MARKET_AUCTIONS_ROUTE;
    recordPlatformObservability({
      screen: "market",
      surface: "auctions_entry",
      category: "ui",
      event: "marketplace_auctions_open",
      result: "success",
      extra: {
        state: auctionsSummary?.state ?? "loading",
        activeCount: auctionsSummary?.activeCount ?? 0,
        pendingCount: auctionsSummary?.pendingCount ?? 0,
      },
    });
    router.push(route);
  }, [auctionsSummary]);

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
    router.push(buildMarketProductRoute(listing.id));
  }, []);

  const renderCard = useCallback(
    ({ item }: ListRenderItemInfo<MarketHomeListingCard>) => (
      <View style={[styles.feedCell, { width: columnWidth }]}>
        <MarketFeedCard
          variant="market-primary"
          listing={item}
          onOpen={() => handleOpenListing(item)}
          onMapPress={() => pushSupplierMap(item)}
          onPhonePress={item.phone ? () => void openPhone(item.phone) : undefined}
          onWhatsAppPress={item.whatsapp ? () => void openWhatsApp(item.whatsapp) : undefined}
        />
      </View>
    ),
    [
      columnWidth,
      handleOpenListing,
      openPhone,
      openWhatsApp,
      pushSupplierMap,
    ],
  );

  const renderFeedPlaceholder = useMemo(() => {
    if (feedPhase === "loading") {
      return (
        <View style={styles.placeholderGrid}>
          {Array.from({ length: numColumns * 2 }).map((_, index) => (
            <View key={`market-skeleton:${index}`} style={[styles.placeholderCard, { width: columnWidth }]}>
              <View style={styles.placeholderMedia} />
              <View style={styles.placeholderLineLarge} />
              <View style={styles.placeholderLine} />
              <View style={styles.placeholderLineShort} />
            </View>
          ))}
        </View>
      );
    }

    if (feedPhase === "error") {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Маркет временно недоступен</Text>
          <Text style={styles.emptyText}>
            {feedErrorText ?? "Не удалось получить подборку. Попробуйте обновить экран."}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>Ничего не найдено</Text>
        <Text style={styles.emptyText}>
          Попробуйте изменить запрос или сбросить выбранную категорию.
        </Text>
      </View>
    );
  }, [columnWidth, feedErrorText, feedPhase, numColumns]);

  const feedSubtitleText =
    feedPhase === "loading" && feed.listings.length === 0
      ? "Подбираем предложения для первой выдачи."
      : activeCategory === "all"
        ? `${filteredListings.length} объявлений из ${feed.totalCount.toLocaleString("ru-RU")}`
        : `${getCategoryLabel(activeCategory)} • ${filteredListings.length} объявлений`;

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

      <View style={styles.marketIntro}>
        <Text style={styles.marketTitle}>Маркет</Text>
        <Text style={styles.marketSubtitle}>Сначала товар, цена и продавец. Остальное ниже по экрану.</Text>
      </View>

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

      <View style={styles.feedHeader} onLayout={(event) => setFeedAnchorOffset(event.nativeEvent.layout.y)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.feedTitle}>{getFeedHeading(activeCategory)}</Text>
          <Text style={styles.feedSubtitle}>{feedSubtitleText}</Text>
        </View>
      </View>
    </View>
  );

  const footer = (
    <View style={styles.footerContent}>
      {loadingMore ? (
        <View style={styles.footerLoader}>
          <ActivityIndicator color={MARKET_HOME_COLORS.accent} />
        </View>
      ) : null}

      <View style={styles.secondarySectionHeader}>
        <Text style={styles.secondarySectionTitle}>Дополнительно</Text>
        <Text style={styles.secondarySectionText}>Вспомогательные сервисы и соседние сценарии рынка.</Text>
      </View>

      <MarketHeroCarousel
        banners={MARKET_HOME_BANNERS}
        onPressBanner={(banner) => handleBannerPress(banner.action)}
      />

      <MarketTenderBanner
        summary={auctionsSummary}
        loading={auctionsLoading}
        onPress={handleOpenAuctions}
      />

      <MarketAssistantBanner
        onOpenAssistant={() => openAssistant(buildMarketAssistantPrompt(filters))}
        onOpenMap={() => pushSupplierMap()}
      />
    </View>
  );

  return (
    <View style={styles.root}>
      <FlashList
        ref={listRef}
        data={feedPhase === "ready" || feed.listings.length > 0 ? filteredListings : []}
        key={numColumns}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        numColumns={numColumns}
        estimatedItemSize={360}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={renderFeedPlaceholder}
        contentContainerStyle={styles.contentContainer}
        columnWrapperStyle={numColumns > 1 ? styles.feedRow : undefined}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void loadStage1();
              void loadFeedStage("refresh");
            }}
            tintColor={MARKET_HOME_COLORS.accent}
          />
        }
        showsVerticalScrollIndicator={false}
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.35}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: MARKET_HOME_COLORS.background,
  },
  contentContainer: {
    paddingTop: 14,
    paddingBottom: 28,
  },
  headerContent: {
    gap: 18,
  },
  marketIntro: {
    paddingHorizontal: 20,
    gap: 6,
  },
  marketTitle: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "900",
  },
  marketSubtitle: {
    color: MARKET_HOME_COLORS.textSoft,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
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
  feedRow: {
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  feedCell: {
    marginBottom: 14,
  },
  footerLoader: {
    paddingBottom: 8,
    paddingTop: 4,
  },
  footerContent: {
    paddingTop: 8,
    gap: 18,
  },
  secondarySectionHeader: {
    paddingHorizontal: 20,
    gap: 4,
  },
  secondarySectionTitle: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 18,
    fontWeight: "800",
  },
  secondarySectionText: {
    color: MARKET_HOME_COLORS.textSoft,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  placeholderGrid: {
    paddingHorizontal: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 14,
  },
  placeholderCard: {
    marginBottom: 14,
    borderRadius: 28,
    backgroundColor: MARKET_HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
    padding: 18,
    gap: 10,
  },
  placeholderMedia: {
    height: 132,
    borderRadius: 18,
    backgroundColor: "#E2E8F0",
  },
  placeholderLineLarge: {
    height: 18,
    borderRadius: 9,
    backgroundColor: "#CBD5E1",
    width: "78%",
  },
  placeholderLine: {
    height: 14,
    borderRadius: 7,
    backgroundColor: "#E2E8F0",
    width: "92%",
  },
  placeholderLineShort: {
    height: 14,
    borderRadius: 7,
    backgroundColor: "#E2E8F0",
    width: "54%",
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
