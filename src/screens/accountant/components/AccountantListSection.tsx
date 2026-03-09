import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import type { HistoryRow } from "../types";

type InboxRowBase = { proposal_id?: string | number };
type ListItem<TInbox extends InboxRowBase> = { __kind: "history"; data: HistoryRow } | { __kind: "inbox"; data: TInbox };

export function AccountantEmptyState({ title, hint, titleColor, hintColor }: { title: string; hint: string; titleColor: string; hintColor: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Text style={{ fontSize: 28, marginBottom: 8, color: hintColor, opacity: 0.7 }}>...</Text>
      <Text style={{ fontSize: 16, fontWeight: "600", color: titleColor, marginBottom: 4 }}>{title}</Text>
      <Text style={{ color: hintColor, textAlign: "center", fontWeight: "500" }}>{hint}</Text>
    </View>
  );
}

export function AccountantListBlock<TInbox extends InboxRowBase>({
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
  rows: TInbox[];
  historyHeader: React.ReactElement;
  historyLoading: boolean;
  loading: boolean;
  historyRefreshing: boolean;
  refreshing: boolean;
  onRefreshHistory: () => void;
  onRefresh: () => void;
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  contentTopPad: number;
  onRenderHistory: (row: HistoryRow) => React.ReactElement | null;
  onRenderInbox: (row: TInbox) => React.ReactElement | null;
  uiTextColor: string;
  uiSubColor: string;
}) {
  const data: ListItem<TInbox>[] = isHistory
    ? historyRows.map((r) => ({ __kind: "history" as const, data: r }))
    : rows.map((r) => ({ __kind: "inbox" as const, data: r }));

  return (
    <FlatList<ListItem<TInbox>>
      style={{ flex: 1 }}
      data={data}
      keyExtractor={(item) =>
        item.__kind === "history"
          ? String(item.data.payment_id)
          : String(item.data.proposal_id ?? "")
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
              <Text style={{ color: uiSubColor, fontWeight: "500" }}>История пуста</Text>
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
      contentContainerStyle={{ paddingTop: contentTopPad, paddingBottom: 128 }}
      removeClippedSubviews={Platform.OS === "web" ? false : true}
    />
  );
}
