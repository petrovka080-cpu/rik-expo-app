import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  buildAssistantRoute,
  buildSupplierMapRoute,
  MARKET_AUCTIONS_ROUTE,
  MARKET_TAB_ROUTE,
} from "../../lib/navigation/coreRoutes";
import { safeBack } from "../../lib/navigation/safeBack";
import { buildAuctionAssistantPrompt, loadAuctionDetail } from "./auctions.data";
import type { UnifiedAuctionDetail } from "./auctions.types";

function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? String(value[0] || "") : String(value || "");
}

function formatDeadline(value: string | null): string {
  if (!value) return "Без дедлайна";
  try {
    return new Date(value).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Без дедлайна";
  }
}

export default function AuctionDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = getParam(params.id).trim();
  const [row, setRow] = useState<UnifiedAuctionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const nextRow = await loadAuctionDetail(id);
        if (active) setRow(nextRow);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Не удалось открыть торг.";
        Alert.alert("Торги", message);
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
      Alert.alert("Торги", fallback);
      return;
    }
    await Linking.openURL(url);
  };

  const openDemandMap = () => {
    router.push(
      buildSupplierMapRoute(
        row?.city
          ? {
              side: "demand",
              city: row.city,
            }
          : {
              side: "demand",
            },
      ),
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.centerState}>
          <ActivityIndicator color="#2563EB" />
          <Text style={styles.stateText}>Открываем торг...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!row) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.centerState}>
          <Text style={styles.stateTitle}>Торг не найден</Text>
          <Pressable style={styles.primaryBtn} onPress={() => safeBack(router, MARKET_AUCTIONS_ROUTE)}>
            <Text style={styles.primaryBtnText}>Назад</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={() => safeBack(router, MARKET_AUCTIONS_ROUTE)}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {row.title}
          </Text>
          <Text style={styles.headerSubtitle}>{row.subtitle}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.routeRow}>
          <Pressable style={styles.routeChip} onPress={() => router.push(MARKET_AUCTIONS_ROUTE)}>
            <Text style={styles.routeChipText}>К торгам</Text>
          </Pressable>
          <Pressable style={styles.routeChip} onPress={() => router.push(MARKET_TAB_ROUTE)}>
            <Text style={styles.routeChipText}>Маркет</Text>
          </Pressable>
          <Pressable style={styles.routeChip} onPress={openDemandMap}>
            <Text style={styles.routeChipText}>Карта спроса</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Общая информация</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Источник</Text>
            <Text style={styles.metaValue}>{row.source === "tender" ? "Торги" : "Аукцион"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Статус</Text>
            <Text style={styles.metaValue}>{row.status || "Без статуса"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Дедлайн</Text>
            <Text style={styles.metaValue}>{formatDeadline(row.deadlineAt)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Город</Text>
            <Text style={styles.metaValue}>{row.city || "Не указан"}</Text>
          </View>
          {row.note ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteLabel}>Комментарий</Text>
              <Text style={styles.noteText}>{row.note}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Позиции</Text>
          {row.items.length > 0 ? (
            row.items.map((item, index) => (
              <View key={`${row.id}:${item.id}:${index}`} style={styles.itemRow}>
                <View style={styles.itemCopy}>
                  <Text style={styles.itemName}>{item.name || item.rikCode || "Позиция"}</Text>
                  <Text style={styles.itemMeta}>
                    {item.rikCode || "Без кода"}
                  </Text>
                </View>
                <Text style={styles.itemQty}>
                  {item.qty != null ? item.qty : "—"} {item.uom || ""}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noteText}>Позиции пока не добавлены.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Действия</Text>
          <View style={styles.actions}>
            {row.contactPhone ? (
              <Pressable
                style={[styles.actionBtn, styles.callBtn]}
                onPress={() =>
                  openUrl(
                    `tel:${String(row.contactPhone).replace(/[^\d+]/g, "")}`,
                    "Не удалось открыть звонок.",
                  )
                }
              >
                <Text style={styles.actionText}>Позвонить</Text>
              </Pressable>
            ) : null}
            {row.contactWhatsApp ? (
              <Pressable
                style={[styles.actionBtn, styles.whatsBtn]}
                onPress={() =>
                  openUrl(
                    `https://wa.me/${String(row.contactWhatsApp).replace(/[^\d]/g, "")}`,
                    "Не удалось открыть WhatsApp.",
                  )
                }
              >
                <Text style={styles.actionText}>WhatsApp</Text>
              </Pressable>
            ) : null}
            {row.contactEmail ? (
              <Pressable
                style={[styles.actionBtn, styles.secondaryBtn]}
                onPress={() =>
                  openUrl(`mailto:${row.contactEmail}`, "Не удалось открыть email.")
                }
              >
                <Text style={styles.secondaryActionText}>Email</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.actionBtn, styles.secondaryBtn]}
              onPress={openDemandMap}
            >
              <Text style={styles.secondaryActionText}>На карте</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.secondaryBtn]}
              onPress={() =>
                router.push(
                  buildAssistantRoute({
                    context: "market",
                    prompt: buildAuctionAssistantPrompt(row),
                    autoSend: "1",
                  }),
                )
              }
            >
              <Text style={styles.secondaryActionText}>Спросить AI</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
  },
  headerSubtitle: {
    marginTop: 4,
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 28,
  },
  routeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  routeChip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  routeChipText: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "800",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  metaLabel: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
  },
  metaValue: {
    flex: 1,
    textAlign: "right",
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "800",
  },
  noteBox: {
    marginTop: 4,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    gap: 6,
  },
  noteLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
  },
  noteText: {
    color: "#0F172A",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  itemRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  itemCopy: {
    flex: 1,
  },
  itemName: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "800",
  },
  itemMeta: {
    marginTop: 4,
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },
  itemQty: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "800",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
  },
  callBtn: {
    backgroundColor: "#2563EB",
  },
  whatsBtn: {
    backgroundColor: "#16A34A",
  },
  secondaryBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  secondaryActionText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "800",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 10,
  },
  stateTitle: {
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  stateText: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  primaryBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#2563EB",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
