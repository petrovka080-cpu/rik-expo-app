import React from "react";
import { ActivityIndicator, FlatList, Platform, RefreshControl, Text, View } from "react-native";
import type { HistoryRow } from "../types";

type ListItem = { __kind: "history"; data: HistoryRow } | { __kind: "inbox"; data: unknown };

export function AccountantEmptyState({ title, hint, titleColor, hintColor }: { title: string; hint: string; titleColor: string; hintColor: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Text style={{ fontSize: 40, marginBottom: 8 }}>...</Text>
      <Text style={{ fontSize: 16, fontWeight: "900", color: titleColor, marginBottom: 4 }}>{title}</Text>
      <Text style={{ color: hintColor, textAlign: "center", fontWeight: "700" }}>{hint}</Text>
    </View>
  );
}

export function AccountantListBlock({
  isHistory,
  historyRows,
  rows,
  historyHeader,
  historyLoading,
  loading,
  historyRefreshing,
  refreshing,
  onRefreshHistory,
  onRefresh,
  onScroll,
  contentTopPad,
  onRenderHistory,
  onRenderInbox,
  uiTextColor,
  uiSubColor,
}: {
  isHistory: boolean;
  historyRows: HistoryRow[];
  rows: unknown[];
  historyHeader: React.ReactElement;
  historyLoading: boolean;
  loading: boolean;
  historyRefreshing: boolean;
  refreshing: boolean;
  onRefreshHistory: () => void;
  onRefresh: () => void;
  onScroll: (e: unknown) => void;
  contentTopPad: number;
  onRenderHistory: (row: HistoryRow) => React.ReactElement | null;
  onRenderInbox: (row: unknown) => React.ReactElement | null;
  uiTextColor: string;
  uiSubColor: string;
}) {
  const data: ListItem[] = isHistory
    ? historyRows.map((r) => ({ __kind: "history" as const, data: r }))
    : rows.map((r) => ({ __kind: "inbox" as const, data: r }));

  return (
    <FlatList<ListItem>
      style={{ flex: 1 }}
      data={data}
      keyExtractor={(item) =>
        item.__kind === "history"
          ? String(item.data.payment_id)
          : String((item.data as { proposal_id?: string | number })?.proposal_id ?? "")
      }
      ListHeaderComponent={isHistory ? historyHeader : null}
      renderItem={({ item }) => {
        if (item.__kind === "history") return onRenderHistory(item.data);
        return onRenderInbox(item.data);
      }}
      refreshControl={
        <RefreshControl
          refreshing={isHistory ? historyRefreshing : refreshing}
          onRefresh={isHistory ? onRefreshHistory : onRefresh}
          title=""
          tintColor="transparent"
        />
      }
      ListEmptyComponent={
        isHistory ? (
          historyLoading ? (
            <View style={{ padding: 24, alignItems: "center" }}>
              <ActivityIndicator />
            </View>
          ) : (
            <View style={{ padding: 24, alignItems: "center" }}>
              <Text style={{ color: uiSubColor, fontWeight: "700" }}>История пуста</Text>
            </View>
          )
        ) : loading ? (
          <View style={{ padding: 24, alignItems: "center" }}>
            <ActivityIndicator />
          </View>
        ) : (
          <AccountantEmptyState
            title="Пока пусто"
            hint="Документы не найдены для текущего таба"
            titleColor={uiTextColor}
            hintColor={uiSubColor}
          />
        )
      }
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentContainerStyle={{ paddingTop: contentTopPad, paddingBottom: 140 }}
      removeClippedSubviews={Platform.OS === "web" ? false : true}
    />
  );
}
