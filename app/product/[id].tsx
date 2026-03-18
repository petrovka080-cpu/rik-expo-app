import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { MARKET_HOME_COLORS } from "../../src/features/market/marketHome.config";
import {
  buildListingAssistantPrompt,
  buildMarketMapParams,
  loadMarketListingById,
} from "../../src/features/market/marketHome.data";
import type { MarketHomeListingCard } from "../../src/features/market/marketHome.types";

export default function ProductDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [row, setRow] = useState<MarketHomeListingCard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const nextRow = await loadMarketListingById(id);
        if (active) setRow(nextRow);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Не удалось открыть объявление.";
        Alert.alert("Маркет", message);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [id]);

  const openUrl = async (url: string, fallback: string) => {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Маркет", fallback);
      return;
    }
    await Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={MARKET_HOME_COLORS.accent} />
        <Text style={styles.stateText}>Открываем объявление...</Text>
      </View>
    );
  }

  if (!row) {
    return (
      <View style={styles.center}>
        <Text style={styles.stateTitle}>Объявление не найдено</Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
          <Text style={styles.primaryBtnText}>Назад</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={MARKET_HOME_COLORS.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Объявление</Text>
          <Text style={styles.headerSub}>
            {row.kindLabel} • {row.sideLabel}
          </Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.routeRow}>
        <Pressable style={styles.routeChip} onPress={() => router.push("/(tabs)/market" as any)}>
          <Text style={styles.routeChipText}>Маркет</Text>
        </Pressable>
        <Pressable
          style={styles.routeChip}
          onPress={() =>
            router.push({
              pathname: "/supplierShowcase",
              params: {
                userId: row.sellerUserId,
                ...(row.sellerCompanyId ? { companyId: row.sellerCompanyId } : {}),
              },
            } as any)
          }
        >
          <Text style={styles.routeChipText}>Витрина</Text>
        </Pressable>
        <Pressable
          style={styles.routeChip}
          onPress={() =>
            router.push({
              pathname: "/supplierMap",
              params: buildMarketMapParams({ side: "all", kind: "all" }, { row }),
            })
          }
        >
          <Text style={styles.routeChipText}>Карта</Text>
        </Pressable>
        <Pressable style={styles.routeChip} onPress={() => router.push("/auctions" as any)}>
          <Text style={styles.routeChipText}>Торги</Text>
        </Pressable>
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Image source={row.imageSource} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroMeta}>
            <View style={[styles.sideBadge, row.isDemand ? styles.sideBadgeDemand : styles.sideBadgeOffer]}>
              <Text style={styles.sideBadgeText}>{row.sideLabel}</Text>
            </View>
            <Text style={styles.heroStatus}>{row.statusLabel}</Text>
          </View>

          <Text style={styles.title}>{row.title}</Text>
          <Text style={styles.price}>
            {row.price != null
              ? `${row.price.toLocaleString("ru-RU")} сом${row.uom ? ` / ${row.uom}` : ""}`
              : "Цена по запросу"}
          </Text>
          <Text style={styles.meta}>{row.city || "Город не указан"}</Text>
          {row.description ? <Text style={styles.description}>{row.description}</Text> : null}
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

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Контакты и действия</Text>
          <View style={styles.actions}>
            {row.phone ? (
              <Pressable
                style={[styles.actionBtn, styles.callBtn]}
                onPress={() =>
                  openUrl(`tel:${String(row.phone).replace(/[^\d+]/g, "")}`, "Не удалось открыть звонок.")
                }
              >
                <Text style={styles.actionText}>Позвонить</Text>
              </Pressable>
            ) : null}
            {row.whatsapp ? (
              <Pressable
                style={[styles.actionBtn, styles.whatsBtn]}
                onPress={() =>
                  openUrl(`https://wa.me/${String(row.whatsapp).replace(/[^\d]/g, "")}`, "Не удалось открыть WhatsApp.")
                }
              >
                <Text style={styles.actionText}>WhatsApp</Text>
              </Pressable>
            ) : null}
            {row.email ? (
              <Pressable
                style={[styles.actionBtn, styles.secondaryBtn]}
                onPress={() => openUrl(`mailto:${row.email}`, "Не удалось открыть email.")}
              >
                <Text style={styles.secondaryActionText}>Email</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.actionBtn, styles.secondaryBtn]}
              onPress={() =>
                router.push({
                  pathname: "/supplierMap",
                  params: buildMarketMapParams({ side: "all", kind: "all" }, { row }),
                })
              }
            >
              <Text style={styles.secondaryActionText}>На карте</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.secondaryBtn]}
              onPress={() =>
                router.push({
                  pathname: "/chat",
                  params: {
                    listingId: row.id,
                    title: row.title,
                  },
                } as any)
              }
            >
              <Text style={styles.secondaryActionText}>Чат</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.secondaryBtn]}
              onPress={() =>
                router.push({
                  pathname: "/supplierShowcase",
                  params: {
                    userId: row.sellerUserId,
                    ...(row.sellerCompanyId ? { companyId: row.sellerCompanyId } : {}),
                  },
                } as any)
              }
            >
              <Text style={styles.secondaryActionText}>Витрина</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.secondaryBtn]}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/ai",
                  params: {
                    prompt: buildListingAssistantPrompt(row),
                    autoSend: "1",
                    context: "market",
                  },
                } as any)
              }
            >
              <Text style={styles.secondaryActionText}>Спросить AI</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: MARKET_HOME_COLORS.background,
  },
  header: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: MARKET_HOME_COLORS.border,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: MARKET_HOME_COLORS.background,
  },
  headerCopy: {
    flex: 1,
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
  headerTitle: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 20,
    fontWeight: "900",
  },
  headerSub: {
    color: MARKET_HOME_COLORS.textSoft,
    marginTop: 4,
    fontWeight: "600",
  },
  content: {
    padding: 20,
    gap: 14,
    paddingBottom: 32,
  },
  routeRow: {
    paddingHorizontal: 20,
    paddingTop: 14,
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
    borderRadius: 28,
    borderWidth: 1,
    borderColor: MARKET_HOME_COLORS.border,
    padding: 18,
    gap: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  heroImage: {
    width: "100%",
    height: 220,
    borderRadius: 22,
    backgroundColor: "#E2E8F0",
  },
  heroMeta: {
    marginTop: -8,
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
    fontWeight: "800",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
  },
  callBtn: {
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
  actionText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  secondaryActionText: {
    color: MARKET_HOME_COLORS.text,
    fontWeight: "800",
  },
  center: {
    flex: 1,
    backgroundColor: MARKET_HOME_COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  stateText: {
    color: MARKET_HOME_COLORS.textSoft,
  },
  stateTitle: {
    color: MARKET_HOME_COLORS.text,
    fontSize: 18,
    fontWeight: "800",
  },
  primaryBtn: {
    minWidth: 120,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: MARKET_HOME_COLORS.accentStrong,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});
