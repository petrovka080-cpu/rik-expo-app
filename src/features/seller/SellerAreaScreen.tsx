import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  buildAddListingRoute,
  buildSupplierShowcaseRoute,
  MARKET_TAB_ROUTE,
} from "../../lib/navigation/coreRoutes";
import {
  EMPTY_CURRENT_PROFILE_IDENTITY,
  loadCurrentProfileIdentity,
  toProfileAvatarText,
} from "../profile/currentProfileIdentity";
import { buildMarketProductRoute } from "../market/market.routes";
import { loadSupplierShowcasePayload } from "../supplierShowcase/supplierShowcase.data";
import type { SupplierShowcasePayload } from "../supplierShowcase/supplierShowcase.types";

const UI = {
  title: "Seller Area",
  subtitle:
    "\u041c\u043e\u0438 \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u044f, \u0441\u0442\u0430\u0442\u0443\u0441\u044b \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0438 \u0438 seller tools \u0432 \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u043e\u043c contour.",
  loading:
    "\u041e\u0442\u043a\u0440\u044b\u0432\u0430\u0435\u043c seller area\u2026",
  errorTitle: "Seller Area",
  errorMessage:
    "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043a\u0440\u044b\u0442\u044c seller tools.",
  ownerSubtitle:
    "\u041e\u0442\u0434\u0435\u043b\u044c\u043d\u044b\u0439 contour \u0434\u043b\u044f \u0441\u0432\u043e\u0438\u0445 \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u0439 \u0438 \u0432\u0438\u0442\u0440\u0438\u043d\u044b.",
  createListing:
    "\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u0435",
  openShowcase:
    "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0432\u0438\u0442\u0440\u0438\u043d\u0443",
  openMarket: "Market",
  listingsTitle:
    "\u041c\u043e\u0438 \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u044f",
  listingsSubtitle:
    "\u0421\u0442\u0430\u0442\u0443\u0441\u044b \u0438 \u0442\u0435\u043a\u0443\u0449\u0438\u0435 \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0438 \u0431\u0435\u0437 profile semantics.",
  emptyTitle:
    "\u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u0439",
  emptySubtitle:
    "\u0421\u043e\u0437\u0434\u0430\u0439\u0442\u0435 \u043f\u0435\u0440\u0432\u0443\u044e \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u044e \u0438\u0437 seller contour.",
  openProduct:
    "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0442\u043e\u0432\u0430\u0440",
  totalLabel: "\u0412\u0441\u0435\u0433\u043e",
  activeLabel: "\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0445",
  offerLabel: "\u041f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u0439",
  demandLabel: "\u0421\u043f\u0440\u043e\u0441",
  back: "\u041d\u0430\u0437\u0430\u0434",
} as const;

const EMPTY_PAYLOAD: SupplierShowcasePayload = {
  targetUserId: null,
  targetCompanyId: null,
  isOwnerView: false,
  profile: null,
  company: null,
  listings: [],
  stats: {
    totalListings: 0,
    activeListings: 0,
    offerListings: 0,
    demandListings: 0,
  },
};

const colors = {
  bg: "#020617",
  card: "#0F172A",
  cardSoft: "#111827",
  border: "#1F2937",
  text: "#F8FAFC",
  sub: "#94A3B8",
  accent: "#22C55E",
  accentSoft: "rgba(34,197,94,0.14)",
  offerSoft: "#DCFCE7",
  offerText: "#166534",
  demandSoft: "#FDE7E1",
  demandText: "#C2410C",
} as const;

function formatPrice(value: number | null, unit: string | null): string {
  if (value == null) {
    return "\u0426\u0435\u043d\u0430 \u043f\u043e \u0437\u0430\u043f\u0440\u043e\u0441\u0443";
  }
  return `${value.toLocaleString("ru-RU")} \u0441\u043e\u043c${unit ? ` / ${unit}` : ""}`;
}

function joinMeta(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" • ");
}

export default function SellerAreaScreen() {
  const [payload, setPayload] = useState<SupplierShowcasePayload>(EMPTY_PAYLOAD);
  const [identity, setIdentity] = useState(EMPTY_CURRENT_PROFILE_IDENTITY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSellerArea = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const [nextPayload, nextIdentity] = await Promise.all([
          loadSupplierShowcasePayload(),
          loadCurrentProfileIdentity(),
        ]);
        setPayload(nextPayload);
        setIdentity(nextIdentity);
      } catch (error: unknown) {
        const message =
          error instanceof Error && error.message.trim()
            ? error.message
            : UI.errorMessage;
        Alert.alert(UI.errorTitle, message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void loadSellerArea();
    }, [loadSellerArea]),
  );

  const displayName = useMemo(
    () =>
      payload.company?.name?.trim() ||
      payload.profile?.full_name?.trim() ||
      identity.fullName?.trim() ||
      identity.email?.trim() ||
      "GOX",
    [
      identity.email,
      identity.fullName,
      payload.company?.name,
      payload.profile?.full_name,
    ],
  );

  const avatarText = useMemo(
    () => toProfileAvatarText(displayName, identity.userId),
    [displayName, identity.userId],
  );

  const subtitle = joinMeta([
    payload.company?.industry || payload.profile?.position || UI.ownerSubtitle,
    payload.company?.city || payload.profile?.city || null,
  ]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.centerText}>{UI.loading}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          tintColor={colors.accent}
          refreshing={refreshing}
          onRefresh={() => void loadSellerArea("refresh")}
        />
      }
    >
      <View style={styles.headerRow}>
        <Pressable
          testID="seller-area-back"
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
          <Text style={styles.backButtonText}>{UI.back}</Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.avatar}>
            {identity.avatarUrl ? (
              <Image source={{ uri: identity.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{avatarText}</Text>
            )}
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{UI.title}</Text>
            <Text style={styles.heroName}>{displayName}</Text>
            <Text style={styles.heroSubtitle}>{subtitle}</Text>
          </View>
        </View>

        <View style={styles.heroActions}>
          <Pressable
            testID="seller-area-open-add-listing"
            style={[styles.primaryButton, styles.heroButton]}
            onPress={() => router.push(buildAddListingRoute({ entry: "seller" }))}
          >
            <Text style={styles.primaryButtonText}>{UI.createListing}</Text>
          </Pressable>
          <Pressable
            testID="seller-area-open-showcase"
            style={[styles.secondaryButton, styles.heroButton]}
            onPress={() => router.push(buildSupplierShowcaseRoute())}
          >
            <Text style={styles.secondaryButtonText}>{UI.openShowcase}</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, styles.heroButton]}
            onPress={() => router.push(MARKET_TAB_ROUTE)}
          >
            <Text style={styles.secondaryButtonText}>{UI.openMarket}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{payload.stats.totalListings}</Text>
          <Text style={styles.statLabel}>{UI.totalLabel}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{payload.stats.activeListings}</Text>
          <Text style={styles.statLabel}>{UI.activeLabel}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{payload.stats.offerListings}</Text>
          <Text style={styles.statLabel}>{UI.offerLabel}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{payload.stats.demandListings}</Text>
          <Text style={styles.statLabel}>{UI.demandLabel}</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{UI.listingsTitle}</Text>
        <Text style={styles.sectionSubtitle}>{UI.listingsSubtitle}</Text>
      </View>

      {payload.listings.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{UI.emptyTitle}</Text>
          <Text style={styles.emptySubtitle}>{UI.emptySubtitle}</Text>
          <Pressable
            style={[styles.primaryButton, styles.emptyButton]}
            onPress={() => router.push(buildAddListingRoute({ entry: "seller" }))}
          >
            <Text style={styles.primaryButtonText}>{UI.createListing}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.listingsColumn}>
          {payload.listings.map((item) => (
            <Pressable
              key={item.id}
              testID={`seller-listing-${item.id}`}
              style={styles.listingCard}
              onPress={() => router.push(buildMarketProductRoute(item.id))}
            >
              <Image source={item.imageSource} style={styles.listingImage} />
              <View style={styles.listingBody}>
                <View style={styles.listingTopRow}>
                  <View
                    style={[
                      styles.sideBadge,
                      item.isDemand ? styles.sideBadgeDemand : styles.sideBadgeOffer,
                    ]}
                  >
                    <Text
                      style={[
                        styles.sideBadgeText,
                        item.isDemand ? styles.sideBadgeDemandText : styles.sideBadgeOfferText,
                      ]}
                    >
                      {item.sideLabel}
                    </Text>
                  </View>
                  <Text style={styles.statusText}>{item.statusLabel}</Text>
                </View>
                <Text style={styles.listingTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.listingMeta} numberOfLines={1}>
                  {joinMeta([item.kindLabel, item.city])}
                </Text>
                <Text style={styles.listingPrice} numberOfLines={1}>
                  {formatPrice(item.price, item.unit)}
                </Text>
                <View style={styles.listingFooter}>
                  <Text style={styles.listingFooterText}>{UI.openProduct}</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.accent}
                  />
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: {
    marginTop: 10,
    color: colors.sub,
    fontSize: 13,
  },
  headerRow: {
    marginBottom: 12,
  },
  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  backButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "800",
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  heroName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  heroSubtitle: {
    color: colors.sub,
    fontSize: 13,
    lineHeight: 19,
  },
  heroActions: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  heroButton: {
    minHeight: 42,
  },
  primaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#04110A",
    fontSize: 13,
    fontWeight: "800",
  },
  secondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  statCard: {
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  statValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  statLabel: {
    marginTop: 4,
    color: colors.sub,
    fontSize: 12,
    fontWeight: "700",
  },
  sectionHeader: {
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  sectionSubtitle: {
    marginTop: 4,
    color: colors.sub,
    fontSize: 13,
    lineHeight: 19,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 10,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  emptySubtitle: {
    color: colors.sub,
    fontSize: 13,
    lineHeight: 19,
  },
  emptyButton: {
    alignSelf: "flex-start",
    marginTop: 4,
  },
  listingsColumn: {
    gap: 12,
  },
  listingCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  listingImage: {
    width: "100%",
    height: 154,
    backgroundColor: "#E2E8F0",
  },
  listingBody: {
    padding: 16,
    gap: 8,
  },
  listingTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sideBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  sideBadgeOffer: {
    backgroundColor: colors.offerSoft,
  },
  sideBadgeDemand: {
    backgroundColor: colors.demandSoft,
  },
  sideBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  sideBadgeOfferText: {
    color: colors.offerText,
  },
  sideBadgeDemandText: {
    color: colors.demandText,
  },
  statusText: {
    flex: 1,
    textAlign: "right",
    color: colors.sub,
    fontSize: 12,
    fontWeight: "700",
  },
  listingTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "800",
  },
  listingMeta: {
    color: colors.sub,
    fontSize: 13,
    fontWeight: "600",
  },
  listingPrice: {
    color: colors.accent,
    fontSize: 17,
    fontWeight: "900",
  },
  listingFooter: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  listingFooterText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
});
