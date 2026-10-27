import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import MarketMyListingsBlock from "./components/MarketMyListingsBlock";
import { MARKET_HOME_COLORS } from "./marketHome.colors";
import { useMarketMyListingsController } from "./useMarketMyListingsController";

const COPY = {
  back: "\u041a \u043f\u0440\u043e\u0444\u0438\u043b\u044e",
  title: "\u041c\u043e\u0438 \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u044f",
  refresh: "\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c",
} as const;

export default function MarketMyListingsScreen() {
  const {
    errorText,
    handleBack,
    handleOpenAddListing,
    handleOpenListing,
    handleRefresh,
    myListings,
    phase,
    refreshing,
  } = useMarketMyListingsController();

  return (
    <View style={styles.root} testID="market-my-listings-screen">
      <View style={styles.topBar}>
        <Pressable
          style={styles.navButton}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel={COPY.back}
          testID="market-my-listings-back"
        >
          <Ionicons name="chevron-back" size={22} color={MARKET_HOME_COLORS.text} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{COPY.title}</Text>
        <Pressable
          style={styles.refreshButton}
          onPress={handleRefresh}
          accessibilityRole="button"
          accessibilityLabel={COPY.refresh}
          disabled={refreshing}
          testID="market-my-listings-refresh"
        >
          <Ionicons name="refresh-outline" size={18} color={MARKET_HOME_COLORS.accentStrong} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={MARKET_HOME_COLORS.accentStrong}
          />
        }
      >
        <MarketMyListingsBlock
          listings={myListings.listings}
          totalCount={myListings.totalCount}
          phase={phase}
          errorText={errorText}
          onOpenListing={handleOpenListing}
          onOpenAddListing={handleOpenAddListing}
          onRefresh={handleRefresh}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: MARKET_HOME_COLORS.background,
  },
  topBar: {
    minHeight: 62,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: MARKET_HOME_COLORS.border,
    backgroundColor: MARKET_HOME_COLORS.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    color: MARKET_HOME_COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
    backgroundColor: MARKET_HOME_COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingTop: 18,
    paddingBottom: 28,
  },
});
