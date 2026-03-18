import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  ListRenderItemInfo,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import MarketCategoryRail from "./components/MarketCategoryRail";
import MarketAssistantBanner from "./components/MarketAssistantBanner";
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
  loadMarketHomePayload,
} from "./marketHome.data";
import type {
  MarketHomeCategoryKey,
  MarketHomeFilters,
  MarketHomeListingCard,
  MarketHomePayload,
} from "./marketHome.types";
import { useMarketHeaderProfile } from "./useMarketHeaderProfile";

const DEFAULT_PAYLOAD: MarketHomePayload = {
  listings: [],
  activeDemandCount: 0,
};

function createInitialFilters(): MarketHomeFilters {
  return {
    query: "",
    side: "all",
    kind: "all",
    category: "all",
  };
}

export default function MarketHomeScreen() {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<MarketHomeListingCard>>(null);
  const headerProfile = useMarketHeaderProfile();
  const [payload, setPayload] = useState<MarketHomePayload>(DEFAULT_PAYLOAD);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<MarketHomeFilters>(() => createInitialFilters());
  const [feedAnchorOffset, setFeedAnchorOffset] = useState(640);

  const numColumns = width >= 1180 ? 3 : 2;
  const horizontalPadding = 20;
  const gap = 14;
  const columnWidth = useMemo(() => {
    const usableWidth = Math.min(width, 1240) - horizontalPadding * 2 - gap * (numColumns - 1);
    return Math.max(154, usableWidth / numColumns);
  }, [gap, horizontalPadding, numColumns, width]);

  const loadPayload = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") setRefreshing(true);
    else setLoading(true);

    try {
      const nextPayload = await loadMarketHomePayload();
      setPayload(nextPayload);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Не удалось загрузить маркет.";
      Alert.alert("Маркет", message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPayload();
    }, [loadPayload]),
  );

  const filteredListings = useMemo(
    () => filterMarketHomeListings(payload.listings, filters),
    [payload.listings, filters],
  );

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
      router.push({ pathname: "/supplierMap", params });
    },
    [filters.kind, filters.side],
  );

  const pushSupplierShowcase = useCallback((row: Pick<MarketHomeListingCard, "sellerUserId" | "sellerCompanyId">) => {
    router.push({
      pathname: "/supplierShowcase",
      params: {
        userId: row.sellerUserId,
        ...(row.sellerCompanyId ? { companyId: row.sellerCompanyId } : {}),
      },
    } as any);
  }, []);

  const handleCategorySelect = useCallback((category: MarketHomeCategoryKey) => {
    setFilters((prev) => {
      const reset = prev.category === category;
      return {
        ...prev,
        category: reset ? "all" : category,
        kind: reset ? "all" : getCategoryKind(category),
      };
    });
  }, []);

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

  const openAssistant = useCallback((prompt: string) => {
    router.push({
      pathname: "/(tabs)/ai",
      params: {
        prompt,
        autoSend: "1",
        context: "market",
      },
    } as any);
  }, []);

  const renderCard = useCallback(
    ({ item }: ListRenderItemInfo<MarketHomeListingCard>) => (
      <View style={[styles.feedCell, { width: columnWidth }]}>
        <MarketFeedCard
          listing={item}
          onOpen={() => router.push(`/product/${item.id}` as any)}
          onMapPress={() => pushSupplierMap(item)}
          onShowcasePress={() => pushSupplierShowcase(item)}
          onChatPress={() =>
            router.push({
              pathname: "/chat",
              params: {
                listingId: item.id,
                title: item.title,
              },
            } as any)
          }
          onAssistantPress={() => openAssistant(buildListingAssistantPrompt(item))}
          onPhonePress={item.phone ? () => void openPhone(item.phone) : undefined}
          onWhatsAppPress={item.whatsapp ? () => void openWhatsApp(item.whatsapp) : undefined}
        />
      </View>
    ),
    [columnWidth, openAssistant, openPhone, openWhatsApp, pushSupplierMap, pushSupplierShowcase],
  );

  const header = (
    <View style={styles.headerContent}>
      <MarketHeaderBar
        query={filters.query}
        onChangeQuery={(value) => setFilters((prev) => ({ ...prev, query: value }))}
        onMapPress={() => pushSupplierMap()}
        onProfilePress={() => router.push("/(tabs)/profile" as any)}
        avatarText={headerProfile.avatarText}
        avatarLabel={headerProfile.fullName}
      />

      <MarketHeroCarousel
        banners={MARKET_HOME_BANNERS}
        onPressBanner={(banner) => handleBannerPress(banner.action)}
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Категории</Text>
        <Pressable
          style={styles.sectionAction}
          onPress={() => setFilters((prev) => ({ ...prev, category: "all", kind: "all" }))}
        >
          <Text style={styles.sectionActionText}>Смотреть все</Text>
        </Pressable>
      </View>

      <MarketCategoryRail
        categories={MARKET_HOME_CATEGORIES}
        activeCategory={filters.category}
        onSelect={handleCategorySelect}
      />

      <MarketTenderBanner count={payload.activeDemandCount} onPress={() => router.push("/auctions" as any)} />

      <MarketAssistantBanner
        onOpenAssistant={() => openAssistant(buildMarketAssistantPrompt(filters))}
        onOpenMap={() => pushSupplierMap()}
      />

      <View style={styles.feedHeader} onLayout={(event) => setFeedAnchorOffset(event.nativeEvent.layout.y)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.feedTitle}>{getFeedHeading(filters.category)}</Text>
          <Text style={styles.feedSubtitle}>
            {filters.category === "all"
              ? `${filteredListings.length} объявлений в маркетплейсе`
              : `${getCategoryLabel(filters.category)} • ${filteredListings.length} объявлений`}
          </Text>
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
      <FlatList
        ref={listRef}
        data={filteredListings}
        key={numColumns}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        numColumns={numColumns}
        ListHeaderComponent={header}
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
            onRefresh={() => void loadPayload("refresh")}
            tintColor={MARKET_HOME_COLORS.accent}
          />
        }
        showsVerticalScrollIndicator={false}
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
  feedRow: {
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  feedCell: {
    marginBottom: 14,
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
