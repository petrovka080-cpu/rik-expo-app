import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  type LayoutChangeEvent,
  ListRenderItemInfo,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { FlashList } from "../../ui/FlashList";
import { MarketHomeFeedCardCell } from "./components/MarketHomeFeedCardCell";
import {
  getCategoryLabel,
  getSideLabel,
  MARKET_HOME_COLORS,
} from "./marketHome.config";
import { MARKET_LISTING_CATEGORY_OPTIONS } from "./marketListingCategories";
import { getFeedHeading } from "./marketHome.data";
import type {
  MarketHomeListingCard,
  MarketSide,
} from "./marketHome.types";
import { useMarketHomeController } from "./useMarketHomeController";

const MARKET_HOME_FEED_FLATLIST_TUNING = {
  initialNumToRender: 5,
  maxToRenderPerBatch: 5,
  updateCellsBatchingPeriod: 32,
  windowSize: 7,
  removeClippedSubviews: Platform.OS !== "web",
} as const;

type MarketFilterCategoryKey =
  | "all"
  | (typeof MARKET_LISTING_CATEGORY_OPTIONS)[number]["category"];

const MARKET_FILTER_CATEGORIES: { key: MarketFilterCategoryKey; label: string }[] = [
  { key: "all", label: "Все категории" },
  ...MARKET_LISTING_CATEGORY_OPTIONS.map((item) => ({
    key: item.category,
    label: item.label,
  })),
];

const MARKET_FILTER_SIDES: { key: "all" | MarketSide; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "offer", label: "Предложения" },
  { key: "demand", label: "Спрос" },
];

const marketHomeListingKeyExtractor = (item: MarketHomeListingCard) => item.id;

function getSideFilterLabel(side: "all" | MarketSide) {
  return side === "all" ? "Спрос и предложения" : getSideLabel(side);
}

type MarketHomeScreenState = {
  filtersVisible: boolean;
  feedScrollOffset: number;
  feedContentHeight: number;
  feedViewportHeight: number;
};

export default function MarketHomeScreen() {
  const [screenState, setScreenState] = useState<MarketHomeScreenState>({
    filtersVisible: false,
    feedScrollOffset: 0,
    feedContentHeight: 0,
    feedViewportHeight: 0,
  });
  const {
    activeCategory,
    columnWidth,
    feed,
    feedData,
    feedErrorText,
    feedPhase,
    feedSubtitleText,
    handleCategorySelect,
    handleEndReached,
    handleFeedHeaderLayout,
    handleOpenListing,
    handleRefreshFeed,
    handleResetFeedFilters,
    listRef,
    loadingMore,
    numColumns,
    openPhone,
    openWhatsApp,
    pushSupplierMap,
    query,
    refreshing,
    setQuery,
    setSide,
    side,
  } = useMarketHomeController();

  const openFilters = () => setScreenState((current) => ({ ...current, filtersVisible: true }));
  const closeFilters = () => setScreenState((current) => ({ ...current, filtersVisible: false }));

  const filterTitle = query.trim() || "Категория, товар, продавец";
  const filterSummary = [
    getCategoryLabel(activeCategory),
    getSideFilterLabel(side),
  ]
    .filter(Boolean)
    .join(" · ");

  const handleResetFiltersPress = () => {
    handleResetFeedFilters();
  };

  const loadedVisibleCount = feedData.length;
  const categoryCounts = feed.categoryCounts;

  const getFilterCategoryCount = (key: MarketFilterCategoryKey) => {
    if (key === "all") {
      const countedTotal = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);
      return Math.max(loadedVisibleCount, countedTotal);
    }
    return categoryCounts[key];
  };

  const handleFilterCategoryPress = (category: MarketFilterCategoryKey) => {
    handleCategorySelect(category);
  };

  const { filtersVisible, feedScrollOffset, feedContentHeight, feedViewportHeight } = screenState;
  const maxFeedScrollOffset = Math.max(0, feedContentHeight - feedViewportHeight);
  const canScrollUp = feedScrollOffset > 4;
  const showScrollTopControl = feedData.length > 0 && canScrollUp;

  const handleFeedScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextOffset = Math.max(0, Math.min(maxFeedScrollOffset, event.nativeEvent.contentOffset.y));
    setScreenState((current) => ({ ...current, feedScrollOffset: nextOffset }));
  };

  const handleFeedLayout = (event: LayoutChangeEvent) => {
    const nextViewportHeight = Math.max(0, Math.round(event.nativeEvent.layout.height));
    setScreenState((current) => ({
      ...current,
      feedViewportHeight: nextViewportHeight,
      feedScrollOffset: Math.max(0, Math.min(Math.max(0, current.feedContentHeight - nextViewportHeight), current.feedScrollOffset)),
    }));
  };

  const handleFeedContentSizeChange = (_width: number, height: number) => {
    const nextContentHeight = Math.max(0, Math.round(height));
    setScreenState((current) => ({
      ...current,
      feedContentHeight: nextContentHeight,
      feedScrollOffset: Math.max(0, Math.min(Math.max(0, nextContentHeight - current.feedViewportHeight), current.feedScrollOffset)),
    }));
  };

  const scrollMarketFeedToTop = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    setScreenState((current) => ({ ...current, feedScrollOffset: 0 }));
    handleRefreshFeed();
  };

  const renderCard = useCallback(
    ({ item }: ListRenderItemInfo<MarketHomeListingCard>) => (
      <MarketHomeFeedCardCell
        item={item}
        width={columnWidth}
        onOpenListing={handleOpenListing}
        onOpenPhone={openPhone}
        onOpenWhatsApp={openWhatsApp}
        onPushSupplierMap={pushSupplierMap}
      />
    ),
    [columnWidth, handleOpenListing, openPhone, openWhatsApp, pushSupplierMap],
  );

  const renderFeedPlaceholder = (() => {
    if (feedPhase === "loading") {
      return (
        <View style={styles.placeholderList}>
          {Array.from({ length: 3 }).map((_, index) => (
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
  })();

  const header = (
    <View style={styles.headerContent}>
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <Ionicons name="storefront" size={19} color="#FFFFFF" />
          </View>
          <Text testID="market-home-title" style={styles.brandText}>Маркет</Text>
        </View>
      </View>

      <Pressable
        style={styles.topFilterButton}
        onPress={openFilters}
        accessibilityRole="button"
        accessibilityLabel="Открыть фильтр маркета"
        testID="market_top_filter_button"
      >
        <View style={styles.filterIconBox}>
          <Ionicons name="options-outline" size={21} color={MARKET_HOME_COLORS.accentStrong} />
        </View>
        <View style={styles.filterCopy}>
          <Text style={styles.filterTitle} numberOfLines={1}>
            {filterTitle}
          </Text>
          <Text style={styles.filterSummary} numberOfLines={1}>
            {filterSummary}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={MARKET_HOME_COLORS.textSoft} />
      </Pressable>

      <View style={styles.feedHeader} onLayout={handleFeedHeaderLayout}>
        <Text style={styles.feedTitle}>{getFeedHeading(activeCategory)}</Text>
        <Text style={styles.feedSubtitle}>{feedSubtitleText}</Text>
      </View>
    </View>
  );

  const footer = loadingMore ? (
    <View style={styles.footerLoader}>
      <ActivityIndicator color={MARKET_HOME_COLORS.accent} />
    </View>
  ) : (
    <View style={styles.bottomLimit} testID="market_scroll_bottom_limit" />
  );

  return (
    <View style={styles.root}>
      <FlashList
        ref={listRef}
        data={feedData}
        key="market-single-column-feed"
        keyExtractor={marketHomeListingKeyExtractor}
        renderItem={renderCard}
        numColumns={numColumns}
        estimatedItemSize={520}
        {...MARKET_HOME_FEED_FLATLIST_TUNING}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={renderFeedPlaceholder}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefreshFeed}
            tintColor={MARKET_HOME_COLORS.accent}
          />
        }
        showsVerticalScrollIndicator={false}
        onLayout={handleFeedLayout}
        onContentSizeChange={handleFeedContentSizeChange}
        onScroll={handleFeedScroll}
        scrollEventThrottle={16}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.35}
      />

      {showScrollTopControl ? (
        <View style={styles.scrollControls} pointerEvents="box-none">
          <Pressable
            style={styles.scrollControlButton}
            onPress={scrollMarketFeedToTop}
            accessibilityRole="button"
            accessibilityLabel="Прокрутить маркет вверх"
            testID="market_scroll_up_button"
          >
            <Ionicons name="chevron-up" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : null}

      <Modal
        animationType="slide"
        transparent
        visible={filtersVisible}
        onRequestClose={closeFilters}
      >
        <View style={styles.filterModalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeFilters} />
          <View style={styles.filterSheet} testID="market_top_filter_sheet">
            <View style={styles.filterSheetHeader}>
              <Text style={styles.filterSheetTitle}>Фильтр</Text>
              <Pressable
                style={styles.sheetCloseButton}
                onPress={closeFilters}
                accessibilityLabel="Закрыть фильтр"
                testID="market_top_filter_close"
              >
                <Ionicons name="close" size={22} color={MARKET_HOME_COLORS.text} />
              </Pressable>
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={MARKET_HOME_COLORS.textSoft} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Что ищем?"
                placeholderTextColor={MARKET_HOME_COLORS.textSoft}
                style={styles.searchInput}
                returnKeyType="search"
                testID="market_top_filter_query"
              />
              {query.trim() ? (
                <Pressable
                  style={styles.clearSearchButton}
                  onPress={() => setQuery("")}
                  accessibilityLabel="Очистить поиск"
                  testID="market_top_filter_clear_query"
                >
                  <Ionicons name="close-circle" size={18} color={MARKET_HOME_COLORS.textSoft} />
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.filterScrollContent}
            >
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupLabel}>Категории</Text>
                <View style={styles.chipGrid} testID="market_top_filter_categories">
                  {MARKET_FILTER_CATEGORIES.map((item) => {
                    const selected = activeCategory === item.key;
                    const count = getFilterCategoryCount(item.key);
                    return (
                      <Pressable
                        key={item.key}
                        style={[styles.filterChip, selected ? styles.filterChipActive : null]}
                        onPress={() => handleFilterCategoryPress(item.key)}
                        testID={`market_top_filter_category_${item.key}`}
                      >
                        <Text style={[styles.filterChipText, selected ? styles.filterChipTextActive : null]}>
                          {item.label}
                        </Text>
                        <Text style={[styles.filterChipCount, selected ? styles.filterChipCountActive : null]}>
                          {count.toLocaleString("ru-RU")}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupLabel}>Тип выдачи</Text>
                <View style={styles.chipGrid} testID="market_top_filter_sides">
                  {MARKET_FILTER_SIDES.map((item) => {
                    const selected = side === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        style={[styles.filterChip, selected ? styles.filterChipActive : null]}
                        onPress={() => setSide(item.key)}
                        testID={`market_top_filter_side_${item.key}`}
                      >
                        <Text style={[styles.filterChipText, selected ? styles.filterChipTextActive : null]}>
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={styles.filterSheetActions}>
              <Pressable
                style={styles.resetButton}
                onPress={handleResetFiltersPress}
                testID="market_top_filter_reset"
              >
                <Text style={styles.resetButtonText}>Сбросить</Text>
              </Pressable>
              <Pressable
                style={styles.applyButton}
                onPress={closeFilters}
                testID="market_top_filter_apply"
              >
                <Text style={styles.applyButtonText}>Показать</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: MARKET_HOME_COLORS.background,
  },
  contentContainer: {
    paddingTop: 16,
    paddingBottom: 112,
  },
  headerContent: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 760,
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  topBar: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 12,
  },
  brandRow: {
    minWidth: 0,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MARKET_HOME_COLORS.accentStrong,
  },
  brandText: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "900",
  },
  topFilterButton: {
    minHeight: 62,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: MARKET_HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
    ...Platform.select({
      web: { boxShadow: "0px 8px 16px rgba(15, 23, 42, 0.07)" },
      default: {
        shadowColor: "#0F172A",
        shadowOpacity: 0.07,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 3,
      },
    }),
  },
  filterIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
  },
  filterCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  filterTitle: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900",
  },
  filterSummary: {
    color: MARKET_HOME_COLORS.textSoft,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  feedHeader: {
    paddingTop: 8,
    gap: 4,
  },
  feedTitle: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "900",
  },
  feedSubtitle: {
    color: MARKET_HOME_COLORS.textSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  footerLoader: {
    paddingBottom: 8,
    paddingTop: 4,
  },
  bottomLimit: {
    height: 24,
  },
  placeholderList: {
    alignItems: "center",
    gap: 14,
  },
  placeholderCard: {
    borderRadius: 8,
    backgroundColor: MARKET_HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
    padding: 14,
    gap: 10,
  },
  placeholderMedia: {
    height: 260,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
  },
  placeholderLineLarge: {
    height: 18,
    borderRadius: 8,
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
    alignSelf: "center",
    width: "100%",
    maxWidth: 720,
    marginHorizontal: 20,
    marginTop: 4,
    padding: 18,
    borderRadius: 8,
    backgroundColor: MARKET_HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
    ...Platform.select({
      web: { boxShadow: "0px 8px 14px rgba(15, 23, 42, 0.05)" },
      default: {
        shadowColor: "#0F172A",
        shadowOpacity: 0.05,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 3,
      },
    }),
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
  filterModalRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.44)",
  },
  scrollControls: {
    position: "absolute",
    right: 18,
    bottom: 110,
    zIndex: 20,
  },
  scrollControlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    ...Platform.select({
      web: { boxShadow: "0px 10px 24px rgba(15, 23, 42, 0.18)" },
      default: {
        shadowColor: "#0F172A",
        shadowOpacity: 0.18,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 10 },
        elevation: 5,
      },
    }),
  },
  filterSheet: {
    width: "100%",
    maxHeight: "84%",
    alignSelf: "center",
    maxWidth: 760,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: MARKET_HOME_COLORS.surface,
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  filterSheetHeader: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterSheetTitle: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "900",
  },
  sheetCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  searchBox: {
    minHeight: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: MARKET_HOME_COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    paddingVertical: Platform.OS === "web" ? 10 : 8,
  },
  clearSearchButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  filterScrollContent: {
    paddingBottom: 4,
    gap: 16,
  },
  filterGroup: {
    gap: 8,
  },
  filterGroupLabel: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 13,
    fontWeight: "900",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    minHeight: 38,
    borderRadius: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
  },
  filterChipActive: {
    backgroundColor: MARKET_HOME_COLORS.accentStrong,
    borderColor: MARKET_HOME_COLORS.accentStrong,
  },
  filterChipText: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  filterChipCount: {
    color: MARKET_HOME_COLORS.textSoft,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
  },
  filterChipCountActive: {
    color: "rgba(255,255,255,0.84)",
  },
  filterSheetActions: {
    flexDirection: "row",
    gap: 10,
  },
  resetButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
  },
  resetButtonText: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },
  applyButton: {
    flex: 1.25,
    minHeight: 46,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MARKET_HOME_COLORS.accentStrong,
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
});
