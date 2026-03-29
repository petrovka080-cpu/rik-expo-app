import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FlashList } from "../../ui/FlashList";
import type { AuctionListTab, UnifiedAuctionSummary } from "./auctions.types";
import { buildAuctionsAssistantPrompt, loadAuctionSummaries } from "./auctions.data";

type State = {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  rows: UnifiedAuctionSummary[];
};

function createState(): State {
  return {
    loading: true,
    refreshing: false,
    error: null,
    rows: [],
  };
}

function getDeadlineLabel(value: string | null): string {
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

export default function AuctionsScreen() {
  const [tab, setTab] = useState<AuctionListTab>("active");
  const [state, setState] = useState<State>(() => createState());

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      setState((prev) => ({
        ...prev,
        loading: mode === "initial",
        refreshing: mode === "refresh",
        error: null,
      }));

      try {
        const rows = await loadAuctionSummaries(tab);
        setState({
          loading: false,
          refreshing: false,
          error: null,
          rows,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Не удалось загрузить торги.";
        setState({
          loading: false,
          refreshing: false,
          error: message,
          rows: [],
        });
      }
    },
    [tab],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const renderItem = useCallback(({ item }: { item: UnifiedAuctionSummary }) => {
    return (
      <Pressable
        style={styles.card}
        onPress={() => router.push(`/auction/${item.id}` as any)}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardMeta}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.cardSubtitle} numberOfLines={2}>
              {item.subtitle}
            </Text>
          </View>
          <View style={styles.statusChip}>
            <Text style={styles.statusChipText}>{item.source === "tender" ? "Торг" : "Аукцион"}</Text>
          </View>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Позиций</Text>
            <Text style={styles.statValue}>{item.itemsCount}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Дедлайн</Text>
            <Text style={styles.statValueSmall}>{getDeadlineLabel(item.deadlineAt)}</Text>
          </View>
        </View>

        {item.itemsPreview.length > 0 ? (
          <View style={styles.previewBox}>
            {item.itemsPreview.map((line) => (
              <Text key={`${item.id}:${line}`} style={styles.previewLine} numberOfLines={1}>
                • {line}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>{item.city || "Без города"}</Text>
          <Ionicons name="chevron-forward" size={18} color="#64748B" />
        </View>
      </Pressable>
    );
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Торги</Text>
          <Text style={styles.headerSubtitle}>Список активных и завершенных торгов</Text>
        </View>
      </View>

      <View style={styles.routeRow}>
        <Pressable style={styles.routeChip} onPress={() => router.push("/(tabs)/market" as any)}>
          <Text style={styles.routeChipText}>Маркет</Text>
        </Pressable>
        <Pressable
          style={styles.routeChip}
          onPress={() =>
            router.push({
              pathname: "/supplierMap",
              params: { side: "demand" },
            } as any)
          }
        >
          <Text style={styles.routeChipText}>Карта спроса</Text>
        </Pressable>
        <Pressable
          style={styles.routeChip}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/ai",
              params: {
                context: "market",
                prompt: buildAuctionsAssistantPrompt(tab, state.rows),
                autoSend: "1",
              },
            } as any)
          }
        >
          <Text style={styles.routeChipText}>Спросить AI</Text>
        </Pressable>
      </View>

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === "active" && styles.tabActive]}
          onPress={() => setTab("active")}
        >
          <Text style={[styles.tabText, tab === "active" && styles.tabTextActive]}>Активные</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === "closed" && styles.tabActive]}
          onPress={() => setTab("closed")}
        >
          <Text style={[styles.tabText, tab === "closed" && styles.tabTextActive]}>Завершенные</Text>
        </Pressable>
      </View>

      {state.loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color="#2563EB" />
          <Text style={styles.stateText}>Загружаем торги...</Text>
        </View>
      ) : (
        <FlashList
          data={state.rows}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          estimatedItemSize={228}
          drawDistance={640}
          getItemType={() => "auction-card"}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={state.refreshing}
              onRefresh={() => void load("refresh")}
              tintColor="#2563EB"
            />
          }
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Text style={styles.stateTitle}>Пока пусто</Text>
              <Text style={styles.stateText}>
                {state.error || "Сейчас в этом разделе нет доступных торгов."}
              </Text>
            </View>
          }
        />
      )}
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
    fontSize: 20,
    fontWeight: "900",
  },
  headerSubtitle: {
    marginTop: 4,
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },
  tabs: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  routeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
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
  tab: {
    flex: 1,
    minHeight: 42,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#93C5FD",
  },
  tabText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "800",
  },
  tabTextActive: {
    color: "#1D4ED8",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 14,
    flexGrow: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  cardTop: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  cardMeta: {
    flex: 1,
  },
  cardTitle: {
    color: "#0F172A",
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900",
  },
  cardSubtitle: {
    marginTop: 6,
    color: "#64748B",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
  },
  statusChipText: {
    color: "#9A3412",
    fontSize: 11,
    fontWeight: "900",
  },
  statRow: {
    flexDirection: "row",
    gap: 10,
  },
  statBox: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  statLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },
  statValue: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
  },
  statValueSmall: {
    color: "#0F172A",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },
  previewBox: {
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 5,
  },
  previewLine: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "600",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
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
});
