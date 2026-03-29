import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ListRenderItemInfo,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { FlashList } from "../../ui/FlashList";
import MarketFeedCard from "../market/components/MarketFeedCard";
import { MARKET_HOME_COLORS } from "../market/marketHome.config";
import { buildListingAssistantPrompt, buildMarketMapParams } from "../market/marketHome.data";
import {
  buildMarketProductRoute,
  buildMarketSupplierMapRoute,
  buildMarketSupplierShowcaseRoute,
  MARKET_PROFILE_ROUTE,
  MARKET_TAB_ROUTE,
} from "../market/market.routes";
import type { MarketHomeListingCard } from "../market/marketHome.types";
import {
  EMPTY_CURRENT_PROFILE_IDENTITY,
  loadCurrentProfileIdentity,
} from "../profile/currentProfileIdentity";
import {
  buildSupplierShowcaseAssistantPrompt,
  loadSupplierShowcasePayload,
} from "./supplierShowcase.data";
import type { SupplierShowcasePayload } from "./supplierShowcase.types";

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

function initialForName(value: string | null | undefined): string {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "G";
}

function openExternal(url: string, fallback: string) {
  return Linking.canOpenURL(url).then((supported) => {
    if (!supported) {
      Alert.alert("Витрина поставщика", fallback);
      return;
    }
    return Linking.openURL(url);
  });
}

export default function SupplierShowcaseScreen() {
  const params = useLocalSearchParams<{ userId?: string | string[]; companyId?: string | string[] }>();
  const { width } = useWindowDimensions();
  const [payload, setPayload] = useState<SupplierShowcasePayload>(EMPTY_PAYLOAD);
  const [identity, setIdentity] = useState(EMPTY_CURRENT_PROFILE_IDENTITY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const numColumns = width >= 1180 ? 2 : 1;
  const columnGap = 14;
  const columnWidth = useMemo(() => {
    const usableWidth = Math.min(width, 1140) - 40 - columnGap * (numColumns - 1);
    return Math.max(260, usableWidth / numColumns);
  }, [columnGap, numColumns, width]);

  const loadPayload = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);

      try {
        const [nextPayload, nextIdentity] = await Promise.all([
          loadSupplierShowcasePayload({
            userId: Array.isArray(params.userId) ? params.userId[0] : params.userId,
            companyId: Array.isArray(params.companyId) ? params.companyId[0] : params.companyId,
          }),
          loadCurrentProfileIdentity(),
        ]);
        setPayload(nextPayload);
        setIdentity(nextIdentity);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Не удалось открыть витрину поставщика.";
        Alert.alert("Витрина поставщика", message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [params.companyId, params.userId],
  );

  useFocusEffect(
    useCallback(() => {
      void loadPayload();
    }, [loadPayload]),
  );

  const displayName =
    payload.company?.name ||
    payload.profile?.full_name ||
    (payload.isOwnerView ? identity.fullName : null) ||
    "Витрина поставщика";
  const city = payload.company?.city || payload.profile?.city || null;
  const subtitle = payload.company?.industry || payload.profile?.position || "Профиль поставщика";
  const phone = payload.company?.phone_main || payload.profile?.phone || null;
  const whatsapp = payload.company?.phone_whatsapp || payload.profile?.whatsapp || null;
  const telegram = payload.company?.telegram || payload.profile?.telegram || null;
  const website = payload.company?.site || null;
  const about = payload.company?.about_short || payload.company?.about_full || payload.profile?.bio || null;
  const ownerAvatarUrl = payload.isOwnerView ? identity.avatarUrl : null;
  const ownerEmail = payload.isOwnerView ? identity.email : null;

  const openAssistant = useCallback(() => {
    router.push({
      pathname: "/(tabs)/ai",
      params: {
        prompt: buildSupplierShowcaseAssistantPrompt(payload),
        autoSend: "1",
        context: "profile",
      },
    });
  }, [payload]);

  const openShowcase = useCallback((item: Pick<MarketHomeListingCard, "sellerUserId" | "sellerCompanyId">) => {
    router.push(buildMarketSupplierShowcaseRoute(item.sellerUserId, item.sellerCompanyId));
  }, []);

  const renderCard = useCallback(
    ({ item }: ListRenderItemInfo<MarketHomeListingCard>) => (
      <View style={[styles.feedCell, { width: columnWidth }]}>
        <MarketFeedCard
          listing={item}
          onOpen={() => router.push(buildMarketProductRoute(item.id))}
          onMapPress={() =>
            router.push(buildMarketSupplierMapRoute(buildMarketMapParams({ side: "all", kind: "all" }, { row: item })))
          }
          onShowcasePress={() => openShowcase(item)}
          onAssistantPress={() =>
            router.push({
              pathname: "/(tabs)/ai",
              params: {
                prompt: buildListingAssistantPrompt(item),
                autoSend: "1",
                context: "market",
              },
            })
          }
          onPhonePress={
            item.phone
              ? () => void openExternal(`tel:${String(item.phone).replace(/[^\d+]/g, "")}`, "Не удалось открыть звонок.")
              : undefined
          }
          onWhatsAppPress={
            item.whatsapp
              ? () => void openExternal(`https://wa.me/${String(item.whatsapp).replace(/[^\d]/g, "")}`, "Не удалось открыть WhatsApp.")
              : undefined
          }
        />
      </View>
    ),
    [columnWidth, openShowcase],
  );

  const header = (
    <View style={styles.headerContent}>
      <View style={styles.headerBar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={MARKET_HOME_COLORS.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>{payload.isOwnerView ? "Моя витрина" : "Витрина поставщика"}</Text>
          <Text style={styles.headerSub}>Read-only профиль компании и объявлений на текущих данных</Text>
        </View>
        <Pressable style={styles.aiBtn} onPress={openAssistant}>
          <Ionicons name="sparkles" size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.avatar}>
            {ownerAvatarUrl ? (
              <Image source={{ uri: ownerAvatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{initialForName(displayName)}</Text>
            )}
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{displayName}</Text>
            <Text style={styles.heroSubtitle}>
              {subtitle}
              {city ? ` • ${city}` : ""}
            </Text>
            <Text style={styles.heroMeta}>
              {payload.isOwnerView ? "Ваш интегрированный профиль" : "Поставщик из текущего marketplace"}
            </Text>
            {ownerEmail ? <Text style={styles.heroMeta}>{ownerEmail}</Text> : null}
          </View>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{payload.stats.totalListings}</Text>
            <Text style={styles.statLabel}>Всего</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{payload.stats.activeListings}</Text>
            <Text style={styles.statLabel}>Активных</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{payload.stats.offerListings}</Text>
            <Text style={styles.statLabel}>Предложений</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{payload.stats.demandListings}</Text>
            <Text style={styles.statLabel}>Спрос</Text>
          </View>
        </View>

        {about ? <Text style={styles.aboutText}>{about}</Text> : null}

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionBtn, styles.secondaryBtn]}
            onPress={() => router.push(MARKET_TAB_ROUTE)}
          >
            <Text style={styles.secondaryBtnText}>Маркет</Text>
          </Pressable>
          <View style={[styles.actionBtn, styles.disabledBtn]}>
            <Text style={styles.secondaryBtnText}>Торги — скоро</Text>
          </View>
          {payload.listings[0] ? (
            <Pressable
              style={[styles.actionBtn, styles.secondaryBtn]}
              onPress={() =>
                router.push(
                  buildMarketSupplierMapRoute(buildMarketMapParams({ side: "all", kind: "all" }, { row: payload.listings[0] })),
                )
              }
            >
              <Text style={styles.secondaryBtnText}>На карте</Text>
            </Pressable>
          ) : null}
          {payload.isOwnerView ? (
            <Pressable
              style={[styles.actionBtn, styles.secondaryBtn]}
              onPress={() => router.push(MARKET_PROFILE_ROUTE)}
            >
              <Text style={styles.secondaryBtnText}>Профиль</Text>
            </Pressable>
          ) : null}
          {phone ? (
            <Pressable
              style={[styles.actionBtn, styles.primaryBtn]}
              onPress={() => void openExternal(`tel:${String(phone).replace(/[^\d+]/g, "")}`, "Не удалось открыть звонок.")}
            >
              <Text style={styles.primaryBtnText}>Позвонить</Text>
            </Pressable>
          ) : null}
          {whatsapp ? (
            <Pressable
              style={[styles.actionBtn, styles.whatsBtn]}
              onPress={() =>
                void openExternal(`https://wa.me/${String(whatsapp).replace(/[^\d]/g, "")}`, "Не удалось открыть WhatsApp.")
              }
            >
              <Text style={styles.primaryBtnText}>WhatsApp</Text>
            </Pressable>
          ) : null}
          {telegram ? (
            <Pressable
              style={[styles.actionBtn, styles.secondaryBtn]}
              onPress={() =>
                void openExternal(`https://t.me/${String(telegram).replace(/^@/, "").trim()}`, "Не удалось открыть Telegram.")
              }
            >
              <Text style={styles.secondaryBtnText}>Telegram</Text>
            </Pressable>
          ) : null}
          {website ? (
            <Pressable
              style={[styles.actionBtn, styles.secondaryBtn]}
              onPress={() =>
                void openExternal(/^https?:\/\//i.test(website) ? website : `https://${website}`, "Не удалось открыть сайт.")
              }
            >
              <Text style={styles.secondaryBtnText}>Сайт</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Объявления</Text>
        <Text style={styles.sectionSub}>
          {payload.isOwnerView ? "Ваши позиции в marketplace" : "Активные позиции поставщика"}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={MARKET_HOME_COLORS.accentStrong} size="large" />
        <Text style={styles.stateText}>Открываем витрину поставщика...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlashList
        data={payload.listings}
        key={numColumns}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        numColumns={numColumns}
        estimatedItemSize={numColumns > 1 ? 420 : 520}
        drawDistance={860}
        getItemType={() => "showcase-card"}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Объявления пока не найдены</Text>
            <Text style={styles.emptyText}>
              {payload.isOwnerView
                ? "Витрина подключена, но у вас пока нет видимых объявлений в текущем проекте."
                : "У поставщика пока нет видимых объявлений для этой витрины."}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadPayload("refresh")}
            tintColor={MARKET_HOME_COLORS.accentStrong}
          />
        }
        contentContainerStyle={styles.contentContainer}
        columnWrapperStyle={numColumns > 1 ? styles.feedRow : undefined}
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: MARKET_HOME_COLORS.background,
    padding: 24,
  },
  stateText: {
    color: MARKET_HOME_COLORS.textSoft,
    fontSize: 15,
    fontWeight: "600",
  },
  contentContainer: {
    paddingTop: 14,
    paddingBottom: 28,
  },
  headerContent: {
    gap: 18,
    paddingBottom: 12,
  },
  headerBar: {
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: MARKET_HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 22,
    fontWeight: "900",
  },
  headerSub: {
    marginTop: 4,
    color: MARKET_HOME_COLORS.textSoft,
    fontWeight: "600",
  },
  aiBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: MARKET_HOME_COLORS.accentStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 28,
    backgroundColor: MARKET_HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
    gap: 14,
  },
  heroTop: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: MARKET_HOME_COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    color: MARKET_HOME_COLORS.accentStrong,
    fontSize: 28,
    fontWeight: "900",
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 24,
    fontWeight: "900",
  },
  heroSubtitle: {
    color: MARKET_HOME_COLORS.textSoft,
    fontSize: 14,
    fontWeight: "700",
  },
  heroMeta: {
    color: MARKET_HOME_COLORS.textSoft,
    fontSize: 13,
    fontWeight: "600",
  },
  statRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  statCard: {
    minWidth: 92,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
  },
  statValue: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 20,
    fontWeight: "900",
  },
  statLabel: {
    marginTop: 4,
    color: MARKET_HOME_COLORS.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  aboutText: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 15,
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionBtn: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    backgroundColor: MARKET_HOME_COLORS.accentStrong,
  },
  whatsBtn: {
    backgroundColor: MARKET_HOME_COLORS.emerald,
  },
  secondaryBtn: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
  },
  disabledBtn: {
    opacity: 0.72,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  secondaryBtnText: {
    color: MARKET_HOME_COLORS.text,
    fontWeight: "800",
  },
  sectionHeader: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 24,
    fontWeight: "900",
  },
  sectionSub: {
    marginTop: 4,
    color: MARKET_HOME_COLORS.textSoft,
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
    padding: 22,
    borderRadius: 28,
    backgroundColor: MARKET_HOME_COLORS.surface,
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
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
