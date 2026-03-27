import React from "react";
import {
  ActivityIndicator,
  Text,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import SectionBlock from "../../../ui/SectionBlock";
import RoleScreenLayout from "../../../components/layout/RoleScreenLayout";
import { FlashList } from "../../../ui/FlashList";
import {
  selectWarehouseEmptyTextStyle,
  selectWarehouseStockKey,
} from "../warehouse.list.common";
import {
  selectWarehouseStockEmptyText,
  selectWarehouseStockUnsupportedText,
} from "../warehouse.tab.empty";
import type { StockRow } from "../warehouse.types";

type Props = {
  stockSupported: boolean | null;
  data: StockRow[];
  contentContainerStyle: { paddingTop: number; paddingBottom: number };
  onScroll: ((event: NativeSyntheticEvent<NativeScrollEvent>) => void) | undefined;
  scrollEventThrottle: number | undefined;
  onEndReached: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  renderItem: ListRenderItem<StockRow>;
  header: React.ReactElement;
  emptyColor: string;
};

export default function WarehouseStockTab({
  stockSupported,
  data,
  contentContainerStyle,
  onScroll,
  scrollEventThrottle,
  onEndReached,
  hasMore,
  loadingMore,
  renderItem,
  header,
  emptyColor,
}: Props) {
  if (stockSupported === false) {
    return (
      <RoleScreenLayout>
        <SectionBlock style={{ padding: 12, marginBottom: 0 }} contentStyle={{ gap: 0 }}>
          <Text style={{ color: "#475569" }}>
            {selectWarehouseStockUnsupportedText()}{" "}
            <Text style={{ fontWeight: "700" }}>v_warehouse_fact</Text>.
          </Text>
        </SectionBlock>
      </RoleScreenLayout>
    );
  }

  return (
    <RoleScreenLayout>
      <FlashList
        data={data}
        keyExtractor={selectWarehouseStockKey}
        contentContainerStyle={contentContainerStyle}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        renderItem={renderItem}
        ListHeaderComponent={header}
        estimatedItemSize={88}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.45}
        ListEmptyComponent={
          <Text style={selectWarehouseEmptyTextStyle(emptyColor)}>
            {selectWarehouseStockEmptyText()}
          </Text>
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ paddingVertical: 16 }} />
          ) : hasMore ? (
            <Text style={selectWarehouseEmptyTextStyle(emptyColor)}>Загрузка ещё...</Text>
          ) : null
        }
      />
    </RoleScreenLayout>
  );
}
