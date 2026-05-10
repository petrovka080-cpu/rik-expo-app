import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Linking,
  type FlatList,
  type LayoutChangeEvent,
  useWindowDimensions,
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import { getCategoryLabel } from "./marketHome.config";
import {
  buildMarketAssistantPrompt,
  buildMarketMapParams,
  filterMarketHomeListings,
  getCategoryKind,
} from "./marketHome.data";
import type {
  MarketHomeCategoryKey,
  MarketHomeListingCard,
} from "./marketHome.types";
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

export function useMarketHomeController() {
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

  const feedData = useMemo(
    () => (feedPhase === "ready" || feed.listings.length > 0 ? filteredListings : []),
    [feed.listings.length, feedPhase, filteredListings],
  );

  const handleCategorySelect = useCallback(
    (category: "all" | MarketHomeCategoryKey) => {
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

  const handleResetFeedFilters = useCallback(() => {
    setActiveCategory("all");
    setSide("all");
    setKind("all");
  }, [setActiveCategory, setKind, setSide]);

  const handleOpenProfile = useCallback(() => {
    router.push(MARKET_PROFILE_ROUTE);
  }, []);

  const handleOpenMap = useCallback(() => {
    pushSupplierMap();
  }, [pushSupplierMap]);

  const handleOpenAssistant = useCallback(() => {
    openAssistant(buildMarketAssistantPrompt(filters));
  }, [filters, openAssistant]);

  const handleFeedHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    setFeedAnchorOffset(event.nativeEvent.layout.y);
  }, []);

  const feedSubtitleText =
    feedPhase === "loading" && feed.listings.length === 0
      ? "Подбираем предложения для первой выдачи."
      : activeCategory === "all"
        ? `${filteredListings.length} объявлений из ${feed.totalCount.toLocaleString("ru-RU")}`
        : `${getCategoryLabel(activeCategory)} • ${filteredListings.length} объявлений`;

  return {
    activeCategory,
    auctionsLoading,
    auctionsSummary,
    columnWidth,
    feed,
    feedData,
    feedErrorText,
    feedPhase,
    feedSubtitleText,
    filters,
    handleBannerPress,
    handleCategorySelect,
    handleFeedHeaderLayout,
    handleOpenAssistant,
    handleOpenAuctions,
    handleOpenListing,
    handleOpenMap,
    handleOpenProfile,
    handleResetFeedFilters,
    headerProfile,
    listRef,
    loadFeedStage,
    loadMore,
    loadStage1,
    loadingMore,
    numColumns,
    openPhone,
    openWhatsApp,
    pushSupplierMap,
    query,
    refreshing,
    setQuery,
  };
}
