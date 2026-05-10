import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  ListRenderItemInfo,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

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
} from "./marketHome.config";
import { getFeedHeading } from "./marketHome.data";
import type { MarketHomeListingCard } from "./marketHome.types";
import { useMarketHomeController } from "./useMarketHomeController";

const MARKET_HOME_FEED_FLATLIST_TUNING = {
  initialNumToRender: 6,
  maxToRenderPerBatch: 6,
  updateCellsBatchingPeriod: 32,
  windowSize: 7,
  removeClippedSubviews: Platform.OS !== "web",
} as const;

const marketHomeListingKeyExtractor = (item: MarketHomeListingCard) => item.id;

export default function MarketHomeScreen() {
  const {
    activeCategory,
    auctionsLoading,
    auctionsSummary,
    columnWidth,
    feedData,
    feedErrorText,
    feedPhase,
    feedSubtitleText,
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
  } = useMarketHomeController();

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

  const header = (
    <View style={styles.headerContent}>
      <MarketHeaderBar
        query={query}
        onChangeQuery={setQuery}
        onMapPress={handleOpenMap}
        onProfilePress={handleOpenProfile}
        avatarText={headerProfile.avatarText}
        avatarLabel={headerProfile.fullName}
        avatarUrl={headerProfile.avatarUrl}
      />

      <View style={styles.marketIntro}>
        <Text testID="market-home-title" style={styles.marketTitle}>Маркет</Text>
        <Text style={styles.marketSubtitle}>Сначала товар, цена и продавец. Остальное ниже по экрану.</Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Категории</Text>
        <Pressable
          style={styles.sectionAction}
          onPress={handleResetFeedFilters}
        >
          <Text style={styles.sectionActionText}>Смотреть все</Text>
        </Pressable>
      </View>

      <MarketCategoryRail
        categories={MARKET_HOME_CATEGORIES}
        activeCategory={activeCategory}
        onSelect={handleCategorySelect}
      />

      <View style={styles.feedHeader} onLayout={handleFeedHeaderLayout}>
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
        onOpenAssistant={handleOpenAssistant}
        onOpenMap={handleOpenMap}
      />
    </View>
  );

  return (
    <View style={styles.root}>
      <FlashList
        ref={listRef}
        data={feedData}
        key={numColumns}
        keyExtractor={marketHomeListingKeyExtractor}
        renderItem={renderCard}
        numColumns={numColumns}
        estimatedItemSize={360}
        {...MARKET_HOME_FEED_FLATLIST_TUNING}
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
