import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { FlashList } from "../../../ui/FlashList";
import type { HistoryRow } from "../types";
import {
  buildAccountantListModel,
  getAccountantListEstimatedItemSize,
  getAccountantListItemKey,
  type AccountantInboxListRowBase,
  type AccountantListItem,
} from "../accountant.listModel";

export function AccountantEmptyState({
  title,
  hint,
  titleColor,
  hintColor,
}: {
  title: string;
  hint: string;
  titleColor: string;
  hintColor: string;
}) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Text style={{ fontSize: 28, marginBottom: 8, color: hintColor, opacity: 0.7 }}>...</Text>
      <Text style={{ fontSize: 16, fontWeight: "600", color: titleColor, marginBottom: 4 }}>{title}</Text>
      <Text style={{ color: hintColor, textAlign: "center", fontWeight: "500" }}>{hint}</Text>
    </View>
  );
}

export function AccountantListBlock<TInbox extends AccountantInboxListRowBase>({
  isHistory,
  historyRows,
  rows,
  historyHeader,
  historyLoading,
  loading,
  historyRefreshing,
  refreshing,
  historyLoadingMore,
  loadingMore,
  historyHasMore,
  hasMore,
  onRefreshHistory,
  onRefresh,
  onEndReachedHistory,
  onEndReached,
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
  historyLoadingMore: boolean;
  loadingMore: boolean;
  historyHasMore: boolean;
  hasMore: boolean;
  onRefreshHistory: () => void;
  onRefresh: () => void;
  onEndReachedHistory: () => void;
  onEndReached: () => void;
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  contentTopPad: number;
  onRenderHistory: (row: HistoryRow) => React.ReactElement | null;
  onRenderInbox: (row: TInbox) => React.ReactElement | null;
  uiTextColor: string;
  uiSubColor: string;
}) {
  const data = React.useMemo(
    () => buildAccountantListModel({ isHistory, historyRows, rows }),
    [historyRows, isHistory, rows],
  );

  const keyExtractor = React.useCallback(
    (item: AccountantListItem<TInbox>, index: number) => getAccountantListItemKey(item, index),
    [],
  );

  const renderItem = React.useCallback(
    ({ item }: { item: AccountantListItem<TInbox> }) => {
      if (item.__kind === "history") return onRenderHistory(item.data);
      return onRenderInbox(item.data);
    },
    [onRenderHistory, onRenderInbox],
  );

  const footer = isHistory ? (
    historyLoadingMore ? (
      <View style={{ paddingVertical: 16, alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    ) : historyHasMore ? (
      <View style={{ height: 16 }} />
    ) : (
      <View style={{ height: 8 }} />
    )
  ) : loadingMore ? (
    <View style={{ paddingVertical: 16, alignItems: "center" }}>
      <ActivityIndicator />
    </View>
  ) : hasMore ? (
    <View style={{ height: 16 }} />
  ) : (
    <View style={{ height: 8 }} />
  );

  return (
    <FlashList<AccountantListItem<TInbox>>
      style={{ flex: 1 }}
      data={data}
      estimatedItemSize={getAccountantListEstimatedItemSize(isHistory)}
      keyExtractor={keyExtractor}
      ListHeaderComponent={isHistory ? historyHeader : null}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl
          refreshing={isHistory ? historyRefreshing : refreshing}
          onRefresh={isHistory ? onRefreshHistory : onRefresh}
          title=""
          tintColor="transparent"
        />
      }
      onEndReachedThreshold={0.45}
      onEndReached={isHistory ? onEndReachedHistory : onEndReached}
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
      ListFooterComponent={footer}
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentContainerStyle={{ paddingTop: contentTopPad, paddingBottom: 128 }}
    />
  );
}
