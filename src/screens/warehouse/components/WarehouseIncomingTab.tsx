import React from "react";
import {
  ActivityIndicator,
  Text,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type RefreshControlProps,
} from "react-native";
import RoleScreenLayout from "../../../components/layout/RoleScreenLayout";
import { FlashList } from "../../../ui/FlashList";
import {
  selectWarehouseEmptyTextStyle,
  selectWarehouseIncomingKey,
} from "../warehouse.list.common";
import { selectWarehouseIncomingEmptyText } from "../warehouse.tab.empty";
import type { IncomingRow } from "../warehouse.types";

const WAREHOUSE_INCOMING_LIST_FLATLIST_TUNING = {
  initialNumToRender: 10,
  maxToRenderPerBatch: 10,
  updateCellsBatchingPeriod: 32,
  windowSize: 7,
  removeClippedSubviews: false,
} as const;

type Props = {
  data: IncomingRow[];
  contentContainerStyle: { paddingTop: number; paddingBottom: number };
  onScroll: ((event: NativeSyntheticEvent<NativeScrollEvent>) => void) | undefined;
  scrollEventThrottle: number | undefined;
  onEndReached: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  refreshControl: React.ReactElement<RefreshControlProps>;
  renderItem: ListRenderItem<IncomingRow>;
  emptyColor: string;
};

export default function WarehouseIncomingTab({
  data,
  contentContainerStyle,
  onScroll,
  scrollEventThrottle,
  onEndReached,
  hasMore,
  loadingMore,
  refreshControl,
  renderItem,
  emptyColor,
}: Props) {
  return (
    <RoleScreenLayout>
      <FlashList
        data={data}
        keyExtractor={selectWarehouseIncomingKey}
        contentContainerStyle={contentContainerStyle}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        ListHeaderComponent={null}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        {...WAREHOUSE_INCOMING_LIST_FLATLIST_TUNING}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ paddingVertical: 16 }} />
          ) : hasMore ? (
            <Text style={selectWarehouseEmptyTextStyle(emptyColor)}> </Text>
          ) : null
        }
        renderItem={renderItem}
        estimatedItemSize={104}
        ListEmptyComponent={
          <Text style={selectWarehouseEmptyTextStyle(emptyColor)}>
            {selectWarehouseIncomingEmptyText()}
          </Text>
        }
        refreshControl={refreshControl}
      />
    </RoleScreenLayout>
  );
}
